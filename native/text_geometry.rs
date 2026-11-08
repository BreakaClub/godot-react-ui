//! Where a `Text`'s text is, for JS (`UIHandle.getCaretRect`, `getOffsetAtPoint`, `getRangeRects`): the geometry `text_layout.rs`
//! computes over the node's paragraph, in the root-local space `getRect()` uses, with the offsets of the text the node shows
//! (UTF-16 units, inlays not counted, `text_span/offsets.rs` maps them to the paragraph's).
//!
//! A reply is JSON: `null` for a node that is not a mounted `Text`, `{"error": reason}` for an argument that is refused, else the
//! answer. A rectangle under a rotation, a scale or a skew is the bounding box of what is drawn, as `getRect()` reports one.

use godot::builtin::{Rect2, Vector2};
use serde_json::{Value, json};

use crate::ReactUiRoot;
use crate::geometry::BoxRect;
use crate::props::{Kind, OverflowSpec};
use crate::selection_input::lay_out;
use crate::text_layout::{GodotTextLayout, TextDirection};
use crate::text_offsets::{code_point_to_utf16, utf16_to_code_point};
use crate::text_paragraph::StyledParagraph;
use crate::text_span::offsets::{Located, OffsetMap, Side};
use crate::text_style::TextStyle;

/// `getCaretRect`'s `side` on the wire.
const SIDE_BEFORE: i64 = -1;

fn side_of(wire: i64) -> Side {
    if wire == SIDE_BEFORE {
        Side::Before
    } else {
        Side::After
    }
}

fn reply(result: Result<Value, String>) -> Value {
    result.unwrap_or_else(|error| json!({ "error": error }))
}

fn rect_json(rect: BoxRect) -> Value {
    json!({ "x": rect.x, "y": rect.y, "width": rect.width, "height": rect.height })
}

impl ReactUiRoot {
    /// The mounted `Text` `tag`, or `None`.
    pub(crate) fn text_node(&self, tag: u32) -> Option<&crate::mount::MountedNode> {
        self.mounted
            .nodes
            .get(&tag)
            .filter(|node| node.kind == Kind::Text)
    }

    /// `rect`, in the frame of the node, as the rectangle that bounds it where it is drawn.
    pub(crate) fn text_rect_to_root(&self, tag: u32, rect: Rect2) -> Result<BoxRect, String> {
        let affine = self
            .mounted
            .absolute_affine(tag, self.viewport_box())
            .ok_or_else(|| format!("node {tag} is not placed"))?;
        Ok(affine.bounds_of(BoxRect {
            x: rect.position.x,
            y: rect.position.y,
            width: rect.size.x,
            height: rect.size.y,
        }))
    }

    /// The shown text of the node, which offsets in UTF-16 units are into.
    fn shown_of(node: &crate::mount::MountedNode) -> &str {
        node.visual
            .shown_text(node.props.text.as_deref())
            .unwrap_or("")
    }

    /// The caret rectangle at UTF-16 `offset` of node `tag`'s text, on `side` (-1 before, 1 after).
    pub(crate) fn caret_rect_json(&mut self, tag: u32, offset: i64, side: i64) -> Value {
        if self.text_node(tag).is_none() {
            return Value::Null;
        }
        reply(self.caret_rect(tag, offset, side).map(rect_json))
    }

    fn caret_rect(&mut self, tag: u32, offset: i64, side: i64) -> Result<BoxRect, String> {
        let node = self.text_node(tag).ok_or("not a Text")?;
        let shown = Self::shown_of(node);
        let offset = usize::try_from(offset).map_err(|_| format!("offset {offset} is negative"))?;
        let source =
            utf16_to_code_point(shown.chars(), offset).map_err(|error| error.to_string())?;
        if node.visual.paragraph.is_none() {
            // Nothing is shaped (an empty text): the caret is at the start of its one empty line.
            let empty = self.empty_text_line(tag)?;
            let origin = self
                .text_node(tag)
                .ok_or("not a Text")?
                .geometry
                .content_origin();
            return self.text_rect_to_root(
                tag,
                Rect2::new(origin, Vector2::new(0.0, empty.ascent + empty.descent)),
            );
        }
        let node = self.text_node(tag).ok_or("not a Text")?;
        let paragraph = node
            .visual
            .paragraph
            .as_ref()
            .ok_or("the text has no paragraph")?;
        let layout = lay_out(paragraph, &node.geometry).map_err(|error| error.to_string())?;
        let side = side_of(side);
        let display = paragraph
            .offset_map()
            .map_or(source, |map| map.display_of(source, side));
        let display_text = paragraph
            .rich_text()
            .map_or(Self::shown_of(node), |rich| rich.display.as_str());
        let carets = Self::carets_at(&layout, display_text, display, side)?;
        let caret = carets.primary(TextDirection::Ltr);
        let line = layout
            .line(carets.line)
            .map_err(|error| error.to_string())?;
        let rect = Rect2::new(
            Vector2::new(caret.x, line.top()),
            Vector2::new(0.0, line.height()),
        );
        self.text_rect_to_root(tag, rect)
    }

