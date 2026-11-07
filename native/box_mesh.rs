//! The triangle mesh of a filled rounded rectangle, for what `StyleBoxFlat` cannot fill: a gradient. Nothing here touches
//! Godot: a mesh is positions in device pixels, an alpha for each (the anti-aliasing feather is one device pixel wide,
//! centred on the true edge, as `StyleBoxFlat`'s is) and triangle indices.

use crate::rrect::{RRect, Vertex, arc_segments};

/// A vertex: where it is and how opaque the shape is there (0 on the outer edge of the feather, 1 inside).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
    pub alpha: f32,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Mesh {
    pub points: Vec<Point>,
    pub indices: Vec<u32>,
}

impl Mesh {
    fn push(&mut self, point: Point) -> u32 {
        self.points.push(point);
        (self.points.len() - 1) as u32
    }

    fn triangle(&mut self, a: u32, b: u32, c: u32) {
        self.indices.extend([a, b, c]);
    }

    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }

    /// Add a convex polygon as a fan.
    fn polygon(&mut self, polygon: &[Point]) {
        if polygon.len() < 3 {
            return;
        }
        let first = self.push(polygon[0]);
        let mut previous = self.push(polygon[1]);
        for point in &polygon[2..] {
            let next = self.push(*point);
            self.triangle(first, previous, next);
            previous = next;
        }
    }
}

fn moved(vertex: &Vertex, alpha: f32) -> Point {
    Point {
        x: vertex.x,
        y: vertex.y,
        alpha,
    }
}

/// The segments of a corner arc for a rectangle: enough for its largest radius.
pub fn segments_for(rect: &RRect) -> usize {
    rect.corners
        .iter()
        .map(|corner| arc_segments(corner.x.max(corner.y)))
        .max()
        .unwrap_or(1)
}

/// The filled shape: the outline moved in by half the feather at alpha 1 as a fan, and a strip out to half the feather
/// beyond it at alpha 0. A square shape needs no feather (its edges are on device pixels) and is a quad.
pub fn fill(rect: &RRect, feather: f32) -> Mesh {
    let mut mesh = Mesh::default();
    if rect.width() <= 0.0 || rect.height() <= 0.0 {
        return mesh;
    }
    if !rect.is_rounded() || feather <= 0.0 {
        let corners = [
            Point {
                x: rect.x0,
                y: rect.y0,
                alpha: 1.0,
            },
            Point {
                x: rect.x1,
                y: rect.y0,
                alpha: 1.0,
            },
            Point {
                x: rect.x1,
                y: rect.y1,
                alpha: 1.0,
            },
            Point {
                x: rect.x0,
                y: rect.y1,
                alpha: 1.0,
            },
        ];
        mesh.polygon(&corners);
        return mesh;
    }
    let segments = segments_for(rect);
    let inner = rect.outline(-feather * 0.5, segments);
    let outer = rect.outline(feather * 0.5, segments);
    let centre = mesh.push(Point {
        x: (rect.x0 + rect.x1) * 0.5,
        y: (rect.y0 + rect.y1) * 0.5,
        alpha: 1.0,
    });
    let inner_ids: Vec<u32> = inner
        .iter()
        .map(|vertex| mesh.push(moved(vertex, 1.0)))
        .collect();
    let outer_ids: Vec<u32> = outer
        .iter()
        .map(|vertex| mesh.push(moved(vertex, 0.0)))
        .collect();
    let count = inner_ids.len();
    for index in 0..count {
        let next = (index + 1) % count;
        mesh.triangle(centre, inner_ids[index], inner_ids[next]);
        mesh.triangle(inner_ids[index], outer_ids[index], outer_ids[next]);
        mesh.triangle(inner_ids[index], outer_ids[next], inner_ids[next]);
    }
    mesh
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    /// Sample a mesh at a point: the interpolated alpha of the triangle it is in, 0 if none.
    pub(crate) fn sample(mesh: &Mesh, x: f32, y: f32) -> f32 {
        // A point exactly on an edge two triangles share would count twice: nudge it off every grid line.
        let (x, y) = (x + 0.001_3, y + 0.000_7);
        let mut total = 0.0;
        for triangle in mesh.indices.as_chunks::<3>().0 {
            let [a, b, c] = triangle.map(|index| mesh.points[index as usize]);
            let denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
            if denominator.abs() < 1e-9 {
                continue;
            }
            let u = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / denominator;
            let v = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / denominator;
            let w = 1.0 - u - v;
            if u >= -1e-5 && v >= -1e-5 && w >= -1e-5 {
                total += u * a.alpha + v * b.alpha + w * c.alpha;
            }
        }
        total
    }

    fn close(a: f32, b: f32, tolerance: f32) {
        assert!((a - b).abs() <= tolerance, "{a} != {b}");
    }

    #[test]
    fn a_square_fill_is_a_quad_with_no_feather() {
        let mesh = fill(&RRect::from_box(10.0, 6.0, [0.0; 4]), 1.0);
        assert_eq!(mesh.indices.len(), 6);
        close(sample(&mesh, 0.5, 0.5), 1.0, 1e-6);
        close(sample(&mesh, 10.5, 3.0), 0.0, 1e-6);
    }

    #[test]
    fn a_rounded_fill_has_the_coverage_of_the_shape() {
        let rect = RRect::from_box(40.0, 30.0, [10.0; 4]);
        let mesh = fill(&rect, 1.0);
        let mut worst = 0.0_f32;
        let mut mean = 0.0;
        let mut count = 0.0;
        for row in -2..32 {
            for column in -2..42 {
                let (x, y) = (column as f32 + 0.5, row as f32 + 0.5);
                let difference = (sample(&mesh, x, y) - rect.coverage(x, y)).abs();
                worst = worst.max(difference);
                mean += difference;
                count += 1.0;
            }
        }
        // The straight edges are exact; the arcs differ by a fraction of a pixel's coverage.
        assert!(worst < 0.2, "worst {worst}");
        assert!(mean / count < 0.003, "mean {}", mean / count);
    }

    #[test]
    fn a_pill_top_is_a_true_circle() {
        // rounded-t-full on 64 x 56: radii scaled to 32 on the top corners; the arc is the circle of radius 32 about (32, 32).
        let rect = RRect::from_box(64.0, 56.0, [9999.0, 9999.0, 0.0, 0.0]);
        assert!((rect.corners[0].x - 32.0).abs() < 1e-3 && (rect.corners[0].y - 32.0).abs() < 1e-3);
        let mesh = fill(&rect, 1.0);
        // The pixel centred (3.5, 16.5) is 32.44 from the centre: 0.44 outside the circle, so 0.06 covered.
        let coverage = sample(&mesh, 3.5, 16.5);
        assert!((coverage - 0.06).abs() < 0.04, "{coverage}");
        // And the one beside it, (4.5, 16.5), 31.6 from the centre, is wholly inside.
        assert!(sample(&mesh, 4.5, 16.5) > 0.9);
    }
}
