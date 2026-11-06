// Prints another process's macOS accessibility tree as JSON: for each element its role, title,
// description, value, state and frame, and the element the process says has keyboard focus.
//
//   swiftc -O scripts/ax-dump.swift -o ax-dump && ./ax-dump <pid> [--max-nodes <n>] [--output <file>]
//
// With --output the JSON (or the error object) is written to <file> in one atomic step instead of standard
// output, so a process that cannot wait for this one (the verifier, which this tool is reading) can poll for it.
//
// READ ONLY. This tool never performs an action, sets a value, posts a keyboard or mouse event, or
// raises a window: it calls AXUIElementCopyAttributeValue and nothing else that touches the target.
// (scripts/verify-a11y.mjs refuses to run if this file mentions a call that could.) Reading another
// process's tree needs macOS Accessibility permission for the process that runs this tool: System
// Settings > Privacy & Security > Accessibility. Without it the tool prints
// {"error":"not-trusted", ...} and exits with status 3.
//
// Frames are in macOS screen points, origin at the top left of the primary display, as the
// accessibility API reports them.

import ApplicationServices
import Foundation

let exitUsage: Int32 = 2
let exitNotTrusted: Int32 = 3
let exitNoApplication: Int32 = 4

/// A stuck target must not hang the verifier: each attribute read gives up after this long.
let messagingTimeoutSeconds: Float = 5
let defaultMaxNodes = 5000
let maxDepth = 40

var outputPath: String?

func finish(_ object: [String: Any], status: Int32) -> Never {
    let data = (try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys, .prettyPrinted])) ?? Data("{}".utf8)
    if let path = outputPath {
        do {
            try data.write(to: URL(fileURLWithPath: path), options: .atomic)
        } catch {
            FileHandle.standardError.write(Data("ax-dump: cannot write \(path): \(error)\n".utf8))
            exit(exitUsage)
        }
    } else {
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
    exit(status)
}

func fail(_ code: String, _ detail: String, status: Int32) -> Never {
    finish(["error": code, "detail": detail], status: status)
}

var arguments = Array(CommandLine.arguments.dropFirst())
var maxNodes = defaultMaxNodes
if let flag = arguments.firstIndex(of: "--max-nodes") {
    guard flag + 1 < arguments.count, let count = Int(arguments[flag + 1]), count > 0 else {
        fail("usage", "--max-nodes needs a positive number", status: exitUsage)
    }
    maxNodes = count
    arguments.removeSubrange(flag...(flag + 1))
}
if let flag = arguments.firstIndex(of: "--output") {
    guard flag + 1 < arguments.count else {
        fail("usage", "--output needs a file path", status: exitUsage)
    }
    outputPath = arguments[flag + 1]
    arguments.removeSubrange(flag...(flag + 1))
}
guard arguments.count == 1, let pid = Int32(arguments[0]) else {
    fail("usage", "ax-dump <pid> [--max-nodes <n>] [--output <file>]", status: exitUsage)
}

// AXIsProcessTrusted() only asks; it never shows the permission prompt.
guard AXIsProcessTrusted() else {
    fail(
        "not-trusted",
        "The process running ax-dump is not allowed to read other applications' accessibility trees. "
            + "Grant it in System Settings > Privacy & Security > Accessibility (the terminal or app that runs node).",
        status: exitNotTrusted
    )
}

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, name as CFString, &value)
    return result == .success ? value : nil
}

/// A value from the accessibility API as something JSON can hold.
func plain(_ value: CFTypeRef?) -> Any? {
    guard let value = value else { return nil }
    if let text = value as? String { return text }
    if CFGetTypeID(value) == CFBooleanGetTypeID() { return (value as? Bool) ?? false }
    if let number = value as? NSNumber {
        let double = number.doubleValue
        return double.isFinite ? double : nil
    }
    if CFGetTypeID(value) == AXValueGetTypeID() {
        let axValue = value as! AXValue
        switch AXValueGetType(axValue) {
        case .cgPoint:
            var point = CGPoint.zero
            AXValueGetValue(axValue, .cgPoint, &point)
            return ["x": point.x, "y": point.y]
        case .cgSize:
            var size = CGSize.zero
            AXValueGetValue(axValue, .cgSize, &size)
            return ["width": size.width, "height": size.height]
        case .cgRect:
            var rect = CGRect.zero
            AXValueGetValue(axValue, .cgRect, &rect)
            return ["x": rect.origin.x, "y": rect.origin.y, "width": rect.size.width, "height": rect.size.height]
        default:
            return nil
        }
    }
    return String(describing: value)
}

