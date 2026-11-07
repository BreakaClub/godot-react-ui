//! CSS font matching: which of a family's faces answers a request for a weight and a style (CSS Fonts 4, "Font Matching
//! Algorithm", step 4), and what the browser then makes up for. Nothing here touches Godot.

/// What a registered face covers.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FaceDesc {
    /// The lightest and the heaviest weight the face draws: equal for a static face, the `wght` axis' range for a variable one.
    pub weight_min: u16,
    pub weight_max: u16,
    pub italic: bool,
}

impl FaceDesc {
    pub fn fixed(weight: u16, italic: bool) -> Self {
        Self {
            weight_min: weight,
            weight_max: weight,
            italic,
        }
    }

    /// The weight this face draws for a request: the request, held to the face's range.
    fn weight_for(&self, requested: u16) -> u16 {
        requested.clamp(self.weight_min, self.weight_max)
    }

    #[cfg(test)]
    fn is_variable(&self) -> bool {
        self.weight_min != self.weight_max
    }
}

/// The weight from which a request is bold, and below which a face lacks the bold the request asked for (CSS Fonts 4, synthesis).
pub const BOLD_THRESHOLD: u16 = 600;

/// The answer to a request.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FaceChoice {
    /// The face's index in the list matched.
    pub index: usize,
    /// For a variable face, the value to set on its `wght` axis; for a static one, the weight it has.
    pub weight: u16,
    /// The face is lighter than the request calls for and the browser thickens its outlines.
    pub synthetic_bold: bool,
    /// The request is italic and the face is not: the browser slants it.
    pub synthetic_italic: bool,
}

/// The face of `faces` that answers a request for `weight` and `italic`, or `None` when there are no faces.
///
/// Style first: an italic request takes the italic faces if there are any, and a normal one the upright ones. Then weight:
/// an exact cover wins; a request between 400 and 500 looks up to 500 first, then below, then above; below 400 looks lighter
/// first, then heavier; above 500 looks heavier first, then lighter.
pub fn match_face(faces: &[FaceDesc], weight: u16, italic: bool) -> Option<FaceChoice> {
    let preferred: Vec<usize> = (0..faces.len())
        .filter(|&index| faces[index].italic == italic)
        .collect();
    let candidates: Vec<usize> = if preferred.is_empty() {
        (0..faces.len()).collect()
    } else {
        preferred
    };
    let index = nearest_weight(faces, &candidates, weight)?;
    let face = faces[index];
    let drawn = face.weight_for(weight);
    Some(FaceChoice {
        index,
        weight: drawn,
        synthetic_bold: weight >= BOLD_THRESHOLD && drawn < BOLD_THRESHOLD,
        synthetic_italic: italic && !face.italic,
    })
}

fn nearest_weight(faces: &[FaceDesc], candidates: &[usize], weight: u16) -> Option<usize> {
    // A face covering the request draws it exactly.
    if let Some(&index) = candidates
        .iter()
        .find(|&&index| (faces[index].weight_min..=faces[index].weight_max).contains(&weight))
    {
        return Some(index);
    }
    // Otherwise a face stands for the weight it draws at: its range held to the request.
    let drawn = |index: usize| faces[index].weight_for(weight);
    // The nearest of the faces `wanted` accepts; equal distances keep the order the faces were registered in.
    let pick = |wanted: &dyn Fn(u16) -> bool| {
        candidates
            .iter()
            .copied()
            .filter(|&index| wanted(drawn(index)))
            .min_by_key(|&index| drawn(index).abs_diff(weight))
    };
    let at_most = |limit: u16| move |candidate: u16| candidate <= limit;
    let at_least = |limit: u16| move |candidate: u16| candidate >= limit;
    const REGULAR: u16 = 400;
    const MEDIUM: u16 = 500;
    if (REGULAR..=MEDIUM).contains(&weight) {
        // Up to 500 (above the request), then lighter, then heavier than 500.
        pick(&|candidate| candidate >= weight && candidate <= MEDIUM)
            .or_else(|| pick(&at_most(weight)))
            .or_else(|| pick(&at_least(weight)))
    } else if weight < REGULAR {
        pick(&at_most(weight)).or_else(|| pick(&at_least(weight)))
    } else {
        pick(&at_least(weight)).or_else(|| pick(&at_most(weight)))
    }
}

