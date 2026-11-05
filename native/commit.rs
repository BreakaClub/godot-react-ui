//! The commit payload, its validation and the plan it becomes (plan sections 3.4 and 3.7).
//!
//! One commit per layer carries only what changed: the nodes created, the prop diffs of mounted
//! nodes, and the child lists that changed. [`validate`] decides, from the payload and a read-only
//! view of the mounted tree, whether the whole payload can be applied; it never changes anything.
//! [`plan`] turns a validated payload into the [`MountingTransaction`] the mounting layer applies.
//! Nothing here touches Godot.

use std::collections::{BTreeMap, BTreeSet};

use serde::Deserialize;

use crate::diff::{Create, Insertion, MountingTransaction, Parent, Removal, Update, diff_children};
use crate::props::{Kind, PropsDiff, PropsSpec};

/// Layer 0 is the main tree and layer 1 the overlay tree for `<Portal>`.
pub const LAYER_COUNT: usize = 2;

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommitPayload {
    /// Nodes new to this root, with their full props.
    #[serde(default)]
    pub created: Vec<CreatedNode>,
    /// Mounted nodes whose props changed, as diffs.
    #[serde(default)]
    pub updated: Vec<UpdatedNode>,
    /// Every node whose child list changed, and every created node that has children. Tag 0 is the
    /// layer's own top-level list.
    #[serde(default)]
    pub children: Vec<ChildList>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreatedNode {
    pub tag: u32,
    pub kind: Kind,
    #[serde(default)]
    pub props: PropsSpec,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdatedNode {
    pub tag: u32,
    pub props: PropsDiff,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ChildList {
    pub tag: u32,
    pub children: Vec<u32>,
}

/// A payload that cannot be applied. Nothing has changed when this is returned.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommitError(pub String);

impl std::fmt::Display for CommitError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

fn reject<T>(message: impl Into<String>) -> Result<T, CommitError> {
    Err(CommitError(message.into()))
}

/// Read-only access to the mounted tree that validation and planning need.
pub trait MountedTree {
    fn kind(&self, tag: u32) -> Option<Kind>;
    fn layer(&self, tag: u32) -> Option<usize>;
    /// A mounted node's parent; `None` if `tag` is not mounted.
    fn parent(&self, tag: u32) -> Option<Parent>;
    /// The children of a node or layer; empty for anything not mounted.
    fn children(&self, parent: Parent) -> &[u32];
    fn props(&self, tag: u32) -> Option<&PropsSpec>;
    /// Whether the root ever created `tag`, including nodes since deleted: tags are never reused.
    fn was_created(&self, tag: u32) -> bool;
}

/// A payload that passed [`validate`]: props merged and checked, child lists final.
#[derive(Debug)]
pub struct ValidatedCommit {
    pub layer: usize,
    pub created: Vec<Create>,
    /// Mounted nodes with their new, merged props.
    pub updated: Vec<Update>,
    /// The final child list of every parent the payload rewrites.
    pub lists: Vec<(Parent, Vec<u32>)>,
}

/// The tree as the payload would leave it, enough to answer "who is whose parent" and "is this
/// node still attached" before anything is mounted.
struct AfterCommit<'a, M: MountedTree> {
    mounted: &'a M,
    layer: usize,
    lists: &'a BTreeMap<Parent, Vec<u32>>,
    new_parent: &'a BTreeMap<u32, Parent>,
}

impl<M: MountedTree> AfterCommit<'_, M> {
    fn parent_of(&self, tag: u32) -> Option<Parent> {
        if let Some(parent) = self.new_parent.get(&tag) {
            return Some(*parent);
        }
        // Not listed by any rewritten list. A rewritten old parent that no longer lists it has
        // dropped it; an untouched old parent still holds it.
        let old = self.mounted.parent(tag)?;
        if self.lists.contains_key(&old) {
            None
        } else {
            Some(old)
        }
    }

    /// The layer whose root `tag` is attached to after the commit, or `None` if it is detached.
    fn attached_layer(&self, tag: u32) -> Result<Option<usize>, CommitError> {
        let mut seen = BTreeSet::new();
        let mut current = tag;
        loop {
            if !seen.insert(current) {
                return reject(format!("node {current} would become its own ancestor"));
            }
            match self.parent_of(current) {
                None => return Ok(None),
                Some(Parent::Layer(layer)) => return Ok(Some(layer)),
                Some(Parent::Node(parent)) => current = parent,
            }
        }
    }

    fn attached_to_layer(&self, tag: u32) -> Result<bool, CommitError> {
        Ok(self.attached_layer(tag)? == Some(self.layer))
    }
}

/// The kind of `tag` if it is created by this commit or mounted in `layer`.
fn kind_in_layer<M: MountedTree>(
    created: &BTreeMap<u32, (Kind, PropsSpec)>,
    mounted: &M,
    layer: usize,
    tag: u32,
) -> Option<Kind> {
    match created.get(&tag) {
        Some((kind, _)) => Some(*kind),
        None => mounted
            .kind(tag)
            .filter(|_| mounted.layer(tag) == Some(layer)),
    }
}

/// Decide whether `payload` can be applied to `layer` of the mounted tree, and compute the final
/// props and child lists. Checks, before anything changes:
///
/// - created tags are nonzero, unused for the root's lifetime and unique;
/// - updated tags are mounted in this layer (or created by this payload) and appear once;
/// - child lists name mounted-or-created nodes of this layer, each at most once, and only
///   `View` and `Button` nodes have children;
/// - every node ends up with at most one parent and no node is its own ancestor;
/// - every created node ends up attached, and no rewritten list belongs to a node that is detached;
/// - every merged prop set is valid for its node's kind.
pub fn validate<M: MountedTree>(
    payload: &CommitPayload,
    layer: usize,
    mounted: &M,
) -> Result<ValidatedCommit, CommitError> {
    if layer >= LAYER_COUNT {
        return reject(format!(
            "layer {layer} does not exist; layers are 0..{LAYER_COUNT}"
        ));
    }

    let mut created: BTreeMap<u32, (Kind, PropsSpec)> = BTreeMap::new();
    let mut created_order = Vec::with_capacity(payload.created.len());
    for node in &payload.created {
        if node.tag == 0 {
            return reject("tag 0 is the layer root and cannot be created");
        }
        if mounted.was_created(node.tag) || created.contains_key(&node.tag) {
            return reject(format!("tag {} has already been used", node.tag));
        }
        node.props
            .validate(node.kind)
            .map_err(|error| CommitError(format!("created node {}: {error}", node.tag)))?;
        created.insert(node.tag, (node.kind, node.props.clone()));
        created_order.push(node.tag);
    }

    let mut updated_tags = BTreeSet::new();
    let mut updated = Vec::new();
    for node in &payload.updated {
        if node.tag == 0 {
            return reject("tag 0 is the layer root and has no props");
        }
        if !updated_tags.insert(node.tag) {
            return reject(format!("node {} is updated more than once", node.tag));
        }
        if let Some((kind, props)) = created.get_mut(&node.tag) {
            let merged = props.with_diff(&node.props);
            merged
                .validate(*kind)
                .map_err(|error| CommitError(format!("node {}: {error}", node.tag)))?;
            *props = merged;
            continue;
        }
        let Some(kind) = kind_in_layer(&created, mounted, layer, node.tag) else {
            return reject(format!("node {} is not mounted in layer {layer}", node.tag));
        };
        let Some(previous) = mounted.props(node.tag) else {
            return reject(format!("node {} is not mounted", node.tag));
        };
        let merged = previous.with_diff(&node.props);
        merged
            .validate(kind)
            .map_err(|error| CommitError(format!("node {}: {error}", node.tag)))?;
        updated.push(Update {
            tag: node.tag,
            props: merged,
        });
    }

    let mut lists: BTreeMap<Parent, Vec<u32>> = BTreeMap::new();
    let mut list_order = Vec::with_capacity(payload.children.len());
    for entry in &payload.children {
        let parent = if entry.tag == 0 {
            Parent::Layer(layer)
        } else {
            let Some(kind) = kind_in_layer(&created, mounted, layer, entry.tag) else {
                return reject(format!(
                    "child list for node {}, which is not mounted in layer {layer}",
                    entry.tag
                ));
            };
            if !kind.allows_children() && !entry.children.is_empty() {
                return reject(format!("{kind:?} node {} cannot have children", entry.tag));
            }
            Parent::Node(entry.tag)
        };
        if lists.contains_key(&parent) {
            return reject(format!(
                "node {} has more than one child list in this commit",
                entry.tag
            ));
        }
        let mut seen = BTreeSet::new();
        for child in &entry.children {
            if *child == 0 {
                return reject("the layer root cannot be a child");
            }
            if kind_in_layer(&created, mounted, layer, *child).is_none() {
                return reject(format!(
                    "child {child} of node {} is not mounted in layer {layer} or created here",
                    entry.tag
                ));
            }
            if !seen.insert(*child) {
                return reject(format!(
                    "child {child} occurs more than once under node {}",
                    entry.tag
                ));
            }
        }
        lists.insert(parent, entry.children.clone());
        list_order.push(parent);
    }

    let mut new_parent: BTreeMap<u32, Parent> = BTreeMap::new();
    for (parent, list) in &lists {
        for child in list {
            if new_parent.insert(*child, *parent).is_some() {
                return reject(format!("node {child} is listed under two parents"));
            }
        }
    }

    let after = AfterCommit {
        mounted,
        layer,
        lists: &lists,
        new_parent: &new_parent,
    };
    for (child, parent) in &new_parent {
        // Walking up from every re-parented node finds cycles, including ones through nodes that
        // moved in the same commit.
        after.attached_layer(*child)?;
        if let Some(old) = mounted.parent(*child)
            && old != *parent
            && !lists.contains_key(&old)
        {
            // The old parent's list is not being rewritten, so it still lists this child. That is
            // only harmless if the old parent is itself leaving the tree.
            let old_attached = match old {
                Parent::Layer(_) => true,
                Parent::Node(node) => after.attached_layer(node)?.is_some(),
            };
            if old_attached {
                return reject(format!(
                    "node {child} would have two parents ({old:?} still lists it)"
                ));
            }
        }
    }
    for tag in &created_order {
        if !after.attached_to_layer(*tag)? {
            return reject(format!(
                "created node {tag} is not attached to layer {layer}"
            ));
        }
    }
    for parent in &list_order {
        if let Parent::Node(tag) = parent
            && !after.attached_to_layer(*tag)?
        {
            return reject(format!(
                "child list for node {tag}, which is detached by this commit"
            ));
        }
    }

    let created = created_order
        .into_iter()
        .map(|tag| {
            let (kind, props) = created.remove(&tag).expect("created tag recorded above");
            Create { tag, kind, props }
        })
        .collect();
    let lists = list_order
        .into_iter()
        .map(|parent| {
            let list = lists.remove(&parent).expect("list recorded above");
            (parent, list)
        })
        .collect();
    Ok(ValidatedCommit {
        layer,
        created,
        updated,
        lists,
    })
}

/// Turn a validated commit into the transaction the mounting layer applies. Each rewritten list is
/// diffed against the mounted children; a removed child that is not re-inserted anywhere in the
/// commit is deleted together with the mounted descendants still under it.
pub fn plan<M: MountedTree>(validated: &ValidatedCommit, mounted: &M) -> MountingTransaction {
    let mut transaction = MountingTransaction {
        creates: validated.created.clone(),
        updates: validated.updated.clone(),
        ..MountingTransaction::default()
    };
    let rewritten: BTreeMap<Parent, &Vec<u32>> = validated
        .lists
        .iter()
        .map(|(parent, list)| (*parent, list))
        .collect();

    for (parent, list) in &validated.lists {
        let diff = diff_children(mounted.children(*parent), list);
        for (index, tag) in diff.removes {
            transaction.removes.push(Removal {
                parent: *parent,
                tag,
                index,
            });
        }
        for (index, tag) in diff.inserts {
            transaction.inserts.push(Insertion {
                parent: *parent,
                tag,
                index,
            });
        }
    }

    let reinserted: BTreeSet<u32> = transaction.inserts.iter().map(|i| i.tag).collect();

    // A mounted node moving out of a parent whose list is not rewritten can only be leaving a
    // parent that is itself being deleted. Detach it explicitly so the mounting layer never has a
    // node with two parents, even for an instant.
    for tag in &reinserted {
        let Some(old) = mounted.parent(*tag) else {
            continue;
        };
        if rewritten.contains_key(&old) {
            continue;
        }
        let index = mounted
            .children(old)
            .iter()
            .position(|child| child == tag)
            .expect("a mounted node is listed by its parent");
        transaction.removes.push(Removal {
            parent: old,
            tag: *tag,
            index,
        });
    }
    // Per parent, higher indices first, so each removal leaves the lower indices valid.
    transaction
        .removes
        .sort_by(|a, b| a.parent.cmp(&b.parent).then(b.index.cmp(&a.index)));

    let mut deleted = BTreeSet::new();
    for removal in &transaction.removes {
        if reinserted.contains(&removal.tag) {
            continue;
        }
        collect_deleted(
            removal.tag,
            mounted,
            &reinserted,
            &mut deleted,
            &mut transaction.deletes,
        );
    }
    transaction
}

/// Post-order walk of the mounted subtree under `tag`, skipping children that move elsewhere.
fn collect_deleted<M: MountedTree>(
    tag: u32,
    mounted: &M,
    reinserted: &BTreeSet<u32>,
    seen: &mut BTreeSet<u32>,
    output: &mut Vec<u32>,
) {
    if !seen.insert(tag) {
        return;
    }
    for child in mounted.children(Parent::Node(tag)) {
        if !reinserted.contains(child) {
            collect_deleted(*child, mounted, reinserted, seen, output);
        }
    }
    output.push(tag);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::diff::random::Random;

    const PROPERTY_TEST_CASES: usize = 500;
    const PROPERTY_TEST_SEED: u64 = 0xc0ff_ee00_7ac5_0002;
    const MAX_OLD_NODES: u32 = 12;
    const MAX_NEW_NODES: u32 = 6;

    /// A plain mounted tree for validation and planning tests, with the same transaction
    /// semantics the mounting layer implements.
    #[derive(Clone, Debug, Default, PartialEq)]
    struct TestTree {
        nodes: BTreeMap<u32, TestNode>,
        roots: [Vec<u32>; LAYER_COUNT],
        used: BTreeSet<u32>,
    }

    #[derive(Clone, Debug, PartialEq)]
    struct TestNode {
        kind: Kind,
        layer: usize,
        parent: Option<Parent>,
        children: Vec<u32>,
        props: PropsSpec,
    }

    impl MountedTree for TestTree {
        fn kind(&self, tag: u32) -> Option<Kind> {
            self.nodes.get(&tag).map(|node| node.kind)
        }
        fn layer(&self, tag: u32) -> Option<usize> {
            self.nodes.get(&tag).map(|node| node.layer)
        }
        fn parent(&self, tag: u32) -> Option<Parent> {
            self.nodes.get(&tag).and_then(|node| node.parent)
        }
        fn children(&self, parent: Parent) -> &[u32] {
            match parent {
                Parent::Layer(layer) => &self.roots[layer],
                Parent::Node(tag) => self.nodes.get(&tag).map_or(&[], |node| &node.children),
            }
        }
        fn props(&self, tag: u32) -> Option<&PropsSpec> {
            self.nodes.get(&tag).map(|node| &node.props)
        }
        fn was_created(&self, tag: u32) -> bool {
            self.used.contains(&tag)
        }
    }

    impl TestTree {
        fn mount(&mut self, layer: usize, parent: Parent, tag: u32, kind: Kind) {
            self.used.insert(tag);
            self.nodes.insert(
                tag,
                TestNode {
                    kind,
                    layer,
                    parent: Some(parent),
                    children: Vec::new(),
                    props: PropsSpec::default(),
                },
            );
            match parent {
                Parent::Layer(layer) => self.roots[layer].push(tag),
                Parent::Node(parent) => self
                    .nodes
                    .get_mut(&parent)
                    .expect("fixture parent exists")
                    .children
                    .push(tag),
            }
        }

        /// `layer 0 > 1 > (2, 3)`, with 2 a button and 3 a text.
        fn sample() -> Self {
            let mut tree = TestTree::default();
            tree.mount(0, Parent::Layer(0), 1, Kind::View);
            tree.mount(0, Parent::Node(1), 2, Kind::Button);
            tree.mount(0, Parent::Node(1), 3, Kind::Text);
            tree
        }

        /// Apply a transaction in the documented order. This is the reference semantics the
        /// mounting layer must match.
        fn apply(&mut self, layer: usize, transaction: &MountingTransaction) {
            for removal in &transaction.removes {
                let list = match removal.parent {
                    Parent::Layer(layer) => &mut self.roots[layer],
                    Parent::Node(tag) => {
                        &mut self
                            .nodes
                            .get_mut(&tag)
                            .expect("removal parent exists")
                            .children
                    }
                };
                assert_eq!(list.remove(removal.index), removal.tag, "removal index");
                if let Some(node) = self.nodes.get_mut(&removal.tag) {
                    node.parent = None;
                }
            }
            for tag in &transaction.deletes {
                assert!(
                    self.nodes.remove(tag).is_some(),
                    "deleted node {tag} existed"
                );
            }
            for create in &transaction.creates {
                self.used.insert(create.tag);
                self.nodes.insert(
                    create.tag,
                    TestNode {
                        kind: create.kind,
                        layer,
                        parent: None,
                        children: Vec::new(),
                        props: create.props.clone(),
                    },
                );
            }
            for update in &transaction.updates {
                self.nodes
                    .get_mut(&update.tag)
                    .expect("updated node exists")
                    .props = update.props.clone();
            }
            for insertion in &transaction.inserts {
                match insertion.parent {
                    Parent::Layer(layer) => {
                        self.roots[layer].insert(insertion.index, insertion.tag)
                    }
                    Parent::Node(tag) => self
                        .nodes
                        .get_mut(&tag)
                        .expect("insertion parent exists")
                        .children
                        .insert(insertion.index, insertion.tag),
                }
                self.nodes
                    .get_mut(&insertion.tag)
                    .expect("inserted node exists")
                    .parent = Some(insertion.parent);
            }
        }
    }

    fn payload(json: &str) -> CommitPayload {
        serde_json::from_str(json).expect("test payload must parse")
    }

    fn commit(tree: &mut TestTree, json: &str) -> Result<MountingTransaction, CommitError> {
        let validated = validate(&payload(json), 0, tree)?;
        let transaction = plan(&validated, tree);
        tree.apply(0, &transaction);
        Ok(transaction)
    }

    /// A rejected commit must leave the tree exactly as it was, and say why.
    fn assert_rejected(json: &str, expected: &str) {
        let tree = TestTree::sample();
        let snapshot = tree.clone();
        let error = validate(&payload(json), 0, &tree).expect_err(json);
        assert!(error.0.contains(expected), "{json}: got {error}");
        assert_eq!(tree, snapshot, "{json}: validation changed the tree");
    }

    /// The commits the JS walk produced for `tests/commit.test.ts` (fixture
    /// `tests/fixtures/commit-payloads.json`) must parse and apply here, in order, to the tree they
    /// describe.
    #[test]
    fn the_js_commit_walks_payloads_parse_validate_and_apply() {
        let payloads: Vec<CommitPayload> =
            serde_json::from_str(include_str!("../tests/fixtures/commit-payloads.json"))
                .expect("the fixture parses with deny_unknown_fields");
        assert_eq!(payloads.len(), 2);
        let mut tree = TestTree::default();
        let first = validate(&payloads[0], 0, &tree).expect("the first commit validates");
        tree.apply(0, &plan(&first, &tree));
        assert_eq!(tree.roots[0], vec![1]);
        assert_eq!(tree.nodes[&1].children, vec![2, 3]);
        assert_eq!(tree.nodes[&3].children, vec![4]);
        assert_eq!(tree.nodes[&3].kind, Kind::Button);
        assert_eq!(tree.nodes[&3].props.disabled, Some(true));
        assert_eq!(tree.nodes[&2].props.test_id.as_deref(), Some("title"));
        assert_eq!(tree.nodes[&2].props.text.as_deref(), Some("Title"));

        let second = validate(&payloads[1], 0, &tree).expect("the second commit validates");
        tree.apply(0, &plan(&second, &tree));
        assert_eq!(tree.nodes[&1].children, vec![2, 3, 5]);
        assert_eq!(tree.nodes[&2].props.text.as_deref(), Some("Renamed"));
        assert_eq!(tree.nodes[&2].props.test_id, None, "the testID reset to its default");
        assert_eq!(tree.nodes[&3].props.disabled, None);
        assert_eq!(tree.nodes[&3].props.hidden, Some(true));
    }

    #[test]
    fn payload_parsing_rejects_unknown_keys_and_missing_fields() {
        for json in [
            r#"{"made":[]}"#,
            r#"{"created":[{"tag":9,"kind":"view","extra":1}]}"#,
            r#"{"created":[{"tag":9}]}"#,
            r#"{"created":[{"tag":9,"kind":"banana"}]}"#,
            r#"{"updated":[{"tag":2}]}"#,
            r#"{"updated":[{"tag":2,"props":{"imaginary":1}}]}"#,
            r#"{"children":[{"tag":1}]}"#,
            r#"{"children":[{"tag":-1,"children":[]}]}"#,
        ] {
            assert!(
                serde_json::from_str::<CommitPayload>(json).is_err(),
                "{json}"
            );
        }
        let empty: CommitPayload = serde_json::from_str("{}").unwrap();
        assert!(empty.created.is_empty() && empty.updated.is_empty() && empty.children.is_empty());
    }

    #[test]
    fn creating_nodes_and_attaching_them_in_one_commit() {
        let mut tree = TestTree::default();
        let transaction = commit(
            &mut tree,
            r##"{
                "created":[
                    {"tag":1,"kind":"view","props":{"style":{"layers":[{"style":{"width":10}}]}}},
                    {"tag":2,"kind":"text","props":{"text":"hi","testID":"label"}}
                ],
                "children":[{"tag":0,"children":[1]},{"tag":1,"children":[2]}]
            }"##,
        )
        .unwrap();
        assert_eq!(transaction.creates.len(), 2);
        assert_eq!(tree.roots[0], vec![1]);
        assert_eq!(tree.nodes[&1].children, vec![2]);
        assert_eq!(tree.nodes[&2].parent, Some(Parent::Node(1)));
        assert_eq!(tree.nodes[&2].props.text.as_deref(), Some("hi"));
        assert_eq!(tree.nodes[&2].props.test_id.as_deref(), Some("label"));
    }

    #[test]
    fn an_empty_commit_changes_nothing() {
        let mut tree = TestTree::sample();
        let before = tree.clone();
        let transaction = commit(&mut tree, "{}").unwrap();
        assert_eq!(transaction, MountingTransaction::default());
        assert_eq!(tree, before);
    }

    #[test]
    fn updates_merge_diffs_over_mounted_props() {
        let mut tree = TestTree::sample();
        commit(
            &mut tree,
            r#"{"updated":[{"tag":3,"props":{"text":"one","disabled":true}}]}"#,
        )
        .unwrap();
        commit(
            &mut tree,
            r#"{"updated":[{"tag":3,"props":{"text":"two","disabled":null}}]}"#,
        )
        .unwrap();
        let props = &tree.nodes[&3].props;
        assert_eq!(props.text.as_deref(), Some("two"));
        assert_eq!(props.disabled, None);
    }

    #[test]
    fn an_update_of_a_node_created_in_the_same_commit_applies_to_its_props() {
        let mut tree = TestTree::default();
        commit(
            &mut tree,
            r#"{
                "created":[{"tag":1,"kind":"text","props":{"text":"a"}}],
                "updated":[{"tag":1,"props":{"text":"b"}}],
                "children":[{"tag":0,"children":[1]}]
            }"#,
        )
        .unwrap();
        assert_eq!(tree.nodes[&1].props.text.as_deref(), Some("b"));
    }

    #[test]
    fn rejects_new_tag_violations() {
        assert_rejected(
            r#"{"created":[{"tag":2,"kind":"view"}],"children":[{"tag":0,"children":[1,2]}]}"#,
            "tag 2 has already been used",
        );
        assert_rejected(
            r#"{"created":[{"tag":0,"kind":"view"}]}"#,
            "tag 0 is the layer root",
        );
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"},{"tag":9,"kind":"view"}],
                "children":[{"tag":0,"children":[1,9]}]}"#,
            "tag 9 has already been used",
        );
        // A tag deleted earlier is still used: tags are never recycled.
        let mut tree = TestTree::sample();
        commit(&mut tree, r#"{"children":[{"tag":0,"children":[]}]}"#).unwrap();
        assert!(tree.nodes.is_empty());
        let error = validate(
            &payload(
                r#"{"created":[{"tag":1,"kind":"view"}],"children":[{"tag":0,"children":[1]}]}"#,
            ),
            0,
            &tree,
        )
        .unwrap_err();
        assert!(error.0.contains("already been used"), "{error}");
    }

    #[test]
    fn rejects_updates_to_unknown_or_repeated_nodes() {
        assert_rejected(
            r#"{"updated":[{"tag":99,"props":{}}]}"#,
            "node 99 is not mounted",
        );
        assert_rejected(
            r#"{"updated":[{"tag":0,"props":{}}]}"#,
            "tag 0 is the layer root",
        );
        assert_rejected(
            r#"{"updated":[{"tag":3,"props":{"text":"a"}},{"tag":3,"props":{"text":"b"}}]}"#,
            "updated more than once",
        );
    }

    #[test]
    fn a_node_cannot_change_kind() {
        // The only way to ask for a different kind is to create the tag again.
        assert_rejected(
            r#"{"created":[{"tag":2,"kind":"view"}],"children":[{"tag":1,"children":[2,3]}]}"#,
            "tag 2 has already been used",
        );
    }

    #[test]
    fn rejects_children_that_do_not_exist_or_repeat() {
        assert_rejected(r#"{"children":[{"tag":1,"children":[2,99]}]}"#, "child 99");
        assert_rejected(
            r#"{"children":[{"tag":1,"children":[2,2,3]}]}"#,
            "child 2 occurs more than once",
        );
        assert_rejected(
            r#"{"children":[{"tag":99,"children":[]}]}"#,
            "child list for node 99",
        );
        assert_rejected(
            r#"{"children":[{"tag":0,"children":[0]}]}"#,
            "layer root cannot be a child",
        );
        assert_rejected(
            r#"{"children":[{"tag":1,"children":[2,3]},{"tag":1,"children":[3,2]}]}"#,
            "more than one child list",
        );
    }

    #[test]
    fn rejects_children_of_text_nodes() {
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"}],
                "children":[{"tag":3,"children":[9]},{"tag":1,"children":[2,3]},{"tag":0,"children":[1]}]}"#,
            "cannot have children",
        );
        // An empty list for a text node is harmless.
        let mut tree = TestTree::sample();
        commit(&mut tree, r#"{"children":[{"tag":3,"children":[]}]}"#).unwrap();
    }

    #[test]
    fn rejects_a_node_with_two_parents() {
        // 2 is listed under the layer root while view 1 (untouched) still lists it.
        assert_rejected(
            r#"{"children":[{"tag":0,"children":[1,2]}]}"#,
            "two parents",
        );
        // Listed twice in one commit.
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"}],
                "children":[{"tag":0,"children":[1,9]},{"tag":9,"children":[2]},{"tag":1,"children":[2,3]}]}"#,
            "listed under two parents",
        );
    }

    #[test]
    fn a_move_between_parents_in_one_commit_is_not_a_deletion() {
        let mut tree = TestTree::sample();
        let transaction = commit(
            &mut tree,
            r#"{"created":[{"tag":9,"kind":"view"}],
                "children":[{"tag":0,"children":[1,9]},{"tag":1,"children":[3]},{"tag":9,"children":[2]}]}"#,
        )
        .unwrap();
        assert_eq!(transaction.deletes, Vec::<u32>::new());
        assert_eq!(tree.nodes[&2].parent, Some(Parent::Node(9)));
        assert_eq!(tree.nodes[&1].children, vec![3]);
        assert_eq!(tree.roots[0], vec![1, 9]);
        // The node never listed twice, and removals precede inserts.
        assert_eq!(
            transaction.removes,
            vec![Removal {
                parent: Parent::Node(1),
                tag: 2,
                index: 0
            }]
        );
    }

    #[test]
    fn rejects_cycles() {
        assert_rejected(
            r#"{"children":[{"tag":0,"children":[]},{"tag":2,"children":[1]}]}"#,
            "own ancestor",
        );
        // 1 under 9 while 9 sits under 1.
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"}],
                "children":[{"tag":1,"children":[9,3]},{"tag":9,"children":[1]},{"tag":0,"children":[]}]}"#,
            "own ancestor",
        );
    }

    #[test]
    fn rejects_created_nodes_that_are_not_attached() {
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"}]}"#,
            "created node 9 is not attached",
        );
        // Attached only to another created node that is itself loose.
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"},{"tag":10,"kind":"view"}],
                "children":[{"tag":9,"children":[10]}]}"#,
            "is not attached",
        );
        // Attached to a mounted node that this commit detaches.
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"view"}],
                "children":[{"tag":0,"children":[]},{"tag":1,"children":[9]}]}"#,
            "created node 9 is not attached",
        );
        // A rewritten list that belongs to a node this commit detaches.
        assert_rejected(
            r#"{"children":[{"tag":0,"children":[]},{"tag":1,"children":[3,2]}]}"#,
            "child list for node 1, which is detached by this commit",
        );
    }

    #[test]
    fn rejects_invalid_prop_diffs_without_changing_the_tree() {
        assert_rejected(
            r#"{"updated":[{"tag":3,"props":{"style":{"layers":[{"style":{"opacity":4}}]}}}]}"#,
            "opacity",
        );
        assert_rejected(
            r#"{"updated":[{"tag":1,"props":{"text":"views have no text"}}]}"#,
            "text is only valid",
        );
        assert_rejected(
            r#"{"created":[{"tag":9,"kind":"button","props":{"text":"x"}}],
                "children":[{"tag":0,"children":[1,9]}]}"#,
            "text is only valid",
        );
    }

    #[test]
    fn a_rejected_commit_leaves_the_mounted_tree_untouched_even_when_part_of_it_is_valid() {
        let mut tree = TestTree::sample();
        let before = tree.clone();
        let result = commit(
            &mut tree,
            r#"{"updated":[{"tag":3,"props":{"text":"valid"}}],
                "created":[{"tag":9,"kind":"view"}]}"#,
        );
        assert!(result.is_err());
        assert_eq!(tree, before);
    }

    #[test]
    fn validation_rejects_other_layers_nodes_and_unknown_layers() {
        let mut tree = TestTree::sample();
        tree.mount(1, Parent::Layer(1), 20, Kind::View);
        let error = validate(
            &payload(r#"{"updated":[{"tag":20,"props":{"disabled":true}}]}"#),
            0,
            &tree,
        )
        .unwrap_err();
        assert!(error.0.contains("not mounted in layer 0"), "{error}");
        let error = validate(
            &payload(r#"{"children":[{"tag":0,"children":[20]}]}"#),
            0,
            &tree,
        )
        .unwrap_err();
        assert!(error.0.contains("child 20"), "{error}");
        assert!(validate(&payload("{}"), LAYER_COUNT, &tree).is_err());
        // The overlay layer commits independently of the main layer.
        let validated = validate(
            &payload(r#"{"updated":[{"tag":20,"props":{"disabled":true}}]}"#),
            1,
            &tree,
        )
        .unwrap();
        assert_eq!(validated.updated.len(), 1);
    }

    #[test]
    fn deleting_a_subtree_removes_it_once_and_deletes_every_descendant() {
        let mut tree = TestTree::sample();
        let transaction = commit(&mut tree, r#"{"children":[{"tag":0,"children":[]}]}"#).unwrap();
        assert_eq!(
            transaction.removes,
            vec![Removal {
                parent: Parent::Layer(0),
                tag: 1,
                index: 0
            }]
        );
        let mut deleted = transaction.deletes.clone();
        // Descendants come before their ancestor.
        assert_eq!(deleted.pop(), Some(1));
        deleted.sort_unstable();
        assert_eq!(deleted, vec![2, 3]);
        assert!(tree.nodes.is_empty());
    }

    #[test]
    fn reordering_siblings_changes_no_nodes() {
        let mut tree = TestTree::sample();
        let transaction =
            commit(&mut tree, r#"{"children":[{"tag":1,"children":[3,2]}]}"#).unwrap();
        assert!(transaction.deletes.is_empty() && transaction.creates.is_empty());
        assert_eq!(transaction.removes.len(), 1);
        assert_eq!(transaction.inserts.len(), 1);
        assert_eq!(tree.nodes[&1].children, vec![3, 2]);
    }

    #[test]
    fn a_child_moving_out_of_a_deleted_parent_is_detached_from_it_first() {
        let mut tree = TestTree::sample();
        tree.mount(0, Parent::Layer(0), 4, Kind::View);
        // 1 is dropped while its button 2 moves under 4. 1's list is not rewritten.
        let transaction = commit(
            &mut tree,
            r#"{"children":[{"tag":0,"children":[4]},{"tag":4,"children":[2]}]}"#,
        )
        .unwrap();
        assert!(
            transaction.removes.contains(&Removal {
                parent: Parent::Node(1),
                tag: 2,
                index: 0
            }),
            "{transaction:?}"
        );
        let mut deleted = transaction.deletes.clone();
        deleted.sort_unstable();
        assert_eq!(deleted, vec![1, 3]);
        assert_eq!(tree.nodes[&2].parent, Some(Parent::Node(4)));
    }

    #[test]
    fn nodes_in_the_overlay_layer_mount_independently() {
        let mut tree = TestTree::sample();
        let validated = validate(
            &payload(
                r#"{"created":[{"tag":30,"kind":"view"}],"children":[{"tag":0,"children":[30]}]}"#,
            ),
            1,
            &tree,
        )
        .unwrap();
        let transaction = plan(&validated, &tree);
        tree.apply(1, &transaction);
        assert_eq!(tree.roots[1], vec![30]);
        assert_eq!(tree.roots[0], vec![1], "layer 0 is untouched");
        assert_eq!(tree.nodes[&30].layer, 1);
    }

    struct Case {
        tree: TestTree,
        json: String,
        /// The new child list of every surviving parent, keyed by tag (0 is the layer).
        expected: BTreeMap<u32, Vec<u32>>,
        survivors: Vec<u32>,
        dropped: BTreeSet<u32>,
    }

    /// A random mounted forest in layer 0, and a random edit of it: keep some nodes, drop others,
    /// create new ones, give every node a new random parent and a new random child order.
    fn random_case(random: &mut Random) -> Case {
        let mut tree = TestTree::default();
        let old_count = random.below(MAX_OLD_NODES + 1);
        let mut kinds = BTreeMap::new();
        for tag in 1..=old_count {
            let kind = match random.below(4) {
                0 => Kind::Text,
                1 => Kind::Button,
                _ => Kind::View,
            };
            kinds.insert(tag, kind);
            let candidates: Vec<u32> = (1..tag).filter(|c| kinds[c].allows_children()).collect();
            let parent = if candidates.is_empty() || random.below(3) == 0 {
                Parent::Layer(0)
            } else {
                Parent::Node(candidates[random.below(candidates.len() as u32) as usize])
            };
            tree.mount(0, parent, tag, kind);
        }

        let kept: Vec<u32> = (1..=old_count).filter(|_| random.below(4) != 0).collect();
        let new_count = random.below(MAX_NEW_NODES + 1);
        let created: Vec<u32> = (old_count + 1..=old_count + new_count).collect();
        for tag in &created {
            kinds.insert(
                *tag,
                if random.below(4) == 0 {
                    Kind::Text
                } else {
                    Kind::View
                },
            );
        }
        let mut order: Vec<u32> = kept.iter().chain(created.iter()).copied().collect();
        random.shuffle(&mut order);

        // Each node's new parent is the layer or an earlier node in the shuffled order, which
        // makes the result a forest by construction.
        let mut new_lists: BTreeMap<Parent, Vec<u32>> = BTreeMap::new();
        new_lists.insert(Parent::Layer(0), Vec::new());
        for tag in &order {
            new_lists.entry(Parent::Node(*tag)).or_default();
        }
        for (position, tag) in order.iter().enumerate() {
            let candidates: Vec<u32> = order[..position]
                .iter()
                .copied()
                .filter(|c| kinds[c].allows_children())
                .collect();
            let parent = if candidates.is_empty() || random.below(3) == 0 {
                Parent::Layer(0)
            } else {
                Parent::Node(candidates[random.below(candidates.len() as u32) as usize])
            };
            new_lists.get_mut(&parent).expect("list exists").push(*tag);
        }
        for list in new_lists.values_mut() {
            random.shuffle(list);
        }

        let mut entries = Vec::new();
        for (parent, list) in &new_lists {
            let (tag, old_list) = match parent {
                Parent::Layer(_) => (0, tree.roots[0].clone()),
                Parent::Node(tag) => (*tag, tree.children(Parent::Node(*tag)).to_vec()),
            };
            if *list != old_list {
                entries.push(format!(
                    r#"{{"tag":{tag},"children":{}}}"#,
                    serde_json::to_string(list).expect("tags serialize")
                ));
            }
        }
        let created_json: Vec<String> = created
            .iter()
            .map(|tag| {
                let kind = if kinds[tag] == Kind::Text {
                    "text"
                } else {
                    "view"
                };
                format!(r#"{{"tag":{tag},"kind":"{kind}"}}"#)
            })
            .collect();
        let json = format!(
            r#"{{"created":[{}],"children":[{}]}}"#,
            created_json.join(","),
            entries.join(",")
        );
        let expected: BTreeMap<u32, Vec<u32>> = new_lists
            .iter()
            .map(|(parent, list)| {
                (
                    match parent {
                        Parent::Layer(_) => 0,
                        Parent::Node(tag) => *tag,
                    },
                    list.clone(),
                )
            })
            .collect();
        let dropped: BTreeSet<u32> = (1..=old_count).filter(|t| !kept.contains(t)).collect();
        Case {
            tree,
            json,
            expected,
            survivors: order,
            dropped,
        }
    }

    #[test]
    fn random_tree_edits_plan_to_exactly_the_new_structure() {
        let mut random = Random(PROPERTY_TEST_SEED);
        let (mut with_deletes, mut with_moves, mut with_creates, mut leaving_deleted_parent) =
            (0, 0, 0, 0);
        for case in 0..PROPERTY_TEST_CASES {
            let Case {
                mut tree,
                json,
                expected,
                survivors,
                dropped,
            } = random_case(&mut random);
            let validated = validate(&payload(&json), 0, &tree)
                .unwrap_or_else(|error| panic!("case {case}: {error}\n{json}"));
            let transaction = plan(&validated, &tree);
            let before = tree.clone();
            tree.apply(0, &transaction);
            with_deletes += usize::from(!transaction.deletes.is_empty());
            with_creates += usize::from(!transaction.creates.is_empty());
            with_moves += usize::from(
                transaction
                    .inserts
                    .iter()
                    .any(|insertion| before.nodes.contains_key(&insertion.tag)),
            );
            leaving_deleted_parent += usize::from(transaction.removes.iter().any(|removal| {
                matches!(removal.parent, Parent::Node(parent) if transaction.deletes.contains(&parent))
                    && !transaction.deletes.contains(&removal.tag)
            }));

            assert_eq!(
                tree.roots[0], expected[&0],
                "case {case}: layer list\n{json}"
            );
            let live: BTreeSet<u32> = tree.nodes.keys().copied().collect();
            assert_eq!(
                live,
                survivors.iter().copied().collect::<BTreeSet<u32>>(),
                "case {case}: surviving nodes\n{json}"
            );
            for tag in &survivors {
                assert_eq!(
                    tree.nodes[tag].children, expected[tag],
                    "case {case}: children of {tag}\n{json}"
                );
                for child in &expected[tag] {
                    assert_eq!(
                        tree.nodes[child].parent,
                        Some(Parent::Node(*tag)),
                        "case {case}: parent of {child}\n{json}"
                    );
                }
            }
            for child in &expected[&0] {
                assert_eq!(
                    tree.nodes[child].parent,
                    Some(Parent::Layer(0)),
                    "case {case}"
                );
            }
            let deleted: BTreeSet<u32> = transaction.deletes.iter().copied().collect();
            assert_eq!(
                deleted.len(),
                transaction.deletes.len(),
                "case {case}: duplicates"
            );
            let expected_deleted: BTreeSet<u32> = before
                .nodes
                .keys()
                .copied()
                .filter(|tag| !survivors.contains(tag))
                .collect();
            assert!(dropped.is_subset(&expected_deleted), "case {case}");
            assert_eq!(
                deleted, expected_deleted,
                "case {case}: deleted set\n{json}"
            );
        }
        // The generator must actually exercise every kind of edit, not just pass trivially.
        let enough = PROPERTY_TEST_CASES / 10;
        assert!(with_deletes >= enough, "deleting cases: {with_deletes}");
        assert!(with_creates >= enough, "creating cases: {with_creates}");
        assert!(with_moves >= enough, "moving cases: {with_moves}");
        assert!(
            leaving_deleted_parent >= PROPERTY_TEST_CASES / 50,
            "cases moving out of a deleted parent: {leaving_deleted_parent}"
        );
    }
}
