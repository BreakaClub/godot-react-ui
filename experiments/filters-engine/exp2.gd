extends SceneTree
# Engine facts, part two: rect space, canvas groups, stacking, nesting.

const W := 640
const H := 360
var holder: Node2D
var rs := RenderingServer
var freed: Array = []

func _initialize() -> void:
	holder = Node2D.new()
	root.add_child(holder)
	await process_frame
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://out"))
	await _test_rect_space(1.0)
	await _test_rect_space(2.0)
	root.content_scale_factor = 1.0
	await process_frame
	await _test_stacked()
	await _test_group_mipmaps()
	await _test_group_modulate()
	await _test_nesting()
	quit()

func _item(parent: RID, index: int) -> RID:
	var item := rs.canvas_item_create()
	rs.canvas_item_set_parent(item, parent)
	rs.canvas_item_set_draw_index(item, index)
	freed.append(item)
	return item

func _cleanup() -> void:
	for item in freed:
		rs.free_rid(item)
	freed.clear()

func _shader(code: String) -> RID:
	var shader := rs.shader_create()
	rs.shader_set_code(shader, code)
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	return material

func _grab() -> Image:
	rs.force_draw()
	return root.get_texture().get_image()

func _bars(item: RID, size: Vector2) -> void:
	var colours := [Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW]
	var w := size.x / 4.0
	for i in 4:
		rs.canvas_item_add_rect(item, Rect2(i * w, 0, w, size.y), colours[i])

func _test_rect_space(scale: float) -> void:
	root.content_scale_factor = scale
	await process_frame
	await process_frame
	var parent := holder.get_canvas_item()
	var logical := Vector2(W, H) / scale
	var bars := _item(parent, 0)
	_bars(bars, logical)
	# Panel in logical units: physical (40,60)-(600,300).
	var panel := Rect2(Vector2(40, 60) / scale, Vector2(560, 240) / scale)
	var physical := Rect2(40, 60, 560, 240)
	var copy := _item(parent, 1)
	rs.canvas_item_set_copy_to_backbuffer(copy, true, physical)
	var inv := _item(parent, 2)
	rs.canvas_item_add_rect(inv, panel, Color.WHITE)
	rs.canvas_item_set_material(inv, _material_invert())
	await process_frame
	var image := _grab()
	# Invert of the bars is cyan, magenta, yellow, blue inside the physical panel region only.
	var inside_ok := 0
	var inside_total := 0
	var outside_bad := 0
	for y in range(0, H, 3):
		for x in range(0, W, 3):
			var c := image.get_pixel(x, y)
			var in_panel := physical.has_point(Vector2(x, y))
			var bar := int(x / (W / 4.0))
			var base: Color = [Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW][bar]
			var expect := Color(1.0 - base.r, 1.0 - base.g, 1.0 - base.b) if in_panel else base
			var margin := 3
			var near_edge := absf(x - physical.position.x) < margin or absf(x - physical.end.x) < margin or absf(y - physical.position.y) < margin or absf(y - physical.end.y) < margin or absf(x - bar * W / 4.0) < margin or absf(x - (bar + 1) * W / 4.0) < margin
			if near_edge:
				continue
			inside_total += 1
			if absf(c.r - expect.r) + absf(c.g - expect.g) + absf(c.b - expect.b) < 0.05:
				inside_ok += 1
	print("rect_space scale=", scale, " viewport=", root.get_visible_rect().size, " final_transform=", root.get_final_transform(), " matching=", inside_ok, "/", inside_total)
	image.save_png("res://out/exp2-rect-scale%d.png" % int(scale))
	_cleanup()

func _material_invert() -> RID:
	return _material_lod("COLOR = vec4(vec3(1.0) - textureLod(screen_tex, SCREEN_UV, 0.0).rgb, COLOR.a);")

func _material_lod(body: String, extra := "") -> RID:
	return _shader("""
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
%s
void fragment() { %s }
""" % [extra, body])

func _row(image: Image, y: int, x0: int, x1: int) -> PackedFloat32Array:
	var p := PackedFloat32Array()
	for x in range(x0, x1):
		p.append(image.get_pixel(x, y).r)
	return p

