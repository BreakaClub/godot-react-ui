//! Child-list differ and the mounting transaction it feeds (plan sections 3.4 and 3.7).
//!
//! Nothing here touches Godot. A commit plans one [`ListDiff`] per changed child list; the
//! mounting layer applies the resulting transaction in the order Remove, Delete, Create, Update,
//! Insert.

use crate::props::{Kind, PropsSpec};

/// Where a child list lives: a layer's top-level list or a node's children.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Parent {
    Layer(usize),
    Node(u32),
}

/// The change from one child list to another: remove indices into the old list (descending, so
/// each removal leaves the lower indices valid), then insert at final indices (ascending, so each
/// insertion finds everything before it already in place).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ListDiff {
    pub removes: Vec<(usize, u32)>,
    pub inserts: Vec<(usize, u32)>,
}

/// Minimal remove/insert edit between two lists of unique tags. The common prefix and suffix are
/// stable. In the middle, the children present in both lists that keep their relative order (the
/// longest increasing subsequence of their old indices, taken in new order) stay; every other child
/// is removed and re-inserted, and children only in the old list are removed.
pub fn diff_children(old: &[u32], new: &[u32]) -> ListDiff {
    let prefix = old
        .iter()
        .zip(new)
        .take_while(|(left, right)| left == right)
        .count();
    let suffix = old[prefix..]
        .iter()
        .rev()
        .zip(new[prefix..].iter().rev())
        .take_while(|(left, right)| left == right)
        .count();
    let old_middle = &old[prefix..old.len() - suffix];
    let new_middle = &new[prefix..new.len() - suffix];
    if old_middle.is_empty() && new_middle.is_empty() {
        return ListDiff::default();
    }

    // Old index (within the middle) of each new-middle child that also exists in the old middle.
    let old_index: std::collections::HashMap<u32, usize> = old_middle
        .iter()
        .enumerate()
        .map(|(index, tag)| (*tag, index))
        .collect();
    let mut shared: Vec<(usize, usize)> = Vec::new(); // (index in new middle, index in old middle)
    for (new_position, tag) in new_middle.iter().enumerate() {
        if let Some(old_position) = old_index.get(tag) {
            shared.push((new_position, *old_position));
        }
    }
    let stable_positions = longest_increasing_subsequence(
        &shared
            .iter()
            .map(|(_, old_position)| *old_position)
            .collect::<Vec<_>>(),
    );
    let mut stays_old = vec![false; old_middle.len()];
    let mut stays_new = vec![false; new_middle.len()];
    for position in stable_positions {
        let (new_position, old_position) = shared[position];
        stays_old[old_position] = true;
        stays_new[new_position] = true;
    }

    let mut diff = ListDiff::default();
    for (position, tag) in old_middle.iter().enumerate().rev() {
        if !stays_old[position] {
            diff.removes.push((prefix + position, *tag));
        }
    }
    for (position, tag) in new_middle.iter().enumerate() {
        if !stays_new[position] {
            diff.inserts.push((prefix + position, *tag));
        }
    }
    diff
}

/// Positions (indices into `values`) of one longest strictly increasing subsequence, in order.
/// Patience sorting with predecessor links, O(n log n).
fn longest_increasing_subsequence(values: &[usize]) -> Vec<usize> {
    // tails[length - 1] is the position of the smallest tail value of any increasing subsequence
    // of that length found so far.
    let mut tails: Vec<usize> = Vec::new();
    let mut previous: Vec<Option<usize>> = vec![None; values.len()];
    for (position, value) in values.iter().enumerate() {
        let length = tails.partition_point(|tail| values[*tail] < *value);
        if length > 0 {
            previous[position] = Some(tails[length - 1]);
        }
        if length == tails.len() {
            tails.push(position);
        } else {
            tails[length] = position;
        }
    }
    let mut result = Vec::with_capacity(tails.len());
    let mut cursor = tails.last().copied();
    while let Some(position) = cursor {
        result.push(position);
        cursor = previous[position];
    }
    result.reverse();
    result
}

/// A node being created: the kind it will have and its full props.
#[derive(Clone, Debug, PartialEq)]
pub struct Create {
    pub tag: u32,
    pub kind: Kind,
    pub props: PropsSpec,
}

/// A mounted node whose props changed to `props` (the merged result, not the diff).
#[derive(Clone, Debug, PartialEq)]
pub struct Update {
    pub tag: u32,
    pub props: PropsSpec,
}

