extends SceneTree
# Engine facts, part three: priming the mipmap flag for canvas groups, and stale-mip contamination vs copy rect inflation.

const W := 640
const H := 360
var holder: Node2D
var rs := RenderingServer
var freed: Array = []

func _initialize() -> void:
	holder = Node2D.new()
	root.add_child(holder)
	await process_frame
	await _test_primer()
	await _test_contamination()
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

func _material(body: String) -> RID:
	var shader := rs.shader_create()
	rs.shader_set_code(shader, """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
void fragment() { %s }
""" % body)
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	return material

func _grab() -> Image:
	rs.force_draw()
	return root.get_texture().get_image()

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

func _group_scene(parent: RID, base: int, x: float) -> void:
	var wrap := _item(parent, base)
	rs.canvas_item_set_canvas_group_mode(wrap, RenderingServer.CANVAS_GROUP_MODE_TRANSPARENT, 0.0, true, 60.0, true)
	rs.canvas_item_set_material(wrap, _material("vec4 c = textureLod(screen_tex, SCREEN_UV, 3.0); if (c.a > 0.0001) { c.rgb /= c.a; } COLOR = c;"))
	var content := _item(wrap, 0)
	rs.canvas_item_add_rect(content, Rect2(x, 100, 100, 160), Color.WHITE)
	rs.canvas_item_add_rect(content, Rect2(x + 100, 100, 100, 160), Color.BLACK)

func _test_primer() -> void:
	for variant in ["none", "primer", "primer-then-panel-between"]:
		var parent := holder.get_canvas_item()
		var bg := _item(parent, 0)
		rs.canvas_item_add_rect(bg, Rect2(0, 0, W, H), Color(0.5, 0.5, 0.5))
		if variant != "none":
			var pc := _item(parent, 1)
			rs.canvas_item_set_copy_to_backbuffer(pc, true, Rect2(0, 0, 1, 1))
			var pm := _item(parent, 2)
			rs.canvas_item_add_rect(pm, Rect2(0, 0, 1, 1), Color(1, 1, 1, 0))
			rs.canvas_item_set_material(pm, _material("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 1.0).rgb, 0.0);"))
		_group_scene(parent, 10, 60.0)
		if variant == "primer-then-panel-between":
			# A frosted panel (copy + mip backdrop) between two groups, then a second group.
			var c := _item(parent, 20)
			rs.canvas_item_set_copy_to_backbuffer(c, true, Rect2(500, 20, 100, 60).grow(40))
			var b := _item(parent, 21)
			rs.canvas_item_add_rect(b, Rect2(500, 20, 100, 60), Color.WHITE)
			rs.canvas_item_set_material(b, _material("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 1.0).rgb, COLOR.a);"))
			_group_scene(parent, 30, 300.0)
		await process_frame
		await process_frame
		var image := _grab()
		var a := PackedFloat32Array()
		for v in _row(image, 180, 60, 260):
			a.append(1.0 - v)
		var report := "primer variant=%s group1 width=%s" % [variant, _width(a)]
		if variant == "primer-then-panel-between":
			var b2 := PackedFloat32Array()
			for v in _row(image, 180, 300, 500):
				b2.append(1.0 - v)
			report += " group2 width=" + str(_width(b2))
		print(report, " (lod 3 blur is 18.9 wide; 0.8 means unreadable mips)")
		_cleanup()

# Poison every mip level with white, then blur black inside a copy rect of various inflation and see how much white leaks in.
func _test_contamination() -> void:
	var parent := holder.get_canvas_item()
	for lod in [2, 3, 4]:
		var leaks := []
		for inflate in [0, 8, 16, 24, 32, 48, 64, 96]:
			# Frame 1: all white, full-target mipmaps via an unrestricted material (no copy item => whole target).
			var white := _item(parent, 0)
			rs.canvas_item_add_rect(white, Rect2(0, 0, W, H), Color.WHITE)
			var poison := _item(parent, 1)
			rs.canvas_item_add_rect(poison, Rect2(0, 0, 4, 4), Color(1, 1, 1, 0))
			rs.canvas_item_set_material(poison, _material("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 5.0).rgb, 0.0);"))
			await process_frame
			_grab()
			_cleanup()
			# Frame 2: black screen; panel with a copy rect of the given inflation reads mip `lod`. Any white means stale data leaked.
			var black := _item(parent, 0)
			rs.canvas_item_add_rect(black, Rect2(0, 0, W, H), Color.BLACK)
			var panel := Rect2(240, 100, 160, 160)
			var copy := _item(parent, 1)
			rs.canvas_item_set_copy_to_backbuffer(copy, true, panel.grow(inflate))
			var backdrop := _item(parent, 2)
			rs.canvas_item_add_rect(backdrop, panel, Color.WHITE)
			rs.canvas_item_set_material(backdrop, _material("COLOR = vec4(textureLod(screen_tex, SCREEN_UV, %s).rgb, COLOR.a);" % str(float(lod))))
			await process_frame
			var image := _grab()
			var worst := 0.0
			for y in range(int(panel.position.y), int(panel.end.y)):
				for x in range(int(panel.position.x), int(panel.end.x)):
					worst = maxf(worst, image.get_pixel(x, y).r)
			leaks.append("%d:%.3f" % [inflate, worst])
			_cleanup()
		print("contamination lod=", lod, " (inflation:worst stale leak) ", " ".join(leaks))
