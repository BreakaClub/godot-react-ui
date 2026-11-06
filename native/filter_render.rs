//! Drawing `filter` and `backdrop-filter` with canvas items (plan Phase V1, D40; measurements and
//! reasons in `docs/tracks/filters.md`).
//!
//! * **Backdrop.** An element with a `backdrop-filter` gets a copy item and a backdrop item, both
//!   before its background (`render_tree.rs`). The copy item copies a rectangle of the render target
//!   into the back buffer; the backdrop item draws the element's rounded shape with a material that
//!   reads the back buffer's mipmaps (`blur.rs` says how the blur is built from them).
//! * **Filter.** An element with a `filter` is drawn in a canvas group: its subtree goes to a
//!   transparent back buffer, and the group's material composites it blurred and recoloured.
//!
//! Neither exists for an element without the property, and a tree without any filter runs none of
//! this: every entry point starts by finding nothing to do.

use std::collections::{BTreeSet, HashMap};

use godot::classes::{RenderingServer, StyleBoxFlat};
use godot::prelude::*;
use serde_json::json;

use crate::CORNER_DETAIL;
use crate::ReactUiRoot;
use crate::blur::{
    BlurPlan, ChainMap, PixelRect, RendererKind, chain_map, copy_region, max_level, plan,
};
use crate::filter::{ColorMatrix, FilterEffect};
use crate::filter_faults::{self as faults, Fault};
use crate::geometry::BoxRect;
use crate::motion::{resolved_backdrop_filter, resolved_filter};
use crate::style_engine::current_color;

/// The most pairs of bilinear fetches per axis the shaders' arrays hold (`blur::MAX_PAIRS`).
const SHADER_MAX_PAIRS: &str = "10";

/// The pieces the four shaders share.
const SHADER_HEADER: &str = "shader_type canvas_item;\nrender_mode unshaded;\n";

const SHADER_MAP: &str = "
uniform vec4 a_r = vec4(1.0, 0.0, 0.0, 0.0);
uniform vec4 a_g = vec4(0.0, 1.0, 0.0, 0.0);
uniform vec4 a_b = vec4(0.0, 0.0, 1.0, 0.0);
uniform vec4 a_a = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 a_off = vec4(0.0);

vec4 apply_map(vec4 c, vec4 r, vec4 g, vec4 b, vec4 a, vec4 off) {
	return vec4(dot(r, c) + off.x, dot(g, c) + off.y, dot(b, c) + off.z, dot(a, c) + off.w);
}
";

/// A Gaussian-weighted reconstruction of one level of the back buffer's mipmaps: Gaussian weights
/// (standard deviation `1 / sqrt(2 * inv_two_sigma2)` texels) over the level's texels around the fragment,
/// fetched in bilinear pairs, renormalised. `blur.rs` chooses the level and the width.
fn gaussian_function() -> String {
    format!(
        "
const int MAX_PAIRS = {SHADER_MAX_PAIRS};

vec4 gaussian_at(vec2 uv, vec2 pixel_size, vec2 ca, vec2 cb, float lvl, int n, float inv2s2) {{
	vec2 size = vec2(textureSize(screen_tex, int(lvl)));
	// Texel j of level L holds the picture around pixel chain_a * j + chain_b + 0.5 (native/blur.rs, chain_map): the
	// engine halves regions with integer shifts (copy_effects.cpp:276), so unless the region is a multiple of 2^L the
	// map is stretched and shifted (a 900 px target's level 3 has 112 rows over 900 px, and `uv * size` would put an
	// edge 200 px down 0.9 px off).
	vec2 p = ((uv / pixel_size - 0.5) - cb) / ca;
	vec2 j0 = floor(p);
	vec2 f = p - j0;
	float wx[MAX_PAIRS];
	float wy[MAX_PAIRS];
	float px[MAX_PAIRS];
	float py[MAX_PAIRS];
	float sum_x = 0.0;
	float sum_y = 0.0;
	for (int i = 0; i < n; i++) {{
		float m = float(2 * i - (n - 1));
		float ax = exp(-(f.x - m) * (f.x - m) * inv2s2);
		float bx = exp(-(f.x - m - 1.0) * (f.x - m - 1.0) * inv2s2);
		float ay = exp(-(f.y - m) * (f.y - m) * inv2s2);
		float by = exp(-(f.y - m - 1.0) * (f.y - m - 1.0) * inv2s2);
		wx[i] = ax + bx;
		wy[i] = ay + by;
		px[i] = (j0.x + m + 0.5 + bx / max(ax + bx, 1e-20)) / size.x;
		py[i] = (j0.y + m + 0.5 + by / max(ay + by, 1e-20)) / size.y;
		sum_x += wx[i];
		sum_y += wy[i];
	}}
	vec4 acc = vec4(0.0);
	for (int j = 0; j < n; j++) {{
		for (int i = 0; i < n; i++) {{
			acc += (wx[i] * wy[j]) * textureLod(screen_tex, vec2(px[i], py[j]), lvl);
		}}
	}}
	return acc / (sum_x * sum_y);
}}
"
    )
}

const BLUR_UNIFORMS: &str = "
uniform vec2 chain_a = vec2(1.0);
uniform vec2 chain_b = vec2(0.0);
uniform float level = 0.0;
uniform int pairs = 1;
uniform float inv_two_sigma2 = 1.0;
";

const SCREEN_BLUR: &str =
    "uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap, repeat_disable;\n";
const SCREEN_PLAIN: &str =
    "uniform sampler2D screen_tex : hint_screen_texture, filter_linear, repeat_disable;\n";

/// The material of an element's shaders, by what they need.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub(crate) enum ShaderKind {
    /// The backdrop recoloured, no blur: reads the back buffer's base level only (the shader does not
    /// ask for mipmaps, so the renderer generates none).
    BackdropPlain,
    BackdropBlur,
    GroupPlain,
    /// A filter group with a blur and/or a drop shadow.
    GroupBlur,
}

impl ShaderKind {
    const ALL: [ShaderKind; 4] = [
        ShaderKind::BackdropPlain,
        ShaderKind::BackdropBlur,
        ShaderKind::GroupPlain,
        ShaderKind::GroupBlur,
    ];

    fn index(self) -> usize {
        Self::ALL
            .iter()
            .position(|kind| *kind == self)
            .expect("every kind is listed")
    }

    fn reads_mipmaps(self) -> bool {
        matches!(self, Self::BackdropBlur | Self::GroupBlur)
    }

