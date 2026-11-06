import TextLayoutProbeMain from "../../src/text-layout-probe";
declare module "godot" {
    interface ResourceTypes {
        "res://text-layout-probe.tscn": PackedScene<TextLayoutProbeMain>;
    }
}
