// Loaded into the windows of automated runs, and only those (scripts/quiet-window.mjs sets DYLD_INSERT_LIBRARIES; `pnpm dev`,
// `scripts/run.mjs` and the editor never see it). It keeps a verifier's window from touching what the person at the machine is
// doing: the application never activates, never becomes the key window, shows no Dock icon, draws nothing on screen and takes
// no click.
//
// The engine cannot be asked for this. On macOS `show_window` always activates the application for the main window
// (platform/macos/display_server_macos.mm:1719, `GodotApplication.activateApplication`), an unbundled application does it with
// three steps that first give focus to SystemUIServer (godot_application.mm, `forceUnbundledWindowActivationHackStep1`), and
// `WINDOW_FLAG_NO_FOCUS` only takes effect after the window already has the focus. Neither engine may be patched for a test.
//
// The window still renders: the verifiers read their pixels back from the viewport texture. The engine stops drawing a window
// it believes is covered (`window_can_draw` is `wd.is_visible`, from `occlusionState`, godot_window_delegate.mm:377), so the
// window is kept above everything, on every Space, fully transparent and click-through, and it always reports itself visible.
#import <AppKit/AppKit.h>
#import <objc/runtime.h>
#include <stdio.h>

/** Above a full-screen application, so nothing can cover the window and stall its drawing. */
static const NSWindowLevel QUIET_WINDOW_LEVEL = NSScreenSaverWindowLevel;
static const NSWindowCollectionBehavior QUIET_WINDOW_BEHAVIOUR = NSWindowCollectionBehaviorCanJoinAllSpaces
		| NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorIgnoresCycle | NSWindowCollectionBehaviorFullScreenAuxiliary;

typedef void (*SetLevel)(id, SEL, NSWindowLevel);
typedef void (*SetBool)(id, SEL, BOOL);
typedef BOOL (*SetPolicy)(id, SEL, NSApplicationActivationPolicy);

static SetLevel original_set_level;
static SetBool original_set_ignores_mouse_events;
static SetPolicy original_set_activation_policy;

static void announce(const char *marker, const char *detail) {
	fprintf(stderr, "%s %s\n", marker, detail);
	fflush(stderr);
}

/** Replace a method and return what it was. A method the system does not have is `NULL`; the caller decides whether that matters. */
static IMP replace_method(Class owner, SEL selector, id block) {
	Method method = owner == Nil ? NULL : class_getInstanceMethod(owner, selector);
	if (method == NULL) {
		return NULL;
	}
	IMP inherited = method_getImplementation(method);
	class_replaceMethod(owner, selector, imp_implementationWithBlock(block), method_getTypeEncoding(method));
	return inherited;
}

/** A method the quiet window depends on: if it is gone the window would not be quiet, which the runner reports as a failure. */
static IMP require_replaced(Class owner, const char *owner_name, SEL selector, id block) {
	IMP inherited = replace_method(owner, selector, block);
	if (inherited == NULL) {
		char detail[256];
		snprintf(detail, sizeof(detail), "%s %s", owner_name, sel_getName(selector));
		announce("QUIET_WINDOW_MISSING", detail);
	}
	return inherited;
}

static void make_quiet(NSWindow *window) {
	window.alphaValue = 0;
	window.hasShadow = NO;
	window.excludedFromWindowsMenu = YES;
	window.collectionBehavior = QUIET_WINDOW_BEHAVIOUR;
	original_set_level(window, @selector(setLevel:), QUIET_WINDOW_LEVEL);
	original_set_ignores_mouse_events(window, @selector(setIgnoresMouseEvents:), YES);
}

