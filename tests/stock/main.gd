# Loads the extension in a Godot that has no GodotJS (scripts/verify-load.mjs runs it with `--script`): the class is registered, a root
# takes a commit of a sized view with a line of text in it, and the layout gives both their rectangles. What it proves is that this
# platform's library loads and runs in a stock engine; the library's own behaviour is tested through GodotJS (the verifiers, the demo).
extends SceneTree

const CLASS := "ReactUiRoot"
const ROOT_SIZE := Vector2(320, 240)
const VIEW_TAG := 1
const TEXT_TAG := 2
const VIEW_WIDTH := 120.0
const VIEW_HEIGHT := 48.0
# native/PROTOCOL.md: tag 0 in `children` is the layer's own list.
const COMMIT := {
	"created": [
		{"tag": VIEW_TAG, "kind": "view", "props": {"style": {"layers": [{"style": {"width": VIEW_WIDTH, "height": VIEW_HEIGHT}}]}}},
		{"tag": TEXT_TAG, "kind": "text", "props": {"text": "Hello"}},
	],
	"children": [{"tag": 0, "children": [VIEW_TAG]}, {"tag": VIEW_TAG, "children": [TEXT_TAG]}],
}
const DEADLINE_MSEC := 20000
const VERIFIED := "godot-react-ui loaded:"

var _root: Control
var _started := Time.get_ticks_msec()


func _initialize() -> void:
	if not ClassDB.class_exists(CLASS):
		_fail("the extension registered no %s class: the library did not load" % CLASS)
		return
	_root = ClassDB.instantiate(CLASS)
	_root.size = ROOT_SIZE
	root.add_child(_root)
	var refusal: String = _root.commit(0, JSON.stringify(COMMIT))
	if not refusal.is_empty():
		_fail("the commit was refused: %s" % refusal)


func _process(_delta: float) -> bool:
	if _root == null:
		return true
	var view: Variant = JSON.parse_string(_root.get_node_rect(VIEW_TAG))
	var text: Variant = JSON.parse_string(_root.get_node_rect(TEXT_TAG))
	var laid_out: bool = typeof(view) == TYPE_DICTIONARY and typeof(text) == TYPE_DICTIONARY \
		and is_equal_approx(view.width, VIEW_WIDTH) and is_equal_approx(view.height, VIEW_HEIGHT) and text.width > 0.0 and text.height > 0.0
	if not laid_out:
		if Time.get_ticks_msec() - _started > DEADLINE_MSEC:
			return _fail("no layout in %d ms: the view is %s and its text %s" % [DEADLINE_MSEC, JSON.stringify(view), JSON.stringify(text)])
		return false
	var engine := Engine.get_version_info()
	print("%s Godot %s on %s %s, a %dx%d view with a %dx%d line of text" % [
		VERIFIED, engine.string, OS.get_name(), Engine.get_architecture_name(), view.width, view.height, text.width, text.height])
	quit(0)
	return true


func _fail(message: String) -> bool:
	printerr("godot-react-ui load check failed: %s" % message)
	quit(1)
	return true
