import { useLayoutEffect, useRef, useState } from 'react';
import { Portal, Text, View, useRootSize, type UIHandle } from 'godot-react-ui';
import type { LayoutRect } from '../../../../src/native';
import { placePopover } from '../../../../src/kit/popover-position';
import { CODE_TEXT_CLASS } from './grid-probe';

/** What the tooltip over a word says: the problems at it and its type. */
export interface TooltipLine {
  readonly kind: 'error' | 'warning' | 'type';
  readonly text: string;
}

const TOOLTIP_GAP_PX = 4;
const TOOLTIP_PADDING_PX = 8;
const KIND_COLORS = { error: '#fca5a5', warning: '#fde68a', type: '#e2e8f0' } as const;

export interface HoverTooltipProps {
  /** The word the tooltip is for, in root-local pixels. */
  readonly anchor: LayoutRect;
  readonly lines: readonly TooltipLine[];
}

interface Placed {
  readonly left: number;
  readonly top: number;
  readonly maxHeight: number;
}

/**
 * A tooltip in the overlay layer, above or below the word as the root's size allows (`placePopover`). It is laid out once at the
 * origin to be measured and placed in the same turn, before anything is drawn.
 */
export function HoverTooltip({ anchor, lines }: HoverTooltipProps) {
  const viewport = useRootSize();
  const box = useRef<UIHandle | null>(null);
  const [placed, setPlaced] = useState<Placed | undefined>(undefined);
  useLayoutEffect(() => {
    const rect = box.current?.getRect();
    if (rect === undefined) throw new Error('The hover tooltip is not mounted when it is placed');
    const scroll = box.current?.getScrollState();
    const height = scroll === undefined ? rect.height : rect.height - scroll.clientHeight + scroll.scrollHeight;
    const next = placePopover({ anchor, content: { width: rect.width, height }, viewport, gap: TOOLTIP_GAP_PX, padding: TOOLTIP_PADDING_PX });
    setPlaced(current => (current !== undefined && current.left === next.left && current.top === next.top && current.maxHeight === next.maxHeight ? current : next));
  });
  return (
    <Portal>
      <View
        ref={box}
        testID="code-hover"
        role="tooltip"
        className="fixed z-50 max-w-[420px] gap-1 overflow-y-auto rounded-md border border-slate-600 bg-slate-800 px-2 py-1 pointer-events-none"
        style={{ left: placed?.left ?? 0, top: placed?.top ?? 0, ...(placed === undefined ? { opacity: 0 } : { maxHeight: placed.maxHeight }) }}
      >
        {lines.map((line, index) => (
          <Text key={index} testID={`code-hover-${line.kind}`} className={`${CODE_TEXT_CLASS} whitespace-pre-wrap`} style={{ color: KIND_COLORS[line.kind] }}>
            {line.text}
          </Text>
        ))}
      </View>
    </Portal>
  );
}
