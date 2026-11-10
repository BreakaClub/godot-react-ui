//! The evidence probe. Compiled only with `--features probe`; default builds do not contain it.
//!
//! It measures the costs the Fabric design depends on before
//! anything is built on them: allocating a `RefCounted` handle that owns a Rust `Rc` for every native
//! node clone, how long JS garbage collection takes to give those handles back, the JS string to
//! `serde_json` boundary, and passing arrays of handles. Nothing here is used by the product.
use std::rc::Rc;
use std::sync::atomic::{AtomicI64, Ordering};

use godot::prelude::*;

use crate::props::StyleSpec;

/// Size of the heap allocation each probe handle owns, standing in for a shadow node's data.
const PROBE_PAYLOAD_BYTES: usize = 64;

/// Handles constructed and not yet dropped. Incremented in construction and decremented in `Drop`,
/// so it is the number of native allocations JS has not yet given back.
static LIVE_HANDLES: AtomicI64 = AtomicI64::new(0);

/// Stands in for `ShadowNodeHandle`: a `RefCounted` that owns an `Rc` to native data.
#[derive(GodotClass)]
#[class(no_init, base = RefCounted)]
pub struct ReactUiProbeHandle {
    base: Base<RefCounted>,
    tag: u32,
    /// Fresh per handle, like the node a native clone allocates; length read by `count_handles`.
    payload: Rc<Vec<u8>>,
}

impl Drop for ReactUiProbeHandle {
    fn drop(&mut self) {
        LIVE_HANDLES.fetch_sub(1, Ordering::Relaxed);
    }
}

/// The probe's methods, called from `demo/src/probe.ts`.
#[derive(GodotClass)]
#[class(base = RefCounted)]
pub struct ReactUiProbe {
    base: Base<RefCounted>,
}

#[godot_api]
impl IRefCounted for ReactUiProbe {
    fn init(base: Base<RefCounted>) -> Self {
        Self { base }
    }
}

#[godot_api]
impl ReactUiProbe {
    /// Allocate one handle.
    #[func]
    fn make_handle(&self, tag: i64) -> Gd<ReactUiProbeHandle> {
        LIVE_HANDLES.fetch_add(1, Ordering::Relaxed);
        Gd::from_init_fn(|base| ReactUiProbeHandle {
            base,
            // A tag outside u32 is a probe misuse; the probe passes loop indexes.
            tag: u32::try_from(tag).expect("probe tags are loop indexes below u32::MAX"),
            payload: Rc::new(vec![0; PROBE_PAYLOAD_BYTES]),
        })
    }

    #[func]
    fn live_handles(&self) -> i64 {
        LIVE_HANDLES.load(Ordering::Relaxed)
    }

    /// The cheapest possible call: the cost floor of crossing from JS into a native method.
    #[func]
    fn noop(&self) {}

    /// Marshalling only: JS string to `GString` to Rust `String`, no parsing.
    #[func]
    fn string_length(&self, props_json: GString) -> i64 {
        props_json.to_string().len() as i64
    }

    /// The whole props boundary: JS string, `GString`, `String`, `serde_json` into the real
    /// `StyleSpec`, validation. An empty return is success, as in the product API.
    #[func]
    fn probe_parse(&self, props_json: GString) -> GString {
        match serde_json::from_str::<StyleSpec>(&props_json.to_string()) {
            Ok(style) => match style.validate() {
                Ok(()) => GString::new(),
                Err(error) => GString::from(&error),
            },
            Err(error) => GString::from(&error.to_string()),
        }
    }

    /// A JS array of handles passed as a typed Godot array, the signature a `complete_root`
    /// would use. Reads every element so conversion cost cannot be skipped.
    #[func]
    fn count_handles_typed(&self, handles: Array<Gd<ReactUiProbeHandle>>) -> i64 {
        handles
            .iter_shared()
            .map(|handle| handle.bind().payload.len() as i64 + i64::from(handle.bind().tag))
            .sum()
    }

    /// The same array passed untyped, converting each element natively.
    #[func]
    fn count_handles_untyped(&self, handles: VarArray) -> i64 {
        handles
            .iter_shared()
            .filter_map(|variant| variant.try_to::<Gd<ReactUiProbeHandle>>().ok())
            .map(|handle| handle.bind().payload.len() as i64 + i64::from(handle.bind().tag))
            .sum()
    }
}
