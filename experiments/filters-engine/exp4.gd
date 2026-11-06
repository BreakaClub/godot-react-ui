extends SceneTree
# Candidate backdrop blur kernel on the GPU against an ideal Gaussian edge, plus a fine radius sweep.
# Run: Godot --path experiments/filters-engine --resolution 1120x800 --script res://exp4.gd [-- compat|mobile]

var ALIGN := OS.get_cmdline_user_args().has('align')
const K_MIN := 0.6
const K_MAX := 3.0
const CHAIN_VARIANCE_PER_STEP := 1.75    # px^2 of the first downsample; step k adds this times 4^k

var holder: Node2D
var rs := RenderingServer
var freed: Array = []
var W := 1120
var H := 800

const SHADER := """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float level;
uniform int pairs;
uniform float inv_two_sigma2;
const int MAX_PAIRS = 10;

void fragment() {
	vec2 size = vec2(textureSize(screen_tex, int(level)));
	vec2 p = SCREEN_UV * size - 0.5;
	vec2 j0 = floor(p);
	vec2 f = p - j0;
	float wx[MAX_PAIRS];
	float wy[MAX_PAIRS];
	float px[MAX_PAIRS];
	float py[MAX_PAIRS];
	float sum_x = 0.0;
	float sum_y = 0.0;
	for (int i = 0; i < pairs; i++) {
		float m = float(2 * i - (pairs - 1));
		float ax = exp(-(f.x - m) * (f.x - m) * inv_two_sigma2);
		float bx = exp(-(f.x - m - 1.0) * (f.x - m - 1.0) * inv_two_sigma2);
		float ay = exp(-(f.y - m) * (f.y - m) * inv_two_sigma2);
		float by = exp(-(f.y - m - 1.0) * (f.y - m - 1.0) * inv_two_sigma2);
		wx[i] = ax + bx;
		wy[i] = ay + by;
		px[i] = (j0.x + m + 0.5 + bx / max(ax + bx, 1e-20)) / size.x;
		py[i] = (j0.y + m + 0.5 + by / max(ay + by, 1e-20)) / size.y;
		sum_x += wx[i];
		sum_y += wy[i];
	}
	vec4 acc = vec4(0.0);
	for (int j = 0; j < pairs; j++) {
		for (int i = 0; i < pairs; i++) {
			acc += (wx[i] * wy[j]) * textureLod(screen_tex, vec2(px[i], py[j]), level);
		}
	}
	acc /= sum_x * sum_y;
	COLOR = vec4(acc.rgb, COLOR.a);
}
"""

func _initialize() -> void:
	holder = Node2D.new()
	root.add_child(holder)
	await process_frame
	var size := root.get_visible_rect().size
	W = int(size.x)
	H = int(size.y)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://out"))
	var required := int(floor(log(float(maxi(W, H))) / log(2.0)))
	var lmax := maxi(1, required - 4) - 1 if rs.get_current_rendering_method() == "gl_compatibility" else required - 1
	print("renderer=", rs.get_current_rendering_method(), " target=", W, "x", H, " required_mips=", required, " lmax=", lmax)
	await _accuracy(lmax)
	await _sweep(lmax)
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

func _variance(level: int) -> float:
	return CHAIN_VARIANCE_PER_STEP * (pow(4.0, level) - 1.0) / 3.0

# Returns [level, sigma_k, pairs].
func _plan(sigma: float, lmax: int) -> Array:
	var best := 0
	for l in range(0, lmax + 1):
		if _variance(l) + pow(K_MIN * pow(2.0, l), 2.0) <= sigma * sigma:
			best = l
	var h := pow(2.0, best)
	var sk := sqrt(maxf(sigma * sigma - _variance(best), 0.0)) / h
	sk = minf(sk, K_MAX)
	if best > 0:
		sk = maxf(sk, K_MIN)
	sk = maxf(sk, 0.3)
	var reach := int(ceil(3.0 * sk))
	return [best, sk, reach + 1]

