
declare module "godot-jsb" {
    import {
        Callable,
        MethodFlags,
        MultiplayerApi,
        MultiplayerPeer,
        GObject as GObject,
        PackedByteArray,
        PropertyInfo,
        Signal,
        StringName,
        Variant,
    } from "godot";

    const CAMEL_CASE_BINDINGS_ENABLED: boolean;

    const DEV_ENABLED: boolean;
    const TOOLS_ENABLED: boolean;

    /** version of GodotJS */
    const version: string;

    /** impl currently used */
    const impl: string;

    /**
     * Create godot Callable without a bound object.
     * @deprecated [Warning] avoid using this function directly, use `Callable.create` instead.
     */
    function callable<F extends Function>(fn: F): Callable<F>;

    /**
     * Create godot Callable with a bound object `self`.
     * @deprecated [Warning] avoid using this function directly, use `Callable.create` instead.
     */
    function callable<S extends GObject, F extends (this: S, ...args: any[]) => any>(self: S, fn: F): Callable<F>;

    /**
     * Explicitly convert a `PackedByteArray`(aka `Vector<uint8_t>`) into a javascript `ArrayBuffer`
     * @deprecated [Warning] This free function '_to_array_buffer' is deprecated and will be removed in a future version, use 'PackedByteArray.toArrayBuffer()' instead.
     */
    function toArrayBuffer(packed: PackedByteArray): ArrayBuffer;

    /**
     * Give back, now, the reference this wrapper holds on a reference counted engine object, instead
     * of when the JavaScript collector finalizes the wrapper. The collector cannot see the engine
     * memory behind a wrapper, so one that nothing uses can keep a texture alive for minutes.
     *
     * The object lives on for as long as the engine holds it, and script handed it again by the engine
     * gets a new wrapper. `object` itself is dead afterwards: it reads as a freed object.
     *
     * Returns false if the wrapper holds nothing (it was released before, or its object is gone).
     * Throws for anything that is not an engine object, for an object that is not reference counted
     * (free it instead), and for one with a script attached.
     */
    function release(object: GObject): boolean;

    type AsyncModuleSourceLoaderResolveFunc = (source: string) => void;
    type AsyncModuleSourceLoaderRejectFunc = (error: string) => void;

    /**
     * Set a callback function to handle the load of source code of asynchronous modules.
     * Only use this function if it's not set in C++.
     */
    function setAsyncModuleLoader(
        fn: (
            moduleId: string,
            resolve: AsyncModuleSourceLoaderResolveFunc,
            reject: AsyncModuleSourceLoaderRejectFunc,
        ) => void,
    ): void;

    interface MinimalCommonJSModule {
        exports: any;
        loaded: boolean;
        id: string;
    }

    /**
     * Import a CommonJS module asynchronously.
     *
     * NOTE: Only the source code is loaded asynchronously, the module is still evaluated on the script thread.
     * NOTE: Calling the $import() function without a async module loader set in advance will return undefined.
     * @param module_id the module id to import
     * @example
     * ```js
     *   // [init.js]
     *   import * as jsb from "godot-jsb";
     *   jsb.setAsyncModuleLoader((id, resolve, reject) => {
     *       console.log("[test] async module loader start", id);
     *       // here should be the actual async loading of the module, Http request, etc.
     *       // we just simulate it with a timeout
     *       setTimeout(() => {
     *           console.log("[test] async module loader resolve", id);
     *           resolve("exports.foo = function () { console.log('hello, module imported'); }");
     *       }, 3000);
     *   });
     *   // [somescript.js]
     *   jsb.$import("http://localhost/async_loaded.js").then(mod => {
     *       console.log("[test] async module loader", mod);
     *       mod.exports.foo();
     *   });
     * ```
     */
    function $import(moduleId: string): Promise<MinimalCommonJSModule>;

    interface ScriptPropertyInfo {
        name: string;
        type: Variant.Type;
        class_?: Function;
        hint?: number;
        hint_string?: string;
        usage?: number;
        cache?: boolean;
    }

    export namespace internal {
        type OnReadyEvaluatorFunc = (self: any) => any;
        type GObjectConstructor = abstract new (...args: any[]) => GObject;

        function addScriptSignal(prototype: GObject, name: string): void;
        function addScriptProperty(prototype: GObject, details: ScriptPropertyInfo): void;
        function addScriptReady(
            prototype: GObject,
            details: {
                name: string;
                evaluator: string | OnReadyEvaluatorFunc;
            },
        ): void;
        function addScriptTool(constructor: GObjectConstructor): void;
        function addScriptIcon(constructor: GObjectConstructor, path: string): void;
        function setScriptHotReload(constructor: GObjectConstructor, policy: number): void;
        function addScriptRpc(
            prototype: GObject,
            propertyKey: string,
            config: {
                rpcMode?: MultiplayerApi.RpcMode;
                callLocal?: boolean;
                transferMode?: MultiplayerPeer.TransferMode;
                channel?: number;
            },
        ): void;

        function createScriptSignalGetter(name: string): (this: GObject) => Signal;
        function createScriptCachedPropertyUpdater(name: string): (this: GObject, value?: unknown) => void;

        // 0: deprecated, 1: experimental, 2: help
        function setScriptDoc(
            target: GObjectConstructor,
            propertyKey: undefined,
            field: 0 | 1 | 2,
            message: string,
        ): void;
        function setScriptDoc(target: GObject, propertyKey: string, field: 0 | 1 | 2, message: string): void;

        function addModule(id: string, obj: any): void;
        function findModule(id: string): any;
        function replaceModuleSource(id: string, source: string): string[];
        function notifyMicrotasksRun(): void;