    /// What an empty line of the text of node `tag` measures.
    fn empty_text_line(&mut self, tag: u32) -> Result<crate::text_layout::LineExtents, String> {
        let node = self.text_node(tag).ok_or("not a Text")?;
        let style = TextStyle::of(
            &node.computed,
            node.computed.overflow_x.is_some_and(OverflowSpec::clips),
        );
        let font = self.fonts.resolve(&style.shaping)?;
        Ok(StyledParagraph::empty_line(&font, &style.shaping))
    }

    /// The carets at display offset `display` of `text`. `Before` at the start of a soft wrapped line is the end of the line above.
    pub(crate) fn carets_at(
        layout: &GodotTextLayout,
        text: &str,
        display: usize,
        side: Side,
    ) -> Result<crate::text_layout::Carets, String> {
        let error = |error: crate::text_layout::TextLayoutError| error.to_string();
        let line = layout.line_of(display).map_err(error)?;
        let starts_line = line > 0 && layout.line(line).map_err(error)?.first_offset == display;
        let after_hard_break = display > 0 && text.chars().nth(display - 1) == Some('\n');
        if side == Side::Before && starts_line && !after_hard_break {
            return layout.carets_on_line(line - 1, display).map_err(error);
        }
        layout.carets(display).map_err(error)
    }

    /// The caret position nearest to the root-local point `(x, y)`.
    pub(crate) fn offset_at_point_json(&self, tag: u32, x: f64, y: f64) -> Value {
        if self.text_node(tag).is_none() {
            return Value::Null;
        }
        reply(self.offset_at_point(tag, x, y))
    }

    fn offset_at_point(&self, tag: u32, x: f64, y: f64) -> Result<Value, String> {
        let node = self.text_node(tag).ok_or("not a Text")?;
        if !x.is_finite() || !y.is_finite() {
            return Err("the point must be finite".into());
        }
        let Some(paragraph) = node.visual.paragraph.as_ref() else {
            return Ok(json!({ "offset": 0, "side": "after" }));
        };
        let local = self
            .mounted
            .to_local(tag, self.viewport_box(), Vector2::new(x as f32, y as f32))
            .ok_or_else(|| format!("node {tag} has no geometry, or a matrix with no inverse"))?;
        let layout = lay_out(paragraph, &node.geometry).map_err(|error| error.to_string())?;
        let hit = layout.hit(local).map_err(|error| error.to_string())?;
        let (source, side) = match paragraph.offset_map().map(|map| map.locate(hit.offset)) {
            None => (hit.offset, Side::After),
            Some(Located::At { source, side }) => (source, side),
            Some(Located::Within { source, group }) => {
                // Inside generated text: the side whose caret is nearer to the point.
                let x_of = |display: usize| -> Result<f32, String> {
                    let carets = layout.carets(display).map_err(|error| error.to_string())?;
                    Ok(carets.primary(TextDirection::Ltr).x)
                };
                let (before, after) = (x_of(group.start)?, x_of(group.end)?);
                let side = if (local.x - before).abs() < (local.x - after).abs() {
                    Side::Before
                } else {
                    Side::After
                };
                (source, side)
            }
        };
        let shown = Self::shown_of(node);
        let utf16 =
            code_point_to_utf16(shown.chars(), source).map_err(|error| error.to_string())?;
        let side = match side {
            Side::Before => "before",
            Side::After => "after",
        };
        Ok(json!({ "offset": utf16, "side": side }))
    }

    /// The rectangles UTF-16 `start..end` of node `tag`'s text covers.
    pub(crate) fn range_rects_json(&self, tag: u32, start: i64, end: i64) -> Value {
        if self.text_node(tag).is_none() {
            return Value::Null;
        }
        reply(
            self.range_rects(tag, start, end)
                .map(|rects| json!({ "rects": rects })),
        )
    }

    fn range_rects(&self, tag: u32, start: i64, end: i64) -> Result<Vec<Value>, String> {
        let node = self.text_node(tag).ok_or("not a Text")?;
        let shown = Self::shown_of(node);
        let to_code_point = |offset: i64, name: &str| -> Result<usize, String> {
            let offset =
                usize::try_from(offset).map_err(|_| format!("{name} {offset} is negative"))?;
            utf16_to_code_point(shown.chars(), offset).map_err(|error| format!("{name}: {error}"))
        };
        let (start, end) = (to_code_point(start, "start")?, to_code_point(end, "end")?);
        if start > end {
            return Err(format!(
                "the range starts at {start} after it ends at {end}"
            ));
        }
        let Some(paragraph) = node.visual.paragraph.as_ref().filter(|_| start < end) else {
            return Ok(Vec::new());
        };
        let layout = lay_out(paragraph, &node.geometry).map_err(|error| error.to_string())?;
        let range = paragraph
            .offset_map()
            .map_or(start..end, |map: &OffsetMap| map.display_range(start..end));
        layout
            .selection_rects(range.start, range.end.max(range.start))
            .map_err(|error| error.to_string())?
            .into_iter()
            .map(|run| self.text_rect_to_root(tag, run.rect).map(rect_json))
            .collect()
    }
}
