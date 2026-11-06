import { Control, Image, Node, OS, ReactUiTextLayoutProbe } from 'godot';
import { createClassBinder } from 'godot.annotations';
import { runTextLayoutVerification } from './verify-text-layout';

// The probe class exists only in probe builds (`pnpm build:native --probe`), so it is declared here
// instead of in the generated typings: a default `gen:types` must not describe classes a default build
// does not contain. The names are camel-cased by GodotJS (`runtime/core/camel_case_bindings_enabled`).
declare module 'godot' {
  class ReactUiTextLayoutProbe extends Control {
    caseCount(): number;
    caseName(index: number): string;
    /** Draws a case, with the geometry over the text or without. False if there is no such case. */
    showCase(index: number, overlays: boolean): boolean;
    /** Every geometry check, as the JSON text of `{ checks: [...] }`. */
    verify(): string;
    /** The draw-parity check of the case being shown without overlays, against the viewport's image. */
    checkInk(image: Image): string;
  }
}

const bind = createClassBinder();
const VERIFY_ARGUMENT = '--verify-text-layout';

/**
 * Owns the text layout probe (docs/tracks/text-layout.md): a Control that draws a paragraph in left,
 * centre and right alignment with the geometry `native/text_layout.rs` computes drawn over it. The probe
 * takes no input. With `-- --verify-text-layout` the scene runs the verification and quits.
 */
@bind()
export default class TextLayoutProbeMain extends Node {
  override _ready(): void {
    // A default build has no probe class; say what to do instead of failing on `new`.
    if (ReactUiTextLayoutProbe === undefined) {
      throw new Error('The text layout probe needs a probe build of the extension: pnpm build:native --probe');
    }
    const probe = new ReactUiTextLayoutProbe();
    probe.setName('Probe');
    probe.setAnchorsPreset(Control.LayoutPreset.PresetFullRect);
    this.addChild(probe);
    Object.assign(globalThis, { godotReactTextLayout: { probe } });
    console.log('GODOT_REACT_TEXT_LAYOUT_READY');
    const args = OS.getCmdlineUserArgs();
    if (Array.from({ length: args.size() }, (_, index) => args.get(index)).includes(VERIFY_ARGUMENT)) {
      void runTextLayoutVerification(this, probe).then(() => this.getTree()?.quit()).catch(error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
        this.getTree()?.quit(1);
      });
    }
  }
}
