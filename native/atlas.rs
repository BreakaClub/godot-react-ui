//! Where the masks of boxes go in an atlas page (`box_draw.rs`): a shelf packer. Nothing here touches Godot.
//!
//! A page is cut into horizontal shelves, each as tall as a height class (a request's height rounded up to [`SHELF_QUANTUM`]), and a
//! request goes on the first shelf of its class with a free span wide enough, else on a new shelf above the others. Freed spans are
//! merged with their free neighbours, and the shelves at the top that are wholly free are given back, so a page whose masks are all
//! gone is empty again. The masks of a tree are few and alike (one for each corner radius, border and scale, stretched to every box of
//! that shape), so shelves of a class fill and empty together and the page does not fragment much.

/// Shelf heights are multiples of this many texels: requests a few texels apart in height share a shelf.
const SHELF_QUANTUM: u32 = 8;

/// A rectangle of a page, in texels.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Region {
    pub(crate) x: u32,
    pub(crate) y: u32,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

/// One row of the page.
struct Shelf {
    y: u32,
    height: u32,
    /// The free spans `(x, width)`, by `x`, none touching another.
    free: Vec<(u32, u32)>,
}

impl Shelf {
    fn is_free(&self, page_width: u32) -> bool {
        self.free == [(0, page_width)]
    }
}

pub(crate) struct ShelfPacker {
    width: u32,
    height: u32,
    /// From the bottom of the page up: each starts where the one before ends.
    shelves: Vec<Shelf>,
}

impl ShelfPacker {
    pub(crate) fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            shelves: Vec::new(),
        }
    }

    /// Where a `width` x `height` rectangle can go, or `None` when the page has no room for it.
    pub(crate) fn allocate(&mut self, width: u32, height: u32) -> Option<Region> {
        if width == 0 || height == 0 || width > self.width {
            return None;
        }
        let class = height.div_ceil(SHELF_QUANTUM) * SHELF_QUANTUM;
        for shelf in self.shelves.iter_mut().filter(|shelf| shelf.height == class) {
            if let Some(index) = shelf.free.iter().position(|(_, span)| *span >= width) {
                let (x, span) = shelf.free[index];
                if span == width {
                    shelf.free.remove(index);
                } else {
                    shelf.free[index] = (x + width, span - width);
                }
                return Some(Region {
                    x,
                    y: shelf.y,
                    width,
                    height,
                });
            }
        }
        let top = self.shelves.last().map_or(0, |shelf| shelf.y + shelf.height);
        if top + class > self.height {
            return None;
        }
        let mut free = Vec::new();
        if width < self.width {
            free.push((width, self.width - width));
        }
        self.shelves.push(Shelf {
            y: top,
            height: class,
            free,
        });
        Some(Region {
            x: 0,
            y: top,
            width,
            height,
        })
    }

    /// Give back a region [`Self::allocate`] returned.
    pub(crate) fn free(&mut self, region: Region) {
        let Some(shelf) = self.shelves.iter_mut().find(|shelf| shelf.y == region.y) else {
            panic!("the region {region:?} is not on a shelf of this page");
        };
        let at = shelf.free.partition_point(|(x, _)| *x < region.x);
        shelf.free.insert(at, (region.x, region.width));
        // Merge with the span after, then with the one before.
        if at + 1 < shelf.free.len() && shelf.free[at].0 + shelf.free[at].1 == shelf.free[at + 1].0 {
            shelf.free[at].1 += shelf.free[at + 1].1;
            shelf.free.remove(at + 1);
        }
        if at > 0 && shelf.free[at - 1].0 + shelf.free[at - 1].1 == shelf.free[at].0 {
            shelf.free[at - 1].1 += shelf.free[at].1;
            shelf.free.remove(at);
        }
        while self.shelves.last().is_some_and(|shelf| shelf.is_free(self.width)) {
            self.shelves.pop();
        }
    }

    /// Whether nothing is allocated on the page.
    pub(crate) fn is_empty(&self) -> bool {
        self.shelves.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requests_of_a_height_class_share_a_shelf_and_others_open_their_own() {
        let mut page = ShelfPacker::new(100, 100);
        let a = page.allocate(30, 10).unwrap();
        let b = page.allocate(30, 14).unwrap();
        assert_eq!((a.x, a.y, b.x, b.y), (0, 0, 30, 0), "10 and 14 are both in the class of 16");
        let c = page.allocate(30, 20).unwrap();
        assert_eq!((c.x, c.y), (0, 16), "20 is in the class of 24: a shelf of its own above");
        assert_eq!((c.width, c.height), (30, 20), "a region is the size asked for");
    }

    #[test]
    fn a_full_page_refuses_and_a_freed_span_is_used_again() {
        let mut page = ShelfPacker::new(64, 16);
        let a = page.allocate(32, 16).unwrap();
        let b = page.allocate(32, 16).unwrap();
        assert_eq!(page.allocate(1, 1), None, "no room on the shelf and none above it");
        assert_eq!(page.allocate(65, 1), None, "wider than the page");
        page.free(a);
        assert_eq!(page.allocate(20, 9).unwrap(), Region { x: 0, y: 0, width: 20, height: 9 });
        page.free(b);
        assert_eq!(page.allocate(44, 16).unwrap().x, 20, "the freed spans merged into one");
    }

    #[test]
    fn a_page_whose_regions_are_all_freed_is_empty() {
        let mut page = ShelfPacker::new(64, 64);
        let regions: Vec<Region> = [(10, 8), (20, 8), (10, 30), (64, 3)]
            .into_iter()
            .map(|(width, height)| page.allocate(width, height).unwrap())
            .collect();
        assert!(!page.is_empty());
        // In an order that frees a lower shelf before the ones above it.
        for index in [0, 2, 1, 3] {
            page.free(regions[index]);
        }
        assert!(page.is_empty());
        assert_eq!(page.allocate(64, 64).unwrap().y, 0, "the whole page is free again");
    }
}
