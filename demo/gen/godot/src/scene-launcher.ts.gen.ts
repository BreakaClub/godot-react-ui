import SceneLauncher from "../../../src/scene-launcher";
declare module "godot" {
    interface ResourceTypes {
        "res://src/scene-launcher.ts": SceneLauncher;
    }
}
