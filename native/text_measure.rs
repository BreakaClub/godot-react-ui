//! The sizes a text leaf has answered Taffy with, kept with the leaf.
//!
//! One layout asks a text for its size under many constraints: every ancestor that sizes itself by its content asks again, with other
//! available space, and a flex row asks for the minimum and the maximum width and then the height at the width it settled on. Taffy keeps
//! nine answers per node, and a text in a status bar is asked eleven different questions per layout, so once a layout of its row runs again
//! the answers are evicted in the order they are asked for, none is found, and every text of the row is measured again although none of them
//! changed. Measuring a `TextParagraph` is a call into the text server for each question (set the width, read
//! the size), so a leaf remembers what it answered: asked again, it answers from memory.
//!
//! Remembering the questions also tells whether a new text can change the layout. The layout depends on a leaf only through its answers; so a
//! text that answers every question the old one was asked as the old one did leaves every ancestor's layout as it is, and
//! [`crate::layout::replace_context`] swaps it in without asking Taffy to lay anything out again.

use godot::builtin::Vector2;

use crate::text_paragraph::Offered;

/// Something that says how large it is when offered a width: a shaped paragraph.
pub(crate) trait Sizer {
    fn size_at(&mut self, offered: Offered) -> Vector2;
}

/// How many different widths a leaf remembers. A text is asked about a handful (the row it is in, the column that row is in, each in its
/// minimum, maximum and settled width); a window being dragged asks about a new one every frame, and the leaf stops remembering then
/// rather than growing, which is [`MeasuredText::measures_like`]'s reason to refuse.
const REMEMBERED_WIDTHS: usize = 64;

/// A sizer with the answers it has given since it was made.
#[derive(Clone)]
pub(crate) struct MeasuredText<S> {
    sizer: S,
    answers: Vec<(Offered, Vector2)>,
    /// Whether `answers` holds every answer the layout has been given by this leaf. False once it ran out of room, as the
    /// layout's own results may then derive from an answer no longer here.
    exhaustive: bool,
}

impl<S: Sizer> MeasuredText<S> {
    pub(crate) fn new(sizer: S) -> Self {
        Self {
            sizer,
            answers: Vec::new(),
            exhaustive: true,
        }
    }

    /// The size when offered `offered`: remembered, or measured now.
    pub(crate) fn size_at(&mut self, offered: Offered) -> Vector2 {
        if let Some((_, size)) = self.answers.iter().find(|(asked, _)| *asked == offered) {
            return *size;
        }
        let size = self.sizer.size_at(offered);
        if self.answers.len() == REMEMBERED_WIDTHS {
            self.answers.clear();
            self.exhaustive = false;
        }
        self.answers.push((offered, size));
        size
    }

    /// Whether this text answers every question `previous` answered as it did. Then the layout built from `previous`'s answers is the
    /// layout of this text, and this one has been asked (and remembers) what the layout knows. False when `previous` cannot say what the
    /// layout was built from.
    pub(crate) fn measures_like(&mut self, previous: &Self) -> bool {
        previous.exhaustive
            && previous
                .answers
                .iter()
                .all(|(offered, size)| self.size_at(*offered) == *size)
    }
}

/// A sizer for tests, which counts the questions it is asked.
#[cfg(test)]
pub(crate) mod counting {
    use std::cell::Cell;
    use std::rc::Rc;

    use godot::builtin::Vector2;

    use super::{MeasuredText, Sizer};
    use crate::text_paragraph::Offered;

    /// A text `width` wide on one line, or wrapped to the width it is offered, counting the questions it was asked.
    #[derive(Clone)]
    pub(crate) struct Counted {
        pub(crate) width: f32,
        pub(crate) asked: Rc<Cell<usize>>,
    }

    impl Sizer for Counted {
        fn size_at(&mut self, offered: Offered) -> Vector2 {
            self.asked.set(self.asked.get() + 1);
            match offered {
                Offered::MaxContent => Vector2::new(self.width, 16.0),
                Offered::MinContent => Vector2::new(self.width / 2.0, 32.0),
                Offered::Definite(width) => {
                    // A word is as wide as half the text, so no width narrower than that breaks it further.
                    let wrapped = width.max(self.width / 2.0);
                    let lines = (self.width / wrapped).ceil().max(1.0);
                    Vector2::new(self.width.min(wrapped), 16.0 * lines)
                }
            }
        }
    }

    /// A remembering text of that width, and the count of the questions it was asked.
    pub(crate) fn counted(width: f32) -> (MeasuredText<Counted>, Rc<Cell<usize>>) {
        let asked = Rc::new(Cell::new(0));
        let text = MeasuredText::new(Counted {
            width,
            asked: Rc::clone(&asked),
        });
        (text, asked)
    }
}

#[cfg(test)]
mod tests {
    use super::counting::counted;
    use super::*;

    #[test]
    fn a_question_asked_again_is_answered_from_memory() {
        let (mut text, asked) = counted(90.0);
        let first = text.size_at(Offered::Definite(40.0));
        assert_eq!(text.size_at(Offered::Definite(40.0)), first);
        assert_eq!(text.size_at(Offered::MaxContent), Vector2::new(90.0, 16.0));
        assert_eq!(text.size_at(Offered::MaxContent), Vector2::new(90.0, 16.0));
        assert_eq!(asked.get(), 2);
    }

    #[test]
    fn a_text_that_answers_as_the_old_one_did_is_like_it_and_remembers_the_questions() {
        let (mut old, _) = counted(90.0);
        for offered in [
            Offered::MaxContent,
            Offered::MinContent,
            Offered::Definite(60.0),
        ] {
            old.size_at(offered);
        }
        let (mut same, asked) = counted(90.0);
        assert!(same.measures_like(&old));
        assert_eq!(asked.get(), 3, "each question the old one was asked is put");
        same.size_at(Offered::MinContent);
        assert_eq!(asked.get(), 3, "and is remembered by the new one");
    }

    #[test]
    fn a_text_that_answers_one_question_differently_is_not_like_the_old_one() {
        let (mut old, _) = counted(90.0);
        old.size_at(Offered::MaxContent);
        old.size_at(Offered::Definite(100.0));
        let (mut wider, _) = counted(91.0);
        assert!(!wider.measures_like(&old));
    }

    #[test]
    fn a_text_that_forgot_questions_cannot_vouch_for_the_layout() {
        let (mut old, _) = counted(90.0);
        for width in 1..=REMEMBERED_WIDTHS + 1 {
            old.size_at(Offered::Definite(width as f32));
        }
        let (mut same, _) = counted(90.0);
        assert!(!same.measures_like(&old));
    }
}
