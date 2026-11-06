import WorldMain from "../../src/world-main";
declare module "godot" {
    interface ResourceTypes {
        "res://world.tscn": PackedScene<WorldMain>;
    }
}