    /// The shader's source.
    fn source(self) -> String {
        let mut code = String::from(SHADER_HEADER);
        code.push_str(if self.reads_mipmaps() {
            SCREEN_BLUR
        } else {
            SCREEN_PLAIN
        });
        code.push_str(SHADER_MAP);
        match self {
            Self::BackdropPlain => code.push_str(
                "
void fragment() {
	vec4 c = textureLod(screen_tex, SCREEN_UV, 0.0);
	if (c.a > 0.0001) { c.rgb /= c.a; }
	c = apply_map(c, a_r, a_g, a_b, a_a, a_off);
	COLOR = vec4(clamp(c.rgb, 0.0, 1.0), clamp(c.a, 0.0, 1.0) * COLOR.a);
}
",
            ),
            Self::BackdropBlur => {
                code.push_str(BLUR_UNIFORMS);
                code.push_str(&gaussian_function());
                code.push_str(
                    "
void fragment() {
	vec4 c = gaussian_at(SCREEN_UV, SCREEN_PIXEL_SIZE, chain_a, chain_b, level, pairs, inv_two_sigma2);
	if (c.a > 0.0001) { c.rgb /= c.a; }
	c = apply_map(c, a_r, a_g, a_b, a_a, a_off);
	COLOR = vec4(clamp(c.rgb, 0.0, 1.0), clamp(c.a, 0.0, 1.0) * COLOR.a);
}
",
                );
            }
            // A group's buffer already holds the inherited opacity (its children were drawn with it), so
            // the composite takes the buffer's alpha and ignores COLOR's: the stock composite multiplies
            // them and applies an ancestor's opacity twice.
            Self::GroupPlain => code.push_str(
                "
void fragment() {
	vec4 c = textureLod(screen_tex, SCREEN_UV, 0.0);
	if (c.a > 0.0001) { c.rgb /= c.a; }
	c = apply_map(c, a_r, a_g, a_b, a_a, a_off);
	COLOR = vec4(clamp(c.rgb, 0.0, 1.0), clamp(c.a, 0.0, 1.0));
}
",
            ),
            Self::GroupBlur => {
                code.push_str(BLUR_UNIFORMS);
                code.push_str(
                    "
uniform bool src_blur = true;
uniform bool has_shadow = false;
uniform float s_level = 0.0;
uniform int s_pairs = 1;
uniform float s_inv_two_sigma2 = 1.0;
uniform bool s_blur = true;
uniform vec2 s_chain_a = vec2(1.0);
uniform vec2 s_chain_b = vec2(0.0);
uniform vec2 s_offset = vec2(0.0);
uniform vec4 s_color = vec4(0.0);
uniform vec4 b_r = vec4(1.0, 0.0, 0.0, 0.0);
uniform vec4 b_g = vec4(0.0, 1.0, 0.0, 0.0);
uniform vec4 b_b = vec4(0.0, 0.0, 1.0, 0.0);
uniform vec4 b_a = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 b_off = vec4(0.0);
",
                );
                code.push_str(&gaussian_function());
                code.push_str(
                    "
void fragment() {
	vec4 c;
	if (src_blur) {
		c = gaussian_at(SCREEN_UV, SCREEN_PIXEL_SIZE, chain_a, chain_b, level, pairs, inv_two_sigma2);
	} else {
		c = textureLod(screen_tex, SCREEN_UV, 0.0);
	}
	if (c.a > 0.0001) { c.rgb /= c.a; }
	c = apply_map(c, a_r, a_g, a_b, a_a, a_off);
	if (has_shadow) {
		vec2 shadow_uv = SCREEN_UV - s_offset * SCREEN_PIXEL_SIZE;
		vec4 h;
		if (s_blur) {
			h = gaussian_at(shadow_uv, SCREEN_PIXEL_SIZE, s_chain_a, s_chain_b, s_level, s_pairs, s_inv_two_sigma2);
		} else {
			h = textureLod(screen_tex, shadow_uv, 0.0);
		}
		float shadow_alpha = clamp(h.a * a_a.w, 0.0, 1.0) * s_color.a;
		vec4 under = vec4(s_color.rgb * shadow_alpha, shadow_alpha);
		vec4 over = vec4(c.rgb * c.a, c.a);
		vec4 merged = over + under * (1.0 - over.a);
		c = vec4(merged.a > 0.0001 ? merged.rgb / merged.a : vec3(0.0), merged.a);
		c = apply_map(c, b_r, b_g, b_b, b_a, b_off);
	}
	COLOR = vec4(clamp(c.rgb, 0.0, 1.0), clamp(c.a, 0.0, 1.0));
}
",
                );
            }
        }
        if matches!(self, Self::GroupPlain | Self::GroupBlur)
            && faults::active(Fault::DoubleModulate)
        {
            // The stock composite: the inherited opacity multiplies the buffer's alpha again.
            code = code.replace(
                "clamp(c.a, 0.0, 1.0));\n}",
                "clamp(c.a, 0.0, 1.0) * COLOR.a);\n}",
            );
        }
        code
    }
}

/// What the "mipmaps cached" flag primer draws: a copy of one pixel, then a transparent pixel with a
/// material that reads a mipmap. Compatibility only (see [`Effects::ensure_primer`]).
const PRIMER_SHADER: &str = "shader_type canvas_item;
render_mode unshaded;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap, repeat_disable;
void fragment() { COLOR = vec4(textureLod(screen_tex, SCREEN_UV, 1.0).rgb * 0.0, 0.0); }
";
const PRIMER_COPY_INDEX: i32 = -2;
const PRIMER_DRAW_INDEX: i32 = -1;
/// A coordinate in the group's rectangle is truncated to an integer by the engine; a quarter pixel of
/// bias keeps a rectangle computed through a non-integer transform from falling one pixel short.
const REGION_BIAS_PX: f32 = 0.25;

/// A colour map as the shader's uniforms: rows for red, green, blue and alpha, then the offsets.
#[derive(Clone, Copy, Debug, PartialEq)]
struct MapUniforms {
    rows: [[f32; 4]; 4],
    offset: [f32; 4],
}

impl MapUniforms {
    fn of(matrix: &ColorMatrix) -> MapUniforms {
        let mut rows = [[0.0; 4]; 4];
        let mut offset = [0.0; 4];
        for row in 0..4 {
            rows[row].copy_from_slice(&matrix.0[row][..4]);
            offset[row] = matrix.0[row][4];
        }
        MapUniforms { rows, offset }
    }
}

fn vec4(values: [f32; 4]) -> Variant {
    Vector4::new(values[0], values[1], values[2], values[3]).to_variant()
}

/// What a blur's uniforms hold.
#[derive(Clone, Copy, Debug, PartialEq)]
struct BlurUniforms {
    level: f32,
    pairs: i32,
    inv_two_sigma2: f32,
}

