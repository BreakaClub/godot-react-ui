import { Component, createElement, type ComponentType, type ReactNode } from 'react';
import { Text, View } from 'godot-react-ui';

/**
 * What the live editor mounts: an error boundary around the edited component. A render that throws after an edit does not take the
 * page down: the boundary reports the error to the session, which puts the last version that worked back (`LiveSession.update`).
 */

interface BoundaryProps {
  /** Changing this clears an error the boundary holds and renders the children again. */
  readonly epoch: number;
  readonly onRenderError: (error: Error) => void;
  readonly children?: ReactNode;
}

interface BoundaryState {
  readonly error: Error | null;
  readonly epoch: number;
}

export const LIVE_ERROR_TEST_ID = 'live-compile-error';

export class LiveBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null, epoch: this.props.epoch };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.epoch === state.epoch ? null : { error: null, epoch: props.epoch };
  }

  override componentDidCatch(error: Error): void {
    this.props.onRenderError(error);
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <View testID={LIVE_ERROR_TEST_ID} className="p-3 bg-red-50 gap-1">
        <Text className="text-sm text-red-700">The component threw while rendering</Text>
        <Text className="text-xs text-red-700">{this.state.error.message}</Text>
      </View>
    );
  }
}

/** The element a session renders: the edited component inside the boundary. */
export function liveTree(entry: ComponentType, epoch: number, onRenderError: (error: Error) => void): ReactNode {
  return createElement(LiveBoundary, { epoch, onRenderError }, createElement(entry));
}
