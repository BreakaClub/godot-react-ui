extends RefCounted
# Item 5 of the brief: transform-style: preserve-3d (spike.gd scenario=p3d_scene). Faces of one 3D context are layers; their
# draw order comes from a BSP tree built in the projected space (x / w, y / w, z / w), where planes stay planes, which is
# what Chromium's cc does (DrawPolygon, BspTree). Polygons that cross a splitter plane are cut, in homogeneous coordinates so
# the cut vertices carry exact plane coordinates, and each piece is drawn with its face's layer through the face's own homography.
# Variants: "bsp" (the above), "centroid" (sort whole faces by the depth of their centre, no cutting) and "unsorted" (source order).

const Comp := preload("res://compositor.gd")

const SPLIT_EPSILON := 1e-3       # projected pixels: a vertex this close to a plane is on it
const EDGE_EXPAND := 1.0          # pixels the outer edges of every piece move out, for the shader's own edge coverage
const NEWELL_MIN := 1e-9

var h
var comp
var rs := RenderingServer
var scenes: Dictionary

func _init(driver) -> void:
	h = driver
	comp = driver.comp
	scenes = JSON.parse_string(FileAccess.get_file_as_string("res://scenes.json"))

func _result(name: String, data) -> void:
	var file := FileAccess.open("%s/%s/%s.json" % [h.out_dir, h.tag, name], FileAccess.WRITE)
	file.store_string(JSON.stringify(data, " "))
	file.close()
	print("RESULT ", name, " ", JSON.stringify(data))

# ---- faces ------------------------------------------------------------------------------------------------------

func _faces(scene: Dictionary) -> Array:
	var viewport: Array = scenes.viewport
	var container := Vector2(viewport[0], viewport[1])
	var size := Vector2(scene.size[0], scene.size[1])
	var origin := Vector2(0.5, 0.5)
	# T(p) P T(-p): the container's perspective about its centre, applied last.
	var perspective_matrix: Array = Comp.box_matrix([], Rect2(0, 0, 0, 0), float(scene.perspective), origin, container)
	var box: Array = scene.parent.box
	var parent_matrix: Array = Comp.box_matrix(scene.parent.transform, Rect2(box[0], box[1], box[2], box[3]), 0.0, origin, container)
	var faces := []
	for face in scene.faces:
		var face_matrix: Array = Comp.box_matrix(face.transform, Rect2(Vector2.ZERO, size), 0.0, origin, container)
		faces.append({ "id": face.id, "m": Comp.mul(perspective_matrix, Comp.mul(parent_matrix, face_matrix)), "size": size, "colour": Color(face.colour[0] / 255.0, face.colour[1] / 255.0, face.colour[2] / 255.0, scene.alpha) })
	return faces

func _draw_face_content(item: RID, face: Dictionary) -> void:
	var size: Vector2 = face.size
	rs.canvas_item_add_rect(item, Rect2(Vector2.ZERO, size), face.colour)
	for rect in [Rect2(0, 0, size.x, 2), Rect2(0, size.y - 2, size.x, 2), Rect2(0, 0, 2, size.y), Rect2(size.x - 2, 0, 2, size.y), Rect2(2, 2, 40, 40)]:
		rs.canvas_item_add_rect(item, rect, Color.WHITE)

# ---- polygons ---------------------------------------------------------------------------------------------------
# A polygon: { v: [[X, Y, Z, W, u, v], ...], outer: [bool per vertex: the edge to the next one is an edge of the face], face: int, plane: [nx, ny, nz, d] }

func _face_polygon(m: Array, size: Vector2, index: int) -> Dictionary:
	var hom := []
	for corner in [Vector2(0, 0), Vector2(size.x, 0), Vector2(size.x, size.y), Vector2(0, size.y)]:
		var u: float = corner.x
		var v: float = corner.y
		hom.append([m[0][0] * u + m[0][1] * v + m[0][3], m[1][0] * u + m[1][1] * v + m[1][3], m[2][0] * u + m[2][1] * v + m[2][3], m[3][0] * u + m[3][1] * v + m[3][3], u, v])
	var verts := []
	var outer := []
	for i in 4:
		var a: Array = hom[i]
		var b: Array = hom[(i + 1) % 4]
		var a_in: bool = a[3] > Comp.W_EPSILON
		var b_in: bool = b[3] > Comp.W_EPSILON
		if a_in:
			verts.append(a)
			outer.append(true)   # to the next vertex or to where the edge crosses the near plane: still the face's edge
		if a_in != b_in:
			var t: float = (Comp.W_EPSILON - a[3]) / (b[3] - a[3])
			var k := []
			for c in 6:
				k.append(a[c] + (b[c] - a[c]) * t)
			verts.append(k)
			outer.append(b_in)   # leaving: the edge to the next kept vertex is the near-plane cut; entering: the rest of the face edge
	if verts.size() < 3:
		return {}
	return { "v": verts, "outer": outer, "face": index, "plane": _plane(verts) }