impl BlurUniforms {
    const NONE: BlurUniforms = BlurUniforms {
        level: 0.0,
        pairs: 1,
        inv_two_sigma2: 1.0,
    };

    fn of(plan: &BlurPlan) -> BlurUniforms {
        BlurUniforms {
            level: plan.level as f32,
            pairs: plan.pairs as i32,
            inv_two_sigma2: 1.0 / (2.0 * plan.kernel_texels * plan.kernel_texels),
        }
    }
}

/// What a backdrop's or group's material has been given, so only a change costs a call.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Applied {
    kind: ShaderKind,
    map: MapUniforms,
    blur: BlurUniforms,
    shadow: Option<ShadowUniforms>,
    after_shadow: MapUniforms,
    src_blur: bool,
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct ShadowUniforms {
    blur: BlurUniforms,
    /// Whether the shadow is blurred (a blur of zero is the source's alpha, moved).
    blurred: bool,
    offset: [f32; 2],
    color: [f32; 4],
}

/// Where the level read sits on the render target, per axis (`blur::chain_map`), as the shader's uniforms.
#[derive(Clone, Copy, Debug, PartialEq)]
struct ChainUniforms {
    scale: [f32; 2],
    offset: [f32; 2],
}

impl ChainUniforms {
    fn of(region: PixelRect, level: u32) -> ChainUniforms {
        if faults::active(Fault::TextbookChain) {
            // The map of a region whose size is a multiple of `2^level`: exact only then.
            let texel = (1u32 << level) as f32;
            let textbook = ChainMap {
                scale: texel,
                offset: (texel - 1.0) / 2.0,
            };
            return ChainUniforms {
                scale: [textbook.scale; 2],
                offset: [textbook.offset; 2],
            };
        }
        let x: ChainMap = chain_map(region.x, region.width, level);
        let y: ChainMap = chain_map(region.y, region.height, level);
        ChainUniforms {
            scale: [x.scale, y.scale],
            offset: [x.offset, y.offset],
        }
    }
}

fn set_chain_params(
    rs: &mut Gd<RenderingServer>,
    material: Rid,
    prefix: &str,
    chain: &ChainUniforms,
) {
    rs.material_set_param(
        material,
        &format!("{prefix}chain_a"),
        &Vector2::new(chain.scale[0], chain.scale[1]).to_variant(),
    );
    rs.material_set_param(
        material,
        &format!("{prefix}chain_b"),
        &Vector2::new(chain.offset[0], chain.offset[1]).to_variant(),
    );
}

/// One material of an element: its shader kind, and what has been written to it (`None` until the first write).
#[derive(Clone, Copy)]
struct MaterialSlot {
    material: Rid,
    kind: ShaderKind,
    applied: Option<Applied>,
}

/// The per-element state of the effects: materials, what they hold and what was last reported.
struct NodeEffect {
    backdrop_material: Option<MaterialSlot>,
    group_material: Option<MaterialSlot>,
    fill: Gd<StyleBoxFlat>,
    /// What the backdrop's fill last drew: size and corner radius.
    fill_key: Option<(Vector2, i32)>,
    /// The copy rectangle currently set (None: copy disabled).
    region: Option<PixelRect>,
    backdrop_plan: Option<BlurPlan>,
    group_plan: Option<BlurPlan>,
    /// The chain maps last written to the backdrop's material (`.0`), and to the group's: for the source and for the shadow.
    backdrop_chain: Option<ChainUniforms>,
    group_chain: Option<(Option<ChainUniforms>, Option<ChainUniforms>)>,
    /// The group's drop shadow: where it falls (render-target pixels) and how it is blurred.
    group_shadow: Option<(Vector2, Option<BlurPlan>)>,
    /// The rectangles currently set on the group (what it covers, what its mipmaps are made for), in its frame.
    bounds: Option<(Rect2, Rect2)>,
}

/// Counters of the work the effects did, for the snapshot and the verifiers.
#[derive(Default)]
pub(crate) struct EffectStats {
    pub(crate) items_created: u64,
    pub(crate) materials_created: u64,
    pub(crate) shaders_created: u64,
    pub(crate) material_updates: u64,
    pub(crate) copy_rect_updates: u64,
}

/// Everything the effects keep for one root.
#[derive(Default)]
pub(crate) struct Effects {
    shaders: [Option<Rid>; 4],
    /// The source each shader was compiled from: a fault changes a shader's source between runs.
    #[cfg(feature = "filter-faults")]
    shader_sources: [Option<String>; 4],
    primer: Option<Primer>,
    nodes: HashMap<u32, NodeEffect>,
    /// Elements with a live backdrop and with a live filter group.
    backdrops: BTreeSet<u32>,
    groups: BTreeSet<u32>,
    /// Pairs (element, filtered ancestor) already reported, so a nesting error is one line.
    reported: BTreeSet<(u32, u32)>,
    /// Elements whose clamped blur was reported.
    reported_clamps: BTreeSet<u32>,
    /// Something that decides a rectangle changed since the last refresh.
    stale: bool,
    /// Elements to look at again after this paint pass, because a filter group came or went.
    resync: BTreeSet<u32>,
    /// The root-to-target transform and the target's size the plans and rectangles were computed for.
    transform: Option<Transform2D>,
    target: Option<(i32, i32)>,
    renderer: Option<RendererKind>,
    pub(crate) stats: EffectStats,
}

struct Primer {
    copy: Rid,
    draw: Rid,
    material: Rid,
    shader: Rid,
}

fn server() -> Gd<RenderingServer> {
    RenderingServer::singleton()
}

impl Effects {
    pub(crate) fn is_empty(&self) -> bool {
        self.backdrops.is_empty() && self.groups.is_empty()
    }

    pub(crate) fn mark_stale(&mut self) {
        if !self.is_empty() {
            self.stale = true;
        }
    }

    fn renderer(&mut self) -> RendererKind {
        *self.renderer.get_or_insert_with(|| {
            RendererKind::from_method(&server().get_current_rendering_method().to_string())
        })
    }

    /// The shader of a kind, compiled when first used.
    fn shader(&mut self, kind: ShaderKind) -> Rid {
        #[cfg(feature = "filter-faults")]
        self.recompile_for_faults(kind);
        if let Some(shader) = self.shaders[kind.index()] {
            return shader;
        }
        let mut rs = server();
        let shader = rs.shader_create();
        rs.shader_set_code(shader, kind.source().as_str());
        self.shaders[kind.index()] = Some(shader);
        self.stats.shaders_created += 1;
        shader
    }

