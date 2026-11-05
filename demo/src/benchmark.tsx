import { Text, View } from 'godot-react-ui';

export interface BenchmarkProps {
  /** Number of direct, keyed fixture cells. The total native node count is larger. */
  count: number;
  text: boolean;
  phase: number;
  mode: 'paint' | 'layout' | 'text';
}

const GRID_COLUMNS = 10;
const GRID_GAP = 4;
const CELL_PADDING = 4;
const BASE_CELL_HEIGHT = 28;
const LAYOUT_HEIGHT_DELTA = 8;
const TEXT_CELL_MIN_HEIGHT = 48;
const UPDATE_PHASE_COUNT = 2;
const BASE_COLOR = '#e0e7ff';
const UPDATED_COLOR = '#d1fae5';

/**
 * Synthetic, deliberately uniform fixture rather than a representative app.
 * Every cell is mounted through React and remains part of native layout. The
 * native viewport clips cells below the fold; no fixture cell is virtualized.
 * Each update targets all requested cells, retaining their keys and ownership.
 * `text` mode changes actual shaped copy; paint changes no layout property.
 */
export function BenchmarkApp({ count, text, phase, mode }: BenchmarkProps) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Benchmark count must be a nonnegative safe integer');
  if (!Number.isSafeInteger(phase) || phase < 0) throw new Error('Benchmark phase must be a nonnegative safe integer');
  if (mode === 'text' && !text) throw new Error('Text benchmark updates require text cells');
  const alternate = phase % UPDATE_PHASE_COUNT === 1;
  const backgroundColor = mode === 'paint' && alternate ? UPDATED_COLOR : BASE_COLOR;
  const height = BASE_CELL_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0);

  return (
    <View testID="bench-root" className="w-full bg-slate-50 p-4 gap-3 shrink-0">
      <Text testID="bench-status" className="text-sm text-slate-700">
        Benchmark fixture · {count} cells · {text ? 'shaped text' : 'plain boxes'} · {mode}
      </Text>
      <View testID="bench-grid" style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: GRID_GAP, flexShrink: 0 }}>
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            testID={`bench-cell-${index}`}
            style={{
              backgroundColor,
              padding: CELL_PADDING,
              flexShrink: 0,
              ...(text ? { minHeight: TEXT_CELL_MIN_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0) } : { height }),
            }}
          >
            {text && (
              <Text className="text-xs text-slate-700">
                {mode === 'text' && alternate ? `Updated cell ${index}: native text wraps across its available width.` : `Cell ${index}: native text.`}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
