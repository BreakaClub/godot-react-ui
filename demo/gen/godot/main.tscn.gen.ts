import Main from "../../src/main";
declare module "godot" {
    interface ResourceTypes {
        "res://main.tscn": PackedScene<Main>;
    }
}
