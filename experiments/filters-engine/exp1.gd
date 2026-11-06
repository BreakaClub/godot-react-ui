extends SceneTree
# Engine facts for Phase V1 (docs/tracks/filters.md): per-level blur width of the back-buffer mip chain,
# and whether a copy item + backdrop item pair behaves as D40 says.

const W := 640
const H := 360
const EDGE_X := 320
const PANEL := Rect2(40, 60, 560, 240)
const ROW := 180

var holder: Node2D
var rs := RenderingServer

func _initialize() -> void:
	holder = Node2D.new()
	root.add_child(holder)
	await process_frame
	await _run()
	quit()

func _scene_items() -> Array:
	var parent := holder.get_canvas_item()
	var bg := rs.canvas_item_create()
	rs.canvas_item_set_parent(bg, parent)
	rs.canvas_item_set_draw_index(bg, 0)
	rs.canvas_item_add_rect(bg, Rect2(0, 0, EDGE_X, H), Color.BLACK)
	rs.canvas_item_add_rect(bg, Rect2(EDGE_X, 0, W - EDGE_X, H), Color.WHITE)
	return [bg]

func _material(lod: float) -> RID:
	var shader := rs.shader_create()
	rs.shader_set_code(shader, """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float lod = 0.0;
void fragment() {
	COLOR = vec4(textureLod(screen_tex, SCREEN_UV, lod).rgb, COLOR.a);
}
""")
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	rs.material_set_param(material, "lod", lod)
	return material

func _profile() -> PackedFloat32Array:
	rs.force_draw()
	var image := root.get_texture().get_image()
	var out := PackedFloat32Array()
	for x in range(0, W):
		out.append(image.get_pixel(x, ROW).r)
	return out

func _width_10_90(p: PackedFloat32Array) -> float:
	# Linear interpolation of the 10% and 90% crossings (the profile rises from 0 to 1).
	var lo := -1.0
	var hi := -1.0
	for x in range(1, p.size()):
		if lo < 0.0 and p[x - 1] < 0.1 and p[x] >= 0.1:
			lo = (x - 1) + (0.1 - p[x - 1]) / (p[x] - p[x - 1])
		if hi < 0.0 and p[x - 1] < 0.9 and p[x] >= 0.9:
			hi = (x - 1) + (0.9 - p[x - 1]) / (p[x] - p[x - 1])
	return hi - lo

func _run() -> void:
	var csv := FileAccess.open("res://out/exp1-levels.csv", FileAccess.WRITE)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://out"))
	csv = FileAccess.open("res://out/exp1-levels.csv", FileAccess.WRITE)
	for lod in range(0, 8):
		var items := _scene_items()
		var parent := holder.get_canvas_item()
		var copy := rs.canvas_item_create()
		rs.canvas_item_set_parent(copy, parent)
		rs.canvas_item_set_draw_index(copy, 1)
		rs.canvas_item_set_copy_to_backbuffer(copy, true, Rect2(PANEL).grow(160.0))
		var backdrop := rs.canvas_item_create()
		rs.canvas_item_set_parent(backdrop, parent)
		rs.canvas_item_set_draw_index(backdrop, 2)
		rs.canvas_item_add_rect(backdrop, PANEL, Color.WHITE)
		rs.canvas_item_set_material(backdrop, _material(float(lod)))
		await process_frame
		await process_frame
		var p := _profile()
		var inside := p.slice(int(PANEL.position.x) + 5, int(PANEL.end.x) - 5)
		var width := _width_10_90(p.slice(100, 540))
		print("lod ", lod, " width_10_90=", width, " sigma_equiv=", width / 2.5631, " first=", p[int(PANEL.position.x) + 5], " last=", p[int(PANEL.end.x) - 5])
		var line := PackedStringArray()
		for x in range(150, 490):
			line.append("%.5f" % p[x])
		csv.store_line("%d,%s" % [lod, ",".join(line)])
		if lod == 3:
			root.get_texture().get_image().save_png("res://out/exp1-lod3.png")
		for item in items + [copy, backdrop]:
			rs.free_rid(item)
	csv.close()
