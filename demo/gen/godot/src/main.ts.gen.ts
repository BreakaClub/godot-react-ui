import Main from "../../../src/main";
declare module "godot" {
    interface ResourceTypes {
        "res://src/main.ts": Main;
    }
}
