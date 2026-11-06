//! The clipboard the root's copy, cut and paste read and write.
//!
//! Every read and write of the system clipboard goes through here, and the product's own code (copying a selection,
//! the edit commands of a text input, what a paste is made of) runs unchanged on top of it. A verifier run swaps only
//! the bottom: [`isolate`] makes the clipboard the process's own memory, so a test that copies and pastes cannot
//! overwrite what the person using the machine copied (and cannot be broken by them copying something). Nothing
//! else about the product changes with it, and a normal run never calls it.
//!
//! Godot's `DisplayServer` exposes the clipboard as text only: a verifier that restored it after writing would drop any
//! other type the person had copied (an image, files, formatting). Not touching it is the only way to leave it alone.

use std::sync::{Mutex, PoisonError};

use godot::classes::DisplayServer;
use godot::prelude::*;

/// The machine's clipboard, as `DisplayServer` reaches it. A seam for the tests of the routing below.
trait SystemClipboard {
    fn read(&self) -> String;
    fn write(&self, text: &str);
}

struct DisplayServerClipboard;

impl SystemClipboard for DisplayServerClipboard {
    fn read(&self) -> String {
        DisplayServer::singleton().clipboard_get().to_string()
    }

    fn write(&self, text: &str) {
        DisplayServer::singleton().clipboard_set(text);
    }
}

/// Where reads and writes go: the system clipboard, or, after [`isolate`], this text.
#[derive(Default)]
struct Routing {
    memory: Option<String>,
}

impl Routing {
    fn read(&self, system: &impl SystemClipboard) -> String {
        match &self.memory {
            Some(text) => text.clone(),
            None => system.read(),
        }
    }

    fn write(&mut self, system: &impl SystemClipboard, text: &str) {
        match &mut self.memory {
            Some(memory) => *memory = text.to_owned(),
            None => system.write(text),
        }
    }

    /// Start (`true`, with an empty clipboard) or stop (`false`) keeping the clipboard in memory.
    fn isolate(&mut self, isolated: bool) {
        self.memory = isolated.then(String::new);
    }
}

static ROUTING: Mutex<Routing> = Mutex::new(Routing { memory: None });

fn routing() -> std::sync::MutexGuard<'static, Routing> {
    // A panic elsewhere must not turn every later copy into another panic: the text is always in a usable state.
    ROUTING.lock().unwrap_or_else(PoisonError::into_inner)
}

/// The clipboard's text.
pub(crate) fn read() -> String {
    routing().read(&DisplayServerClipboard)
}

/// Put `text` on the clipboard.
pub(crate) fn write(text: &str) {
    routing().write(&DisplayServerClipboard, text);
}

/// Keep the clipboard in this process's memory (`true`) or go back to the machine's (`false`). For verifier runs only.
pub(crate) fn isolate(isolated: bool) {
    routing().isolate(isolated);
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::{Routing, SystemClipboard};

    /// A system clipboard that remembers what was written and counts how often it was touched.
    #[derive(Default)]
    struct FakeSystem {
        text: RefCell<String>,
        touches: RefCell<usize>,
    }

    impl SystemClipboard for FakeSystem {
        fn read(&self) -> String {
            *self.touches.borrow_mut() += 1;
            self.text.borrow().clone()
        }

        fn write(&self, text: &str) {
            *self.touches.borrow_mut() += 1;
            *self.text.borrow_mut() = text.to_owned();
        }
    }

    #[test]
    fn a_normal_run_reads_and_writes_the_system_clipboard() {
        let system = FakeSystem::default();
        let mut routing = Routing::default();
        routing.write(&system, "copied");
        assert_eq!(system.text.borrow().as_str(), "copied");
        assert_eq!(routing.read(&system), "copied");
    }

    #[test]
    fn an_isolated_run_never_touches_the_system_clipboard() {
        let system = FakeSystem::default();
        *system.text.borrow_mut() = "what the person copied".to_owned();
        let mut routing = Routing::default();
        routing.isolate(true);
        assert_eq!(
            routing.read(&system),
            "",
            "an isolated clipboard starts empty, not with the machine's text"
        );
        routing.write(&system, "copied by the test");
        assert_eq!(routing.read(&system), "copied by the test");
        assert_eq!(system.text.borrow().as_str(), "what the person copied");
        assert_eq!(*system.touches.borrow(), 0, "not read and not written");
    }

    #[test]
    fn leaving_isolation_returns_to_the_system_clipboard_with_it_unchanged() {
        let system = FakeSystem::default();
        *system.text.borrow_mut() = "what the person copied".to_owned();
        let mut routing = Routing::default();
        routing.isolate(true);
        routing.write(&system, "copied by the test");
        routing.isolate(false);
        assert_eq!(routing.read(&system), "what the person copied");
    }

    #[test]
    fn isolating_again_starts_from_an_empty_clipboard() {
        let system = FakeSystem::default();
        let mut routing = Routing::default();
        routing.isolate(true);
        routing.write(&system, "first run");
        routing.isolate(true);
        assert_eq!(routing.read(&system), "");
    }
}
