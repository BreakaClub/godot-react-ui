//! Axis-aligned box geometry shared by layout, clipping and hit testing.
use godot::prelude::*;
use serde::Serialize;

#[derive(Default, Clone, Copy, Serialize)]
pub(crate) struct BoxRect {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) width: f32,
    pub(crate) height: f32,
}

impl BoxRect {
    pub(crate) fn contains(&self, point: Vector2) -> bool {
        point.x >= self.x
            && point.y >= self.y
            && point.x < self.x + self.width
            && point.y < self.y + self.height
    }
    pub(crate) fn godot_rect(self) -> Rect2 {
        Rect2::new(
            Vector2::new(self.x, self.y),
            Vector2::new(self.width, self.height),
        )
    }
}

pub(crate) fn intersect_clip(a: Option<BoxRect>, b: Option<BoxRect>) -> Option<BoxRect> {
    match (a, b) {
        (None, value) | (value, None) => value,
        (Some(a), Some(b)) => {
            let x = a.x.max(b.x);
            let y = a.y.max(b.y);
            Some(BoxRect {
                x,
                y,
                width: ((a.x + a.width).min(b.x + b.width) - x).max(0.0),
                height: ((a.y + a.height).min(b.y + b.height) - y).max(0.0),
            })
        }
    }
}
pub(crate) fn intersects(a: BoxRect, b: BoxRect) -> bool {
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