    /// A fault that changes a shader's source is switched on and off while the process runs: compile again when the
    /// source is no longer the one the shader came from. Only called when a material is made, and the verifier
    /// removes every effect (and so every material) between faults.
    #[cfg(feature = "filter-faults")]
    fn recompile_for_faults(&mut self, kind: ShaderKind) {
        let source = kind.source();
        if self.shader_sources[kind.index()].as_deref() == Some(source.as_str()) {
            return;
        }
        if let Some(old) = self.shaders[kind.index()].take() {
            server().free_rid(old);
        }
        self.shader_sources[kind.index()] = Some(source);
    }

    /// The slot's material for `kind`: the one it has, or a new one (the old one is freed) put on `item`.
    fn ensure_material(
        &mut self,
        slot: Option<MaterialSlot>,
        kind: ShaderKind,
        item: Rid,
    ) -> MaterialSlot {
        if let Some(slot) = slot.filter(|slot| slot.kind == kind) {
            return slot;
        }
        let shader = self.shader(kind);
        let mut rs = server();
        if let Some(old) = slot {
            rs.free_rid(old.material);
        }
        let material = rs.material_create();
        rs.material_set_shader(material, shader);
        rs.canvas_item_set_material(item, material);
        self.stats.materials_created += 1;
        MaterialSlot {
            material,
            kind,
            applied: None,
        }
    }

    /// Compatibility only: a canvas group reads its mipmaps only if the renderer believes the back
    /// buffer has them, which it does after an earlier item that asked for them this frame
    /// (`rasterizer_canvas_gles3.cpp:403-541`; `exp2.gd`: a group's blur was a hard edge until a frosted
    /// panel ran before it). One pixel copied and one pixel drawn with a mipmap-reading material, before
    /// everything else, set that belief for the frame.
    fn ensure_primer(&mut self, layer_item: Rid) {
        if self.primer.is_some()
            || self.renderer() != RendererKind::Compatibility
            || faults::active(Fault::NoPrimer)
        {
            return;
        }
        let mut rs = server();
        let copy = rs.canvas_item_create();
        let draw = rs.canvas_item_create();
        for (item, index) in [(copy, PRIMER_COPY_INDEX), (draw, PRIMER_DRAW_INDEX)] {
            rs.canvas_item_set_parent(item, layer_item);
            rs.canvas_item_set_draw_index(item, index);
        }
        rs.canvas_item_set_copy_to_backbuffer(copy, true, Rect2::new(Vector2::ZERO, Vector2::ONE));
        rs.canvas_item_add_rect(draw, Rect2::new(Vector2::ZERO, Vector2::ONE), Color::WHITE);
        let shader = rs.shader_create();
        rs.shader_set_code(shader, PRIMER_SHADER);
        let material = rs.material_create();
        rs.material_set_shader(material, shader);
        rs.canvas_item_set_material(draw, material);
        self.stats.items_created += 2;
        self.primer = Some(Primer {
            copy,
            draw,
            material,
            shader,
        });
    }

    fn drop_primer(&mut self) {
        if let Some(primer) = self.primer.take() {
            let mut rs = server();
            for rid in [primer.copy, primer.draw, primer.material, primer.shader] {
                rs.free_rid(rid);
            }
        }
    }

    /// Free every material and shader (the root is going away).
    pub(crate) fn release(&mut self) {
        self.drop_primer();
        let mut rs = server();
        for (_, effect) in self.nodes.drain() {
            for slot in [effect.backdrop_material, effect.group_material]
                .into_iter()
                .flatten()
            {
                rs.free_rid(slot.material);
            }
        }
        for shader in self.shaders.iter_mut().filter_map(Option::take) {
            rs.free_rid(shader);
        }
        self.backdrops.clear();
        self.groups.clear();
    }
}

/// The desired state of one element's effects, from its lists.
struct Wanted {
    backdrop: Option<WantedBackdrop>,
    group: Option<WantedGroup>,
}

struct WantedBackdrop {
    effect: FilterEffect,
}

struct WantedGroup {
    effect: FilterEffect,
}

/// The scale from root-local logical pixels to render-target pixels: the square root of the
/// transform's determinant, so a uniform scale (the device pixel ratio) gives itself. A rotated or
/// unevenly scaled root blurs with this mean radius.
fn mean_scale(transform: &Transform2D) -> f32 {
    (transform.a.x * transform.b.y - transform.a.y * transform.b.x)
        .abs()
        .sqrt()
}

/// The pixel rectangle that covers `rect` (root-local) after `transform`, rounded outwards.
fn to_target(transform: &Transform2D, rect: BoxRect) -> PixelRect {
    let corners = [
        Vector2::new(rect.x, rect.y),
        Vector2::new(rect.x + rect.width, rect.y),
        Vector2::new(rect.x, rect.y + rect.height),
        Vector2::new(rect.x + rect.width, rect.y + rect.height),
    ]
    .map(|corner| *transform * corner);
    let min = corners
        .iter()
        .fold(Vector2::new(f32::MAX, f32::MAX), |m, c| {
            Vector2::new(m.x.min(c.x), m.y.min(c.y))
        });
    let max = corners
        .iter()
        .fold(Vector2::new(f32::MIN, f32::MIN), |m, c| {
            Vector2::new(m.x.max(c.x), m.y.max(c.y))
        });
    PixelRect {
        x: min.x.floor() as i32,
        y: min.y.floor() as i32,
        width: (max.x.ceil() - min.x.floor()) as i32,
        height: (max.y.ceil() - min.y.floor()) as i32,
    }
}

impl ReactUiRoot {
    /// The transform from root-local pixels to the render target's, and the target's size in pixels.
    fn target_transform(&self) -> Option<(Transform2D, (i32, i32))> {
        let base = self.base();
        if !base.is_inside_tree() {
            return None;
        }
        let viewport = base.get_viewport()?;
        let transform = viewport.get_final_transform() * base.get_global_transform_with_canvas();
        // The render target's size in pixels is the visible rectangle (logical) times the stretch scale.
        // `ViewportTexture::get_size()` is not it: for a Window it multiplies the physical size by the stretch
        // scale again (2240 x 1600 for a 1120 x 800 target at content scale 2).
        let visible = viewport.get_visible_rect().size;
        let stretch = viewport.get_stretch_transform();
        Some((
            transform,
            (
                (visible.x * stretch.a.x).round() as i32,
                (visible.y * stretch.b.y).round() as i32,
            ),
        ))
    }