static void install_application_rules(void) {
	Class application = [NSApplication class];
	original_set_activation_policy = (SetPolicy)require_replaced(application, "NSApplication", @selector(setActivationPolicy:), ^BOOL(id self, NSApplicationActivationPolicy policy) {
		(void)policy;
		return original_set_activation_policy(self, @selector(setActivationPolicy:), NSApplicationActivationPolicyAccessory);
	});
	require_replaced(application, "NSApplication", @selector(activateIgnoringOtherApps:), ^(id self, BOOL flag) {
		(void)self;
		(void)flag;
	});
	// Since macOS 14, so it may be absent; nothing depends on it being there.
	replace_method(application, @selector(activate), ^(id self) {
		(void)self;
	});

	// The engine's own route: it activates SystemUIServer first, so this must not run at all.
	Class godot_application = objc_getClass("GodotApplication");
	require_replaced(godot_application, "GodotApplication", @selector(activateApplication), ^(id self) {
		(void)self;
	});

	Class running = [NSRunningApplication class];
	require_replaced(running, "NSRunningApplication", @selector(activateWithOptions:), ^BOOL(id self, NSApplicationActivationOptions options) {
		(void)self;
		(void)options;
		return NO;
	});
	// Since macOS 14.
	replace_method(running, @selector(activateFromApplication:options:), ^BOOL(id self, NSRunningApplication *from, NSApplicationActivationOptions options) {
		(void)self;
		(void)from;
		(void)options;
		return NO;
	});
}

static void install_window_rules(void) {
	Class window = [NSWindow class];
	// Everything `make_quiet` sets stays set: the engine sets the level and the mouse pass-through again when its flags change.
	original_set_level = (SetLevel)require_replaced(window, "NSWindow", @selector(setLevel:), ^(id self, NSWindowLevel level) {
		(void)level;
		original_set_level(self, @selector(setLevel:), QUIET_WINDOW_LEVEL);
	});
	original_set_ignores_mouse_events = (SetBool)require_replaced(window, "NSWindow", @selector(setIgnoresMouseEvents:), ^(id self, BOOL ignores) {
		(void)ignores;
		original_set_ignores_mouse_events(self, @selector(setIgnoresMouseEvents:), YES);
	});
	require_replaced(window, "NSWindow", @selector(occlusionState), ^NSWindowOcclusionState(id self) {
		(void)self;
		return NSWindowOcclusionStateVisible;
	});
	require_replaced(window, "NSWindow", @selector(makeKeyAndOrderFront:), ^(NSWindow *self, id sender) {
		(void)sender;
		make_quiet(self);
		[self orderFrontRegardless];
	});
	require_replaced(window, "NSWindow", @selector(orderFront:), ^(NSWindow *self, id sender) {
		(void)sender;
		make_quiet(self);
		[self orderFrontRegardless];
	});
	require_replaced(window, "NSWindow", @selector(makeKeyWindow), ^(id self) {
		(void)self;
	});
	require_replaced(window, "NSWindow", @selector(makeMainWindow), ^(id self) {
		(void)self;
	});
	require_replaced(window, "NSWindow", @selector(canBecomeMainWindow), ^BOOL(id self) {
		(void)self;
		return NO;
	});
	Class godot_window = objc_getClass("GodotWindow");
	require_replaced(godot_window, "GodotWindow", @selector(canBecomeKeyWindow), ^BOOL(id self) {
		(void)self;
		return NO;
	});
	require_replaced(godot_window, "GodotWindow", @selector(canBecomeMainWindow), ^BOOL(id self) {
		(void)self;
		return NO;
	});
}

__attribute__((constructor)) static void install_quiet_window(void) {
	install_application_rules();
	install_window_rules();
	// Nothing above should let this happen; if something does, the run says so and fails rather than quietly taking focus.
	[[NSNotificationCenter defaultCenter] addObserverForName:NSApplicationDidBecomeActiveNotification object:nil queue:nil usingBlock:^(NSNotification *note) {
		(void)note;
		announce("QUIET_WINDOW_ACTIVATED", "the application became active");
	}];
	announce("QUIET_WINDOW_LOADED", "this process cannot take focus");
}
