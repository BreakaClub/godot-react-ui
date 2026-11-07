extends RefCounted
# Item 6 of the brief: hit testing (spike.gd scenario=hit_roundtrip, hit_facing). Pure maths, no rendering. The f32 path uses
# Godot's Basis and Vector3, which are single precision, as a stand-in for an f32 implementation (Rust f32 would agree).

const Comp := preload("res://compositor.gd")

var h
var comp

func _init(driver) -> void:
	h = driver
	comp = driver.comp

func _result(name: String, data) -> void:
	var file := FileAccess.open("%s/%s/%s.json" % [h.out_dir, h.tag, name], FileAccess.WRITE)
	file.store_string(JSON.stringify(data, " "))
	file.close()
	print("RESULT ", name, " ", JSON.stringify(data))

const GRID_U := 64
const GRID_V := 40

# Plane point -> screen -> inverse homography -> plane point, over a grid that includes the card's edges and corners.
func hit_roundtrip() -> void:
	var viewport: Array = h.spec.viewport
	var card: Dictionary = h.spec.card
	var out := {}
	for scenario in h.spec.scenarios:
		var m: Array = Comp.scenario_matrix(scenario, card, viewport)
		var hom: Array = Comp.homography(m)
		var inv: Array = Comp.inverse3(hom)
		var basis := Basis(Vector3(hom[0][0], hom[1][0], hom[2][0]), Vector3(hom[0][1], hom[1][1], hom[2][1]), Vector3(hom[0][2], hom[1][2], hom[2][2]))
		var basis_inv := basis.inverse()
		var worst64 := 0.0
		var worst32 := 0.0
		var worst_screen64 := 0.0
		var worst_at := Vector2.ZERO
		var tested := 0
		var behind := 0
		for i in GRID_U + 1:
			for j in GRID_V + 1:
				var u: float = card.width * i / GRID_U
				var v: float = card.height * j / GRID_V
				var p: Vector3 = Comp.project(m, u, v)
				if p.z <= Comp.W_EPSILON:
					behind += 1
					continue
				tested += 1
				var q := Vector3(inv[0][0] * p.x + inv[0][1] * p.y + inv[0][2], inv[1][0] * p.x + inv[1][1] * p.y + inv[1][2], inv[2][0] * p.x + inv[2][1] * p.y + inv[2][2])
				var e64 := Vector2(q.x / q.z - u, q.y / q.z - v).length()
				if e64 > worst64:
					worst64 = e64
					worst_at = Vector2(u, v)
				# The same through single-precision types: forward and back.
				var f := basis * Vector3(u, v, 1.0)
				var screen := Vector3(f.x / f.z, f.y / f.z, 1.0)
				var g := basis_inv * screen
				worst32 = maxf(worst32, Vector2(g.x / g.z - u, g.y / g.z - v).length())
				# And the error in screen pixels: re-project the recovered plane point.
				var back: Vector3 = Comp.project(m, q.x / q.z, q.y / q.z)
				worst_screen64 = maxf(worst_screen64, Vector2(back.x - p.x, back.y - p.y).length())
		out[scenario.id] = { "tested": tested, "behind_viewer": behind, "max_plane_px_error_f64": worst64, "max_plane_px_error_f32": worst32, "max_screen_px_error_f64": worst_screen64, "worst_at_uv": [worst_at.x, worst_at.y] }
	_result("hit_roundtrip", out)

# backface-visibility: hidden by the sign of the determinant of the homography, against the sign of the projected area and
# against cos(angle) (the card faces away from the viewer when cos < 0) for rotateY(angle) under perspective(800px).
func hit_facing() -> void:
	var card: Dictionary = h.spec.card
	var viewport: Array = h.spec.viewport
	var mismatches_area := 0
	var mismatches_cos := 0
	var tested := 0
	for degrees in range(0, 360, 5):
		if degrees == 90 or degrees == 270:
			continue
		var scenario := { "perspective": 0.0, "transform": [["perspective", 800], ["rotateY", degrees]] }
		var m: Array = Comp.scenario_matrix(scenario, card, viewport)
		var det_sign := signf(Comp.facing(m, Vector2(card.width, card.height)))
		var area := 0.0
		var points: Array[Vector2] = []
		for corner in [Vector2(0, 0), Vector2(card.width, 0), Vector2(card.width, card.height), Vector2(0, card.height)]:
			var p: Vector3 = Comp.project(m, corner.x, corner.y)
			points.append(Vector2(p.x, p.y))
		for k in 4:
			area += points[k].x * points[(k + 1) % 4].y - points[(k + 1) % 4].x * points[k].y
		tested += 1
		if signf(area) != det_sign:
			mismatches_area += 1
		if det_sign != signf(cos(deg_to_rad(degrees))):
			mismatches_cos += 1
	_result("hit_facing", { "angles_tested": tested, "det_sign_vs_projected_area_sign_mismatches": mismatches_area, "det_sign_vs_cos_mismatches": mismatches_cos })