    /// Bring one element's effect items up to date with its `filter` and `backdrop-filter`. Called
    /// from the paint pass for every element whose paint inputs may have changed; an element with no
    /// filter and no effect items returns at once.
    pub(crate) fn sync_effects(&mut self, tag: u32) {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return;
        };
        let sampled = self.sampled.get(&tag);
        let has_filters = node.computed.has_filters()
            || sampled.is_some_and(|s| !s.filter.is_empty() || !s.backdrop_filter.is_empty());
        let had_effects = node.render.backdrop.is_some() || node.render.group.is_some();
        if !has_filters && !had_effects {
            return;
        }
        let (filter, backdrop) = match sampled {
            Some(s) => (s.filter.clone(), s.backdrop_filter.clone()),
            None => (
                resolved_filter(&node.computed),
                resolved_backdrop_filter(&node.computed),
            ),
        };
        let current = current_color(&node.computed);
        let drawable = node.geometry.size.x > 0.0 && node.geometry.size.y > 0.0;
        let blocker = if has_filters {
            self.group_ancestor(tag)
        } else {
            None
        };
        let filter_effect = FilterEffect::compose(&filter, current);
        let backdrop_effect = FilterEffect::compose(&backdrop, current);
        let wants_filter = drawable && !filter_effect.is_none();
        let wants_backdrop = drawable && !backdrop_effect.is_none();
        if let Some(ancestor) = blocker
            && (wants_filter || wants_backdrop)
        {
            self.report_nesting(tag, ancestor, wants_filter, wants_backdrop);
        }
        let wanted = Wanted {
            backdrop: (wants_backdrop && blocker.is_none()).then_some(WantedBackdrop {
                effect: backdrop_effect,
            }),
            group: (wants_filter && blocker.is_none()).then_some(WantedGroup {
                effect: filter_effect,
            }),
        };
        let groups_before = self.effects.groups.contains(&tag);
        self.apply_wanted(tag, wanted);
        if groups_before != self.effects.groups.contains(&tag) {
            // A group appeared or went: every other effect re-checks whether it sits inside one.
            let others: Vec<u32> = self
                .effects
                .backdrops
                .iter()
                .chain(self.effects.groups.iter())
                .copied()
                .filter(|other| *other != tag)
                .collect();
            self.effects.resync.extend(others);
        }
        self.effects.stale = true;
    }

    /// The nearest paint ancestor with a live filter group. Canvas groups do not nest and screen reads
    /// inside one are ignored (D40 e), so an effect below one cannot be drawn.
    fn group_ancestor(&self, tag: u32) -> Option<u32> {
        if self.effects.groups.is_empty() || faults::active(Fault::NoNestingCheck) {
            return None;
        }
        let mut current = tag;
        loop {
            let crate::diff::Parent::Node(parent) =
                self.mounted.nodes.get(&current)?.paint_parent?
            else {
                return None;
            };
            if self.effects.groups.contains(&parent) {
                return Some(parent);
            }
            current = parent;
        }
    }

    fn report_nesting(&mut self, tag: u32, ancestor: u32, filter: bool, backdrop: bool) {
        if !self.effects.reported.insert((tag, ancestor)) {
            return;
        }
        let what = match (filter, backdrop) {
            (true, true) => "a filter and a backdrop-filter",
            (true, false) => "a filter",
            _ => "a backdrop-filter",
        };
        godot_error!(
            "ReactUiRoot: node {tag} has {what} inside node {ancestor}, which has a filter. Godot's canvas groups do not nest and a group cannot read what is behind it, so {tag}'s is not drawn. Move it out of the filtered element, or filter only one of them."
        );
    }

    fn apply_wanted(&mut self, tag: u32, wanted: Wanted) {
        // Items are created and removed here; their parameters in `update_effect_params`.
        let layer_item = self.node_layer_item(tag);
        let created_before = self.effects.stats.items_created;
        {
            let Some(node) = self.mounted.nodes.get_mut(&tag) else {
                return;
            };
            if wanted.backdrop.is_some() {
                if node.render.backdrop.is_none() {
                    node.render.ensure_backdrop();
                    self.effects.stats.items_created += 2;
                }
            } else if node.render.remove_backdrop() {
                self.effects.backdrops.remove(&tag);
            }
            if let Some(group) = &wanted.group {
                let blur_kind = group.effect.sigma_css_px > 0.0 || group.effect.shadow.is_some();
                if node.render.group.is_none() {
                    node.render.ensure_group(blur_kind);
                    self.effects.stats.items_created += 2;
                } else {
                    node.render.ensure_group(blur_kind);
                }
            } else if node.render.remove_group() {
                self.effects.groups.remove(&tag);
            }
        }
        if wanted.backdrop.is_none() && wanted.group.is_none() {
            self.forget_effect_state(tag);
            return;
        }
        if wanted.backdrop.is_some() {
            self.effects.backdrops.insert(tag);
        }
        if wanted.group.is_some() {
            self.effects.groups.insert(tag);
            if let Some(item) = layer_item {
                self.effects.ensure_primer(item);
            }
        }
        let _ = created_before;
        self.update_effect_params(tag, &wanted);
    }

    /// The layer root item of the node's layer (where the primer goes).
    fn node_layer_item(&self, tag: u32) -> Option<Rid> {
        let layer = self.mounted.nodes.get(&tag)?.layer;
        // The primer belongs to the first layer's root, drawn before everything.
        let _ = layer;
        self.layer_items.first().map(|item| item.item)
    }

    fn forget_effect_state(&mut self, tag: u32) {
        self.effects.backdrops.remove(&tag);
        self.effects.groups.remove(&tag);
        if let Some(effect) = self.effects.nodes.remove(&tag) {
            let mut rs = server();
            for slot in [effect.backdrop_material, effect.group_material]
                .into_iter()
                .flatten()
            {
                rs.free_rid(slot.material);
            }
        }
        if self.effects.groups.is_empty() {
            self.effects.drop_primer();
        }
    }

    /// Set materials, the backdrop's shape and the rectangles for the effects the element has.
    fn update_effect_params(&mut self, tag: u32, wanted: &Wanted) {
        let Some((transform, target)) = self.target_transform() else {
            return;
        };
        let scale = mean_scale(&transform);
        let renderer = self.effects.renderer();
        let levels = max_level(target.0.max(1) as u32, target.1.max(1) as u32, renderer);
        self.effects.nodes.entry(tag).or_insert_with(|| {
            let mut fill = StyleBoxFlat::new_gd();
            fill.set_corner_detail(CORNER_DETAIL);
            fill.set_bg_color(Color::WHITE);
            NodeEffect {
                backdrop_material: None,
                group_material: None,
                fill,
                fill_key: None,
                region: None,
                backdrop_plan: None,
                group_plan: None,
                group_shadow: None,
                backdrop_chain: None,
                group_chain: None,
                bounds: None,
            }
        });
        if let Some(backdrop) = &wanted.backdrop {
            self.update_backdrop(tag, &backdrop.effect, scale, levels);
        }
        if let Some(group) = &wanted.group {
            self.update_group(tag, &group.effect, scale, levels);
        }
    }

    fn update_backdrop(&mut self, tag: u32, effect: &FilterEffect, scale: f32, levels: u32) {
        let blur_plan = plan(effect.sigma_css_px * scale, levels);
        let kind = if blur_plan.is_some() {
            ShaderKind::BackdropBlur
        } else {
            ShaderKind::BackdropPlain
        };
        let applied = Applied {
            kind,
            map: MapUniforms::of(&effect.matrix),
            blur: blur_plan
                .as_ref()
                .map_or(BlurUniforms::NONE, BlurUniforms::of),
            shadow: None,
            after_shadow: MapUniforms::of(&ColorMatrix::IDENTITY),
            src_blur: blur_plan.is_some(),
        };
        let Some(draw) = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.render.backdrop.as_ref())
            .map(|items| items.draw)
        else {
            return;
        };
        let current = self
            .effects
            .nodes
            .get(&tag)
            .and_then(|state| state.backdrop_material);
        let mut slot = self.effects.ensure_material(current, kind, draw);
        let (Some(node), Some(state)) = (
            self.mounted.nodes.get(&tag),
            self.effects.nodes.get_mut(&tag),
        ) else {
            return;
        };
        let mut rs = server();
        if slot.applied.is_none() {
            // A new material has the shader's defaults, not the maps of the last one.
            state.backdrop_chain = None;
        }
        if slot.applied != Some(applied) || state.backdrop_plan != blur_plan {
            set_map_params(&mut rs, slot.material, "a", &applied.map);
            if kind.reads_mipmaps() {
                set_blur_params(&mut rs, slot.material, "", &applied.blur);
            }
            self.effects.stats.material_updates += 1;
        }
        slot.applied = Some(applied);
        state.backdrop_material = Some(slot);
        state.backdrop_plan = blur_plan;
        // The shape: the element's border box with its corner radius, white; COLOR.a carries coverage
        // and the inherited opacity.
        let size = node.geometry.size;
        let radius = node.computed.border_radius.unwrap_or(0.0).round() as i32;
        if state.fill_key != Some((size, radius)) {
            let bounds = Rect2::new(Vector2::ZERO, size);
            rs.canvas_item_clear(draw);
            rs.canvas_item_set_custom_rect_ex(draw, true)
                .rect(bounds)
                .done();
            state.fill.set_corner_radius_all(radius);
            state.fill.draw(draw, bounds);
            state.fill_key = Some((size, radius));
        }
    }

    fn update_group(&mut self, tag: u32, effect: &FilterEffect, scale: f32, levels: u32) {
        let blur_plan = plan(effect.sigma_css_px * scale, levels);
        let shadow_plan = effect
            .shadow_sigma_css_px()
            .and_then(|sigma| plan(sigma * scale, levels));
        let blur_kind = blur_plan.is_some() || effect.shadow.is_some();
        let kind = if blur_kind {
            ShaderKind::GroupBlur
        } else {
            ShaderKind::GroupPlain
        };
        let shadow = effect.shadow.map(|shadow| ShadowUniforms {
            blur: shadow_plan
                .as_ref()
                .map_or(BlurUniforms::NONE, BlurUniforms::of),
            blurred: shadow_plan.is_some(),
            offset: [shadow.x * scale, shadow.y * scale],
            color: shadow.color,
        });
        let applied = Applied {
            kind,
            map: MapUniforms::of(&effect.matrix),
            blur: blur_plan
                .as_ref()
                .map_or(BlurUniforms::NONE, BlurUniforms::of),
            shadow,
            after_shadow: MapUniforms::of(&effect.after_shadow),
            src_blur: blur_plan.is_some(),
        };
        let Some(wrapper) = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.render.group.as_ref())
            .map(|group| group.wrapper)
        else {
            return;
        };
        let current = self
            .effects
            .nodes
            .get(&tag)
            .and_then(|state| state.group_material);
        let mut slot = self.effects.ensure_material(current, kind, wrapper);
        let (Some(node), Some(state)) = (
            self.mounted.nodes.get_mut(&tag),
            self.effects.nodes.get_mut(&tag),
        ) else {
            return;
        };
        let mut rs = server();
        if slot.applied.is_none() {
            state.group_chain = None;
        }
        if slot.applied != Some(applied) || state.group_plan != blur_plan {
            let material = slot.material;
            set_map_params(&mut rs, material, "a", &applied.map);
            if kind.reads_mipmaps() {
                set_blur_params(&mut rs, material, "", &applied.blur);
                rs.material_set_param(material, "src_blur", &applied.src_blur.to_variant());
                rs.material_set_param(
                    material,
                    "has_shadow",
                    &applied.shadow.is_some().to_variant(),
                );
                if let Some(shadow) = &applied.shadow {
                    set_blur_params(&mut rs, material, "s_", &shadow.blur);
                    rs.material_set_param(material, "s_blur", &shadow.blurred.to_variant());
                    rs.material_set_param(
                        material,
                        "s_offset",
                        &Vector2::new(shadow.offset[0], shadow.offset[1]).to_variant(),
                    );
                    rs.material_set_param(material, "s_color", &vec4(shadow.color));
                    set_map_params(&mut rs, material, "b", &applied.after_shadow);
                }
            }
            self.effects.stats.material_updates += 1;
        }
        slot.applied = Some(applied);
        state.group_material = Some(slot);
        state.group_plan = blur_plan;
        state.group_shadow = effect.shadow.map(|shadow| {
            (
                Vector2::new(shadow.x * scale, shadow.y * scale),
                shadow_plan,
            )
        });
        node.render.ensure_group(blur_kind);
    }

    /// Recompute every effect's rectangle: the copy rectangle of each backdrop and the group region of
    /// each filter, for where the element is on the render target now. Called when anything that
    /// decides a position changed: layout, a scroll, a motion sample, the root's own transform.
    pub(crate) fn refresh_effect_rects(&mut self) {
        if self.effects.is_empty() {
            return;
        }
        let Some((transform, target)) = self.target_transform() else {
            return;
        };
        let transform_changed =
            self.effects.transform != Some(transform) || self.effects.target != Some(target);
        if !std::mem::take(&mut self.effects.stale) && !transform_changed {
            return;
        }
        self.effects.transform = Some(transform);
        self.effects.target = Some(target);
        if transform_changed {
            // A radius is in CSS pixels and is drawn in render-target pixels, and how far a blur can reach
            // depends on the target's mip levels, so a new scale (a scaled root, a new device pixel ratio) or
            // a new target size changes every plan and every material, not only the rectangles.
            let all: Vec<u32> = self
                .effects
                .backdrops
                .iter()
                .chain(self.effects.groups.iter())
                .copied()
                .collect();
            for tag in all {
                self.sync_effects(tag);
            }
            self.effects.stale = false;
        }
        let backdrops: Vec<u32> = self.effects.backdrops.iter().copied().collect();
        let groups: Vec<u32> = self.effects.groups.iter().copied().collect();
        for tag in backdrops {
            self.refresh_backdrop_rect(tag, &transform, target);
        }
        for tag in groups {
            self.refresh_group_rect(tag, &transform, target);
        }
    }

    fn refresh_backdrop_rect(&mut self, tag: u32, transform: &Transform2D, target: (i32, i32)) {
        let viewport = self.viewport_box();
        let visible = self
            .mounted
            .absolute_geometry(tag, viewport)
            .and_then(|(rect, clip)| {
                let clipped = match clip {
                    Some(clip) => crate::geometry::intersect_clip(Some(rect), Some(clip))?,
                    None => rect,
                };
                (clipped.width > 0.0 && clipped.height > 0.0).then_some(clipped)
            });
        let Some(state) = self.effects.nodes.get_mut(&tag) else {
            return;
        };
        if state.region.is_some() && faults::active(Fault::StaleRects) {
            return;
        }
        let Some(items) = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.render.backdrop.as_ref())
        else {
            return;
        };
        let (copy, draw) = (items.copy, items.draw);
        let region = match (visible, state.backdrop_plan.as_ref()) {
            (Some(rect), plan) => {
                let area = to_target(transform, rect);
                let region = match plan {
                    // Recolour only: the pixels under the element, nothing around them.
                    None => area.intersection(&PixelRect {
                        x: 0,
                        y: 0,
                        width: target.0,
                        height: target.1,
                    }),
                    Some(plan) if faults::active(Fault::UnalignedRegion) => {
                        area.grown(plan.reach_px() as i32).intersection(&PixelRect {
                            x: 0,
                            y: 0,
                            width: target.0,
                            height: target.1,
                        })
                    }
                    Some(plan) => copy_region(area, plan, target),
                };
                (!region.is_empty()).then_some(region)
            }
            _ => None,
        };
        let mut rs = server();
        // Where the level read sits on the target depends on the region the chain is generated for.
        let chain = region
            .zip(state.backdrop_plan)
            .map(|(region, plan)| ChainUniforms::of(region, plan.level));
        if let (Some(chain), Some(slot)) = (chain, state.backdrop_material)
            && state.backdrop_chain != Some(chain)
        {
            set_chain_params(&mut rs, slot.material, "", &chain);
            state.backdrop_chain = Some(chain);
        }
        if state.region != region {
            // The copy is its own item, drawn before the one that reads it (D40 b).
            let copy = if faults::active(Fault::MergedCopy) {
                draw
            } else {
                copy
            };
            match region {
                Some(region) => rs.canvas_item_set_copy_to_backbuffer(
                    copy,
                    true,
                    Rect2::new(
                        Vector2::new(region.x as f32, region.y as f32),
                        Vector2::new(region.width as f32, region.height as f32),
                    ),
                ),
                None => rs.canvas_item_set_copy_to_backbuffer(copy, false, Rect2::default()),
            }
            rs.canvas_item_set_visible(draw, region.is_some());
            state.region = region;
            self.effects.stats.copy_rect_updates += 1;
        }
    }

    fn refresh_group_rect(&mut self, tag: u32, transform: &Transform2D, target: (i32, i32)) {
        let Some(bounds_local) = self.subtree_bounds(tag) else {
            return;
        };
        let Some(frame_origin) = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .map(|(rect, _)| {
                let location = self.mounted.nodes[&tag].geometry.location;
                Vector2::new(rect.x - location.x, rect.y - location.y)
            })
        else {
            return;
        };
        let Some(state) = self.effects.nodes.get_mut(&tag) else {
            return;
        };
        if state.bounds.is_some() && faults::active(Fault::StaleRects) {
            return;
        }
        let area = to_target(transform, bounds_local);
        // The content, and where its shadow falls: both are read from the mip levels and both are drawn.
        let shifted = state
            .group_shadow
            .filter(|_| !faults::active(Fault::ShadowBoxOnly))
            .map(|(offset, _)| PixelRect {
                x: area.x + offset.x.round() as i32,
                y: area.y + offset.y.round() as i32,
                ..area
            });
        let sources = [
            Some((area, state.group_plan)),
            shifted.map(|rect| (rect, state.group_shadow.and_then(|(_, plan)| plan))),
        ];
        // What the composite covers: each source and as far around it as its blur reaches (the plan's kernel, not
        // the stale band the region has at its border). What the mipmaps are generated for: the same areas with
        // that band too, aligned to the largest level read.
        let mut draw = area;
        let mut gen_area = area;
        let mut gen_plan: Option<BlurPlan> = None;
        for (rect, plan) in sources.into_iter().flatten() {
            let reached = plan.map_or(rect, |plan| {
                rect.grown((plan.pairs as i32 + 1) * plan.texel_px() as i32)
            });
            draw = union_pixels(draw, reached);
            gen_area = union_pixels(gen_area, rect);
            if let Some(plan) = plan
                && gen_plan.is_none_or(|best| plan.reach_px() > best.reach_px())
            {
                gen_plan = Some(plan);
            }
        }
        let region = gen_plan.map_or(gen_area, |plan| copy_region_unclipped(gen_area, &plan));
        // What the renderer generates the mipmaps for: the union of the group's rectangles, cut to the target. The
        // shader finds each level's texels through the chain maps of that region.
        let engine_region = union_pixels(region, draw).intersection(&PixelRect {
            x: 0,
            y: 0,
            width: target.0,
            height: target.1,
        });
        let chains = (
            state
                .group_plan
                .map(|plan| ChainUniforms::of(engine_region, plan.level)),
            state
                .group_shadow
                .and_then(|(_, plan)| plan)
                .map(|plan| ChainUniforms::of(engine_region, plan.level)),
        );
        if let Some(slot) = state.group_material
            && state.group_chain != Some(chains)
        {
            let mut rs = server();
            if let Some(chain) = chains.0 {
                set_chain_params(&mut rs, slot.material, "", &chain);
            }
            if let Some(chain) = chains.1 {
                set_chain_params(&mut rs, slot.material, "s_", &chain);
            }
            state.group_chain = Some(chains);
        }
        // The rectangles in the group's frame, the region biased so truncation keeps its aligned integers.
        let inverse = transform.affine_inverse();
        let local = |rect: PixelRect, bias: f32| {
            Rect2::new(
                inverse * Vector2::new(rect.x as f32 + bias, rect.y as f32 + bias) - frame_origin,
                inverse
                    .basis_xform(Vector2::new(
                        rect.width as f32 + bias,
                        rect.height as f32 + bias,
                    ))
                    .abs(),
            )
        };
        let rects = (local(draw, 0.0), local(region, REGION_BIAS_PX));
        if state.bounds != Some(rects) {
            if let Some(node) = self.mounted.nodes.get_mut(&tag) {
                node.render.set_group_rects(rects.0, rects.1);
            }
            state.bounds = Some(rects);
            self.effects.stats.copy_rect_updates += 1;
        }
    }

    /// The root-local rectangle of an element's own box and everything painted below it: a superset
    /// of the rectangle the engine will make the group's region from.
    fn subtree_bounds(&self, tag: u32) -> Option<BoxRect> {
        let (rect, _) = self.mounted.absolute_geometry(tag, self.viewport_box())?;
        let mut bounds = rect;
        let mut stack: Vec<(u32, Vector2)> = vec![(tag, Vector2::new(rect.x, rect.y))];
        while let Some((current, origin)) = stack.pop() {
            let node = self.mounted.nodes.get(&current)?;
            let content = origin
                - if node.is_scroll_container() {
                    crate::scroll_input::to_vector(node.scroll.offset)
                } else {
                    Vector2::ZERO
                };
            for child in &node.paint_children {
                let Some(child_node) = self.mounted.nodes.get(child) else {
                    continue;
                };
                let position = content + child_node.geometry.location;
                bounds = union(
                    bounds,
                    BoxRect {
                        x: position.x,
                        y: position.y,
                        width: child_node.geometry.size.x,
                        height: child_node.geometry.size.y,
                    },
                );
                stack.push((*child, position));
            }
            if let Some(paragraph) = node.visual.paragraph.as_ref() {
                let size = paragraph.get_size();
                let text = origin + node.geometry.content_origin();
                bounds = union(
                    bounds,
                    BoxRect {
                        x: text.x,
                        y: text.y,
                        width: size.x,
                        height: size.y,
                    },
                );
            }
        }
        Some(bounds)
    }

    /// The elements to sync again: an effect appeared or went, so each of the others may now sit
    /// inside a filter group, or no longer.
    pub(crate) fn take_effect_resyncs(&mut self) -> Vec<u32> {
        std::mem::take(&mut self.effects.resync)
            .into_iter()
            .collect()
    }

    /// Drop everything the effects keep for a deleted element.
    pub(crate) fn forget_effects(&mut self, tag: u32) {
        self.forget_effect_state(tag);
        self.effects
            .reported
            .retain(|(node, ancestor)| *node != tag && *ancestor != tag);
        self.effects.reported_clamps.remove(&tag);
    }

    /// What the snapshot says about an element's effects, or `None` if it has none.
    pub(crate) fn effects_json(&self, tag: u32) -> Option<serde_json::Value> {
        let state = self.effects.nodes.get(&tag)?;
        let describe = |plan: &Option<BlurPlan>| {
            plan.map(|plan| {
                json!({"level": plan.level, "kernelTexels": plan.kernel_texels, "pairs": plan.pairs,
                    "achievedPx": plan.achieved_px, "clamped": plan.clamped})
            })
        };
        Some(json!({
            "backdrop": self.effects.backdrops.contains(&tag).then(|| json!({
                "plan": describe(&state.backdrop_plan),
                "region": state.region.map(|r| json!([r.x, r.y, r.width, r.height])),
                "kind": state.backdrop_material.map(|slot| format!("{:?}", slot.kind)),
            })),
            "filter": self.effects.groups.contains(&tag).then(|| json!({
                "plan": describe(&state.group_plan),
                "kind": state.group_material.map(|slot| format!("{:?}", slot.kind)),
            })),
        }))
    }

    pub(crate) fn effects_activity(&self) -> serde_json::Value {
        let stats = &self.effects.stats;
        let copies = self
            .effects
            .nodes
            .values()
            .filter(|state| state.region.is_some())
            .count();
        json!({"backdrops": self.effects.backdrops.len(), "groups": self.effects.groups.len(),
            "copiesEnabled": copies, "itemsCreated": stats.items_created,
            "materialsCreated": stats.materials_created, "shadersCreated": stats.shaders_created,
            "materialUpdates": stats.material_updates, "copyRectUpdates": stats.copy_rect_updates,
            "primer": self.effects.primer.is_some()})
    }
}