/// The attributes worth reading, under the keys the wrapper looks for.
let attributes: [(String, String)] = [
    ("role", "AXRole"), ("subrole", "AXSubrole"), ("roleDescription", "AXRoleDescription"),
    ("title", "AXTitle"), ("description", "AXDescription"), ("value", "AXValue"),
    ("valueDescription", "AXValueDescription"), ("help", "AXHelp"), ("identifier", "AXIdentifier"),
    ("placeholder", "AXPlaceholderValue"), ("enabled", "AXEnabled"), ("focused", "AXFocused"),
    ("selected", "AXSelected"), ("expanded", "AXExpanded"), ("minValue", "AXMinValue"),
    ("maxValue", "AXMaxValue"), ("orientation", "AXOrientation"), ("frame", "AXFrame"),
]

/// An element's own attribute names. For a scroll area this shows what the adapter exposes of its scrolling.
func attributeNames(_ element: AXUIElement) -> [String]? {
    var names: CFArray?
    guard AXUIElementCopyAttributeNames(element, &names) == .success else { return nil }
    return names as? [String]
}

/// The actions an element advertises (names only: this tool never performs one).
func actionNames(_ element: AXUIElement) -> [String]? {
    var names: CFArray?
    guard AXUIElementCopyActionNames(element, &names) == .success else { return nil }
    return names as? [String]
}

/// An attribute whose value is another element (a scroll area's scroll bars), described without its children.
func elementAttribute(_ element: AXUIElement, _ name: String) -> [String: Any]? {
    guard let value = attribute(element, name), CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
    let target = value as! AXUIElement
    var node: [String: Any] = [:]
    for (key, attributeName) in attributes {
        if let read = plain(attribute(target, attributeName)) { node[key] = read }
    }
    return node
}

var visited = 0
var truncated = false

/// The application's children are its windows only. Its menu bar holds the system's menus, which list
/// the user's recent files and applications: nothing the tool is for, and not something to write to a log.
func childElements(of element: AXUIElement, depth: Int) -> [AXUIElement]? {
    return attribute(element, depth == 0 ? "AXWindows" : "AXChildren") as? [AXUIElement]
}

func describe(_ element: AXUIElement, depth: Int) -> [String: Any] {
    visited += 1
    var node: [String: Any] = [:]
    for (key, name) in attributes {
        if let value = plain(attribute(element, name)) { node[key] = value }
    }
    if let names = actionNames(element), !names.isEmpty { node["actionNames"] = names }
    // A scroll container may reach the platform as a scroll area or, if the adapter has no scroll area, as an unknown
    // element; either way its attribute names and scroll bars say what the adapter exposes of its scrolling.
    if let role = node["role"] as? String, role == "AXScrollArea" || role == "AXUnknown" {
        if let names = attributeNames(element) { node["attributeNames"] = names }
        for (key, name) in [("verticalScrollBar", "AXVerticalScrollBar"), ("horizontalScrollBar", "AXHorizontalScrollBar")] {
            if let bar = elementAttribute(element, name) { node[key] = bar }
        }
    }
    var children: [[String: Any]] = []
    if depth < maxDepth, let list = childElements(of: element, depth: depth) {
        for child in list {
            if visited >= maxNodes {
                truncated = true
                break
            }
            children.append(describe(child, depth: depth + 1))
        }
    }
    node["children"] = children
    return node
}

let application = AXUIElementCreateApplication(pid)
AXUIElementSetMessagingTimeout(application, messagingTimeoutSeconds)
guard attribute(application, "AXRole") != nil else {
    fail("no-application", "Process \(pid) has no accessibility tree: it is not running, or it exposes none.", status: exitNoApplication)
}

var result: [String: Any] = ["pid": Int(pid), "tree": describe(application, depth: 0)]
if let focused = attribute(application, "AXFocusedUIElement") {
    var summary: [String: Any] = [:]
    for (key, name) in attributes where key != "focused" {
        if let value = plain(attribute(focused as! AXUIElement, name)) { summary[key] = value }
    }
    result["focusedElement"] = summary
}
result["nodes"] = visited
result["truncated"] = truncated
finish(result, status: 0)
