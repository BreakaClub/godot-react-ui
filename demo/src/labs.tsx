import type { ReactElement } from 'react';
import { DragLab } from './drag-lab';
import { FormsLab } from './forms-lab';
import { HidpiLab } from './hidpi-lab';
import { InputsLab } from './inputs-lab';
import { KeyboardLab } from './keyboard-lab';
import { PassthroughHud } from './passthrough-hud';
import { PointerLab } from './pointer-lab';
import { PositioningLab } from './positioning-lab';
import { ScrollLab } from './scroll-lab';
import { SelectionLab } from './selection-lab';

/**
 * Pages the demo owner can render in place of the app (`godotReactDemo.showLab(name)`), for the
 * verifiers. They are separate from the Interaction tab, whose body has a fixed height, so a new section there
 * would push the others out of the window.
 */
export type LabName = 'hud' | 'pointers' | 'keyboard' | 'positioning' | 'inputs' | 'scroll' | 'selection' | 'drag' | 'forms' | 'hidpi';

export function labElement(name: LabName): ReactElement {
  switch (name) {
    case 'hud': return <PassthroughHud />;
    case 'pointers': return <PointerLab />;
    case 'keyboard': return <KeyboardLab />;
    case 'positioning': return <PositioningLab />;
    case 'inputs': return <InputsLab />;
    case 'scroll': return <ScrollLab />;
    case 'selection': return <SelectionLab />;
    case 'drag': return <DragLab />;
    case 'forms': return <FormsLab />;
    case 'hidpi': return <HidpiLab />;
  }
}
