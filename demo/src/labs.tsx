import type { ReactElement } from 'react';
import { KeyboardLab } from './keyboard-lab';
import { PassthroughHud } from './passthrough-hud';
import { PointerLab } from './pointer-lab';
import { PositioningLab } from './positioning-lab';

/**
 * Pages the demo owner can render in place of the app (`godotReactDemo.showLab(name)`), for the
 * verifiers. They are separate from the Interaction tab, which has a fixed height and no scrolling
 * until Phase I5, so a new section there would push the others out of the window.
 */
export type LabName = 'hud' | 'pointers' | 'keyboard' | 'positioning';

export function labElement(name: LabName): ReactElement {
  switch (name) {
    case 'hud': return <PassthroughHud />;
    case 'pointers': return <PointerLab />;
    case 'keyboard': return <KeyboardLab />;
    case 'positioning': return <PositioningLab />;
  }
}
