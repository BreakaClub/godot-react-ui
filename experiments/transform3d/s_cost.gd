extends RefCounted
# Item 4 of the brief: cost on this machine (spike.gd scenario=cost_layers). 1, 10 and 50 cards, each as
#   flat     the card drawn straight into the stage (no layer; the reference cost of the content itself),
#   static   a layer rendered once (VIEWPORT_UPDATE_ONCE then disabled) and drawn through the homography quad, the quad's
#            matrix changing every frame: a spin re-renders nothing,
#   dynamic  a layer re-rendered every frame (VIEWPORT_UPDATE_ALWAYS) with a moving item, the quad changing every frame.
# Measured per frame, over MEASURED_FRAMES after WARMUP_FRAMES, with the window's vsync off:
#   wall   the time between successive frame_post_draw signals (the whole frame, CPU and GPU together),
#   gpu    RenderingServer.viewport_get_measured_render_time_gpu, summed over the stage and the layers (0 where the driver has no timer),
#   cpu    viewport_get_measured_render_time_cpu, summed likewise (the engine's own CPU time to record and submit),
#   script the time this GDScript spends updating the quads (an upper bound: a Rust caller makes the same server calls without the interpreter).

const Comp := preload("res://compositor.gd")

const WARMUP_FRAMES := 30
const MEASURED_FRAMES := 150
const COUNTS := [1, 10, 50]
const STAGE_CSS := Vector2(1280, 800)
const SPIN_DEGREES_PER_SECOND := 60.0
const MICROSECONDS_PER_MILLISECOND := 1000.0

var h
var comp
var rs := RenderingServer

func _init(driver) -> void:
	h = driver
	comp = driver.comp

func _percentile(sorted: Array, fraction: float) -> float:
	if sorted.is_empty():
		return 0.0
	return sorted[int((sorted.size() - 1) * fraction)]

func _summary(values: Array) -> Dictionary:
	var sorted := values.duplicate()
	sorted.sort()
	return { "median": _percentile(sorted, 0.5), "p95": _percentile(sorted, 0.95), "max": _percentile(sorted, 1.0) }

func _card_position(i: int) -> Vector2:
	return Vector2(40.0 + (i % 4) * 300.0, 30.0 + ((i / 4) % 4) * 190.0)

func cost_layers() -> void:
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	var dpr := float(h.args.get("dpr", "2"))
	var results := []
	for mode in ["flat", "static", "dynamic"]:
		for count in COUNTS:
			results.append(await _run_case(mode, count, dpr))
	var file := FileAccess.open("%s/%s/cost-layers.json" % [h.out_dir, h.tag], FileAccess.WRITE)
	file.store_string(JSON.stringify({ "dpr": dpr, "stage_css": [STAGE_CSS.x, STAGE_CSS.y], "adapter": rs.get_video_adapter_name(), "method": rs.get_current_rendering_method(), "cases": results }, " "))
	file.close()
	for row in results:
		print("RESULT cost ", JSON.stringify(row))

func _run_case(mode: String, count: int, dpr: float) -> Dictionary:
	var card_size := Vector2(320, 200)
	var stage = h.make_stage(STAGE_CSS, dpr)
	rs.viewport_set_measure_render_time(stage.viewport, true)
	var layers := []
	var quads := []
	var materials := []
	var movers := []
	var base_matrices := []
	var origin := Vector2.ZERO
	for i in count:
		var position := _card_position(i)
		if mode == "flat":
			var item: RID = h.new_item(stage.canvas)
			rs.canvas_item_set_transform(item, Transform2D(0.0, position))
			h.draw_card(item, card_size)
			continue
		var layer = comp.make_layer(card_size, dpr, stage.viewport, RenderingServer.VIEWPORT_UPDATE_ONCE if mode == "static" else RenderingServer.VIEWPORT_UPDATE_ALWAYS)
		rs.viewport_set_measure_render_time(layer.viewport, true)
		var content: RID = h.new_item(layer.canvas)
		h.draw_card(content, card_size)
		var mover: RID = h.new_item(layer.canvas)
		rs.canvas_item_add_rect(mover, Rect2(0, 0, 20, 20), Color.WHITE)
		movers.append(mover)
		layers.append(layer)
		var material: RID = comp.make_material(layer.texture, 1)
		materials.append(material)
		var quad: RID = h.new_item(stage.canvas)
		quads.append(quad)
	var wall := []
	var gpu := []
	var cpu := []
	var script := []
	var frame := 0
	var previous := Time.get_ticks_usec()
	var started := Time.get_ticks_usec()
	while frame < WARMUP_FRAMES + MEASURED_FRAMES:
		var script_start := Time.get_ticks_usec()
		var seconds := (Time.get_ticks_usec() - started) / 1e6
		if mode != "flat":
			for i in count:
				var position := _card_position(i)
				var list := [["perspective", 800.0], ["rotateY", fmod(seconds * SPIN_DEGREES_PER_SECOND + i * 7.0, 360.0)]]
				var m: Array = Comp.box_matrix(list, Rect2(position, card_size), 0.0, Vector2(0.5, 0.5), STAGE_CSS)
				comp.set_material_matrix(materials[i], m, card_size)
				comp.set_quad(quads[i], materials[i], m, card_size, Rect2(Vector2(-64, -64), STAGE_CSS + Vector2(128, 128)))
				if mode == "dynamic":
					rs.canvas_item_set_transform(movers[i], Transform2D(0.0, Vector2(fmod(seconds * 100.0, 280.0), 150.0)))
		var script_us := Time.get_ticks_usec() - script_start
		await rs.frame_post_draw
		var now := Time.get_ticks_usec()
		if frame >= WARMUP_FRAMES:
			wall.append((now - previous) / MICROSECONDS_PER_MILLISECOND)
			script.append(script_us / MICROSECONDS_PER_MILLISECOND)
			var gpu_ms: float = rs.viewport_get_measured_render_time_gpu(stage.viewport)
			var cpu_ms: float = rs.viewport_get_measured_render_time_cpu(stage.viewport)
			for layer in layers:
				gpu_ms += rs.viewport_get_measured_render_time_gpu(layer.viewport)
				cpu_ms += rs.viewport_get_measured_render_time_cpu(layer.viewport)
			gpu.append(gpu_ms)
			cpu.append(cpu_ms)
		previous = now
		frame += 1
	var info := { "mode": mode, "cards": count, "wall_ms": _summary(wall), "gpu_ms": _summary(gpu), "cpu_ms": _summary(cpu), "script_ms": _summary(script) }
	for material in materials:
		rs.free_rid(material)
	h.free_tracked()
	for layer in layers:
		comp.free_layer(layer)
	h.free_stage(stage)
	await rs.frame_post_draw
	return info
