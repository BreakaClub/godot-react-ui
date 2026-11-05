//! Opt-in bounded timing samples. Timings cover CPU work, never GPU completion.
use serde::Serialize;
use std::collections::VecDeque;
use std::time::Instant;

const PROFILE_CAPACITY: usize = 512;

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Sample {
    /// One `commit` call (the sample keeps v1's `batch` name for the benchmark runner).
    #[serde(rename_all = "camelCase")]
    Batch {
        parse_micros: u64,
        /// Payload validation, planning and the style dry run.
        validate_micros: u64,
        /// Applying the transaction and publishing style changes, less layout and geometry.
        mount_micros: u64,
        layout_micros: u64,
        geometry_micros: u64,
        total_micros: u64,
    },
    #[serde(rename_all = "camelCase")]
    Frame {
        style_micros: u64,
        measure_micros: u64,
        layout_micros: u64,
        geometry_micros: u64,
        animation_micros: u64,
    },
    #[serde(rename_all = "camelCase")]
    Draw { cpu_micros: u64 },
}

#[derive(Default)]
pub struct Profiler {
    enabled: bool,
    samples: VecDeque<Sample>,
    dropped: u64,
}

impl Profiler {
    pub fn enable(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    pub fn record(&mut self, sample: Sample) {
        if !self.enabled {
            return;
        }
        if self.samples.len() == PROFILE_CAPACITY {
            self.samples.pop_front();
            self.dropped += 1;
        }
        self.samples.push_back(sample);
    }
    pub fn take(&mut self) -> (VecDeque<Sample>, u64) {
        (
            std::mem::take(&mut self.samples),
            std::mem::take(&mut self.dropped),
        )
    }
}

pub fn micros(start: Instant) -> u64 {
    start.elapsed().as_micros() as u64
}