/// Whether `faces` contains a variable one, which draws any weight in its range without synthesis.
#[cfg(test)]
pub fn has_variable(faces: &[FaceDesc]) -> bool {
    faces.iter().any(FaceDesc::is_variable)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn upright(weights: &[u16]) -> Vec<FaceDesc> {
        weights
            .iter()
            .map(|&weight| FaceDesc::fixed(weight, false))
            .collect()
    }

    fn weight_chosen(faces: &[FaceDesc], request: u16) -> u16 {
        match_face(faces, request, false)
            .map(|choice| faces[choice.index].weight_min)
            .expect("a face")
    }

    #[test]
    fn an_exact_weight_wins() {
        let faces = upright(&[300, 400, 500, 700]);
        for weight in [300, 400, 500, 700] {
            assert_eq!(weight_chosen(&faces, weight), weight);
        }
    }

    #[test]
    fn between_400_and_500_looks_up_to_500_then_lighter_then_heavier() {
        assert_eq!(weight_chosen(&upright(&[300, 500, 700]), 400), 500);
        assert_eq!(weight_chosen(&upright(&[300, 700]), 400), 300);
        assert_eq!(weight_chosen(&upright(&[700, 900]), 400), 700);
        assert_eq!(weight_chosen(&upright(&[300, 400, 700]), 500), 400);
        assert_eq!(weight_chosen(&upright(&[300, 700]), 500), 300);
        assert_eq!(weight_chosen(&upright(&[300, 450, 700]), 420), 450);
    }

    #[test]
    fn below_400_looks_lighter_first_and_above_500_looks_heavier_first() {
        assert_eq!(weight_chosen(&upright(&[100, 400, 700]), 300), 100);
        assert_eq!(weight_chosen(&upright(&[400, 700]), 300), 400);
        assert_eq!(weight_chosen(&upright(&[400, 700, 900]), 600), 700);
        assert_eq!(weight_chosen(&upright(&[400, 500]), 800), 500);
        assert_eq!(weight_chosen(&upright(&[400, 800, 900]), 700), 800);
    }

    #[test]
    fn a_variable_face_draws_the_request_when_it_covers_it_and_its_edge_otherwise() {
        let faces = [FaceDesc {
            weight_min: 200,
            weight_max: 800,
            italic: false,
        }];
        let draws = |request| match_face(&faces, request, false).unwrap().weight;
        assert_eq!(draws(450), 450);
        assert_eq!(draws(100), 200);
        assert_eq!(draws(900), 800);
        assert!(has_variable(&faces));
        assert!(!has_variable(&upright(&[400, 700])));
    }

    #[test]
    fn style_is_matched_before_weight() {
        let faces = vec![
            FaceDesc::fixed(400, false),
            FaceDesc::fixed(700, false),
            FaceDesc::fixed(400, true),
        ];
        let italic = match_face(&faces, 700, true).unwrap();
        assert_eq!(
            italic.index, 2,
            "the only italic face, though a heavier upright one exists"
        );
        assert!(!italic.synthetic_italic);
        assert!(italic.synthetic_bold, "and bold is made up for it");
        let upright = match_face(&faces, 700, false).unwrap();
        assert_eq!(upright.index, 1);
        assert!(!upright.synthetic_bold && !upright.synthetic_italic);
    }

    #[test]
    fn a_missing_italic_is_slanted_and_a_missing_bold_is_thickened() {
        let faces = upright(&[400]);
        let choice = match_face(&faces, 700, true).unwrap();
        assert!(choice.synthetic_italic && choice.synthetic_bold);
        // 500 and 599 are not bold; 600 is.
        assert!(!match_face(&faces, 599, false).unwrap().synthetic_bold);
        assert!(match_face(&faces, 600, false).unwrap().synthetic_bold);
        // A semibold face already is bold.
        assert!(
            !match_face(&upright(&[600]), 900, false)
                .unwrap()
                .synthetic_bold
        );
        // An italic request on italic-only faces takes one; a normal request on italic-only takes it too and does not slant.
        let italic_only = vec![FaceDesc::fixed(400, true)];
        assert!(
            !match_face(&italic_only, 400, true)
                .unwrap()
                .synthetic_italic
        );
        assert!(
            !match_face(&italic_only, 400, false)
                .unwrap()
                .synthetic_italic
        );
    }

    #[test]
    fn no_faces_match_nothing() {
        assert_eq!(match_face(&[], 400, false), None);
    }
}
