export interface Frame { x: number; y: number; width: number; height: number }
export interface AxNode {
  role?: string; subrole?: string; roleDescription?: string; title?: string; description?: string; value?: unknown;
  valueDescription?: string; help?: string; enabled?: boolean; focused?: boolean; selected?: boolean;
  expanded?: boolean; minValue?: unknown; maxValue?: unknown; orientation?: string; frame?: Frame; children?: AxNode[];
  /** A scroll area only: what the adapter exposes of it, and its scroll bars (described without their children). */
  attributeNames?: string[]; verticalScrollBar?: AxNode; horizontalScrollBar?: AxNode;
  /** The actions the element advertises, by name (this tool never performs one). */
  actionNames?: string[];
}
export type FlatNode = AxNode & { ancestors: AxNode[] };
export function flatten(root: AxNode): FlatNode[];
export function labelOf(node: AxNode): string;
export function findByLabel(nodes: FlatNode[], label: string, roles?: readonly string[]): FlatNode[];
export function mentions(nodes: FlatNode[], text: string): boolean;
export function fitFrames(pairs: Array<{ snapshot: Frame; frame: Frame }>): {
  scale: number; offsetX: number; offsetY: number; residual: number;
};
export function containsFrame(outer: Frame, inner: Frame, slack: number): boolean;