func _projected(v: Array) -> Vector3:
	return Vector3(v[0] / v[3], v[1] / v[3], v[2] / v[3])

# Newell's normal of the projected polygon, turned to face the viewer (+z in projected space), and the plane offset.
func _plane(verts: Array) -> Array:
	var n := Vector3.ZERO
	for i in verts.size():
		var a := _projected(verts[i])
		var b := _projected(verts[(i + 1) % verts.size()])
		n += Vector3((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y))
	if n.length() < NEWELL_MIN or absf(n.z) < NEWELL_MIN:
		return []   # edge on to the viewer: it covers no pixels
	n = n.normalized()
	if n.z < 0.0:
		n = -n
	return [n.x, n.y, n.z, n.dot(_projected(verts[0]))]

func _signed(v: Array, plane: Array) -> float:
	return (plane[0] * v[0] + plane[1] * v[1] + plane[2] * v[2] - plane[3] * v[3]) / v[3]

func _lerp_vertex(a: Array, b: Array, t: float) -> Array:
	var out := []
	for c in 6:
		out.append(a[c] + (b[c] - a[c]) * t)
	return out

# Cuts a polygon by a plane into the part on the viewer's side and the part behind it.
func _split(poly: Dictionary, plane: Array) -> Array:
	var verts: Array = poly.v
	var n := verts.size()
	var front := { "v": [], "outer": [], "face": poly.face, "plane": poly.plane }
	var back := { "v": [], "outer": [], "face": poly.face, "plane": poly.plane }
	for i in n:
		var j := (i + 1) % n
		var a: Array = verts[i]
		var b: Array = verts[j]
		var flag: bool = poly.outer[i]
		var sa := _signed(a, plane)
		var sb := _signed(b, plane)
		if sa >= -SPLIT_EPSILON:
			front.v.append(a)
			# The edge continues in this part unless the next vertex is strictly behind: then it is cut at the plane.
			front.outer.append(flag if sb >= -SPLIT_EPSILON else (flag if sa > SPLIT_EPSILON else false))
		if sa <= SPLIT_EPSILON:
			back.v.append(a)
			back.outer.append(flag if sb <= SPLIT_EPSILON else (flag if sa < -SPLIT_EPSILON else false))
		var crosses: bool = (sa > SPLIT_EPSILON and sb < -SPLIT_EPSILON) or (sa < -SPLIT_EPSILON and sb > SPLIT_EPSILON)
		if crosses:
			var t: float = (sa * a[3]) / (sa * a[3] - sb * b[3])
			var k := _lerp_vertex(a, b, t)
			if sa > 0.0:
				front.v.append(k)
				front.outer.append(false)
				back.v.append(k)
				back.outer.append(flag)
			else:
				back.v.append(k)
				back.outer.append(false)
				front.v.append(k)
				front.outer.append(flag)
	return [front, back]

func _bsp(polys: Array) -> Dictionary:
	if polys.is_empty():
		return {}
	var splitter: Dictionary = polys[0]
	var plane: Array = splitter.plane
	var node := { "polys": [splitter], "front": [], "back": [] }
	for k in range(1, polys.size()):
		var p: Dictionary = polys[k]
		var has_front := false
		var has_back := false
		for v in p.v:
			var s := _signed(v, plane)
			if s > SPLIT_EPSILON:
				has_front = true
			elif s < -SPLIT_EPSILON:
				has_back = true
		if not has_front and not has_back:
			node.polys.append(p)
		elif not has_back:
			node.front.append(p)
		elif not has_front:
			node.back.append(p)
		else:
			var parts := _split(p, plane)
			for part in parts:
				if part.v.size() < 3:
					continue
			node.front.append(parts[0])
			node.back.append(parts[1])
	node.front = _bsp(node.front)
	node.back = _bsp(node.back)
	return node

