declare module "godot.annotations" {
    import * as Godot from "godot";
    import * as GodotJsb from "godot-jsb";
    type ClassBinder = (() => 
            ((
                target: GObjectConstructor, 
                context: ClassDecoratorContext
            ) => void))
        & {
            tool: () => 
                ((
                    target: GObjectConstructor, 
                    _context: ClassDecoratorContext
                ) => void);
            icon: (path: string) => 
                ((
                    target: GObjectConstructor, 
                    _context: ClassDecoratorContext
                ) => void);
            hotReload: (policy: HotReload) => 
                ((
                    target: GObjectConstructor, 
                    _context: ClassDecoratorContext
                ) => void);
            export: ((
                    type: Godot.Variant.Type, 
                    options?: ExportOptions
                ) => ClassMemberDecorator)
                & {
                    multiline: () => ClassMemberDecorator;
                    range: (
                        min: number, 
                        max: number, 
                        step: number, 
                        ...extra_hints: string[]
                    ) => ClassMemberDecorator;
                    rangeInt: (
                        min: number, 
                        max: number, 
                        step: number, 
                        ...extra_hints: string[]
                    ) => ClassMemberDecorator;
                    file: (filter: string) => ClassMemberDecorator;
                    dir: (filter: string) => ClassMemberDecorator;
                    globalFile: (filter: string) => ClassMemberDecorator;
                    globalDir: (filter: string) => ClassMemberDecorator;
                    expEasing: (
                        hint?: ""
                            | "attenuation"
                            | "positive_only"
                            | "attenuation,positive_only"
                    ) => ClassMemberDecorator;
                    array: (clazz: ClassSpecifier) => ClassMemberDecorator;
                    dictionary: (
                        key_class: VariantConstructor, 
                        value_class: VariantConstructor
                    ) => ClassMemberDecorator;
                    object: <
                    Constructor extends GObjectConstructor>(clazz: Constructor
                    ) => 
                        ClassMemberDecorator<
                            ClassValueMemberDecoratorContext<
                                unknown,
                                null
                                    | InstanceType<Constructor>
                            >
                        >;
                    "enum": (
                        enum_type: Record<
                            string,
                            string
                                | number
                        >
                    ) => ClassMemberDecorator;
                    flags: (
                        enum_type: Record<
                            string,
                            string
                                | number
                        >
                    ) => ClassMemberDecorator;
                    cache: () => 
                        ClassMemberDecorator<
                            ClassAccessorDecoratorContext<Godot.GObject>
                                | ClassSetterDecoratorContext<Godot.GObject>
                        >;
                };
            signal: () => 
                (<
                Context extends ClassAccessorDecoratorContext<
                        Godot.GObject,
                        Godot.Signal
                    >
                    | ClassGetterDecoratorContext<
                        Godot.GObject,
                        Godot.Signal
                    >
                    | ClassFieldDecoratorContext<
                        Godot.GObject,
                        Godot.Signal
                    >>(
                    _target: unknown, 
                    context: Context
                ) => ClassMemberDecoratorReturn<Context>);
            rpc: (config?: RpcConfig) => 
                ((
                    _target: Function, 
                    context: string
                        | ClassMethodDecoratorContext
                ) => void);
            onready: (
                evaluator: string
                    | GodotJsb.internal.OnReadyEvaluatorFunc
            ) => 
                ((
                    _target: undefined, 
                    context: string
                        | ClassMethodDecoratorContext
                ) => void);
            deprecated: (message?: string) => 
                Decorator<
                    ClassDecoratorContext<GObjectConstructor>
                        | ClassValueMemberDecoratorContext<GObjectConstructor>
                >;
            experimental: (message?: string) => 
                Decorator<
                    ClassDecoratorContext<GObjectConstructor>
                        | ClassValueMemberDecoratorContext<GObjectConstructor>
                >;
            help: (message?: string) => 
                Decorator<
                    ClassDecoratorContext<GObjectConstructor>
                        | ClassValueMemberDecoratorContext<GObjectConstructor>
                >;
        }
    type ExportOptions = {
        "class"?: any;
        hint?: Godot.PropertyHint;
        hintString?: string;
        usage?: Godot.PropertyUsageFlags;
    }
    type RpcConfig = {
        mode?: Godot.MultiplayerApi.RpcMode;
        sync?: "call_remote"
            | "call_local";
        transferMode?: Godot.MultiplayerPeer.TransferMode;
        transferChannel?: number;
    }
}