func _width(p: PackedFloat32Array) -> float:
	var lo := -1.0
	var hi := -1.0
	for x in range(1, p.size()):
		if lo < 0.0 and p[x - 1] < 0.1 and p[x] >= 0.1:
			lo = (x - 1) + (0.1 - p[x - 1]) / (p[x] - p[x - 1])
		if hi < 0.0 and p[x - 1] < 0.9 and p[x] >= 0.9:
			hi = (x - 1) + (0.9 - p[x - 1]) / (p[x] - p[x - 1])
	return hi - lo

func _edge_scene(parent: RID) -> RID:
	var bg := _item(parent, 0)
	rs.canvas_item_add_rect(bg, Rect2(0, 0, 320, H), Color.BLACK)
	rs.canvas_item_add_rect(bg, Rect2(320, 0, 320, H), Color.WHITE)
	return bg

# Two stacked panels: B is drawn over A and must see A's blur. Compared: separate copy items, and the copy merged into the backdrop item.
func _test_stacked() -> void:
	for merged in [false, true]:
		var parent := holder.get_canvas_item()
		_edge_scene(parent)
		var blur := _material_lod("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 3.0).rgb, COLOR.a);")
		# Panel A: blur at lod 3 over the left half of the screen. Panel B: invert, overlapping A on the right.
		var a_rect := Rect2(40, 40, 360, 280)
		var b_rect := Rect2(240, 80, 340, 200)
		var a_copy := _item(parent, 1)
		var a := _item(parent, 2)
		var b_copy := _item(parent, 3)
		var b := _item(parent, 4)
		if merged:
			rs.canvas_item_set_copy_to_backbuffer(a, true, a_rect.grow(100))
			rs.canvas_item_set_copy_to_backbuffer(b, true, b_rect.grow(100))
		else:
			rs.canvas_item_set_copy_to_backbuffer(a_copy, true, a_rect.grow(100))
			rs.canvas_item_set_copy_to_backbuffer(b_copy, true, b_rect.grow(100))
		rs.canvas_item_add_rect(a, a_rect, Color.WHITE)
		rs.canvas_item_set_material(a, blur)
		rs.canvas_item_add_rect(b, b_rect, Color.WHITE)
		# B shows the screen at lod 3 too: where B overlaps A it must be a blur of A's blurred result.
		rs.canvas_item_set_material(b, _material_lod("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 3.0).rgb, COLOR.a);"))
		await process_frame
		await process_frame
		var image := _grab()
		var p := _row(image, 180, 250, 400)
		# Inside B (x>=240) on row 180 we look at the edge at x=320: B is a lod 3 blur of A's lod 3 blur of the edge.
		print("stacked merged=", merged, " edge width inside B (10-90)=", _width(p), " (separate items expected wider than one lod-3 blur of 18.9)")
		image.save_png("res://out/exp2-stacked-%s.png" % ("merged" if merged else "separate"))
		_cleanup()

func _test_group_mipmaps() -> void:
	for after_panel in [false, true]:
		var parent := holder.get_canvas_item()
		if after_panel:
			# An earlier frosted panel (copy + mipmap backdrop) elsewhere, so the mipmap flags are already set when the group composites.
			var bg := _item(parent, 0)
			rs.canvas_item_add_rect(bg, Rect2(0, 0, W, H), Color.GRAY)
			var c := _item(parent, 1)
			rs.canvas_item_set_copy_to_backbuffer(c, true, Rect2(500, 20, 100, 60))
			var bd := _item(parent, 2)
			rs.canvas_item_add_rect(bd, Rect2(500, 20, 100, 60), Color.WHITE)
			rs.canvas_item_set_material(bd, _material_lod("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 1.0).rgb, COLOR.a);"))
		var wrap := _item(parent, 3)
		rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 100.0, true)
		rs.canvas_item_set_material(wrap, _material_lod("vec4 c = textureLod(screen_tex, SCREEN_UV, 3.0); if (c.a > 0.0001) { c.rgb /= c.a; } COLOR = c;"))
		var content := _item(wrap, 0)
		rs.canvas_item_add_rect(content, Rect2(100, 100, 220, 160), Color.WHITE)
		rs.canvas_item_add_rect(content, Rect2(320, 100, 220, 160), Color.BLACK)
		await process_frame
		await process_frame
		var image := _grab()
		var a := _row(image, 180, 100, 560)
		# The group content: white then black (decreasing). Report the transition width of 1-v.
		var inv := PackedFloat32Array()
		for v in a:
			inv.append(1.0 - v)
		print("group blur_mipmaps lod3 after_panel=", after_panel, " white->black width(10-90 of 1-v)=", _width(inv), " (lod 3 blur is ~18.9; 0.8-ish means the mip levels were not readable)")
		image.save_png("res://out/exp2-group-mips-%s.png" % ("after" if after_panel else "alone"))
		_cleanup()

