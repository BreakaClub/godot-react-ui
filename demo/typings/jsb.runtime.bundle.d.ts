declare module "godot.lib.api" {
    import type * as Godot from "godot";
    import type * as GodotJsb from "godot-jsb";
    function proxyUnwrapValue<T>(value: T): T;
    function proxyWrapValue<T>(value: T): T;
    function arrayProxy<T extends any[]>(arr: T): T;
    function objectProxy<T extends object>(obj: T, remapProperties?: boolean): T;
    function key_only_proxy<T extends object | ((...args: any[]) => any)>(target: T): any;
    function instanceProxy<T extends object>(targetInstance: T): T;
    function classProxy<T extends object>(targetClass: T): T;
    function function_proxy<T extends (...args: any[]) => any>(fn: T): T;
    function enumProxy<T extends object>(targetEnum: T): T;
    const proxy: {
        array_proxy: typeof arrayProxy;
        class_proxy: typeof classProxy;
        enum_proxy: typeof enumProxy;
        function_proxy: typeof function_proxy;
        instance_proxy: typeof instanceProxy;
        key_only_proxy: typeof key_only_proxy;
        object_proxy: typeof objectProxy;
        proxy_unwrap_value: typeof proxyUnwrapValue;
        proxy_wrap_value: typeof proxyWrapValue;
    };
    type GodotLibApi = typeof Godot & {
        jsb: typeof GodotJsb;
        proxy: typeof proxy;
    };
    const api: GodotLibApi;
    /**
     * This is a starting point for writing GodotJS code that is camel-case binding agnostic at runtime.
     *
     * Library code must consume this API rather than "godot", and be built with camel case bindings disabled. This is to
     * ensure that the library will function at runtime for all projects irrespective of whether they have camel-case
     * bindings enabled.
     */
    export = api;
}
declare module "godot.annotations" {
    import type * as Godot from "godot";
    import type { ClassBinder, RpcConfig } from "godot.annotations";
    type VariantConstructor = abstract new (...args: any[]) => NonNullable<Godot.GAny> | Number | String | Boolean;
    type GObjectConstructor = abstract new (...args: any[]) => Godot.GObject;
    type ClassSpecifier = VariantConstructor | Symbol | EnumPlaceholder | TypePairPlaceholder;
    export enum HotReload {
        Recreate = 0,
        Prototype = 1
    }
    interface EnumPlaceholder {
        target: Record<string, string | number>;
    }
    interface TypePairPlaceholder {
        key: VariantConstructor;
        value: VariantConstructor;
    }
    export function EnumType(type: Record<string, string | number>): EnumPlaceholder;
    export function TypePair(key: VariantConstructor, value: VariantConstructor): TypePairPlaceholder;
    /** @deprecated Use createClassBinder() instead. */
    export function signal(): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportSignal: typeof signal;
    /** @deprecated Use createClassBinder() instead. */
    export function exportMultiline(): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportMultiline: typeof exportMultiline;
    /** @deprecated Use createClassBinder() instead. */
    export function exportRange(min: number, max: number, step?: number, ...extraHints: string[]): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportRange: typeof exportRange;
    /** @deprecated Use createClassBinder() instead. */
    export function exportRangeI(min: number, max: number, step?: number, ...extraHints: string[]): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportIntRange: typeof exportRangeI;
    /** String as a path to a file, custom filter provided as hint. */
    /** @deprecated Use createClassBinder() instead. */
    export function exportFile(filter: string): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportFile: typeof exportFile;
    /** @deprecated Use createClassBinder() instead. */
    export function exportDir(filter: string): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export function exportGlobalFile(filter: string): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportGlobalFile: typeof exportGlobalFile;
    /** @deprecated Use createClassBinder() instead. */
    export function exportGlobalDir(filter: string): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportGlobalDir: typeof exportGlobalDir;
    /** @deprecated Use createClassBinder() instead. */
    export function exportExpEasing(hint?: "" | "attenuation" | "positive_only" | "attenuation,positive_only"): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportExpEasing: typeof exportExpEasing;
    /**
     * A Shortcut for `export_(Variant.Type.TYPE_ARRAY, { class_: clazz })`
     */
    /** @deprecated Use createClassBinder() instead. */
    export function exportArray(clazz: ClassSpecifier): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportArray: typeof exportArray;
    /**
     * A Shortcut for exporting a dictionary { class_: [key_class, value_class] })`
     */
    /** @deprecated Use createClassBinder() instead. */
    export function exportDictionary(keyClass: VariantConstructor, valueClass: VariantConstructor): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportDictionary: typeof exportDictionary;
    /** @deprecated Use createClassBinder() instead. */
    export function exportObject(clazz: GObjectConstructor): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportObject: typeof exportObject;
    /**
     * [low level export]
     * @deprecated Use createClassBinder() instead.
     * */
    export function export_(type: Godot.Variant.Type, details?: {
        class_?: ClassSpecifier;
        hint?: Godot.PropertyHint;
        hintString?: string;
        usage?: Godot.PropertyUsageFlags;
    }): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export function Export(type: Godot.Variant.Type, details?: {
        class?: ClassSpecifier;
        hint?: Godot.PropertyHint;
        hintString?: string;
        usage?: Godot.PropertyUsageFlags;
    }): (target: any, name: string) => void;
    /**
     * In Godot, class members can be exported.
     * This means their value gets saved along with the resource (such as the scene) they're attached to.
     * They will also be available for editing in the property editor.
     * Exporting is done by using the `@export_var` (or `@export_`) annotation.
     */
    /** @deprecated Use createClassBinder() instead. */
    export function exportVar(type: Godot.Variant.Type, details?: {
        class_?: ClassSpecifier;
        hint?: Godot.PropertyHint;
        hintString?: string;
        usage?: Godot.PropertyUsageFlags;
    }): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportVar: typeof exportVar;
    /**
     * NOTE only int value enums are allowed
     */
    /** @deprecated Use createClassBinder() instead. */
    export function exportEnum(enumType: Record<string, string | number>): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportEnum: typeof exportEnum;
    /**
     * NOTE only int value enums are allowed
     */
    /** @deprecated Use createClassBinder() instead. */
    export function exportFlags(enumType: Record<string, string | number>): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const ExportFlags: typeof exportFlags;
    /** @deprecated Use createClassBinder() instead. */
    export function rpc(config?: RpcConfig): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Rpc: typeof rpc;
    /**
     * auto initialized on ready (before _ready called)
     *
     * @deprecated Use createClassBinder() instead.
     */
    export function onready(evaluator: string): (target: any, name: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const OnReady: typeof onready;
    /** @deprecated Use createClassBinder() instead. */
    export function tool(): (target: any, name: undefined) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Tool: typeof tool;
    /** @deprecated Use createClassBinder() instead. */
    export function icon(path: string): (target: any, name: undefined) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Icon: typeof icon;
    /** @deprecated Use createClassBinder() instead. */
    export function hotReload(policy: HotReload): (target: any, name: undefined) => void;
    /** @deprecated Use createClassBinder() instead. */
    export function deprecated(message?: string): (target: any, name?: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Deprecated: typeof deprecated;
    /** @deprecated Use createClassBinder() instead. */
    export function experimental(message?: string): (target: any, name?: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Experimental: typeof experimental;
    /** @deprecated Use createClassBinder() instead. */
    export function help(message?: string): (target: any, name?: string) => void;
    /** @deprecated Use createClassBinder() instead. */
    export const Help: typeof help;
    export type ClassMemberDecorator<RestrictedContext extends ClassMemberDecoratorContext = ClassMemberDecoratorContext> = <Context extends RestrictedContext>(target: ClassMemberDecoratorTarget<Context>, context: Context) => void | ClassMemberDecoratorReturn<Context>;
    export type ClassMemberDecoratorTarget<Context extends ClassMemberDecoratorContext> = Context extends ClassMethodDecoratorContext<infer _, infer Value> ? (...args: unknown[]) => Value : Context extends ClassGetterDecoratorContext<infer _, infer Value> ? () => Value : Context extends ClassSetterDecoratorContext<infer _, infer Value> ? (value: Value) => void : Context extends ClassFieldDecoratorContext ? undefined : Context extends ClassAccessorDecoratorContext<infer _, infer Value> ? {
        get: () => Value;
        set: (value: Value) => void;
    } : never;
    export type ClassMemberDecoratorReturn<Context extends ClassMemberDecoratorContext> = Context extends ClassMethodDecoratorContext<infer This, infer Value> ? (this: This, ...args: unknown[]) => Value : Context extends ClassGetterDecoratorContext<infer This, infer Value> ? (this: This) => Value : Context extends ClassSetterDecoratorContext<infer This, infer Value> ? (this: This, value: Value) => void : Context extends ClassFieldDecoratorContext<infer This, infer Value> ? (this: This, initialValue: Value) => Value : Context extends ClassAccessorDecoratorContext<infer This, infer Value> ? {
        get?(this: This): Value;
        set?(this: This, value: Value): void;
        init?(this: This, initialValue: Value): Value;
    } : never;
    export type ClassDecorator<This extends abstract new (...args: any) => any = abstract new (...args: any) => any> = (target: This, context: ClassDecoratorContext<This>) => void;
    export type ClassDecoratorClass<Context extends ClassDecoratorContext> = Context extends ClassDecoratorContext<infer Class> ? Class : never;
    export type Decorator<RestrictedContext extends DecoratorContext = DecoratorContext> = RestrictedContext extends ClassDecoratorContext ? <Context extends RestrictedContext>(target: ClassDecoratorClass<Context>, context: Context) => void : RestrictedContext extends ClassMemberDecoratorContext ? <Context extends RestrictedContext>(target: ClassMemberDecoratorTarget<Context>, context: Context) => void | ClassMemberDecoratorReturn<Context> : never;
    export type AnyDecorator = (value: unknown, context: DecoratorContext) => unknown;
    export type ClassValueMemberDecoratorContext<This = unknown, Value = unknown> = ClassGetterDecoratorContext<This, Value> | ClassSetterDecoratorContext<This, Value> | ClassFieldDecoratorContext<This, Value> | ClassAccessorDecoratorContext<This, Value>;
    export function createClassBinder(): ClassBinder;
}
declare module "godot.typeloader" {
    /**
     * @param type the loaded type or function in godot module
     */
    export type TypeLoadedCallback = (type: any) => void;
    export function onTypeLoaded(typeName: string | string[], callback: TypeLoadedCallback): void;
}
declare module "jsb.core" { }
declare module "jsb.inject" { }
