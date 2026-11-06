import { GError, Node, OS } from 'godot';
import { createClassBinder } from 'godot.annotations';

const bind = createClassBinder();
const SCENE_ARGUMENT = '--scene';

/** The value after `flag` among the arguments after `--`, or `undefined` when the flag is absent. */
function userArgumentAfter(flag: string): string | undefined {
  const args = OS.getCmdlineUserArgs();
  const values = Array.from({ length: args.size() }, (_, index) => args.get(index));
  const at = values.indexOf(flag);
  if (at < 0) return undefined;
  const value = values[at + 1];
  if (value === undefined) throw new Error(`${flag} needs a scene path after it`);
  return value;
}

/**
 * An autoload that starts another scene when the user arguments say `--scene res://some.tscn`
 * (`godot --path demo -- --scene res://world.tscn`, or `?scene=res://world.tscn` on the Web page).
 *
 * Breaka's Web engine is built without command-line path overrides, so a scene path in the engine arguments
 * aborts it; user arguments after `--` are the one thing the page can still pass. Autoloads are added
 * before the project's main scene, so the main scene is current when the first frame runs and is replaced
 * there. Without the argument this does nothing.
 */
@bind()
export default class SceneLauncher extends Node {
  private readonly scene = userArgumentAfter(SCENE_ARGUMENT);

  override _process(): void {
    // One shot: the first frame, after the main scene has been added.
    this.setProcess(false);
    if (this.scene === undefined) return;
    const result = this.getTree()?.changeSceneToFile(this.scene);
    if (result !== GError.Ok) throw new Error(`Cannot start ${this.scene}: error ${String(result)}`);
  }
}