func _setup(sigma: float, lmax: int, material_cache := {}) -> Array:
	var parent := holder.get_canvas_item()
	var bg := _item(parent, 0)
	rs.canvas_item_add_rect(bg, Rect2(0, 0, W / 2, H), Color.BLACK)
	rs.canvas_item_add_rect(bg, Rect2(W / 2, 0, W / 2, H), Color.WHITE)
	var pl := _plan(sigma, lmax)
	var panel := Rect2(W * 0.1, H * 0.25, W * 0.8, H * 0.5)
	var h: float = pow(2.0, float(pl[0]))
	var inflate: float = ceil(float(pl[2]) * h + 3.5 * h) + 2.0
	var copy := _item(parent, 1)
	var region := panel.grow(inflate)
	if ALIGN:
		var a: float = pow(2.0, float(pl[0]))
		var x0 := maxf(floor(region.position.x / a) * a, 0.0)
		var y0 := maxf(floor(region.position.y / a) * a, 0.0)
		var x1 := minf(ceil(region.end.x / a) * a, float(W))
		var y1 := minf(ceil(region.end.y / a) * a, float(H))
		region = Rect2(x0, y0, x1 - x0, y1 - y0)
	rs.canvas_item_set_copy_to_backbuffer(copy, true, region)
	var backdrop := _item(parent, 2)
	rs.canvas_item_add_rect(backdrop, panel, Color.WHITE)
	var shader := rs.shader_create()
	rs.shader_set_code(shader, SHADER)
	var material := rs.material_create()
	rs.material_set_shader(material, shader)
	rs.material_set_param(material, "level", float(pl[0]))
	rs.material_set_param(material, "pairs", int(pl[2]))
	rs.material_set_param(material, "inv_two_sigma2", 1.0 / (2.0 * pl[1] * pl[1]))
	rs.canvas_item_set_material(backdrop, material)
	return [pl, panel]

func _phi(z: float) -> float:
	return 0.5 * (1.0 + _erf(z / sqrt(2.0)))

func _erf(x: float) -> float:
	# Abramowitz-Stegun 7.1.26, |error| < 1.5e-7.
	var s := 1.0 if x >= 0.0 else -1.0
	x = absf(x)
	var t := 1.0 / (1.0 + 0.3275911 * x)
	var y := 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x)
	return s * y

func _width(p: PackedFloat32Array) -> float:
	var lo := -1.0
	var hi := -1.0
	for x in range(1, p.size()):
		if lo < 0.0 and p[x - 1] < 0.1 and p[x] >= 0.1:
			lo = (x - 1) + (0.1 - p[x - 1]) / (p[x] - p[x - 1])
		if hi < 0.0 and p[x - 1] < 0.9 and p[x] >= 0.9:
			hi = (x - 1) + (0.9 - p[x - 1]) / (p[x] - p[x - 1])
	return hi - lo

func _accuracy(lmax: int) -> void:
	var csv := FileAccess.open("res://out/exp4-accuracy.csv", FileAccess.WRITE)
	for sigma in [2.0, 4.0, 8.0, 12.0, 16.0, 24.0, 40.0, 64.0]:
		var info := _setup(sigma, lmax)
		await process_frame
		await process_frame
		rs.force_draw()
		var image := root.get_texture().get_image()
		var y := H / 2
		var span := int(minf(4.0 * sigma + 40.0, W * 0.3))
		var p := PackedFloat32Array()
		var ideal := PackedFloat32Array()
		var worst := 0.0
		for x in range(W / 2 - span, W / 2 + span):
			var v := image.get_pixel(x, y).r
			var q := _phi((x + 0.5 - W / 2) / sigma)
			p.append(v)
			ideal.append(q)
			worst = maxf(worst, absf(v - q))
		var pl: Array = info[0]
		print("sigma=%5.1f css_blur=%5.1f L=%d sigma_k=%.2f pairs=%d  width=%.2f ideal=%.2f ratio=%.3f max|err|=%.4f" % [sigma, sigma, pl[0], pl[1], pl[2], _width(p), 2.5631 * sigma, _width(p) / (2.5631 * sigma), worst])
		csv.store_line("%f,%s" % [sigma, ",".join(Array(p).map(func(v): return "%.5f" % v))])
		if sigma == 24.0:
			image.save_png("res://out/exp4-sigma24.png")
		_cleanup()
	csv.close()

# A fine sweep of the radius: the probe pixel one sigma right of the edge must change smoothly (no pop, no staircase).
func _sweep(lmax: int) -> void:
	var values := PackedFloat32Array()
	var sigmas := PackedFloat32Array()
	var s := 3.0
	while s <= 70.0:
		_setup(s, lmax)
		await process_frame
		rs.force_draw()
		var image := root.get_texture().get_image()
		# Probe: a fixed distance (12 px) right of the edge, which reads ~ Phi(12 / sigma).
		values.append(image.get_pixel(W / 2 + 12, H / 2).r)
		sigmas.append(s)
		_cleanup()
		s *= 1.01
	var worst_jump := 0.0
	var worst_at := 0.0
	var worst_dev := 0.0
	for i in range(1, values.size()):
		var expect_step := _phi(12.0 / sigmas[i]) - _phi(12.0 / sigmas[i - 1])
		var jump := absf((values[i] - values[i - 1]) - expect_step)
		if jump > worst_jump:
			worst_jump = jump
			worst_at = sigmas[i]
		worst_dev = maxf(worst_dev, absf(values[i] - _phi(12.0 / sigmas[i])))
	print("sweep: samples=%d worst deviation of a 1%% step from the ideal step=%.4f at sigma=%.1f; worst |value - ideal|=%.4f (8-bit step is 0.0039)" % [values.size(), worst_jump, worst_at, worst_dev])
