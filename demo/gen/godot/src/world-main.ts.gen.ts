import WorldMain from "../../../src/world-main";
declare module "godot" {
    interface ResourceTypes {
        "res://src/world-main.ts": WorldMain;
    }
}
