extends SceneTree
# Driver for the transform3d experiments (docs/tracks/transforms-3d-feasibility.md). One scenario per run:
#
#   Godot --path experiments/transform3d --audio-driver Dummy --rendering-method gl_compatibility --resolution 320x200 \
#     --script res://spike.gd -- scenario=accuracy tag=breaka-compat out=<dir> chrome=<dir of chrome-reference output>
#
# Scenarios: accuracy (the compositor layer against Chrome), more are added to SCENARIOS below.

const Comp := preload("res://compositor.gd")

var comp
var args := {}
var spec: Dictionary
var out_dir := ""
var chrome_dir := ""
var tag := ""
var rs := RenderingServer
var fonts := {}
var tracked: Array[RID] = []   # every canvas item made by new_item, freed by free_tracked()

func _initialize() -> void:
	for raw in OS.get_cmdline_user_args():
		var parts := String(raw).split("=", true, 1)
		args[parts[0]] = parts[1] if parts.size() > 1 else "true"
	out_dir = args.get("out", "")
	chrome_dir = args.get("chrome", "")
	tag = args.get("tag", "run")
	spec = JSON.parse_string(FileAccess.get_file_as_string("res://scenarios.json"))
	DirAccess.make_dir_recursive_absolute(out_dir + "/" + tag)
	await process_frame
	comp = Comp.new()
	var scenario_name: String = args.get("scenario", "accuracy")
	# Scenarios named <prefix>_... live in s_<prefix>.gd, written against this driver's helpers.
	var external := { "nest": "res://s_nest.gd", "cost": "res://s_cost.gd", "p3d": "res://s_p3d.gd", "alt": "res://s_alt.gd", "alt2": "res://s_alt2.gd", "hit": "res://s_hit.gd" }
	var prefix := scenario_name.get_slice("_", 0)
	if external.has(prefix):
		var script: GDScript = load(external[prefix])
		if script == null or not script.can_instantiate():
			push_error("could not load " + external[prefix])
			quit(1)
			return
		var scenarios = script.new(self)
		await scenarios.call(scenario_name)
	else:
		await call(scenario_name)
	comp.free_shaders()
	quit()

# ---- shared helpers ---------------------------------------------------------------------------------------------

class Stage:
	var viewport: RID
	var canvas: RID
	var css_size: Vector2
	var dpr: float

func make_stage(css_size: Vector2, dpr: float, transparent := false) -> Stage:
	var stage := Stage.new()
	stage.css_size = css_size
	stage.dpr = dpr
	stage.viewport = rs.viewport_create()
	rs.viewport_set_size(stage.viewport, int(css_size.x * dpr), int(css_size.y * dpr))
	rs.viewport_set_clear_mode(stage.viewport, RenderingServer.VIEWPORT_CLEAR_ALWAYS)
	rs.viewport_set_transparent_background(stage.viewport, transparent)
	rs.viewport_set_update_mode(stage.viewport, RenderingServer.VIEWPORT_UPDATE_ALWAYS)
	stage.canvas = rs.canvas_create()
	rs.viewport_attach_canvas(stage.viewport, stage.canvas)
	rs.viewport_set_canvas_transform(stage.viewport, stage.canvas, Transform2D(0.0, Vector2(dpr, dpr), 0.0, Vector2.ZERO))
	rs.viewport_set_active(stage.viewport, true)
	return stage

func free_stage(stage: Stage) -> void:
	rs.viewport_set_active(stage.viewport, false)
	rs.free_rid(stage.viewport)
	rs.free_rid(stage.canvas)

func new_item(parent: RID, index: int = -1) -> RID:
	var item := rs.canvas_item_create()
	tracked.append(item)
	rs.canvas_item_set_parent(item, parent)
	if index >= 0:
		rs.canvas_item_set_draw_index(item, index)
	return item

# The page background of chrome-reference.mjs: two halves and a stripe, all on whole CSS pixels.
func draw_background(parent: RID, css_size: Vector2) -> RID:
	var item := new_item(parent, 0)
	rs.canvas_item_add_rect(item, Rect2(0, 0, css_size.x / 2.0, css_size.y), Color.html("#2f5d8a"))
	rs.canvas_item_add_rect(item, Rect2(css_size.x / 2.0, 0, css_size.x / 2.0, css_size.y), Color.html("#c9a24a"))
	rs.canvas_item_add_rect(item, Rect2(0, 190, css_size.x, 20), Color.html("#3b8f5a"))
	return item