/// Detach `tag` from `parent`, which listed it at `index` before this commit.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Removal {
    pub parent: Parent,
    pub tag: u32,
    pub index: usize,
}

/// Attach `tag` under `parent` at its final `index`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Insertion {
    pub parent: Parent,
    pub tag: u32,
    pub index: usize,
}

/// Everything a commit does to the mounted tree, in application order: `removes`, `deletes`,
/// `creates`, `updates`, `inserts`.
///
/// `deletes` lists every tag that leaves the tree, descendants before ancestors; a deleted
/// subtree is detached once, at its top, by an entry in `removes`. A tag that is removed from one
/// parent and inserted under another in the same commit is moved, not deleted.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct MountingTransaction {
    pub removes: Vec<Removal>,
    pub deletes: Vec<u32>,
    pub creates: Vec<Create>,
    pub updates: Vec<Update>,
    pub inserts: Vec<Insertion>,
}

/// A fixed-seed generator for the differ and commit property tests, so a failing case reproduces
/// exactly.
#[cfg(test)]
pub(crate) mod random {
    /// xorshift64*.
    pub(crate) struct Random(pub(crate) u64);

    impl Random {
        pub(crate) fn next(&mut self) -> u64 {
            self.0 ^= self.0 >> 12;
            self.0 ^= self.0 << 25;
            self.0 ^= self.0 >> 27;
            self.0.wrapping_mul(0x2545_f491_4f6c_dd1d)
        }

        pub(crate) fn below(&mut self, bound: u32) -> u32 {
            u32::try_from(self.next() % u64::from(bound)).expect("bound fits u32")
        }

