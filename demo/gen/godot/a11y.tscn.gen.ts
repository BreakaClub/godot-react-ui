import A11yMain from "../../src/a11y-main";
declare module "godot" {
    interface ResourceTypes {
        "res://a11y.tscn": PackedScene<A11yMain>;
    }
}