fn union_pixels(a: PixelRect, b: PixelRect) -> PixelRect {
    let x = a.x.min(b.x);
    let y = a.y.min(b.y);
    PixelRect {
        x,
        y,
        width: a.right().max(b.right()) - x,
        height: a.bottom().max(b.bottom()) - y,
    }
}

fn union(a: BoxRect, b: BoxRect) -> BoxRect {
    let x = a.x.min(b.x);
    let y = a.y.min(b.y);
    BoxRect {
        x,
        y,
        width: (a.x + a.width).max(b.x + b.width) - x,
        height: (a.y + a.height).max(b.y + b.height) - y,
    }
}

/// The group's region: the content's area grown by the plan's reach and aligned to its level, not cut
/// to the target (the engine cuts it; cutting here would misalign the region it generates).
fn copy_region_unclipped(area: PixelRect, plan: &BlurPlan) -> PixelRect {
    let huge = i32::MAX / 4;
    let region = copy_region(area, plan, (huge, huge));
    let origin_floor = PixelRect {
        x: -huge,
        y: -huge,
        width: 2 * huge,
        height: 2 * huge,
    };
    region.intersection(&origin_floor)
}

fn set_map_params(rs: &mut Gd<RenderingServer>, material: Rid, prefix: &str, map: &MapUniforms) {
    for (suffix, row) in ["r", "g", "b", "a"].iter().zip(&map.rows) {
        rs.material_set_param(material, &format!("{prefix}_{suffix}"), &vec4(*row));
    }
    rs.material_set_param(material, &format!("{prefix}_off"), &vec4(map.offset));
}

fn set_blur_params(rs: &mut Gd<RenderingServer>, material: Rid, prefix: &str, blur: &BlurUniforms) {
    rs.material_set_param(
        material,
        &format!("{prefix}level"),
        &blur.level.to_variant(),
    );
    rs.material_set_param(
        material,
        &format!("{prefix}pairs"),
        &blur.pairs.to_variant(),
    );
    rs.material_set_param(
        material,
        &format!("{prefix}inv_two_sigma2"),
        &blur.inv_two_sigma2.to_variant(),
    );
}