        namespace names {
            /**
             * Get the transformed name of a Godot class
             */
            function getClass<T extends string>(godotClass: T): T;
            /**
             * Get the transformed name of a Godot enum
             */
            function getEnum<T extends string>(godotEnum: T): T;
            /**
             * Get the transformed name of a Godot enum
             */
            function getEnumValue<T extends string>(godotEnumValue: T): T;
            /**
             * Get the transformed name of a Godot class member
             */
            function getMember<T extends string>(godotMember: T): T;
            /**
             * Get the internal Godot name/identifier from a transformed name i.e. the inverse of the other accessors.
             */
            function getInternalMapping(name: string): string;
            /**
             * Get the transformed name of a Godot function parameter
             */
            function getParameter<T extends string>(parameter: T): T;
            /**
             * Get the transformed type name of a Variant.Type
             */
            function getVariantType<T extends string>(type: Variant.Type): StringName;
        }
    }

    namespace editor {
        interface PrimitiveConstantInfo {
            name: string;
            type: Variant.Type;
            value: number /* only if type is literal */;
        }

        interface ConstantInfo {
            name: string;
            value: number /** int64_t */;
        }

        interface EnumInfo {
            name: string;
            literals: Record<string, number>;
            is_bitfield: boolean;
        }

        interface DefaultArgumentInfo {
            type: Variant.Type;
            value: any;
        }

        // we treat godot MethodInfo/MethodBind as the same thing here for simplicity
        //NOTE some fields will not be set if it's actually a MethodInfo struct
        interface MethodBind {
            internal_name: string;
            id: number;
            name: string;

            hint_flags: MethodFlags;
            is_static: boolean;
            is_const: boolean;
            is_vararg: boolean;
            argument_count: number /** int32_t */;

            args_: Array<PropertyInfo>;
            default_arguments?: Array<DefaultArgumentInfo>;
            return_: PropertyInfo | undefined;
        }

        interface PropertySetGetInfo {
            internal_name: string;
            name: string;

            type: Variant.Type;
            index: number;
            setter: string;
            getter: string;

            info: PropertyInfo;
        }

        interface PrimitiveGetSetInfo {
            name: string;
            type: Variant.Type;
        }

        interface SignalInfo {
            internal_name: string;
            name: string;
            method_: MethodBind;
        }

        interface ArgumentInfo {
            name: string;
            type: Variant.Type;
        }

        interface ConstructorInfo {
            arguments: Array<ArgumentInfo>;
        }

        interface OperatorInfo {
            name: string;
            return_type: Variant.Type;
            left_type: Variant.Type;
            right_type: Variant.Type;
        }

        interface BasicClassInfo {
            name: string;
            methods: Array<MethodBind>;
            enums?: Array<EnumInfo>;
        }

        // godot class
        interface ClassInfo extends BasicClassInfo {
            internal_name: string;
            super: string;

            properties: Array<PropertySetGetInfo>;
            rpc_methods?: Array<MethodBind>;
            virtual_methods: Array<MethodBind>;
            signals: Array<SignalInfo>;
            constants?: Array<ConstantInfo>;
        }

        // variant class
        interface PrimitiveClassInfo extends BasicClassInfo {
            // self type
            type: Variant.Type;

            // valid only if has_indexing
            element_type?: Variant.Type;

            // true only if is_keyed
            is_keyed: boolean;

            constructors?: Array<ConstructorInfo>;
            operators?: Array<OperatorInfo>;
            properties?: Array<PrimitiveGetSetInfo>;
            constants?: Array<PrimitiveConstantInfo>;
        }

        interface SingletonInfo {
            name: string;
            class_name: string;
            user_created: boolean;
            editor_only: boolean;
        }

        interface GlobalConstantInfo {
            name: string;
            values?: { [name: string]: number /** int64_t */ };
            value?: number /** int64_t */;
        }

        interface ClassDoc {
            brief_description: string;

            constants: { [name: string]: { description: string } };
            methods: { [name: string]: { description: string } };
            properties: { [name: string]: { description: string } };
            signals: { [name: string]: { description: string } };
        }

        function getClassDoc(className: string): ClassDoc | undefined;

        /**
         * get a list of all classes registered in ClassDB
         */
        function getClasses(): Array<ClassInfo>;

        function getPrimitiveTypes(): Array<PrimitiveClassInfo>;

        function getSingletons(): Array<SingletonInfo>;

        function getGlobalConstants(): Array<GlobalConstantInfo>;

        function getUtilityFunctions(): Array<MethodBind>;

        function getInputActions(): Array<string>;

        function deleteFile(filepath: string): void;

        function installProjectFiles(force?: boolean): Promise<void>;

        function installStaticTypes(): Promise<void>;

        function generateTypes(skipStaticTypes?: boolean): Promise<void>;

        function cleanupInvalidFiles(): Promise<void>;

        const VERSION_DOCS_URL: string;
    }
}

// Globals

/** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console) */
interface Console {
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/assert_static) */
    assert(condition?: boolean, ...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/debug_static) */
    debug(...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/error_static) */
    error(...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/info_static) */
    info(...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/log_static) */
    log(...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/time_static) */
    time(label?: string): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/timeEnd_static) */
    timeEnd(label?: string): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/trace_static) */
    trace(...data: any[]): void;
    /** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/console/warn_static) */
    warn(...data: any[]): void;
}
declare const console: Console;

/** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/Window/clearInterval) */
declare function clearInterval(id: number | undefined): void;
/** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/Window/clearTimeout) */
declare function clearTimeout(id: number | undefined): void;
/** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/Window/setInterval) */
declare function setInterval(handler: () => void, timeout?: number, ...arguments: any[]): number;
/** [Mdn Reference](https://developer.mozilla.org/docs/Web/API/Window/setTimeout) */
declare function setTimeout(handler: () => void, timeout?: number, ...arguments: any[]): number;