func _test_group_modulate() -> void:
	var parent := holder.get_canvas_item()
	var outer := _item(parent, 0)
	rs.canvas_item_set_modulate(outer, Color(1, 1, 1, 0.5))
	var bg := _item(parent, 0)
	rs.canvas_item_add_rect(bg, Rect2(0, 0, W, H), Color.BLACK)
	rs.canvas_item_set_draw_index(outer, 1)
	var wrap := _item(outer, 0)
	rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 10.0, false)
	# Stock composite (no material): what alpha does white content get under a 0.5 ancestor?
	var content := _item(wrap, 0)
	rs.canvas_item_add_rect(content, Rect2(100, 100, 200, 100), Color.WHITE)
	var plain := _item(outer, 1)
	rs.canvas_item_add_rect(plain, Rect2(340, 100, 200, 100), Color.WHITE)
	await process_frame
	await process_frame
	var image := _grab()
	print("modulate: ancestor alpha 0.5 over black. Plain item=", image.get_pixel(440, 150).r, " stock canvas group=", image.get_pixel(200, 150).r, " (0.5 each if applied once; 0.25 if the group applies it twice)")
	_cleanup()

func _test_nesting() -> void:
	var parent := holder.get_canvas_item()
	_edge_scene(parent)
	# 1. A backdrop item inside a group.
	var wrap := _item(parent, 1)
	rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 10.0, false)
	var inner_copy := _item(wrap, 0)
	rs.canvas_item_set_copy_to_backbuffer(inner_copy, true, Rect2(40, 40, 200, 200))
	var inner := _item(wrap, 1)
	rs.canvas_item_add_rect(inner, Rect2(60, 60, 160, 160), Color.WHITE)
	rs.canvas_item_set_material(inner, _material_invert())
	await process_frame
	await process_frame
	var image := _grab()
	print("backdrop inside a group: pixel at (140,140) = ", image.get_pixel(140, 140), " (an inverted backdrop of black would be white)")
	image.save_png("res://out/exp2-nest-backdrop-in-group.png")
	_cleanup()
	# 2. A group inside a group.
	_edge_scene(parent)
	var outer := _item(parent, 1)
	rs.canvas_item_set_canvas_group_mode(outer, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 10.0, false)
	var inner_group := _item(outer, 0)
	rs.canvas_item_set_canvas_group_mode(inner_group, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 10.0, false)
	rs.canvas_item_set_material(inner_group, _material_lod("vec4 c = textureLod(screen_tex, SCREEN_UV, 0.0); if (c.a > 0.0001) { c.rgb /= c.a; } COLOR = vec4(vec3(1.0) - c.rgb, c.a);"))
	var leaf := _item(inner_group, 0)
	rs.canvas_item_add_rect(leaf, Rect2(100, 100, 100, 100), Color(0.2, 0.4, 0.8))
	var sibling := _item(outer, 1)
	rs.canvas_item_add_rect(sibling, Rect2(300, 100, 100, 100), Color(0.9, 0.1, 0.1))
	await process_frame
	await process_frame
	image = _grab()
	print("group inside a group: inner content pixel (150,150)=", image.get_pixel(150, 150), " (inner group inverts: expect ", Color(0.8, 0.6, 0.2), "), sibling (350,150)=", image.get_pixel(350, 150))
	image.save_png("res://out/exp2-nest-group-in-group.png")
	_cleanup()