# Far to near: what is behind the splitter, the splitter, what is in front of it.
func _emit(node: Dictionary, out: Array) -> void:
	if node.is_empty():
		return
	_emit(node.back, out)
	out.append_array(node.polys)
	_emit(node.front, out)

# The screen outline of a piece with its outer edges moved out; seam edges (cuts) stay where they are.
func _outline(poly: Dictionary) -> PackedVector2Array:
	var points: Array[Vector2] = []
	for v in poly.v:
		points.append(Vector2(v[0] / v[3], v[1] / v[3]))
	var n := points.size()
	var area := 0.0
	for i in n:
		area += points[i].x * points[(i + 1) % n].y - points[(i + 1) % n].x * points[i].y
	if absf(area) < 1e-6:
		return PackedVector2Array()
	var orientation := signf(area)
	var lines := []
	for i in n:
		var a := points[i]
		var b := points[(i + 1) % n]
		var d := (b - a).normalized()
		var amount := EDGE_EXPAND if poly.outer[i] else 0.0
		lines.append([a + Vector2(d.y, -d.x) * orientation * amount, d])
	var out := PackedVector2Array()
	for i in n:
		var l0: Array = lines[(i + n - 1) % n]
		var l1: Array = lines[i]
		var denom: float = l0[1].cross(l1[1])
		if absf(denom) < 1e-9:
			out.append(l1[0])
		else:
			out.append(l0[0] + l0[1] * ((l1[0] - l0[0]).cross(l1[1]) / denom))
	return out

# ---- the scene ----------------------------------------------------------------------------------------------------

func p3d_scene() -> void:
	var viewport: Array = scenes.viewport
	var css_size := Vector2(viewport[0], viewport[1])
	var only: PackedStringArray = String(h.args.get("only", "cube,cards")).split(",")
	var variants: PackedStringArray = String(h.args.get("variants", "bsp,centroid,unsorted")).split(",")
	var report := {}
	for dpr in [1, 2]:
		for name in only:
			var scene: Dictionary = scenes[name]
			var faces := _faces(scene)
			for variant in variants:
				var stage = h.make_stage(css_size, dpr)
				h.draw_background(stage.canvas, css_size)
				var layers := []
				var materials := []
				var polys := []
				for i in faces.size():
					var face: Dictionary = faces[i]
					var r: float = h.raster_scale(face.m, face.size, dpr)
					var layer = comp.make_layer(face.size, r, stage.viewport)
					_draw_face_content(h.new_item(layer.canvas), face)
					layers.append(layer)
					var material: RID = comp.make_material(layer.texture, 1)
					comp.set_material_matrix(material, face.m, face.size)
					materials.append(material)
					var poly := _face_polygon(face.m, face.size, i)
					if not poly.is_empty() and not poly.plane.is_empty():
						polys.append(poly)
				var ordered := []
				match variant:
					"bsp":
						_emit(_bsp(polys), ordered)
					"centroid":
						# Whole faces by the projected depth of their centre, far first.
						polys.sort_custom(func(a, b): return _centroid_z(a) < _centroid_z(b))
						ordered = polys
					"unsorted":
						ordered = polys
				for k in ordered.size():
					var poly: Dictionary = ordered[k]
					var outline := _outline(poly)
					if outline.size() < 3:
						continue
					var item: RID = h.new_item(stage.canvas)
					rs.canvas_item_set_material(item, materials[poly.face])
					var colours := PackedColorArray()
					var uvs := PackedVector2Array()
					for p in outline:
						colours.append(Color.WHITE)
						uvs.append(Vector2.ZERO)
					rs.canvas_item_add_polygon(item, outline, colours, uvs)
				await h.capture(stage, "%s/%s/scene-%s-%s-dpr%d.png" % [h.out_dir, h.tag, name, variant, dpr])
				report["%s-%s-dpr%d" % [name, variant, dpr]] = { "faces": faces.size(), "polygons_drawn": ordered.size() }
				for material in materials:
					rs.free_rid(material)
				h.free_tracked()
				for layer in layers:
					comp.free_layer(layer)
				h.free_stage(stage)
	_result("p3d_scene", report)

func _centroid_z(poly: Dictionary) -> float:
	var sum := 0.0
	for v in poly.v:
		sum += v[2] / v[3]
	return sum / poly.v.size()
