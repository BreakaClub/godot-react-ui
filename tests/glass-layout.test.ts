import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { GlassLab } from '../demo/src/glass-lab';
import { PAGE_PADDING, glassLayout } from '../demo/src/glass-data';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

// The glass lab lays its cards out from the root's width (`useRootSize`). Native refuses a style whose width is negative or not finite
// (`width: dimension must be a finite nonnegative number`, native/props.rs `Dimension::value`), which in the browser failed a whole
// verifier run once: the commit is rejected and the lab keeps the layout of the width before. CSS has no negative width either.

/** The dimensions a style sets as plain numbers, whatever layer sets them: native's validator takes each of these as a length. */
const LENGTH_KEYS = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'] as const;

function numericLengths(props: Record<string, unknown>): Array<{ key: string; value: number }> {
  const style = props.style;
  if (typeof style !== 'object' || style === null || !('layers' in style) || !Array.isArray(style.layers)) return [];
  const found: Array<{ key: string; value: number }> = [];
  for (const layer of style.layers as unknown[]) {
    if (typeof layer !== 'object' || layer === null || !('style' in layer) || typeof layer.style !== 'object' || layer.style === null) continue;
    const spec: Record<string, unknown> = Object.fromEntries(Object.entries(layer.style));
    for (const key of LENGTH_KEYS) {
      const value = spec[key];
      if (typeof value === 'number') found.push({ key, value });
    }
  }
  return found;
}

test('a root narrower than the page padding leaves the cards no room, never a negative width', () => {
  for (const width of [0, 1, PAGE_PADDING, 2 * PAGE_PADDING - 1, 2 * PAGE_PADDING]) {
    const { cardWidth } = glassLayout(width);
    assert.ok(Number.isFinite(cardWidth) && cardWidth >= 0, `a ${width} px root gave a card width of ${cardWidth}`);
  }
  assert.equal(glassLayout(2 * PAGE_PADDING - 1).cardWidth, 0, 'a root that cannot hold the padding gives zero');
});

test('the glass lab sends only valid lengths at every root width, including one narrower than its padding', () => {
  const host = new TextInputHost();
  host.resize(1120, 800);
  const { root } = createTestRoot(host);
  root.render(h(GlassLab));
  const widthsSeen: number[] = [];
  // Narrower and narrower, then back: each resize is a re-render of the mounted lab, as in the page, and a rejected commit throws.
  for (const width of [1120, 600, 200, 31, 20, 0, 600, 1120]) {
    host.resize(width, 800);
    root.dispatchEvents();
    for (const [tag, node] of host.nodes) {
      for (const { key, value } of numericLengths(node.props)) {
        assert.ok(Number.isFinite(value) && value >= 0, `node ${tag} (${String(node.props.testID ?? node.kind)}) has ${key} ${value} in a ${width} px root`);
      }
    }
    const card = root.findByTestID('glass-card-0');
    assert.ok(card, 'the first card is mounted');
    const cardProps = host.nodes.get(card.id)?.props;
    assert.ok(cardProps, 'the first card is in the host');
    const cardWidth = numericLengths(cardProps).find(({ key }) => key === 'width');
    assert.ok(cardWidth, 'the first card has a numeric width');
    widthsSeen.push(cardWidth.value);
  }
  assert.deepEqual(widthsSeen.slice(0, 2), [352, 276], 'the cards follow the root while it is wide enough (three columns, then two)');
  assert.equal(widthsSeen[4], 0, 'a 20 px root gives the cards no width');
  assert.deepEqual(widthsSeen.slice(-2), [276, 352], 'and they return with the root');
  root.unmount();
});