func font(name: String) -> FontFile:
	if not fonts.has(name):
		var f := FontFile.new()
		f.load_dynamic_font("/System/Library/Fonts/Supplemental/" + name + ".ttf")
		f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
		f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_AUTO
		fonts[name] = f
	return fonts[name]

# The card of chrome-reference.mjs, drawn in CSS pixels with its top left at the origin of `item`.
func draw_card(item: RID, card_size: Vector2, text := true) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(30.0 / 255.0, 60.0 / 255.0, 200.0 / 255.0, 0.55)
	box.border_color = Color.WHITE
	box.set_border_width_all(1)
	box.set_corner_radius_all(16)
	box.anti_aliasing = true
	box.draw(item, Rect2(Vector2.ZERO, card_size))
	if not text:
		return
	font("Arial Bold").draw_string(item, Vector2(21, 47), "Perspective", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color.WHITE)
	font("Arial").draw_string(item, Vector2(21, 76), "A 320 by 200 card: a one pixel border,", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
	font("Arial").draw_string(item, Vector2(21, 96), "rounded corners, text and a translucent fill.", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
	rs.canvas_item_add_rect(item, Rect2(21, 113, 120, 8), Color.html("#ffd24a"))

func free_tracked() -> void:
	for item in tracked:
		rs.free_rid(item)
	tracked.clear()

func capture(stage: Stage, path: String) -> Image:
	await rs.frame_post_draw
	await rs.frame_post_draw
	await rs.frame_post_draw
	var image := rs.texture_2d_get(rs.viewport_get_texture(stage.viewport))
	image.convert(Image.FORMAT_RGBA8)
	image.save_png(path)
	return image

func chrome_texture(dpr: int) -> ImageTexture:
	var image := Image.load_from_file("%s/flat-dpr%d.png" % [chrome_dir, dpr])
	image.convert(Image.FORMAT_RGBA8)
	image.premultiply_alpha()
	return ImageTexture.create_from_image(image)

# ---- accuracy ---------------------------------------------------------------------------------------------------
# Every scenario at DPR 1 and 2, twice: "src" samples Chrome's own raster of the untransformed card (so any difference
# is the transform, filtering and edge), "own" renders the card with Godot into the layer (so it also shows the layer
# pipeline: transparent target, premultiplied edges, text rasteriser). "flat" is the untransformed card the same way.

func scale_name(r: float) -> String:
	return str(int(r)) if r == floorf(r) else str(r)

const RASTER_CAP := 4.0   # Chrome's pick for the plane that crosses the viewer, where the magnification is unbounded

# Chrome's raster scale as fitted in docs/tracks/transforms-3d-feasibility.md: round(dpr * largest local magnification).
func raster_scale(m: Array, card_size: Vector2, dpr: float) -> float:
	var magnification: float = Comp.max_magnification(m, card_size)
	if is_inf(magnification):
		return RASTER_CAP
	return clampf(roundf(dpr * magnification), 1.0, 5.0)

func chrome_flat(r: float) -> ImageTexture:
	var image := Image.load_from_file("%s/flat-r%s.png" % [chrome_dir, scale_name(r)])
	image.convert(Image.FORMAT_RGBA8)
	image.premultiply_alpha()
	return ImageTexture.create_from_image(image)

# Modes: src (Chrome's own raster of the flat card, at the fitted raster scale, one bilinear tap, analytic edges),
# own (the card rendered by Godot into the layer at the same scale), and controls: own-mix (the engine's default blend
# instead of premultiplied), src-noaa (no analytic edge coverage), src-q8 (up to 8 x 8 taps per pixel), src-r1 (the
# raster scale is the device pixel ratio whatever the magnification).
func accuracy() -> void:
	var viewport: Array = spec.viewport
	var card: Dictionary = spec.card
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(card.width, card.height)
	var only: PackedStringArray = String(args.get("only", "")).split(",", false)
	var modes: PackedStringArray = String(args.get("modes", "src,own,own-mix,src-noaa,src-q8,src-r1")).split(",")
	var info := {}
	for dpr in [1, 2]:
		var cases: Array = [{ "id": "flat", "transform": [] }]
		cases.append_array(spec.scenarios)
		for scenario in cases:
			if not only.is_empty() and not only.has(scenario.id) and scenario.id != "flat":
				continue
			if scenario.get("backface", "") == "hidden" and Comp.facing(Comp.scenario_matrix(scenario, card, viewport), card_size) < 0.0:
				continue
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			for mode in modes:
				var r: float = dpr if mode == "src-r1" else raster_scale(m, card_size, dpr)
				var stage := make_stage(css_size, dpr)
				draw_background(stage.canvas, css_size)
				var layer = null
				var texture: RID
				var keep = null
				if mode.begins_with("own"):
					layer = comp.make_layer(card_size, r, stage.viewport)
					draw_card(new_item(layer.canvas), card_size)
					texture = layer.texture
				else:
					keep = chrome_flat(r)
					texture = keep.get_rid()
				var taps := 8 if mode == "src-q8" else 1
				var material: RID = comp.make_material(texture, taps, 0.0 if mode == "src-noaa" else 1.0, mode != "own-mix")
				comp.set_material_matrix(material, m, card_size)
				var quad := new_item(stage.canvas, 1)
				var ok: bool = comp.set_quad(quad, material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
				await capture(stage, "%s/%s/%s-%s-dpr%d.png" % [out_dir, tag, mode, scenario.id, dpr])
				info["%s-%s-dpr%d" % [mode, scenario.id, dpr]] = { "drawn": ok, "raster": r }
				rs.free_rid(material)
				free_tracked()
				if layer != null:
					comp.free_layer(layer)
				free_stage(stage)
	var report := FileAccess.open("%s/%s/accuracy.json" % [out_dir, tag], FileAccess.WRITE)
	report.store_string(JSON.stringify({ "adapter": rs.get_video_adapter_name(), "version": Engine.get_version_info(), "method": RenderingServer.get_current_rendering_method(), "cases": info }))
	report.close()

# ---- raster scale -------------------------------------------------------------------------------------------------
# The same scenarios with Chrome's flat card rasterised at several scales (flat-r<scale>.png): the scale whose error
# against Chrome is smallest is the one Chrome used, and the sharpness shows what a smaller one costs.

func raster() -> void:
	var viewport: Array = spec.viewport
	var card: Dictionary = spec.card
	var css_size := Vector2(viewport[0], viewport[1])
	var card_size := Vector2(card.width, card.height)
	var ids: PackedStringArray = String(args.get("ids", "tzflat,tz,tz500,p35,cross1")).split(",")
	var rasters: Array = spec.rasters.duplicate()
	rasters.append_array(JSON.parse_string(FileAccess.get_file_as_string("res://scenes.json")).rasters_extra)
	for dpr in [1, 2]:
		for scenario in spec.scenarios:
			if not ids.has(scenario.id):
				continue
			var m: Array = Comp.scenario_matrix(scenario, card, viewport)
			for r in rasters:
				var image := Image.load_from_file("%s/flat-r%s.png" % [chrome_dir, scale_name(r)])
				image.convert(Image.FORMAT_RGBA8)
				image.premultiply_alpha()
				var src := ImageTexture.create_from_image(image)
				var stage := make_stage(css_size, dpr)
				draw_background(stage.canvas, css_size)
				var material: RID = comp.make_material(src.get_rid(), int(args.get("taps", "8")))
				comp.set_material_matrix(material, m, card_size)
				var quad := new_item(stage.canvas, 1)
				comp.set_quad(quad, material, m, card_size, Rect2(Vector2(-64, -64), css_size + Vector2(128, 128)))
				await capture(stage, "%s/%s/r%s-%s-dpr%d.png" % [out_dir, tag, scale_name(r), scenario.id, dpr])
				rs.free_rid(material)
				free_tracked()
				free_stage(stage)

# Texture memory for one layer at several raster scales, as the renderer reports it.
func layer_memory() -> void:
	var rows := []
	for dpr in [1.0, 2.0, 3.2, 4.0]:
		await rs.frame_post_draw
		var before := rs.get_rendering_info(RenderingServer.RENDERING_INFO_TEXTURE_MEM_USED)
		var before_video := rs.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED)
		var layer = comp.make_layer(Vector2(320, 200), dpr, RID(), RenderingServer.VIEWPORT_UPDATE_ALWAYS)
		var content := new_item(layer.canvas)
		draw_card(content, Vector2(320, 200))
		await rs.frame_post_draw
		await rs.frame_post_draw
		var after := rs.get_rendering_info(RenderingServer.RENDERING_INFO_TEXTURE_MEM_USED)
		var after_video := rs.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED)
		rows.append({ "scale": dpr, "pixels": layer.size_px.x * layer.size_px.y, "rgba8_bytes": layer.size_px.x * layer.size_px.y * 4, "texture_mem_delta": after - before, "video_mem_delta": after_video - before_video })
		free_tracked()
		comp.free_layer(layer)
	var report := FileAccess.open("%s/%s/layer-memory.json" % [out_dir, tag], FileAccess.WRITE)
	report.store_string(JSON.stringify(rows, " "))
	report.close()
	print(JSON.stringify(rows))