        pub(crate) fn shuffle(&mut self, list: &mut [u32]) {
            for index in (1..list.len()).rev() {
                let other = self.below(u32::try_from(index + 1).expect("small list")) as usize;
                list.swap(index, other);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use super::random::Random;

    const PROPERTY_TEST_CASES: usize = 500;
    const PROPERTY_TEST_SEED: u64 = 0x5eed_f1d0_d1ff_0001;
    const MAX_LIST_LENGTH: u32 = 14;
    const MAX_TAG: u32 = 24;

    fn apply(old: &[u32], diff: &ListDiff) -> Vec<u32> {
        let mut list = old.to_vec();
        for (index, tag) in &diff.removes {
            assert_eq!(list[*index], *tag, "a removal names the tag at its index");
            list.remove(*index);
        }
        for (index, tag) in &diff.inserts {
            list.insert(*index, *tag);
        }
        list
    }

    fn sample(random: &mut Random) -> Vec<u32> {
        let mut pool: Vec<u32> = (1..=MAX_TAG).collect();
        random.shuffle(&mut pool);
        pool.truncate(random.below(MAX_LIST_LENGTH + 1) as usize);
        pool
    }

    #[test]
    fn an_unchanged_list_produces_nothing() {
        assert_eq!(diff_children(&[], &[]), ListDiff::default());
        assert_eq!(diff_children(&[1, 2, 3], &[1, 2, 3]), ListDiff::default());
    }

    #[test]
    fn insertions_and_removals_touch_only_the_changed_children() {
        let diff = diff_children(&[1, 2, 3], &[1, 2, 3, 4]);
        assert_eq!(diff.removes, vec![]);
        assert_eq!(diff.inserts, vec![(3, 4)]);
        let diff = diff_children(&[1, 2, 3], &[0, 1, 2, 3]);
        assert_eq!(diff.inserts, vec![(0, 0)]);
        let diff = diff_children(&[1, 2, 3, 4], &[1, 4]);
        assert_eq!(diff.removes, vec![(2, 3), (1, 2)], "highest index first");
        assert_eq!(diff.inserts, vec![]);
        let diff = diff_children(&[1, 2, 3], &[]);
        assert_eq!(diff.removes, vec![(2, 3), (1, 2), (0, 1)]);
        let diff = diff_children(&[], &[1, 2]);
        assert_eq!(diff.inserts, vec![(0, 1), (1, 2)]);
    }

    #[test]
    fn a_move_is_one_removal_and_one_insertion() {
        // The first child jumps to the end: only it moves.
        let diff = diff_children(&[1, 2, 3, 4], &[2, 3, 4, 1]);
        assert_eq!(diff.removes, vec![(0, 1)]);
        assert_eq!(diff.inserts, vec![(3, 1)]);
        // The last child jumps to the front.
        let diff = diff_children(&[1, 2, 3, 4], &[4, 1, 2, 3]);
        assert_eq!(diff.removes, vec![(3, 4)]);
        assert_eq!(diff.inserts, vec![(0, 4)]);
        // A swap of two neighbours moves one of them.
        let diff = diff_children(&[1, 2, 3, 4], &[1, 3, 2, 4]);
        assert_eq!(diff.removes.len(), 1);
        assert_eq!(diff.inserts.len(), 1);
        assert_eq!(apply(&[1, 2, 3, 4], &diff), vec![1, 3, 2, 4]);
    }

    #[test]
    fn a_full_reversal_keeps_one_child_in_place() {
        let diff = diff_children(&[1, 2, 3, 4, 5], &[5, 4, 3, 2, 1]);
        assert_eq!(diff.removes.len(), 4);
        assert_eq!(diff.inserts.len(), 4);
        assert_eq!(apply(&[1, 2, 3, 4, 5], &diff), vec![5, 4, 3, 2, 1]);
    }

    #[test]
    fn replacement_and_mixed_edits_are_minimal() {
        let diff = diff_children(&[1, 2, 3], &[4, 5, 6]);
        assert_eq!(diff.removes.len(), 3);
        assert_eq!(diff.inserts.len(), 3);
        // 2 is dropped, 5 is new, 3 moves ahead of 1.
        let old = [1, 2, 3, 4];
        let new = [3, 1, 5, 4];
        let diff = diff_children(&old, &new);
        assert_eq!(apply(&old, &diff), new);
        assert_eq!(diff.removes.len(), 2, "2 is removed and one of 1/3 moves");
        assert_eq!(diff.inserts.len(), 2, "5 is new and one of 1/3 moves");
    }

    #[test]
    fn random_edits_apply_to_exactly_the_new_list() {
        let mut random = Random(PROPERTY_TEST_SEED);
        for case in 0..PROPERTY_TEST_CASES {
            let old = sample(&mut random);
            // Derive the new list from the old one half the time, so shared prefixes, suffixes and
            // long common subsequences are common; otherwise draw it independently.
            let new = if random.below(2) == 0 {
                let mut list: Vec<u32> = old
                    .iter()
                    .copied()
                    .filter(|_| random.below(4) != 0)
                    .collect();
                for tag in sample(&mut random) {
                    if !list.contains(&tag) && random.below(3) == 0 {
                        let position = random.below(u32::try_from(list.len() + 1).expect("small"));
                        list.insert(position as usize, tag);
                    }
                }
                if random.below(3) == 0 {
                    random.shuffle(&mut list);
                }
                list
            } else {
                sample(&mut random)
            };
            let diff = diff_children(&old, &new);
            assert_eq!(apply(&old, &diff), new, "case {case}: {old:?} -> {new:?}");
            // Every removal is a dropped child or a moved one (removed and inserted), and every
            // insertion is a new child or a moved one; nothing that stays in place is touched.
            for (_, tag) in &diff.removes {
                assert!(
                    !new.contains(tag) || diff.inserts.iter().any(|(_, inserted)| inserted == tag),
                    "case {case}: {tag} removed without leaving or moving"
                );
            }
            for (_, tag) in &diff.inserts {
                assert!(
                    !old.contains(tag) || diff.removes.iter().any(|(_, removed)| removed == tag),
                    "case {case}: {tag} inserted although it was already in place"
                );
            }
            assert_eq!(
                diff.removes.len() as isize - diff.inserts.len() as isize,
                old.len() as isize - new.len() as isize,
                "case {case}: length bookkeeping"
            );
        }
    }

    #[test]
    fn longest_increasing_subsequence_matches_a_known_answer() {
        assert_eq!(longest_increasing_subsequence(&[]), Vec::<usize>::new());
        assert_eq!(longest_increasing_subsequence(&[5]), vec![0]);
        let values = [3, 1, 2, 5, 4, 6];
        let result = longest_increasing_subsequence(&values);
        assert_eq!(result.len(), 4);
        assert!(
            result
                .windows(2)
                .all(|pair| values[pair[0]] < values[pair[1]])
        );
        assert_eq!(longest_increasing_subsequence(&[4, 3, 2, 1]).len(), 1);
    }
}
