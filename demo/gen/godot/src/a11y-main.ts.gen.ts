import A11yMain from "../../../src/a11y-main";
declare module "godot" {
    interface ResourceTypes {
        "res://src/a11y-main.ts": A11yMain;
    }
}
