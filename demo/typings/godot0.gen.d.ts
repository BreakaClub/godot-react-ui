declare module "godot" {
    // AUTO-GENERATED
    type byte = number
    type int32 = number
    type int64 = number /* || bigint */
    type float32 = number
    type float64 = number
    type uint32 = number
    type StringName = string
    type unresolved = any
    type GAny = undefined | null | boolean | int64 | float64 | string | Vector2 | Vector2I | Rect2 | Rect2I | Vector3 | Vector3I | Transform2D | Vector4 | Vector4I | Plane | Quaternion | Aabb | Basis | Transform3D | Projection | Color | StringName | NodePath | Rid | GObject | Callable | Signal | GDictionary | GArray | PackedByteArray | PackedInt32Array | PackedInt64Array | PackedFloat32Array | PackedFloat64Array | PackedStringArray | PackedVector2Array | PackedVector3Array | PackedColorArray | PackedVector4Array
    type InputActionName = 
        | "ui_accept"
        | "ui_select"
        | "ui_cancel"
        | "ui_close_dialog"
        | "ui_close_dialog.macos"
        | "ui_focus_next"
        | "ui_focus_prev"
        | "ui_left"
        | "ui_right"
        | "ui_up"
        | "ui_down"
        | "ui_page_up"
        | "ui_page_down"
        | "ui_home"
        | "ui_end"
        | "ui_accessibility_drag_and_drop"
        | "ui_cut"
        | "ui_copy"
        | "ui_focus_mode"
        | "ui_paste"
        | "ui_undo"
        | "ui_redo"
        | "ui_text_completion_query"
        | "ui_text_completion_accept"
        | "ui_text_completion_replace"
        | "ui_text_newline"
        | "ui_text_newline_blank"
        | "ui_text_newline_above"
        | "ui_text_indent"
        | "ui_text_dedent"
        | "ui_text_backspace"
        | "ui_text_backspace_word"
        | "ui_text_backspace_word.macos"
        | "ui_text_backspace_all_to_left"
        | "ui_text_backspace_all_to_left.macos"
        | "ui_text_delete"
        | "ui_text_delete_word"
        | "ui_text_delete_word.macos"
        | "ui_text_delete_all_to_right"
        | "ui_text_delete_all_to_right.macos"
        | "ui_text_caret_left"
        | "ui_text_caret_word_left"
        | "ui_text_caret_word_left.macos"
        | "ui_text_caret_right"
        | "ui_text_caret_word_right"
        | "ui_text_caret_word_right.macos"
        | "ui_text_caret_up"
        | "ui_text_caret_down"
        | "ui_text_caret_line_start"
        | "ui_text_caret_line_start.macos"
        | "ui_text_caret_line_end"
        | "ui_text_caret_line_end.macos"
        | "ui_text_caret_page_up"
        | "ui_text_caret_page_down"
        | "ui_text_caret_document_start"
        | "ui_text_caret_document_start.macos"
        | "ui_text_caret_document_end"
        | "ui_text_caret_document_end.macos"
        | "ui_text_caret_add_below"
        | "ui_text_caret_add_below.macos"
        | "ui_text_caret_add_above"
        | "ui_text_caret_add_above.macos"
        | "ui_text_scroll_up"
        | "ui_text_scroll_up.macos"
        | "ui_text_scroll_down"
        | "ui_text_scroll_down.macos"
        | "ui_text_select_all"
        | "ui_text_select_word_under_caret"
        | "ui_text_select_word_under_caret.macos"
        | "ui_text_add_selection_for_next_occurrence"
        | "ui_text_skip_selection_for_next_occurrence"
        | "ui_text_clear_carets_and_selection"
        | "ui_text_toggle_insert_mode"
        | "ui_menu"
        | "ui_text_submit"
        | "ui_unicode_start"
        | "ui_graph_duplicate"
        | "ui_graph_delete"
        | "ui_graph_follow_left"
        | "ui_graph_follow_left.macos"
        | "ui_graph_follow_right"
        | "ui_graph_follow_right.macos"
        | "ui_filedialog_delete"
        | "ui_filedialog_up_one_level"
        | "ui_filedialog_refresh"
        | "ui_filedialog_show_hidden"
        | "ui_filedialog_find"
        | "ui_filedialog_focus_path"
        | "ui_filedialog_focus_path.macos"
        | "ui_swap_input_direction"
        | "ui_colorpicker_delete_preset"
        | "ui_toggle_fullscreen"
        | "ui_toggle_fullscreen.macos"
    // _singleton_class_: Performance
    namespace Performance {
        enum Monitor {
            TimeFps = 0,
            TimeProcess = 1,
            TimePhysicsProcess = 2,
            TimeNavigationProcess = 3,
            MemoryStatic = 4,
            MemoryStaticMax = 5,
            MemoryMessageBufferMax = 6,
            ObjectCount = 7,
            ObjectResourceCount = 8,
            ObjectNodeCount = 9,
            ObjectOrphanNodeCount = 10,
            RenderTotalObjectsInFrame = 11,
            RenderTotalPrimitivesInFrame = 12,
            RenderTotalDrawCallsInFrame = 13,
            RenderVideoMemUsed = 14,
            RenderTextureMemUsed = 15,
            RenderBufferMemUsed = 16,
            Physics2DActiveObjects = 17,
            Physics2DCollisionPairs = 18,
            Physics2DIslandCount = 19,
            Physics3DActiveObjects = 20,
            Physics3DCollisionPairs = 21,
            Physics3DIslandCount = 22,
            AudioOutputLatency = 23,
            NavigationActiveMaps = 24,
            NavigationRegionCount = 25,
            NavigationAgentCount = 26,
            NavigationLinkCount = 27,
            NavigationPolygonCount = 28,
            NavigationEdgeCount = 29,
            NavigationEdgeMergeCount = 30,
            NavigationEdgeConnectionCount = 31,
            NavigationEdgeFreeCount = 32,
            NavigationObstacleCount = 33,
            PipelineCompilationsCanvas = 34,
            PipelineCompilationsMesh = 35,
            PipelineCompilationsSurface = 36,
            PipelineCompilationsDraw = 37,
            PipelineCompilationsSpecialization = 38,
            Navigation2DActiveMaps = 39,
            Navigation2DRegionCount = 40,
            Navigation2DAgentCount = 41,
            Navigation2DLinkCount = 42,
            Navigation2DPolygonCount = 43,
            Navigation2DEdgeCount = 44,
            Navigation2DEdgeMergeCount = 45,
            Navigation2DEdgeConnectionCount = 46,
            Navigation2DEdgeFreeCount = 47,
            Navigation2DObstacleCount = 48,
            Navigation3DActiveMaps = 49,
            Navigation3DRegionCount = 50,
            Navigation3DAgentCount = 51,
            Navigation3DLinkCount = 52,
            Navigation3DPolygonCount = 53,
            Navigation3DEdgeCount = 54,
            Navigation3DEdgeMergeCount = 55,
            Navigation3DEdgeConnectionCount = 56,
            Navigation3DEdgeFreeCount = 57,
            Navigation3DObstacleCount = 58,
            RenderStreamingTextureMemUsed = 59,
            MonitorMax = 60,
        }
        enum MonitorType {
            MonitorTypeQuantity = 0,
            MonitorTypeMemory = 1,
            MonitorTypeTime = 2,
            MonitorTypePercentage = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPerformance extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPerformance extends __NameMapGObject {
        get_monitor: "getMonitor";
        add_custom_monitor: "addCustomMonitor";
        remove_custom_monitor: "removeCustomMonitor";
        has_custom_monitor: "hasCustomMonitor";
        get_custom_monitor: "getCustomMonitor";
        get_monitor_modification_time: "getMonitorModificationTime";
        get_custom_monitor_names: "getCustomMonitorNames";
        get_custom_monitor_types: "getCustomMonitorTypes";
    }
    /** Exposes performance-related data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_performance.html  
     */
    class Performance extends GObject {
        /** Returns the value of one of the available built-in monitors. You should provide one of the [enum Monitor] constants as the argument, like this:  
         *    
         *  See [method get_custom_monitor] to query custom performance monitors' values.  
         */
        static getMonitor(monitor: Performance.Monitor): float64
        
        /** Adds a custom monitor with the name [param id]. You can specify the category of the monitor using slash delimiters in [param id] (for example: `"Game/NumberOfNPCs"`). If there is more than one slash delimiter, then the default category is used. The default category is `"Custom"`. Prints an error if given [param id] is already present.  
         *    
         *  The debugger calls the callable to get the value of custom monitor. The callable must return a zero or positive integer or floating-point number.  
         *  Callables are called with arguments supplied in argument array.  
         */
        static addCustomMonitor(id: StringName, callable: Callable, arguments_?: GArray, type?: Performance.MonitorType /* = 0 */): void
        
        /** Removes the custom monitor with given [param id]. Prints an error if the given [param id] is already absent. */
        static removeCustomMonitor(id: StringName): void
        
        /** Returns `true` if custom monitor with the given [param id] is present, `false` otherwise. */
        static hasCustomMonitor(id: StringName): boolean
        
        /** Returns the value of custom monitor with given [param id]. The callable is called to get the value of custom monitor. See also [method has_custom_monitor]. Prints an error if the given [param id] is absent. */
        static getCustomMonitor(id: StringName): any
        
        /** Returns the last tick in which custom monitor was added/removed (in microseconds since the engine started). This is set to [method Time.get_ticks_usec] when the monitor is updated. */
        static getMonitorModificationTime(): int64
        
        /** Returns the names of active custom monitors in an [Array]. */
        static getCustomMonitorNames(): GArray<StringName>
        
        /** Returns the [enum MonitorType] values of active custom monitors in an [Array]. */
        static getCustomMonitorTypes(): PackedInt32Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPerformance;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPerformance;
    }
    // _singleton_class_: Engine
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEngine extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEngine extends __NameMapGObject {
        get_physics_interpolation_fraction: "getPhysicsInterpolationFraction";
        get_frames_drawn: "getFramesDrawn";
        get_frames_per_second: "getFramesPerSecond";
        get_physics_frames: "getPhysicsFrames";
        get_process_frames: "getProcessFrames";
        get_main_loop: "getMainLoop";
        get_version_info: "getVersionInfo";
        get_author_info: "getAuthorInfo";
        get_copyright_info: "getCopyrightInfo";
        get_donor_info: "getDonorInfo";
        get_license_info: "getLicenseInfo";
        get_license_text: "getLicenseText";
        get_architecture_name: "getArchitectureName";
        is_in_physics_frame: "isInPhysicsFrame";
        has_singleton: "hasSingleton";
        get_singleton: "getSingleton";
        register_singleton: "registerSingleton";
        unregister_singleton: "unregisterSingleton";
        get_singleton_list: "getSingletonList";
        register_script_language: "registerScriptLanguage";
        unregister_script_language: "unregisterScriptLanguage";
        get_script_language_count: "getScriptLanguageCount";
        get_script_language: "getScriptLanguage";
        capture_script_backtraces: "captureScriptBacktraces";
        is_editor_hint: "isEditorHint";
        is_embedded_in_editor: "isEmbeddedInEditor";
        get_write_movie_path: "getWriteMoviePath";
        print_error_messages: "printErrorMessages";
        print_to_stdout: "printToStdOut";
        physics_ticks_per_second: "physicsTicksPerSecond";
        max_physics_steps_per_frame: "maxPhysicsStepsPerFrame";
        max_fps: "maxFps";
        time_scale: "timeScale";
        physics_jitter_fix: "physicsJitterFix";
    }
    /** Provides access to engine properties.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_engine.html  
     */
    class Engine extends GObject {
        /** Returns the fraction through the current physics tick we are at the time of rendering the frame. This can be used to implement fixed timestep interpolation. */
        static getPhysicsInterpolationFraction(): float64
        
        /** Returns the total number of frames drawn since the engine started.  
         *      
         *  **Note:** On headless platforms, or if rendering is disabled with `--disable-render-loop` via command line, this method always returns `0`. See also [method get_process_frames].  
         */
        static getFramesDrawn(): int64
        
        /** Returns the average frames rendered every second (FPS), also known as the framerate. */
        static getFramesPerSecond(): float64
        
        /** Returns the total number of frames passed since the engine started. This number is increased every **physics frame**. See also [method get_process_frames].  
         *  This method can be used to run expensive logic less often without relying on a [Timer]:  
         *    
         */
        static getPhysicsFrames(): int64
        
        /** Returns the total number of frames passed since the engine started. This number is increased every **process frame**, regardless of whether the render loop is enabled. See also [method get_frames_drawn] and [method get_physics_frames].  
         *  This method can be used to run expensive logic less often without relying on a [Timer]:  
         *    
         */
        static getProcessFrames(): int64
        
        /** Returns the instance of the [MainLoop]. This is usually the main [SceneTree] and is the same as [method Node.get_tree].  
         *      
         *  **Note:** The type instantiated as the main loop can changed with [member ProjectSettings.application/run/main_loop_type].  
         */
        static getMainLoop(): null | MainLoop
        
        /** Returns the current engine version information as a [Dictionary] containing the following entries:  
         *  - `major` - Major version number as an int;  
         *  - `minor` - Minor version number as an int;  
         *  - `patch` - Patch version number as an int;  
         *  - `hex` - Full version encoded as a hexadecimal int with one byte (2 hex digits) per number (see example below);  
         *  - `status` - Status (such as "beta", "rc1", "rc2", "stable", etc.) as a String;  
         *  - `build` - Build name (e.g. "custom_build") as a String;  
         *  - `hash` - Full Git commit hash as a String;  
         *  - `timestamp` - Holds the Git commit date UNIX timestamp in seconds as an int, or `0` if unavailable;  
         *  - `string` - `major`, `minor`, `patch`, `status`, and `build` in a single String.  
         *  The `hex` value is encoded as follows, from left to right: one byte for the major, one byte for the minor, one byte for the patch version. For example, "3.1.12" would be `0x03010C`.  
         *      
         *  **Note:** The `hex` value is still an [int] internally, and printing it will give you its decimal representation, which is not particularly meaningful. Use hexadecimal literals for quick version comparisons from code:  
         *    
         */
        static getVersionInfo(): GDictionary
        
        /** Returns the engine author information as a [Dictionary], where each entry is an [Array] of strings with the names of notable contributors to the Godot Engine: `lead_developers`, `founders`, `project_managers`, and `developers`. */
        static getAuthorInfo(): GDictionary
        
        /** Returns an [Array] of dictionaries with copyright information for every component of Godot's source code.  
         *  Every [Dictionary] contains a `name` identifier, and a `parts` array of dictionaries. It describes the component in detail with the following entries:  
         *  - `files` - [Array] of file paths from the source code affected by this component;  
         *  - `copyright` - [Array] of owners of this component;  
         *  - `license` - The license applied to this component (such as "[url=https://en.wikipedia.org/wiki/MIT_License#Ambiguity_and_variants]Expat[/url]" or "[url=https://creativecommons.org/licenses/by/4.0/]CC-BY-4.0[/url]").  
         */
        static getCopyrightInfo(): GArray<GDictionary>
        
        /** Returns a [Dictionary] of categorized donor names. Each entry is an [Array] of strings:  
         *  {`platinum_sponsors`, `gold_sponsors`, `silver_sponsors`, `bronze_sponsors`, `mini_sponsors`, `gold_donors`, `silver_donors`, `bronze_donors`}  
         */
        static getDonorInfo(): GDictionary
        
        /** Returns a [Dictionary] of licenses used by Godot and included third party components. Each entry is a license name (such as "[url=https://en.wikipedia.org/wiki/MIT_License#Ambiguity_and_variants]Expat[/url]") and its associated text. */
        static getLicenseInfo(): GDictionary
        
        /** Returns the full Godot license text. */
        static getLicenseText(): string
        
        /** Returns the name of the CPU architecture the Godot binary was built for. Possible return values include `"x86_64"`, `"x86_32"`, `"arm64"`, `"arm32"`, `"rv64"`, `"ppc64"`, `"loongarch64"`, `"wasm64"`, and `"wasm32"`.  
         *  To detect whether the current build is 64-bit, or the type of architecture, don't use the architecture name. Instead, use [method OS.has_feature] to check for the `"64"` feature tag, or tags such as `"x86"` or `"arm"`. See the [url=https://docs.godotengine.org/en/latest/tutorials/export/feature_tags.html]Feature Tags[/url] documentation for more details.  
         *      
         *  **Note:** This method does  *not*  return the name of the system's CPU architecture (like [method OS.get_processor_name]). For example, when running an `x86_32` Godot binary on an `x86_64` system, the returned value will still be `"x86_32"`.  
         */
        static getArchitectureName(): string
        
        /** Returns `true` if the engine is inside the fixed physics process step of the main loop.  
         *    
         */
        static isInPhysicsFrame(): boolean
        
        /** Returns `true` if a singleton with the given [param name] exists in the global scope. See also [method get_singleton].  
         *    
         *      
         *  **Note:** Global singletons are not the same as autoloaded nodes, which are configurable in the project settings.  
         */
        static hasSingleton(name: StringName): boolean
        
        /** Returns the global singleton with the given [param name], or `null` if it does not exist. Often used for plugins. See also [method has_singleton] and [method get_singleton_list].  
         *      
         *  **Note:** Global singletons are not the same as autoloaded nodes, which are configurable in the project settings.  
         */
        static getSingleton(name: StringName): null | GObject
        
        /** Registers the given [Object] [param instance] as a singleton, available globally under [param name]. Useful for plugins. */
        static registerSingleton(name: StringName, instance: GObject): void
        
        /** Removes the singleton registered under [param name]. The singleton object is  *not*  freed. Only works with user-defined singletons registered with [method register_singleton]. */
        static unregisterSingleton(name: StringName): void
        
        /** Returns a list of names of all available global singletons. See also [method get_singleton]. */
        static getSingletonList(): PackedStringArray
        
        /** Registers a [ScriptLanguage] instance to be available with `ScriptServer`.  
         *  Returns:  
         *  - [constant OK] on success;  
         *  - [constant ERR_UNAVAILABLE] if `ScriptServer` has reached the limit and cannot register any new language;  
         *  - [constant ERR_ALREADY_EXISTS] if `ScriptServer` already contains a language with similar extension/name/type.  
         */
        static registerScriptLanguage(language: ScriptLanguage): GError
        
        /** Unregisters the [ScriptLanguage] instance from `ScriptServer`.  
         *  Returns:  
         *  - [constant OK] on success;  
         *  - [constant ERR_DOES_NOT_EXIST] if the language is not registered in `ScriptServer`.  
         */
        static unregisterScriptLanguage(language: ScriptLanguage): GError
        
        /** Returns the number of available script languages. Use with [method get_script_language]. */
        static getScriptLanguageCount(): int64
        
        /** Returns an instance of a [ScriptLanguage] with the given [param index]. */
        static getScriptLanguage(index: int64): null | ScriptLanguage
        
        /** Captures and returns backtraces from all registered script languages.  
         *  By default, the returned [ScriptBacktrace] will only contain stack frames in editor builds and debug builds. To enable them for release builds as well, you need to enable [member ProjectSettings.debug/settings/gdscript/always_track_call_stacks].  
         *  If [param include_variables] is `true`, the backtrace will also include the names and values of any global variables (e.g. autoload singletons) at the point of the capture, as well as local variables and class member variables at each stack frame. This will however will only be respected when running the game with a debugger attached, like when running the game from the editor. To enable it for export builds as well, you need to enable [member ProjectSettings.debug/settings/gdscript/always_track_local_variables].  
         *  **Warning:** When [param include_variables] is `true`, any captured variables can potentially (e.g. with GDScript backtraces) be their actual values, including any object references. This means that storing such a [ScriptBacktrace] will prevent those objects from being deallocated, so it's generally recommended not to do so.  
         */
        static captureScriptBacktraces(includeVariables?: boolean /* = false */): GArray<ScriptBacktrace>
        
        /** Returns `true` if the script is currently running inside the editor, otherwise returns `false`. This is useful for `@tool` scripts to conditionally draw editor helpers, or prevent accidentally running "game" code that would affect the scene state while in the editor:  
         *    
         *  See [url=https://docs.godotengine.org/en/latest/tutorials/plugins/running_code_in_the_editor.html]Running code in the editor[/url] in the documentation for more information.  
         *      
         *  **Note:** To detect whether the script is running on an editor  *build*  (such as when pressing [kbd]F5[/kbd]), use [method OS.has_feature] with the `"editor"` argument instead. `OS.has_feature("editor")` evaluate to `true` both when the script is running in the editor and when running the project from the editor, but returns `false` when run from an exported project.  
         */
        static isEditorHint(): boolean
        
        /** Returns `true` if the engine is running embedded in the editor. This is useful to prevent attempting to update window mode or window flags that are not supported when running the project embedded in the editor. */
        static isEmbeddedInEditor(): boolean
        
        /** Returns the path to the [MovieWriter]'s output file, or an empty string if the engine wasn't started in Movie Maker mode. The default path can be changed in [member ProjectSettings.editor/movie_writer/movie_file]. */
        static getWriteMoviePath(): string
        
        /** If `false`, stops printing error and warning messages to the console and editor Output log. This can be used to hide error and warning messages during unit test suite runs. This property is equivalent to the [member ProjectSettings.application/run/disable_stderr] project setting.  
         *      
         *  **Note:** This property does not impact the editor's Errors tab when running a project from the editor.  
         *  **Warning:** If set to `false` anywhere in the project, important error messages may be hidden even if they are emitted from other scripts. In a `@tool` script, this will also impact the editor itself. Do  *not*  report bugs before ensuring error messages are enabled (as they are by default).  
         */
        static get printErrorMessages(): boolean
        static set printErrorMessages(value: boolean)
        
        /** If `false`, stops printing messages (for example using [method @GlobalScope.print]) to the console, log files, and editor Output log. This property is equivalent to the [member ProjectSettings.application/run/disable_stdout] project setting.  
         *      
         *  **Note:** This does not stop printing errors or warnings produced by scripts to the console or log files, for more details see [member print_error_messages].  
         */
        static get printToStdOut(): boolean
        static set printToStdOut(value: boolean)
        
        /** The number of fixed iterations per second. This controls how often physics simulation and the [method Node._physics_process] method are run.  
         *  CPU usage scales approximately with the physics tick rate. However, at very low tick rates (usually below 30), physics behavior can break down. Input can also become less responsive at low tick rates as there can be a gap between input being registered, and the response on the next physics tick. High tick rates give more accurate physics simulation, particularly for fast moving objects. For example, racing games may benefit from increasing the tick rate above the default 60.  
         *  See also [member max_fps] and [member ProjectSettings.physics/common/physics_ticks_per_second].  
         *      
         *  **Note:** Only [member max_physics_steps_per_frame] physics ticks may be simulated per rendered frame at most. If more physics ticks have to be simulated per rendered frame to keep up with rendering, the project will appear to slow down (even if `delta` is used consistently in physics calculations). Therefore, it is recommended to also increase [member max_physics_steps_per_frame] if increasing [member physics_ticks_per_second] significantly above its default value.  
         *      
         *  **Note:** Consider enabling [url=https://docs.godotengine.org/en/latest/tutorials/physics/interpolation/index.html]physics interpolation[/url] if you change [member physics_ticks_per_second] to a value that is not a multiple of `60`. Using physics interpolation will avoid jittering when the monitor refresh rate and physics update rate don't exactly match.  
         */
        static get physicsTicksPerSecond(): int64
        static set physicsTicksPerSecond(value: int64)
        
        /** The maximum number of physics steps that can be simulated each rendered frame.  
         *      
         *  **Note:** The default value is tuned to prevent expensive physics simulations from triggering even more expensive simulations indefinitely. However, the game will appear to slow down if the rendering FPS is less than `1 / max_physics_steps_per_frame` of [member physics_ticks_per_second]. This occurs even if `delta` is consistently used in physics calculations. To avoid this, increase [member max_physics_steps_per_frame] if you have increased [member physics_ticks_per_second] significantly above its default value.  
         */
        static get maxPhysicsStepsPerFrame(): int64
        static set maxPhysicsStepsPerFrame(value: int64)
        
        /** The maximum number of frames that can be rendered every second (FPS). A value of `0` means the framerate is uncapped.  
         *  Limiting the FPS can be useful to reduce the host machine's power consumption, which reduces heat, noise emissions, and improves battery life.  
         *  If [member ProjectSettings.display/window/vsync/vsync_mode] is **Enabled** or **Adaptive**, the setting takes precedence and the max FPS number cannot exceed the monitor's refresh rate. See also [method DisplayServer.screen_get_refresh_rate].  
         *  If [member ProjectSettings.display/window/vsync/vsync_mode] is **Enabled**, on monitors with variable refresh rate enabled (G-Sync/FreeSync), using an FPS limit a few frames lower than the monitor's refresh rate will [url=https://blurbusters.com/howto-low-lag-vsync-on/]reduce input lag while avoiding tearing[/url]. At higher refresh rates, the difference between the FPS limit and the monitor refresh rate should be increased to ensure frames to account for timing inaccuracies. The optimal formula for the FPS limit value in this scenario is `r - (r * r) / 3600.0`, where `r` is the monitor's refresh rate.  
         *      
         *  **Note:** The actual number of frames per second may still be below this value if the CPU or GPU cannot keep up with the project's logic and rendering.  
         *      
         *  **Note:** If [member ProjectSettings.display/window/vsync/vsync_mode] is **Disabled**, limiting the FPS to a high value that can be consistently reached on the system can reduce input lag compared to an uncapped framerate. Since this works by ensuring the GPU load is lower than 100%, this latency reduction is only effective in GPU-bottlenecked scenarios, not CPU-bottlenecked scenarios.  
         */
        static get maxFps(): int64
        static set maxFps(value: int64)
        
        /** The speed multiplier at which the in-game clock updates, compared to real time. For example, if set to `2.0` the game runs twice as fast, and if set to `0.5` the game runs half as fast.  
         *  This value affects [Timer], [SceneTreeTimer], and all other simulations that make use of `delta` time (such as [method Node._process] and [method Node._physics_process]).  
         *      
         *  **Note:** It's recommended to keep this property above `0.0`, as the game may behave unexpectedly otherwise.  
         *      
         *  **Note:** This does not affect audio playback speed. Use [member AudioServer.playback_speed_scale] to adjust audio playback speed independently of [member Engine.time_scale].  
         *      
         *  **Note:** This does not automatically adjust [member physics_ticks_per_second]. With values above `1.0` physics simulation may become less precise, as each physics tick will stretch over a larger period of engine time. If you're modifying [member Engine.time_scale] to speed up simulation by a large factor, consider also increasing [member physics_ticks_per_second] to make the simulation more reliable.  
         */
        static get timeScale(): float64
        static set timeScale(value: float64)
        
        /** How much physics ticks are synchronized with real time. If `0` or less, the ticks are fully synchronized. Higher values cause the in-game clock to deviate more from the real clock, but they smooth out framerate jitters.  
         *      
         *  **Note:** The default value of `0.5` should be good enough for most cases; values above `2` could cause the game to react to dropped frames with a noticeable delay and are not recommended.  
         *      
         *  **Note:** When using a custom physics interpolation solution, or within a network game, it's recommended to disable the physics jitter fix by setting this property to `0`.  
         */
        static get physicsJitterFix(): float64
        static set physicsJitterFix(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEngine;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEngine;
    }
    // _singleton_class_: ProjectSettings
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapProjectSettings extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapProjectSettings extends __NameMapGObject {
        has_setting: "hasSetting";
        set_setting: "setSetting";
        get_setting: "getSetting";
        get_setting_with_override: "getSettingWithOverride";
        get_global_class_list: "getGlobalClassList";
        get_setting_with_override_and_custom_features: "getSettingWithOverrideAndCustomFeatures";
        set_order: "setOrder";
        get_order: "getOrder";
        set_initial_value: "setInitialValue";
        set_as_basic: "setAsBasic";
        set_as_internal: "setAsInternal";
        add_property_info: "addPropertyInfo";
        set_restart_if_changed: "setRestartIfChanged";
        localize_path: "localizePath";
        globalize_path: "globalizePath";
        load_resource_pack: "loadResourcePack";
        save_custom: "saveCustom";
        get_changed_settings: "getChangedSettings";
        check_changed_settings_in_group: "checkChangedSettingsInGroup";
        settings_changed: "settingsChanged";
    }
    /** Stores globally-accessible variables.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_projectsettings.html  
     */
    class ProjectSettings extends GObject {
        /** Returns `true` if a configuration value is present.  
         *      
         *  **Note:** In order to be be detected, custom settings have to be either defined with [method set_setting], or exist in the `project.godot` file. This is especially relevant when using [method set_initial_value].  
         */
        static hasSetting(name: string): boolean
        
        /** Sets the value of a setting.  
         *    
         *  This can also be used to erase custom project settings. To do this change the setting value to `null`.  
         */
        static setSetting(name: string, value: any): void
        
        /** Returns the value of the setting identified by [param name]. If the setting doesn't exist and [param default_value] is specified, the value of [param default_value] is returned. Otherwise, `null` is returned.  
         *    
         *      
         *  **Note:** This method doesn't take potential feature overrides into account automatically. Use [method get_setting_with_override] to handle seamlessly.  
         *  See also [method has_setting] to check whether a setting exists.  
         */
        static getSetting(name: string, defaultValue?: any /* = {} */): any
        
        /** Similar to [method get_setting], but applies feature tag overrides if any exists and is valid.  
         *  **Example:** If the setting override `"application/config/name.windows"` exists, and the following code is executed on a  *Windows*  operating system, the overridden setting is printed instead:  
         *    
         */
        static getSettingWithOverride(name: StringName): any
        
        /** Returns an [Array] of registered global classes. Each global class is represented as a [Dictionary] that contains the following entries:  
         *  - `base` is a name of the base class;  
         *  - `class` is a name of the registered global class;  
         *  - `icon` is a path to a custom icon of the global class, if it has any;  
         *  - `language` is a name of a programming language in which the global class is written;  
         *  - `path` is a path to a file containing the global class.  
         *      
         *  **Note:** Both the script and the icon paths are local to the project filesystem, i.e. they start with `res://`.  
         */
        static getGlobalClassList(): GArray<GDictionary>
        
        /** Similar to [method get_setting_with_override], but applies feature tag overrides instead of current OS features. */
        static getSettingWithOverrideAndCustomFeatures(name: StringName, features: PackedStringArray | string[]): any
        
        /** Sets the order of a configuration value (influences when saved to the config file). */
        static setOrder(name: string, position: int64): void
        
        /** Returns the order of a configuration value (influences when saved to the config file). */
        static getOrder(name: string): int64
        
        /** Sets the specified setting's initial value. This is the value the setting reverts to. The setting should already exist before calling this method. Note that project settings equal to their default value are not saved, so your code needs to account for that.  
         *    
         *  If you have a project setting defined by an [EditorPlugin], but want to use it in a running project, you will need a similar code at runtime.  
         */
        static setInitialValue(name: string, value: any): void
        
        /** Defines if the specified setting is considered basic or advanced. Basic settings will always be shown in the project settings. Advanced settings will only be shown if the user enables the "Advanced Settings" option. */
        static setAsBasic(name: string, basic: boolean): void
        
        /** Defines if the specified setting is considered internal. An internal setting won't show up in the Project Settings dialog. This is mostly useful for addons that need to store their own internal settings without exposing them directly to the user. */
        static setAsInternal(name: string, internal: boolean): void
        
        /** Adds a custom property info to a property. The dictionary must contain:  
         *  - `"name"`: [String] (the property's name)  
         *  - `"type"`: [int] (see [enum Variant.Type])  
         *  - optionally `"hint"`: [int] (see [enum PropertyHint]) and `"hint_string"`: [String]  
         *    
         *      
         *  **Note:** Setting `"usage"` for the property is not supported. Use [method set_as_basic], [method set_restart_if_changed], and [method set_as_internal] to modify usage flags.  
         */
        static addPropertyInfo(hint: GDictionary): void
        
        /** Sets whether a setting requires restarting the editor to properly take effect.  
         *      
         *  **Note:** This is just a hint to display to the user that the editor must be restarted for changes to take effect. Enabling [method set_restart_if_changed] does  *not*  delay the setting being set when changed.  
         */
        static setRestartIfChanged(name: string, restart: boolean): void
        
        /** Clears the whole configuration (not recommended, may break things). */
        static clear(name: string): void
        
        /** Returns the localized path (starting with `res://`) corresponding to the absolute, native OS [param path]. See also [method globalize_path]. */
        static localizePath(path: string): string
        
        /** Returns the absolute, native OS path corresponding to the localized [param path] (starting with `res://` or `user://`). The returned path will vary depending on the operating system and user preferences. See [url=https://docs.godotengine.org/en/latest/tutorials/io/data_paths.html]File paths in Godot projects[/url] to see what those paths convert to. See also [method localize_path].  
         *      
         *  **Note:** [method globalize_path] with `res://` will not work in an exported project. Instead, prepend the executable's base directory to the path when running from an exported project:  
         *    
         */
        static globalizePath(path: string): string
        
        /** Saves the configuration to the `project.godot` file.  
         *      
         *  **Note:** This method is intended to be used by editor plugins, as modified [ProjectSettings] can't be loaded back in the running app. If you want to change project settings in exported projects, use [method save_custom] to save an `override.cfg` file.  
         */
        static save(): GError
        
        /** Loads the contents of the .pck or .zip file specified by [param pack] into the resource filesystem (`res://`). Returns `true` on success.  
         *      
         *  **Note:** If a file from [param pack] shares the same path as a file already in the resource filesystem, any attempts to load that file will use the file from [param pack] unless [param replace_files] is set to `false`.  
         *      
         *  **Note:** The optional [param offset] parameter can be used to specify the offset in bytes to the start of the resource pack. This is only supported for .pck files.  
         *      
         *  **Note:** [DirAccess] will not show changes made to the contents of `res://` after calling this function.  
         */
        static loadResourcePack(pack: string, replaceFiles?: boolean /* = true */, offset?: int64 /* = 0 */): boolean
        
        /** Saves the configuration to a custom file. The file extension must be `.godot` (to save in text-based [ConfigFile] format) or `.binary` (to save in binary format). You can also save an `override.cfg` file, which is also text, but can be used in exported projects unlike other formats. */
        static saveCustom(file: string): GError
        
        /** Gets an array of the settings which have been changed since the last save. Note that internally `changed_settings` is cleared after a successful save, so generally the most appropriate place to use this method is when processing [signal settings_changed]. */
        static getChangedSettings(): PackedStringArray
        
        /** Checks if any settings with the prefix [param setting_prefix] exist in the set of changed settings. See also [method get_changed_settings]. */
        static checkChangedSettingsInGroup(settingPrefix: string): boolean
        
        /** Emitted when any setting is changed, up to once per process frame. */
        static readonly settingsChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapProjectSettings;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapProjectSettings;
    }
    // _singleton_class_: OS
    namespace OS {
        enum RenderingDriver {
            RenderingDriverVulkan = 0,
            RenderingDriverOpengl3 = 1,
            RenderingDriverD3D12 = 2,
            RenderingDriverMetal = 3,
        }
        enum SystemDir {
            SystemDirDesktop = 0,
            SystemDirDcim = 1,
            SystemDirDocuments = 2,
            SystemDirDownloads = 3,
            SystemDirMovies = 4,
            SystemDirMusic = 5,
            SystemDirPictures = 6,
            SystemDirRingtones = 7,
        }
        enum StdHandleType {
            StdHandleInvalid = 0,
            StdHandleConsole = 1,
            StdHandleFile = 2,
            StdHandlePipe = 3,
            StdHandleUnknown = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOS extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOS extends __NameMapGObject {
        get_entropy: "getEntropy";
        get_system_ca_certificates: "getSystemCaCertificates";
        get_connected_midi_inputs: "getConnectedMidiInputs";
        open_midi_inputs: "openMidiInputs";
        close_midi_inputs: "closeMidiInputs";
        get_processor_count: "getProcessorCount";
        get_processor_name: "getProcessorName";
        get_system_fonts: "getSystemFonts";
        get_system_font_path: "getSystemFontPath";
        get_system_font_path_for_text: "getSystemFontPathForText";
        get_executable_path: "getExecutablePath";
        read_string_from_stdin: "readStringFromStdIn";
        read_buffer_from_stdin: "readBufferFromStdIn";
        get_stdin_type: "getStdInType";
        get_stdout_type: "getStdOutType";
        get_stderr_type: "getStderrType";
        execute_with_pipe: "executeWithPipe";
        create_process: "createProcess";
        create_instance: "createInstance";
        open_with_program: "openWithProgram";
        shell_open: "shellOpen";
        shell_show_in_file_manager: "shellShowInFileManager";
        is_process_running: "isProcessRunning";
        get_process_exit_code: "getProcessExitCode";
        get_process_id: "getProcessId";
        has_environment: "hasEnvironment";
        get_environment: "getEnvironment";
        set_environment: "setEnvironment";
        unset_environment: "unsetEnvironment";
        get_name: "getName";
        get_distribution_name: "getDistributionName";
        get_version: "getVersion";
        get_version_alias: "getVersionAlias";
        get_cmdline_args: "getCmdlineArgs";
        get_cmdline_user_args: "getCmdlineUserArgs";
        get_video_adapter_driver_info: "getVideoAdapterDriverInfo";
        set_restart_on_exit: "setRestartOnExit";
        is_restart_on_exit_set: "isRestartOnExitSet";
        get_restart_on_exit_arguments: "getRestartOnExitArguments";
        delay_usec: "delayUsec";
        delay_msec: "delayMsec";
        get_locale: "getLocale";
        get_preferred_locales: "getPreferredLocales";
        get_locale_language: "getLocaleLanguage";
        get_model_name: "getModelName";
        is_userfs_persistent: "isUserfsPersistent";
        is_stdout_verbose: "isStdOutVerbose";
        is_debug_build: "isDebugBuild";
        get_static_memory_usage: "getStaticMemoryUsage";
        get_static_memory_peak_usage: "getStaticMemoryPeakUsage";
        get_memory_info: "getMemoryInfo";
        move_to_trash: "moveToTrash";
        get_user_data_dir: "getUserDataDir";
        get_system_dir: "getSystemDir";
        get_config_dir: "getConfigDir";
        get_data_dir: "getDataDir";
        get_cache_dir: "getCacheDir";
        get_temp_dir: "getTempDir";
        get_unique_id: "getUniqueId";
        get_keycode_string: "getKeycodeString";
        is_keycode_unicode: "isKeycodeUnicode";
        find_keycode_from_string: "findKeycodeFromString";
        set_use_file_access_save_and_swap: "setUseFileAccessSaveAndSwap";
        set_thread_name: "setThreadName";
        get_thread_caller_id: "getThreadCallerId";
        get_main_thread_id: "getMainThreadId";
        has_feature: "hasFeature";
        is_sandboxed: "isSandboxed";
        request_permission: "requestPermission";
        request_permissions: "requestPermissions";
        get_granted_permissions: "getGrantedPermissions";
        revoke_granted_permissions: "revokeGrantedPermissions";
        add_logger: "addLogger";
        remove_logger: "removeLogger";
        low_processor_usage_mode: "lowProcessorUsageMode";
        low_processor_usage_mode_sleep_usec: "lowProcessorUsageModeSleepUsec";
        delta_smoothing: "deltaSmoothing";
    }
    /** Provides access to common operating system functionalities.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_os.html  
     */
    class OS extends GObject {
        /** Generates a [PackedByteArray] of cryptographically secure random bytes with given [param size].  
         *      
         *  **Note:** Generating large quantities of bytes using this method can result in locking and entropy of lower quality on most platforms. Using [method Crypto.generate_random_bytes] is preferred in most cases.  
         */
        static getEntropy(size: int64): PackedByteArray
        
        /** Returns the list of certification authorities trusted by the operating system as a string of concatenated certificates in PEM format. */
        static getSystemCaCertificates(): string
        
        /** Returns an array of connected MIDI device names, if they exist. Returns an empty array if the system MIDI driver has not previously been initialized with [method open_midi_inputs]. See also [method close_midi_inputs].  
         *      
         *  **Note:** This method is implemented on Linux, macOS, Windows, and Web.  
         *      
         *  **Note:** On the Web platform, Web MIDI needs to be supported by the browser. [url=https://caniuse.com/midi]For the time being[/url], it is currently supported by all major browsers, except Safari.  
         *      
         *  **Note:** On the Web platform, using MIDI input requires a browser permission to be granted first. This permission request is performed when calling [method open_midi_inputs]. The browser will refrain from processing MIDI input until the user accepts the permission request.  
         */
        static getConnectedMidiInputs(): PackedStringArray
        
        /** Initializes the singleton for the system MIDI driver, allowing Godot to receive [InputEventMIDI]. See also [method get_connected_midi_inputs] and [method close_midi_inputs].  
         *      
         *  **Note:** This method is implemented on Linux, macOS, Windows, and Web.  
         *      
         *  **Note:** On the Web platform, Web MIDI needs to be supported by the browser. [url=https://caniuse.com/midi]For the time being[/url], it is currently supported by all major browsers, except Safari.  
         *      
         *  **Note:** On the Web platform, using MIDI input requires a browser permission to be granted first. This permission request is performed when calling [method open_midi_inputs]. The browser will refrain from processing MIDI input until the user accepts the permission request.  
         */
        static openMidiInputs(): void
        
        /** Shuts down the system MIDI driver. Godot will no longer receive [InputEventMIDI]. See also [method open_midi_inputs] and [method get_connected_midi_inputs].  
         *      
         *  **Note:** This method is implemented on Linux, macOS, Windows, and Web.  
         */
        static closeMidiInputs(): void
        
        /** Displays a modal dialog box using the host platform's implementation. The engine execution is blocked until the dialog is closed. */
        static alert(text: string, title?: string /* = 'Alert!' */): void
        
        /** Crashes the engine (or the editor if called within a `@tool` script). See also [method kill].  
         *      
         *  **Note:** This method should  *only*  be used for testing the system's crash handler, not for any other purpose. For general error reporting, use (in order of preference) [method @GDScript.assert], [method @GlobalScope.push_error], or [method alert].  
         */
        static crash(message: string): void
        
        /** Returns the number of  *logical*  CPU cores available on the host machine. On CPUs with HyperThreading enabled, this number will be greater than the number of  *physical*  CPU cores. */
        static getProcessorCount(): int64
        
        /** Returns the full name of the CPU model on the host machine (e.g. `"Intel(R) Core(TM) i7-6700K CPU @ 4.00GHz"`).  
         *      
         *  **Note:** This method is only implemented on Windows, macOS, Linux, Android (API level 31+), and iOS. On Web, [method get_processor_name] returns an empty string.  
         */
        static getProcessorName(): string
        
        /** Returns the list of font family names available.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux, macOS and Windows.  
         */
        static getSystemFonts(): PackedStringArray
        
        /** Returns the path to the system font file with [param font_name] and style. Returns an empty string if no matching fonts found.  
         *  The following aliases can be used to request default fonts: "sans-serif", "serif", "monospace", "cursive", and "fantasy".  
         *      
         *  **Note:** Returned font might have different style if the requested style is not available.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux, macOS and Windows.  
         */
        static getSystemFontPath(fontName: string, weight?: int64 /* = 400 */, stretch?: int64 /* = 100 */, italic?: boolean /* = false */): string
        
        /** Returns an array of the system substitute font file paths, which are similar to the font with [param font_name] and style for the specified text, locale, and script. Returns an empty array if no matching fonts found.  
         *  The following aliases can be used to request default fonts: "sans-serif", "serif", "monospace", "cursive", and "fantasy".  
         *      
         *  **Note:** Depending on OS, it's not guaranteed that any of the returned fonts will be suitable for rendering specified text. Fonts should be loaded and checked in the order they are returned, and the first suitable one used.  
         *      
         *  **Note:** Returned fonts might have different style if the requested style is not available or belong to a different font family.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux, macOS and Windows.  
         */
        static getSystemFontPathForText(fontName: string, text: string, locale?: string /* = '' */, script?: string /* = '' */, weight?: int64 /* = 400 */, stretch?: int64 /* = 100 */, italic?: boolean /* = false */): PackedStringArray
        
        /** Returns the file path to the current engine executable.  
         *      
         *  **Note:** On macOS, if you want to launch another instance of Godot, always use [method create_instance] instead of relying on the executable path.  
         */
        static getExecutablePath(): string
        
        /** Reads a user input as a UTF-8 encoded string from the standard input. This operation can be  *blocking* , which causes the window to freeze if [method read_string_from_stdin] is called on the main thread.  
         *  - If standard input is console, this method will block until the program receives a line break in standard input (usually by the user pressing [kbd]Enter[/kbd]).  
         *  - If standard input is pipe, this method will block until a specific amount of data is read or pipe is closed.  
         *  - If standard input is a file, this method will read a specific amount of data (or less if end-of-file is reached) and return immediately.  
         *      
         *  **Note:** This method automatically replaces `\r\n` line breaks with `\n` and removes them from the end of the string. Use [method read_buffer_from_stdin] to read the unprocessed data.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** On exported Windows builds, run the console wrapper executable to access the terminal. If standard input is console, calling this method without console wrapped will freeze permanently. If standard input is pipe or file, it can be used without console wrapper. If you need a single executable with full console support, use a custom build compiled with the `windows_subsystem=console` flag.  
         */
        static readStringFromStdIn(bufferSize?: int64 /* = 1024 */): string
        
        /** Reads a user input as raw data from the standard input. This operation can be  *blocking* , which causes the window to freeze if [method read_buffer_from_stdin] is called on the main thread.  
         *  - If standard input is console, this method will block until the program receives a line break in standard input (usually by the user pressing [kbd]Enter[/kbd]).  
         *  - If standard input is pipe, this method will block until a specific amount of data is read or pipe is closed.  
         *  - If standard input is a file, this method will read a specific amount of data (or less if end-of-file is reached) and return immediately.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** On exported Windows builds, run the console wrapper executable to access the terminal. If standard input is console, calling this method without console wrapped will freeze permanently. If standard input is pipe or file, it can be used without console wrapper. If you need a single executable with full console support, use a custom build compiled with the `windows_subsystem=console` flag.  
         */
        static readBufferFromStdIn(bufferSize?: int64 /* = 1024 */): PackedByteArray
        
        /** Returns the type of the standard input device.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** On exported Windows builds, run the console wrapper executable to access the standard input. If you need a single executable with full console support, use a custom build compiled with the `windows_subsystem=console` flag.  
         */
        static getStdInType(): OS.StdHandleType
        
        /** Returns the type of the standard output device.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         */
        static getStdOutType(): OS.StdHandleType
        
        /** Returns the type of the standard error device.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         */
        static getStderrType(): OS.StdHandleType
        
        /** Executes the given process in a  *blocking*  way. The file specified in [param path] must exist and be executable. The system path resolution will be used. The [param arguments] are used in the given order, separated by spaces, and wrapped in quotes.  
         *  If an [param output] array is provided, the complete shell output of the process is appended to [param output] as a single [String] element. If [param read_stderr] is `true`, the output to the standard error stream is also appended to the array.  
         *  On Windows, if [param open_console] is `true` and the process is a console app, a new terminal window is opened.  
         *  This method returns the exit code of the command, or `-1` if the process fails to execute.  
         *      
         *  **Note:** The main thread will be blocked until the executed command terminates. Use [Thread] to create a separate thread that will not block the main thread, or use [method create_process] to create a completely independent process.  
         *  For example, to retrieve a list of the working directory's contents:  
         *    
         *  If you wish to access a shell built-in or execute a composite command, a platform-specific shell can be invoked. For example:  
         *    
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS, and Windows.  
         *      
         *  **Note:** To execute a Windows command interpreter built-in command, specify `cmd.exe` in [param path], `/c` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** To execute a PowerShell built-in command, specify `powershell.exe` in [param path], `-Command` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** To execute a Unix shell built-in command, specify shell executable name in [param path], `-c` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** On macOS, sandboxed applications are limited to run only embedded helper executables, specified during export.  
         *      
         *  **Note:** On Android, system commands such as `dumpsys` can only be run on a rooted device.  
         */
        static execute(path: string, arguments_: PackedStringArray | string[], output?: GArray, readStderr?: boolean /* = false */, openConsole?: boolean /* = false */): int64
        
        /** Creates a new process that runs independently of Godot with redirected IO. It will not terminate when Godot terminates. The path specified in [param path] must exist and be an executable file or macOS `.app` bundle. The path is resolved based on the current platform. The [param arguments] are used in the given order and separated by a space.  
         *  If [param blocking] is `false`, created pipes work in non-blocking mode, i.e. read and write operations will return immediately. Use [method FileAccess.get_error] to check if the last read/write operation was successful.  
         *  If the process cannot be created, this method returns an empty [Dictionary]. Otherwise, this method returns a [Dictionary] with the following keys:  
         *  - `"stdio"` - [FileAccess] to access the process stdin and stdout pipes (read/write).  
         *  - `"stderr"` - [FileAccess] to access the process stderr pipe (read only).  
         *  - `"pid"` - Process ID as an [int], which you can use to monitor the process (and potentially terminate it with [method kill]).  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS, and Windows.  
         *      
         *  **Note:** To execute a Windows command interpreter built-in command, specify `cmd.exe` in [param path], `/c` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** To execute a PowerShell built-in command, specify `powershell.exe` in [param path], `-Command` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** To execute a Unix shell built-in command, specify shell executable name in [param path], `-c` as the first argument, and the desired command as the second argument.  
         *      
         *  **Note:** On macOS, sandboxed applications are limited to run only embedded helper executables, specified during export or system .app bundle, system .app bundles will ignore arguments.  
         */
        static executeWithPipe(path: string, arguments_: PackedStringArray | string[], blocking?: boolean /* = true */): GDictionary
        
        /** Creates a new process that runs independently of Godot. It will not terminate when Godot terminates. The path specified in [param path] must exist and be an executable file or macOS `.app` bundle. The path is resolved based on the current platform. The [param arguments] are used in the given order and separated by a space.  
         *  On Windows, if [param open_console] is `true` and the process is a console app, a new terminal window will be opened.  
         *  If the process is successfully created, this method returns its process ID, which you can use to monitor the process (and potentially terminate it with [method kill]). Otherwise, this method returns `-1`.  
         *  **Example:** Run another instance of the project:  
         *    
         *  See [method execute] if you wish to run an external command and retrieve the results.  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS, and Windows.  
         *      
         *  **Note:** On macOS, sandboxed applications are limited to run only embedded helper executables, specified during export or system .app bundle, system .app bundles will ignore arguments.  
         */
        static createProcess(path: string, arguments_: PackedStringArray | string[], openConsole?: boolean /* = false */): int64
        
        /** Creates a new instance of Godot that runs independently. The [param arguments] are used in the given order and separated by a space.  
         *  If the process is successfully created, this method returns the new process's ID, which you can use to monitor the process (and potentially terminate it with [method kill]). If the process cannot be created, this method returns `-1`.  
         *  See [method create_process] if you wish to run a different process.  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS, and Windows.  
         */
        static createInstance(arguments_: PackedStringArray | string[]): int64
        
        /** Opens one or more files/directories with the specified application. The [param program_path] specifies the path to the application to use for opening the files, and [param paths] contains an array of file/directory paths to open.  
         *      
         *  **Note:** This method is mostly only relevant for macOS, where opening files using [method create_process] might fail. On other platforms, this falls back to using [method create_process].  
         *      
         *  **Note:** On macOS, [param program_path] should ideally be the path to a `.app` bundle.  
         */
        static openWithProgram(programPath: string, paths: PackedStringArray | string[]): GError
        
        /** Kill (terminate) the process identified by the given process ID ([param pid]), such as the ID returned by [method execute] in non-blocking mode. See also [method crash].  
         *      
         *  **Note:** This method can also be used to kill processes that were not spawned by the engine.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux, macOS and Windows.  
         */
        static kill(pid: int64): GError
        
        /** Requests the OS to open a resource identified by [param uri] with the most appropriate program. For example:  
         *  - `OS.shell_open("C:\\Users\\name\\Downloads")` on Windows opens the file explorer at the user's Downloads folder.  
         *  - `OS.shell_open("C:/Users/name/Downloads")` also works on Windows and opens the file explorer at the user's Downloads folder.  
         *  - `OS.shell_open("https://godotengine.org")` opens the default web browser on the official Godot website.  
         *  - `OS.shell_open("mailto:example@example.com")` opens the default email client with the "To" field set to `example@example.com`. See [url=https://datatracker.ietf.org/doc/html/rfc2368]RFC 2368 - The mailto URL scheme[/url] for a list of fields that can be added.  
         *  Use [method ProjectSettings.globalize_path] to convert a `res://` or `user://` project path into a system path for use with this method.  
         *      
         *  **Note:** Use [method String.uri_encode] to encode characters within URLs in a URL-safe, portable way. This is especially required for line breaks. Otherwise, [method shell_open] may not work correctly in a project exported to the Web platform.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux, macOS and Windows.  
         */
        static shellOpen(uri: string): GError
        
        /** Requests the OS to open the file manager, navigate to the given [param file_or_dir_path] and select the target file or folder.  
         *  If [param open_folder] is `true` and [param file_or_dir_path] is a valid directory path, the OS will open the file manager and navigate to the target folder without selecting anything.  
         *  Use [method ProjectSettings.globalize_path] to convert a `res://` or `user://` project path into a system path to use with this method.  
         *      
         *  **Note:** This method is currently only implemented on Windows and macOS. On other platforms, it will fallback to [method shell_open] with a directory path of [param file_or_dir_path] prefixed with `file://`.  
         */
        static shellShowInFileManager(fileOrDirPath: string, openFolder?: boolean /* = true */): GError
        
        /** Returns `true` if the child process ID ([param pid]) is still running or `false` if it has terminated. [param pid] must be a valid ID generated from [method create_process].  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux, macOS, and Windows.  
         */
        static isProcessRunning(pid: int64): boolean
        
        /** Returns the exit code of a spawned process once it has finished running (see [method is_process_running]).  
         *  Returns `-1` if the [param pid] is not a PID of a spawned child process, the process is still running, or the method is not implemented for the current platform.  
         *      
         *  **Note:** Returns `-1` if the [param pid] is a macOS bundled app process.  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS and Windows.  
         */
        static getProcessExitCode(pid: int64): int64
        
        /** Returns the number used by the host machine to uniquely identify this application.  
         *      
         *  **Note:** On Web, this method always returns `0`.  
         */
        static getProcessId(): int64
        
        /** Returns `true` if the environment variable with the name [param variable] exists.  
         *      
         *  **Note:** Double-check the casing of [param variable]. Environment variable names are case-sensitive on all platforms except Windows.  
         */
        static hasEnvironment(variable: string): boolean
        
        /** Returns the value of the given environment variable, or an empty string if [param variable] doesn't exist.  
         *      
         *  **Note:** Double-check the casing of [param variable]. Environment variable names are case-sensitive on all platforms except Windows.  
         *      
         *  **Note:** On macOS, applications do not have access to shell environment variables.  
         */
        static getEnvironment(variable: string): string
        
        /** Sets the value of the environment variable [param variable] to [param value]. The environment variable will be set for the Godot process and any process executed with [method execute] after running [method set_environment]. The environment variable will  *not*  persist to processes run after the Godot process was terminated.  
         *      
         *  **Note:** Environment variable names are case-sensitive on all platforms except Windows. The [param variable] name cannot be empty or include the `=` character. On Windows, there is a 32767 characters limit for the combined length of [param variable], [param value], and the `=` and null terminator characters that will be registered in the environment block.  
         */
        static setEnvironment(variable: string, value: string): void
        
        /** Removes the given environment variable from the current environment, if it exists. The [param variable] name cannot be empty or include the `=` character. The environment variable will be removed for the Godot process and any process executed with [method execute] after running [method unset_environment]. The removal of the environment variable will  *not*  persist to processes run after the Godot process was terminated.  
         *      
         *  **Note:** Environment variable names are case-sensitive on all platforms except Windows.  
         */
        static unsetEnvironment(variable: string): void
        
        /** Returns the name of the host platform.  
         *  - On Windows, this is `"Windows"`.  
         *  - On macOS, this is `"macOS"`.  
         *  - On Linux-based operating systems, this is `"Linux"`.  
         *  - On BSD-based operating systems, this is `"FreeBSD"`, `"NetBSD"`, `"OpenBSD"`, or `"BSD"` as a fallback.  
         *  - On Android, this is `"Android"`.  
         *  - On iOS, this is `"iOS"`.  
         *  - On Web, this is `"Web"`.  
         *      
         *  **Note:** Custom builds of the engine may support additional platforms, such as consoles, possibly returning other names.  
         *    
         *      
         *  **Note:** On Web platforms, it is still possible to determine the host platform's OS with feature tags. See [method has_feature].  
         */
        static getName(): string
        
        /** Returns the name of the distribution for Linux and BSD platforms (e.g. "Ubuntu", "Manjaro", "OpenBSD", etc.).  
         *  Returns the same value as [method get_name] for stock Android ROMs, but attempts to return the custom ROM name for popular Android derivatives such as "LineageOS".  
         *  Returns the same value as [method get_name] for other platforms.  
         *      
         *  **Note:** This method is not supported on the Web platform. It returns an empty string.  
         */
        static getDistributionName(): string
        
        /** Returns the exact production and build version of the operating system. This is different from the branded version used in marketing. This helps to distinguish between different releases of operating systems, including minor versions, and insider and custom builds.  
         *  - For Windows, the major and minor version are returned, as well as the build number. For example, the returned string may look like `10.0.9926` for a build of Windows 10.  
         *  - For rolling distributions, such as Arch Linux, an empty string is returned.  
         *  - For macOS and iOS, the major and minor version are returned, as well as the patch number.  
         *  - For Android, the SDK version and the incremental build number are returned. If it's a custom ROM, it attempts to return its version instead.  
         *      
         *  **Note:** This method is not supported on the Web platform. It returns an empty string.  
         */
        static getVersion(): string
        
        /** Returns the branded version used in marketing, followed by the build number (on Windows), the version number (on macOS), or the SDK version and incremental build number (on Android). Examples include `11 (build 22000)`, `Sequoia (15.0.0)`, and `15 (SDK 35 build abc528-11988f)`.  
         *  This value can then be appended to [method get_name] to get a full, human-readable operating system name and version combination for the operating system. Windows feature updates such as 24H2 are not contained in the resulting string, but Windows Server is recognized as such (e.g. `2025 (build 26100)` for Windows Server 2025).  
         *      
         *  **Note:** This method is only supported on Windows, macOS, and Android. On other operating systems, it returns the same value as [method get_version].  
         */
        static getVersionAlias(): string
        
        /** Returns the command-line arguments passed to the engine, excluding arguments processed by the engine, such as `--headless` and `--fullscreen`.  
         *    
         *  Command-line arguments can be written in any form, including both `--key value` and `--key=value` forms so they can be properly parsed, as long as custom command-line arguments do not conflict with engine arguments.  
         *  You can also incorporate environment variables using the [method get_environment] method.  
         *  You can set [member ProjectSettings.editor/run/main_run_args] to define command-line arguments to be passed by the editor when running the project.  
         *  **Example:** Parse command-line arguments into a [Dictionary] using the `--key=value` form for arguments:  
         *    
         *      
         *  **Note:** Passing custom user arguments directly is not recommended, as the engine may discard or modify them. Instead, pass the standard UNIX double dash (`--`) and then the custom arguments, which the engine will ignore by design. These can be read via [method get_cmdline_user_args].  
         */
        static getCmdlineArgs(): PackedStringArray
        
        /** Returns the command-line user arguments passed to the engine. User arguments are ignored by the engine and reserved for the user. They are passed after the double dash `--` argument. `++` may be used when `--` is intercepted by another program (such as `startx`).  
         *    
         *  To get arguments passed before `--` or `++`, use [method get_cmdline_args].  
         */
        static getCmdlineUserArgs(): PackedStringArray
        
        /** Returns the video adapter driver name and version for the user's currently active graphics card, as a [PackedStringArray]. See also [method RenderingServer.get_video_adapter_api_version].  
         *  The first element holds the driver name, such as `nvidia`, `amdgpu`, etc.  
         *  The second element holds the driver version. For example, on the `nvidia` driver on a Linux/BSD platform, the version is in the format `510.85.02`. For Windows, the driver's format is `31.0.15.1659`.  
         *      
         *  **Note:** This method is only supported on Linux/BSD and Windows when not running in headless mode. On other platforms, it returns an empty array.  
         *      
         *  **Note:** This method will run slowly the first time it is called in a session; it can take several seconds depending on the operating system and hardware. It is blocking if called on the main thread, so it's recommended to call it on a separate thread using [Thread]. This allows the engine to keep running while the information is being retrieved. However, [method get_video_adapter_driver_info] is  *not*  thread-safe, so it should not be called from multiple threads at the same time.  
         *    
         */
        static getVideoAdapterDriverInfo(): PackedStringArray
        
        /** If [param restart] is `true`, restarts the project automatically when it is exited with [method SceneTree.quit] or [constant Node.NOTIFICATION_WM_CLOSE_REQUEST]. Command-line [param arguments] can be supplied. To restart the project with the same command line arguments as originally used to run the project, pass [method get_cmdline_args] as the value for [param arguments].  
         *  This method can be used to apply setting changes that require a restart. See also [method is_restart_on_exit_set] and [method get_restart_on_exit_arguments].  
         *      
         *  **Note:** This method is only effective on desktop platforms, and only when the project isn't started from the editor. It will have no effect on mobile and Web platforms, or when the project is started from the editor.  
         *      
         *  **Note:** If the project process crashes or is  *killed*  by the user (by sending `SIGKILL` instead of the usual `SIGTERM`), the project won't restart automatically.  
         */
        static setRestartOnExit(restart: boolean, arguments_?: PackedStringArray | string[] /* = [] */): void
        
        /** Returns `true` if the project will automatically restart when it exits for any reason, `false` otherwise. See also [method set_restart_on_exit] and [method get_restart_on_exit_arguments]. */
        static isRestartOnExitSet(): boolean
        
        /** Returns the list of command line arguments that will be used when the project automatically restarts using [method set_restart_on_exit]. See also [method is_restart_on_exit_set]. */
        static getRestartOnExitArguments(): PackedStringArray
        
        /** Delays execution of the current thread by [param usec] microseconds. [param usec] must be greater than or equal to `0`. Otherwise, [method delay_usec] does nothing and prints an error message.  
         *      
         *  **Note:** [method delay_usec] is a  *blocking*  way to delay code execution. To delay code execution in a non-blocking way, you may use [method SceneTree.create_timer]. Awaiting with a [SceneTreeTimer] delays the execution of code placed below the `await` without affecting the rest of the project (or editor, for [EditorPlugin]s and [EditorScript]s).  
         *      
         *  **Note:** When [method delay_usec] is called on the main thread, it will freeze the project and will prevent it from redrawing and registering input until the delay has passed. When using [method delay_usec] as part of an [EditorPlugin] or [EditorScript], it will freeze the editor but won't freeze the project if it is currently running (since the project is an independent child process).  
         */
        static delayUsec(usec: int64): void
        
        /** Delays execution of the current thread by [param msec] milliseconds. [param msec] must be greater than or equal to `0`. Otherwise, [method delay_msec] does nothing and prints an error message.  
         *      
         *  **Note:** [method delay_msec] is a  *blocking*  way to delay code execution. To delay code execution in a non-blocking way, you may use [method SceneTree.create_timer]. Awaiting with [SceneTreeTimer] delays the execution of code placed below the `await` without affecting the rest of the project (or editor, for [EditorPlugin]s and [EditorScript]s).  
         *      
         *  **Note:** When [method delay_msec] is called on the main thread, it will freeze the project and will prevent it from redrawing and registering input until the delay has passed. When using [method delay_msec] as part of an [EditorPlugin] or [EditorScript], it will freeze the editor but won't freeze the project if it is currently running (since the project is an independent child process).  
         */
        static delayMsec(msec: int64): void
        
        /** Returns the host OS locale as a [String] of the form `language_Script_COUNTRY_VARIANT@extra`. Every substring after `language` is optional and may not exist.  
         *  - `language` - 2 or 3-letter [url=https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes]language code[/url], in lower case.  
         *  - [code skip-lint]Script` - 4-letter [url=https://en.wikipedia.org/wiki/ISO_15924]script code[/url], in title case.  
         *  - `COUNTRY` - 2 or 3-letter [url=https://en.wikipedia.org/wiki/ISO_3166-1]country code[/url], in upper case.  
         *  - `VARIANT` - language variant, region, and sort order. The variant can have any number of underscored keywords.  
         *  - `extra` - semicolon separated list of additional key words. This may include currency, calendar, sort order, and numbering system information.  
         *  If you want only the language code and not the fully specified locale from the OS, you can use [method get_locale_language].  
         */
        static getLocale(): string
        
        /** Returns an array of locales preferred by the user, in order of preference. Each locale is as a [String] on the form `language_Script_COUNTRY_VARIANT@extra`. Every substring after `language` is optional and may not exist.  
         *  - `language` - 2 or 3-letter [url=https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes]language code[/url], in lower case.  
         *  - [code skip-lint]Script` - 4-letter [url=https://en.wikipedia.org/wiki/ISO_15924]script code[/url], in title case.  
         *  - `COUNTRY` - 2 or 3-letter [url=https://en.wikipedia.org/wiki/ISO_3166-1]country code[/url], in upper case.  
         *  - `VARIANT` - language variant, region, and sort order. The variant can have any number of underscored keywords.  
         *  - `extra` - semicolon separated list of additional key words. This may include currency, calendar, sort order, and numbering system information.  
         *      
         *  **Note:** This method is implemented on macOS, iOS, and Windows.  
         */
        static getPreferredLocales(): PackedStringArray
        
        /** Returns the host OS locale's 2 or 3-letter [url=https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes]language code[/url] as a string which should be consistent on all platforms. This is equivalent to extracting the `language` part of the [method get_locale] string.  
         *  This can be used to narrow down fully specified locale strings to only the "common" language code, when you don't need the additional information about country code or variants. For example, for a French Canadian user with `fr_CA` locale, this would return `fr`.  
         */
        static getLocaleLanguage(): string
        
        /** Returns the model name of the current device.  
         *      
         *  **Note:** This method is implemented on Android, iOS, macOS, and Windows. Returns `"GenericDevice"` on unsupported platforms.  
         */
        static getModelName(): string
        
        /** Returns `true` if the `user://` file system is persistent, that is, its state is the same after a player quits and starts the game again. Relevant to the Web platform, where this persistence may be unavailable. */
        static isUserfsPersistent(): boolean
        
        /** Returns `true` if the engine was executed with the `--verbose` or `-v` command line argument, or if [member ProjectSettings.debug/settings/stdout/verbose_stdout] is `true`. See also [method @GlobalScope.print_verbose]. */
        static isStdOutVerbose(): boolean
        
        /** Returns `true` if the Godot binary used to run the project is a  *debug*  export template, or when running in the editor.  
         *  Returns `false` if the Godot binary used to run the project is a  *release*  export template.  
         *      
         *  **Note:** To check whether the Godot binary used to run the project is an export template (debug or release), use `OS.has_feature("template")` instead.  
         */
        static isDebugBuild(): boolean
        
        /** Returns the amount of static memory being used by the program in bytes. Only works in debug builds. */
        static getStaticMemoryUsage(): int64
        
        /** Returns the maximum amount of static memory used. Only works in debug builds. */
        static getStaticMemoryPeakUsage(): int64
        
        /** Returns a [Dictionary] containing information about the current memory with the following entries:  
         *  - `"physical"` - total amount of usable physical memory in bytes. This value can be slightly less than the actual physical memory amount, since it does not include memory reserved by the kernel and devices.  
         *  - `"free"` - amount of physical memory, that can be immediately allocated without disk access or other costly operations, in bytes. The process might be able to allocate more physical memory, but this action will require moving inactive pages to disk, which can be expensive.  
         *  - `"available"` - amount of memory that can be allocated without extending the swap file(s), in bytes. This value includes both physical memory and swap.  
         *  - `"stack"` - size of the current thread stack in bytes.  
         *      
         *  **Note:** Each entry's value may be `-1` if it is unknown.  
         */
        static getMemoryInfo(): GDictionary
        
        /** Moves the file or directory at the given [param path] to the system's recycle bin. See also [method DirAccess.remove].  
         *  The method takes only global paths, so you may need to use [method ProjectSettings.globalize_path]. Do not use it for files in `res://` as it will not work in exported projects.  
         *  Returns [constant FAILED] if the file or directory cannot be found, or the system does not support this method.  
         *    
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS and Windows.  
         *      
         *  **Note:** If the user has disabled the recycle bin on their system, the file will be permanently deleted instead.  
         */
        static moveToTrash(path: string): GError
        
        /** Returns the absolute directory path where user data is written (the `user://` directory in Godot). The path depends on the project name and [member ProjectSettings.application/config/use_custom_user_dir].  
         *  - On Windows, this is `%AppData%\Godot\app_userdata\[project_name]`, or `%AppData%\[custom_name]` if `use_custom_user_dir` is set. `%AppData%` expands to `%UserProfile%\AppData\Roaming`.  
         *  - On macOS, this is `~/Library/Application Support/Godot/app_userdata/[project_name]`, or `~/Library/Application Support/[custom_name]` if `use_custom_user_dir` is set.  
         *  - On Linux and BSD, this is `~/.local/share/godot/app_userdata/[project_name]`, or `~/.local/share/[custom_name]` if `use_custom_user_dir` is set.  
         *  - On Android and iOS, this is a sandboxed directory in either internal or external storage, depending on the user's configuration.  
         *  - On Web, this is a virtual directory managed by the browser.  
         *  If the project name is empty, `[project_name]` falls back to `[unnamed project]`.  
         *  Not to be confused with [method get_data_dir], which returns the  *global*  (non-project-specific) user home directory.  
         */
        static getUserDataDir(): string
        
        /** Returns the path to commonly used folders across different platforms, as defined by [param dir]. See the [enum SystemDir] constants for available locations.  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS and Windows.  
         *      
         *  **Note:** Shared storage is implemented on Android and allows to differentiate between app specific and shared directories, if [param shared_storage] is `true`. Shared directories have additional restrictions on Android.  
         */
        static getSystemDir(dir: OS.SystemDir, sharedStorage?: boolean /* = true */): string
        
        /** Returns the  *global*  user configuration directory according to the operating system's standards.  
         *  On the Linux/BSD platform, this path can be overridden by setting the `XDG_CONFIG_HOME` environment variable before starting the project. See [url=https://docs.godotengine.org/en/latest/tutorials/io/data_paths.html]File paths in Godot projects[/url] in the documentation for more information. See also [method get_cache_dir] and [method get_data_dir].  
         *  Not to be confused with [method get_user_data_dir], which returns the  *project-specific*  user data path.  
         */
        static getConfigDir(): string
        
        /** Returns the  *global*  user data directory according to the operating system's standards.  
         *  On the Linux/BSD platform, this path can be overridden by setting the `XDG_DATA_HOME` environment variable before starting the project. See [url=https://docs.godotengine.org/en/latest/tutorials/io/data_paths.html]File paths in Godot projects[/url] in the documentation for more information. See also [method get_cache_dir] and [method get_config_dir].  
         *  Not to be confused with [method get_user_data_dir], which returns the  *project-specific*  user data path.  
         */
        static getDataDir(): string
        
        /** Returns the  *global*  cache data directory according to the operating system's standards.  
         *  On the Linux/BSD platform, this path can be overridden by setting the `XDG_CACHE_HOME` environment variable before starting the project. See [url=https://docs.godotengine.org/en/latest/tutorials/io/data_paths.html]File paths in Godot projects[/url] in the documentation for more information. See also [method get_config_dir] and [method get_data_dir].  
         *  Not to be confused with [method get_user_data_dir], which returns the  *project-specific*  user data path.  
         */
        static getCacheDir(): string
        
        /** Returns the  *global*  temporary data directory according to the operating system's standards. */
        static getTempDir(): string
        
        /** Returns a string that is unique to the device.  
         *      
         *  **Note:** This string may change without notice if the user reinstalls their operating system, upgrades it, or modifies their hardware. This means it should generally not be used to encrypt persistent data, as the data saved before an unexpected ID change would become inaccessible. The returned string may also be falsified using external programs, so do not rely on the string returned by this method for security purposes.  
         *      
         *  **Note:** On Web, returns an empty string and generates an error, as this method cannot be implemented for security reasons.  
         */
        static getUniqueId(): string
        
        /** Returns the given keycode as a [String].  
         *    
         *  See also [method find_keycode_from_string], [member InputEventKey.keycode], and [method InputEventKey.get_keycode_with_modifiers].  
         */
        static getKeycodeString(code: Key): string
        
        /** Returns `true` if the input keycode corresponds to a Unicode character. For a list of codes, see the [enum Key] constants.  
         *    
         */
        static isKeycodeUnicode(code: int64): boolean
        
        /** Finds the keycode for the given string. The returned values are equivalent to the [enum Key] constants.  
         *    
         *  See also [method get_keycode_string].  
         */
        static findKeycodeFromString(string_: string): Key
        
        /** If [param enabled] is `true`, when opening a file for writing, a temporary file is used in its place. When closed, it is automatically applied to the target file.  
         *  This can useful when files may be opened by other applications, such as antiviruses, text editors, or even the Godot editor itself.  
         */
        static setUseFileAccessSaveAndSwap(enabled: boolean): void
        
        /** Assigns the given name to the current thread. Returns [constant ERR_UNAVAILABLE] if unavailable on the current platform. */
        static setThreadName(name: string): GError
        
        /** Returns the ID of the current thread. This can be used in logs to ease debugging of multi-threaded applications.  
         *      
         *  **Note:** Thread IDs are not deterministic and may be reused across application restarts.  
         */
        static getThreadCallerId(): int64
        
        /** Returns the ID of the main thread. See [method get_thread_caller_id].  
         *      
         *  **Note:** Thread IDs are not deterministic and may be reused across application restarts.  
         */
        static getMainThreadId(): int64
        
        /** Returns `true` if the feature for the given feature tag is supported in the currently running instance, depending on the platform, build, etc. Can be used to check whether you're currently running a debug build, on a certain platform or arch, etc. Refer to the [url=https://docs.godotengine.org/en/latest/tutorials/export/feature_tags.html]Feature Tags[/url] documentation for more details.  
         *      
         *  **Note:** Tag names are case-sensitive.  
         *      
         *  **Note:** On the Web platform, one of the following additional tags is defined to indicate the host platform: `web_android`, `web_ios`, `web_linuxbsd`, `web_macos`, or `web_windows`.  
         */
        static hasFeature(tagName: string): boolean
        
        /** Returns `true` if the application is running in the sandbox.  
         *      
         *  **Note:** This method is only implemented on macOS and Linux.  
         */
        static isSandboxed(): boolean
        
        /** Requests permission from the OS for the given [param name]. Returns `true` if the permission has already been granted. See also [signal MainLoop.on_request_permissions_result].  
         *  The [param name] must be the full permission name. For example:  
         *  - `OS.request_permission("android.permission.READ_EXTERNAL_STORAGE")`  
         *  - `OS.request_permission("android.permission.POST_NOTIFICATIONS")`  
         *  - `OS.request_permission("macos.permission.RECORD_SCREEN")`  
         *  - `OS.request_permission("appleembedded.permission.AUDIO_RECORD")`  
         *      
         *  **Note:** On Android, permission must be checked during export.  
         *      
         *  **Note:** This method is implemented on Android, macOS, and visionOS platforms.  
         */
        static requestPermission(name: string): boolean
        
        /** Requests  *dangerous*  permissions from the OS. Returns `true` if permissions have already been granted. See also [signal MainLoop.on_request_permissions_result].  
         *      
         *  **Note:** Permissions must be checked during export.  
         *      
         *  **Note:** This method is only implemented on Android. Normal permissions are automatically granted at install time in Android applications.  
         */
        static requestPermissions(): boolean
        
        /** On Android devices: Returns the list of dangerous permissions that have been granted.  
         *  On macOS: Returns the list of granted permissions and user selected folders accessible to the application (sandboxed applications only). Use the native file dialog to request folder access permission.  
         *  On iOS, visionOS: Returns the list of granted permissions.  
         */
        static getGrantedPermissions(): PackedStringArray
        
        /** On macOS (sandboxed applications only), this function clears list of user selected folders accessible to the application. */
        static revokeGrantedPermissions(): void
        
        /** Add a custom logger to intercept the internal message stream. */
        static addLogger(logger: Logger): void
        
        /** Remove a custom logger added by [method add_logger]. */
        static removeLogger(logger: Logger): void
        
        /** If `true`, the engine optimizes for low processor usage by only refreshing the screen if needed. Can improve battery consumption on mobile.  
         *      
         *  **Note:** On start-up, this is the same as [member ProjectSettings.application/run/low_processor_mode].  
         */
        static get lowProcessorUsageMode(): boolean
        static set lowProcessorUsageMode(value: boolean)
        
        /** The amount of sleeping between frames when the low-processor usage mode is enabled, in microseconds. Higher values will result in lower CPU usage. See also [member low_processor_usage_mode].  
         *      
         *  **Note:** On start-up, this is the same as [member ProjectSettings.application/run/low_processor_mode_sleep_usec].  
         */
        static get lowProcessorUsageModeSleepUsec(): int64
        static set lowProcessorUsageModeSleepUsec(value: int64)
        
        /** If `true`, the engine filters the time delta measured between each frame, and attempts to compensate for random variation. This only works on systems where V-Sync is active.  
         *      
         *  **Note:** On start-up, this is the same as [member ProjectSettings.application/run/delta_smoothing].  
         */
        static get deltaSmoothing(): boolean
        static set deltaSmoothing(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOS;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOS;
    }
    // _singleton_class_: Time
    namespace Time {
        enum Month {
            MonthJanuary = 1,
            MonthFebruary = 2,
            MonthMarch = 3,
            MonthApril = 4,
            MonthMay = 5,
            MonthJune = 6,
            MonthJuly = 7,
            MonthAugust = 8,
            MonthSeptember = 9,
            MonthOctober = 10,
            MonthNovember = 11,
            MonthDecember = 12,
        }
        enum Weekday {
            WeekdaySunday = 0,
            WeekdayMonday = 1,
            WeekdayTuesday = 2,
            WeekdayWednesday = 3,
            WeekdayThursday = 4,
            WeekdayFriday = 5,
            WeekdaySaturday = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTime extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTime extends __NameMapGObject {
        get_datetime_dict_from_unix_time: "getDatetimeDictFromUnixTime";
        get_date_dict_from_unix_time: "getDateDictFromUnixTime";
        get_time_dict_from_unix_time: "getTimeDictFromUnixTime";
        get_datetime_string_from_unix_time: "getDatetimeStringFromUnixTime";
        get_date_string_from_unix_time: "getDateStringFromUnixTime";
        get_time_string_from_unix_time: "getTimeStringFromUnixTime";
        get_datetime_dict_from_datetime_string: "getDatetimeDictFromDatetimeString";
        get_datetime_string_from_datetime_dict: "getDatetimeStringFromDatetimeDict";
        get_unix_time_from_datetime_dict: "getUnixTimeFromDatetimeDict";
        get_unix_time_from_datetime_string: "getUnixTimeFromDatetimeString";
        get_offset_string_from_offset_minutes: "getOffsetStringFromOffsetMinutes";
        get_datetime_dict_from_system: "getDatetimeDictFromSystem";
        get_date_dict_from_system: "getDateDictFromSystem";
        get_time_dict_from_system: "getTimeDictFromSystem";
        get_datetime_string_from_system: "getDatetimeStringFromSystem";
        get_date_string_from_system: "getDateStringFromSystem";
        get_time_string_from_system: "getTimeStringFromSystem";
        get_time_zone_from_system: "getTimeZoneFromSystem";
        get_unix_time_from_system: "getUnixTimeFromSystem";
        get_ticks_msec: "getTicksMsec";
        get_ticks_usec: "getTicksUsec";
    }
    /** A singleton for working with time data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_time.html  
     */
    class Time extends GObject {
        /** Converts the given Unix timestamp to a dictionary of keys: `year`, `month`, `day`, `weekday`, `hour`, `minute`, and `second`.  
         *  The returned Dictionary's values will be the same as the [method get_datetime_dict_from_system] if the Unix timestamp is the current time, with the exception of Daylight Savings Time as it cannot be determined from the epoch.  
         */
        static getDatetimeDictFromUnixTime(unixTimeVal: int64): GDictionary
        
        /** Converts the given Unix timestamp to a dictionary of keys: `year`, `month`, `day`, and `weekday`. */
        static getDateDictFromUnixTime(unixTimeVal: int64): GDictionary
        
        /** Converts the given time to a dictionary of keys: `hour`, `minute`, and `second`. */
        static getTimeDictFromUnixTime(unixTimeVal: int64): GDictionary
        
        /** Converts the given Unix timestamp to an ISO 8601 date and time string (YYYY-MM-DDTHH:MM:SS).  
         *  If [param use_space] is `true`, the date and time bits are separated by an empty space character instead of the letter T.  
         */
        static getDatetimeStringFromUnixTime(unixTimeVal: int64, useSpace?: boolean /* = false */): string
        
        /** Converts the given Unix timestamp to an ISO 8601 date string (YYYY-MM-DD). */
        static getDateStringFromUnixTime(unixTimeVal: int64): string
        
        /** Converts the given Unix timestamp to an ISO 8601 time string (HH:MM:SS). */
        static getTimeStringFromUnixTime(unixTimeVal: int64): string
        
        /** Converts the given ISO 8601 date and time string (YYYY-MM-DDTHH:MM:SS) to a dictionary of keys: `year`, `month`, `day`, [code skip-lint]weekday`, `hour`, `minute`, and `second`.  
         *  If [param weekday] is `false`, then the [code skip-lint]weekday` entry is excluded (the calculation is relatively expensive).  
         *      
         *  **Note:** Any decimal fraction in the time string will be ignored silently.  
         */
        static getDatetimeDictFromDatetimeString(datetime: string, weekday: boolean): GDictionary
        
        /** Converts the given dictionary of keys to an ISO 8601 date and time string (YYYY-MM-DDTHH:MM:SS).  
         *  The given dictionary can be populated with the following keys: `year`, `month`, `day`, `hour`, `minute`, and `second`. Any other entries (including `dst`) are ignored.  
         *  If the dictionary is empty, `0` is returned. If some keys are omitted, they default to the equivalent values for the Unix epoch timestamp 0 (1970-01-01 at 00:00:00).  
         *  If [param use_space] is `true`, the date and time bits are separated by an empty space character instead of the letter T.  
         */
        static getDatetimeStringFromDatetimeDict(datetime: GDictionary, useSpace: boolean): string
        
        /** Converts a dictionary of time values to a Unix timestamp.  
         *  The given dictionary can be populated with the following keys: `year`, `month`, `day`, `hour`, `minute`, and `second`. Any other entries (including `dst`) are ignored.  
         *  If the dictionary is empty, `0` is returned. If some keys are omitted, they default to the equivalent values for the Unix epoch timestamp 0 (1970-01-01 at 00:00:00).  
         *  You can pass the output from [method get_datetime_dict_from_unix_time] directly into this function and get the same as what was put in.  
         *      
         *  **Note:** Unix timestamps are often in UTC. This method does not do any timezone conversion, so the timestamp will be in the same timezone as the given datetime dictionary.  
         */
        static getUnixTimeFromDatetimeDict(datetime: GDictionary): int64
        
        /** Converts the given ISO 8601 date and/or time string to a Unix timestamp. The string can contain a date only, a time only, or both.  
         *      
         *  **Note:** Unix timestamps are often in UTC. This method does not do any timezone conversion, so the timestamp will be in the same timezone as the given datetime string.  
         *      
         *  **Note:** Any decimal fraction in the time string will be ignored silently.  
         */
        static getUnixTimeFromDatetimeString(datetime: string): int64
        
        /** Converts the given timezone offset in minutes to a timezone offset string. For example, -480 returns "-08:00", 345 returns "+05:45", and 0 returns "+00:00". */
        static getOffsetStringFromOffsetMinutes(offsetMinutes: int64): string
        
        /** Returns the current date as a dictionary of keys: `year`, `month`, `day`, `weekday`, `hour`, `minute`, `second`, and `dst` (Daylight Savings Time). */
        static getDatetimeDictFromSystem(utc?: boolean /* = false */): GDictionary
        
        /** Returns the current date as a dictionary of keys: `year`, `month`, `day`, and `weekday`.  
         *  The returned values are in the system's local time when [param utc] is `false`, otherwise they are in UTC.  
         */
        static getDateDictFromSystem(utc?: boolean /* = false */): GDictionary
        
        /** Returns the current time as a dictionary of keys: `hour`, `minute`, and `second`.  
         *  The returned values are in the system's local time when [param utc] is `false`, otherwise they are in UTC.  
         */
        static getTimeDictFromSystem(utc?: boolean /* = false */): GDictionary
        
        /** Returns the current date and time as an ISO 8601 date and time string (YYYY-MM-DDTHH:MM:SS).  
         *  The returned values are in the system's local time when [param utc] is `false`, otherwise they are in UTC.  
         *  If [param use_space] is `true`, the date and time bits are separated by an empty space character instead of the letter T.  
         */
        static getDatetimeStringFromSystem(utc?: boolean /* = false */, useSpace?: boolean /* = false */): string
        
        /** Returns the current date as an ISO 8601 date string (YYYY-MM-DD).  
         *  The returned values are in the system's local time when [param utc] is `false`, otherwise they are in UTC.  
         */
        static getDateStringFromSystem(utc?: boolean /* = false */): string
        
        /** Returns the current time as an ISO 8601 time string (HH:MM:SS).  
         *  The returned values are in the system's local time when [param utc] is `false`, otherwise they are in UTC.  
         */
        static getTimeStringFromSystem(utc?: boolean /* = false */): string
        
        /** Returns the current time zone as a dictionary of keys: `bias` and `name`.  
         *  - `bias` is the offset from UTC in minutes, since not all time zones are multiples of an hour from UTC.  
         *  - `name` is the localized name of the time zone, according to the OS locale settings of the current user.  
         */
        static getTimeZoneFromSystem(): GDictionary
        
        /** Returns the current Unix timestamp in seconds based on the system time in UTC. This method is implemented by the operating system and always returns the time in UTC. The Unix timestamp is the number of seconds passed since 1970-01-01 at 00:00:00, the [url=https://en.wikipedia.org/wiki/Unix_time]Unix epoch[/url].  
         *      
         *  **Note:** Unlike other methods that use integer timestamps, this method returns the timestamp as a [float] for sub-second precision.  
         */
        static getUnixTimeFromSystem(): float64
        
        /** Returns the amount of time passed in milliseconds since the engine started.  
         *  Will always be positive or 0 and uses a 64-bit value (it will wrap after roughly 500 million years).  
         */
        static getTicksMsec(): int64
        
        /** Returns the amount of time passed in microseconds since the engine started.  
         *  Will always be positive or 0 and uses a 64-bit value (it will wrap after roughly half a million years).  
         */
        static getTicksUsec(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTime;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTime;
    }
    // _singleton_class_: ClassDB
    namespace ClassDB {
        enum ApiType {
            ApiCore = 0,
            ApiEditor = 1,
            ApiExtension = 2,
            ApiEditorExtension = 3,
            ApiNone = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapClassDB extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapClassDB extends __NameMapGObject {
        get_class_list: "getClassList";
        get_inheriters_from_class: "getInheritersFromClass";
        get_parent_class: "getParentClass";
        class_exists: "classExists";
        is_parent_class: "isParentClass";
        can_instantiate: "canInstantiate";
        class_get_api_type: "classGetApiType";
        class_has_signal: "classHasSignal";
        class_get_signal: "classGetSignal";
        class_get_signal_list: "classGetSignalList";
        class_get_property_list: "classGetPropertyList";
        class_get_property_getter: "classGetPropertyGetter";
        class_get_property_setter: "classGetPropertySetter";
        class_get_property: "classGetProperty";
        class_set_property: "classSetProperty";
        class_get_property_default_value: "classGetPropertyDefaultValue";
        class_has_method: "classHasMethod";
        class_get_method_argument_count: "classGetMethodArgumentCount";
        class_get_method_list: "classGetMethodList";
        class_call_static: "classCallStatic";
        class_get_integer_constant_list: "classGetIntegerConstantList";
        class_has_integer_constant: "classHasIntegerConstant";
        class_get_integer_constant: "classGetIntegerConstant";
        class_has_enum: "classHasEnum";
        class_get_enum_list: "classGetEnumList";
        class_get_enum_constants: "classGetEnumConstants";
        class_get_integer_constant_enum: "classGetIntegerConstantEnum";
        is_class_enum_bitfield: "isClassEnumBitfield";
        is_class_enabled: "isClassEnabled";
        is_class_exposed: "isClassExposed";
    }
    /** A class information repository.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_classdb.html  
     */
    class ClassDB extends GObject {
        /** Returns the names of all engine classes available.  
         *      
         *  **Note:** Script-defined classes with `class_name` are not included in this list. Use [method ProjectSettings.get_global_class_list] to get a list of script-defined classes instead.  
         */
        static getClassList(): PackedStringArray
        
        /** Returns the names of all engine classes that directly or indirectly inherit from [param class]. */
        static getInheritersFromClass(class_: StringName): PackedStringArray
        
        /** Returns the parent class of [param class]. */
        static getParentClass(class_: StringName): StringName
        
        /** Returns whether the specified [param class] is available or not. */
        static classExists(class_: StringName): boolean
        
        /** Returns whether [param inherits] is an ancestor of [param class] or not. */
        static isParentClass(class_: StringName, inherits: StringName): boolean
        
        /** Returns `true` if objects can be instantiated from the specified [param class], otherwise returns `false`. */
        static canInstantiate(class_: StringName): boolean
        
        /** Creates an instance of [param class]. */
        static instantiate(class_: StringName): any
        
        /** Returns the API type of the specified [param class]. */
        static classGetApiType(class_: StringName): ClassDB.ApiType
        
        /** Returns whether [param class] or its ancestry has a signal called [param signal] or not. */
        static classHasSignal(class_: StringName, signal: StringName): boolean
        
        /** Returns the [param signal] data of [param class] or its ancestry. The returned value is a [Dictionary] with the following keys: `args`, `default_args`, `flags`, `id`, `name`, `return: (class_name, hint, hint_string, name, type, usage)`. */
        static classGetSignal(class_: StringName, signal: StringName): GDictionary
        
        /** Returns an array with all the signals of [param class] or its ancestry if [param no_inheritance] is `false`. Every element of the array is a [Dictionary] as described in [method class_get_signal]. */
        static classGetSignalList(class_: StringName, noInheritance?: boolean /* = false */): GArray<GDictionary>
        
        /** Returns an array with all the properties of [param class] or its ancestry if [param no_inheritance] is `false`. */
        static classGetPropertyList(class_: StringName, noInheritance?: boolean /* = false */): GArray<GDictionary>
        
        /** Returns the getter method name of [param property] of [param class]. */
        static classGetPropertyGetter(class_: StringName, property: StringName): StringName
        
        /** Returns the setter method name of [param property] of [param class]. */
        static classGetPropertySetter(class_: StringName, property: StringName): StringName
        
        /** Returns the value of [param property] of [param object] or its ancestry. */
        static classGetProperty(object: GObject, property: StringName): any
        
        /** Sets [param property] value of [param object] to [param value]. */
        static classSetProperty(object: GObject, property: StringName, value: any): GError
        
        /** Returns the default value of [param property] of [param class] or its ancestor classes. */
        static classGetPropertyDefaultValue(class_: StringName, property: StringName): any
        
        /** Returns whether [param class] (or its ancestry if [param no_inheritance] is `false`) has a method called [param method] or not. */
        static classHasMethod(class_: StringName, method: StringName, noInheritance?: boolean /* = false */): boolean
        
        /** Returns the number of arguments of the method [param method] of [param class] or its ancestry if [param no_inheritance] is `false`. */
        static classGetMethodArgumentCount(class_: StringName, method: StringName, noInheritance?: boolean /* = false */): int64
        
        /** Returns an array with all the methods of [param class] or its ancestry if [param no_inheritance] is `false`. Every element of the array is a [Dictionary] with the following keys: `args`, `default_args`, `flags`, `id`, `name`, `return: (class_name, hint, hint_string, name, type, usage)`.  
         *      
         *  **Note:** In exported release builds the debug info is not available, so the returned dictionaries will contain only method names.  
         */
        static classGetMethodList(class_: StringName, noInheritance?: boolean /* = false */): GArray<GDictionary>
        
        /** Calls a static method on a class. */
        static classCallStatic(class_: StringName, method: StringName, ...varargs: any[]): any
        
        /** Returns an array with the names all the integer constants of [param class] or its ancestry. */
        static classGetIntegerConstantList(class_: StringName, noInheritance?: boolean /* = false */): PackedStringArray
        
        /** Returns whether [param class] or its ancestry has an integer constant called [param name] or not. */
        static classHasIntegerConstant(class_: StringName, name: StringName): boolean
        
        /** Returns the value of the integer constant [param name] of [param class] or its ancestry. Always returns 0 when the constant could not be found. */
        static classGetIntegerConstant(class_: StringName, name: StringName): int64
        
        /** Returns whether [param class] or its ancestry has an enum called [param name] or not. */
        static classHasEnum(class_: StringName, name: StringName, noInheritance?: boolean /* = false */): boolean
        
        /** Returns an array with all the enums of [param class] or its ancestry. */
        static classGetEnumList(class_: StringName, noInheritance?: boolean /* = false */): PackedStringArray
        
        /** Returns an array with all the keys in [param enum] of [param class] or its ancestry. */
        static classGetEnumConstants(class_: StringName, enum_: StringName, noInheritance?: boolean /* = false */): PackedStringArray
        
        /** Returns which enum the integer constant [param name] of [param class] or its ancestry belongs to. */
        static classGetIntegerConstantEnum(class_: StringName, name: StringName, noInheritance?: boolean /* = false */): StringName
        
        /** Returns whether [param class] (or its ancestor classes if [param no_inheritance] is `false`) has an enum called [param enum] that is a bitfield. */
        static isClassEnumBitfield(class_: StringName, enum_: StringName, noInheritance?: boolean /* = false */): boolean
        
        /** Returns whether this [param class] is enabled or not. */
        static isClassEnabled(class_: StringName): boolean
        
        /** Returns whether this [param class] is exposed or not.  
         *  Godot uses internal and platform specific classes at run time. [ClassDB] is able to work with those and lists them like any other class. This method can be used to filter them out if your use-case requires it.  
         */
        static isClassExposed(class_: StringName): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapClassDB;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapClassDB;
    }
    // _singleton_class_: TextServerManager
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextServerManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextServerManager extends __NameMapGObject {
        add_interface: "addInterface";
        get_interface_count: "getInterfaceCount";
        remove_interface: "removeInterface";
        get_interface: "getInterface";
        get_interfaces: "getInterfaces";
        find_interface: "findInterface";
        set_primary_interface: "setPrimaryInterface";
        get_primary_interface: "getPrimaryInterface";
        interface_added: "interfaceAdded";
        interface_removed: "interfaceRemoved";
    }
    /** A singleton for managing [TextServer] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textservermanager.html  
     */
    class TextServerManager extends GObject {
        /** Registers a [TextServer] interface. */
        static addInterface(interface: TextServer): void
        
        /** Returns the number of interfaces currently registered. */
        static getInterfaceCount(): int64
        
        /** Removes an interface. All fonts and shaped text caches should be freed before removing an interface. */
        static removeInterface(interface: TextServer): void
        
        /** Returns the interface registered at a given index. */
        static getInterface(idx: int64): null | TextServer
        
        /** Returns a list of available interfaces, with the index and name of each interface. */
        static getInterfaces(): GArray<GDictionary>
        
        /** Finds an interface by its [param name]. */
        static findInterface(name: string): null | TextServer
        
        /** Sets the primary [TextServer] interface. */
        static setPrimaryInterface(index: TextServer): void
        
        /** Returns the primary [TextServer] interface currently in use. */
        static getPrimaryInterface(): null | TextServer
        
        /** Emitted when a new interface has been added. */
        static readonly interfaceAdded: Signal<(interfaceName: StringName) => void>
        
        /** Emitted when an interface is removed. */
        static readonly interfaceRemoved: Signal<(interfaceName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextServerManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextServerManager;
    }
    // _singleton_class_: NavigationServer2DManager
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationServer2DManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationServer2DManager extends __NameMapGObject {
        register_server: "registerServer";
        set_default_server: "setDefaultServer";
    }
    /** A singleton for managing [NavigationServer2D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationserver2dmanager.html  
     */
    class NavigationServer2DManager extends GObject {
        /** Registers a [NavigationServer2D] implementation by passing a [param name] and a [Callable] that returns a [NavigationServer2D] object. */
        static registerServer(name: string, createCallback: Callable): void
        
        /** Sets the default [NavigationServer2D] implementation to the one identified by [param name], if [param priority] is greater than the priority of the current default implementation. */
        static setDefaultServer(name: string, priority: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationServer2DManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationServer2DManager;
    }
    // _singleton_class_: PhysicsServer2DManager
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer2DManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer2DManager extends __NameMapGObject {
        register_server: "registerServer";
        set_default_server: "setDefaultServer";
    }
    /** A singleton for managing [PhysicsServer2D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver2dmanager.html  
     */
    class PhysicsServer2DManager extends GObject {
        /** Register a [PhysicsServer2D] implementation by passing a [param name] and a [Callable] that returns a [PhysicsServer2D] object. */
        static registerServer(name: string, createCallback: Callable): void
        
        /** Set the default [PhysicsServer2D] implementation to the one identified by [param name], if [param priority] is greater than the priority of the current default implementation. */
        static setDefaultServer(name: string, priority: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer2DManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer2DManager;
    }
    // _singleton_class_: NavigationServer3DManager
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationServer3DManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationServer3DManager extends __NameMapGObject {
        register_server: "registerServer";
        set_default_server: "setDefaultServer";
    }
    /** A singleton for managing [NavigationServer3D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationserver3dmanager.html  
     */
    class NavigationServer3DManager extends GObject {
        /** Registers a [NavigationServer3D] implementation by passing a [param name] and a [Callable] that returns a [NavigationServer3D] object. */
        static registerServer(name: string, createCallback: Callable): void
        
        /** Sets the default [NavigationServer3D] implementation to the one identified by [param name], if [param priority] is greater than the priority of the current default implementation. */
        static setDefaultServer(name: string, priority: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationServer3DManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationServer3DManager;
    }
    // _singleton_class_: PhysicsServer3DManager
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer3DManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer3DManager extends __NameMapGObject {
        register_server: "registerServer";
        set_default_server: "setDefaultServer";
    }
    /** A singleton for managing [PhysicsServer3D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver3dmanager.html  
     */
    class PhysicsServer3DManager extends GObject {
        /** Register a [PhysicsServer3D] implementation by passing a [param name] and a [Callable] that returns a [PhysicsServer3D] object. */
        static registerServer(name: string, createCallback: Callable): void
        
        /** Set the default [PhysicsServer3D] implementation to the one identified by [param name], if [param priority] is greater than the priority of the current default implementation. */
        static setDefaultServer(name: string, priority: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer3DManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer3DManager;
    }
    // _singleton_class_: NavigationMeshGenerator
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationMeshGenerator extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationMeshGenerator extends __NameMapGObject {
        parse_source_geometry_data: "parseSourceGeometryData";
        bake_from_source_geometry_data: "bakeFromSourceGeometryData";
    }
    /** Helper class for creating and clearing navigation meshes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationmeshgenerator.html  
     */
    class NavigationMeshGenerator extends GObject {
        /** Bakes the [param navigation_mesh] with source geometry collected starting from the [param root_node]. */
        static bake(navigationMesh: NavigationMesh, rootNode: Node): void
        
        /** Removes all polygons and vertices from the provided [param navigation_mesh] resource. */
        static clear(navigationMesh: NavigationMesh): void
        
        /** Parses the [SceneTree] for source geometry according to the properties of [param navigation_mesh]. Updates the provided [param source_geometry_data] resource with the resulting data. The resource can then be used to bake a navigation mesh with [method bake_from_source_geometry_data]. After the process is finished the optional [param callback] will be called.  
         *      
         *  **Note:** This function needs to run on the main thread or with a deferred call as the SceneTree is not thread-safe.  
         *  **Performance:** While convenient, reading data arrays from [Mesh] resources can affect the frame rate negatively. The data needs to be received from the GPU, stalling the [RenderingServer] in the process. For performance prefer the use of e.g. collision shapes or creating the data arrays entirely in code.  
         */
        static parseSourceGeometryData(navigationMesh: NavigationMesh, sourceGeometryData: NavigationMeshSourceGeometryData3D, rootNode: Node, callback?: Callable /* = new Callable() */): void
        
        /** Bakes the provided [param navigation_mesh] with the data from the provided [param source_geometry_data]. After the process is finished the optional [param callback] will be called. */
        static bakeFromSourceGeometryData(navigationMesh: NavigationMesh, sourceGeometryData: NavigationMeshSourceGeometryData3D, callback?: Callable /* = new Callable() */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationMeshGenerator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationMeshGenerator;
    }
    // _singleton_class_: IP
    namespace IP {
        enum ResolverStatus {
            ResolverStatusNone = 0,
            ResolverStatusWaiting = 1,
            ResolverStatusDone = 2,
            ResolverStatusError = 3,
        }
        enum Type {
            TypeNone = 0,
            TypeIpv4 = 1,
            TypeIpv6 = 2,
            TypeAny = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapIP extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapIP extends __NameMapGObject {
        resolve_hostname: "resolveHostname";
        resolve_hostname_addresses: "resolveHostnameAddresses";
        resolve_hostname_queue_item: "resolveHostnameQueueItem";
        get_resolve_item_status: "getResolveItemStatus";
        get_resolve_item_address: "getResolveItemAddress";
        get_resolve_item_addresses: "getResolveItemAddresses";
        erase_resolve_item: "eraseResolveItem";
        get_local_addresses: "getLocalAddresses";
        get_local_interfaces: "getLocalInterfaces";
        clear_cache: "clearCache";
    }
    /** Internet protocol (IP) support functions such as DNS resolution.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_ip.html  
     */
    class IP extends GObject {
        /** Maximum number of concurrent DNS resolver queries allowed, [constant RESOLVER_INVALID_ID] is returned if exceeded. */
        static readonly RESOLVER_MAX_QUERIES = 256
        
        /** Invalid ID constant. Returned if [constant RESOLVER_MAX_QUERIES] is exceeded. */
        static readonly RESOLVER_INVALID_ID = -1
        
        /** Returns a given hostname's IPv4 or IPv6 address when resolved (blocking-type method). The address type returned depends on the [enum Type] constant given as [param ip_type]. */
        static resolveHostname(host: string, iPType?: IP.Type /* = 3 */): string
        
        /** Resolves a given hostname in a blocking way. Addresses are returned as an [Array] of IPv4 or IPv6 addresses depending on [param ip_type]. */
        static resolveHostnameAddresses(host: string, iPType?: IP.Type /* = 3 */): PackedStringArray
        
        /** Creates a queue item to resolve a hostname to an IPv4 or IPv6 address depending on the [enum Type] constant given as [param ip_type]. Returns the queue ID if successful, or [constant RESOLVER_INVALID_ID] on error. */
        static resolveHostnameQueueItem(host: string, iPType?: IP.Type /* = 3 */): int64
        
        /** Returns a queued hostname's status as a [enum ResolverStatus] constant, given its queue [param id]. */
        static getResolveItemStatus(id: int64): IP.ResolverStatus
        
        /** Returns a queued hostname's IP address, given its queue [param id]. Returns an empty string on error or if resolution hasn't happened yet (see [method get_resolve_item_status]). */
        static getResolveItemAddress(id: int64): string
        
        /** Returns resolved addresses, or an empty array if an error happened or resolution didn't happen yet (see [method get_resolve_item_status]). */
        static getResolveItemAddresses(id: int64): GArray
        
        /** Removes a given item [param id] from the queue. This should be used to free a queue after it has completed to enable more queries to happen. */
        static eraseResolveItem(id: int64): void
        
        /** Returns all the user's current IPv4 and IPv6 addresses as an array. */
        static getLocalAddresses(): PackedStringArray
        
        /** Returns all network adapters as an array.  
         *  Each adapter is a dictionary of the form:  
         *    
         */
        static getLocalInterfaces(): GArray<GDictionary>
        
        /** Removes all of a [param hostname]'s cached references. If no [param hostname] is given, all cached IP addresses are removed. */
        static clearCache(hostname?: string /* = '' */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapIP;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapIP;
    }
    // _singleton_class_: Geometry2D
    namespace Geometry2D {
        enum PolyBooleanOperation {
            OperationUnion = 0,
            OperationDifference = 1,
            OperationIntersection = 2,
            OperationXor = 3,
        }
        enum PolyJoinType {
            JoinSquare = 0,
            JoinRound = 1,
            JoinMiter = 2,
        }
        enum PolyEndType {
            EndPolygon = 0,
            EndJoined = 1,
            EndButt = 2,
            EndSquare = 3,
            EndRound = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapGeometry2D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapGeometry2D extends __NameMapGObject {
        is_point_in_circle: "isPointInCircle";
        segment_intersects_circle: "segmentIntersectsCircle";
        segment_intersects_segment: "segmentIntersectsSegment";
        line_intersects_line: "lineIntersectsLine";
        get_closest_points_between_segments: "getClosestPointsBetweenSegments";
        get_closest_point_to_segment: "getClosestPointToSegment";
        get_closest_point_to_segment_uncapped: "getClosestPointToSegmentUncapped";
        point_is_inside_triangle: "pointIsInsideTriangle";
        is_polygon_clockwise: "isPolygonClockwise";
        is_point_in_polygon: "isPointInPolygon";
        triangulate_polygon: "triangulatePolygon";
        triangulate_delaunay: "triangulateDelaunay";
        convex_hull: "convexHull";
        decompose_polygon_in_convex: "decomposePolygonInConvex";
        merge_polygons: "mergePolygons";
        clip_polygons: "clipPolygons";
        intersect_polygons: "intersectPolygons";
        exclude_polygons: "excludePolygons";
        clip_polyline_with_polygon: "clipPolylineWithPolygon";
        intersect_polyline_with_polygon: "intersectPolylineWithPolygon";
        offset_polygon: "offsetPolygon";
        offset_polyline: "offsetPolyline";
        make_atlas: "makeAtlas";
        bresenham_line: "bresenhamLine";
    }
    /** Provides methods for some common 2D geometric operations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_geometry2d.html  
     */
    class Geometry2D extends GObject {
        /** Returns `true` if [param point] is inside the circle or if it's located exactly  *on*  the circle's boundary, otherwise returns `false`. */
        static isPointInCircle(point: Vector2, circlePosition: Vector2, circleRadius: float64): boolean
        
        /** Given the 2D segment ([param segment_from], [param segment_to]), returns the position on the segment (as a number between 0 and 1) at which the segment hits the circle that is located at position [param circle_position] and has radius [param circle_radius]. If the segment does not intersect the circle, -1 is returned (this is also the case if the line extending the segment would intersect the circle, but the segment does not). */
        static segmentIntersectsCircle(segmentFrom: Vector2, segmentTo: Vector2, circlePosition: Vector2, circleRadius: float64): float64
        
        /** Checks if two line segments intersect, with line `a` between [param from_a] and [param to_a] and line `b` between [param from_b] and [param to_b]. If the line segments intersect, the point of intersection is returned as a [Vector2]. If no intersection takes place, `null` is returned. */
        static segmentIntersectsSegment(fromA: Vector2, toA: Vector2, fromB: Vector2, toB: Vector2): any
        
        /** Returns the point of intersection between the two lines ([param from_a], [param dir_a]) and ([param from_b], [param dir_b]). Returns a [Vector2], or `null` if the lines are parallel.  
         *  `from` and `dir` are  *not*  endpoints of a line segment or ray but the slope (`dir`) and a known point (`from`) on that line. To get the intersection between two line segments, use [method segment_intersects_segment].  
         *    
         */
        static lineIntersectsLine(fromA: Vector2, dirA: Vector2, fromB: Vector2, dirB: Vector2): any
        
        /** Given the two 2D segments ([param p1], [param q1]) and ([param p2], [param q2]), finds those two points on the two segments that are closest to each other. Returns a [PackedVector2Array] that contains this point on ([param p1], [param q1]) as well the accompanying point on ([param p2], [param q2]). */
        static getClosestPointsBetweenSegments(p1: Vector2, q1: Vector2, p2: Vector2, q2: Vector2): PackedVector2Array
        
        /** Returns the 2D point on the 2D segment ([param s1], [param s2]) that is closest to [param point]. The returned point will always be inside the specified segment. */
        static getClosestPointToSegment(point: Vector2, s1: Vector2, s2: Vector2): Vector2
        
        /** Returns the 2D point on the 2D line defined by ([param s1], [param s2]) that is closest to [param point]. The returned point can be inside the segment ([param s1], [param s2]) or outside of it, i.e. somewhere on the line extending from the segment. */
        static getClosestPointToSegmentUncapped(point: Vector2, s1: Vector2, s2: Vector2): Vector2
        
        /** Returns if [param point] is inside the triangle specified by [param a], [param b] and [param c]. */
        static pointIsInsideTriangle(point: Vector2, a: Vector2, b: Vector2, c: Vector2): boolean
        
        /** Returns `true` if [param polygon]'s vertices are ordered in clockwise order, otherwise returns `false`.  
         *      
         *  **Note:** Assumes a Cartesian coordinate system where `+x` is right and `+y` is up. If using screen coordinates (`+y` is down), the result will need to be flipped (i.e. a `true` result will indicate counter-clockwise).  
         */
        static isPolygonClockwise(polygon: PackedVector2Array | Vector2[]): boolean
        
        /** Returns `true` if [param point] is inside [param polygon] or if it's located exactly  *on*  polygon's boundary, otherwise returns `false`. */
        static isPointInPolygon(point: Vector2, polygon: PackedVector2Array | Vector2[]): boolean
        
        /** Triangulates the polygon specified by the points in [param polygon]. Returns a [PackedInt32Array] where each triangle consists of three consecutive point indices into [param polygon] (i.e. the returned array will have `n * 3` elements, with `n` being the number of found triangles). Output triangles will always be counter clockwise, and the contour will be flipped if it's clockwise. If the triangulation did not succeed, an empty [PackedInt32Array] is returned. */
        static triangulatePolygon(polygon: PackedVector2Array | Vector2[]): PackedInt32Array
        
        /** Triangulates the area specified by discrete set of [param points] such that no point is inside the circumcircle of any resulting triangle. Returns a [PackedInt32Array] where each triangle consists of three consecutive point indices into [param points] (i.e. the returned array will have `n * 3` elements, with `n` being the number of found triangles). If the triangulation did not succeed, an empty [PackedInt32Array] is returned. */
        static triangulateDelaunay(points: PackedVector2Array | Vector2[]): PackedInt32Array
        
        /** Given an array of [Vector2]s, returns the convex hull as a list of points in counterclockwise order. The last point is the same as the first one. */
        static convexHull(points: PackedVector2Array | Vector2[]): PackedVector2Array
        
        /** Decomposes the [param polygon] into multiple convex hulls and returns an array of [PackedVector2Array]. */
        static decomposePolygonInConvex(polygon: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Merges (combines) [param polygon_a] and [param polygon_b] and returns an array of merged polygons. This performs [constant OPERATION_UNION] between polygons.  
         *  The operation may result in an outer polygon (boundary) and multiple inner polygons (holes) produced which could be distinguished by calling [method is_polygon_clockwise].  
         */
        static mergePolygons(polygonA: PackedVector2Array | Vector2[], polygonB: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Clips [param polygon_a] against [param polygon_b] and returns an array of clipped polygons. This performs [constant OPERATION_DIFFERENCE] between polygons. Returns an empty array if [param polygon_b] completely overlaps [param polygon_a].  
         *  If [param polygon_b] is enclosed by [param polygon_a], returns an outer polygon (boundary) and inner polygon (hole) which could be distinguished by calling [method is_polygon_clockwise].  
         */
        static clipPolygons(polygonA: PackedVector2Array | Vector2[], polygonB: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Intersects [param polygon_a] with [param polygon_b] and returns an array of intersected polygons. This performs [constant OPERATION_INTERSECTION] between polygons. In other words, returns common area shared by polygons. Returns an empty array if no intersection occurs.  
         *  The operation may result in an outer polygon (boundary) and inner polygon (hole) produced which could be distinguished by calling [method is_polygon_clockwise].  
         */
        static intersectPolygons(polygonA: PackedVector2Array | Vector2[], polygonB: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Mutually excludes common area defined by intersection of [param polygon_a] and [param polygon_b] (see [method intersect_polygons]) and returns an array of excluded polygons. This performs [constant OPERATION_XOR] between polygons. In other words, returns all but common area between polygons.  
         *  The operation may result in an outer polygon (boundary) and inner polygon (hole) produced which could be distinguished by calling [method is_polygon_clockwise].  
         */
        static excludePolygons(polygonA: PackedVector2Array | Vector2[], polygonB: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Clips [param polyline] against [param polygon] and returns an array of clipped polylines. This performs [constant OPERATION_DIFFERENCE] between the polyline and the polygon. This operation can be thought of as cutting a line with a closed shape. */
        static clipPolylineWithPolygon(polyline: PackedVector2Array | Vector2[], polygon: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Intersects [param polyline] with [param polygon] and returns an array of intersected polylines. This performs [constant OPERATION_INTERSECTION] between the polyline and the polygon. This operation can be thought of as chopping a line with a closed shape. */
        static intersectPolylineWithPolygon(polyline: PackedVector2Array | Vector2[], polygon: PackedVector2Array | Vector2[]): GArray<PackedVector2Array>
        
        /** Inflates or deflates [param polygon] by [param delta] units (pixels). If [param delta] is positive, makes the polygon grow outward. If [param delta] is negative, shrinks the polygon inward. Returns an array of polygons because inflating/deflating may result in multiple discrete polygons. Returns an empty array if [param delta] is negative and the absolute value of it approximately exceeds the minimum bounding rectangle dimensions of the polygon.  
         *  Each polygon's vertices will be rounded as determined by [param join_type].  
         *  The operation may result in an outer polygon (boundary) and inner polygon (hole) produced which could be distinguished by calling [method is_polygon_clockwise].  
         *      
         *  **Note:** To translate the polygon's vertices specifically, multiply them to a [Transform2D]:  
         *    
         */
        static offsetPolygon(polygon: PackedVector2Array | Vector2[], delta: float64, joinType?: Geometry2D.PolyJoinType /* = 0 */): GArray<PackedVector2Array>
        
        /** Inflates or deflates [param polyline] by [param delta] units (pixels), producing polygons. If [param delta] is positive, makes the polyline grow outward. Returns an array of polygons because inflating/deflating may result in multiple discrete polygons. If [param delta] is negative, returns an empty array.  
         *  Each polygon's vertices will be rounded as determined by [param join_type].  
         *  Each polygon's endpoints will be rounded as determined by [param end_type].  
         *  The operation may result in an outer polygon (boundary) and inner polygon (hole) produced which could be distinguished by calling [method is_polygon_clockwise].  
         */
        static offsetPolyline(polyline: PackedVector2Array | Vector2[], delta: float64, joinType?: Geometry2D.PolyJoinType /* = 0 */, endType?: Geometry2D.PolyEndType /* = 3 */): GArray<PackedVector2Array>
        
        /** Given an array of [Vector2]s representing tiles, builds an atlas. The returned dictionary has two keys: `points` is a [PackedVector2Array] that specifies the positions of each tile, `size` contains the overall size of the whole atlas as [Vector2i]. */
        static makeAtlas(sizes: PackedVector2Array | Vector2[]): GDictionary
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm]Bresenham line[/url] between the [param from] and [param to] points. A Bresenham line is a series of pixels that draws a line and is always 1-pixel thick on every row and column of the drawing (never more, never less).  
         *  Example code to draw a line between two [Marker2D] nodes using a series of [method CanvasItem.draw_rect] calls:  
         *    
         */
        static bresenhamLine(from: Vector2I, to: Vector2I): GArray<Vector2I>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapGeometry2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapGeometry2D;
    }
    // _singleton_class_: Geometry3D
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapGeometry3D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapGeometry3D extends __NameMapGObject {
        compute_convex_mesh_points: "computeConvexMeshPoints";
        build_box_planes: "buildBoxPlanes";
        build_cylinder_planes: "buildCylinderPlanes";
        build_capsule_planes: "buildCapsulePlanes";
        get_closest_points_between_segments: "getClosestPointsBetweenSegments";
        get_closest_point_to_segment: "getClosestPointToSegment";
        get_closest_point_to_segment_uncapped: "getClosestPointToSegmentUncapped";
        get_triangle_barycentric_coords: "getTriangleBarycentricCoords";
        ray_intersects_triangle: "rayIntersectsTriangle";
        segment_intersects_triangle: "segmentIntersectsTriangle";
        segment_intersects_sphere: "segmentIntersectsSphere";
        segment_intersects_cylinder: "segmentIntersectsCylinder";
        segment_intersects_convex: "segmentIntersectsConvex";
        clip_polygon: "clipPolygon";
        tetrahedralize_delaunay: "tetrahedralizeDelaunay";
    }
    /** Provides methods for some common 3D geometric operations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_geometry3d.html  
     */
    class Geometry3D extends GObject {
        /** Calculates and returns all the vertex points of a convex shape defined by an array of [param planes]. */
        static computeConvexMeshPoints(planes: GArray<Plane>): PackedVector3Array
        
        /** Returns an array with 6 [Plane]s that describe the sides of a box centered at the origin. The box size is defined by [param extents], which represents one (positive) corner of the box (i.e. half its actual size). */
        static buildBoxPlanes(extents: Vector3): GArray<Plane>
        
        /** Returns an array of [Plane]s closely bounding a faceted cylinder centered at the origin with radius [param radius] and height [param height]. The parameter [param sides] defines how many planes will be generated for the round part of the cylinder. The parameter [param axis] describes the axis along which the cylinder is oriented (0 for X, 1 for Y, 2 for Z). */
        static buildCylinderPlanes(radius: float64, height: float64, sides: int64, axis?: Vector3.Axis /* = 2 */): GArray<Plane>
        
        /** Returns an array of [Plane]s closely bounding a faceted capsule centered at the origin with radius [param radius] and height [param height]. The parameter [param sides] defines how many planes will be generated for the side part of the capsule, whereas [param lats] gives the number of latitudinal steps at the bottom and top of the capsule. The parameter [param axis] describes the axis along which the capsule is oriented (0 for X, 1 for Y, 2 for Z). */
        static buildCapsulePlanes(radius: float64, height: float64, sides: int64, lats: int64, axis?: Vector3.Axis /* = 2 */): GArray<Plane>
        
        /** Given the two 3D segments ([param p1], [param p2]) and ([param q1], [param q2]), finds those two points on the two segments that are closest to each other. Returns a [PackedVector3Array] that contains this point on ([param p1], [param p2]) as well the accompanying point on ([param q1], [param q2]). */
        static getClosestPointsBetweenSegments(p1: Vector3, p2: Vector3, q1: Vector3, q2: Vector3): PackedVector3Array
        
        /** Returns the 3D point on the 3D segment ([param s1], [param s2]) that is closest to [param point]. The returned point will always be inside the specified segment. */
        static getClosestPointToSegment(point: Vector3, s1: Vector3, s2: Vector3): Vector3
        
        /** Returns the 3D point on the 3D line defined by ([param s1], [param s2]) that is closest to [param point]. The returned point can be inside the segment ([param s1], [param s2]) or outside of it, i.e. somewhere on the line extending from the segment. */
        static getClosestPointToSegmentUncapped(point: Vector3, s1: Vector3, s2: Vector3): Vector3
        
        /** Returns a [Vector3] containing weights based on how close a 3D position ([param point]) is to a triangle's different vertices ([param a], [param b] and [param c]). This is useful for interpolating between the data of different vertices in a triangle. One example use case is using this to smoothly rotate over a mesh instead of relying solely on face normals.  
         *  [url=https://en.wikipedia.org/wiki/Barycentric_coordinate_system]Here is a more detailed explanation of barycentric coordinates.[/url]  
         */
        static getTriangleBarycentricCoords(point: Vector3, a: Vector3, b: Vector3, c: Vector3): Vector3
        
        /** Tests if the 3D ray starting at [param from] with the direction of [param dir] intersects the triangle specified by [param a], [param b] and [param c]. If yes, returns the point of intersection as [Vector3]. If no intersection takes place, returns `null`. */
        static rayIntersectsTriangle(from: Vector3, dir: Vector3, a: Vector3, b: Vector3, c: Vector3): any
        
        /** Tests if the segment ([param from], [param to]) intersects the triangle [param a], [param b], [param c]. If yes, returns the point of intersection as [Vector3]. If no intersection takes place, returns `null`. */
        static segmentIntersectsTriangle(from: Vector3, to: Vector3, a: Vector3, b: Vector3, c: Vector3): any
        
        /** Checks if the segment ([param from], [param to]) intersects the sphere that is located at [param sphere_position] and has radius [param sphere_radius]. If no, returns an empty [PackedVector3Array]. If yes, returns a [PackedVector3Array] containing the point of intersection and the sphere's normal at the point of intersection. */
        static segmentIntersectsSphere(from: Vector3, to: Vector3, spherePosition: Vector3, sphereRadius: float64): PackedVector3Array
        
        /** Checks if the segment ([param from], [param to]) intersects the cylinder with height [param height] that is centered at the origin and has radius [param radius]. If no, returns an empty [PackedVector3Array]. If an intersection takes place, the returned array contains the point of intersection and the cylinder's normal at the point of intersection. */
        static segmentIntersectsCylinder(from: Vector3, to: Vector3, height: float64, radius: float64): PackedVector3Array
        
        /** Given a convex hull defined though the [Plane]s in the array [param planes], tests if the segment ([param from], [param to]) intersects with that hull. If an intersection is found, returns a [PackedVector3Array] containing the point the intersection and the hull's normal. Otherwise, returns an empty array. */
        static segmentIntersectsConvex(from: Vector3, to: Vector3, planes: GArray<Plane>): PackedVector3Array
        
        /** Clips the polygon defined by the points in [param points] against the [param plane] and returns the points of the clipped polygon. */
        static clipPolygon(points: PackedVector3Array | Vector3[], plane: Plane): PackedVector3Array
        
        /** Tetrahedralizes the volume specified by a discrete set of [param points] in 3D space, ensuring that no point lies within the circumsphere of any resulting tetrahedron. The method returns a [PackedInt32Array] where each tetrahedron consists of four consecutive point indices into the [param points] array (resulting in an array with `n * 4` elements, where `n` is the number of tetrahedra found). If the tetrahedralization is unsuccessful, an empty [PackedInt32Array] is returned. */
        static tetrahedralizeDelaunay(points: PackedVector3Array | Vector3[]): PackedInt32Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapGeometry3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapGeometry3D;
    }
    // _singleton_class_: ResourceLoader
    namespace ResourceLoader {
        enum ThreadLoadStatus {
            ThreadLoadInvalidResource = 0,
            ThreadLoadInProgress = 1,
            ThreadLoadFailed = 2,
            ThreadLoadLoaded = 3,
        }
        enum CacheMode {
            CacheModeIgnore = 0,
            CacheModeReuse = 1,
            CacheModeReplace = 2,
            CacheModeIgnoreDeep = 3,
            CacheModeReplaceDeep = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceLoader extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceLoader extends __NameMapGObject {
        load_threaded_request: "loadThreadedRequest";
        load_threaded_get_status: "loadThreadedGetStatus";
        load_threaded_get: "loadThreadedGet";
        get_recognized_extensions_for_type: "getRecognizedExtensionsForType";
        add_resource_format_loader: "addResourceFormatLoader";
        remove_resource_format_loader: "removeResourceFormatLoader";
        set_abort_on_missing_resources: "setAbortOnMissingResources";
        get_dependencies: "getDependencies";
        has_cached: "hasCached";
        get_cached_ref: "getCachedRef";
        get_resource_uid: "getResourceUid";
        get_resource_type: "getResourceType";
        list_directory: "listDirectory";
    }
    /** A singleton for loading resource files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceloader.html  
     */
    class ResourceLoader extends GObject {
        /** Loads the resource using threads. If [param use_sub_threads] is `true`, multiple threads will be used to load the resource, which makes loading faster, but may affect the main thread (and thus cause game slowdowns).  
         *  The [param cache_mode] parameter defines whether and how the cache should be used or updated when loading the resource.  
         */
        static loadThreadedRequest(path: string, typeHint?: string /* = '' */, useSubThreads?: boolean /* = false */, cacheMode?: ResourceLoader.CacheMode /* = 1 */): GError
        
        /** Returns the status of a threaded loading operation started with [method load_threaded_request] for the resource at [param path].  
         *  An array variable can optionally be passed via [param progress], and will return a one-element array containing the ratio of completion of the threaded loading (between `0.0` and `1.0`).  
         *      
         *  **Note:** The recommended way of using this method is to call it during different frames (e.g., in [method Node._process], instead of a loop).  
         */
        static loadThreadedGetStatus(path: string, progress?: GArray): ResourceLoader.ThreadLoadStatus
        
        /** Returns the resource loaded by [method load_threaded_request].  
         *  If this is called before the loading thread is done (i.e. [method load_threaded_get_status] is not [constant THREAD_LOAD_LOADED]), the calling thread will be blocked until the resource has finished loading. However, it's recommended to use [method load_threaded_get_status] to known when the load has actually completed.  
         */
        static loadThreadedGet<Path extends keyof ResourceTypes>(path: Path): ResourceTypes[Path]
        static loadThreadedGet(path: string): Resource
        
        /** Loads a resource at the given [param path], caching the result for further access.  
         *  The registered [ResourceFormatLoader]s are queried sequentially to find the first one which can handle the file's extension, and then attempt loading. If loading fails, the remaining ResourceFormatLoaders are also attempted.  
         *  An optional [param type_hint] can be used to further specify the [Resource] type that should be handled by the [ResourceFormatLoader]. Anything that inherits from [Resource] can be used as a type hint, for example [Image].  
         *  The [param cache_mode] property defines whether and how the cache should be used or updated when loading the resource.  
         *  Returns an empty resource if no [ResourceFormatLoader] could handle the file, and prints an error if no file is found at the specified path.  
         *  GDScript has a simplified [method @GDScript.load] built-in method which can be used in most situations, leaving the use of [ResourceLoader] for more advanced scenarios.  
         *      
         *  **Note:** If [member ProjectSettings.editor/export/convert_text_resources_to_binary] is `true`, [method @GDScript.load] will not be able to read converted files in an exported project. If you rely on run-time loading of files present within the PCK, set [member ProjectSettings.editor/export/convert_text_resources_to_binary] to `false`.  
         *      
         *  **Note:** Relative paths will be prefixed with `"res://"` before loading, to avoid unexpected results make sure your paths are absolute.  
         */
        static load<Path extends keyof ResourceTypes>(path: Path, typeHint?: string /* = "" */, cacheMode?: ResourceLoader.CacheMode /* = 1 */): ResourceTypes[Path]
        static load(path: string, typeHint?: string /* = "" */, cacheMode?: ResourceLoader.CacheMode /* = 1 */): Resource
        
        /** Returns the list of recognized extensions for a resource type. */
        static getRecognizedExtensionsForType(type: string): PackedStringArray
        
        /** Registers a new [ResourceFormatLoader]. The ResourceLoader will use the ResourceFormatLoader as described in [method load].  
         *  This method is performed implicitly for ResourceFormatLoaders written in GDScript (see [ResourceFormatLoader] for more information).  
         */
        static addResourceFormatLoader(formatLoader: ResourceFormatLoader, atFront?: boolean /* = false */): void
        
        /** Unregisters the given [ResourceFormatLoader]. */
        static removeResourceFormatLoader(formatLoader: ResourceFormatLoader): void
        
        /** Changes the behavior on missing sub-resources. The default behavior is to abort loading. */
        static setAbortOnMissingResources(abort: boolean): void
        
        /** Returns the dependencies for the resource at the given [param path].  
         *  Each dependency is a string that can be divided into sections by `::`. There can be either one section or three sections, with the second section always being empty. When there is one section, it contains the file path. When there are three sections, the first section contains the UID and the third section contains the fallback path.  
         *    
         */
        static getDependencies(path: string): PackedStringArray
        
        /** Returns whether a cached resource is available for the given [param path].  
         *  Once a resource has been loaded by the engine, it is cached in memory for faster access, and future calls to the [method load] method will use the cached version. The cached resource can be overridden by using [method Resource.take_over_path] on a new resource for that same path.  
         */
        static hasCached(path: string): boolean
        
        /** Returns the cached resource reference for the given [param path].  
         *      
         *  **Note:** If the resource is not cached, the returned [Resource] will be invalid.  
         */
        static getCachedRef(path: string): null | Resource
        
        /** Returns whether a recognized resource exists for the given [param path].  
         *  An optional [param type_hint] can be used to further specify the [Resource] type that should be handled by the [ResourceFormatLoader]. Anything that inherits from [Resource] can be used as a type hint, for example [Image].  
         *      
         *  **Note:** If you use [method Resource.take_over_path], this method will return `true` for the taken path even if the resource wasn't saved (i.e. exists only in resource cache).  
         */
        static exists(path: string, typeHint?: string /* = '' */): boolean
        
        /** Returns the ID associated with a given resource path, or `-1` when no such ID exists. */
        static getResourceUid(path: string): int64
        
        /** Returns the resource type associated with a given resource path. */
        static getResourceType(path: string): string
        
        /** Lists a directory, returning all resources and subdirectories contained within. The resource files have the original file names as visible in the editor before exporting. The directories have `"/"` appended.  
         *    
         *      
         *  **Note:** The order of files and directories returned by this method is not deterministic, and can vary between operating systems.  
         *      
         *  **Note:** To normally traverse the filesystem, see [DirAccess].  
         */
        static listDirectory(directoryPath: string): PackedStringArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceLoader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceLoader;
    }
    // _singleton_class_: ResourceSaver
    namespace ResourceSaver {
        enum SaverFlags {
            FlagNone = 0,
            FlagRelativePaths = 1,
            FlagBundleResources = 2,
            FlagChangePath = 4,
            FlagOmitEditorProperties = 8,
            FlagSaveBigEndian = 16,
            FlagCompress = 32,
            FlagReplaceSubresourcePaths = 64,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceSaver extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceSaver extends __NameMapGObject {
        set_uid: "setUid";
        get_recognized_extensions: "getRecognizedExtensions";
        add_resource_format_saver: "addResourceFormatSaver";
        remove_resource_format_saver: "removeResourceFormatSaver";
        get_resource_id_for_path: "getResourceIdForPath";
    }
    /** A singleton for saving [Resource]s to the filesystem.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourcesaver.html  
     */
    class ResourceSaver extends GObject {
        /** Saves a resource to disk to the given path, using a [ResourceFormatSaver] that recognizes the resource object. If [param path] is empty, [ResourceSaver] will try to use [member Resource.resource_path].  
         *  The [param flags] bitmask can be specified to customize the save behavior.  
         *  Returns [constant OK] on success.  
         *      
         *  **Note:** When the project is running, any generated UID associated with the resource will not be saved as the required code is only executed in editor mode.  
         */
        static save(resource: Resource, path?: string /* = '' */, flags?: ResourceSaver.SaverFlags /* = 0 */): GError
        
        /** Sets the UID of the given [param resource] path to [param uid]. You can generate a new UID using [method ResourceUID.create_id].  
         *  Since resources will normally get a UID automatically, this method is only useful in very specific cases.  
         */
        static setUid(resource: string, uid: int64): GError
        
        /** Returns the list of extensions available for saving a resource of a given type. */
        static getRecognizedExtensions(type: Resource): PackedStringArray
        
        /** Registers a new [ResourceFormatSaver]. The ResourceSaver will use the ResourceFormatSaver as described in [method save].  
         *  This method is performed implicitly for ResourceFormatSavers written in GDScript (see [ResourceFormatSaver] for more information).  
         */
        static addResourceFormatSaver(formatSaver: ResourceFormatSaver, atFront?: boolean /* = false */): void
        
        /** Unregisters the given [ResourceFormatSaver]. */
        static removeResourceFormatSaver(formatSaver: ResourceFormatSaver): void
        
        /** Returns the resource ID for the given path. If [param generate] is `true`, a new resource ID will be generated if one for the path is not found. If [param generate] is `false` and the path is not found, [constant ResourceUID.INVALID_ID] is returned. */
        static getResourceIdForPath(path: string, generate?: boolean /* = false */): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceSaver;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceSaver;
    }
    // _singleton_class_: Marshalls
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMarshalls extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMarshalls extends __NameMapGObject {
        variant_to_base64: "variantToBase64";
        base64_to_variant: "base64ToVariant";
        raw_to_base64: "rawToBase64";
        base64_to_raw: "base64ToRaw";
        utf8_to_base64: "utf8ToBase64";
        base64_to_utf8: "base64ToUtf8";
    }
    /** Data transformation (marshaling) and encoding helpers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_marshalls.html  
     */
    class Marshalls extends GObject {
        /** Returns a Base64-encoded string of the [Variant] [param variant]. If [param full_objects] is `true`, encoding objects is allowed (and can potentially include code).  
         *  Internally, this uses the same encoding mechanism as the [method @GlobalScope.var_to_bytes] method.  
         */
        static variantToBase64(variant: any, fullObjects?: boolean /* = false */): string
        
        /** Returns a decoded [Variant] corresponding to the Base64-encoded string [param base64_str]. If [param allow_objects] is `true`, decoding objects is allowed.  
         *  Internally, this uses the same decoding mechanism as the [method @GlobalScope.bytes_to_var] method.  
         *  **Warning:** Deserialized objects can contain code which gets executed. Do not use this option if the serialized object comes from untrusted sources to avoid potential security threats such as remote code execution.  
         */
        static base64ToVariant(base64Str: string, allowObjects?: boolean /* = false */): any
        
        /** Returns a Base64-encoded string of a given [PackedByteArray]. */
        static rawToBase64(array: PackedByteArray | byte[] | ArrayBuffer): string
        
        /** Returns a decoded [PackedByteArray] corresponding to the Base64-encoded string [param base64_str]. */
        static base64ToRaw(base64Str: string): PackedByteArray
        
        /** Returns a Base64-encoded string of the UTF-8 string [param utf8_str]. */
        static utf8ToBase64(utf8Str: string): string
        
        /** Returns a decoded string corresponding to the Base64-encoded string [param base64_str]. */
        static base64ToUtf8(base64Str: string): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMarshalls;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMarshalls;
    }
    // _singleton_class_: TranslationServer
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTranslationServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTranslationServer extends __NameMapGObject {
        set_locale: "setLocale";
        get_locale: "getLocale";
        get_tool_locale: "getToolLocale";
        compare_locales: "compareLocales";
        standardize_locale: "standardizeLocale";
        get_all_languages: "getAllLanguages";
        get_language_name: "getLanguageName";
        get_all_scripts: "getAllScripts";
        get_script_name: "getScriptName";
        get_all_countries: "getAllCountries";
        get_country_name: "getCountryName";
        get_locale_name: "getLocaleName";
        get_plural_rules: "getPluralRules";
        translate_plural: "translatePlural";
        add_translation: "addTranslation";
        remove_translation: "removeTranslation";
        get_translation_object: "getTranslationObject";
        get_translations: "getTranslations";
        find_translations: "findTranslations";
        has_translation_for_locale: "hasTranslationForLocale";
        has_translation: "hasTranslation";
        has_domain: "hasDomain";
        get_or_add_domain: "getOrAddDomain";
        remove_domain: "removeDomain";
        get_loaded_locales: "getLoadedLocales";
        format_number: "formatNumber";
        get_percent_sign: "getPercentSign";
        parse_number: "parseNumber";
        reload_pseudolocalization: "reloadPseudolocalization";
        pseudolocalization_enabled: "pseudolocalizationEnabled";
    }
    /** The server responsible for language translations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_translationserver.html  
     */
    class TranslationServer extends GObject {
        /** Sets the locale of the project. The [param locale] string will be standardized to match known locales (e.g. `en-US` would be matched to `en_US`).  
         *  If translations have been loaded beforehand for the new locale, they will be applied.  
         */
        static setLocale(locale: string): void
        
        /** Returns the current locale of the project.  
         *  See also [method OS.get_locale] and [method OS.get_locale_language] to query the locale of the user system.  
         */
        static getLocale(): string
        
        /** Returns the current locale of the editor.  
         *      
         *  **Note:** When called from an exported project returns the same value as [method get_locale].  
         */
        static getToolLocale(): string
        
        /** Compares two locales and returns a similarity score between `0` (no match) and `10` (full match). */
        static compareLocales(localeA: string, localeB: string): int64
        
        /** Returns a [param locale] string standardized to match known locales (e.g. `en-US` would be matched to `en_US`). If [param add_defaults] is `true`, the locale may have a default script or country added. */
        static standardizeLocale(locale: string, addDefaults?: boolean /* = false */): string
        
        /** Returns array of known language codes. */
        static getAllLanguages(): PackedStringArray
        
        /** Returns a readable language name for the [param language] code. */
        static getLanguageName(language: string): string
        
        /** Returns an array of known script codes. */
        static getAllScripts(): PackedStringArray
        
        /** Returns a readable script name for the [param script] code. */
        static getScriptName(script: string): string
        
        /** Returns an array of known country codes. */
        static getAllCountries(): PackedStringArray
        
        /** Returns a readable country name for the [param country] code. */
        static getCountryName(country: string): string
        
        /** Returns a locale's language and its variant (e.g. `"en_US"` would return `"English (United States)"`). */
        static getLocaleName(locale: string): string
        
        /** Returns the default plural rules for the [param locale]. */
        static getPluralRules(locale: string): string
        
        /** Returns the current locale's translation for the given message and context.  
         *      
         *  **Note:** This method always uses the main translation domain.  
         */
        static translate(message: StringName, context?: StringName /* = '' */): StringName
        
        /** Returns the current locale's translation for the given message, plural message and context.  
         *  The number [param n] is the number or quantity of the plural object. It will be used to guide the translation system to fetch the correct plural form for the selected language.  
         *      
         *  **Note:** This method always uses the main translation domain.  
         */
        static translatePlural(message: StringName, pluralMessage: StringName, n: int64, context?: StringName /* = '' */): StringName
        
        /** Adds a translation to the main translation domain. */
        static addTranslation(translation: Translation): void
        
        /** Removes the given translation from the main translation domain. */
        static removeTranslation(translation: Translation): void
        
        /** Returns the [Translation] instance that best matches [param locale] in the main translation domain. Returns `null` if there are no matches. */
        static getTranslationObject(locale: string): null | Translation
        
        /** Returns all available [Translation] instances in the main translation domain as added by [method add_translation]. */
        static getTranslations(): GArray<Translation>
        
        /** Returns the [Translation] instances in the main translation domain that match [param locale] (see [method compare_locales]). If [param exact] is `true`, only instances whose locale exactly equals [param locale] will be returned. */
        static findTranslations(locale: string, exact: boolean): GArray<Translation>
        
        /** Returns `true` if there are any [Translation] instances in the main translation domain that match [param locale] (see [method compare_locales]). If [param exact] is `true`, only instances whose locale exactly equals [param locale] are considered. */
        static hasTranslationForLocale(locale: string, exact: boolean): boolean
        
        /** Returns `true` if the main translation domain contains the given [param translation]. */
        static hasTranslation(translation: Translation): boolean
        
        /** Returns `true` if a translation domain with the specified name exists. */
        static hasDomain(domain: StringName): boolean
        
        /** Returns the translation domain with the specified name. An empty translation domain will be created and added if it does not exist. */
        static getOrAddDomain(domain: StringName): null | TranslationDomain
        
        /** Removes the translation domain with the specified name.  
         *      
         *  **Note:** Trying to remove the main translation domain is an error.  
         */
        static removeDomain(domain: StringName): void
        
        /** Removes all translations from the main translation domain. */
        static clear(): void
        
        /** Returns an array of all loaded locales of the project. */
        static getLoadedLocales(): PackedStringArray
        
        /** Converts a number from Western Arabic (0..9) to the numeral system used in the given [param locale]. */
        static formatNumber(number: string, locale: string): string
        
        /** Returns the percent sign used in the given [param locale]. */
        static getPercentSign(locale: string): string
        
        /** Converts [param number] from the numeral system used in the given [param locale] to Western Arabic (0..9). */
        static parseNumber(number: string, locale: string): string
        
        /** Reparses the pseudolocalization options and reloads the translation for the main translation domain. */
        static reloadPseudolocalization(): void
        
        /** Returns the pseudolocalized string based on the [param message] passed in.  
         *      
         *  **Note:** This method always uses the main translation domain.  
         */
        static pseudolocalize(message: StringName): StringName
        
        /** If `true`, enables the use of pseudolocalization on the main translation domain. See [member ProjectSettings.internationalization/pseudolocalization/use_pseudolocalization] for details. */
        static get pseudolocalizationEnabled(): boolean
        static set pseudolocalizationEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTranslationServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTranslationServer;
    }
    // _singleton_class_: Input
    namespace Input {
        enum MouseMode {
            MouseModeVisible = 0,
            MouseModeHidden = 1,
            MouseModeCaptured = 2,
            MouseModeConfined = 3,
            MouseModeConfinedHidden = 4,
            MouseModeMax = 5,
        }
        enum CursorShape {
            CursorArrow = 0,
            CursorIbeam = 1,
            CursorPointingHand = 2,
            CursorCross = 3,
            CursorWait = 4,
            CursorBusy = 5,
            CursorDrag = 6,
            CursorCanDrop = 7,
            CursorForbidden = 8,
            CursorVsize = 9,
            CursorHsize = 10,
            CursorBdiagsize = 11,
            CursorFdiagsize = 12,
            CursorMove = 13,
            CursorVsplit = 14,
            CursorHsplit = 15,
            CursorHelp = 16,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapInput extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapInput extends __NameMapGObject {
        is_anything_pressed: "isAnythingPressed";
        is_key_pressed: "isKeyPressed";
        is_physical_key_pressed: "isPhysicalKeyPressed";
        is_key_label_pressed: "isKeyLabelPressed";
        is_mouse_button_pressed: "isMouseButtonPressed";
        is_joy_button_pressed: "isJoyButtonPressed";
        is_action_pressed: "isActionPressed";
        is_action_just_pressed: "isActionJustPressed";
        is_action_just_released: "isActionJustReleased";
        is_action_just_pressed_by_event: "isActionJustPressedByEvent";
        is_action_just_released_by_event: "isActionJustReleasedByEvent";
        get_action_strength: "getActionStrength";
        get_action_raw_strength: "getActionRawStrength";
        get_axis: "getAxis";
        get_vector: "getVector";
        add_joy_mapping: "addJoyMapping";
        remove_joy_mapping: "removeJoyMapping";
        is_joy_known: "isJoyKnown";
        get_joy_axis: "getJoyAxis";
        get_joy_name: "getJoyName";
        get_joy_guid: "getJoyGuid";
        get_joy_info: "getJoyInfo";
        should_ignore_device: "shouldIgnoreDevice";
        get_connected_joypads: "getConnectedJoypads";
        get_joy_vibration_strength: "getJoyVibrationStrength";
        get_joy_vibration_duration: "getJoyVibrationDuration";
        get_joy_vibration_remaining_duration: "getJoyVibrationRemainingDuration";
        is_joy_vibrating: "isJoyVibrating";
        has_joy_vibration: "hasJoyVibration";
        start_joy_vibration: "startJoyVibration";
        stop_joy_vibration: "stopJoyVibration";
        vibrate_handheld: "vibrateHandheld";
        get_gravity: "getGravity";
        get_accelerometer: "getAccelerometer";
        get_magnetometer: "getMagnetometer";
        get_gyroscope: "getGyroscope";
        get_device_orientation: "getDeviceOrientation";
        get_joy_accelerometer: "getJoyAccelerometer";
        get_joy_gravity: "getJoyGravity";
        get_joy_gyroscope: "getJoyGyroscope";
        get_joy_motion_sensors_rate: "getJoyMotionSensorsRate";
        is_joy_motion_sensors_enabled: "isJoyMotionSensorsEnabled";
        set_joy_motion_sensors_enabled: "setJoyMotionSensorsEnabled";
        has_joy_motion_sensors: "hasJoyMotionSensors";
        start_joy_motion_sensors_calibration: "startJoyMotionSensorsCalibration";
        stop_joy_motion_sensors_calibration: "stopJoyMotionSensorsCalibration";
        clear_joy_motion_sensors_calibration: "clearJoyMotionSensorsCalibration";
        get_joy_motion_sensors_calibration: "getJoyMotionSensorsCalibration";
        set_joy_motion_sensors_calibration: "setJoyMotionSensorsCalibration";
        is_joy_motion_sensors_calibrated: "isJoyMotionSensorsCalibrated";
        is_joy_motion_sensors_calibrating: "isJoyMotionSensorsCalibrating";
        set_joy_motion_sensors_auto_calibration_enabled: "setJoyMotionSensorsAutoCalibrationEnabled";
        is_joy_motion_sensors_auto_calibration_enabled: "isJoyMotionSensorsAutoCalibrationEnabled";
        get_joy_touchpad_finger_position: "getJoyTouchpadFingerPosition";
        get_joy_touchpad_finger_pressure: "getJoyTouchpadFingerPressure";
        get_joy_touchpad_fingers: "getJoyTouchpadFingers";
        get_joy_num_touchpads: "getJoyNumTouchpads";
        set_gravity: "setGravity";
        set_accelerometer: "setAccelerometer";
        set_magnetometer: "setMagnetometer";
        set_gyroscope: "setGyroscope";
        set_device_orientation: "setDeviceOrientation";
        set_joy_light: "setJoyLight";
        has_joy_light: "hasJoyLight";
        get_last_mouse_velocity: "getLastMouseVelocity";
        get_last_mouse_screen_velocity: "getLastMouseScreenVelocity";
        get_mouse_button_mask: "getMouseButtonMask";
        warp_mouse: "warpMouse";
        action_press: "actionPress";
        action_release: "actionRelease";
        set_default_cursor_shape: "setDefaultCursorShape";
        get_current_cursor_shape: "getCurrentCursorShape";
        set_custom_mouse_cursor: "setCustomMouseCursor";
        parse_input_event: "parseInputEvent";
        flush_buffered_events: "flushBufferedEvents";
        mouse_mode: "mouseMode";
        use_accumulated_input: "useAccumulatedInput";
        emulate_mouse_from_touch: "emulateMouseFromTouch";
        emulate_touch_from_mouse: "emulateTouchFromMouse";
        ignore_joypad_on_unfocused_application: "ignoreJoypadOnUnfocusedApplication";
        joy_connection_changed: "joyConnectionChanged";
    }
    /** A singleton for handling inputs.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_input.html  
     */
    class Input extends GObject {
        /** Returns `true` if any action, key, joypad button, or mouse button is being pressed. This will also return `true` if any action is simulated via code by calling [method action_press]. */
        static isAnythingPressed(): boolean
        
        /** Returns `true` if you are pressing the Latin key in the current keyboard layout. You can pass a [enum Key] constant.  
         *  [method is_key_pressed] is only recommended over [method is_physical_key_pressed] in non-game applications. This ensures that shortcut keys behave as expected depending on the user's keyboard layout, as keyboard shortcuts are generally dependent on the keyboard layout in non-game applications. If in doubt, use [method is_physical_key_pressed].  
         *      
         *  **Note:** Due to keyboard ghosting, [method is_key_pressed] may return `false` even if one of the action's keys is pressed. See [url=https://docs.godotengine.org/en/latest/tutorials/inputs/input_examples.html#keyboard-events]Input examples[/url] in the documentation for more information.  
         *      
         *  **Note:** If you want to check if a key was just pressed by using its keycode, use Godot's input action system with [method is_action_just_pressed] or use the [method Node._input] method like this instead:  
         *    
         */
        static isKeyPressed(keycode: Key): boolean
        
        /** Returns `true` if you are pressing the key in the physical location on the 101/102-key US QWERTY keyboard. You can pass a [enum Key] constant.  
         *  [method is_physical_key_pressed] is recommended over [method is_key_pressed] for in-game actions, as it will make [kbd]W[/kbd]/[kbd]A[/kbd]/[kbd]S[/kbd]/[kbd]D[/kbd] layouts work regardless of the user's keyboard layout. [method is_physical_key_pressed] will also ensure that the top row number keys work on any keyboard layout. If in doubt, use [method is_physical_key_pressed].  
         *      
         *  **Note:** Due to keyboard ghosting, [method is_physical_key_pressed] may return `false` even if one of the action's keys is pressed. See [url=https://docs.godotengine.org/en/latest/tutorials/inputs/input_examples.html#keyboard-events]Input examples[/url] in the documentation for more information.  
         *      
         *  **Note:** If you want to check if a key was just pressed by using its physical keycode, use Godot's input action system with [method is_action_just_pressed] or use the [method Node._input] method like this instead:  
         *    
         */
        static isPhysicalKeyPressed(keycode: Key): boolean
        
        /** Returns `true` if you are pressing the key with the [param keycode] printed on it. You can pass a [enum Key] constant or any Unicode character code.  
         *      
         *  **Note:** If you want to check if a key was just pressed by using its label, use Godot's input action system with [method is_action_just_pressed] or use the [method Node._input] method like this instead:  
         *    
         */
        static isKeyLabelPressed(keycode: Key): boolean
        
        /** Returns `true` if you are pressing the mouse button specified with [enum MouseButton].  
         *      
         *  **Note:** If you want to check if a mouse button was just pressed, use Godot's input action system with [method is_action_just_pressed] or use the [method Node._input] method like this instead:  
         *    
         */
        static isMouseButtonPressed(button: MouseButton): boolean
        
        /** Returns `true` if you are pressing the joypad button at index [param button].  
         *      
         *  **Note:** If you want to check if a joypad button was just pressed, use Godot's input action system with [method is_action_just_pressed] or use the [method Node._input] method like this instead:  
         *    
         */
        static isJoyButtonPressed(device: int64, button: JoyButton): boolean
        
        /** Returns `true` if you are pressing the action event.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         *      
         *  **Note:** Due to keyboard ghosting, [method is_action_pressed] may return `false` even if one of the action's keys is pressed. See [url=https://docs.godotengine.org/en/latest/tutorials/inputs/input_examples.html#keyboard-events]Input examples[/url] in the documentation for more information.  
         */
        static isActionPressed(action: InputActionName, exactMatch?: boolean /* = false */): boolean
        
        /** Returns `true` when the user has  *started*  pressing the action event in the current frame or physics tick. It will only return `true` on the frame or tick that the user pressed down the button.  
         *  This is useful for code that needs to run only once when an action is pressed, instead of every frame while it's pressed.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         *      
         *  **Note:** Returning `true` does not imply that the action is  *still*  pressed. An action can be pressed and released again rapidly, and `true` will still be returned so as not to miss input.  
         *      
         *  **Note:** Due to keyboard ghosting, [method is_action_just_pressed] may return `false` even if one of the action's keys is pressed. See [url=https://docs.godotengine.org/en/latest/tutorials/inputs/input_examples.html#keyboard-events]Input examples[/url] in the documentation for more information.  
         *      
         *  **Note:** During input handling (e.g. [method Node._input]), use [method InputEvent.is_action_pressed] instead to query the action state of the current event. See also [method is_action_just_pressed_by_event].  
         */
        static isActionJustPressed(action: InputActionName, exactMatch?: boolean /* = false */): boolean
        
        /** Returns `true` when the user  *stops*  pressing the action event in the current frame or physics tick. It will only return `true` on the frame or tick that the user releases the button.  
         *      
         *  **Note:** Returning `true` does not imply that the action is  *still*  not pressed. An action can be released and pressed again rapidly, and `true` will still be returned so as not to miss input.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         *      
         *  **Note:** During input handling (e.g. [method Node._input]), use [method InputEvent.is_action_released] instead to query the action state of the current event. See also [method is_action_just_released_by_event].  
         */
        static isActionJustReleased(action: InputActionName, exactMatch?: boolean /* = false */): boolean
        
        /** Returns `true` when the user has  *started*  pressing the action event in the current frame or physics tick, and the first event that triggered action press in the current frame/physics tick was [param event]. It will only return `true` on the frame or tick that the user pressed down the button.  
         *  This is useful for code that needs to run only once when an action is pressed, and the action is processed during input handling (e.g. [method Node._input]).  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         *      
         *  **Note:** Returning `true` does not imply that the action is  *still*  pressed. An action can be pressed and released again rapidly, and `true` will still be returned so as not to miss input.  
         *      
         *  **Note:** Due to keyboard ghosting, [method is_action_just_pressed] may return `false` even if one of the action's keys is pressed. See [url=https://docs.godotengine.org/en/latest/tutorials/inputs/input_examples.html#keyboard-events]Input examples[/url] in the documentation for more information.  
         */
        static isActionJustPressedByEvent(action: StringName, event: InputEvent, exactMatch?: boolean /* = false */): boolean
        
        /** Returns `true` when the user  *stops*  pressing the action event in the current frame or physics tick, and the first event that triggered action release in the current frame/physics tick was [param event]. It will only return `true` on the frame or tick that the user releases the button.  
         *  This is useful when an action is processed during input handling (e.g. [method Node._input]).  
         *      
         *  **Note:** Returning `true` does not imply that the action is  *still*  not pressed. An action can be released and pressed again rapidly, and `true` will still be returned so as not to miss input.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         */
        static isActionJustReleasedByEvent(action: StringName, event: InputEvent, exactMatch?: boolean /* = false */): boolean
        
        /** Returns a value between `0.0` and `1.0` representing the intensity of the given action. In a joypad, for example, the further away the axis (analog sticks or L2, R2 triggers) is from the dead zone, the closer the value will be to `1.0`. If the action is mapped to a control that has no axis such as the keyboard, the value returned will be `0.0` or `1.0`.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         */
        static getActionStrength(action: InputActionName, exactMatch?: boolean /* = false */): float64
        
        /** Returns a value between `0.0` and `1.0` representing the raw intensity of the given action, ignoring the action's deadzone. In most cases, you should use [method get_action_strength] instead.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         */
        static getActionRawStrength(action: InputActionName, exactMatch?: boolean /* = false */): float64
        
        /** Returns axis input value by specifying two actions, one negative and one positive.  
         *  This is a shorthand for writing `Input.get_action_strength("positive_action") - Input.get_action_strength("negative_action")`.  
         */
        static getAxis(negativeAction: InputActionName, positiveAction: InputActionName): float64
        
        /** Returns an input vector by specifying four actions for the positive and negative X and Y axes.  
         *  This method is useful when getting vector input, such as from a joystick, directional pad, arrows, or WASD. The vector has its length limited to `1.0` and has a circular deadzone, which is useful for using vector input as movement.  
         *  By default, the deadzone is automatically calculated from the average of the action deadzones. However, you can override the deadzone to be whatever you want (on the range of `0.0` to `1.0`).  
         */
        static getVector(negativeX: InputActionName, positiveX: InputActionName, negativeY: InputActionName, positiveY: InputActionName, deadzone?: float64 /* = -1 */): Vector2
        
        /** Adds a new joypad mapping entry (in SDL format) to the mapping database, and optionally updates the already connected devices.  
         *      
         *  **Note:** See [url=https://wiki.libsdl.org/SDL3/SDL_AddGamepadMapping#remarks]SDL documentation[/url] for more information about the SDL controller mapping format.  
         */
        static addJoyMapping(mapping: string, updateExisting?: boolean /* = false */): void
        
        /** Removes all mappings from the internal database that match the given GUID. All currently connected joypads that use this GUID will become unmapped.  
         *  On Android, Godot will map to an internal fallback mapping.  
         */
        static removeJoyMapping(guid: string): void
        
        /** Returns `true` if the system knows the specified device. This means that it sets all button and axis indices. Unknown joypads are not expected to match these constants, but you can still retrieve events from them. */
        static isJoyKnown(device: int64): boolean
        
        /** Returns the current value of the joypad axis at index [param axis]. */
        static getJoyAxis(device: int64, axis: JoyAxis): float64
        
        /** Returns the name of the joypad at the specified device index, e.g. `PS4 Controller`. Godot uses the [url=https://github.com/gabomdq/SDL_GameControllerDB]SDL game controller database[/url] to determine gamepad names. */
        static getJoyName(device: int64): string
        
        /** Returns an SDL-compatible device GUID on platforms that use gamepad remapping, e.g. `030000004c050000c405000000010000`. Returns an empty string if it cannot be found. Godot uses SDL's internal mappings, supplemented by community-contributed mappings, to determine gamepad names and mappings based on this GUID. */
        static getJoyGuid(device: int64): string
        
        /** Returns a dictionary with extra platform-specific information about the device, e.g. the raw gamepad name from the OS or the Steam Input index.  
         *  On Windows, Linux, macOS, and iOS, the dictionary contains the following fields:  
         *  `raw_name`: The name of the controller as it came from the OS, before getting renamed by the controller database.  
         *  `vendor_id`: The USB vendor ID of the device.  
         *  `product_id`: The USB product ID of the device.  
         *  `serial_number`: The serial number of the device. This key won't be present if the serial number is unavailable.  
         *  The dictionary can also include the following fields under selected platforms:  
         *  `steam_input_index`: The Steam Input gamepad index (Windows, Linux, and macOS only). If the device is not a Steam Input device this key won't be present.  
         *  `xinput_index`: The index of the controller in the XInput system (Windows only). This key won't be present for devices not handled by XInput.  
         *      
         *  **Note:** The returned dictionary is always empty on Android and Web.  
         */
        static getJoyInfo(device: int64): GDictionary
        
        /** Queries whether an input device should be ignored or not. Devices can be ignored by setting the environment variable `SDL_GAMECONTROLLER_IGNORE_DEVICES`. See [url=https://wiki.libsdl.org/SDL3/SDL_HINT_GAMECONTROLLER_IGNORE_DEVICES]SDL documentation[/url] for more information.  
         *      
         *  **Note:** Some 3rd party tools can contribute to the list of ignored devices. For example,  *SteamInput*  creates virtual devices from physical devices for remapping purposes. To avoid handling the same input device twice, the original device is added to the ignore list.  
         */
        static shouldIgnoreDevice(vendorId: int64, productId: int64): boolean
        
        /** Returns an [Array] containing the device IDs of all currently connected joypads.  
         *      
         *  **Note:** The order of connected joypads can not be guaranteed to be the same after a project and/or the editor is restarted, because Godot doesn't save the order of joypad connections. Joypads are registered in the order they are discovered by Godot.  
         */
        static getConnectedJoypads(): GArray<int64>
        
        /** Returns the strength of the joypad vibration: x is the strength of the weak motor, and y is the strength of the strong motor.  
         *      
         *  **Note:** This method returns the same values that were passed to [method start_joy_vibration], and these values do **not** change when the joypad's vibration runs out, they only get reset after a call to [method stop_joy_vibration].  
         *  If you want to check if a joypad is still vibrating, use [method is_joy_vibrating] instead.  
         */
        static getJoyVibrationStrength(device: int64): Vector2
        
        /** Returns the duration of the current vibration effect in seconds.  
         *      
         *  **Note:** This method returns the same value that was passed to [method start_joy_vibration], and this value does **not** change when the joypad's vibration runs out, it only gets reset after a call to [method stop_joy_vibration].  
         *  If you want to check if a joypad is still vibrating, use [method is_joy_vibrating] instead.  
         */
        static getJoyVibrationDuration(device: int64): float64
        
        /** Returns the remaining duration of the current vibration effect in seconds. */
        static getJoyVibrationRemainingDuration(device: int64): float64
        
        /** Returns `true` if the joypad is still vibrating after a call to [method start_joy_vibration].  
         *  Unlike [method get_joy_vibration_strength] and [method get_joy_vibration_duration], this method returns `false` after the joypad's vibration runs out.  
         */
        static isJoyVibrating(device: int64): boolean
        
        /** Returns `true` if the joypad supports vibration. See also [method start_joy_vibration].  
         *      
         *  **Note:** For macOS, vibration is only supported in macOS 11 and later. When connected via USB, vibration is only supported for major brand controllers (except Xbox One and Xbox Series X/S controllers) due to macOS limitations.  
         */
        static hasJoyVibration(device: int64): boolean
        
        /** Starts vibrating the joypad. See also [method has_joy_vibration] and [method is_joy_vibrating].  
         *  Joypads usually come with two rumble motors, a strong and a weak one.  
         *  [param weak_magnitude] is the strength of the weak motor (between `0.0` and `1.0`).  
         *  [param strong_magnitude] is the strength of the strong motor (between `0.0` and `1.0`).  
         *  [param duration] is the duration of the effect in seconds (a duration of `0.0` will try to play the vibration as long as possible, which is about 65 seconds).  
         *  The vibration can be stopped early by calling [method stop_joy_vibration].  
         *  See also [method get_joy_vibration_strength] and [method get_joy_vibration_duration].  
         *      
         *  **Note:** For macOS, vibration is only supported in macOS 11 and later. When connected via USB, vibration is only supported for major brand controllers (except Xbox One and Xbox Series X/S controllers) due to macOS limitations.  
         */
        static startJoyVibration(device: int64, weakMagnitude: float64, strongMagnitude: float64, duration?: float64 /* = 0 */): void
        
        /** Stops the vibration of the joypad started with [method start_joy_vibration]. */
        static stopJoyVibration(device: int64): void
        
        /** Starts vibrating the handheld device for the specified duration in milliseconds.  
         *  [param amplitude] is the strength of the vibration, as a value between `0.0` and `1.0`. If set to `-1.0`, the default vibration strength of the device is used.  
         *      
         *  **Note:** This method is implemented on Android, iOS, and Web. It has no effect on other platforms.  
         *      
         *  **Note:** For Android, [method vibrate_handheld] requires enabling the `VIBRATE` permission in the export preset. Otherwise, [method vibrate_handheld] will have no effect.  
         *      
         *  **Note:** For iOS, specifying the duration is only supported in iOS 13 and later.  
         *      
         *  **Note:** For Web, the amplitude cannot be changed.  
         *      
         *  **Note:** Some web browsers such as Safari and Firefox for Android do not support [method vibrate_handheld].  
         *      
         *  **Note:** Device settings such as vibration on/off, "do not disturb" mode or specific haptic feedback on/off may prevent [method vibrate_handheld] effects.  
         */
        static vibrateHandheld(durationMs?: int64 /* = 500 */, amplitude?: float64 /* = -1 */): void
        
        /** Returns the gravity in m/s² of the device's accelerometer sensor, if the device has one. Otherwise, the method returns [constant Vector3.ZERO].  
         *      
         *  **Note:** This method only works on Android and iOS. On other platforms, it always returns [constant Vector3.ZERO].  
         *      
         *  **Note:** For Android, [member ProjectSettings.input_devices/sensors/enable_gravity] must be enabled.  
         */
        static getGravity(): Vector3
        
        /** Returns the acceleration in m/s² of the device's accelerometer sensor, if the device has one. Otherwise, the method returns [constant Vector3.ZERO].  
         *  Note this method returns an empty [Vector3] when running from the editor even when your device has an accelerometer. You must export your project to a supported device to read values from the accelerometer.  
         *      
         *  **Note:** This method only works on Android and iOS. On other platforms, it always returns [constant Vector3.ZERO].  
         *      
         *  **Note:** For Android, [member ProjectSettings.input_devices/sensors/enable_accelerometer] must be enabled.  
         */
        static getAccelerometer(): Vector3
        
        /** Returns the magnetic field strength in micro-Tesla for all axes of the device's magnetometer sensor, if the device has one. Otherwise, the method returns [constant Vector3.ZERO].  
         *      
         *  **Note:** This method only works on Android and iOS. On other platforms, it always returns [constant Vector3.ZERO].  
         *      
         *  **Note:** For Android, [member ProjectSettings.input_devices/sensors/enable_magnetometer] must be enabled.  
         */
        static getMagnetometer(): Vector3
        
        /** Returns the rotation rate in rad/s around a device's X, Y, and Z axes of the gyroscope sensor, if the device has one. Otherwise, the method returns [constant Vector3.ZERO].  
         *      
         *  **Note:** This method only works on Android and iOS. On other platforms, it always returns [constant Vector3.ZERO].  
         *      
         *  **Note:** For Android, [member ProjectSettings.input_devices/sensors/enable_gyroscope] must be enabled.  
         */
        static getGyroscope(): Vector3
        
        /** Returns the device's orientation as a [Quaternion], using hardware-level sensor fusion for stable, drift-free results. If the device does not support orientation sensing, the method returns [constant Quaternion.IDENTITY].  
         *  The returned quaternion represents the rotation from the device coordinate frame to the world coordinate frame. In portrait mode, the device's coordinate system is: X right, Y up, Z towards viewer.  
         *      
         *  **Note:** This method only works on Android and iOS. On other platforms, it always returns [constant Quaternion.IDENTITY].  
         *      
         *  **Note:** For Android, [member ProjectSettings.input_devices/sensors/enable_device_orientation] must be enabled.  
         *    
         */
        static getDeviceOrientation(): Quaternion
        
        /** Returns the acceleration, including the force of gravity, in m/s² of the joypad's accelerometer sensor, if the joypad has one and it's currently enabled. Otherwise, the method returns [constant Vector3.ZERO]. See also [method get_joy_gravity] and [method set_joy_motion_sensors_enabled].  
         *  For a joypad held in front of you, the returned axes are defined as follows:  
         *  +X ... -X: left ... right;  
         *  +Y ... -Y: bottom ... top;  
         *  +Z ... -Z: farther ... closer.  
         *  The gravity part value is measured as a vector with length of `9.8` away from the center of the Earth, which is a negative Y value.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyAccelerometer(device: int64): Vector3
        
        /** Returns the gravity in m/s² of the joypad's accelerometer sensor, if the joypad has one and it's currently enabled. Otherwise, the method returns [constant Vector3.ZERO]. See also [method get_joy_accelerometer] and [method set_joy_motion_sensors_enabled].  
         *  For a joypad held in front of you, the returned axes are defined as follows:  
         *  +X ... -X: left ... right;  
         *  +Y ... -Y: bottom ... top;  
         *  +Z ... -Z: farther ... closer.  
         *  The gravity part value is measured as a vector with length of `9.8` away from the center of the Earth, which is a negative Y value.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyGravity(device: int64): Vector3
        
        /** Returns the rotation rate in rad/s around a joypad's X, Y, and Z axes of the gyroscope sensor, if the joypad has one and it's currently enabled. Otherwise, the method returns [constant Vector3.ZERO]. See also [method set_joy_motion_sensors_enabled].  
         *  The rotation is positive in the counter-clockwise direction.  
         *  For a joypad held in front of you, the returned axes are defined as follows:  
         *  X: Angular speed around the X axis (pitch);  
         *  Y: Angular speed around the Y axis (yaw);  
         *  Z: Angular speed around the Z axis (roll).  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad gyroscope and gyroscope calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyGyroscope(device: int64): Vector3
        
        /** Returns the joypad's motion sensor rate in Hz, if the joypad has motion sensors and they're currently enabled. See also [method set_joy_motion_sensors_enabled].  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyMotionSensorsRate(device: int64): float64
        
        /** Returns `true` if the requested joypad has motion sensors (gyroscope and/or accelerometer) and they are currently enabled. See also [method set_joy_motion_sensors_enabled] and [method has_joy_motion_sensors].  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static isJoyMotionSensorsEnabled(device: int64): boolean
        
        /** Enables or disables the motion sensors (gyroscope and/or accelerometer), if available, on the specified joypad.  
         *  While the motion sensors are enabled, the gyroscope is calibrated automatically by default; see [method set_joy_motion_sensors_auto_calibration_enabled].  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *  It's recommended to disable the motion sensors when they're no longer being used, because otherwise it might drain the controller battery faster.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static setJoyMotionSensorsEnabled(device: int64, enable: boolean): void
        
        /** Returns `true` if the joypad has motion sensors (gyroscope and/or accelerometer).  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static hasJoyMotionSensors(device: int64): boolean
        
        /** Starts the process of manually calibrating the specified joypad's gyroscope, if it has one.  
         *  Once a joypad's gyroscope has been calibrated correctly (e.g. laying still on a table without being rotated), [method get_joy_gyroscope] will return values close or equal to [constant Vector3.ZERO] when the joypad is not being rotated.  
         *  Since the gyroscope is calibrated automatically by default (see [method set_joy_motion_sensors_auto_calibration_enabled]), most games don't need to calibrate manually. If automatic calibration is enabled, it's paused while the manual calibration is in progress, and resumes when [method stop_joy_motion_sensors_calibration] is called.  
         *  Here's an example of how to use joypad gyroscope and gyroscope calibration in your games:  
         *    
         *      
         *  **Note:** Accelerometer sensor doesn't usually require calibration.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static startJoyMotionSensorsCalibration(device: int64): void
        
        /** Stops the manual calibration process of the specified joypad's motion sensors.  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static stopJoyMotionSensorsCalibration(device: int64): void
        
        /** Clears the calibration information for the specified joypad's motion sensors, if it has any and if they were calibrated.  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static clearJoyMotionSensorsCalibration(device: int64): void
        
        /** Returns the calibration information about the specified joypad's motion sensors in the form of a [Dictionary], if it has any and if they have been calibrated, otherwise returns an empty [Dictionary].  
         *  The dictionary contains the following fields:  
         *  `gyroscope_offset`: average offset in gyroscope values from [constant Vector2.ZERO] in rad/s.  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyMotionSensorsCalibration(device: int64): GDictionary
        
        /** Sets the specified joypad's calibration information. See also [method get_joy_motion_sensors_calibration].  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static setJoyMotionSensorsCalibration(device: int64, calibrationInfo: GDictionary): void
        
        /** Returns `true` if the joypad's motion sensors have been calibrated.  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static isJoyMotionSensorsCalibrated(device: int64): boolean
        
        /** Returns `true` if the joypad's motion sensors are currently being manually calibrated.  
         *  See [method start_joy_motion_sensors_calibration] for an example on how to use joypad motion sensors and calibration in your games.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static isJoyMotionSensorsCalibrating(device: int64): boolean
        
        /** Enables or disables automatic calibration of the joypad's gyroscope. Automatic calibration is enabled by default, so most games don't need to call this or perform any calibration.  
         *  While enabled, the gyroscope calibration is continuously refined whenever the joypad is detected to be held still, easing corrections in gradually. This removes the need for a dedicated calibration step in most games and keeps up with calibration drift, e.g. from the controller warming up during play.  
         *  When automatic calibration is disabled, the last calibrated values remain in effect.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static setJoyMotionSensorsAutoCalibrationEnabled(device: int64, enable: boolean): void
        
        /** Returns `true` if automatic calibration is enabled on the joypad's motion sensors. Automatic calibration is enabled by default. See also [method set_joy_motion_sensors_auto_calibration_enabled].  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static isJoyMotionSensorsAutoCalibrationEnabled(device: int64): boolean
        
        /** Returns the position of the specified finger on the specified touchpad on the joypad. The X and Y values, if the specified finger is touching the specified touchpad, are in the range from `0.0` to `1.0`, with `(0.0, 0.0)` representing the top-left corner of the touchpad and `(1.0, 1.0)` representing the bottom-right corner.  
         *  If the joypad doesn't have the specified touchpad or the specified finger is not currently touching the touchpad, this method returns `Vector2(-1.0, -1.0)`.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyTouchpadFingerPosition(device: int64, finger: int64, touchpad?: int64 /* = 0 */): Vector2
        
        /** Returns the pressure of the specified finger on the specified touchpad on the joypad. The return value, if the specified finger is touching the specified touchpad, is in the range from `0.0` to `1.0`.  
         *  If the joypad doesn't have the specified touchpad or the specified finger is not currently touching the touchpad, this method returns `-1.0`.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyTouchpadFingerPressure(device: int64, finger: int64, touchpad?: int64 /* = 0 */): float64
        
        /** Returns an array of finger IDs that are currently touching the specified touchpad on the joypad. If the joypad doesn't have the specified touchpad or no fingers are currently touching this touchpad, this method returns an empty array.  
         *      
         *  **Note:** To retrieve the positions of the touchpad fingers, use [method get_joy_touchpad_finger_position].  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyTouchpadFingers(device: int64, touchpad?: int64 /* = 0 */): PackedInt32Array
        
        /** Returns the number of touchpads on the specified joypad, if it has any. Otherwise, the method returns `0`.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static getJoyNumTouchpads(device: int64): int64
        
        /** Sets the gravity value of the accelerometer sensor. Can be used for debugging on devices without a hardware sensor, for example in an editor on a PC.  
         *      
         *  **Note:** This value can be immediately overwritten by the hardware sensor value on Android and iOS.  
         */
        static setGravity(value: Vector3): void
        
        /** Sets the acceleration value of the accelerometer sensor. Can be used for debugging on devices without a hardware sensor, for example in an editor on a PC.  
         *      
         *  **Note:** This value can be immediately overwritten by the hardware sensor value on Android and iOS.  
         */
        static setAccelerometer(value: Vector3): void
        
        /** Sets the value of the magnetic field of the magnetometer sensor. Can be used for debugging on devices without a hardware sensor, for example in an editor on a PC.  
         *      
         *  **Note:** This value can be immediately overwritten by the hardware sensor value on Android and iOS.  
         */
        static setMagnetometer(value: Vector3): void
        
        /** Sets the value of the rotation rate of the gyroscope sensor. Can be used for debugging on devices without a hardware sensor, for example in an editor on a PC.  
         *      
         *  **Note:** This value can be immediately overwritten by the hardware sensor value on Android and iOS.  
         */
        static setGyroscope(value: Vector3): void
        
        /** Sets the device orientation quaternion. Can be used for debugging on devices without a hardware sensor, for example in an editor on a PC.  
         *      
         *  **Note:** This value can be immediately overwritten by the hardware sensor value on Android and iOS.  
         */
        static setDeviceOrientation(value: Quaternion): void
        
        /** Sets the joypad's LED light, if available, to the specified color. See also [method has_joy_light].  
         *      
         *  **Note:** There is no way to get the color of the light from a joypad. If you need to know the assigned color, store it separately.  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static setJoyLight(device: int64, color: Color): void
        
        /** Returns `true` if the joypad has an LED light that can change colors and/or brightness. See also [method set_joy_light].  
         *      
         *  **Note:** This feature is only supported on Windows, Linux, macOS, and iOS.  
         */
        static hasJoyLight(device: int64): boolean
        
        /** Returns the last mouse velocity. To provide a precise and jitter-free velocity, mouse velocity is only calculated every 0.1s. Therefore, mouse velocity will lag mouse movements. */
        static getLastMouseVelocity(): Vector2
        
        /** Returns the last mouse velocity in screen coordinates. To provide a precise and jitter-free velocity, mouse velocity is only calculated every 0.1s. Therefore, mouse velocity will lag mouse movements. */
        static getLastMouseScreenVelocity(): Vector2
        
        /** Returns mouse buttons as a bitmask. If multiple mouse buttons are pressed at the same time, the bits are added together. Equivalent to [method DisplayServer.mouse_get_button_state]. */
        static getMouseButtonMask(): MouseButtonMask
        
        /** Sets the mouse position to the specified vector, provided in pixels and relative to an origin at the upper left corner of the currently focused Window Manager game window.  
         *  Mouse position is clipped to the limits of the screen resolution, or to the limits of the game window if [enum MouseMode] is set to [constant MOUSE_MODE_CONFINED] or [constant MOUSE_MODE_CONFINED_HIDDEN].  
         *      
         *  **Note:** [method warp_mouse] is only supported on Windows, macOS and Linux. It has no effect on Android, iOS and Web.  
         */
        static warpMouse(position: Vector2): void
        
        /** Simulates pressing the specified input action.  
         *  The [param strength] can be used for non-boolean actions, it's ranged between `0.0` and `1.0` representing the intensity of the given action.  
         *      
         *  **Note:** This method will not cause any [method Node._input] calls. It is intended to be used with [method is_action_pressed] and [method is_action_just_pressed]. If you want to simulate `_input`, use [method parse_input_event] instead.  
         */
        static actionPress(action: InputActionName, strength?: float64 /* = 1 */): void
        
        /** Releases the specified input action, if the action is currently pressed. */
        static actionRelease(action: InputActionName): void
        
        /** Sets the default cursor shape to be used in the viewport instead of [constant CURSOR_ARROW].  
         *      
         *  **Note:** If you want to change the default cursor shape for [Control]'s nodes, use [member Control.mouse_default_cursor_shape] instead.  
         *      
         *  **Note:** This method generates an [InputEventMouseMotion] to update cursor immediately.  
         */
        static setDefaultCursorShape(shape?: Input.CursorShape /* = 0 */): void
        
        /** Returns the currently assigned cursor shape. */
        static getCurrentCursorShape(): Input.CursorShape
        
        /** Sets a custom mouse cursor image, which is only visible inside the game window, for the given mouse [param shape]. The hotspot can also be specified. Passing `null` to the image parameter resets to the system cursor.  
         *  [param image] can be either [Texture2D] or [Image] and its size must be lower than or equal to 256×256. To avoid rendering issues, sizes lower than or equal to 128×128 are recommended.  
         *  [param hotspot] must be within [param image]'s size.  
         *      
         *  **Note:** [AnimatedTexture]s aren't supported as custom mouse cursors. If using an [AnimatedTexture], only the first frame will be displayed.  
         *      
         *  **Note:** The **Lossless**, **Lossy** or **Uncompressed** compression modes are recommended. The **Video RAM** compression mode can be used, but it will be decompressed on the CPU, which means loading times are slowed down and no memory is saved compared to lossless modes.  
         *      
         *  **Note:** On the web platform, the maximum allowed cursor image size is 128×128. Cursor images larger than 32×32 will also only be displayed if the mouse cursor image is entirely located within the page for [url=https://chromestatus.com/feature/5825971391299584]security reasons[/url].  
         */
        static setCustomMouseCursor(image: Resource, shape?: Input.CursorShape /* = 0 */, hotspot?: Vector2 /* = Vector2.ZERO */): void
        
        /** Feeds an [InputEvent] to the game. Can be used to artificially trigger input events from code. Also generates [method Node._input] calls.  
         *    
         *      
         *  **Note:** Calling this function has no influence on the operating system. So for example sending an [InputEventMouseMotion] will not move the OS mouse cursor to the specified position (use [method warp_mouse] instead) and sending [kbd]Alt/Cmd + Tab[/kbd] as [InputEventKey] won't toggle between active windows.  
         */
        static parseInputEvent(event: InputEvent): void
        
        /** Sends all buffered input events to the game loop. These events may have been buffered as a result of accumulated input ([member use_accumulated_input]) or agile input flushing ([member ProjectSettings.input_devices/buffering/agile_event_flushing]).  
         *  The engine will already do this itself at key execution points (at least once per frame). However, this can be useful in advanced cases where you want precise control over the timing of event handling.  
         */
        static flushBufferedEvents(): void
        
        /** Controls the mouse mode. */
        static get mouseMode(): int64
        static set mouseMode(value: int64)
        
        /** If `true`, similar input events sent by the operating system are accumulated. When input accumulation is enabled, all input events generated during a frame will be merged and emitted when the frame is done rendering. Therefore, this limits the number of input method calls per second to the rendering FPS.  
         *  Input accumulation can be disabled to get slightly more precise/reactive input at the cost of increased CPU usage. In applications where drawing freehand lines is required, input accumulation should generally be disabled while the user is drawing the line to get results that closely follow the actual input.  
         *      
         *  **Note:** Input accumulation is  *enabled*  by default.  
         */
        static get useAccumulatedInput(): boolean
        static set useAccumulatedInput(value: boolean)
        
        /** If `true`, sends mouse input events when tapping or swiping on the touchscreen. See also [member ProjectSettings.input_devices/pointing/emulate_mouse_from_touch]. */
        static get emulateMouseFromTouch(): boolean
        static set emulateMouseFromTouch(value: boolean)
        
        /** If `true`, sends touch input events when clicking or dragging the mouse. See also [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse]. */
        static get emulateTouchFromMouse(): boolean
        static set emulateTouchFromMouse(value: boolean)
        
        /** If `true`, joypad input (including motion sensors) and LED light changes will be ignored and joypad vibration will be stopped when the application is not focused. */
        static get ignoreJoypadOnUnfocusedApplication(): boolean
        static set ignoreJoypadOnUnfocusedApplication(value: boolean)
        
        /** Emitted when a joypad device has been connected or disconnected. */
        static readonly joyConnectionChanged: Signal<(device: int64, connected: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapInput;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapInput;
    }
    // _singleton_class_: InputMap
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapInputMap extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapInputMap extends __NameMapGObject {
        has_action: "hasAction";
        get_actions: "getActions";
        add_action: "addAction";
        erase_action: "eraseAction";
        get_action_description: "getActionDescription";
        action_set_deadzone: "actionSetDeadzone";
        action_get_deadzone: "actionGetDeadzone";
        action_add_event: "actionAddEvent";
        action_has_event: "actionHasEvent";
        action_erase_event: "actionEraseEvent";
        action_erase_events: "actionEraseEvents";
        action_get_events: "actionGetEvents";
        event_is_action: "eventIsAction";
        load_from_project_settings: "loadFromProjectSettings";
        project_settings_loaded: "projectSettingsLoaded";
    }
    /** A singleton that manages all [InputEventAction]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_inputmap.html  
     */
    class InputMap extends GObject {
        /** Returns `true` if the [InputMap] has a registered action with the given name. */
        static hasAction(action: StringName): boolean
        
        /** Returns an array of all actions in the [InputMap]. */
        static getActions(): GArray<StringName>
        
        /** Adds an empty action to the [InputMap] with a configurable [param deadzone].  
         *  An [InputEvent] can then be added to this action with [method action_add_event].  
         */
        static addAction(action: StringName, deadzone?: float64 /* = 0.20000000298023224 */): void
        
        /** Removes an action from the [InputMap]. */
        static eraseAction(action: StringName): void
        
        /** Returns the human-readable description of the given action. */
        static getActionDescription(action: StringName): string
        
        /** Sets a deadzone value for the action. */
        static actionSetDeadzone(action: StringName, deadzone: float64): void
        
        /** Returns a deadzone value for the action. */
        static actionGetDeadzone(action: StringName): float64
        
        /** Adds an [InputEvent] to an action. This [InputEvent] will trigger the action. */
        static actionAddEvent(action: StringName, event: InputEvent): void
        
        /** Returns `true` if the action has the given [InputEvent] associated with it. */
        static actionHasEvent(action: StringName, event: InputEvent): boolean
        
        /** Removes an [InputEvent] from an action. */
        static actionEraseEvent(action: StringName, event: InputEvent): void
        
        /** Removes all events from an action. */
        static actionEraseEvents(action: StringName): void
        
        /** Returns an array of [InputEvent]s associated with a given action.  
         *      
         *  **Note:** When used in the editor (e.g. a tool script or [EditorPlugin]), this method will return events for the editor action. If you want to access your project's input binds from the editor, read the `input/*` settings from [ProjectSettings].  
         */
        static actionGetEvents(action: StringName): GArray<InputEvent>
        
        /** Returns `true` if the given event is part of an existing action. This method ignores keyboard modifiers if the given [InputEvent] is not pressed (for proper release detection). See [method action_has_event] if you don't want this behavior.  
         *  If [param exact_match] is `false`, it ignores additional input modifiers for [InputEventKey] and [InputEventMouseButton] events, and the direction for [InputEventJoypadMotion] events.  
         */
        static eventIsAction(event: InputEvent, action: StringName, exactMatch?: boolean /* = false */): boolean
        
        /** Clears all [InputEventAction] in the [InputMap] and load it anew from [ProjectSettings]. */
        static loadFromProjectSettings(): void
        
        /** Emitted when the [ProjectSettings] [InputMap] has been loaded. */
        static readonly projectSettingsLoaded: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapInputMap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapInputMap;
    }
    // _singleton_class_: EngineDebugger
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEngineDebugger extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEngineDebugger extends __NameMapGObject {
        is_active: "isActive";
        register_profiler: "registerProfiler";
        unregister_profiler: "unregisterProfiler";
        is_profiling: "isProfiling";
        has_profiler: "hasProfiler";
        profiler_add_frame_data: "profilerAddFrameData";
        profiler_enable: "profilerEnable";
        register_message_capture: "registerMessageCapture";
        unregister_message_capture: "unregisterMessageCapture";
        has_capture: "hasCapture";
        line_poll: "linePoll";
        send_message: "sendMessage";
        script_debug: "scriptDebug";
        set_lines_left: "setLinesLeft";
        get_lines_left: "getLinesLeft";
        set_depth: "setDepth";
        get_depth: "getDepth";
        is_breakpoint: "isBreakpoint";
        is_skipping_breakpoints: "isSkippingBreakpoints";
        insert_breakpoint: "insertBreakpoint";
        remove_breakpoint: "removeBreakpoint";
        clear_breakpoints: "clearBreakpoints";
    }
    /** Exposes the internal debugger.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_enginedebugger.html  
     */
    class EngineDebugger extends GObject {
        /** Returns `true` if the debugger is active otherwise `false`. */
        static isActive(): boolean
        
        /** Registers a profiler with the given [param name]. See [EngineProfiler] for more information. */
        static registerProfiler(name: StringName, profiler: EngineProfiler): void
        
        /** Unregisters a profiler with given [param name]. */
        static unregisterProfiler(name: StringName): void
        
        /** Returns `true` if a profiler with the given name is present and active otherwise `false`. */
        static isProfiling(name: StringName): boolean
        
        /** Returns `true` if a profiler with the given name is present otherwise `false`. */
        static hasProfiler(name: StringName): boolean
        
        /** Calls the `add` callable of the profiler with given [param name] and [param data]. */
        static profilerAddFrameData(name: StringName, data: GArray): void
        
        /** Calls the `toggle` callable of the profiler with given [param name] and [param arguments]. Enables/Disables the same profiler depending on [param enable] argument. */
        static profilerEnable(name: StringName, enable: boolean, arguments_?: GArray): void
        
        /** Registers a message capture with given [param name]. If [param name] is "my_message" then messages starting with "my_message:" will be called with the given callable.  
         *  The callable must accept a message string and a data array as argument. The callable should return `true` if the message is recognized.  
         *      
         *  **Note:** The callable will receive the message with the prefix stripped, unlike [method EditorDebuggerPlugin._capture]. See the [EditorDebuggerPlugin] description for an example.  
         */
        static registerMessageCapture(name: StringName, callable: Callable): void
        
        /** Unregisters the message capture with given [param name]. */
        static unregisterMessageCapture(name: StringName): void
        
        /** Returns `true` if a capture with the given name is present otherwise `false`. */
        static hasCapture(name: StringName): boolean
        
        /** Forces a processing loop of debugger events. The purpose of this method is just processing events every now and then when the script might get too busy, so that bugs like infinite loops can be caught. */
        static linePoll(): void
        
        /** Sends a message with given [param message] and [param data] array. */
        static sendMessage(message: string, data: GArray): void
        
        /** Starts a debug break in script execution, optionally specifying whether the program can continue based on [param can_continue] and whether the break was due to a breakpoint. */
        static debug(canContinue?: boolean /* = true */, isErrorBreakpoint?: boolean /* = false */): void
        
        /** Starts a debug break in script execution, optionally specifying whether the program can continue based on [param can_continue] and whether the break was due to a breakpoint. */
        static scriptDebug(language: ScriptLanguage, canContinue?: boolean /* = true */, isErrorBreakpoint?: boolean /* = false */): void
        
        /** Sets the current debugging lines that remain. */
        static setLinesLeft(lines: int64): void
        
        /** Returns the number of lines that remain. */
        static getLinesLeft(): int64
        
        /** Sets the current debugging depth. */
        static setDepth(depth: int64): void
        
        /** Returns the current debug depth. */
        static getDepth(): int64
        
        /** Returns `true` if the given [param source] and [param line] represent an existing breakpoint. */
        static isBreakpoint(line: int64, source: StringName): boolean
        
        /** Returns `true` if the debugger is skipping breakpoints otherwise `false`. */
        static isSkippingBreakpoints(): boolean
        
        /** Inserts a new breakpoint with the given [param source] and [param line]. */
        static insertBreakpoint(line: int64, source: StringName): void
        
        /** Removes a breakpoint with the given [param source] and [param line]. */
        static removeBreakpoint(line: int64, source: StringName): void
        
        /** Clears all breakpoints. */
        static clearBreakpoints(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEngineDebugger;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEngineDebugger;
    }
    // _singleton_class_: GDExtensionManager
    namespace GDExtensionManager {
        enum LoadStatus {
            LoadStatusOk = 0,
            LoadStatusFailed = 1,
            LoadStatusAlreadyLoaded = 2,
            LoadStatusNotLoaded = 3,
            LoadStatusNeedsRestart = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapGDExtensionManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapGDExtensionManager extends __NameMapGObject {
        load_extension: "loadExtension";
        load_extension_from_function: "loadExtensionFromFunction";
        reload_extension: "reloadExtension";
        unload_extension: "unloadExtension";
        is_extension_loaded: "isExtensionLoaded";
        get_loaded_extensions: "getLoadedExtensions";
        get_extension: "getExtension";
        extensions_reloaded: "extensionsReloaded";
        extension_loaded: "extensionLoaded";
        extension_unloading: "extensionUnloading";
    }
    /** Provides access to GDExtension functionality.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_gdextensionmanager.html  
     */
    class GDExtensionManager extends GObject {
        /** Loads an extension by absolute file path. The [param path] needs to point to a valid [GDExtension]. Returns [constant LOAD_STATUS_OK] if successful. */
        static loadExtension(path: string): GDExtensionManager.LoadStatus
        
        /** Loads the extension already in address space via the given path and initialization function. The [param path] needs to be unique and start with `"libgodot://"`. Returns [constant LOAD_STATUS_OK] if successful. */
        static loadExtensionFromFunction(path: string, initFunc: int64): GDExtensionManager.LoadStatus
        
        /** Reloads the extension at the given file path. The [param path] needs to point to a valid [GDExtension], otherwise this method may return either [constant LOAD_STATUS_NOT_LOADED] or [constant LOAD_STATUS_FAILED].  
         *      
         *  **Note:** You can only reload extensions in the editor. In release builds, this method always fails and returns [constant LOAD_STATUS_FAILED].  
         */
        static reloadExtension(path: string): GDExtensionManager.LoadStatus
        
        /** Unloads an extension by file path. The [param path] needs to point to an already loaded [GDExtension], otherwise this method returns [constant LOAD_STATUS_NOT_LOADED]. */
        static unloadExtension(path: string): GDExtensionManager.LoadStatus
        
        /** Returns `true` if the extension at the given file [param path] has already been loaded successfully. See also [method get_loaded_extensions]. */
        static isExtensionLoaded(path: string): boolean
        
        /** Returns the file paths of all currently loaded extensions. */
        static getLoadedExtensions(): PackedStringArray
        
        /** Returns the [GDExtension] at the given file [param path], or `null` if it has not been loaded or does not exist. */
        static getExtension(path: string): null | GDExtension
        
        /** Emitted after the editor has finished reloading one or more extensions. */
        static readonly extensionsReloaded: Signal<() => void>
        
        /** Emitted after the editor has finished loading a new extension.  
         *      
         *  **Note:** This signal is only emitted in editor builds.  
         */
        static readonly extensionLoaded: Signal<(extension: GDExtension) => void>
        
        /** Emitted before the editor starts unloading an extension.  
         *      
         *  **Note:** This signal is only emitted in editor builds.  
         */
        static readonly extensionUnloading: Signal<(extension: GDExtension) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapGDExtensionManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapGDExtensionManager;
    }
    // _singleton_class_: ResourceUid
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceUid extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceUid extends __NameMapGObject {
        id_to_text: "idToText";
        text_to_id: "textToId";
        create_id: "createId";
        create_id_for_path: "createIdForPath";
        has_id: "hasId";
        add_id: "addId";
        set_id: "setId";
        get_id_path: "getIdPath";
        remove_id: "removeId";
        uid_to_path: "uidToPath";
        path_to_uid: "pathToUid";
        ensure_path: "ensurePath";
    }
    class ResourceUid extends GObject {
        static readonly INVALID_ID = -1
        static idToText(id: int64): string
        static textToId(textId: string): int64
        static createId(): int64
        static createIdForPath(path: string): int64
        static hasId(id: int64): boolean
        static addId(id: int64, path: string): void
        static setId(id: int64, path: string): void
        static getIdPath(id: int64): string
        static removeId(id: int64): void
        static uidToPath(uid: string): string
        static pathToUid(path: string): string
        static ensurePath(pathOrUid: string): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceUid;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceUid;
    }
    // _singleton_class_: WorkerThreadPool
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorkerThreadPool extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorkerThreadPool extends __NameMapGObject {
        add_task: "addTask";
        is_task_completed: "isTaskCompleted";
        wait_for_task_completion: "waitForTaskCompletion";
        get_caller_task_id: "getCallerTaskId";
        add_group_task: "addGroupTask";
        is_group_task_completed: "isGroupTaskCompleted";
        get_group_processed_element_count: "getGroupProcessedElementCount";
        wait_for_group_task_completion: "waitForGroupTaskCompletion";
        get_caller_group_id: "getCallerGroupId";
    }
    /** A singleton that allocates some [Thread]s on startup, used to offload tasks to these threads.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_workerthreadpool.html  
     */
    class WorkerThreadPool extends GObject {
        /** Adds [param action] as a task to be executed by a worker thread. [param high_priority] determines if the task has a high priority or a low priority (default). You can optionally provide a [param description] to help with debugging.  
         *  Returns a task ID that can be used by other methods.  
         *  **Warning:** Every task must be waited for completion using [method wait_for_task_completion] or [method wait_for_group_task_completion] at some point so that any allocated resources inside the task can be cleaned up.  
         */
        static addTask(action: Callable, highPriority?: boolean /* = false */, description?: string /* = '' */): int64
        
        /** Returns `true` if the task with the given ID is completed.  
         *      
         *  **Note:** You should only call this method between adding the task and awaiting its completion.  
         */
        static isTaskCompleted(taskId: int64): boolean
        
        /** Pauses the thread that calls this method until the task with the given ID is completed.  
         *  Returns [constant @GlobalScope.OK] if the task could be successfully awaited.  
         *  Returns [constant @GlobalScope.ERR_INVALID_PARAMETER] if a task with the passed ID does not exist (maybe because it was already awaited and disposed of).  
         *  Returns [constant @GlobalScope.ERR_BUSY] if the call is made from another running task and, due to task scheduling, there's potential for deadlocking (e.g., the task to await may be at a lower level in the call stack and therefore can't progress). This is an advanced situation that should only matter when some tasks depend on others (in the current implementation, the tricky case is a task trying to wait on an older one).  
         */
        static waitForTaskCompletion(taskId: int64): GError
        
        /** Returns the task ID of the current thread calling this method, or `-1` if the task is a group task, invalid or the current thread is not part of the thread pool (e.g. the main thread).  
         *  Can be used by a task to get its own task ID, or to determine whether the current code is running inside the worker thread pool.  
         *      
         *  **Note:** Group tasks have their own IDs, so this method will return `-1` for group tasks.  
         */
        static getCallerTaskId(): int64
        
        /** Adds [param action] as a group task to be executed by the worker threads. The [Callable] will be called a number of times based on [param elements], with the first thread calling it with the value `0` as a parameter, and each consecutive execution incrementing this value by 1 until it reaches `element - 1`.  
         *  The number of threads the task is distributed to is defined by [param tasks_needed], where the default value `-1` means it is distributed to all worker threads. [param high_priority] determines if the task has a high priority or a low priority (default). You can optionally provide a [param description] to help with debugging.  
         *  Returns a group task ID that can be used by other methods.  
         *  **Warning:** Every task must be waited for completion using [method wait_for_task_completion] or [method wait_for_group_task_completion] at some point so that any allocated resources inside the task can be cleaned up.  
         */
        static addGroupTask(action: Callable, elements: int64, tasksNeeded?: int64 /* = -1 */, highPriority?: boolean /* = false */, description?: string /* = '' */): int64
        
        /** Returns `true` if the group task with the given ID is completed.  
         *      
         *  **Note:** You should only call this method between adding the group task and awaiting its completion.  
         */
        static isGroupTaskCompleted(groupId: int64): boolean
        
        /** Returns how many times the [Callable] of the group task with the given ID has already been executed by the worker threads.  
         *      
         *  **Note:** If a thread has started executing the [Callable] but is yet to finish, it won't be counted.  
         */
        static getGroupProcessedElementCount(groupId: int64): int64
        
        /** Pauses the thread that calls this method until the group task with the given ID is completed. */
        static waitForGroupTaskCompletion(groupId: int64): void
        
        /** Returns the task group ID of the current thread calling this method, or `-1` if invalid or the current thread is not part of a task group. */
        static getCallerGroupId(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorkerThreadPool;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorkerThreadPool;
    }
    // _singleton_class_: ThemeDB
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapThemeDB extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapThemeDB extends __NameMapGObject {
        get_default_theme: "getDefaultTheme";
        get_project_theme: "getProjectTheme";
        fallback_base_scale: "fallbackBaseScale";
        fallback_font: "fallbackFont";
        fallback_font_size: "fallbackFontSize";
        fallback_icon: "fallbackIcon";
        fallback_stylebox: "fallbackStylebox";
        fallback_sound: "fallbackSound";
        fallback_changed: "fallbackChanged";
    }
    /** A singleton that provides access to static information about [Theme] resources used by the engine and by your project.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_themedb.html  
     */
    class ThemeDB extends GObject {
        /** Returns a reference to the default engine [Theme]. This theme resource is responsible for the out-of-the-box look of [Control] nodes and cannot be overridden. */
        static getDefaultTheme(): null | Theme
        
        /** Returns a reference to the custom project [Theme]. This theme resources allows to override the default engine theme for every control node in the project.  
         *  To set the project theme, see [member ProjectSettings.gui/theme/custom].  
         */
        static getProjectTheme(): null | Theme
        
        /** The fallback base scale factor of every [Control] node and [Theme] resource. Used when no other value is available to the control.  
         *  See also [member Theme.default_base_scale].  
         */
        static get fallbackBaseScale(): float64
        static set fallbackBaseScale(value: float64)
        
        /** The fallback font of every [Control] node and [Theme] resource. Used when no other value is available to the control.  
         *  See also [member Theme.default_font].  
         */
        static get fallbackFont(): null | Font
        static set fallbackFont(value: null | Font)
        
        /** The fallback font size of every [Control] node and [Theme] resource. Used when no other value is available to the control.  
         *  See also [member Theme.default_font_size].  
         */
        static get fallbackFontSize(): int64
        static set fallbackFontSize(value: int64)
        
        /** The fallback icon of every [Control] node and [Theme] resource. Used when no other value is available to the control. */
        static get fallbackIcon(): null | Texture2D
        static set fallbackIcon(value: null | Texture2D)
        
        /** The fallback stylebox of every [Control] node and [Theme] resource. Used when no other value is available to the control. */
        static get fallbackStylebox(): null | StyleBox
        static set fallbackStylebox(value: null | StyleBox)
        
        /** The fallback sound of every [Control] node and [Theme] resource. Used when no other value is available to the control. */
        static get fallbackSound(): null | AudioStream
        static set fallbackSound(value: null | AudioStream)
        
        /** Emitted when one of the fallback values had been changed. Use it to refresh the look of controls that may rely on the fallback theme items. */
        static readonly fallbackChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapThemeDB;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapThemeDB;
    }
    // _singleton_class_: TextureStreaming
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureStreaming extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureStreaming extends __NameMapGObject {
        get_memory_budget_bytes_used: "getMemoryBudgetBytesUsed";
        flush_texture_streaming: "flushTextureStreaming";
        min_lod_override: "minLodOverride";
        max_lod_override: "maxLodOverride";
        memory_budget_mb_override: "memoryBudgetMbOverride";
        flush_completed: "flushCompleted";
    }
    /** Manages dynamic texture mipmap streaming to optimize VRAM usage.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturestreaming.html  
     */
    class TextureStreaming extends GObject {
        /** Returns the current VRAM usage of streamed textures in bytes. This represents the total memory consumed by all streamed textures at their currently loaded mipmap levels. */
        static getMemoryBudgetBytesUsed(): int64
        
        /** Forces all currently queued texture streaming operations to complete immediately, bypassing the normal gradual transition and I/O throttling. This immediately loads or unloads mipmap levels to reach the target resolution for all managed textures, then emits the [signal flush_completed] signal. Useful during loading screens or when teleporting the player to ensure all textures are at their optimal resolution without a visible transition. */
        static flushTextureStreaming(): void
        
        /** Overrides the minimum LOD (mipmap level) that textures start at when loaded. Higher values result in lower initial resolution. Valid values are `0` (full resolution) to `13` (lowest resolution). Values outside that range clear the override and use the default from [member ProjectSettings.rendering/textures/streaming/min_lod]; when no override is active this property returns `-1`. */
        static get minLodOverride(): int64
        static set minLodOverride(value: int64)
        
        /** Overrides the maximum LOD (mipmap level) that can be loaded for streamed textures at runtime. Lower values allow higher resolution textures. Valid values are `0` (full resolution) to `13` (lowest resolution). Values outside that range clear the override and use the default from [member ProjectSettings.rendering/textures/streaming/max_lod]; when no override is active this property returns `-1`. */
        static get maxLodOverride(): int64
        static set maxLodOverride(value: int64)
        
        /** Overrides the memory budget for streamed textures at runtime (in megabytes). When the budget is exceeded, the system reduces texture resolution to stay within the limit. A value of `UINT32_MAX` (`4294967295`, the maximum unsigned 32-bit integer) disables the override and uses the default from [member ProjectSettings.rendering/textures/streaming/memory_budget_mb]. */
        static get memoryBudgetMbOverride(): int64
        static set memoryBudgetMbOverride(value: int64)
        
        /** Emitted when a texture streaming flush operation finishes, after [method flush_texture_streaming] has been called and all managed textures have reached their target resolutions. */
        static readonly flushCompleted: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureStreaming;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureStreaming;
    }
    // _singleton_class_: EditorInterface
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorInterface extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorInterface extends __NameMapGObject {
        is_exiting: "isExiting";
        restart_editor: "restartEditor";
        get_command_palette: "getCommandPalette";
        get_resource_filesystem: "getResourceFilesystem";
        get_editor_paths: "getEditorPaths";
        get_resource_previewer: "getResourcePreviewer";
        get_selection: "getSelection";
        get_editor_settings: "getEditorSettings";
        get_editor_toaster: "getEditorToaster";
        get_editor_undo_redo: "getEditorUndoRedo";
        get_scene_paint_2d: "getScenePaint2D";
        make_mesh_previews: "makeMeshPreviews";
        set_plugin_enabled: "setPluginEnabled";
        is_plugin_enabled: "isPluginEnabled";
        get_editor_theme: "getEditorTheme";
        get_base_control: "getBaseControl";
        get_script_editor: "getScriptEditor";
        get_editor_viewport_2d: "getEditorViewport2D";
        get_editor_viewport_3d: "getEditorViewport3D";
        get_editor_main_screen: "getEditorMainScreen";
        set_main_screen_editor: "setMainScreenEditor";
        get_dock_by_name: "getDockByName";
        is_multi_window_enabled: "isMultiWindowEnabled";
        get_editor_scale: "getEditorScale";
        get_editor_language: "getEditorLanguage";
        is_node_3d_snap_enabled: "isNode3DSnapEnabled";
        get_node_3d_translate_snap: "getNode3DTranslateSnap";
        get_node_3d_rotate_snap: "getNode3DRotateSnap";
        get_node_3d_scale_snap: "getNode3DScaleSnap";
        popup_dialog: "popupDialog";
        popup_dialog_centered: "popupDialogCentered";
        popup_dialog_centered_ratio: "popupDialogCenteredRatio";
        popup_dialog_centered_clamped: "popupDialogCenteredClamped";
        get_current_feature_profile: "getCurrentFeatureProfile";
        set_current_feature_profile: "setCurrentFeatureProfile";
        popup_node_selector: "popupNodeSelector";
        popup_property_selector: "popupPropertySelector";
        popup_method_selector: "popupMethodSelector";
        popup_quick_open: "popupQuickOpen";
        popup_create_dialog: "popupCreateDialog";
        get_file_system_dock: "getFileSystemDock";
        select_file: "selectFile";
        get_selected_paths: "getSelectedPaths";
        get_current_path: "getCurrentPath";
        get_current_directory: "getCurrentDirectory";
        get_inspector: "getInspector";
        inspect_object: "inspectObject";
        edit_resource: "editResource";
        edit_node: "editNode";
        edit_script: "editScript";
        open_scene_from_path: "openSceneFromPath";
        reload_scene_from_path: "reloadSceneFromPath";
        set_object_edited: "setObjectEdited";
        is_object_edited: "isObjectEdited";
        get_open_scenes: "getOpenScenes";
        get_unsaved_scenes: "getUnsavedScenes";
        get_open_scene_roots: "getOpenSceneRoots";
        get_edited_scene_root: "getEditedSceneRoot";
        add_root_node: "addRootNode";
        save_scene: "saveScene";
        save_scene_as: "saveSceneAs";
        save_all_scenes: "saveAllScenes";
        close_scene: "closeScene";
        mark_scene_as_unsaved: "markSceneAsUnsaved";
        play_main_scene: "playMainScene";
        play_current_scene: "playCurrentScene";
        play_custom_scene: "playCustomScene";
        stop_playing_scene: "stopPlayingScene";
        is_playing_scene: "isPlayingScene";
        get_playing_scene: "getPlayingScene";
        distraction_free_mode: "distractionFreeMode";
        movie_maker_enabled: "movieMakerEnabled";
    }
    /** Godot editor's interface.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorinterface.html  
     */
    class EditorInterface extends GObject {
        /** Returns `true` if the editor is currently exiting. */
        static isExiting(): boolean
        
        /** Restarts the editor. This closes the editor and then opens the same project. If [param save] is `true`, the project will be saved before restarting. */
        static restartEditor(save?: boolean /* = true */): void
        
        /** Returns the editor's [EditorCommandPalette] instance.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        static getCommandPalette(): null | EditorCommandPalette
        
        /** Returns the editor's [EditorFileSystem] instance. */
        static getResourceFilesystem(): null | EditorFileSystem
        
        /** Returns the [EditorPaths] singleton. */
        static getEditorPaths(): null | EditorPaths
        
        /** Returns the editor's [EditorResourcePreview] instance. */
        static getResourcePreviewer(): null | EditorResourcePreview
        
        /** Returns the editor's [EditorSelection] instance. */
        static getSelection(): null | EditorSelection
        
        /** Returns the editor's [EditorSettings] instance. */
        static getEditorSettings(): null | EditorSettings
        
        /** Returns the editor's [EditorToaster]. */
        static getEditorToaster(): null | EditorToaster
        
        /** Returns the editor's [EditorUndoRedoManager]. */
        static getEditorUndoRedo(): null | EditorUndoRedoManager
        
        /** Returns the editor's [ScenePaint2DEditor] instance.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        static getScenePaint2D(): null | ScenePaint2DEditor
        
        /** Returns mesh previews rendered at the given size as an [Array] of [Texture2D]s. */
        static makeMeshPreviews(meshes: GArray<Mesh>, previewSize: int64): GArray<Texture2D>
        
        /** Sets the enabled status of a plugin. The plugin name is the same as its directory name. */
        static setPluginEnabled(plugin: string, enabled: boolean): void
        
        /** Returns `true` if the specified [param plugin] is enabled. The plugin name is the same as its directory name. */
        static isPluginEnabled(plugin: string): boolean
        
        /** Returns the editor's [Theme].  
         *      
         *  **Note:** When creating custom editor UI, prefer accessing theme items directly from your GUI nodes using the `get_theme_*` methods.  
         */
        static getEditorTheme(): null | Theme
        
        /** Returns the main container of Godot editor's window. For example, you can use it to retrieve the size of the container and place your controls accordingly.  
         *  **Warning:** Removing and freeing this node will render the editor useless and may cause a crash.  
         */
        static getBaseControl(): null | Control
        
        /** Returns the editor's [ScriptEditor] instance.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        static getScriptEditor(): null | ScriptEditor
        
        /** Returns the 2D editor [SubViewport]. It does not have a camera. Instead, the view transforms are done directly and can be accessed with [member Viewport.global_canvas_transform]. */
        static getEditorViewport2D(): null | SubViewport
        
        /** Returns the specified 3D editor [SubViewport], from `0` to `3`. The viewport can be used to access the active editor cameras with [method Viewport.get_camera_3d]. */
        static getEditorViewport3D(idx?: int64 /* = 0 */): null | SubViewport
        
        /** Returns the editor control responsible for legacy main screen plugins and tools. */
        static getEditorMainScreen(): null | VBoxContainer
        
        /** Sets the editor's current main screen to the one specified in [param name]. [param name] must match the title of the tab in question exactly (e.g. `2D`, `3D`, [code skip-lint]Script`, `Game`, or `Asset Store` for default tabs). */
        static setMainScreenEditor(name: string): void
        
        /** Returns an [EditorDock] with the specified [param name]. [param name] must match the original (untranslated) title of the tab in question exactly (e.g., `2D`, `Scene`, `Audio`). Returns `null` if the dock was not found. */
        static getDockByName(name: string): null | EditorDock
        
        /** Returns `true` if multiple window support is enabled in the editor. Multiple window support is enabled if  *all*  of these statements are true:  
         *  - [member EditorSettings.interface/multi_window/enable] is `true`.  
         *  - [member EditorSettings.interface/editor/display/single_window_mode] is `false`.  
         *  - [member Viewport.gui_embed_subwindows] is `false`. This is forced to `true` on platforms that don't support multiple windows such as Web, or when the `--single-window` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url] is used.  
         */
        static isMultiWindowEnabled(): boolean
        
        /** Returns the actual scale of the editor UI (`1.0` being 100% scale). This can be used to adjust position and dimensions of the UI added by plugins.  
         *      
         *  **Note:** This value is set via the [member EditorSettings.interface/editor/appearance/display_scale] and [member EditorSettings.interface/editor/appearance/custom_display_scale] settings. The editor must be restarted for changes to be properly applied.  
         */
        static getEditorScale(): float64
        
        /** Returns the language currently used for the editor interface. */
        static getEditorLanguage(): string
        
        /** Returns `true` if the 3D editor currently has snapping mode enabled, and `false` otherwise. */
        static isNode3DSnapEnabled(): boolean
        
        /** Returns the amount of units the 3D editor's translation snapping is set to. */
        static getNode3DTranslateSnap(): float64
        
        /** Returns the amount of degrees the 3D editor's rotational snapping is set to. */
        static getNode3DRotateSnap(): float64
        
        /** Returns the amount of units the 3D editor's scale snapping is set to. */
        static getNode3DScaleSnap(): float64
        
        /** Pops up the [param dialog] in the editor UI with [method Window.popup_exclusive]. The dialog must have no current parent, otherwise the method fails.  
         *  See also [method Window.set_unparent_when_invisible].  
         */
        static popupDialog(dialog: Window, rect?: Rect2I /* = new Rect2I(0, 0, 0, 0) */): void
        
        /** Pops up the [param dialog] in the editor UI with [method Window.popup_exclusive_centered]. The dialog must have no current parent, otherwise the method fails.  
         *  See also [method Window.set_unparent_when_invisible].  
         */
        static popupDialogCentered(dialog: Window, minsize?: Vector2I /* = Vector2I.ZERO */): void
        
        /** Pops up the [param dialog] in the editor UI with [method Window.popup_exclusive_centered_ratio]. The dialog must have no current parent, otherwise the method fails.  
         *  See also [method Window.set_unparent_when_invisible].  
         */
        static popupDialogCenteredRatio(dialog: Window, ratio?: float64 /* = 0.8 */): void
        
        /** Pops up the [param dialog] in the editor UI with [method Window.popup_exclusive_centered_clamped]. The dialog must have no current parent, otherwise the method fails.  
         *  See also [method Window.set_unparent_when_invisible].  
         */
        static popupDialogCenteredClamped(dialog: Window, minsize?: Vector2I /* = Vector2I.ZERO */, fallbackRatio?: float64 /* = 0.75 */): void
        
        /** Returns the name of the currently activated feature profile. If the default profile is currently active, an empty string is returned instead.  
         *  In order to get a reference to the [EditorFeatureProfile], you must load the feature profile using [method EditorFeatureProfile.load_from_file].  
         *      
         *  **Note:** Feature profiles created via the user interface are loaded from the `feature_profiles` directory, as a file with the `.profile` extension. The editor configuration folder can be found by using [method EditorPaths.get_config_dir].  
         */
        static getCurrentFeatureProfile(): string
        
        /** Selects and activates the specified feature profile with the given [param profile_name]. Set [param profile_name] to an empty string to reset to the default feature profile.  
         *  A feature profile can be created programmatically using the [EditorFeatureProfile] class.  
         *      
         *  **Note:** The feature profile that gets activated must be located in the `feature_profiles` directory, as a file with the `.profile` extension. If a profile could not be found, an error occurs. The editor configuration folder can be found by using [method EditorPaths.get_config_dir].  
         */
        static setCurrentFeatureProfile(profileName: string): void
        
        /** Pops up an editor dialog for selecting a [Node] from the edited scene. The [param callback] must take a single argument of type [NodePath]. It is called on the selected [NodePath] or the empty path `^""` if the dialog is canceled. If [param valid_types] is provided, the dialog will only show Nodes that match one of the listed Node types. If [param current_value] is provided, the Node will be automatically selected in the tree, if it exists.  
         *  **Example:** Display the node selection dialog as soon as this node is added to the tree for the first time:  
         *    
         */
        static popupNodeSelector(callback: Callable, validTypes?: GArray<StringName>, currentValue?: Node): void
        
        /** Pops up an editor dialog for selecting properties from [param object]. The [param callback] must take a single argument of type [NodePath]. It is called on the selected property path (see [method NodePath.get_as_property_path]) or the empty path `^""` if the dialog is canceled. If [param type_filter] is provided, the dialog will only show properties that match one of the listed [enum Variant.Type] values. If [param current_value] is provided, the property will be selected automatically in the property list, if it exists.  
         *    
         */
        static popupPropertySelector(object: GObject, callback: Callable, typeFilter?: PackedInt32Array | int32[] /* = [] */, currentValue?: string /* = '' */): void
        
        /** Pops up an editor dialog for selecting a method from [param object]. The [param callback] must take a single argument of type [String] which will contain the name of the selected method or be empty if the dialog is canceled. If [param current_value] is provided, the method will be selected automatically in the method list, if it exists. */
        static popupMethodSelector(object: GObject, callback: Callable, currentValue?: string /* = '' */): void
        
        /** Pops up an editor dialog for quick selecting a resource file. The [param callback] must take a single argument of type [String] which will contain the path of the selected resource or be empty if the dialog is canceled. If [param base_types] is provided, the dialog will only show resources that match these types. Only types deriving from [Resource] are supported. */
        static popupQuickOpen(callback: Callable, baseTypes?: GArray<StringName>): void
        
        /** Pops up an editor dialog for creating an object.  
         *  The [param callback] must take a single argument of type [String], which will contain the type name of the selected object (or the script path of the type, if the type is created from a script), or be an empty string if no item is selected.  
         *  The [param base_type] specifies the base type of objects to display. For example, if you set this to "Resource", all types derived from [Resource] will display in the create dialog.  
         *  The [param current_type] will be passed in the search box of the create dialog, and the specified type can be immediately selected when the dialog pops up. If the [param current_type] is not derived from [param base_type], there will be no result of the type in the dialog.  
         *  The [param dialog_title] allows you to define a custom title for the dialog. This is useful if you want to accurately hint the usage of the dialog. If the [param dialog_title] is an empty string, the dialog will use "Create New 'Base Type'" as the default title.  
         *  The [param type_blocklist] contains a list of type names, and the types in the blocklist will be hidden from the create dialog.  
         *      
         *  **Note:** Trying to list the base type in the [param type_blocklist] will hide all types derived from the base type from the create dialog.  
         */
        static popupCreateDialog(callback: Callable, baseType?: StringName /* = '' */, currentType?: string /* = '' */, dialogTitle?: string /* = '' */, typeBlocklist?: GArray<StringName>): void
        
        /** Returns the editor's [FileSystemDock] instance.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        static getFileSystemDock(): null | FileSystemDock
        
        /** Selects the file, with the path provided by [param file], in the FileSystem dock. */
        static selectFile(file: string): void
        
        /** Returns an array containing the paths of the currently selected files (and directories) in the [FileSystemDock]. */
        static getSelectedPaths(): PackedStringArray
        
        /** Returns the current path being viewed in the [FileSystemDock]. */
        static getCurrentPath(): string
        
        /** Returns the current directory being viewed in the [FileSystemDock]. If a file is selected, its base directory will be returned using [method String.get_base_dir] instead. */
        static getCurrentDirectory(): string
        
        /** Returns the editor's [EditorInspector] instance.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        static getInspector(): null | EditorInspector
        
        /** Shows the given property on the given [param object] in the editor's Inspector dock. If [param inspector_only] is `true`, plugins will not attempt to edit [param object]. */
        static inspectObject(object: GObject, forProperty?: string /* = '' */, inspectorOnly?: boolean /* = false */): void
        
        /** Edits the given [Resource]. If the resource is a [Script] you can also edit it with [method edit_script] to specify the line and column position. */
        static editResource(resource: Resource): void
        
        /** Edits the given [Node]. The node will be also selected if it's inside the scene tree. */
        static editNode(node: Node): void
        
        /** Edits the given [Script]. The line and column on which to open the script can also be specified. The script will be open with the user-configured editor for the script's language which may be an external editor. */
        static editScript(script: Script, line?: int64 /* = -1 */, column?: int64 /* = 0 */, grabFocus?: boolean /* = true */): void
        
        /** Opens the scene at the given path. If [param set_inherited] is `true`, creates a new inherited scene. */
        static openSceneFromPath(sceneFilepath: string, setInherited?: boolean /* = false */): void
        
        /** Reloads the scene at the given path. Fails if the scene is not open. */
        static reloadSceneFromPath(sceneFilepath: string): void
        
        /** If [param edited] is `true`, the object is marked as edited.  
         *      
         *  **Note:** This is primarily used by the editor for [Resource] based objects to track their modified state. For example, any changes to an open scene, a resource in the inspector, or an edited script will cause this method to be called with `true`. Saving the scene, script, or resource resets the edited state by calling this method with `false`.  
         *      
         *  **Note:** Each call to this method increments the object's edited version. This is used to track changes in the editor and to trigger when thumbnails should be regenerated for resources.  
         */
        static setObjectEdited(object: GObject, edited: boolean): void
        
        /** Returns `true` if the object has been marked as edited through [method set_object_edited]. */
        static isObjectEdited(object: GObject): boolean
        
        /** Returns an array with the file paths of the currently opened scenes. */
        static getOpenScenes(): PackedStringArray
        
        /** Returns an array of file paths of currently unsaved scenes. */
        static getUnsavedScenes(): PackedStringArray
        
        /** Returns an array with references to the root nodes of the currently opened scenes. */
        static getOpenSceneRoots(): GArray<Node>
        
        /** Returns the edited (current) scene's root [Node]. */
        static getEditedSceneRoot(): null | Node
        
        /** Makes [param node] root of the currently opened scene. Only works if the scene is empty. If the [param node] is a scene instance, an inheriting scene will be created. */
        static addRootNode(node: Node): void
        
        /** Saves the currently active scene. Returns either [constant OK] or [constant ERR_CANT_CREATE]. */
        static saveScene(): GError
        
        /** Saves the currently active scene as a file at [param path]. */
        static saveSceneAs(path: string, withPreview?: boolean /* = true */): void
        
        /** Saves all opened scenes in the editor. */
        static saveAllScenes(): void
        
        /** Closes the currently active scene, discarding any pending changes in the process. Returns [constant OK] on success or [constant ERR_DOES_NOT_EXIST] if there is no scene to close. */
        static closeScene(): GError
        
        /** Marks the current scene tab as unsaved. */
        static markSceneAsUnsaved(): void
        
        /** Plays the main scene. */
        static playMainScene(): void
        
        /** Plays the currently active scene. */
        static playCurrentScene(): void
        
        /** Plays the scene specified by its filepath. */
        static playCustomScene(sceneFilepath: string): void
        
        /** Stops the scene that is currently playing. */
        static stopPlayingScene(): void
        
        /** Returns `true` if a scene is currently being played, `false` otherwise. Paused scenes are considered as being played. */
        static isPlayingScene(): boolean
        
        /** Returns the name of the scene that is being played. If no scene is currently being played, returns an empty string. */
        static getPlayingScene(): string
        
        /** If `true`, enables distraction-free mode which hides side docks to increase the space available for the main view. */
        static get distractionFreeMode(): boolean
        static set distractionFreeMode(value: boolean)
        
        /** If `true`, the Movie Maker mode is enabled in the editor. See [MovieWriter] for more information. */
        static get movieMakerEnabled(): boolean
        static set movieMakerEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorInterface;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorInterface;
    }
    // _singleton_class_: GDScriptLanguageProtocol
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapGDScriptLanguageProtocol extends __RPCMapJsonRpc {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapGDScriptLanguageProtocol extends __NameMapJsonRpc {
        get_text_document: "getTextDocument";
        get_workspace: "getWorkspace";
        is_smart_resolve_enabled: "isSmartResolveEnabled";
        is_initialized: "isInitialized";
        on_client_connected: "onClientConnected";
        on_client_disconnected: "onClientDisconnected";
        notify_client: "notifyClient";
    }
    /** GDScript language server.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_gdscriptlanguageprotocol.html  
     */
    class GDScriptLanguageProtocol extends JsonRpc {
        /** Returns the language server's [GDScriptTextDocument] instance. */
        static getTextDocument(): null | GDScriptTextDocument
        
        /** Returns the language server's [GDScriptWorkspace] instance. */
        static getWorkspace(): null | GDScriptWorkspace
        
        /** Returns `true` if the language server is providing the smart resolve feature, `false` otherwise. The feature can be configured through the editor settings. */
        static isSmartResolveEnabled(): boolean
        
        /** Returns `true` if the language server was initialized by a language server client, `false` otherwise. */
        static isInitialized(): boolean
        static initialize(params: GDictionary): any
        static initialized(params: any): void
        static onClientConnected(): GError
        static onClientDisconnected(clientId: int64): void
        static notifyClient(method: string, params?: any /* = {} */, clientId?: int64 /* = -1 */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapGDScriptLanguageProtocol;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapGDScriptLanguageProtocol;
    }
    // _singleton_class_: JavaClassWrapper
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapJavaClassWrapper extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapJavaClassWrapper extends __NameMapGObject {
        get_exception: "getException";
        create_sam_callback: "createSamCallback";
        create_proxy: "createProxy";
    }
    /** Provides access to the Java Native Interface.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_javaclasswrapper.html  
     */
    class JavaClassWrapper extends GObject {
        /** Wraps a class defined in Java, and returns it as a [JavaClass] [Object] type that Godot can interact with.  
         *  When wrapping inner (nested) classes, use `$` instead of `.` to separate them. For example, `JavaClassWrapper.wrap("android.view.WindowManager$LayoutParams")` wraps the **WindowManager.LayoutParams** class.  
         *      
         *  **Note:** To invoke a constructor, call a method with the same name as the class. For example:  
         *    
         *      
         *  **Note:** This method only works on Android. On every other platform, this method does nothing and returns an empty [JavaClass].  
         */
        static wrap(name: string): null | JavaClass
        
        /** Returns the Java exception from the last call into a Java class. If there was no exception, it will return `null`.  
         *      
         *  **Note:** This method only works on Android. On every other platform, this method will always return `null`.  
         */
        static getException(): null | JavaObject
        
        /** Creates a [JavaObject] implementing the Java Single Abstract Method (SAM) interface using the Godot [Callable] as the implementation.  
         *  The [param sam_interface] **must be** a Java SAM interface, meaning it must only have a single abstract method to implement.  
         *  The [param callable] must be able to handle the same parameter types as the SAM interface method, and must provide the same return type. The [param callable] will be invoked as a callback, passing the arguments from the Java SAM interface method.  
         *    
         *      
         *  **Note:** This method only works on Android. On every other platform, this method will always return `null`.  
         */
        static createSamCallback(samInterface: string, callable: Callable): JavaObject
        
        /** Creates a [JavaObject] implementing the given Java interfaces using the given [Object] as the implementation.  
         *  The [param object] must contain methods signatures matching the methods signatures from the passed Java [param interfaces]. Invoking methods from the Java [param interfaces] will route to the matching [param object] method.  
         *    
         *      
         *  **Note:** This method only works on Android. On every other platform, this method will always return `null`.  
         */
        static createProxy(object: GObject, interfaces: PackedStringArray | string[]): JavaObject
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapJavaClassWrapper;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapJavaClassWrapper;
    }
    // _singleton_class_: JavaScriptBridge
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapJavaScriptBridge extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapJavaScriptBridge extends __NameMapGObject {
        get_interface: "getInterface";
        create_callback: "createCallback";
        is_js_buffer: "isJSBuffer";
        js_buffer_to_packed_byte_array: "jSBufferToPackedByteArray";
        create_object: "createObject";
        download_buffer: "downloadBuffer";
        pwa_needs_update: "pwaNeedsUpdate";
        pwa_update: "pwaUpdate";
        force_fs_sync: "forceFsSync";
        pwa_update_available: "pwaUpdateAvailable";
    }
    /** Singleton that connects the engine with the browser's JavaScript context in Web export.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_javascriptbridge.html  
     */
    class JavaScriptBridge extends GObject {
        /** Execute the string [param code] as JavaScript code within the browser window. This is a call to the actual global JavaScript function [code skip-lint]eval()`.  
         *  If [param use_global_execution_context] is `true`, the code will be evaluated in the global execution context. Otherwise, it is evaluated in the execution context of a function within the engine's runtime environment.  
         */
        static eval(code: string, useGlobalExecutionContext?: boolean /* = false */): any
        
        /** Returns an interface to a JavaScript object that can be used by scripts. The [param interface] must be a valid property of the JavaScript `window`. The callback must accept a single [Array] argument, which will contain the JavaScript `arguments`. See [JavaScriptObject] for usage. */
        static getInterface(interface: string): null | JavaScriptObject
        
        /** Creates a reference to a [Callable] that can be used as a callback by JavaScript. The reference must be kept until the callback happens, or it won't be called at all. See [JavaScriptObject] for usage.  
         *      
         *  **Note:** The callback function must take exactly one [Array] argument, which is going to be the JavaScript [url=https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments]arguments object[/url] converted to an array.  
         */
        static createCallback(callable: Callable): JavaScriptObject
        
        /** Returns `true` if the given [param javascript_object] is of type [url=https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer]ArrayBuffer[/url], [url=https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView]DataView[/url], or one of the many [url=https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray]typed array objects[/url]. */
        static isJSBuffer(javascriptObject: JavaScriptObject): boolean
        
        /** Returns a copy of [param javascript_buffer]'s contents as a [PackedByteArray]. See also [method is_js_buffer]. */
        static jSBufferToPackedByteArray(javascriptBuffer: JavaScriptObject): PackedByteArray
        
        /** Creates a new JavaScript object using the `new` constructor. The [param object] must a valid property of the JavaScript `window`. See [JavaScriptObject] for usage. */
        static createObject(object: string, ...varargs: any[]): any
        
        /** Prompts the user to download a file containing the specified [param buffer]. The file will have the given [param name] and [param mime] type.  
         *      
         *  **Note:** The browser may override the [url=https://en.wikipedia.org/wiki/Media_type]MIME type[/url] provided based on the file [param name]'s extension.  
         *      
         *  **Note:** Browsers might block the download if [method download_buffer] is not being called from a user interaction (e.g. button click).  
         *      
         *  **Note:** Browsers might ask the user for permission or block the download if multiple download requests are made in a quick succession.  
         */
        static downloadBuffer(buffer: PackedByteArray | byte[] | ArrayBuffer, name: string, mime?: string /* = 'application/octet-stream' */): void
        
        /** Returns `true` if a new version of the progressive web app is waiting to be activated.  
         *      
         *  **Note:** Only relevant when exported as a Progressive Web App.  
         */
        static pwaNeedsUpdate(): boolean
        
        /** Performs the live update of the progressive web app. Forcing the new version to be installed and the page to be reloaded.  
         *      
         *  **Note:** Your application will be **reloaded in all browser tabs**.  
         *      
         *  **Note:** Only relevant when exported as a Progressive Web App and [method pwa_needs_update] returns `true`.  
         */
        static pwaUpdate(): GError
        
        /** Force synchronization of the persistent file system (when enabled).  
         *      
         *  **Note:** This is only useful for modules or extensions that can't use [FileAccess] to write files.  
         */
        static forceFsSync(): void
        
        /** Emitted when an update for this progressive web app has been detected but is waiting to be activated because a previous version is active. See [method pwa_update] to force the update to take place immediately. */
        static readonly pwaUpdateAvailable: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapJavaScriptBridge;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapJavaScriptBridge;
    }
    // _singleton_class_: AccessibilityServer
    namespace AccessibilityServer {
        enum AccessibilityRole {
            RoleUnknown = 0,
            RoleDefaultButton = 1,
            RoleAudio = 2,
            RoleVideo = 3,
            RoleStaticText = 4,
            RoleContainer = 5,
            RolePanel = 6,
            RoleButton = 7,
            RoleLink = 8,
            RoleCheckBox = 9,
            RoleRadioButton = 10,
            RoleCheckButton = 11,
            RoleScrollBar = 12,
            RoleScrollView = 13,
            RoleSplitter = 14,
            RoleSlider = 15,
            RoleSpinButton = 16,
            RoleProgressIndicator = 17,
            RoleTextField = 18,
            RoleMultilineTextField = 19,
            RoleColorPicker = 20,
            RoleTable = 21,
            RoleCell = 22,
            RoleRow = 23,
            RoleRowGroup = 24,
            RoleRowHeader = 25,
            RoleColumnHeader = 26,
            RoleTree = 27,
            RoleTreeItem = 28,
            RoleList = 29,
            RoleListItem = 30,
            RoleListBox = 31,
            RoleListBoxOption = 32,
            RoleTabBar = 33,
            RoleTab = 34,
            RoleTabPanel = 35,
            RoleMenuBar = 36,
            RoleMenu = 37,
            RoleMenuItem = 38,
            RoleMenuItemCheckBox = 39,
            RoleMenuItemRadio = 40,
            RoleImage = 41,
            RoleWindow = 42,
            RoleTitleBar = 43,
            RoleDialog = 44,
            RoleTooltip = 45,
            RoleRegion = 46,
            RoleTextRun = 47,
        }
        enum AccessibilityPopupType {
            PopupMenu = 0,
            PopupList = 1,
            PopupTree = 2,
            PopupDialog = 3,
        }
        enum AccessibilityFlags {
            FlagHidden = 0,
            FlagMultiselectable = 1,
            FlagRequired = 2,
            FlagVisited = 3,
            FlagBusy = 4,
            FlagModal = 5,
            FlagTouchPassthrough = 6,
            FlagReadonly = 7,
            FlagDisabled = 8,
            FlagClipsChildren = 9,
        }
        enum AccessibilityAction {
            ActionClick = 0,
            ActionFocus = 1,
            ActionBlur = 2,
            ActionCollapse = 3,
            ActionExpand = 4,
            ActionDecrement = 5,
            ActionIncrement = 6,
            ActionHideTooltip = 7,
            ActionShowTooltip = 8,
            ActionSetTextSelection = 9,
            ActionReplaceSelectedText = 10,
            ActionScrollBackward = 11,
            ActionScrollDown = 12,
            ActionScrollForward = 13,
            ActionScrollLeft = 14,
            ActionScrollRight = 15,
            ActionScrollUp = 16,
            ActionScrollIntoView = 17,
            ActionScrollToPoint = 18,
            ActionSetScrollOffset = 19,
            ActionSetValue = 20,
            ActionShowContextMenu = 21,
            ActionCustom = 22,
        }
        enum AccessibilityLiveMode {
            LiveOff = 0,
            LivePolite = 1,
            LiveAssertive = 2,
        }
        enum AccessibilityScrollUnit {
            ScrollUnitItem = 0,
            ScrollUnitPage = 1,
        }
        enum AccessibilityScrollHint {
            ScrollHintTopLeft = 0,
            ScrollHintBottomRight = 1,
            ScrollHintTopEdge = 2,
            ScrollHintBottomEdge = 3,
            ScrollHintLeftEdge = 4,
            ScrollHintRightEdge = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAccessibilityServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAccessibilityServer extends __NameMapGObject {
        is_supported: "isSupported";
        create_element: "createElement";
        create_sub_element: "createSubElement";
        create_sub_text_edit_elements: "createSubTextEditElements";
        has_element: "hasElement";
        free_element: "freeElement";
        element_set_meta: "elementSetMeta";
        element_get_meta: "elementGetMeta";
        _update_if_active: "_updateIfActive";
        set_window_rect: "setWindowRect";
        set_window_focused: "setWindowFocused";
        update_set_focus: "updateSetFocus";
        get_window_root: "getWindowRoot";
        update_set_role: "updateSetRole";
        update_set_name: "updateSetName";
        update_set_braille_label: "updateSetBrailleLabel";
        update_set_braille_role_description: "updateSetBrailleRoleDescription";
        update_set_extra_info: "updateSetExtraInfo";
        update_set_description: "updateSetDescription";
        update_set_value: "updateSetValue";
        update_set_tooltip: "updateSetTooltip";
        update_set_bounds: "updateSetBounds";
        update_set_transform: "updateSetTransform";
        update_add_child: "updateAddChild";
        update_add_related_controls: "updateAddRelatedControls";
        update_add_related_details: "updateAddRelatedDetails";
        update_add_related_described_by: "updateAddRelatedDescribedBy";
        update_add_related_flow_to: "updateAddRelatedFlowTo";
        update_add_related_labeled_by: "updateAddRelatedLabeledBy";
        update_add_related_radio_group: "updateAddRelatedRadioGroup";
        update_set_active_descendant: "updateSetActiveDescendant";
        update_set_next_on_line: "updateSetNextOnLine";
        update_set_previous_on_line: "updateSetPreviousOnLine";
        update_set_member_of: "updateSetMemberOf";
        update_set_in_page_link_target: "updateSetInPageLinkTarget";
        update_set_error_message: "updateSetErrorMessage";
        update_set_live: "updateSetLive";
        update_add_action: "updateAddAction";
        update_add_custom_action: "updateAddCustomAction";
        update_set_table_row_count: "updateSetTableRowCount";
        update_set_table_column_count: "updateSetTableColumnCount";
        update_set_table_row_index: "updateSetTableRowIndex";
        update_set_table_column_index: "updateSetTableColumnIndex";
        update_set_table_cell_position: "updateSetTableCellPosition";
        update_set_table_cell_span: "updateSetTableCellSpan";
        update_set_list_item_count: "updateSetListItemCount";
        update_set_list_item_index: "updateSetListItemIndex";
        update_set_list_item_level: "updateSetListItemLevel";
        update_set_list_item_selected: "updateSetListItemSelected";
        update_set_list_item_expanded: "updateSetListItemExpanded";
        update_set_popup_type: "updateSetPopupType";
        update_set_checked: "updateSetChecked";
        update_set_num_value: "updateSetNumValue";
        update_set_num_range: "updateSetNumRange";
        update_set_num_step: "updateSetNumStep";
        update_set_num_jump: "updateSetNumJump";
        update_set_scroll_x: "updateSetScrollX";
        update_set_scroll_x_range: "updateSetScrollXRange";
        update_set_scroll_y: "updateSetScrollY";
        update_set_scroll_y_range: "updateSetScrollYRange";
        update_set_text_decorations: "updateSetTextDecorations";
        update_set_text_align: "updateSetTextAlign";
        update_set_text_selection: "updateSetTextSelection";
        update_set_flag: "updateSetFlag";
        update_set_classname: "updateSetClassname";
        update_set_placeholder: "updateSetPlaceholder";
        update_set_language: "updateSetLanguage";
        update_set_text_orientation: "updateSetTextOrientation";
        update_set_list_orientation: "updateSetListOrientation";
        update_set_shortcut: "updateSetShortcut";
        update_set_url: "updateSetUrl";
        update_set_role_description: "updateSetRoleDescription";
        update_set_state_description: "updateSetStateDescription";
        update_set_color_value: "updateSetColorValue";
        update_set_background_color: "updateSetBackgroundColor";
        update_set_foreground_color: "updateSetForegroundColor";
    }
    /** A server interface for screen reader support.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_accessibilityserver.html  
     */
    class AccessibilityServer extends GObject {
        /** Returns `true` if screen reader is support by this implementation. */
        static isSupported(): boolean
        
        /** Creates a new, empty accessibility element resource.  
         *      
         *  **Note:** An accessibility element is created and freed automatically for each [Node]. In general, this function should not be called manually.  
         */
        static createElement(windowId: int64, role: AccessibilityServer.AccessibilityRole): Rid
        
        /** Creates a new, empty accessibility sub-element resource. Sub-elements can be used to provide accessibility information for objects which are not [Node]s, such as list items, table cells, or menu items. Sub-elements are freed automatically when the parent element is freed, or can be freed early using the [method free_element] method. */
        static createSubElement(parentRid: Rid, role: AccessibilityServer.AccessibilityRole, insertPos?: int64 /* = -1 */): Rid
        
        /** Creates a new, empty accessibility sub-element from the shaped text buffer. Sub-elements are freed automatically when the parent element is freed, or can be freed early using the [method free_element] method.  
         *  If [param is_last_line] is `true`, no trailing newline is appended to the text content. Set to `true` for the last line in multi-line text fields and for single-line text fields.  
         */
        static createSubTextEditElements(parentRid: Rid, shapedText: Rid, minHeight: float64, insertPos?: int64 /* = -1 */, isLastLine?: boolean /* = false */): Rid
        
        /** Returns `true` if [param id] is a valid accessibility element. */
        static hasElement(id: Rid): boolean
        
        /** Frees the accessibility element [param id] created by [method create_element], [method create_sub_element], or [method create_sub_text_edit_elements]. */
        static freeElement(id: Rid): void
        
        /** Sets the metadata of the accessibility element [param id] to [param meta]. */
        static elementSetMeta(id: Rid, meta: any): void
        
        /** Returns the metadata of the accessibility element [param id]. */
        static elementGetMeta(id: Rid): any
        static _updateIfActive(callback: Callable): void
        
        /** Sets window outer (with decorations) and inner (without decorations) bounds for assistive apps.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** Advanced users only! [Window] objects call this method automatically.  
         */
        static setWindowRect(windowId: int64, rectOut: Rect2, rectIn: Rect2): void
        
        /** Sets the window focused state for assistive apps.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** Advanced users only! [Window] objects call this method automatically.  
         */
        static setWindowFocused(windowId: int64, focused: boolean): void
        
        /** Sets currently focused element. */
        static updateSetFocus(id: Rid): void
        
        /** Returns the main accessibility element of the OS native window. */
        static getWindowRoot(windowId: int64): Rid
        
        /** Sets element accessibility role. */
        static updateSetRole(id: Rid, role: AccessibilityServer.AccessibilityRole): void
        
        /** Sets element accessibility name. */
        static updateSetName(id: Rid, name: string): void
        
        /** Sets element accessibility label for Braille display. */
        static updateSetBrailleLabel(id: Rid, name: string): void
        
        /** Sets element accessibility role description for Braille display. */
        static updateSetBrailleRoleDescription(id: Rid, description: string): void
        
        /** Sets element accessibility extra information added to the element name. */
        static updateSetExtraInfo(id: Rid, name: string): void
        
        /** Sets element accessibility description. */
        static updateSetDescription(id: Rid, description: string): void
        
        /** Sets element text value. */
        static updateSetValue(id: Rid, value: string): void
        
        /** Sets tooltip text. */
        static updateSetTooltip(id: Rid, tooltip: string): void
        
        /** Sets element bounding box, relative to the node position. */
        static updateSetBounds(id: Rid, rect: Rect2): void
        
        /** Sets element 2D transform. */
        static updateSetTransform(id: Rid, transform: Transform2D): void
        
        /** Adds a child accessibility element.  
         *      
         *  **Note:** [Node] children and sub-elements are added to the child list automatically.  
         */
        static updateAddChild(id: Rid, childId: Rid): void
        
        /** Adds an element that is controlled by this element. */
        static updateAddRelatedControls(id: Rid, relatedId: Rid): void
        
        /** Adds an element that details this element. */
        static updateAddRelatedDetails(id: Rid, relatedId: Rid): void
        
        /** Adds an element that describes this element. */
        static updateAddRelatedDescribedBy(id: Rid, relatedId: Rid): void
        
        /** Adds an element that this element flow into. */
        static updateAddRelatedFlowTo(id: Rid, relatedId: Rid): void
        
        /** Adds an element that labels this element. */
        static updateAddRelatedLabeledBy(id: Rid, relatedId: Rid): void
        
        /** Adds an element that is part of the same radio group.  
         *      
         *  **Note:** This method should be called on each element of the group, using all other elements as [param related_id].  
         */
        static updateAddRelatedRadioGroup(id: Rid, relatedId: Rid): void
        
        /** Adds an element that is an active descendant of this element. */
        static updateSetActiveDescendant(id: Rid, otherId: Rid): void
        
        /** Sets next element on the line. */
        static updateSetNextOnLine(id: Rid, otherId: Rid): void
        
        /** Sets previous element on the line. */
        static updateSetPreviousOnLine(id: Rid, otherId: Rid): void
        
        /** Sets the element to be a member of the group. */
        static updateSetMemberOf(id: Rid, groupId: Rid): void
        
        /** Sets target element for the link. */
        static updateSetInPageLinkTarget(id: Rid, otherId: Rid): void
        
        /** Sets an element which contains an error message for this element. */
        static updateSetErrorMessage(id: Rid, otherId: Rid): void
        
        /** Sets the priority of the live region updates. */
        static updateSetLive(id: Rid, live: AccessibilityServer.AccessibilityLiveMode): void
        
        /** Adds a callback for the accessibility action (action which can be performed by using a special screen reader command or buttons on the Braille display), and marks this action as supported. The action callback receives one [Variant] argument, which value depends on action type. */
        static updateAddAction(id: Rid, action: AccessibilityServer.AccessibilityAction, callable: Callable): void
        
        /** Adds support for a custom accessibility action. [param action_id] is passed as an argument to the callback of [constant ACTION_CUSTOM] action. */
        static updateAddCustomAction(id: Rid, actionId: int64, actionDescription: string): void
        
        /** Sets number of rows in the table. */
        static updateSetTableRowCount(id: Rid, count: int64): void
        
        /** Sets number of columns in the table. */
        static updateSetTableColumnCount(id: Rid, count: int64): void
        
        /** Sets position of the row in the table. */
        static updateSetTableRowIndex(id: Rid, index: int64): void
        
        /** Sets position of the column. */
        static updateSetTableColumnIndex(id: Rid, index: int64): void
        
        /** Sets cell position in the table. */
        static updateSetTableCellPosition(id: Rid, rowIndex: int64, columnIndex: int64): void
        
        /** Sets cell row/column span. */
        static updateSetTableCellSpan(id: Rid, rowSpan: int64, columnSpan: int64): void
        
        /** Sets number of items in the list. */
        static updateSetListItemCount(id: Rid, size: int64): void
        
        /** Sets the position of the element in the list. */
        static updateSetListItemIndex(id: Rid, index: int64): void
        
        /** Sets the hierarchical level of the element in the list. */
        static updateSetListItemLevel(id: Rid, level: int64): void
        
        /** Sets list/tree item selected status. */
        static updateSetListItemSelected(id: Rid, selected: boolean): void
        
        /** Sets list/tree item expanded status. */
        static updateSetListItemExpanded(id: Rid, expanded: boolean): void
        
        /** Sets popup type for popup buttons. */
        static updateSetPopupType(id: Rid, popup: AccessibilityServer.AccessibilityPopupType): void
        
        /** Sets element checked state. */
        static updateSetChecked(id: Rid, checekd: boolean): void
        
        /** Sets numeric value. */
        static updateSetNumValue(id: Rid, position: float64): void
        
        /** Sets numeric value range. */
        static updateSetNumRange(id: Rid, min: float64, max: float64): void
        
        /** Sets numeric value step. */
        static updateSetNumStep(id: Rid, step: float64): void
        
        /** Sets numeric value jump. */
        static updateSetNumJump(id: Rid, jump: float64): void
        
        /** Sets scroll bar x position. */
        static updateSetScrollX(id: Rid, position: float64): void
        
        /** Sets scroll bar x range. */
        static updateSetScrollXRange(id: Rid, min: float64, max: float64): void
        
        /** Sets scroll bar y position. */
        static updateSetScrollY(id: Rid, position: float64): void
        
        /** Sets scroll bar y range. */
        static updateSetScrollYRange(id: Rid, min: float64, max: float64): void
        
        /** Sets text underline/overline/strikethrough. */
        static updateSetTextDecorations(id: Rid, underline: boolean, strikethrough: boolean, overline: boolean, color?: Color /* = new Color(0, 0, 0, 1) */): void
        
        /** Sets element text alignment. */
        static updateSetTextAlign(id: Rid, align: HorizontalAlignment): void
        
        /** Sets text selection to the text field. [param text_start_id] and [param text_end_id] should be elements created by [method create_sub_text_edit_elements]. Character offsets are relative to the corresponding element. */
        static updateSetTextSelection(id: Rid, textStartId: Rid, startChar: int64, textEndId: Rid, endChar: int64): void
        
        /** Sets element flag. */
        static updateSetFlag(id: Rid, flag: AccessibilityServer.AccessibilityFlags, value: boolean): void
        
        /** Sets element class name. */
        static updateSetClassname(id: Rid, classname: string): void
        
        /** Sets placeholder text. */
        static updateSetPlaceholder(id: Rid, placeholder: string): void
        
        /** Sets element text language. */
        static updateSetLanguage(id: Rid, language: string): void
        
        /** Sets text orientation. */
        static updateSetTextOrientation(id: Rid, vertical: boolean): void
        
        /** Sets the orientation of the list elements. */
        static updateSetListOrientation(id: Rid, vertical: boolean): void
        
        /** Sets the list of keyboard shortcuts used by element. */
        static updateSetShortcut(id: Rid, shortcut: string): void
        
        /** Sets link URL. */
        static updateSetUrl(id: Rid, url: string): void
        
        /** Sets element accessibility role description text. */
        static updateSetRoleDescription(id: Rid, description: string): void
        
        /** Sets human-readable description of the current checked state. */
        static updateSetStateDescription(id: Rid, description: string): void
        
        /** Sets element color value. */
        static updateSetColorValue(id: Rid, color: Color): void
        
        /** Sets element background color. */
        static updateSetBackgroundColor(id: Rid, color: Color): void
        
        /** Sets element foreground color. */
        static updateSetForegroundColor(id: Rid, color: Color): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAccessibilityServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAccessibilityServer;
    }
    // _singleton_class_: AudioServer
    namespace AudioServer {
        enum SpeakerMode {
            SpeakerModeStereo = 0,
            SpeakerSurround31 = 1,
            SpeakerSurround51 = 2,
            SpeakerSurround71 = 3,
        }
        enum PlaybackType {
            PlaybackTypeDefault = 0,
            PlaybackTypeStream = 1,
            PlaybackTypeSample = 2,
            PlaybackTypeMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioServer extends __NameMapGObject {
        remove_bus: "removeBus";
        add_bus: "addBus";
        move_bus: "moveBus";
        set_bus_name: "setBusName";
        get_bus_name: "getBusName";
        get_bus_index: "getBusIndex";
        get_bus_channels: "getBusChannels";
        set_bus_volume_db: "setBusVolumeDb";
        get_bus_volume_db: "getBusVolumeDb";
        set_bus_volume_linear: "setBusVolumeLinear";
        get_bus_volume_linear: "getBusVolumeLinear";
        set_bus_send: "setBusSend";
        get_bus_send: "getBusSend";
        set_bus_solo: "setBusSolo";
        is_bus_solo: "isBusSolo";
        set_bus_mute: "setBusMute";
        is_bus_mute: "isBusMute";
        set_bus_bypass_effects: "setBusBypassEffects";
        is_bus_bypassing_effects: "isBusBypassingEffects";
        add_bus_effect: "addBusEffect";
        remove_bus_effect: "removeBusEffect";
        get_bus_effect_count: "getBusEffectCount";
        get_bus_effect: "getBusEffect";
        get_bus_effect_instance: "getBusEffectInstance";
        swap_bus_effects: "swapBusEffects";
        set_bus_effect_enabled: "setBusEffectEnabled";
        is_bus_effect_enabled: "isBusEffectEnabled";
        get_bus_peak_volume_left_db: "getBusPeakVolumeLeftDb";
        get_bus_peak_volume_right_db: "getBusPeakVolumeRightDb";
        get_speaker_mode: "getSpeakerMode";
        get_mix_rate: "getMixRate";
        get_input_mix_rate: "getInputMixRate";
        get_driver_name: "getDriverName";
        get_output_device_list: "getOutputDeviceList";
        get_time_to_next_mix: "getTimeToNextMix";
        get_time_since_last_mix: "getTimeSinceLastMix";
        get_output_latency: "getOutputLatency";
        get_input_device_list: "getInputDeviceList";
        set_input_device_active: "setInputDeviceActive";
        get_input_frames_available: "getInputFramesAvailable";
        get_input_buffer_length_frames: "getInputBufferLengthFrames";
        get_input_frames: "getInputFrames";
        set_bus_layout: "setBusLayout";
        generate_bus_layout: "generateBusLayout";
        set_enable_tagging_used_audio_streams: "setEnableTaggingUsedAudioStreams";
        is_stream_registered_as_sample: "isStreamRegisteredAsSample";
        register_stream_as_sample: "registerStreamAsSample";
        bus_count: "busCount";
        output_device: "outputDevice";
        input_device: "inputDevice";
        playback_speed_scale: "playbackSpeedScale";
        bus_layout_changed: "busLayoutChanged";
        bus_renamed: "busRenamed";
    }
    /** Server interface for low-level audio access.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioserver.html  
     */
    class AudioServer extends GObject {
        /** Removes the bus at index [param index]. */
        static removeBus(index: int64): void
        
        /** Adds a bus at [param at_position]. */
        static addBus(atPosition?: int64 /* = -1 */): void
        
        /** Moves the bus from index [param index] to index [param to_index]. */
        static moveBus(index: int64, toIndex: int64): void
        
        /** Sets the name of the bus at index [param bus_idx] to [param name]. */
        static setBusName(busIdx: int64, name: string): void
        
        /** Returns the name of the bus with the index [param bus_idx]. */
        static getBusName(busIdx: int64): string
        
        /** Returns the index of the bus with the name [param bus_name]. Returns `-1` if no bus with the specified name exist. */
        static getBusIndex(busName: StringName): int64
        
        /** Returns the number of channels of the bus at index [param bus_idx]. */
        static getBusChannels(busIdx: int64): int64
        
        /** Sets the volume in decibels of the bus at index [param bus_idx] to [param volume_db]. */
        static setBusVolumeDb(busIdx: int64, volumeDb: float64): void
        
        /** Returns the volume of the bus at index [param bus_idx] in dB. */
        static getBusVolumeDb(busIdx: int64): float64
        
        /** Sets the volume as a linear value of the bus at index [param bus_idx] to [param volume_linear].  
         *      
         *  **Note:** Using this method is equivalent to calling [method set_bus_volume_db] with the result of [method @GlobalScope.linear_to_db] on a value.  
         */
        static setBusVolumeLinear(busIdx: int64, volumeLinear: float64): void
        
        /** Returns the volume of the bus at index [param bus_idx] as a linear value.  
         *      
         *  **Note:** The returned value is equivalent to the result of [method @GlobalScope.db_to_linear] on the result of [method get_bus_volume_db].  
         */
        static getBusVolumeLinear(busIdx: int64): float64
        
        /** Connects the output of the bus at [param bus_idx] to the bus named [param send]. */
        static setBusSend(busIdx: int64, send: StringName): void
        
        /** Returns the name of the bus that the bus at index [param bus_idx] sends to. */
        static getBusSend(busIdx: int64): StringName
        
        /** If `true`, the bus at index [param bus_idx] is in solo mode. */
        static setBusSolo(busIdx: int64, enable: boolean): void
        
        /** If `true`, the bus at index [param bus_idx] is in solo mode. */
        static isBusSolo(busIdx: int64): boolean
        
        /** If `true`, the bus at index [param bus_idx] is muted. */
        static setBusMute(busIdx: int64, enable: boolean): void
        
        /** If `true`, the bus at index [param bus_idx] is muted. */
        static isBusMute(busIdx: int64): boolean
        
        /** If `true`, the bus at index [param bus_idx] is bypassing effects. */
        static setBusBypassEffects(busIdx: int64, enable: boolean): void
        
        /** If `true`, the bus at index [param bus_idx] is bypassing effects. */
        static isBusBypassingEffects(busIdx: int64): boolean
        
        /** Adds an [AudioEffect] effect to the bus [param bus_idx] at [param at_position]. */
        static addBusEffect(busIdx: int64, effect: AudioEffect, atPosition?: int64 /* = -1 */): void
        
        /** Removes the effect at index [param effect_idx] from the bus at index [param bus_idx]. */
        static removeBusEffect(busIdx: int64, effectIdx: int64): void
        
        /** Returns the number of effects on the bus at [param bus_idx]. */
        static getBusEffectCount(busIdx: int64): int64
        
        /** Returns the [AudioEffect] at position [param effect_idx] in bus [param bus_idx]. */
        static getBusEffect(busIdx: int64, effectIdx: int64): null | AudioEffect
        
        /** Returns the [AudioEffectInstance] assigned to the given bus and effect indices (and optionally channel). */
        static getBusEffectInstance(busIdx: int64, effectIdx: int64, channel?: int64 /* = 0 */): null | AudioEffectInstance
        
        /** Swaps the position of two effects in bus [param bus_idx]. */
        static swapBusEffects(busIdx: int64, effectIdx: int64, byEffectIdx: int64): void
        
        /** If `true`, the effect at index [param effect_idx] on the bus at index [param bus_idx] is enabled. */
        static setBusEffectEnabled(busIdx: int64, effectIdx: int64, enabled: boolean): void
        
        /** If `true`, the effect at index [param effect_idx] on the bus at index [param bus_idx] is enabled. */
        static isBusEffectEnabled(busIdx: int64, effectIdx: int64): boolean
        
        /** Returns the peak volume of the left speaker at bus index [param bus_idx] and channel index [param channel]. */
        static getBusPeakVolumeLeftDb(busIdx: int64, channel: int64): float64
        
        /** Returns the peak volume of the right speaker at bus index [param bus_idx] and channel index [param channel]. */
        static getBusPeakVolumeRightDb(busIdx: int64, channel: int64): float64
        
        /** Locks the audio driver's main loop.  
         *      
         *  **Note:** Remember to unlock it afterwards.  
         */
        static lock(): void
        
        /** Unlocks the audio driver's main loop. (After locking it, you should always unlock it.) */
        static unlock(): void
        
        /** Returns the speaker configuration. */
        static getSpeakerMode(): AudioServer.SpeakerMode
        
        /** Returns the sample rate at the output of the [AudioServer]. */
        static getMixRate(): float64
        
        /** Returns the sample rate at the input of the [AudioServer]. */
        static getInputMixRate(): float64
        
        /** Returns the name of the current audio driver. The default usually depends on the operating system, but may be overridden via the `--audio-driver` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url]. `--headless` also automatically sets the audio driver to `Dummy`. See also [member ProjectSettings.audio/driver/driver]. */
        static getDriverName(): string
        
        /** Returns the names of all audio output devices detected on the system. */
        static getOutputDeviceList(): PackedStringArray
        
        /** Returns the relative time until the next mix occurs, in seconds. */
        static getTimeToNextMix(): float64
        
        /** Returns the relative time since the last mix occurred, in seconds. */
        static getTimeSinceLastMix(): float64
        
        /** Returns the audio driver's effective output latency. This is based on [member ProjectSettings.audio/driver/output_latency], but the exact returned value will differ depending on the operating system and audio driver.  
         *      
         *  **Note:** This can be expensive; it is not recommended to call [method get_output_latency] every frame.  
         */
        static getOutputLatency(): float64
        
        /** Returns the names of all audio input devices detected on the system.  
         *      
         *  **Note:** [member ProjectSettings.audio/driver/enable_input] must be `true` for audio input to work. See also that setting's description for caveats related to permissions and operating system privacy settings.  
         */
        static getInputDeviceList(): PackedStringArray
        
        /** If [param active] is `true`, starts the microphone input stream specified by [member input_device] or returns an error if it failed.  
         *  If [param active] is `false`, stops the input stream if it is running.  
         */
        static setInputDeviceActive(active: boolean): GError
        
        /** Returns the number of frames available to read using [method get_input_frames]. */
        static getInputFramesAvailable(): int64
        
        /** Returns the absolute size of the microphone input buffer. This is set to a multiple of the audio latency and can be used to estimate the minimum rate at which the frames need to be fetched. */
        static getInputBufferLengthFrames(): int64
        
        /** Returns a [PackedVector2Array] containing exactly [param frames] audio samples from the internal microphone buffer if available, otherwise returns an empty [PackedVector2Array].  
         *  The buffer is filled at the rate of [method get_input_mix_rate] frames per second when [method set_input_device_active] has successfully been set to `true`.  
         *  The samples are signed floating-point PCM values between `-1` and `1`.  
         */
        static getInputFrames(frames: int64): PackedVector2Array
        
        /** Overwrites the currently used [AudioBusLayout]. */
        static setBusLayout(busLayout: AudioBusLayout): void
        
        /** Generates an [AudioBusLayout] using the available buses and effects. */
        static generateBusLayout(): null | AudioBusLayout
        
        /** If set to `true`, all instances of [AudioStreamPlayback] will call [method AudioStreamPlayback._tag_used_streams] every mix step.  
         *      
         *  **Note:** This is enabled by default in the editor, as it is used by editor plugins for the audio stream previews.  
         */
        static setEnableTaggingUsedAudioStreams(enable: boolean): void
        
        /** If `true`, the stream is registered as a sample. The engine will not have to register it before playing the sample.  
         *  If `false`, the stream will have to be registered before playing it. To prevent lag spikes, register the stream as sample with [method register_stream_as_sample].  
         */
        static isStreamRegisteredAsSample(stream: AudioStream): boolean
        
        /** Forces the registration of a stream as a sample.  
         *      
         *  **Note:** Lag spikes may occur when calling this method, especially on single-threaded builds. It is suggested to call this method while loading assets, where the lag spike could be masked, instead of registering the sample right before it needs to be played.  
         */
        static registerStreamAsSample(stream: AudioStream): void
        
        /** Number of available audio buses. */
        static get busCount(): int64
        static set busCount(value: int64)
        
        /** Name of the current device for audio output (see [method get_output_device_list]). On systems with multiple audio outputs (such as analog, USB and HDMI audio), this can be used to select the audio output device. The value `"Default"` will play audio on the system-wide default audio output. If an invalid device name is set, the value will be reverted back to `"Default"`. */
        static get outputDevice(): string
        static set outputDevice(value: string)
        
        /** Name of the current device for audio input (see [method get_input_device_list]). On systems with multiple audio inputs (such as analog, USB and HDMI audio), this can be used to select the audio input device. The value `"Default"` will record audio on the system-wide default audio input. If an invalid device name is set, the value will be reverted back to `"Default"`.  
         *      
         *  **Note:** [member ProjectSettings.audio/driver/enable_input] must be `true` for audio input to work. See also that setting's description for caveats related to permissions and operating system privacy settings.  
         */
        static get inputDevice(): string
        static set inputDevice(value: string)
        
        /** Scales the rate at which audio is played (i.e. setting it to `0.5` will make the audio be played at half its speed). See also [member Engine.time_scale] to affect the general simulation speed, which is independent from [member AudioServer.playback_speed_scale]. */
        static get playbackSpeedScale(): float64
        static set playbackSpeedScale(value: float64)
        
        /** Emitted when an audio bus is added, deleted, or moved. */
        static readonly busLayoutChanged: Signal<() => void>
        
        /** Emitted when the audio bus at [param bus_index] is renamed from [param old_name] to [param new_name]. */
        static readonly busRenamed: Signal<(busIndex: int64, oldName: StringName, newName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioServer;
    }
    // _singleton_class_: CameraServer
    namespace CameraServer {
        enum FeedImage {
            FeedRgbaImage = 0,
            FeedYcbcrImage = 0,
            FeedYImage = 0,
            FeedCbcrImage = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraServer extends __NameMapGObject {
        get_feed: "getFeed";
        get_feed_count: "getFeedCount";
        add_feed: "addFeed";
        remove_feed: "removeFeed";
        monitoring_feeds: "monitoringFeeds";
        camera_feed_added: "cameraFeedAdded";
        camera_feed_removed: "cameraFeedRemoved";
        camera_feeds_updated: "cameraFeedsUpdated";
    }
    /** Server keeping track of different cameras accessible in Godot.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cameraserver.html  
     */
    class CameraServer extends GObject {
        /** Returns the [CameraFeed] corresponding to the camera with the given [param index]. */
        static getFeed(index: int64): null | CameraFeed
        
        /** Returns the number of [CameraFeed]s registered. */
        static getFeedCount(): int64
        
        /** Returns an array of [CameraFeed]s. */
        static feeds(): GArray<CameraFeed>
        
        /** Adds the camera [param feed] to the camera server. */
        static addFeed(feed: CameraFeed): void
        
        /** Removes the specified camera [param feed]. */
        static removeFeed(feed: CameraFeed): void
        
        /** If `true`, the server is actively monitoring available camera feeds.  
         *  This has a performance cost, so only set it to `true` when you're actively accessing the camera.  
         *      
         *  **Note:** After setting it to `true`, you can receive updated camera feeds through the [signal camera_feeds_updated] signal.  
         *    
         */
        static get monitoringFeeds(): boolean
        static set monitoringFeeds(value: boolean)
        
        /** Emitted when a [CameraFeed] is added (e.g. a webcam is plugged in). */
        static readonly cameraFeedAdded: Signal<(id: int64) => void>
        
        /** Emitted when a [CameraFeed] is removed (e.g. a webcam is unplugged). */
        static readonly cameraFeedRemoved: Signal<(id: int64) => void>
        
        /** Emitted when camera feeds are updated. */
        static readonly cameraFeedsUpdated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraServer;
    }
    // _singleton_class_: DisplayServer
    namespace DisplayServer {
        enum Feature {
            FeatureGlobalMenu = 0,
            FeatureSubwindows = 1,
            FeatureTouchscreen = 2,
            FeatureMouse = 3,
            FeatureMouseWarp = 4,
            FeatureClipboard = 5,
            FeatureVirtualKeyboard = 6,
            FeatureCursorShape = 7,
            FeatureCustomCursorShape = 8,
            FeatureNativeDialog = 9,
            FeatureIme = 10,
            FeatureWindowTransparency = 11,
            FeatureHidpi = 12,
            FeatureIcon = 13,
            FeatureNativeIcon = 14,
            FeatureOrientation = 15,
            FeatureSwapBuffers = 16,
            FeatureClipboardPrimary = 18,
            FeatureTextToSpeech = 19,
            FeatureExtendToTitle = 20,
            FeatureScreenCapture = 21,
            FeatureStatusIndicator = 22,
            FeatureNativeHelp = 23,
            FeatureNativeDialogInput = 24,
            FeatureNativeDialogFile = 25,
            FeatureNativeDialogFileExtra = 26,
            FeatureWindowDrag = 27,
            FeatureScreenExcludeFromCapture = 28,
            FeatureWindowEmbedding = 29,
            FeatureNativeDialogFileMime = 30,
            FeatureEmojiAndSymbolPicker = 31,
            FeatureNativeColorPicker = 32,
            FeatureSelfFittingWindows = 33,
            FeatureAccessibilityScreenReader = 34,
            FeatureHdrOutput = 35,
            FeaturePipMode = 36,
            FeatureEmbedded = 37,
        }
        enum AccessibilityRole {
            RoleUnknown = 0,
            RoleDefaultButton = 1,
            RoleAudio = 2,
            RoleVideo = 3,
            RoleStaticText = 4,
            RoleContainer = 5,
            RolePanel = 6,
            RoleButton = 7,
            RoleLink = 8,
            RoleCheckBox = 9,
            RoleRadioButton = 10,
            RoleCheckButton = 11,
            RoleScrollBar = 12,
            RoleScrollView = 13,
            RoleSplitter = 14,
            RoleSlider = 15,
            RoleSpinButton = 16,
            RoleProgressIndicator = 17,
            RoleTextField = 18,
            RoleMultilineTextField = 19,
            RoleColorPicker = 20,
            RoleTable = 21,
            RoleCell = 22,
            RoleRow = 23,
            RoleRowGroup = 24,
            RoleRowHeader = 25,
            RoleColumnHeader = 26,
            RoleTree = 27,
            RoleTreeItem = 28,
            RoleList = 29,
            RoleListItem = 30,
            RoleListBox = 31,
            RoleListBoxOption = 32,
            RoleTabBar = 33,
            RoleTab = 34,
            RoleTabPanel = 35,
            RoleMenuBar = 36,
            RoleMenu = 37,
            RoleMenuItem = 38,
            RoleMenuItemCheckBox = 39,
            RoleMenuItemRadio = 40,
            RoleImage = 41,
            RoleWindow = 42,
            RoleTitleBar = 43,
            RoleDialog = 44,
            RoleTooltip = 45,
            RoleRegion = 46,
            RoleTextRun = 47,
        }
        enum AccessibilityPopupType {
            PopupMenu = 0,
            PopupList = 1,
            PopupTree = 2,
            PopupDialog = 3,
        }
        enum AccessibilityFlags {
            FlagHidden = 0,
            FlagMultiselectable = 1,
            FlagRequired = 2,
            FlagVisited = 3,
            FlagBusy = 4,
            FlagModal = 5,
            FlagTouchPassthrough = 6,
            FlagReadonly = 7,
            FlagDisabled = 8,
            FlagClipsChildren = 9,
        }
        enum AccessibilityAction {
            ActionClick = 0,
            ActionFocus = 1,
            ActionBlur = 2,
            ActionCollapse = 3,
            ActionExpand = 4,
            ActionDecrement = 5,
            ActionIncrement = 6,
            ActionHideTooltip = 7,
            ActionShowTooltip = 8,
            ActionSetTextSelection = 9,
            ActionReplaceSelectedText = 10,
            ActionScrollBackward = 11,
            ActionScrollDown = 12,
            ActionScrollForward = 13,
            ActionScrollLeft = 14,
            ActionScrollRight = 15,
            ActionScrollUp = 16,
            ActionScrollIntoView = 17,
            ActionScrollToPoint = 18,
            ActionSetScrollOffset = 19,
            ActionSetValue = 20,
            ActionShowContextMenu = 21,
            ActionCustom = 22,
        }
        enum AccessibilityLiveMode {
            LiveOff = 0,
            LivePolite = 1,
            LiveAssertive = 2,
        }
        enum AccessibilityScrollUnit {
            ScrollUnitItem = 0,
            ScrollUnitPage = 1,
        }
        enum AccessibilityScrollHint {
            ScrollHintTopLeft = 0,
            ScrollHintBottomRight = 1,
            ScrollHintTopEdge = 2,
            ScrollHintBottomEdge = 3,
            ScrollHintLeftEdge = 4,
            ScrollHintRightEdge = 5,
        }
        enum MouseMode {
            MouseModeVisible = 0,
            MouseModeHidden = 1,
            MouseModeCaptured = 2,
            MouseModeConfined = 3,
            MouseModeConfinedHidden = 4,
            MouseModeMax = 5,
        }
        enum ScreenOrientation {
            ScreenLandscape = 0,
            ScreenPortrait = 1,
            ScreenReverseLandscape = 2,
            ScreenReversePortrait = 3,
            ScreenSensorLandscape = 4,
            ScreenSensorPortrait = 5,
            ScreenSensor = 6,
        }
        enum SensorOrientation {
            SensorOrientationUndefined = 0,
            SensorOrientationPortrait = 1,
            SensorOrientationLandscape = 2,
        }
        enum VirtualKeyboardType {
            KeyboardTypeDefault = 0,
            KeyboardTypeMultiline = 1,
            KeyboardTypeNumber = 2,
            KeyboardTypeNumberDecimal = 3,
            KeyboardTypePhone = 4,
            KeyboardTypeEmailAddress = 5,
            KeyboardTypePassword = 6,
            KeyboardTypeUrl = 7,
        }
        enum CursorShape {
            CursorArrow = 0,
            CursorIbeam = 1,
            CursorPointingHand = 2,
            CursorCross = 3,
            CursorWait = 4,
            CursorBusy = 5,
            CursorDrag = 6,
            CursorCanDrop = 7,
            CursorForbidden = 8,
            CursorVsize = 9,
            CursorHsize = 10,
            CursorBdiagsize = 11,
            CursorFdiagsize = 12,
            CursorMove = 13,
            CursorVsplit = 14,
            CursorHsplit = 15,
            CursorHelp = 16,
            CursorMax = 17,
        }
        enum FileDialogMode {
            FileDialogModeOpenFile = 0,
            FileDialogModeOpenFiles = 1,
            FileDialogModeOpenDir = 2,
            FileDialogModeOpenAny = 3,
            FileDialogModeSaveFile = 4,
        }
        enum WindowMode {
            WindowModeWindowed = 0,
            WindowModeMinimized = 1,
            WindowModeMaximized = 2,
            WindowModeFullscreen = 3,
            WindowModeExclusiveFullscreen = 4,
        }
        enum ProgressState {
            ProgressStateNoprogress = 0,
            ProgressStateIndeterminate = 1,
            ProgressStateNormal = 2,
            ProgressStateError = 3,
            ProgressStatePaused = 4,
        }
        enum WindowFlags {
            WindowFlagResizeDisabled = 0,
            WindowFlagBorderless = 1,
            WindowFlagAlwaysOnTop = 2,
            WindowFlagTransparent = 3,
            WindowFlagNoFocus = 4,
            WindowFlagPopup = 5,
            WindowFlagExtendToTitle = 6,
            WindowFlagMousePassthrough = 7,
            WindowFlagSharpCorners = 8,
            WindowFlagExcludeFromCapture = 9,
            WindowFlagPopupWMHint = 10,
            WindowFlagMinimizeDisabled = 11,
            WindowFlagMaximizeDisabled = 12,
            WindowFlagMax = 13,
        }
        enum WindowEvent {
            WindowEventMouseEnter = 0,
            WindowEventMouseExit = 1,
            WindowEventFocusIn = 2,
            WindowEventFocusOut = 3,
            WindowEventCloseRequest = 4,
            WindowEventGoBackRequest = 5,
            WindowEventDpiChange = 6,
            WindowEventTitlebarChange = 7,
            WindowEventForceClose = 8,
            WindowEventOutputMaxLinearValueChanged = 9,
        }
        enum WindowResizeEdge {
            WindowEdgeTopLeft = 0,
            WindowEdgeTop = 1,
            WindowEdgeTopRight = 2,
            WindowEdgeLeft = 3,
            WindowEdgeRight = 4,
            WindowEdgeBottomLeft = 5,
            WindowEdgeBottom = 6,
            WindowEdgeBottomRight = 7,
            WindowEdgeMax = 8,
        }
        enum NotificationStatus {
            NotificationActivated = 0,
            NotificationDismissed = 1,
            NotificationFailed = 2,
        }
        enum VSyncMode {
            VsyncDisabled = 0,
            VsyncEnabled = 1,
            VsyncAdaptive = 2,
            VsyncMailbox = 3,
        }
        enum HandleType {
            DisplayHandle = 0,
            WindowHandle = 1,
            WindowView = 2,
            OpenglContext = 3,
            EglDisplay = 4,
            EglConfig = 5,
            GlxVisualid = 6,
            GlxFbconfig = 7,
        }
        enum TtsUtteranceEvent {
            TtsUtteranceStarted = 0,
            TtsUtteranceEnded = 1,
            TtsUtteranceCanceled = 2,
            TtsUtteranceBoundary = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDisplayServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDisplayServer extends __NameMapGObject {
        has_feature: "hasFeature";
        get_name: "getName";
        help_set_search_callbacks: "helpSetSearchCallbacks";
        global_menu_set_popup_callbacks: "globalMenuSetPopupCallbacks";
        global_menu_add_submenu_item: "globalMenuAddSubmenuItem";
        global_menu_add_item: "globalMenuAddItem";
        global_menu_add_check_item: "globalMenuAddCheckItem";
        global_menu_add_icon_item: "globalMenuAddIconItem";
        global_menu_add_icon_check_item: "globalMenuAddIconCheckItem";
        global_menu_add_radio_check_item: "globalMenuAddRadioCheckItem";
        global_menu_add_icon_radio_check_item: "globalMenuAddIconRadioCheckItem";
        global_menu_add_multistate_item: "globalMenuAddMultistateItem";
        global_menu_add_separator: "globalMenuAddSeparator";
        global_menu_get_item_index_from_text: "globalMenuGetItemIndexFromText";
        global_menu_get_item_index_from_tag: "globalMenuGetItemIndexFromTag";
        global_menu_is_item_checked: "globalMenuIsItemChecked";
        global_menu_is_item_checkable: "globalMenuIsItemCheckable";
        global_menu_is_item_radio_checkable: "globalMenuIsItemRadioCheckable";
        global_menu_get_item_callback: "globalMenuGetItemCallback";
        global_menu_get_item_key_callback: "globalMenuGetItemKeyCallback";
        global_menu_get_item_tag: "globalMenuGetItemTag";
        global_menu_get_item_text: "globalMenuGetItemText";
        global_menu_get_item_submenu: "globalMenuGetItemSubmenu";
        global_menu_get_item_accelerator: "globalMenuGetItemAccelerator";
        global_menu_is_item_disabled: "globalMenuIsItemDisabled";
        global_menu_is_item_hidden: "globalMenuIsItemHidden";
        global_menu_get_item_tooltip: "globalMenuGetItemTooltip";
        global_menu_get_item_state: "globalMenuGetItemState";
        global_menu_get_item_max_states: "globalMenuGetItemMaxStates";
        global_menu_get_item_icon: "globalMenuGetItemIcon";
        global_menu_get_item_indentation_level: "globalMenuGetItemIndentationLevel";
        global_menu_set_item_checked: "globalMenuSetItemChecked";
        global_menu_set_item_checkable: "globalMenuSetItemCheckable";
        global_menu_set_item_radio_checkable: "globalMenuSetItemRadioCheckable";
        global_menu_set_item_callback: "globalMenuSetItemCallback";
        global_menu_set_item_hover_callbacks: "globalMenuSetItemHoverCallbacks";
        global_menu_set_item_key_callback: "globalMenuSetItemKeyCallback";
        global_menu_set_item_tag: "globalMenuSetItemTag";
        global_menu_set_item_text: "globalMenuSetItemText";
        global_menu_set_item_submenu: "globalMenuSetItemSubmenu";
        global_menu_set_item_accelerator: "globalMenuSetItemAccelerator";
        global_menu_set_item_disabled: "globalMenuSetItemDisabled";
        global_menu_set_item_hidden: "globalMenuSetItemHidden";
        global_menu_set_item_tooltip: "globalMenuSetItemTooltip";
        global_menu_set_item_state: "globalMenuSetItemState";
        global_menu_set_item_max_states: "globalMenuSetItemMaxStates";
        global_menu_set_item_icon: "globalMenuSetItemIcon";
        global_menu_set_item_indentation_level: "globalMenuSetItemIndentationLevel";
        global_menu_get_item_count: "globalMenuGetItemCount";
        global_menu_remove_item: "globalMenuRemoveItem";
        global_menu_clear: "globalMenuClear";
        global_menu_get_system_menu_roots: "globalMenuGetSystemMenuRoots";
        tts_is_speaking: "ttsIsSpeaking";
        tts_is_paused: "ttsIsPaused";
        tts_get_voices: "ttsGetVoices";
        tts_get_voices_for_language: "ttsGetVoicesForLanguage";
        tts_speak: "ttsSpeak";
        tts_pause: "ttsPause";
        tts_resume: "ttsResume";
        tts_stop: "ttsStop";
        tts_set_utterance_callback: "ttsSetUtteranceCallback";
        _tts_post_utterance_event: "_ttsPostUtteranceEvent";
        is_dark_mode_supported: "isDarkModeSupported";
        is_dark_mode: "isDarkMode";
        get_accent_color: "getAccentColor";
        get_base_color: "getBaseColor";
        set_system_theme_change_callback: "setSystemThemeChangeCallback";
        mouse_set_mode: "mouseSetMode";
        mouse_get_mode: "mouseGetMode";
        warp_mouse: "warpMouse";
        mouse_get_position: "mouseGetPosition";
        mouse_get_button_state: "mouseGetButtonState";
        clipboard_set: "clipboardSet";
        clipboard_get: "clipboardGet";
        clipboard_get_image: "clipboardGetImage";
        clipboard_has: "clipboardHas";
        clipboard_has_image: "clipboardHasImage";
        clipboard_set_primary: "clipboardSetPrimary";
        clipboard_get_primary: "clipboardGetPrimary";
        get_display_cutouts: "getDisplayCutouts";
        get_display_safe_area: "getDisplaySafeArea";
        get_screen_count: "getScreenCount";
        get_primary_screen: "getPrimaryScreen";
        get_keyboard_focus_screen: "getKeyboardFocusScreen";
        get_screen_from_rect: "getScreenFromRect";
        screen_get_position: "screenGetPosition";
        screen_get_size: "screenGetSize";
        screen_get_usable_rect: "screenGetUsableRect";
        screen_get_dpi: "screenGetDpi";
        screen_get_scale: "screenGetScale";
        is_touchscreen_available: "isTouchscreenAvailable";
        screen_get_max_scale: "screenGetMaxScale";
        screen_get_refresh_rate: "screenGetRefreshRate";
        screen_get_pixel: "screenGetPixel";
        screen_get_image: "screenGetImage";
        screen_get_image_rect: "screenGetImageRect";
        screen_set_orientation: "screenSetOrientation";
        screen_get_orientation: "screenGetOrientation";
        screen_set_keep_on: "screenSetKeepOn";
        screen_is_kept_on: "screenIsKeptOn";
        get_window_list: "getWindowList";
        get_window_at_screen_position: "getWindowAtScreenPosition";
        window_get_native_handle: "windowGetNativeHandle";
        window_get_active_popup: "windowGetActivePopup";
        window_set_popup_safe_rect: "windowSetPopupSafeRect";
        window_get_popup_safe_rect: "windowGetPopupSafeRect";
        window_set_title: "windowSetTitle";
        window_get_title_size: "windowGetTitleSize";
        window_set_mouse_passthrough: "windowSetMousePassthrough";
        window_get_current_screen: "windowGetCurrentScreen";
        window_set_current_screen: "windowSetCurrentScreen";
        window_get_position: "windowGetPosition";
        window_get_position_with_decorations: "windowGetPositionWithDecorations";
        window_set_position: "windowSetPosition";
        window_get_size: "windowGetSize";
        window_set_size: "windowSetSize";
        window_set_rect_changed_callback: "windowSetRectChangedCallback";
        window_set_window_event_callback: "windowSetWindowEventCallback";
        window_set_input_event_callback: "windowSetInputEventCallback";
        window_set_input_text_callback: "windowSetInputTextCallback";
        window_set_drop_files_callback: "windowSetDropFilesCallback";
        window_get_attached_instance_id: "windowGetAttachedInstanceId";
        window_get_max_size: "windowGetMaxSize";
        window_set_max_size: "windowSetMaxSize";
        window_get_min_size: "windowGetMinSize";
        window_set_min_size: "windowSetMinSize";
        window_get_size_with_decorations: "windowGetSizeWithDecorations";
        window_get_mode: "windowGetMode";
        window_set_mode: "windowSetMode";
        window_set_flag: "windowSetFlag";
        window_get_flag: "windowGetFlag";
        window_set_icon: "windowSetIcon";
        window_set_window_buttons_offset: "windowSetWindowButtonsOffset";
        window_get_safe_title_margins: "windowGetSafeTitleMargins";
        window_request_attention: "windowRequestAttention";
        window_set_taskbar_progress_value: "windowSetTaskbarProgressValue";
        window_set_taskbar_progress_state: "windowSetTaskbarProgressState";
        window_move_to_foreground: "windowMoveToForeground";
        window_is_focused: "windowIsFocused";
        window_can_draw: "windowCanDraw";
        window_set_transient: "windowSetTransient";
        window_set_exclusive: "windowSetExclusive";
        window_set_ime_active: "windowSetImeActive";
        window_set_ime_position: "windowSetImePosition";
        window_set_ime_rect: "windowSetImeRect";
        window_set_vsync_mode: "windowSetVsyncMode";
        window_get_vsync_mode: "windowGetVsyncMode";
        window_is_hdr_output_supported: "windowIsHdrOutputSupported";
        window_request_hdr_output: "windowRequestHdrOutput";
        window_is_hdr_output_requested: "windowIsHdrOutputRequested";
        window_is_hdr_output_enabled: "windowIsHdrOutputEnabled";
        window_set_hdr_output_reference_luminance: "windowSetHdrOutputReferenceLuminance";
        window_get_hdr_output_reference_luminance: "windowGetHdrOutputReferenceLuminance";
        window_get_hdr_output_current_reference_luminance: "windowGetHdrOutputCurrentReferenceLuminance";
        window_set_hdr_output_max_luminance: "windowSetHdrOutputMaxLuminance";
        window_get_hdr_output_max_luminance: "windowGetHdrOutputMaxLuminance";
        window_get_hdr_output_current_max_luminance: "windowGetHdrOutputCurrentMaxLuminance";
        window_get_output_max_linear_value: "windowGetOutputMaxLinearValue";
        window_is_maximize_allowed: "windowIsMaximizeAllowed";
        window_maximize_on_title_dbl_click: "windowMaximizeOnTitleDblClick";
        window_minimize_on_title_dbl_click: "windowMinimizeOnTitleDblClick";
        window_start_drag: "windowStartDrag";
        window_start_resize: "windowStartResize";
        window_set_color: "windowSetColor";
        accessibility_should_increase_contrast: "accessibilityShouldIncreaseContrast";
        accessibility_should_reduce_animation: "accessibilityShouldReduceAnimation";
        accessibility_should_reduce_transparency: "accessibilityShouldReduceTransparency";
        accessibility_screen_reader_active: "accessibilityScreenReaderActive";
        accessibility_create_element: "accessibilityCreateElement";
        accessibility_create_sub_element: "accessibilityCreateSubElement";
        accessibility_create_sub_text_edit_elements: "accessibilityCreateSubTextEditElements";
        accessibility_has_element: "accessibilityHasElement";
        accessibility_free_element: "accessibilityFreeElement";
        accessibility_element_set_meta: "accessibilityElementSetMeta";
        accessibility_element_get_meta: "accessibilityElementGetMeta";
        _accessibility_update_if_active: "_accessibilityUpdateIfActive";
        accessibility_set_window_rect: "accessibilitySetWindowRect";
        accessibility_set_window_focused: "accessibilitySetWindowFocused";
        accessibility_update_set_focus: "accessibilityUpdateSetFocus";
        accessibility_get_window_root: "accessibilityGetWindowRoot";
        accessibility_update_set_role: "accessibilityUpdateSetRole";
        accessibility_update_set_name: "accessibilityUpdateSetName";
        accessibility_update_set_extra_info: "accessibilityUpdateSetExtraInfo";
        accessibility_update_set_description: "accessibilityUpdateSetDescription";
        accessibility_update_set_value: "accessibilityUpdateSetValue";
        accessibility_update_set_tooltip: "accessibilityUpdateSetTooltip";
        accessibility_update_set_bounds: "accessibilityUpdateSetBounds";
        accessibility_update_set_transform: "accessibilityUpdateSetTransform";
        accessibility_update_add_child: "accessibilityUpdateAddChild";
        accessibility_update_add_related_controls: "accessibilityUpdateAddRelatedControls";
        accessibility_update_add_related_details: "accessibilityUpdateAddRelatedDetails";
        accessibility_update_add_related_described_by: "accessibilityUpdateAddRelatedDescribedBy";
        accessibility_update_add_related_flow_to: "accessibilityUpdateAddRelatedFlowTo";
        accessibility_update_add_related_labeled_by: "accessibilityUpdateAddRelatedLabeledBy";
        accessibility_update_add_related_radio_group: "accessibilityUpdateAddRelatedRadioGroup";
        accessibility_update_set_active_descendant: "accessibilityUpdateSetActiveDescendant";
        accessibility_update_set_next_on_line: "accessibilityUpdateSetNextOnLine";
        accessibility_update_set_previous_on_line: "accessibilityUpdateSetPreviousOnLine";
        accessibility_update_set_member_of: "accessibilityUpdateSetMemberOf";
        accessibility_update_set_in_page_link_target: "accessibilityUpdateSetInPageLinkTarget";
        accessibility_update_set_error_message: "accessibilityUpdateSetErrorMessage";
        accessibility_update_set_live: "accessibilityUpdateSetLive";
        accessibility_update_add_action: "accessibilityUpdateAddAction";
        accessibility_update_add_custom_action: "accessibilityUpdateAddCustomAction";
        accessibility_update_set_table_row_count: "accessibilityUpdateSetTableRowCount";
        accessibility_update_set_table_column_count: "accessibilityUpdateSetTableColumnCount";
        accessibility_update_set_table_row_index: "accessibilityUpdateSetTableRowIndex";
        accessibility_update_set_table_column_index: "accessibilityUpdateSetTableColumnIndex";
        accessibility_update_set_table_cell_position: "accessibilityUpdateSetTableCellPosition";
        accessibility_update_set_table_cell_span: "accessibilityUpdateSetTableCellSpan";
        accessibility_update_set_list_item_count: "accessibilityUpdateSetListItemCount";
        accessibility_update_set_list_item_index: "accessibilityUpdateSetListItemIndex";
        accessibility_update_set_list_item_level: "accessibilityUpdateSetListItemLevel";
        accessibility_update_set_list_item_selected: "accessibilityUpdateSetListItemSelected";
        accessibility_update_set_list_item_expanded: "accessibilityUpdateSetListItemExpanded";
        accessibility_update_set_popup_type: "accessibilityUpdateSetPopupType";
        accessibility_update_set_checked: "accessibilityUpdateSetChecked";
        accessibility_update_set_num_value: "accessibilityUpdateSetNumValue";
        accessibility_update_set_num_range: "accessibilityUpdateSetNumRange";
        accessibility_update_set_num_step: "accessibilityUpdateSetNumStep";
        accessibility_update_set_num_jump: "accessibilityUpdateSetNumJump";
        accessibility_update_set_scroll_x: "accessibilityUpdateSetScrollX";
        accessibility_update_set_scroll_x_range: "accessibilityUpdateSetScrollXRange";
        accessibility_update_set_scroll_y: "accessibilityUpdateSetScrollY";
        accessibility_update_set_scroll_y_range: "accessibilityUpdateSetScrollYRange";
        accessibility_update_set_text_decorations: "accessibilityUpdateSetTextDecorations";
        accessibility_update_set_text_align: "accessibilityUpdateSetTextAlign";
        accessibility_update_set_text_selection: "accessibilityUpdateSetTextSelection";
        accessibility_update_set_flag: "accessibilityUpdateSetFlag";
        accessibility_update_set_classname: "accessibilityUpdateSetClassname";
        accessibility_update_set_placeholder: "accessibilityUpdateSetPlaceholder";
        accessibility_update_set_language: "accessibilityUpdateSetLanguage";
        accessibility_update_set_text_orientation: "accessibilityUpdateSetTextOrientation";
        accessibility_update_set_list_orientation: "accessibilityUpdateSetListOrientation";
        accessibility_update_set_shortcut: "accessibilityUpdateSetShortcut";
        accessibility_update_set_url: "accessibilityUpdateSetUrl";
        accessibility_update_set_role_description: "accessibilityUpdateSetRoleDescription";
        accessibility_update_set_state_description: "accessibilityUpdateSetStateDescription";
        accessibility_update_set_color_value: "accessibilityUpdateSetColorValue";
        accessibility_update_set_background_color: "accessibilityUpdateSetBackgroundColor";
        accessibility_update_set_foreground_color: "accessibilityUpdateSetForegroundColor";
        ime_get_selection: "imeGetSelection";
        ime_get_text: "imeGetText";
        virtual_keyboard_show: "virtualKeyboardShow";
        virtual_keyboard_hide: "virtualKeyboardHide";
        virtual_keyboard_get_height: "virtualKeyboardGetHeight";
        has_hardware_keyboard: "hasHardwareKeyboard";
        set_hardware_keyboard_connection_change_callback: "setHardwareKeyboardConnectionChangeCallback";
        cursor_set_shape: "cursorSetShape";
        cursor_get_shape: "cursorGetShape";
        cursor_set_custom_image: "cursorSetCustomImage";
        send_toast_notification: "sendToastNotification";
        hide_toast_notification: "hideToastNotification";
        get_swap_cancel_ok: "getSwapCancelOk";
        enable_for_stealing_focus: "enableForStealingFocus";
        dialog_show: "dialogShow";
        dialog_input_text: "dialogInputText";
        file_dialog_show: "fileDialogShow";
        file_dialog_with_options_show: "fileDialogWithOptionsShow";
        keyboard_get_layout_count: "keyboardGetLayoutCount";
        keyboard_get_current_layout: "keyboardGetCurrentLayout";
        keyboard_set_current_layout: "keyboardSetCurrentLayout";
        keyboard_get_layout_language: "keyboardGetLayoutLanguage";
        keyboard_get_layout_name: "keyboardGetLayoutName";
        keyboard_get_keycode_from_physical: "keyboardGetKeycodeFromPhysical";
        keyboard_get_label_from_physical: "keyboardGetLabelFromPhysical";
        show_emoji_and_symbol_picker: "showEmojiAndSymbolPicker";
        color_picker: "colorPicker";
        process_events: "processEvents";
        force_process_and_drop_events: "forceProcessAndDropEvents";
        set_native_icon: "setNativeIcon";
        set_icon: "setIcon";
        create_status_indicator: "createStatusIndicator";
        status_indicator_set_icon: "statusIndicatorSetIcon";
        status_indicator_set_tooltip: "statusIndicatorSetTooltip";
        status_indicator_set_menu: "statusIndicatorSetMenu";
        status_indicator_set_callback: "statusIndicatorSetCallback";
        status_indicator_get_rect: "statusIndicatorGetRect";
        delete_status_indicator: "deleteStatusIndicator";
        tablet_get_driver_count: "tabletGetDriverCount";
        tablet_get_driver_name: "tabletGetDriverName";
        tablet_get_current_driver: "tabletGetCurrentDriver";
        tablet_set_current_driver: "tabletSetCurrentDriver";
        is_window_transparency_available: "isWindowTransparencyAvailable";
        register_additional_output: "registerAdditionalOutput";
        unregister_additional_output: "unregisterAdditionalOutput";
        has_additional_outputs: "hasAdditionalOutputs";
        is_in_pip_mode: "isInPipMode";
        pip_mode_enter: "pipModeEnter";
        pip_mode_set_aspect_ratio: "pipModeSetAspectRatio";
        pip_mode_set_auto_enter_on_background: "pipModeSetAutoEnterOnBackground";
        orientation_changed: "orientationChanged";
    }
    /** A server interface for low-level window management.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_displayserver.html  
     */
    class DisplayServer extends GObject {
        /** The ID that refers to a screen that does not exist. This is returned by some [DisplayServer] methods if no screen matches the requested result. */
        static readonly INVALID_SCREEN = -1
        
        /** Represents the screen containing the mouse pointer.  
         *      
         *  **Note:** On Android, iOS, Web, and Linux (Wayland), this constant always represents the screen at index `0`.  
         */
        static readonly SCREEN_WITH_MOUSE_FOCUS = -4
        
        /** Represents the screen containing the window with the keyboard focus.  
         *      
         *  **Note:** On Android, iOS, Web, and Linux (Wayland), this constant always represents the screen at index `0`.  
         */
        static readonly SCREEN_WITH_KEYBOARD_FOCUS = -3
        
        /** Represents the primary screen.  
         *      
         *  **Note:** On Android, iOS, Web, and Linux (Wayland), this constant always represents the screen at index `0`.  
         */
        static readonly SCREEN_PRIMARY = -2
        
        /** Represents the screen where the main window is located. This is usually the default value in functions that allow specifying one of several screens.  
         *      
         *  **Note:** On Android, iOS, Web, and Linux (Wayland), this constant always represents the screen at index `0`.  
         */
        static readonly SCREEN_OF_MAIN_WINDOW = -1
        
        /** The ID of the main window spawned by the engine, which can be passed to methods expecting a `window_id`. */
        static readonly MAIN_WINDOW_ID = 0
        
        /** The ID that refers to a nonexistent window. This is returned by some [DisplayServer] methods if no window matches the requested result. */
        static readonly INVALID_WINDOW_ID = -1
        
        /** The ID that refers to a nonexistent application status indicator. */
        static readonly INVALID_INDICATOR_ID = -1
        
        /** The ID that refers to a nonexistent toast notification. */
        static readonly INVALID_NOTIFICATION_ID = -1
        
        /** Returns `true` if the specified [param feature] is supported by the current [DisplayServer], `false` otherwise. */
        static hasFeature(feature: DisplayServer.Feature): boolean
        
        /** Returns the name of the [DisplayServer] currently in use. Most operating systems only have a single [DisplayServer], but Linux has access to more than one [DisplayServer] (currently X11 and Wayland).  
         *  The names of built-in display servers are `Windows`, `macOS`, `X11` (Linux), `Wayland` (Linux), `Android`, `iOS`, `web` (HTML5), and `headless` (when started with the `--headless` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url]).  
         */
        static getName(): string
        
        /** Sets native help system search callbacks.  
         *  [param search_callback] has the following arguments: `String search_string, int result_limit` and return a [Dictionary] with "key, display name" pairs for the search results. Called when the user enters search terms in the `Help` menu.  
         *  [param action_callback] has the following arguments: `String key`. Called when the user selects a search result in the `Help` menu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static helpSetSearchCallbacks(searchCallback: Callable, actionCallback: Callable): void
        
        /** Registers callables to emit when the menu is respectively about to show or closed. Callback methods should have zero arguments. */
        static globalMenuSetPopupCallbacks(menuRoot: string, openCallback: Callable, closeCallback: Callable): void
        
        /** Adds an item that will act as a submenu of the global menu [param menu_root]. The [param submenu] argument is the ID of the global menu root that will be shown when the item is clicked.  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddSubmenuItem(menuRoot: string, label: string, submenu: string, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddItem(menuRoot: string, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new checkable item with text [param label] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddCheckItem(menuRoot: string, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] and icon [param icon] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddIconItem(menuRoot: string, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new checkable item with text [param label] and icon [param icon] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddIconCheckItem(menuRoot: string, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new radio-checkable item with text [param label] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** Radio-checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method global_menu_set_item_checked] for more info on how to control it.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddRadioCheckItem(menuRoot: string, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new radio-checkable item with text [param label] and icon [param icon] to the global menu with ID [param menu_root].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** Radio-checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method global_menu_set_item_checked] for more info on how to control it.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddIconRadioCheckItem(menuRoot: string, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] to the global menu with ID [param menu_root].  
         *  Contrarily to normal binary items, multistate items can have more than two states, as defined by [param max_states]. Each press or activate of the item will increase the state by one. The default value is defined by [param default_state].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** By default, there's no indication of the current item state, it should be changed manually.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddMultistateItem(menuRoot: string, label: string, maxStates: int64, defaultState: int64, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a separator between items to the global menu with ID [param menu_root]. Separators also occupy an index.  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuAddSeparator(menuRoot: string, index?: int64 /* = -1 */): int64
        
        /** Returns the index of the item with the specified [param text]. Indices are automatically assigned to each item by the engine, and cannot be set manually.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemIndexFromText(menuRoot: string, text: string): int64
        
        /** Returns the index of the item with the specified [param tag]. Indices are automatically assigned to each item by the engine, and cannot be set manually.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemIndexFromTag(menuRoot: string, tag: any): int64
        
        /** Returns `true` if the item at index [param idx] is checked.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuIsItemChecked(menuRoot: string, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is checkable in some way, i.e. if it has a checkbox or radio button.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuIsItemCheckable(menuRoot: string, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] has radio button-style checkability.  
         *      
         *  **Note:** This is purely cosmetic; you must add the logic for checking/unchecking items in radio groups.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuIsItemRadioCheckable(menuRoot: string, idx: int64): boolean
        
        /** Returns the callback of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemCallback(menuRoot: string, idx: int64): Callable
        
        /** Returns the callback of the item accelerator at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemKeyCallback(menuRoot: string, idx: int64): Callable
        
        /** Returns the metadata of the specified item, which might be of any type. You can set it with [method global_menu_set_item_tag], which provides a simple way of assigning context data to items.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemTag(menuRoot: string, idx: int64): any
        
        /** Returns the text of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemText(menuRoot: string, idx: int64): string
        
        /** Returns the submenu ID of the item at index [param idx]. See [method global_menu_add_submenu_item] for more info on how to add a submenu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemSubmenu(menuRoot: string, idx: int64): string
        
        /** Returns the accelerator of the item at index [param idx]. Accelerators are special combinations of keys that activate the item, no matter which control is focused.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemAccelerator(menuRoot: string, idx: int64): Key
        
        /** Returns `true` if the item at index [param idx] is disabled. When it is disabled it can't be selected, or its action invoked.  
         *  See [method global_menu_set_item_disabled] for more info on how to disable an item.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuIsItemDisabled(menuRoot: string, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is hidden.  
         *  See [method global_menu_set_item_hidden] for more info on how to hide an item.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuIsItemHidden(menuRoot: string, idx: int64): boolean
        
        /** Returns the tooltip associated with the specified index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemTooltip(menuRoot: string, idx: int64): string
        
        /** Returns the state of a multistate item. See [method global_menu_add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemState(menuRoot: string, idx: int64): int64
        
        /** Returns number of states of a multistate item. See [method global_menu_add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemMaxStates(menuRoot: string, idx: int64): int64
        
        /** Returns the icon of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemIcon(menuRoot: string, idx: int64): null | Texture2D
        
        /** Returns the horizontal offset of the item at the given [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemIndentationLevel(menuRoot: string, idx: int64): int64
        
        /** Sets the checkstate status of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemChecked(menuRoot: string, idx: int64, checked: boolean): void
        
        /** Sets whether the item at index [param idx] has a checkbox. If `false`, sets the type of the item to plain text.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemCheckable(menuRoot: string, idx: int64, checkable: boolean): void
        
        /** Sets the type of the item at the specified index [param idx] to radio button. If `false`, sets the type of the item to plain text.  
         *      
         *  **Note:** This is purely cosmetic; you must add the logic for checking/unchecking items in radio groups.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemRadioCheckable(menuRoot: string, idx: int64, checkable: boolean): void
        
        /** Sets the callback of the item at index [param idx]. Callback is emitted when an item is pressed.  
         *      
         *  **Note:** The [param callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemCallback(menuRoot: string, idx: int64, callback: Callable): void
        
        /** Sets the callback of the item at index [param idx]. The callback is emitted when an item is hovered.  
         *      
         *  **Note:** The [param callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemHoverCallbacks(menuRoot: string, idx: int64, callback: Callable): void
        
        /** Sets the callback of the item at index [param idx]. Callback is emitted when its accelerator is activated.  
         *      
         *  **Note:** The [param key_callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemKeyCallback(menuRoot: string, idx: int64, keyCallback: Callable): void
        
        /** Sets the metadata of an item, which may be of any type. You can later get it with [method global_menu_get_item_tag], which provides a simple way of assigning context data to items.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemTag(menuRoot: string, idx: int64, tag: any): void
        
        /** Sets the text of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemText(menuRoot: string, idx: int64, text: string): void
        
        /** Sets the submenu of the item at index [param idx]. The submenu is the ID of a global menu root that would be shown when the item is clicked.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemSubmenu(menuRoot: string, idx: int64, submenu: string): void
        
        /** Sets the accelerator of the item at index [param idx]. [param keycode] can be a single [enum Key], or a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemAccelerator(menuRoot: string, idx: int64, keycode: Key): void
        
        /** Enables/disables the item at index [param idx]. When it is disabled, it can't be selected and its action can't be invoked.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemDisabled(menuRoot: string, idx: int64, disabled: boolean): void
        
        /** Hides/shows the item at index [param idx]. When it is hidden, an item does not appear in a menu and its action cannot be invoked.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemHidden(menuRoot: string, idx: int64, hidden: boolean): void
        
        /** Sets the [String] tooltip of the item at the specified index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemTooltip(menuRoot: string, idx: int64, tooltip: string): void
        
        /** Sets the state of a multistate item. See [method global_menu_add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemState(menuRoot: string, idx: int64, state: int64): void
        
        /** Sets number of state of a multistate item. See [method global_menu_add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemMaxStates(menuRoot: string, idx: int64, maxStates: int64): void
        
        /** Replaces the [Texture2D] icon of the specified [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *      
         *  **Note:** This method is not supported by macOS "_dock" menu items.  
         */
        static globalMenuSetItemIcon(menuRoot: string, idx: int64, icon: Texture2D): void
        
        /** Sets the horizontal offset of the item at the given [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuSetItemIndentationLevel(menuRoot: string, idx: int64, level: int64): void
        
        /** Returns number of items in the global menu with ID [param menu_root].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetItemCount(menuRoot: string): int64
        
        /** Removes the item at index [param idx] from the global menu [param menu_root].  
         *      
         *  **Note:** The indices of items after the removed item will be shifted by one.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuRemoveItem(menuRoot: string, idx: int64): void
        
        /** Removes all items from the global menu with ID [param menu_root].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         *  **Supported system menu IDs:**  
         *  [codeblock lang=text]  
         *  "_main" - Main menu (macOS).  
         *  "_dock" - Dock popup menu (macOS).  
         *  "_apple" - Apple menu (macOS, custom items added before "Services").  
         *  "_window" - Window menu (macOS, custom items added after "Bring All to Front").  
         *  "_help" - Help menu (macOS).  
         *  [/codeblock]  
         */
        static globalMenuClear(menuRoot: string): void
        
        /** Returns Dictionary of supported system menu IDs and names.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static globalMenuGetSystemMenuRoots(): GDictionary
        
        /** Returns `true` if the synthesizer is generating speech, or have utterance waiting in the queue.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsIsSpeaking(): boolean
        
        /** Returns `true` if the synthesizer is in a paused state.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsIsPaused(): boolean
        
        /** Returns an [Array] of voice information dictionaries.  
         *  Each [Dictionary] contains two [String] entries:  
         *  - `name` is voice name.  
         *  - `id` is voice identifier.  
         *  - `language` is language code in `lang_Variant` format. The `lang` part is a 2 or 3-letter code based on the ISO-639 standard, in lowercase. The [code skip-lint]Variant` part is an engine-dependent string describing country, region or/and dialect.  
         *  Note that Godot depends on system libraries for text-to-speech functionality. These libraries are installed by default on Windows and macOS, but not on all Linux distributions. If they are not present, this method will return an empty list. This applies to both Godot users on Linux, as well as end-users on Linux running Godot games that use text-to-speech.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsGetVoices(): GArray<GDictionary>
        
        /** Returns a [PackedStringArray] of voice identifiers for the [param language].  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsGetVoicesForLanguage(language: string): PackedStringArray
        
        /** Adds an utterance to the queue. If [param interrupt] is `true`, the queue is cleared first.  
         *  - [param voice] identifier is one of the `"id"` values returned by [method tts_get_voices] or one of the values returned by [method tts_get_voices_for_language].  
         *  - [param volume] ranges from `0` (lowest) to `100` (highest).  
         *  - [param pitch] ranges from `0.0` (lowest) to `2.0` (highest), `1.0` is default pitch for the current voice.  
         *  - [param rate] ranges from `0.1` (lowest) to `10.0` (highest), `1.0` is a normal speaking rate. Other values act as a percentage relative.  
         *  - [param utterance_id] is passed as a parameter to the callback functions.  
         *      
         *  **Note:** On Windows and Linux (X11/Wayland), utterance [param text] can use SSML markup. SSML support is engine and voice dependent. If the engine does not support SSML, you should strip out all XML markup before calling [method tts_speak].  
         *      
         *  **Note:** The granularity of pitch, rate, and volume is engine and voice dependent. Values may be truncated.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsSpeak(text: string, voice: string, volume?: int64 /* = 50 */, pitch?: float64 /* = 1 */, rate?: float64 /* = 1 */, utteranceId?: int64 /* = 0 */, interrupt?: boolean /* = false */): void
        
        /** Puts the synthesizer into a paused state.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsPause(): void
        
        /** Resumes the synthesizer if it was paused.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsResume(): void
        
        /** Stops synthesis in progress and removes all utterances from the queue.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsStop(): void
        
        /** Adds a callback, which is called when the utterance has started, finished, canceled or reached a text boundary.  
         *  - [constant TTS_UTTERANCE_STARTED], [constant TTS_UTTERANCE_ENDED], and [constant TTS_UTTERANCE_CANCELED] callable's method should take one [int] parameter, the utterance ID.  
         *  - [constant TTS_UTTERANCE_BOUNDARY] callable's method should take two [int] parameters, the index of the character and the utterance ID.  
         *      
         *  **Note:** The granularity of the boundary callbacks is engine dependent.  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, Linux (X11/Wayland), macOS, and Windows.  
         */
        static ttsSetUtteranceCallback(event: DisplayServer.TtsUtteranceEvent, callable: Callable): void
        static _ttsPostUtteranceEvent(event: DisplayServer.TtsUtteranceEvent, id: int64, charPos: int64): void
        
        /** Returns `true` if OS supports dark mode.  
         *      
         *  **Note:** This method is implemented on Android, iOS, macOS, Windows, and Linux (X11/Wayland).  
         */
        static isDarkModeSupported(): boolean
        
        /** Returns `true` if OS is using dark mode.  
         *      
         *  **Note:** This method is implemented on Android, iOS, macOS, Windows, and Linux (X11/Wayland).  
         */
        static isDarkMode(): boolean
        
        /** Returns OS theme accent color. Returns `Color(0, 0, 0, 0)`, if accent color is unknown.  
         *      
         *  **Note:** This method is implemented on macOS, Windows, Android, and Linux (X11/Wayland).  
         */
        static getAccentColor(): Color
        
        /** Returns the OS theme base color (default control background). Returns `Color(0, 0, 0, 0)` if the base color is unknown.  
         *      
         *  **Note:** This method is implemented on macOS, Windows, and Android.  
         */
        static getBaseColor(): Color
        
        /** Sets the callback that should be called when the system's theme settings are changed. [param callable] should accept zero arguments.  
         *      
         *  **Note:** This method is implemented on Android, iOS, macOS, Windows, and Linux (X11/Wayland).  
         */
        static setSystemThemeChangeCallback(callable: Callable): void
        
        /** Sets the current mouse mode. See also [method mouse_get_mode]. */
        static mouseSetMode(mouseMode: DisplayServer.MouseMode): void
        
        /** Returns the current mouse mode. See also [method mouse_set_mode]. */
        static mouseGetMode(): DisplayServer.MouseMode
        
        /** Sets the mouse cursor position to the given [param position] relative to an origin at the upper left corner of the currently focused game Window Manager window.  
         *      
         *  **Note:** [method warp_mouse] is only supported on Windows, macOS, and Linux (X11/Wayland). It has no effect on Android, iOS, and Web.  
         */
        static warpMouse(position: Vector2I): void
        
        /** Returns the mouse cursor's current position in screen coordinates. */
        static mouseGetPosition(): Vector2I
        
        /** Returns the current state of mouse buttons (whether each button is pressed) as a bitmask. If multiple mouse buttons are pressed at the same time, the bits are added together. Equivalent to [method Input.get_mouse_button_mask]. */
        static mouseGetButtonState(): MouseButtonMask
        
        /** Sets the user's clipboard content to the given string. */
        static clipboardSet(clipboard: string): void
        
        /** Returns the user's clipboard as a string if possible. */
        static clipboardGet(): string
        
        /** Returns the user's clipboard as an image if possible.  
         *      
         *  **Note:** This method uses the copied pixel data, e.g. from an image editing software or a web browser, not an image file copied from file explorer.  
         */
        static clipboardGetImage(): null | Image
        
        /** Returns `true` if there is a text content on the user's clipboard. */
        static clipboardHas(): boolean
        
        /** Returns `true` if there is an image content on the user's clipboard. */
        static clipboardHasImage(): boolean
        
        /** Sets the user's [url=https://unix.stackexchange.com/questions/139191/whats-the-difference-between-primary-selection-and-clipboard-buffer]primary[/url] clipboard content to the given string. This is the clipboard that is set when the user selects text in any application, rather than when pressing [kbd]Ctrl + C[/kbd]. The clipboard data can then be pasted by clicking the middle mouse button in any application that supports the primary clipboard mechanism.  
         *      
         *  **Note:** This method is only implemented on Linux (X11/Wayland).  
         */
        static clipboardSetPrimary(clipboardPrimary: string): void
        
        /** Returns the user's [url=https://unix.stackexchange.com/questions/139191/whats-the-difference-between-primary-selection-and-clipboard-buffer]primary[/url] clipboard as a string if possible. This is the clipboard that is set when the user selects text in any application, rather than when pressing [kbd]Ctrl + C[/kbd]. The clipboard data can then be pasted by clicking the middle mouse button in any application that supports the primary clipboard mechanism.  
         *      
         *  **Note:** This method is only implemented on Linux (X11/Wayland).  
         */
        static clipboardGetPrimary(): string
        
        /** Returns an [Array] of [Rect2], each of which is the bounding rectangle for a display cutout or notch. These are non-functional areas on edge-to-edge screens used by cameras and sensors. Returns an empty array if the device does not have cutouts. See also [method get_display_safe_area].  
         *      
         *  **Note:** The returned rectangles are relative to the physical screen and not the virtual desktop.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** Currently only implemented on Android and macOS. Other platforms will return an empty array even if they do have display cutouts or notches.  
         */
        static getDisplayCutouts(screen?: int64 /* = -1 */): GArray<Rect2>
        
        /** Returns the unobscured area of the display where interactive controls should be rendered. See also [method get_display_cutouts].  
         *      
         *  **Note:** The returned rectangle is relative to the physical screen and not the virtual desktop.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** Currently only implemented on Android, iOS, and macOS. On other platforms, `screen_get_usable_rect(SCREEN_OF_MAIN_WINDOW)` will be returned as a fallback. See also [method screen_get_usable_rect].  
         */
        static getDisplaySafeArea(screen?: int64 /* = -1 */): Rect2I
        
        /** Returns the number of displays available.  
         *      
         *  **Note:** This method is implemented on Linux (X11 and Wayland), macOS, and Windows. On other platforms, this method always returns `1`.  
         */
        static getScreenCount(): int64
        
        /** Returns the index of the primary screen.  
         *      
         *  **Note:** This method is implemented on Linux/X11, macOS, and Windows. On other platforms, this method always returns `0`.  
         */
        static getPrimaryScreen(): int64
        
        /** Returns the index of the screen containing the window with the keyboard focus, or the primary screen if there's no focused window.  
         *      
         *  **Note:** This method is implemented on Linux/X11, macOS, and Windows. On other platforms, this method always returns the primary screen.  
         */
        static getKeyboardFocusScreen(): int64
        
        /** Returns the index of the screen that overlaps the most with the given rectangle. Returns [constant INVALID_SCREEN] if the rectangle doesn't overlap with any screen or has no area. */
        static getScreenFromRect(rect: Rect2): int64
        
        /** Returns the screen's top-left corner position in pixels. Returns [constant Vector2i.ZERO] if [param screen] is invalid. On multi-monitor setups, the screen position is relative to the virtual desktop area. On multi-monitor setups with different screen resolutions or orientations, the origin might be located outside any display like this:  
         *  [codeblock lang=text]  
         *  * (0, 0)        ┌───────┐  
         *                  │       │  
         *  ┌─────────────┐ │       │  
         *  │             │ │       │  
         *  │             │ │       │  
         *  └─────────────┘ └───────┘  
         *  [/codeblock]  
         *  See also [method screen_get_size].  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         */
        static screenGetPosition(screen?: int64 /* = -1 */): Vector2I
        
        /** Returns the screen's size in pixels. See also [method screen_get_position] and [method screen_get_usable_rect]. Returns [constant Vector2i.ZERO] if [param screen] is invalid.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         */
        static screenGetSize(screen?: int64 /* = -1 */): Vector2I
        
        /** Returns the portion of the screen that is not obstructed by a status bar in pixels. See also [method screen_get_size].  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Linux/X11, macOS, and Windows. On other platforms, this method always returns `Rect2i(screen_get_position(screen), screen_get_size(screen))`.  
         */
        static screenGetUsableRect(screen?: int64 /* = -1 */): Rect2I
        
        /** Returns the dots per inch density of the specified screen. Returns platform specific default value if [param screen] is invalid.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** On macOS, returned value is inaccurate if fractional display scaling mode is used.  
         *      
         *  **Note:** On Android devices, the actual screen densities are grouped into six generalized densities:  
         *  [codeblock lang=text]  
         *     ldpi - 120 dpi  
         *     mdpi - 160 dpi  
         *     hdpi - 240 dpi  
         *    xhdpi - 320 dpi  
         *   xxhdpi - 480 dpi  
         *  xxxhdpi - 640 dpi  
         *  [/codeblock]  
         *      
         *  **Note:** This method is implemented on Android, iOS, Linux (X11/Wayland), macOS, Web, and Windows. On other platforms, this method always returns `72`.  
         */
        static screenGetDpi(screen?: int64 /* = -1 */): int64
        
        /** Returns the scale factor of the specified screen by index. Returns `1.0` if [param screen] is invalid. See also [method screen_get_max_scale].  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** On macOS, the returned value is `2.0` for hiDPI (Retina) screens, and `1.0` for all other cases.  
         *      
         *  **Note:** On Linux (Wayland), the returned value is accurate only when [param screen] is [constant SCREEN_OF_MAIN_WINDOW]. Due to API limitations, passing a direct index will return a rounded-up integer, if the screen has a fractional scale (e.g. `1.25` would get rounded up to `2.0`).  
         *      
         *  **Note:** This method is implemented on Android, iOS, Web, macOS, Linux, and Windows. On other platforms, this method always returns `1.0`.  
         */
        static screenGetScale(screen?: int64 /* = -1 */): float64
        
        /** Returns `true` if touch events are available (Android or iOS), the capability is detected on the Web platform or if [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse] is `true`. */
        static isTouchscreenAvailable(): boolean
        
        /** Returns the greatest scale factor of all screens. See also [method screen_get_scale].  
         *      
         *  **Note:** On macOS, the returned value is `2.0` if there is at least one hiDPI (Retina) screen in the system, and `1.0` in all other cases.  
         */
        static screenGetMaxScale(): float64
        
        /** Returns the current refresh rate of the specified screen. When V-Sync is enabled, this returns the maximum framerate the project can effectively reach. Returns `-1.0` if [param screen] is invalid or the [DisplayServer] fails to find the refresh rate for the specified screen.  
         *  To fallback to a default refresh rate if the method fails, try:  
         *    
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Android, iOS, macOS, Linux (X11 and Wayland), and Windows. On other platforms, this method always returns `-1.0`.  
         */
        static screenGetRefreshRate(screen?: int64 /* = -1 */): float64
        
        /** Returns the color of the pixel at the given screen [param position]. On multi-monitor setups, the screen position is relative to the virtual desktop area.  
         *      
         *  **Note:** This method is implemented on Linux (X11, excluding XWayland), macOS, and Windows. On other platforms, this method always returns `Color(0, 0, 0, 1)`.  
         *      
         *  **Note:** On macOS, this method requires the "Screen Recording" permission. If permission is not granted, this method returns a color from a screenshot that will not include other application windows or OS elements not related to the application.  
         */
        static screenGetPixel(position: Vector2I): Color
        
        /** Returns a screenshot of the [param screen]. Returns `null` if [param screen] is invalid or the [DisplayServer] fails to capture screenshot.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Linux (X11, excluding XWayland), macOS, and Windows. On other platforms, this method always returns `null`.  
         *      
         *  **Note:** On macOS, this method requires the "Screen Recording" permission. If permission is not granted, this method returns a screenshot that will not include other application windows or OS elements not related to the application.  
         */
        static screenGetImage(screen?: int64 /* = -1 */): null | Image
        
        /** Returns a screenshot of the screen region defined by [param rect]. Returns `null` if [param rect] is outside screen bounds or the [DisplayServer] fails to capture screenshot.  
         *      
         *  **Note:** This method is implemented on macOS and Windows. On other platforms, this method always returns `null`.  
         *      
         *  **Note:** On macOS, this method requires the "Screen Recording" permission. If permission is not granted, this method returns a screenshot that will not include other application windows or OS elements not related to the application.  
         */
        static screenGetImageRect(rect: Rect2I): null | Image
        
        /** Sets the [param screen]'s [param orientation]. See also [method screen_get_orientation].  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Android and iOS.  
         *      
         *  **Note:** On iOS, this method has no effect if [member ProjectSettings.display/window/handheld/orientation] is not set to [constant SCREEN_SENSOR].  
         */
        static screenSetOrientation(orientation: DisplayServer.ScreenOrientation, screen?: int64 /* = -1 */): void
        
        /** Returns the [param screen]'s current orientation. See also [method screen_set_orientation]. Returns [constant SCREEN_LANDSCAPE] if [param screen] is invalid.  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Android and iOS. On other platforms, this method always returns [constant SCREEN_LANDSCAPE].  
         */
        static screenGetOrientation(screen?: int64 /* = -1 */): DisplayServer.ScreenOrientation
        
        /** Sets whether the screen should never be turned off by the operating system's power-saving measures. See also [method screen_is_kept_on]. */
        static screenSetKeepOn(enable: boolean): void
        
        /** Returns `true` if the screen should never be turned off by the operating system's power-saving measures. See also [method screen_set_keep_on]. */
        static screenIsKeptOn(): boolean
        
        /** Returns the list of Godot window IDs belonging to this process.  
         *      
         *  **Note:** Native dialogs are not included in this list.  
         */
        static getWindowList(): PackedInt32Array
        
        /** Returns the ID of the window at the specified screen [param position] (in pixels). On multi-monitor setups, the screen position is relative to the virtual desktop area. On multi-monitor setups with different screen resolutions or orientations, the origin may be located outside any display like this:  
         *  [codeblock lang=text]  
         *  * (0, 0)        ┌───────┐  
         *                  │       │  
         *  ┌─────────────┐ │       │  
         *  │             │ │       │  
         *  │             │ │       │  
         *  └─────────────┘ └───────┘  
         *  [/codeblock]  
         */
        static getWindowAtScreenPosition(position: Vector2I): int64
        
        /** Returns internal structure pointers for use in plugins.  
         *      
         *  **Note:** This method is implemented on Android, Linux (X11/Wayland), macOS, and Windows.  
         */
        static windowGetNativeHandle(handleType: DisplayServer.HandleType, windowId?: int64 /* = 0 */): int64
        
        /** Returns ID of the active popup window, or [constant INVALID_WINDOW_ID] if there is none. */
        static windowGetActivePopup(): int64
        
        /** Sets the bounding box of control, or menu item that was used to open the popup window, in the screen coordinate system. Clicking this area will not auto-close this popup. */
        static windowSetPopupSafeRect(window: int64, rect: Rect2I): void
        
        /** Returns the bounding box of control, or menu item that was used to open the popup window, in the screen coordinate system. */
        static windowGetPopupSafeRect(window: int64): Rect2I
        
        /** Sets the title of the given window to [param title].  
         *      
         *  **Note:** It's recommended to change this value using [member Window.title] instead.  
         *      
         *  **Note:** Avoid changing the window title every frame, as this can cause performance issues on certain window managers. Try to change the window title only a few times per second at most.  
         */
        static windowSetTitle(title: string, windowId?: int64 /* = 0 */): void
        
        /** Returns the estimated window title bar size (including text and window buttons) for the window specified by [param window_id] (in pixels). This method does not change the window title.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static windowGetTitleSize(title: string, windowId?: int64 /* = 0 */): Vector2I
        
        /** Sets a polygonal region of the window which accepts mouse events. Mouse events outside the region will be passed through.  
         *  Passing an empty array will disable passthrough support (all mouse events will be intercepted by the window, which is the default behavior).  
         *    
         *      
         *  **Note:** On Windows, the portion of a window that lies outside the region is not drawn, while on Linux (X11) and macOS it is.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static windowSetMousePassthrough(region: PackedVector2Array | Vector2[], windowId?: int64 /* = 0 */): void
        
        /** Returns the screen the window specified by [param window_id] is currently positioned on. If the screen overlaps multiple displays, the screen where the window's center is located is returned. See also [method window_set_current_screen]. Returns [constant INVALID_SCREEN] if [param window_id] is invalid.  
         *      
         *  **Note:** This method is implemented on Linux/X11, macOS, and Windows. On other platforms, this method always returns `0`.  
         */
        static windowGetCurrentScreen(windowId?: int64 /* = 0 */): int64
        
        /** Moves the window specified by [param window_id] to the specified [param screen]. See also [method window_get_current_screen].  
         *      
         *  **Note:** One of the following constants can be used as [param screen]: [constant SCREEN_OF_MAIN_WINDOW], [constant SCREEN_PRIMARY], [constant SCREEN_WITH_MOUSE_FOCUS], or [constant SCREEN_WITH_KEYBOARD_FOCUS].  
         *      
         *  **Note:** This method is implemented on Linux/X11, macOS, and Windows.  
         */
        static windowSetCurrentScreen(screen: int64, windowId?: int64 /* = 0 */): void
        
        /** Returns the position of the client area of the given window on the screen. */
        static windowGetPosition(windowId?: int64 /* = 0 */): Vector2I
        
        /** Returns the position of the given window on the screen including the borders drawn by the operating system. See also [method window_get_position]. */
        static windowGetPositionWithDecorations(windowId?: int64 /* = 0 */): Vector2I
        
        /** Sets the position of the given window to [param position]. On multi-monitor setups, the screen position is relative to the virtual desktop area. On multi-monitor setups with different screen resolutions or orientations, the origin may be located outside any display like this:  
         *  [codeblock lang=text]  
         *  * (0, 0)        ┌───────┐  
         *                  │       │  
         *  ┌─────────────┐ │       │  
         *  │             │ │       │  
         *  │             │ │       │  
         *  └─────────────┘ └───────┘  
         *  [/codeblock]  
         *  See also [method window_get_position] and [method window_set_size].  
         *      
         *  **Note:** It's recommended to change this value using [member Window.position] instead.  
         *      
         *  **Note:** On Linux (Wayland): this method is a no-op.  
         */
        static windowSetPosition(position: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Returns the size of the window specified by [param window_id] (in pixels), excluding the borders drawn by the operating system. This is also called the "client area". See also [method window_get_size_with_decorations], [method window_set_size] and [method window_get_position]. */
        static windowGetSize(windowId?: int64 /* = 0 */): Vector2I
        
        /** Sets the size of the given window to [param size] (in pixels). See also [method window_get_size] and [method window_get_position].  
         *      
         *  **Note:** It's recommended to change this value using [member Window.size] instead.  
         */
        static windowSetSize(size: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Sets the [param callback] that will be called when the window specified by [param window_id] is moved or resized.  
         *  **Warning:** Advanced users only! Adding such a callback to a [Window] node will override its default implementation, which can introduce bugs.  
         */
        static windowSetRectChangedCallback(callback: Callable, windowId?: int64 /* = 0 */): void
        
        /** Sets the [param callback] that will be called when an event occurs in the window specified by [param window_id].  
         *  **Warning:** Advanced users only! Adding such a callback to a [Window] node will override its default implementation, which can introduce bugs.  
         */
        static windowSetWindowEventCallback(callback: Callable, windowId?: int64 /* = 0 */): void
        
        /** Sets the [param callback] that should be called when any [InputEvent] is sent to the window specified by [param window_id].  
         *  **Warning:** Advanced users only! Adding such a callback to a [Window] node will override its default implementation, which can introduce bugs.  
         */
        static windowSetInputEventCallback(callback: Callable, windowId?: int64 /* = 0 */): void
        
        /** Sets the [param callback] that should be called when text is entered using the virtual keyboard to the window specified by [param window_id].  
         *  **Warning:** Advanced users only! Adding such a callback to a [Window] node will override its default implementation, which can introduce bugs.  
         */
        static windowSetInputTextCallback(callback: Callable, windowId?: int64 /* = 0 */): void
        
        /** Sets the [param callback] that should be called when files are dropped from the operating system's file manager to the window specified by [param window_id]. [param callback] should take one [PackedStringArray] argument, which is the list of dropped files.  
         *  **Warning:** Advanced users only! Adding such a callback to a [Window] node will override its default implementation, which can introduce bugs.  
         *      
         *  **Note:** This method is implemented on Windows, macOS, Linux (X11/Wayland), and Web.  
         *      
         *  **Note:** On the web platform, the files are dropped to a temporary folder and will be removed automatically after the callback.  
         */
        static windowSetDropFilesCallback(callback: Callable, windowId?: int64 /* = 0 */): void
        
        /** Returns the [method Object.get_instance_id] of the [Window] the [param window_id] is attached to. */
        static windowGetAttachedInstanceId(windowId?: int64 /* = 0 */): int64
        
        /** Returns the window's maximum size (in pixels). See also [method window_set_max_size]. */
        static windowGetMaxSize(windowId?: int64 /* = 0 */): Vector2I
        
        /** Sets the maximum size of the window specified by [param window_id] in pixels. Normally, the user will not be able to drag the window to make it larger than the specified size. See also [method window_get_max_size].  
         *      
         *  **Note:** It's recommended to change this value using [member Window.max_size] instead.  
         *      
         *  **Note:** Using third-party tools, it is possible for users to disable window geometry restrictions and therefore bypass this limit.  
         */
        static windowSetMaxSize(maxSize: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Returns the window's minimum size (in pixels). See also [method window_set_min_size]. */
        static windowGetMinSize(windowId?: int64 /* = 0 */): Vector2I
        
        /** Sets the minimum size for the given window to [param min_size] in pixels. Normally, the user will not be able to drag the window to make it smaller than the specified size. See also [method window_get_min_size].  
         *      
         *  **Note:** It's recommended to change this value using [member Window.min_size] instead.  
         *      
         *  **Note:** By default, the main window has a minimum size of `Vector2i(64, 64)`. This prevents issues that can arise when the window is resized to a near-zero size.  
         *      
         *  **Note:** Using third-party tools, it is possible for users to disable window geometry restrictions and therefore bypass this limit.  
         */
        static windowSetMinSize(minSize: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Returns the size of the window specified by [param window_id] (in pixels), including the borders drawn by the operating system. See also [method window_get_size]. */
        static windowGetSizeWithDecorations(windowId?: int64 /* = 0 */): Vector2I
        
        /** Returns the mode of the given window. */
        static windowGetMode(windowId?: int64 /* = 0 */): DisplayServer.WindowMode
        
        /** Sets window mode for the given window to [param mode].  
         *      
         *  **Note:** On Android, setting it to [constant WINDOW_MODE_FULLSCREEN] or [constant WINDOW_MODE_EXCLUSIVE_FULLSCREEN] will enable immersive mode.  
         *      
         *  **Note:** Setting the window to full screen forcibly sets the borderless flag to `true`, so make sure to set it back to `false` when not wanted.  
         */
        static windowSetMode(mode: DisplayServer.WindowMode, windowId?: int64 /* = 0 */): void
        
        /** Enables or disables the given window's given [param flag]. */
        static windowSetFlag(flag: DisplayServer.WindowFlags, enabled: boolean, windowId?: int64 /* = 0 */): void
        
        /** Returns the current value of the given window's [param flag]. */
        static windowGetFlag(flag: DisplayServer.WindowFlags, windowId?: int64 /* = 0 */): boolean
        
        /** Sets the window icon (usually displayed in the top-left corner) for the window specified by [param window_id].  
         *      
         *  **Note:** This method is implemented on Linux and Windows.  
         */
        static windowSetIcon(icon: Image, windowId?: int64 /* = 0 */): void
        
        /** When [constant WINDOW_FLAG_EXTEND_TO_TITLE] flag is set, set offset to the center of the first titlebar button.  
         *      
         *  **Note:** This flag is implemented only on macOS.  
         */
        static windowSetWindowButtonsOffset(offset: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Returns left margins (`x`), right margins (`y`) and height (`z`) of the title that are safe to use (contains no buttons or other elements) when [constant WINDOW_FLAG_EXTEND_TO_TITLE] flag is set. */
        static windowGetSafeTitleMargins(windowId?: int64 /* = 0 */): Vector3I
        
        /** Makes the window specified by [param window_id] request attention, which is materialized by the window title and taskbar entry blinking until the window is focused. This usually has no visible effect if the window is currently focused. The exact behavior varies depending on the operating system. */
        static windowRequestAttention(windowId?: int64 /* = 0 */): void
        
        /** Creates a progress bar on the taskbar/dock icon of the window specified by [param window_id] if it does not exist, sets the progress of the icon.  
         *  [param value] acts as a relative percentage value, ranges from `0.0` (lowest) to `1.0` (highest).  
         *      
         *  **Note:** This method is implemented only on Windows and macOS.  
         *      
         *  **Note:** On macOS, the progress bar is displayed only for the main window.  
         */
        static windowSetTaskbarProgressValue(value: float64, windowId?: int64 /* = 0 */): void
        
        /** Sets the type and state of the progress bar on the taskbar/dock icon of the window specified by [param window_id]. See [enum ProgressState] for possible values and how each mode behaves.  
         *      
         *  **Note:** This method is implemented only on Windows and macOS.  
         *      
         *  **Note:** On macOS, the progress bar is displayed only for the main window.  
         */
        static windowSetTaskbarProgressState(state: DisplayServer.ProgressState, windowId?: int64 /* = 0 */): void
        
        /** Moves the window specified by [param window_id] to the foreground, so that it is visible over other windows. */
        static windowMoveToForeground(windowId?: int64 /* = 0 */): void
        
        /** Returns `true` if the window specified by [param window_id] is focused. */
        static windowIsFocused(windowId?: int64 /* = 0 */): boolean
        
        /** Returns `true` if anything can be drawn in the window specified by [param window_id], `false` otherwise. Using the `--disable-render-loop` command line argument or a headless build will return `false`. */
        static windowCanDraw(windowId?: int64 /* = 0 */): boolean
        
        /** Sets window transient parent. Transient window will be destroyed with its transient parent and will return focus to their parent when closed. The transient window is displayed on top of a non-exclusive full-screen parent window. Transient windows can't enter full-screen mode.  
         *      
         *  **Note:** It's recommended to change this value using [member Window.transient] instead.  
         *      
         *  **Note:** The behavior might be different depending on the platform.  
         */
        static windowSetTransient(windowId: int64, parentWindowId: int64): void
        
        /** If set to `true`, this window will always stay on top of its parent window, parent window will ignore input while this window is opened.  
         *      
         *  **Note:** On macOS, exclusive windows are confined to the same space (virtual desktop or screen) as the parent window.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static windowSetExclusive(windowId: int64, exclusive: boolean): void
        
        /** Sets whether [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] should be enabled for the window specified by [param window_id]. See also [method window_set_ime_position]. */
        static windowSetImeActive(active: boolean, windowId?: int64 /* = 0 */): void
        
        /** Sets the position of the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] popup for the specified [param window_id]. Only effective if [method window_set_ime_active] was set to `true` for the specified [param window_id]. */
        static windowSetImePosition(position: Vector2I, windowId?: int64 /* = 0 */): void
        
        /** Sets a rectangle which should not be obstructed by the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] popup for the specified [param window_id]. Only effective if [method window_set_ime_active] was set to `true` for the specified [param window_id].  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static windowSetImeRect(rect: Rect2I, windowId?: int64 /* = 0 */): void
        
        /** Sets the V-Sync mode of the given window. See also [member ProjectSettings.display/window/vsync/vsync_mode].  
         *  Depending on the platform and used renderer, the engine will fall back to [constant VSYNC_ENABLED] if the desired mode is not supported.  
         *      
         *  **Note:** V-Sync modes other than [constant VSYNC_ENABLED] are only supported in the Forward+ and Mobile rendering methods, not Compatibility.  
         */
        static windowSetVsyncMode(vsyncMode: DisplayServer.VSyncMode, windowId?: int64 /* = 0 */): void
        
        /** Returns the V-Sync mode of the given window. */
        static windowGetVsyncMode(windowId?: int64 /* = 0 */): DisplayServer.VSyncMode
        
        /** Returns `true` if the window specified by [param window_id] supports HDR output. This depends on the platform, screen capabilities, system settings, and the screen the window is currently on. */
        static windowIsHdrOutputSupported(windowId?: int64 /* = 0 */): boolean
        
        /** If [param enable] is `true`, HDR output is requested for the window specified by [param window_id]. The window will automatically switch between HDR and SDR if it is moved between screens, screen capabilities change, or system settings are modified. This will internally force [member Viewport.use_hdr_2d] to be enabled on the main [Viewport]. All other [SubViewport] of the [Window] must have their [member Viewport.use_hdr_2d] property enabled to produce HDR output. Corresponds to [member Window.hdr_output_requested]. */
        static windowRequestHdrOutput(enable: boolean, windowId?: int64 /* = 0 */): void
        
        /** Returns `true` if HDR output is requested for the window specified by [param window_id]. Corresponds to [member Window.hdr_output_requested]. */
        static windowIsHdrOutputRequested(windowId?: int64 /* = 0 */): boolean
        
        /** Returns `true` if HDR output is currently enabled for the window specified by [param window_id]. The returned value may change dynamically based on system settings, screen capabilities, and which screen the window is currently on. */
        static windowIsHdrOutputEnabled(windowId?: int64 /* = 0 */): boolean
        
        /** Sets the reference white luminance in nits (cd/m²) for HDR output by the window specified by [param window_id]. If [param reference_luminance] is negative, the window automatically adjusts to the brightness set by the operating system. By default, this luminance is set to `-1.0` for every window. Typically this property should be left at this default value, but may optionally be exposed as an "HDR Brightness" in-game setting to allow the player to adjust the brightness of their game, independently of their device settings. See also [method window_get_hdr_output_current_reference_luminance] and [method window_get_hdr_output_reference_luminance].  
         *      
         *  **Note:** This method is only implemented on Windows. Other platforms will always use the reference luminance that is reported by the operating system.  
         */
        static windowSetHdrOutputReferenceLuminance(referenceLuminance: float64, windowId?: int64 /* = 0 */): void
        
        /** Returns the reference white luminance in nits (cd/m²) set for HDR output by the window specified by [param window_id]. Negative values indicate that the value is being automatically adjusted to match the operating system brightness. See also [method window_get_hdr_output_current_reference_luminance]. */
        static windowGetHdrOutputReferenceLuminance(windowId?: int64 /* = 0 */): float64
        
        /** When [method window_is_hdr_output_enabled] returns `true`, this returns the current reference white luminance in nits (cd/m²) for HDR output by the window specified by [param window_id]. If the reference luminance is being automatically adjusted to match the operating system brightness, this will return that value. Otherwise, it will return the value set by [method window_set_hdr_output_reference_luminance]. This reference luminance value is used when calculating [method window_get_output_max_linear_value].  
         *      
         *  **Note:** This reference white luminance may not match the physical behavior of the screen, but will always be proportionally correct relative to [method window_get_hdr_output_current_max_luminance].  
         */
        static windowGetHdrOutputCurrentReferenceLuminance(windowId?: int64 /* = 0 */): float64
        
        /** Sets the maximum luminance in nits (cd/m²) for HDR output by the window specified by [param window_id]. If [param max_luminance] is negative, the window uses the screen's maximum luminance that is reported by the operating system. By default, this luminance is set to `-1.0` for every window. Typically this property should be left at this default value, but may optionally be exposed through in-game settings to allow the player to correct an inaccurate maximum luminance reported by the operating system. See also [method window_get_hdr_output_current_max_luminance] and [method window_get_hdr_output_max_luminance].  
         *      
         *  **Note:** This method is only implemented on macOS and Windows. Other platforms will always use the screen's maximum luminance that is reported by the operating system.  
         */
        static windowSetHdrOutputMaxLuminance(maxLuminance: float64, windowId?: int64 /* = 0 */): void
        
        /** Returns the maximum luminance in nits (cd/m²) set for HDR output by the window specified by [param window_id]. Negative values indicate that the value is being automatically adjusted based on the screen's capabilities. See also [method window_get_hdr_output_current_max_luminance]. */
        static windowGetHdrOutputMaxLuminance(windowId?: int64 /* = 0 */): float64
        
        /** When [method window_is_hdr_output_enabled] returns `true`, this returns the current maximum luminance in nits (cd/m²) for HDR output by the window specified by [param window_id]. If the maximum luminance is being automatically adjusted based on the screen's capabilities, this method will return that value. Otherwise, it will return the value set by [method window_set_hdr_output_max_luminance]. This maximum luminance value is used when calculating [method window_get_output_max_linear_value].  
         *      
         *  **Note:** This maximum luminance may not match the physical behavior of the screen, but will always be proportionally correct relative to [method window_get_hdr_output_current_reference_luminance].  
         */
        static windowGetHdrOutputCurrentMaxLuminance(windowId?: int64 /* = 0 */): float64
        
        /** Returns the maximum value for linear color components that can be displayed for the window specified by [param window_id], regardless of SDR or HDR output. Returns `1.0` if HDR is not enabled or not supported. When HDR output is enabled, this is calculated based on [method window_get_hdr_output_current_reference_luminance] and [method window_get_hdr_output_current_max_luminance]. The [signal Window.output_max_linear_value_changed] signal will be emitted whenever this value changes. This value is used by tonemapping and other [Environment] effects to ensure that bright colors are presented in the range that can be displayed by this window. Corresponds to [method Window.get_output_max_linear_value]. */
        static windowGetOutputMaxLinearValue(windowId?: int64 /* = 0 */): float64
        
        /** Returns `true` if the given window can be maximized (the maximize button is enabled). */
        static windowIsMaximizeAllowed(windowId?: int64 /* = 0 */): boolean
        
        /** Returns `true` if double-clicking on a window's title should maximize it.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static windowMaximizeOnTitleDblClick(): boolean
        
        /** Returns `true` if double-clicking on a window's title should minimize it.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static windowMinimizeOnTitleDblClick(): boolean
        
        /** Starts an interactive drag operation on the window with the given [param window_id], using the current mouse position. Call this method when handling a mouse button being pressed to simulate a pressed event on the window's title bar. Using this method allows the window to participate in space switching, tiling, and other system features.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static windowStartDrag(windowId?: int64 /* = 0 */): void
        
        /** Starts an interactive resize operation on the window with the given [param window_id], using the current mouse position. Call this method when handling a mouse button being pressed to simulate a pressed event on the window's edge.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static windowStartResize(edge: DisplayServer.WindowResizeEdge, windowId?: int64 /* = 0 */): void
        
        /** Sets the background color of the root window.  
         *      
         *  **Note:** This method is implemented only on Android.  
         */
        static windowSetColor(color: Color): void
        
        /** Returns `1` if a high-contrast user interface theme should be used, `0` otherwise. Returns `-1` if status is unknown.  
         *      
         *  **Note:** This method is implemented on Android, Linux (X11/Wayland, GNOME), macOS, and Windows.  
         */
        static accessibilityShouldIncreaseContrast(): int64
        
        /** Returns `1` if flashing, blinking, and other moving content that can cause seizures in users with photosensitive epilepsy should be disabled, `0` otherwise. Returns `-1` if status is unknown.  
         *      
         *  **Note:** This method is implemented on Android, macOS, and Windows.  
         */
        static accessibilityShouldReduceAnimation(): int64
        
        /** Returns `1` if background images, transparency, and other features that can reduce the contrast between the foreground and background should be disabled, `0` otherwise. Returns `-1` if status is unknown.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static accessibilityShouldReduceTransparency(): int64
        
        /** Returns `1` if a screen reader, Braille display or other assistive app is active, `0` otherwise. Returns `-1` if status is unknown.  
         *      
         *  **Note:** This method is implemented on Android, Linux, macOS, and Windows.  
         *      
         *  **Note:** Accessibility debugging tools, such as Accessibility Insights for Windows, Accessibility Inspector (macOS), or AT-SPI Browser (Linux/BSD), do not count as assistive apps and will not affect this value. To test your project with these tools, set [member ProjectSettings.accessibility/general/accessibility_support] to `1`.  
         */
        static accessibilityScreenReaderActive(): int64
        
        /** Creates a new, empty accessibility element resource.  
         *      
         *  **Note:** An accessibility element is created and freed automatically for each [Node]. In general, this function should not be called manually.  
         */
        static accessibilityCreateElement(windowId: int64, role: DisplayServer.AccessibilityRole): Rid
        
        /** Creates a new, empty accessibility sub-element resource. Sub-elements can be used to provide accessibility information for objects which are not [Node]s, such as list items, table cells, or menu items. Sub-elements are freed automatically when the parent element is freed, or can be freed early using the [method accessibility_free_element] method. */
        static accessibilityCreateSubElement(parentRid: Rid, role: DisplayServer.AccessibilityRole, insertPos?: int64 /* = -1 */): Rid
        
        /** Creates a new, empty accessibility sub-element from the shaped text buffer. Sub-elements are freed automatically when the parent element is freed, or can be freed early using the [method accessibility_free_element] method.  
         *  If [param is_last_line] is `true`, no trailing newline is appended to the text content. Set to `true` for the last line in multi-line text fields and for single-line text fields.  
         */
        static accessibilityCreateSubTextEditElements(parentRid: Rid, shapedText: Rid, minHeight: float64, insertPos?: int64 /* = -1 */, isLastLine?: boolean /* = false */): Rid
        
        /** Returns `true` if [param id] is a valid accessibility element. */
        static accessibilityHasElement(id: Rid): boolean
        
        /** Frees the accessibility element [param id] created by [method accessibility_create_element], [method accessibility_create_sub_element], or [method accessibility_create_sub_text_edit_elements]. */
        static accessibilityFreeElement(id: Rid): void
        
        /** Sets the metadata of the accessibility element [param id] to [param meta]. */
        static accessibilityElementSetMeta(id: Rid, meta: any): void
        
        /** Returns the metadata of the accessibility element [param id]. */
        static accessibilityElementGetMeta(id: Rid): any
        static _accessibilityUpdateIfActive(callback: Callable): void
        
        /** Sets window outer (with decorations) and inner (without decorations) bounds for assistive apps.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** Advanced users only! [Window] objects call this method automatically.  
         */
        static accessibilitySetWindowRect(windowId: int64, rectOut: Rect2, rectIn: Rect2): void
        
        /** Sets the window focused state for assistive apps.  
         *      
         *  **Note:** This method is implemented on Linux, macOS, and Windows.  
         *      
         *  **Note:** Advanced users only! [Window] objects call this method automatically.  
         */
        static accessibilitySetWindowFocused(windowId: int64, focused: boolean): void
        
        /** Sets currently focused element. */
        static accessibilityUpdateSetFocus(id: Rid): void
        
        /** Returns the main accessibility element of the OS native window. */
        static accessibilityGetWindowRoot(windowId: int64): Rid
        
        /** Sets element accessibility role. */
        static accessibilityUpdateSetRole(id: Rid, role: DisplayServer.AccessibilityRole): void
        
        /** Sets element accessibility name. */
        static accessibilityUpdateSetName(id: Rid, name: string): void
        
        /** Sets element accessibility extra information added to the element name. */
        static accessibilityUpdateSetExtraInfo(id: Rid, name: string): void
        
        /** Sets element accessibility description. */
        static accessibilityUpdateSetDescription(id: Rid, description: string): void
        
        /** Sets element text value. */
        static accessibilityUpdateSetValue(id: Rid, value: string): void
        
        /** Sets tooltip text. */
        static accessibilityUpdateSetTooltip(id: Rid, tooltip: string): void
        
        /** Sets element bounding box, relative to the node position. */
        static accessibilityUpdateSetBounds(id: Rid, rect: Rect2): void
        
        /** Sets element 2D transform. */
        static accessibilityUpdateSetTransform(id: Rid, transform: Transform2D): void
        
        /** Adds a child accessibility element.  
         *      
         *  **Note:** [Node] children and sub-elements are added to the child list automatically.  
         */
        static accessibilityUpdateAddChild(id: Rid, childId: Rid): void
        
        /** Adds an element that is controlled by this element. */
        static accessibilityUpdateAddRelatedControls(id: Rid, relatedId: Rid): void
        
        /** Adds an element that details this element. */
        static accessibilityUpdateAddRelatedDetails(id: Rid, relatedId: Rid): void
        
        /** Adds an element that describes this element. */
        static accessibilityUpdateAddRelatedDescribedBy(id: Rid, relatedId: Rid): void
        
        /** Adds an element that this element flow into. */
        static accessibilityUpdateAddRelatedFlowTo(id: Rid, relatedId: Rid): void
        
        /** Adds an element that labels this element. */
        static accessibilityUpdateAddRelatedLabeledBy(id: Rid, relatedId: Rid): void
        
        /** Adds an element that is part of the same radio group.  
         *      
         *  **Note:** This method should be called on each element of the group, using all other elements as [param related_id].  
         */
        static accessibilityUpdateAddRelatedRadioGroup(id: Rid, relatedId: Rid): void
        
        /** Adds an element that is an active descendant of this element. */
        static accessibilityUpdateSetActiveDescendant(id: Rid, otherId: Rid): void
        
        /** Sets next element on the line. */
        static accessibilityUpdateSetNextOnLine(id: Rid, otherId: Rid): void
        
        /** Sets previous element on the line. */
        static accessibilityUpdateSetPreviousOnLine(id: Rid, otherId: Rid): void
        
        /** Sets the element to be a member of the group. */
        static accessibilityUpdateSetMemberOf(id: Rid, groupId: Rid): void
        
        /** Sets target element for the link. */
        static accessibilityUpdateSetInPageLinkTarget(id: Rid, otherId: Rid): void
        
        /** Sets an element which contains an error message for this element. */
        static accessibilityUpdateSetErrorMessage(id: Rid, otherId: Rid): void
        
        /** Sets the priority of the live region updates. */
        static accessibilityUpdateSetLive(id: Rid, live: DisplayServer.AccessibilityLiveMode): void
        
        /** Adds a callback for the accessibility action (action which can be performed by using a special screen reader command or buttons on the Braille display), and marks this action as supported. The action callback receives one [Variant] argument, which value depends on action type. */
        static accessibilityUpdateAddAction(id: Rid, action: DisplayServer.AccessibilityAction, callable: Callable): void
        
        /** Adds support for a custom accessibility action. [param action_id] is passed as an argument to the callback of [constant ACTION_CUSTOM] action. */
        static accessibilityUpdateAddCustomAction(id: Rid, actionId: int64, actionDescription: string): void
        
        /** Sets number of rows in the table. */
        static accessibilityUpdateSetTableRowCount(id: Rid, count: int64): void
        
        /** Sets number of columns in the table. */
        static accessibilityUpdateSetTableColumnCount(id: Rid, count: int64): void
        
        /** Sets position of the row in the table. */
        static accessibilityUpdateSetTableRowIndex(id: Rid, index: int64): void
        
        /** Sets position of the column. */
        static accessibilityUpdateSetTableColumnIndex(id: Rid, index: int64): void
        
        /** Sets cell position in the table. */
        static accessibilityUpdateSetTableCellPosition(id: Rid, rowIndex: int64, columnIndex: int64): void
        
        /** Sets cell row/column span. */
        static accessibilityUpdateSetTableCellSpan(id: Rid, rowSpan: int64, columnSpan: int64): void
        
        /** Sets number of items in the list. */
        static accessibilityUpdateSetListItemCount(id: Rid, size: int64): void
        
        /** Sets the position of the element in the list. */
        static accessibilityUpdateSetListItemIndex(id: Rid, index: int64): void
        
        /** Sets the hierarchical level of the element in the list. */
        static accessibilityUpdateSetListItemLevel(id: Rid, level: int64): void
        
        /** Sets list/tree item selected status. */
        static accessibilityUpdateSetListItemSelected(id: Rid, selected: boolean): void
        
        /** Sets list/tree item expanded status. */
        static accessibilityUpdateSetListItemExpanded(id: Rid, expanded: boolean): void
        
        /** Sets popup type for popup buttons. */
        static accessibilityUpdateSetPopupType(id: Rid, popup: DisplayServer.AccessibilityPopupType): void
        
        /** Sets element checked state. */
        static accessibilityUpdateSetChecked(id: Rid, checekd: boolean): void
        
        /** Sets numeric value. */
        static accessibilityUpdateSetNumValue(id: Rid, position: float64): void
        
        /** Sets numeric value range. */
        static accessibilityUpdateSetNumRange(id: Rid, min: float64, max: float64): void
        
        /** Sets numeric value step. */
        static accessibilityUpdateSetNumStep(id: Rid, step: float64): void
        
        /** Sets numeric value jump. */
        static accessibilityUpdateSetNumJump(id: Rid, jump: float64): void
        
        /** Sets scroll bar x position. */
        static accessibilityUpdateSetScrollX(id: Rid, position: float64): void
        
        /** Sets scroll bar x range. */
        static accessibilityUpdateSetScrollXRange(id: Rid, min: float64, max: float64): void
        
        /** Sets scroll bar y position. */
        static accessibilityUpdateSetScrollY(id: Rid, position: float64): void
        
        /** Sets scroll bar y range. */
        static accessibilityUpdateSetScrollYRange(id: Rid, min: float64, max: float64): void
        
        /** Sets text underline/overline/strikethrough. */
        static accessibilityUpdateSetTextDecorations(id: Rid, underline: boolean, strikethrough: boolean, overline: boolean): void
        
        /** Sets element text alignment. */
        static accessibilityUpdateSetTextAlign(id: Rid, align: HorizontalAlignment): void
        
        /** Sets text selection to the text field. [param text_start_id] and [param text_end_id] should be elements created by [method accessibility_create_sub_text_edit_elements]. Character offsets are relative to the corresponding element. */
        static accessibilityUpdateSetTextSelection(id: Rid, textStartId: Rid, startChar: int64, textEndId: Rid, endChar: int64): void
        
        /** Sets element flag. */
        static accessibilityUpdateSetFlag(id: Rid, flag: DisplayServer.AccessibilityFlags, value: boolean): void
        
        /** Sets element class name. */
        static accessibilityUpdateSetClassname(id: Rid, classname: string): void
        
        /** Sets placeholder text. */
        static accessibilityUpdateSetPlaceholder(id: Rid, placeholder: string): void
        
        /** Sets element text language. */
        static accessibilityUpdateSetLanguage(id: Rid, language: string): void
        
        /** Sets text orientation. */
        static accessibilityUpdateSetTextOrientation(id: Rid, vertical: boolean): void
        
        /** Sets the orientation of the list elements. */
        static accessibilityUpdateSetListOrientation(id: Rid, vertical: boolean): void
        
        /** Sets the list of keyboard shortcuts used by element. */
        static accessibilityUpdateSetShortcut(id: Rid, shortcut: string): void
        
        /** Sets link URL. */
        static accessibilityUpdateSetUrl(id: Rid, url: string): void
        
        /** Sets element accessibility role description text. */
        static accessibilityUpdateSetRoleDescription(id: Rid, description: string): void
        
        /** Sets human-readable description of the current checked state. */
        static accessibilityUpdateSetStateDescription(id: Rid, description: string): void
        
        /** Sets element color value. */
        static accessibilityUpdateSetColorValue(id: Rid, color: Color): void
        
        /** Sets element background color. */
        static accessibilityUpdateSetBackgroundColor(id: Rid, color: Color): void
        
        /** Sets element foreground color. */
        static accessibilityUpdateSetForegroundColor(id: Rid, color: Color): void
        
        /** Returns the text selection in the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] composition string, with the [Vector2i]'s `x` component being the caret position and `y` being the length of the selection.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static imeGetSelection(): Vector2I
        
        /** Returns the composition string contained within the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] window.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static imeGetText(): string
        
        /** Shows the virtual keyboard if the platform has one.  
         *  [param existing_text] parameter is useful for implementing your own [LineEdit] or [TextEdit], as it tells the virtual keyboard what text has already been typed (the virtual keyboard uses it for auto-correct and predictions).  
         *  [param position] parameter is the screen space [Rect2] of the edited text.  
         *  [param type] parameter allows configuring which type of virtual keyboard to show.  
         *  [param max_length] limits the number of characters that can be entered if different from `-1`.  
         *  [param cursor_start] can optionally define the current text cursor position if [param cursor_end] is not set.  
         *  [param cursor_start] and [param cursor_end] can optionally define the current text selection.  
         *      
         *  **Note:** This method is implemented on Android, iOS and Web.  
         */
        static virtualKeyboardShow(existingText: string, position?: Rect2 /* = new Rect2(0, 0, 0, 0) */, type?: DisplayServer.VirtualKeyboardType /* = 0 */, maxLength?: int64 /* = -1 */, cursorStart?: int64 /* = -1 */, cursorEnd?: int64 /* = -1 */): void
        
        /** Hides the virtual keyboard if it is shown, does nothing otherwise. */
        static virtualKeyboardHide(): void
        
        /** Returns the on-screen keyboard's height in pixels. Returns `0` if there is no keyboard or if it is currently hidden.  
         *      
         *  **Note:** On Android 7 and 8, the keyboard height may return `0` the first time the keyboard is opened in non-immersive mode. This behavior does not occur in immersive mode.  
         */
        static virtualKeyboardGetHeight(): int64
        
        /** Returns `true` if a hardware keyboard is connected.  
         *      
         *  **Note:** This method is implemented on Android and iOS. On other platforms, this method always returns `true`.  
         */
        static hasHardwareKeyboard(): boolean
        
        /** Sets the callback that should be called when a hardware keyboard is connected or disconnected. [param callable] should accept a single [bool] argument indicating whether the keyboard has been connected (`true`) or disconnected (`false`).  
         *      
         *  **Note:** This method is only implemented on Android.  
         */
        static setHardwareKeyboardConnectionChangeCallback(callable: Callable): void
        
        /** Sets the default mouse cursor shape. The cursor's appearance will vary depending on the user's operating system and mouse cursor theme. See also [method cursor_get_shape] and [method cursor_set_custom_image]. */
        static cursorSetShape(shape: DisplayServer.CursorShape): void
        
        /** Returns the default mouse cursor shape set by [method cursor_set_shape]. */
        static cursorGetShape(): DisplayServer.CursorShape
        
        /** Sets a custom mouse cursor image for the given [param shape]. This means the user's operating system and mouse cursor theme will no longer influence the mouse cursor's appearance.  
         *  [param cursor] can be either a [Texture2D] or an [Image], and it should not be larger than 256×256 to display correctly. Optionally, [param hotspot] can be set to offset the image's position relative to the click point. By default, [param hotspot] is set to the top-left corner of the image. See also [method cursor_set_shape].  
         *      
         *  **Note:** On Web, calling this method every frame can cause the cursor to flicker.  
         */
        static cursorSetCustomImage(cursor: Resource, shape?: DisplayServer.CursorShape /* = 0 */, hotspot?: Vector2 /* = Vector2.ZERO */): void
        
        /** Displays a toast notification with [param title], [param text], and optionally [param image]. [param image] should be square, have a maximum edge length of 512 pixels, and should not exceed 4 MB when encoded as PNG. [param callback] should accept two arguments: [int] (notification ID) and [enum NotificationStatus]. Returns the notification ID or [constant INVALID_NOTIFICATION_ID] if it failed.  
         *      
         *  **Note:** This method is only implemented on Windows.  
         */
        static sendToastNotification(title: string, text: string, image: Texture2D, callback: Callable): int64
        
        /** Hides the toast notification with [param id] returned by [method send_toast_notification].  
         *      
         *  **Note:** This method is only implemented on Windows.  
         */
        static hideToastNotification(id: int64): void
        
        /** Returns `true` if positions of **OK** and **Cancel** buttons are swapped in dialogs. This is enabled by default on Windows to follow interface conventions, and be toggled by changing [member ProjectSettings.gui/common/swap_cancel_ok].  
         *      
         *  **Note:** This doesn't affect native dialogs such as the ones spawned by [method DisplayServer.dialog_show].  
         */
        static getSwapCancelOk(): boolean
        
        /** Allows the [param process_id] PID to steal focus from this window. In other words, this disables the operating system's focus stealing protection for the specified PID.  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static enableForStealingFocus(processId: int64): void
        
        /** Shows a text dialog which uses the operating system's native look-and-feel. [param callback] should accept a single [int] parameter which corresponds to the index of the pressed button.  
         *      
         *  **Note:** This method is implemented if the display server has the [constant FEATURE_NATIVE_DIALOG] feature. Supported platforms include macOS, Windows, and Android.  
         */
        static dialogShow(title: string, description: string, buttons: PackedStringArray | string[], callback: Callable): GError
        
        /** Shows a text input dialog which uses the operating system's native look-and-feel. [param callback] should accept a single [String] parameter which contains the text field's contents.  
         *      
         *  **Note:** This method is implemented if the display server has the [constant FEATURE_NATIVE_DIALOG_INPUT] feature. Supported platforms include macOS, Windows, and Android.  
         */
        static dialogInputText(title: string, description: string, existingText: string, callback: Callable): GError
        
        /** Displays OS native dialog for selecting files or directories in the file system.  
         *  Each filter string in the [param filters] array should be formatted like this: `*.png,*.jpg,*.jpeg;Image Files;image/png,image/jpeg`. The description text of the filter is optional and can be omitted. It is recommended to set both file extension and MIME type. See also [member FileDialog.filters].  
         *  Callbacks have the following arguments: `status: bool, selected_paths: PackedStringArray, selected_filter_index: int`. **On Android,** the third callback argument (`selected_filter_index`) is always `0`.  
         *      
         *  **Note:** This method is implemented if the display server has the [constant FEATURE_NATIVE_DIALOG_FILE] feature. Supported platforms include Linux (X11/Wayland), Windows, macOS, and Android.  
         *      
         *  **Note:** [param current_directory] might be ignored.  
         *      
         *  **Note:** Embedded file dialogs and Windows file dialogs support only file extensions, while Android, Linux, and macOS file dialogs also support MIME types.  
         *      
         *  **Note:** On Android and Linux, [param show_hidden] is ignored.  
         *      
         *  **Note:** On Android and macOS, native file dialogs have no title.  
         *      
         *  **Note:** On macOS, sandboxed apps will save security-scoped bookmarks to retain access to the opened folders across multiple sessions. Use [method OS.get_granted_permissions] to get a list of saved bookmarks.  
         *      
         *  **Note:** On Android, this method uses the Android Storage Access Framework (SAF).  
         *  The file picker returns a URI instead of a filesystem path. This URI can be passed directly to [FileAccess] to perform read/write operations.  
         *  When using [constant FILE_DIALOG_MODE_OPEN_DIR], it returns a tree URI that grants full access to the selected directory. File operations inside this directory can be performed by passing a path on the form `treeUri#relative/path/to/file` to [FileAccess].  
         *  To avoid opening the file picker again after each app restart, you can take persistable URI permission as follows:  
         *    
         *  The persistable URI permission remains valid across app restarts as long as the directory is not moved, renamed, or deleted.  
         */
        static fileDialogShow(title: string, currentDirectory: string, filename: string, showHidden: boolean, mode: DisplayServer.FileDialogMode, filters: PackedStringArray | string[], callback: Callable, parentWindowId?: int64 /* = 0 */): GError
        
        /** Displays OS native dialog for selecting files or directories in the file system with additional user selectable options.  
         *  Each filter string in the [param filters] array should be formatted like this: `*.png,*.jpg,*.jpeg;Image Files;image/png,image/jpeg`. The description text of the filter is optional and can be omitted. It is recommended to set both file extension and MIME type. See also [member FileDialog.filters].  
         *  [param options] is array of [Dictionary]s with the following keys:  
         *  - `"name"` - option's name [String].  
         *  - `"values"` - [PackedStringArray] of values. If empty, boolean option (check box) is used.  
         *  - `"default"` - default selected option index ([int]) or default boolean value ([bool]).  
         *  Callbacks have the following arguments: `status: bool, selected_paths: PackedStringArray, selected_filter_index: int, selected_option: Dictionary`.  
         *      
         *  **Note:** This method is implemented if the display server has the [constant FEATURE_NATIVE_DIALOG_FILE_EXTRA] feature. Supported platforms include Linux (X11/Wayland), Windows, and macOS.  
         *      
         *  **Note:** [param current_directory] might be ignored.  
         *      
         *  **Note:** Embedded file dialogs and Windows file dialogs support only file extensions, while Android, Linux, and macOS file dialogs also support MIME types.  
         *      
         *  **Note:** On Linux (X11), [param show_hidden] is ignored.  
         *      
         *  **Note:** On macOS, native file dialogs have no title.  
         *      
         *  **Note:** On macOS, sandboxed apps will save security-scoped bookmarks to retain access to the opened folders across multiple sessions. Use [method OS.get_granted_permissions] to get a list of saved bookmarks.  
         */
        static fileDialogWithOptionsShow(title: string, currentDirectory: string, root: string, filename: string, showHidden: boolean, mode: DisplayServer.FileDialogMode, filters: PackedStringArray | string[], options: GArray<GDictionary>, callback: Callable, parentWindowId?: int64 /* = 0 */): GError
        
        /** Plays the beep sound from the operative system, if possible. Because it comes from the OS, the beep sound will be audible even if the application is muted. It may also be disabled for the entire OS by the user.  
         *      
         *  **Note:** This method is implemented on macOS, Linux (X11/Wayland), and Windows.  
         */
        static beep(): void
        
        /** Returns the number of keyboard layouts.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetLayoutCount(): int64
        
        /** Returns active keyboard layout index.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetCurrentLayout(): int64
        
        /** Sets the active keyboard layout.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardSetCurrentLayout(index: int64): void
        
        /** Returns the ISO-639/BCP-47 language code of the keyboard layout at position [param index].  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetLayoutLanguage(index: int64): string
        
        /** Returns the localized name of the keyboard layout at position [param index].  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetLayoutName(index: int64): string
        
        /** Converts a physical (US QWERTY) [param keycode] to one in the active keyboard layout.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetKeycodeFromPhysical(keycode: Key): Key
        
        /** Converts a physical (US QWERTY) [param keycode] to localized label printed on the key in the active keyboard layout.  
         *      
         *  **Note:** This method is implemented on Linux (X11/Wayland), macOS, and Windows.  
         */
        static keyboardGetLabelFromPhysical(keycode: Key): Key
        
        /** Opens system emoji and symbol picker.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static showEmojiAndSymbolPicker(): void
        
        /** Displays OS native color picker.  
         *  Callbacks have the following arguments: `status: bool, color: Color`.  
         *      
         *  **Note:** This method is implemented if the display server has the [constant FEATURE_NATIVE_COLOR_PICKER] feature.  
         *      
         *  **Note:** This method is only implemented on Linux (X11/Wayland).  
         */
        static colorPicker(callback: Callable): boolean
        
        /** Perform window manager processing, including input flushing. See also [method force_process_and_drop_events], [method Input.flush_buffered_events] and [member Input.use_accumulated_input]. */
        static processEvents(): void
        
        /** Forces window manager processing while ignoring all [InputEvent]s. See also [method process_events].  
         *      
         *  **Note:** This method is implemented on Windows and macOS.  
         */
        static forceProcessAndDropEvents(): void
        
        /** Sets the window icon (usually displayed in the top-left corner) in the operating system's  *native*  format. The file at [param filename] must be in `.ico` format on Windows or `.icns` on macOS. By using specially crafted `.ico` or `.icns` icons, [method set_native_icon] allows specifying different icons depending on the size the icon is displayed at. This size is determined by the operating system and user preferences (including the display scale factor). To use icons in other formats, use [method set_icon] instead.  
         *      
         *  **Note:** Requires support for [constant FEATURE_NATIVE_ICON].  
         */
        static setNativeIcon(filename: string): void
        
        /** Sets the application icon and icons of all windows with an [Image]. To use icons in the operating system's native format, use [method set_native_icon] instead.  
         *      
         *  **Note:** Requires support for [constant FEATURE_ICON].  
         */
        static setIcon(image: Image): void
        
        /** Creates a new application status indicator with the specified icon, tooltip, and activation callback.  
         *  [param callback] should take two arguments: the pressed mouse button (one of the [enum MouseButton] constants) and the click position in screen coordinates (a [Vector2i]).  
         */
        static createStatusIndicator(icon: Texture2D, tooltip: string, callback: Callable): int64
        
        /** Sets the application status indicator icon.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static statusIndicatorSetIcon(id: int64, icon: Texture2D): void
        
        /** Sets the application status indicator tooltip.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static statusIndicatorSetTooltip(id: int64, tooltip: string): void
        
        /** Sets the application status indicator native popup menu.  
         *      
         *  **Note:** On macOS, the menu is activated by any mouse button. Its activation callback is  *not*  triggered.  
         *      
         *  **Note:** On Windows, the menu is activated by the right mouse button, selecting the status icon and pressing [kbd]Shift + F10[/kbd], or the applications key. The menu's activation callback for the other mouse buttons is still triggered.  
         *      
         *  **Note:** Native popup is only supported if [NativeMenu] supports the [constant NativeMenu.FEATURE_POPUP_MENU] feature.  
         */
        static statusIndicatorSetMenu(id: int64, menuRid: Rid): void
        
        /** Sets the application status indicator activation callback. [param callback] should take two arguments: [int] mouse button index (one of [enum MouseButton] values) and [Vector2i] click position in screen coordinates.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static statusIndicatorSetCallback(id: int64, callback: Callable): void
        
        /** Returns the rectangle for the given status indicator [param id] in screen coordinates. If the status indicator is not visible, returns an empty [Rect2].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static statusIndicatorGetRect(id: int64): Rect2
        
        /** Removes the application status indicator. */
        static deleteStatusIndicator(id: int64): void
        
        /** Returns the total number of available tablet drivers.  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static tabletGetDriverCount(): int64
        
        /** Returns the tablet driver name for the given index.  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static tabletGetDriverName(idx: int64): string
        
        /** Returns current active tablet driver name.  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static tabletGetCurrentDriver(): string
        
        /** Set active tablet driver name.  
         *  Supported drivers:  
         *  - `winink`: Windows Ink API, default.  
         *  - `wintab`: Wacom Wintab API (compatible device driver required).  
         *  - `dummy`: Dummy driver, tablet input is disabled.  
         *      
         *  **Note:** This method is implemented only on Windows.  
         */
        static tabletSetCurrentDriver(name: string): void
        
        /** Returns `true` if the window background can be made transparent. This method returns `false` if [member ProjectSettings.display/window/per_pixel_transparency/allowed] is set to `false`, or if transparency is not supported by the renderer or OS compositor. */
        static isWindowTransparencyAvailable(): boolean
        
        /** Registers an [Object] which represents an additional output that will be rendered too, beyond normal windows. The [Object] is only used as an identifier, which can be later passed to [method unregister_additional_output].  
         *  This can be used to prevent Godot from skipping rendering when no normal windows are visible.  
         */
        static registerAdditionalOutput(object: GObject): void
        
        /** Unregisters an [Object] representing an additional output, that was registered via [method register_additional_output]. */
        static unregisterAdditionalOutput(object: GObject): void
        
        /** Returns `true` if any additional outputs have been registered via [method register_additional_output]. */
        static hasAdditionalOutputs(): boolean
        
        /** Returns `true` if the application is in picture-in-picture mode.  
         *      
         *  **Note:** This method is implemented on Android.  
         */
        static isInPipMode(windowId?: int64 /* = 0 */): boolean
        
        /** Enters picture-in-picture mode.  
         *      
         *  **Note:** This method is implemented on Android.  
         */
        static pipModeEnter(windowId?: int64 /* = 0 */): void
        
        /** Specifies the aspect ratio for picture-in-picture mode.  
         *      
         *  **Note:** This method is implemented on Android.  
         */
        static pipModeSetAspectRatio(numerator: int64, denominator: int64, windowId?: int64 /* = 0 */): void
        
        /** Specifies whether picture-in-picture mode should be entered automatically when the application goes in the background.  
         *      
         *  **Note:** This method is implemented on Android.  
         */
        static pipModeSetAutoEnterOnBackground(autoEnterOnBackground: boolean, windowId?: int64 /* = 0 */): void
        
        /** Emitted when the screen orientation changes. [param orientation] is the new orientation.  
         *      
         *  **Note:** This method is implemented on Android and iOS.  
         */
        static readonly orientationChanged: Signal<(orientation: DisplayServer.SensorOrientation) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDisplayServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDisplayServer;
    }
    // _singleton_class_: NativeMenu
    namespace NativeMenu {
        enum Feature {
            FeatureGlobalMenu = 0,
            FeaturePopupMenu = 1,
            FeatureOpenCloseCallback = 2,
            FeatureHoverCallback = 3,
            FeatureKeyCallback = 4,
        }
        enum SystemMenus {
            InvalidMenuId = 0,
            MainMenuId = 1,
            ApplicationMenuId = 2,
            WindowMenuId = 3,
            HelpMenuId = 4,
            DockMenuId = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNativeMenu extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNativeMenu extends __NameMapGObject {
        has_feature: "hasFeature";
        has_system_menu: "hasSystemMenu";
        get_system_menu: "getSystemMenu";
        get_system_menu_name: "getSystemMenuName";
        get_system_menu_text: "getSystemMenuText";
        set_system_menu_text: "setSystemMenuText";
        create_menu: "createMenu";
        has_menu: "hasMenu";
        free_menu: "freeMenu";
        get_size: "getSize";
        set_interface_direction: "setInterfaceDirection";
        set_popup_open_callback: "setPopupOpenCallback";
        get_popup_open_callback: "getPopupOpenCallback";
        set_popup_close_callback: "setPopupCloseCallback";
        get_popup_close_callback: "getPopupCloseCallback";
        set_minimum_width: "setMinimumWidth";
        get_minimum_width: "getMinimumWidth";
        is_opened: "isOpened";
        add_submenu_item: "addSubmenuItem";
        add_item: "addItem";
        add_check_item: "addCheckItem";
        add_icon_item: "addIconItem";
        add_icon_check_item: "addIconCheckItem";
        add_radio_check_item: "addRadioCheckItem";
        add_icon_radio_check_item: "addIconRadioCheckItem";
        add_multistate_item: "addMultistateItem";
        add_separator: "addSeparator";
        find_item_index_with_text: "findItemIndexWithText";
        find_item_index_with_tag: "findItemIndexWithTag";
        find_item_index_with_submenu: "findItemIndexWithSubmenu";
        is_item_checked: "isItemChecked";
        is_item_indeterminate: "isItemIndeterminate";
        is_item_checkable: "isItemCheckable";
        is_item_radio_checkable: "isItemRadioCheckable";
        get_item_callback: "getItemCallback";
        get_item_key_callback: "getItemKeyCallback";
        get_item_tag: "getItemTag";
        get_item_text: "getItemText";
        get_item_submenu: "getItemSubmenu";
        get_item_accelerator: "getItemAccelerator";
        is_item_disabled: "isItemDisabled";
        is_item_hidden: "isItemHidden";
        get_item_tooltip: "getItemTooltip";
        get_item_state: "getItemState";
        get_item_max_states: "getItemMaxStates";
        get_item_icon: "getItemIcon";
        get_item_indentation_level: "getItemIndentationLevel";
        set_item_checked: "setItemChecked";
        set_item_indeterminate: "setItemIndeterminate";
        set_item_checkable: "setItemCheckable";
        set_item_radio_checkable: "setItemRadioCheckable";
        set_item_callback: "setItemCallback";
        set_item_hover_callbacks: "setItemHoverCallbacks";
        set_item_key_callback: "setItemKeyCallback";
        set_item_tag: "setItemTag";
        set_item_text: "setItemText";
        set_item_submenu: "setItemSubmenu";
        set_item_accelerator: "setItemAccelerator";
        set_item_disabled: "setItemDisabled";
        set_item_hidden: "setItemHidden";
        set_item_tooltip: "setItemTooltip";
        set_item_state: "setItemState";
        set_item_max_states: "setItemMaxStates";
        set_item_icon: "setItemIcon";
        set_item_indentation_level: "setItemIndentationLevel";
        set_item_index: "setItemIndex";
        get_item_count: "getItemCount";
        is_system_menu: "isSystemMenu";
        remove_item: "removeItem";
    }
    /** A server interface for OS native menus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_nativemenu.html  
     */
    class NativeMenu extends GObject {
        /** Returns `true` if the specified [param feature] is supported by the current [NativeMenu], `false` otherwise.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static hasFeature(feature: NativeMenu.Feature): boolean
        
        /** Returns `true` if a special system menu is supported.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static hasSystemMenu(menuId: NativeMenu.SystemMenus): boolean
        
        /** Returns RID of a special system menu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getSystemMenu(menuId: NativeMenu.SystemMenus): Rid
        
        /** Returns readable name of a special system menu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getSystemMenuName(menuId: NativeMenu.SystemMenus): string
        
        /** Returns the text of the system menu item.  
         *      
         *  **Note:** This method is implemented on macOS.  
         */
        static getSystemMenuText(menuId: NativeMenu.SystemMenus): string
        
        /** Sets the text of the system menu item.  
         *      
         *  **Note:** This method is implemented on macOS.  
         */
        static setSystemMenuText(menuId: NativeMenu.SystemMenus, name: string): void
        
        /** Creates a new global menu object.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static createMenu(): Rid
        
        /** Returns `true` if [param rid] is valid global menu.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static hasMenu(rid: Rid): boolean
        
        /** Frees a global menu object created by this [NativeMenu].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static freeMenu(rid: Rid): void
        
        /** Returns global menu size.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getSize(rid: Rid): Vector2
        
        /** Shows the global menu at [param position] in the screen coordinates.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static popup(rid: Rid, position: Vector2I): void
        
        /** Sets the menu text layout direction from right-to-left if [param is_rtl] is `true`.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setInterfaceDirection(rid: Rid, isRtl: boolean): void
        
        /** Registers callable to emit after the menu is closed.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setPopupOpenCallback(rid: Rid, callback: Callable): void
        
        /** Returns global menu open callback.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getPopupOpenCallback(rid: Rid): Callable
        
        /** Registers callable to emit when the menu is about to show.  
         *      
         *  **Note:** The OS can simulate menu opening to track menu item changes and global shortcuts, in which case the corresponding close callback is not triggered. Use [method is_opened] to check if the menu is currently opened.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setPopupCloseCallback(rid: Rid, callback: Callable): void
        
        /** Returns global menu close callback.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getPopupCloseCallback(rid: Rid): Callable
        
        /** Sets the minimum width of the global menu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setMinimumWidth(rid: Rid, width: float64): void
        
        /** Returns global menu minimum width.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getMinimumWidth(rid: Rid): float64
        
        /** Returns `true` if the menu is currently opened.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static isOpened(rid: Rid): boolean
        
        /** Adds an item that will act as a submenu of the global menu [param rid]. The [param submenu_rid] argument is the RID of the global menu that will be shown when the item is clicked.  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static addSubmenuItem(rid: Rid, label: string, submenuRid: Rid, tag?: any /* = {} */, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addItem(rid: Rid, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new checkable item with text [param label] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addCheckItem(rid: Rid, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] and icon [param icon] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addIconItem(rid: Rid, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new checkable item with text [param label] and icon [param icon] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addIconCheckItem(rid: Rid, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new radio-checkable item with text [param label] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** Radio-checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addRadioCheckItem(rid: Rid, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new radio-checkable item with text [param label] and icon [param icon] to the global menu [param rid].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** Radio-checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addIconRadioCheckItem(rid: Rid, icon: Texture2D, label: string, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a new item with text [param label] to the global menu [param rid].  
         *  Contrarily to normal binary items, multistate items can have more than two states, as defined by [param max_states]. Each press or activate of the item will increase the state by one. The default value is defined by [param default_state].  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *  An [param accelerator] can optionally be defined, which is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The [param accelerator] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** By default, there's no indication of the current item state, it should be changed manually.  
         *      
         *  **Note:** The [param callback] and [param key_callback] Callables need to accept exactly one Variant parameter, the parameter passed to the Callables will be the value passed to [param tag].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** On Windows, [param accelerator] and [param key_callback] are ignored.  
         */
        static addMultistateItem(rid: Rid, label: string, maxStates: int64, defaultState: int64, callback?: Callable /* = new Callable() */, keyCallback?: Callable /* = new Callable() */, tag?: any /* = {} */, accelerator?: Key /* = 0 */, index?: int64 /* = -1 */): int64
        
        /** Adds a separator between items to the global menu [param rid]. Separators also occupy an index.  
         *  Returns index of the inserted item, it's not guaranteed to be the same as [param index] value.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static addSeparator(rid: Rid, index?: int64 /* = -1 */): int64
        
        /** Returns the index of the item with the specified [param text]. Indices are automatically assigned to each item by the engine.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static findItemIndexWithText(rid: Rid, text: string): int64
        
        /** Returns the index of the item with the specified [param tag]. Indices are automatically assigned to each item by the engine.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static findItemIndexWithTag(rid: Rid, tag: any): int64
        
        /** Returns the index of the item with the submenu specified by [param submenu_rid]. Indices are automatically assigned to each item by the engine.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static findItemIndexWithSubmenu(rid: Rid, submenuRid: Rid): int64
        
        /** Returns `true` if the item at index [param idx] is checked.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static isItemChecked(rid: Rid, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is indeterminate.  
         *  See [method set_item_indeterminate] for more info on how to set an item.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static isItemIndeterminate(rid: Rid, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is checkable in some way, i.e. if it has a checkbox or radio button.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static isItemCheckable(rid: Rid, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] has radio button-style checkability.  
         *      
         *  **Note:** This is purely cosmetic; you must add the logic for checking/unchecking items in radio groups.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static isItemRadioCheckable(rid: Rid, idx: int64): boolean
        
        /** Returns the callback of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemCallback(rid: Rid, idx: int64): Callable
        
        /** Returns the callback of the item accelerator at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getItemKeyCallback(rid: Rid, idx: int64): Callable
        
        /** Returns the metadata of the specified item, which might be of any type. You can set it with [method set_item_tag], which provides a simple way of assigning context data to items.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemTag(rid: Rid, idx: int64): any
        
        /** Returns the text of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemText(rid: Rid, idx: int64): string
        
        /** Returns the submenu ID of the item at index [param idx]. See [method add_submenu_item] for more info on how to add a submenu.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemSubmenu(rid: Rid, idx: int64): Rid
        
        /** Returns the accelerator of the item at index [param idx]. Accelerators are special combinations of keys that activate the item, no matter which control is focused.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getItemAccelerator(rid: Rid, idx: int64): Key
        
        /** Returns `true` if the item at index [param idx] is disabled. When it is disabled it can't be selected, or its action invoked.  
         *  See [method set_item_disabled] for more info on how to disable an item.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static isItemDisabled(rid: Rid, idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is hidden.  
         *  See [method set_item_hidden] for more info on how to hide an item.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static isItemHidden(rid: Rid, idx: int64): boolean
        
        /** Returns the tooltip associated with the specified index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getItemTooltip(rid: Rid, idx: int64): string
        
        /** Returns the state of a multistate item. See [method add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemState(rid: Rid, idx: int64): int64
        
        /** Returns number of states of a multistate item. See [method add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemMaxStates(rid: Rid, idx: int64): int64
        
        /** Returns the icon of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemIcon(rid: Rid, idx: int64): null | Texture2D
        
        /** Returns the horizontal offset of the item at the given [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static getItemIndentationLevel(rid: Rid, idx: int64): int64
        
        /** Sets the checkstate status of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemChecked(rid: Rid, idx: int64, checked: boolean): void
        
        /** Sets the indeterminate status of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemIndeterminate(rid: Rid, idx: int64, indeterminate: boolean): void
        
        /** Sets whether the item at index [param idx] has a checkbox. If `false`, sets the type of the item to plain text.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemCheckable(rid: Rid, idx: int64, checkable: boolean): void
        
        /** Sets the type of the item at the specified index [param idx] to radio button. If `false`, sets the type of the item to plain text.  
         *      
         *  **Note:** This is purely cosmetic; you must add the logic for checking/unchecking items in radio groups.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemRadioCheckable(rid: Rid, idx: int64, checkable: boolean): void
        
        /** Sets the callback of the item at index [param idx]. Callback is emitted when an item is pressed.  
         *      
         *  **Note:** The [param callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemCallback(rid: Rid, idx: int64, callback: Callable): void
        
        /** Sets the callback of the item at index [param idx]. The callback is emitted when an item is hovered.  
         *      
         *  **Note:** The [param callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemHoverCallbacks(rid: Rid, idx: int64, callback: Callable): void
        
        /** Sets the callback of the item at index [param idx]. Callback is emitted when its accelerator is activated.  
         *      
         *  **Note:** The [param key_callback] Callable needs to accept exactly one Variant parameter, the parameter passed to the Callable will be the value passed to the `tag` parameter when the menu item was created.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemKeyCallback(rid: Rid, idx: int64, keyCallback: Callable): void
        
        /** Sets the metadata of an item, which may be of any type. You can later get it with [method get_item_tag], which provides a simple way of assigning context data to items.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemTag(rid: Rid, idx: int64, tag: any): void
        
        /** Sets the text of the item at index [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemText(rid: Rid, idx: int64, text: string): void
        
        /** Sets the submenu RID of the item at index [param idx]. The submenu is a global menu that would be shown when the item is clicked.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemSubmenu(rid: Rid, idx: int64, submenuRid: Rid): void
        
        /** Sets the accelerator of the item at index [param idx]. [param keycode] can be a single [enum Key], or a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]).  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemAccelerator(rid: Rid, idx: int64, keycode: Key): void
        
        /** Enables/disables the item at index [param idx]. When it is disabled, it can't be selected and its action can't be invoked.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemDisabled(rid: Rid, idx: int64, disabled: boolean): void
        
        /** Hides/shows the item at index [param idx]. When it is hidden, an item does not appear in a menu and its action cannot be invoked.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemHidden(rid: Rid, idx: int64, hidden: boolean): void
        
        /** Sets the [String] tooltip of the item at the specified index [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemTooltip(rid: Rid, idx: int64, tooltip: string): void
        
        /** Sets the state of a multistate item. See [method add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemState(rid: Rid, idx: int64, state: int64): void
        
        /** Sets number of state of a multistate item. See [method add_multistate_item] for details.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemMaxStates(rid: Rid, idx: int64, maxStates: int64): void
        
        /** Replaces the [Texture2D] icon of the specified [param idx].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         *      
         *  **Note:** This method is not supported by macOS Dock menu items.  
         */
        static setItemIcon(rid: Rid, idx: int64, icon: Texture2D): void
        
        /** Sets the horizontal offset of the item at the given [param idx].  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static setItemIndentationLevel(rid: Rid, idx: int64, level: int64): void
        
        /** Changes the index of the item at index [param idx] to be at index [param target_idx]. This can be used to move an item above other items.  
         *  Returns the new index of the moved item, it's not guaranteed to be the same as [param target_idx].  
         *      
         *  **Note:** The indices of any items between index [param idx] and index [param target_idx] will be shifted by one.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static setItemIndex(rid: Rid, idx: int64, targetIdx: int64): int64
        
        /** Returns number of items in the global menu [param rid].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static getItemCount(rid: Rid): int64
        
        /** Return `true` is global menu is a special system menu.  
         *      
         *  **Note:** This method is implemented only on macOS.  
         */
        static isSystemMenu(rid: Rid): boolean
        
        /** Removes the item at index [param idx] from the global menu [param rid].  
         *      
         *  **Note:** The indices of items after the removed item will be shifted by one.  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static removeItem(rid: Rid, idx: int64): void
        
        /** Removes all items from the global menu [param rid].  
         *      
         *  **Note:** This method is implemented on macOS and Windows.  
         */
        static clear(rid: Rid): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNativeMenu;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNativeMenu;
    }
    // _singleton_class_: RenderingServer
    namespace RenderingServer {
        enum TextureType {
            TextureType2D = 0,
            TextureTypeLayered = 1,
            TextureType3D = 2,
        }
        enum TextureLayeredType {
            TextureLayered2DArray = 0,
            TextureLayeredCubemap = 1,
            TextureLayeredCubemapArray = 2,
        }
        enum CubeMapLayer {
            CubemapLayerLeft = 0,
            CubemapLayerRight = 1,
            CubemapLayerBottom = 2,
            CubemapLayerTop = 3,
            CubemapLayerFront = 4,
            CubemapLayerBack = 5,
        }
        enum TextureDrawableFormat {
            TextureDrawableFormatRgba8 = 0,
            TextureDrawableFormatRgba8Srgb = 1,
            TextureDrawableFormatRgbah = 2,
            TextureDrawableFormatRgbaf = 3,
        }
        enum ShaderMode {
            ShaderSpatial = 0,
            ShaderCanvasItem = 1,
            ShaderParticles = 2,
            ShaderSky = 3,
            ShaderFog = 4,
            ShaderTextureBlit = 5,
            ShaderMax = 6,
        }
        enum ArrayType {
            ArrayVertex = 0,
            ArrayNormal = 1,
            ArrayTangent = 2,
            ArrayColor = 3,
            ArrayTexUV = 4,
            ArrayTexUV2 = 5,
            ArrayCustom0 = 6,
            ArrayCustom1 = 7,
            ArrayCustom2 = 8,
            ArrayCustom3 = 9,
            ArrayBones = 10,
            ArrayWeights = 11,
            ArrayIndex = 12,
            ArrayMax = 13,
        }
        enum ArrayCustomFormat {
            ArrayCustomRgba8Unorm = 0,
            ArrayCustomRgba8Snorm = 1,
            ArrayCustomRgHalf = 2,
            ArrayCustomRgbaHalf = 3,
            ArrayCustomRFloat = 4,
            ArrayCustomRgFloat = 5,
            ArrayCustomRgbFloat = 6,
            ArrayCustomRgbaFloat = 7,
            ArrayCustomMax = 8,
        }
        enum ArrayFormat {
            ArrayFormatVertex = 1,
            ArrayFormatNormal = 2,
            ArrayFormatTangent = 4,
            ArrayFormatColor = 8,
            ArrayFormatTexUV = 16,
            ArrayFormatTexUV2 = 32,
            ArrayFormatCustom0 = 64,
            ArrayFormatCustom1 = 128,
            ArrayFormatCustom2 = 256,
            ArrayFormatCustom3 = 512,
            ArrayFormatBones = 1024,
            ArrayFormatWeights = 2048,
            ArrayFormatIndex = 4096,
            ArrayFormatBlendShapeMask = 7,
            ArrayFormatCustomBase = 13,
            ArrayFormatCustomBits = 3,
            ArrayFormatCustom0Shift = 13,
            ArrayFormatCustom1Shift = 16,
            ArrayFormatCustom2Shift = 19,
            ArrayFormatCustom3Shift = 22,
            ArrayFormatCustomMask = 7,
            ArrayCompressFlagsBase = 25,
            ArrayFlagUse2DVertices = 33554432,
            ArrayFlagUseDynamicUpdate = 67108864,
            ArrayFlagUse8BoneWeights = 134217728,
            ArrayFlagUsesEmptyVertexArray = 268435456,
            ArrayFlagCompressAttributes = 536870912,
            ArrayFlagUseStorageBuffer = 1073741824,
            ArrayFlagFormatVersionBase = 35,
            ArrayFlagFormatVersionShift = 35,
            ArrayFlagFormatVersion1 = 0,
            ArrayFlagFormatVersion2 = 34359738368,
            ArrayFlagFormatCurrentVersion = 34359738368,
            ArrayFlagFormatVersionMask = 255,
        }
        enum PrimitiveType {
            PrimitivePoints = 0,
            PrimitiveLines = 1,
            PrimitiveLineStrip = 2,
            PrimitiveTriangles = 3,
            PrimitiveTriangleStrip = 4,
            PrimitiveMax = 5,
        }
        enum BlendShapeMode {
            BlendShapeModeNormalized = 0,
            BlendShapeModeRelative = 1,
        }
        enum MultimeshTransformFormat {
            MultimeshTransform2D = 0,
            MultimeshTransform3D = 1,
        }
        enum MultimeshPhysicsInterpolationQuality {
            MultimeshInterpQualityFast = 0,
            MultimeshInterpQualityHigh = 1,
        }
        enum LightProjectorFilter {
            LightProjectorFilterNearest = 0,
            LightProjectorFilterLinear = 1,
            LightProjectorFilterNearestMipmaps = 2,
            LightProjectorFilterLinearMipmaps = 3,
            LightProjectorFilterNearestMipmapsAnisotropic = 4,
            LightProjectorFilterLinearMipmapsAnisotropic = 5,
        }
        enum LightType {
            LightDirectional = 0,
            LightOmni = 1,
            LightSpot = 2,
            LightArea = 3,
        }
        enum LightParam {
            LightParamEnergy = 0,
            LightParamIndirectEnergy = 1,
            LightParamVolumetricFogEnergy = 2,
            LightParamSpecular = 3,
            LightParamRange = 4,
            LightParamSize = 5,
            LightParamAttenuation = 6,
            LightParamSpotAngle = 7,
            LightParamSpotAttenuation = 8,
            LightParamShadowMaxDistance = 9,
            LightParamShadowSplit1Offset = 10,
            LightParamShadowSplit2Offset = 11,
            LightParamShadowSplit3Offset = 12,
            LightParamShadowFadeStart = 13,
            LightParamShadowNormalBias = 14,
            LightParamShadowBias = 15,
            LightParamShadowPancakeSize = 16,
            LightParamShadowOpacity = 17,
            LightParamShadowBlur = 18,
            LightParamTransmittanceBias = 19,
            LightParamIntensity = 20,
            LightParamContactShadowBlur = 21,
            LightParamMax = 22,
        }
        enum LightBakeMode {
            LightBakeDisabled = 0,
            LightBakeStatic = 1,
            LightBakeDynamic = 2,
        }
        enum LightOmniShadowMode {
            LightOmniShadowDualParaboloid = 0,
            LightOmniShadowCube = 1,
        }
        enum LightDirectionalShadowMode {
            LightDirectionalShadowOrthogonal = 0,
            LightDirectionalShadowParallel2Splits = 1,
            LightDirectionalShadowParallel4Splits = 2,
        }
        enum LightDirectionalSkyMode {
            LightDirectionalSkyModeLightAndSky = 0,
            LightDirectionalSkyModeLightOnly = 1,
            LightDirectionalSkyModeSkyOnly = 2,
        }
        enum ShadowQuality {
            ShadowQualityHard = 0,
            ShadowQualitySoftVeryLow = 1,
            ShadowQualitySoftLow = 2,
            ShadowQualitySoftMedium = 3,
            ShadowQualitySoftHigh = 4,
            ShadowQualitySoftUltra = 5,
            ShadowQualityMax = 6,
        }
        enum ReflectionProbeUpdateMode {
            ReflectionProbeUpdateOnce = 0,
            ReflectionProbeUpdateAlways = 1,
        }
        enum ReflectionProbeAmbientMode {
            ReflectionProbeAmbientDisabled = 0,
            ReflectionProbeAmbientEnvironment = 1,
            ReflectionProbeAmbientColor = 2,
        }
        enum DecalTexture {
            DecalTextureAlbedo = 0,
            DecalTextureNormal = 1,
            DecalTextureOrm = 2,
            DecalTextureEmission = 3,
            DecalTextureMax = 4,
        }
        enum DecalFilter {
            DecalFilterNearest = 0,
            DecalFilterLinear = 1,
            DecalFilterNearestMipmaps = 2,
            DecalFilterLinearMipmaps = 3,
            DecalFilterNearestMipmapsAnisotropic = 4,
            DecalFilterLinearMipmapsAnisotropic = 5,
        }
        enum VoxelGIQuality {
            VoxelGIQualityLow = 0,
            VoxelGIQualityHigh = 1,
        }
        enum ParticlesMode {
            ParticlesMode2D = 0,
            ParticlesMode3D = 1,
        }
        enum ParticlesTransformAlign {
            ParticlesTransformAlignDisabled = 0,
            ParticlesTransformAlignZBillboard = 1,
            ParticlesTransformAlignYToVelocity = 2,
            ParticlesTransformAlignZBillboardYToVelocity = 3,
            ParticlesTransformAlignLocalBillboard = 4,
        }
        enum ParticlesTransformAlignCustomSrc {
            ParticlesAlignChannelFilterDisabled = 0,
            ParticlesAlignChannelFilterX = 1,
            ParticlesAlignChannelFilterY = 2,
            ParticlesAlignChannelFilterZ = 3,
            ParticlesAlignChannelFilterW = 4,
        }
        enum ParticlesTransformAlignAxis {
            ParticlesAlignAxisX = 0,
            ParticlesAlignAxisY = 1,
        }
        enum ParticlesDrawOrder {
            ParticlesDrawOrderIndex = 0,
            ParticlesDrawOrderLifetime = 1,
            ParticlesDrawOrderReverseLifetime = 2,
            ParticlesDrawOrderViewDepth = 3,
        }
        enum ParticlesCollisionType {
            ParticlesCollisionTypeSphereAttract = 0,
            ParticlesCollisionTypeBoxAttract = 1,
            ParticlesCollisionTypeVectorFieldAttract = 2,
            ParticlesCollisionTypeSphereCollide = 3,
            ParticlesCollisionTypeBoxCollide = 4,
            ParticlesCollisionTypeSdfCollide = 5,
            ParticlesCollisionTypeHeightfieldCollide = 6,
        }
        enum ParticlesCollisionHeightfieldResolution {
            ParticlesCollisionHeightfieldResolution256 = 0,
            ParticlesCollisionHeightfieldResolution512 = 1,
            ParticlesCollisionHeightfieldResolution1024 = 2,
            ParticlesCollisionHeightfieldResolution2048 = 3,
            ParticlesCollisionHeightfieldResolution4096 = 4,
            ParticlesCollisionHeightfieldResolution8192 = 5,
            ParticlesCollisionHeightfieldResolutionMax = 6,
        }
        enum FogVolumeShape {
            FogVolumeShapeEllipsoid = 0,
            FogVolumeShapeCone = 1,
            FogVolumeShapeCylinder = 2,
            FogVolumeShapeBox = 3,
            FogVolumeShapeWorld = 4,
            FogVolumeShapeMax = 5,
        }
        enum ViewportScaling3DMode {
            ViewportScaling3DModeBilinear = 0,
            ViewportScaling3DModeFsr = 1,
            ViewportScaling3DModeFsr2 = 2,
            ViewportScaling3DModeMetalfxSpatial = 3,
            ViewportScaling3DModeMetalfxTemporal = 4,
            ViewportScaling3DModeNearest = 5,
            ViewportScaling3DModeMax = 6,
        }
        enum ViewportUpdateMode {
            ViewportUpdateDisabled = 0,
            ViewportUpdateOnce = 1,
            ViewportUpdateWhenVisible = 2,
            ViewportUpdateWhenParentVisible = 3,
            ViewportUpdateAlways = 4,
        }
        enum ViewportClearMode {
            ViewportClearAlways = 0,
            ViewportClearNever = 1,
            ViewportClearOnlyNextFrame = 2,
        }
        enum ViewportEnvironmentMode {
            ViewportEnvironmentDisabled = 0,
            ViewportEnvironmentEnabled = 1,
            ViewportEnvironmentInherit = 2,
            ViewportEnvironmentMax = 3,
        }
        enum ViewportSdfOversize {
            ViewportSdfOversize100Percent = 0,
            ViewportSdfOversize120Percent = 1,
            ViewportSdfOversize150Percent = 2,
            ViewportSdfOversize200Percent = 3,
            ViewportSdfOversizeMax = 4,
        }
        enum ViewportSdfScale {
            ViewportSdfScale100Percent = 0,
            ViewportSdfScale50Percent = 1,
            ViewportSdfScale25Percent = 2,
            ViewportSdfScaleMax = 3,
        }
        enum ViewportMsaa {
            ViewportMsaaDisabled = 0,
            ViewportMsaa2X = 1,
            ViewportMsaa4X = 2,
            ViewportMsaa8X = 3,
            ViewportMsaaMax = 4,
        }
        enum ViewportAnisotropicFiltering {
            ViewportAnisotropyDisabled = 0,
            ViewportAnisotropy2X = 1,
            ViewportAnisotropy4X = 2,
            ViewportAnisotropy8X = 3,
            ViewportAnisotropy16X = 4,
            ViewportAnisotropyMax = 5,
        }
        enum ViewportScreenSpaceAA {
            ViewportScreenSpaceAADisabled = 0,
            ViewportScreenSpaceAAFxaa = 1,
            ViewportScreenSpaceAASmaa = 2,
            ViewportScreenSpaceAAMax = 3,
        }
        enum ViewportOcclusionCullingBuildQuality {
            ViewportOcclusionBuildQualityLow = 0,
            ViewportOcclusionBuildQualityMedium = 1,
            ViewportOcclusionBuildQualityHigh = 2,
        }
        enum ViewportRenderInfo {
            ViewportRenderInfoObjectsInFrame = 0,
            ViewportRenderInfoPrimitivesInFrame = 1,
            ViewportRenderInfoDrawCallsInFrame = 2,
            ViewportRenderInfoMax = 3,
        }
        enum ViewportRenderInfoType {
            ViewportRenderInfoTypeVisible = 0,
            ViewportRenderInfoTypeShadow = 1,
            ViewportRenderInfoTypeCanvas = 2,
            ViewportRenderInfoTypeMax = 3,
        }
        enum ViewportDebugDraw {
            ViewportDebugDrawDisabled = 0,
            ViewportDebugDrawUnshaded = 1,
            ViewportDebugDrawLighting = 2,
            ViewportDebugDrawOverdraw = 3,
            ViewportDebugDrawWireframe = 4,
            ViewportDebugDrawNormalBuffer = 5,
            ViewportDebugDrawVoxelGIAlbedo = 6,
            ViewportDebugDrawVoxelGILighting = 7,
            ViewportDebugDrawVoxelGIEmission = 8,
            ViewportDebugDrawShadowAtlas = 9,
            ViewportDebugDrawDirectionalShadowAtlas = 10,
            ViewportDebugDrawSceneLuminance = 11,
            ViewportDebugDrawSsao = 12,
            ViewportDebugDrawSsil = 13,
            ViewportDebugDrawPssmSplits = 14,
            ViewportDebugDrawDecalAtlas = 15,
            ViewportDebugDrawSdfgi = 16,
            ViewportDebugDrawSdfgiProbes = 17,
            ViewportDebugDrawGIBuffer = 18,
            ViewportDebugDrawDisableLod = 19,
            ViewportDebugDrawClusterOmniLights = 20,
            ViewportDebugDrawClusterSpotLights = 21,
            ViewportDebugDrawClusterDecals = 22,
            ViewportDebugDrawClusterReflectionProbes = 23,
            ViewportDebugDrawOccluders = 24,
            ViewportDebugDrawMotionVectors = 25,
            ViewportDebugDrawInternalBuffer = 26,
        }
        enum ViewportVrsMode {
            ViewportVrsDisabled = 0,
            ViewportVrsTexture = 1,
            ViewportVrsXR = 2,
            ViewportVrsMax = 3,
        }
        enum ViewportVrsUpdateMode {
            ViewportVrsUpdateDisabled = 0,
            ViewportVrsUpdateOnce = 1,
            ViewportVrsUpdateAlways = 2,
            ViewportVrsUpdateMax = 3,
        }
        enum SkyMode {
            SkyModeAutomatic = 0,
            SkyModeQuality = 1,
            SkyModeIncremental = 2,
            SkyModeRealtime = 3,
        }
        enum CompositorEffectFlags {
            CompositorEffectFlagAccessResolvedColor = 1,
            CompositorEffectFlagAccessResolvedDepth = 2,
            CompositorEffectFlagNeedsMotionVectors = 4,
            CompositorEffectFlagNeedsRoughness = 8,
            CompositorEffectFlagNeedsSeparateSpecular = 16,
        }
        enum CompositorEffectCallbackType {
            CompositorEffectCallbackTypePreOpaque = 0,
            CompositorEffectCallbackTypePostOpaque = 1,
            CompositorEffectCallbackTypePostSky = 2,
            CompositorEffectCallbackTypePreTransparent = 3,
            CompositorEffectCallbackTypePostTransparent = 4,
            CompositorEffectCallbackTypeAny = -1,
        }
        enum EnvironmentBG {
            EnvBgClearColor = 0,
            EnvBgColor = 1,
            EnvBgSky = 2,
            EnvBgCanvas = 3,
            EnvBgKeep = 4,
            EnvBgCameraFeed = 5,
            EnvBgMax = 6,
        }
        enum EnvironmentAmbientSource {
            EnvAmbientSourceBg = 0,
            EnvAmbientSourceDisabled = 1,
            EnvAmbientSourceColor = 2,
            EnvAmbientSourceSky = 3,
        }
        enum EnvironmentReflectionSource {
            EnvReflectionSourceBg = 0,
            EnvReflectionSourceDisabled = 1,
            EnvReflectionSourceSky = 2,
        }
        enum EnvironmentGlowBlendMode {
            EnvGlowBlendModeAdditive = 0,
            EnvGlowBlendModeScreen = 1,
            EnvGlowBlendModeSoftlight = 2,
            EnvGlowBlendModeReplace = 3,
            EnvGlowBlendModeMix = 4,
        }
        enum EnvironmentFogMode {
            EnvFogModeExponential = 0,
            EnvFogModeDepth = 1,
        }
        enum EnvironmentToneMapper {
            EnvToneMapperLinear = 0,
            EnvToneMapperReinhard = 1,
            EnvToneMapperFilmic = 2,
            EnvToneMapperAces = 3,
            EnvToneMapperAgx = 4,
        }
        enum EnvironmentSsrRoughnessQuality {
            EnvSsrRoughnessQualityDisabled = 0,
            EnvSsrRoughnessQualityLow = 1,
            EnvSsrRoughnessQualityMedium = 2,
            EnvSsrRoughnessQualityHigh = 3,
        }
        enum EnvironmentSsaoQuality {
            EnvSsaoQualityVeryLow = 0,
            EnvSsaoQualityLow = 1,
            EnvSsaoQualityMedium = 2,
            EnvSsaoQualityHigh = 3,
            EnvSsaoQualityUltra = 4,
        }
        enum EnvironmentSsilQuality {
            EnvSsilQualityVeryLow = 0,
            EnvSsilQualityLow = 1,
            EnvSsilQualityMedium = 2,
            EnvSsilQualityHigh = 3,
            EnvSsilQualityUltra = 4,
        }
        enum EnvironmentSdfgiyScale {
            EnvSdfgiYScale50Percent = 0,
            EnvSdfgiYScale75Percent = 1,
            EnvSdfgiYScale100Percent = 2,
        }
        enum EnvironmentSdfgiRayCount {
            EnvSdfgiRayCount4 = 0,
            EnvSdfgiRayCount8 = 1,
            EnvSdfgiRayCount16 = 2,
            EnvSdfgiRayCount32 = 3,
            EnvSdfgiRayCount64 = 4,
            EnvSdfgiRayCount96 = 5,
            EnvSdfgiRayCount128 = 6,
            EnvSdfgiRayCountMax = 7,
        }
        enum EnvironmentSdfgiFramesToConverge {
            EnvSdfgiConvergeIn5Frames = 0,
            EnvSdfgiConvergeIn10Frames = 1,
            EnvSdfgiConvergeIn15Frames = 2,
            EnvSdfgiConvergeIn20Frames = 3,
            EnvSdfgiConvergeIn25Frames = 4,
            EnvSdfgiConvergeIn30Frames = 5,
            EnvSdfgiConvergeMax = 6,
        }
        enum EnvironmentSdfgiFramesToUpdateLight {
            EnvSdfgiUpdateLightIn1Frame = 0,
            EnvSdfgiUpdateLightIn2Frames = 1,
            EnvSdfgiUpdateLightIn4Frames = 2,
            EnvSdfgiUpdateLightIn8Frames = 3,
            EnvSdfgiUpdateLightIn16Frames = 4,
            EnvSdfgiUpdateLightMax = 5,
        }
        enum SubSurfaceScatteringQuality {
            SubSurfaceScatteringQualityDisabled = 0,
            SubSurfaceScatteringQualityLow = 1,
            SubSurfaceScatteringQualityMedium = 2,
            SubSurfaceScatteringQualityHigh = 3,
        }
        enum DofBokehShape {
            DofBokehBox = 0,
            DofBokehHexagon = 1,
            DofBokehCircle = 2,
        }
        enum DofBlurQuality {
            DofBlurQualityVeryLow = 0,
            DofBlurQualityLow = 1,
            DofBlurQualityMedium = 2,
            DofBlurQualityHigh = 3,
        }
        enum InstanceType {
            InstanceNone = 0,
            InstanceMesh = 1,
            InstanceMultimesh = 2,
            InstanceParticles = 3,
            InstanceParticlesCollision = 4,
            InstanceLight = 5,
            InstanceReflectionProbe = 6,
            InstanceDecal = 7,
            InstanceVoxelGI = 8,
            InstanceLightmap = 9,
            InstanceOccluder = 10,
            InstanceVisiblityNotifier = 11,
            InstanceFogVolume = 12,
            InstanceMax = 13,
            InstanceGeometryMask = 14,
        }
        enum InstanceFlags {
            InstanceFlagUseBakedLight = 0,
            InstanceFlagUseDynamicGI = 1,
            InstanceFlagDrawNextFrameIfVisible = 2,
            InstanceFlagIgnoreOcclusionCulling = 3,
            InstanceFlagMax = 4,
        }
        enum ShadowCastingSetting {
            ShadowCastingSettingOff = 0,
            ShadowCastingSettingOn = 1,
            ShadowCastingSettingDoubleSided = 2,
            ShadowCastingSettingShadowsOnly = 3,
        }
        enum VisibilityRangeFadeMode {
            VisibilityRangeFadeDisabled = 0,
            VisibilityRangeFadeSelf = 1,
            VisibilityRangeFadeDependencies = 2,
        }
        enum BakeChannels {
            BakeChannelAlbedoAlpha = 0,
            BakeChannelNormal = 1,
            BakeChannelOrm = 2,
            BakeChannelEmission = 3,
        }
        enum CanvasTextureChannel {
            CanvasTextureChannelDiffuse = 0,
            CanvasTextureChannelNormal = 1,
            CanvasTextureChannelSpecular = 2,
        }
        enum NinePatchAxisMode {
            NinePatchStretch = 0,
            NinePatchTile = 1,
            NinePatchTileFit = 2,
        }
        enum CanvasItemTextureFilter {
            CanvasItemTextureFilterDefault = 0,
            CanvasItemTextureFilterNearest = 1,
            CanvasItemTextureFilterLinear = 2,
            CanvasItemTextureFilterNearestWithMipmaps = 3,
            CanvasItemTextureFilterLinearWithMipmaps = 4,
            CanvasItemTextureFilterNearestWithMipmapsAnisotropic = 5,
            CanvasItemTextureFilterLinearWithMipmapsAnisotropic = 6,
            CanvasItemTextureFilterMax = 7,
        }
        enum CanvasItemTextureRepeat {
            CanvasItemTextureRepeatDefault = 0,
            CanvasItemTextureRepeatDisabled = 1,
            CanvasItemTextureRepeatEnabled = 2,
            CanvasItemTextureRepeatMirror = 3,
            CanvasItemTextureRepeatMax = 4,
        }
        enum CanvasGroupMode {
            CanvasGroupModeDisabled = 0,
            CanvasGroupModeClipOnly = 1,
            CanvasGroupModeClipAndDraw = 2,
            CanvasGroupModeTransparent = 3,
        }
        enum CanvasLightMode {
            CanvasLightModePoint = 0,
            CanvasLightModeDirectional = 1,
        }
        enum CanvasLightBlendMode {
            CanvasLightBlendModeAdd = 0,
            CanvasLightBlendModeSub = 1,
            CanvasLightBlendModeMix = 2,
        }
        enum CanvasLightShadowFilter {
            CanvasLightFilterNone = 0,
            CanvasLightFilterPcf5 = 1,
            CanvasLightFilterPcf13 = 2,
            CanvasLightFilterMax = 3,
        }
        enum CanvasOccluderPolygonCullMode {
            CanvasOccluderPolygonCullDisabled = 0,
            CanvasOccluderPolygonCullClockwise = 1,
            CanvasOccluderPolygonCullCounterClockwise = 2,
        }
        enum GlobalShaderParameterType {
            GlobalVarTypeBool = 0,
            GlobalVarTypeBvec2 = 1,
            GlobalVarTypeBvec3 = 2,
            GlobalVarTypeBvec4 = 3,
            GlobalVarTypeInt = 4,
            GlobalVarTypeIvec2 = 5,
            GlobalVarTypeIvec3 = 6,
            GlobalVarTypeIvec4 = 7,
            GlobalVarTypeRect2I = 8,
            GlobalVarTypeUint = 9,
            GlobalVarTypeUvec2 = 10,
            GlobalVarTypeUvec3 = 11,
            GlobalVarTypeUvec4 = 12,
            GlobalVarTypeFloat = 13,
            GlobalVarTypeVec2 = 14,
            GlobalVarTypeVec3 = 15,
            GlobalVarTypeVec4 = 16,
            GlobalVarTypeColor = 17,
            GlobalVarTypeRect2 = 18,
            GlobalVarTypeMat2 = 19,
            GlobalVarTypeMat3 = 20,
            GlobalVarTypeMat4 = 21,
            GlobalVarTypeTransform2D = 22,
            GlobalVarTypeTransform = 23,
            GlobalVarTypeSampler2D = 24,
            GlobalVarTypeSampler2Darray = 25,
            GlobalVarTypeSampler3D = 26,
            GlobalVarTypeSamplercube = 27,
            GlobalVarTypeSamplerext = 28,
            GlobalVarTypeMax = 29,
        }
        enum RenderingInfo {
            RenderingInfoTotalObjectsInFrame = 0,
            RenderingInfoTotalPrimitivesInFrame = 1,
            RenderingInfoTotalDrawCallsInFrame = 2,
            RenderingInfoTextureMemUsed = 3,
            RenderingInfoBufferMemUsed = 4,
            RenderingInfoVideoMemUsed = 5,
            RenderingInfoPipelineCompilationsCanvas = 6,
            RenderingInfoPipelineCompilationsMesh = 7,
            RenderingInfoPipelineCompilationsSurface = 8,
            RenderingInfoPipelineCompilationsDraw = 9,
            RenderingInfoPipelineCompilationsSpecialization = 10,
        }
        enum PipelineSource {
            PipelineSourceCanvas = 0,
            PipelineSourceMesh = 1,
            PipelineSourceSurface = 2,
            PipelineSourceDraw = 3,
            PipelineSourceSpecialization = 4,
            PipelineSourceMax = 5,
        }
        enum SplashStretchMode {
            SplashStretchModeDisabled = 0,
            SplashStretchModeKeep = 1,
            SplashStretchModeKeepWidth = 2,
            SplashStretchModeKeepHeight = 3,
            SplashStretchModeCover = 4,
            SplashStretchModeIgnore = 5,
        }
        enum Features {
            FeatureShaders = 0,
            FeatureMultithreaded = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderingServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderingServer extends __NameMapGObject {
        texture_2d_create: "texture2DCreate";
        texture_2d_layered_create: "texture2DLayeredCreate";
        texture_3d_create: "texture3DCreate";
        texture_proxy_create: "textureProxyCreate";
        texture_create_from_native_handle: "textureCreateFromNativeHandle";
        texture_drawable_create: "textureDrawableCreate";
        texture_2d_update: "texture2DUpdate";
        texture_3d_update: "texture3DUpdate";
        texture_proxy_update: "textureProxyUpdate";
        texture_drawable_blit_rect: "textureDrawableBlitRect";
        texture_2d_placeholder_create: "texture2DPlaceholderCreate";
        texture_2d_layered_placeholder_create: "texture2DLayeredPlaceholderCreate";
        texture_3d_placeholder_create: "texture3DPlaceholderCreate";
        texture_2d_get: "texture2DGet";
        texture_2d_layer_get: "texture2DLayerGet";
        texture_3d_get: "texture3DGet";
        texture_drawable_generate_mipmaps: "textureDrawableGenerateMipmaps";
        texture_drawable_get_default_material: "textureDrawableGetDefaultMaterial";
        texture_replace: "textureReplace";
        texture_replace_compatible: "textureReplaceCompatible";
        texture_set_size_override: "textureSetSizeOverride";
        texture_set_path: "textureSetPath";
        texture_get_path: "textureGetPath";
        texture_get_format: "textureGetFormat";
        texture_set_force_redraw_if_visible: "textureSetForceRedrawIfVisible";
        texture_rd_create: "textureRdCreate";
        texture_get_rd_texture: "textureGetRdTexture";
        texture_get_native_handle: "textureGetNativeHandle";
        shader_create: "shaderCreate";
        shader_set_code: "shaderSetCode";
        shader_set_path_hint: "shaderSetPathHint";
        shader_get_code: "shaderGetCode";
        get_shader_parameter_list: "getShaderParameterList";
        shader_get_parameter_default: "shaderGetParameterDefault";
        shader_set_default_texture_parameter: "shaderSetDefaultTextureParameter";
        shader_get_default_texture_parameter: "shaderGetDefaultTextureParameter";
        material_create: "materialCreate";
        material_set_shader: "materialSetShader";
        material_set_param: "materialSetParam";
        material_get_param: "materialGetParam";
        material_set_render_priority: "materialSetRenderPriority";
        material_set_next_pass: "materialSetNextPass";
        material_set_use_debanding: "materialSetUseDebanding";
        mesh_create_from_surfaces: "meshCreateFromSurfaces";
        mesh_create: "meshCreate";
        mesh_surface_get_format_offset: "meshSurfaceGetFormatOffset";
        mesh_surface_get_format_vertex_stride: "meshSurfaceGetFormatVertexStride";
        mesh_surface_get_format_normal_tangent_stride: "meshSurfaceGetFormatNormalTangentStride";
        mesh_surface_get_format_attribute_stride: "meshSurfaceGetFormatAttributeStride";
        mesh_surface_get_format_skin_stride: "meshSurfaceGetFormatSkinStride";
        mesh_surface_get_format_index_stride: "meshSurfaceGetFormatIndexStride";
        mesh_add_surface: "meshAddSurface";
        mesh_add_surface_from_arrays: "meshAddSurfaceFromArrays";
        mesh_get_blend_shape_count: "meshGetBlendShapeCount";
        mesh_set_blend_shape_mode: "meshSetBlendShapeMode";
        mesh_get_blend_shape_mode: "meshGetBlendShapeMode";
        mesh_surface_set_material: "meshSurfaceSetMaterial";
        mesh_surface_get_material: "meshSurfaceGetMaterial";
        mesh_get_surface: "meshGetSurface";
        mesh_surface_get_arrays: "meshSurfaceGetArrays";
        mesh_surface_get_blend_shape_arrays: "meshSurfaceGetBlendShapeArrays";
        mesh_get_surface_count: "meshGetSurfaceCount";
        mesh_set_custom_aabb: "meshSetCustomAabb";
        mesh_get_custom_aabb: "meshGetCustomAabb";
        mesh_surface_remove: "meshSurfaceRemove";
        mesh_clear: "meshClear";
        mesh_surface_update_vertex_region: "meshSurfaceUpdateVertexRegion";
        mesh_surface_update_attribute_region: "meshSurfaceUpdateAttributeRegion";
        mesh_surface_update_skin_region: "meshSurfaceUpdateSkinRegion";
        mesh_surface_update_index_region: "meshSurfaceUpdateIndexRegion";
        mesh_surface_get_vertex_buffer_rd_rid: "meshSurfaceGetVertexBufferRdRid";
        mesh_surface_get_attribute_buffer_rd_rid: "meshSurfaceGetAttributeBufferRdRid";
        mesh_surface_get_skin_buffer_rd_rid: "meshSurfaceGetSkinBufferRdRid";
        mesh_surface_get_index_buffer_rd_rid: "meshSurfaceGetIndexBufferRdRid";
        mesh_set_shadow_mesh: "meshSetShadowMesh";
        multimesh_create: "multimeshCreate";
        multimesh_allocate_data: "multimeshAllocateData";
        multimesh_get_instance_count: "multimeshGetInstanceCount";
        multimesh_set_mesh: "multimeshSetMesh";
        multimesh_instance_set_transform: "multimeshInstanceSetTransform";
        multimesh_instance_set_transform_2d: "multimeshInstanceSetTransform2D";
        multimesh_instance_set_color: "multimeshInstanceSetColor";
        multimesh_instance_set_custom_data: "multimeshInstanceSetCustomData";
        multimesh_get_mesh: "multimeshGetMesh";
        multimesh_get_aabb: "multimeshGetAabb";
        multimesh_set_custom_aabb: "multimeshSetCustomAabb";
        multimesh_get_custom_aabb: "multimeshGetCustomAabb";
        multimesh_instance_get_transform: "multimeshInstanceGetTransform";
        multimesh_instance_get_transform_2d: "multimeshInstanceGetTransform2D";
        multimesh_instance_get_color: "multimeshInstanceGetColor";
        multimesh_instance_get_custom_data: "multimeshInstanceGetCustomData";
        multimesh_set_visible_instances: "multimeshSetVisibleInstances";
        multimesh_get_visible_instances: "multimeshGetVisibleInstances";
        multimesh_set_buffer: "multimeshSetBuffer";
        multimesh_get_command_buffer_rd_rid: "multimeshGetCommandBufferRdRid";
        multimesh_get_buffer_rd_rid: "multimeshGetBufferRdRid";
        multimesh_get_buffer: "multimeshGetBuffer";
        multimesh_set_buffer_interpolated: "multimeshSetBufferInterpolated";
        multimesh_set_physics_interpolated: "multimeshSetPhysicsInterpolated";
        multimesh_set_physics_interpolation_quality: "multimeshSetPhysicsInterpolationQuality";
        multimesh_instance_reset_physics_interpolation: "multimeshInstanceResetPhysicsInterpolation";
        multimesh_instances_reset_physics_interpolation: "multimeshInstancesResetPhysicsInterpolation";
        skeleton_create: "skeletonCreate";
        skeleton_allocate_data: "skeletonAllocateData";
        skeleton_get_bone_count: "skeletonGetBoneCount";
        skeleton_bone_set_transform: "skeletonBoneSetTransform";
        skeleton_bone_get_transform: "skeletonBoneGetTransform";
        skeleton_bone_set_transform_2d: "skeletonBoneSetTransform2D";
        skeleton_bone_get_transform_2d: "skeletonBoneGetTransform2D";
        skeleton_set_base_transform_2d: "skeletonSetBaseTransform2D";
        directional_light_create: "directionalLightCreate";
        omni_light_create: "omniLightCreate";
        spot_light_create: "spotLightCreate";
        area_light_create: "areaLightCreate";
        light_set_color: "lightSetColor";
        light_set_param: "lightSetParam";
        light_set_shadow: "lightSetShadow";
        light_set_projector: "lightSetProjector";
        light_set_negative: "lightSetNegative";
        light_set_cull_mask: "lightSetCullMask";
        light_set_distance_fade: "lightSetDistanceFade";
        light_set_reverse_cull_face_mode: "lightSetReverseCullFaceMode";
        light_set_shadow_caster_mask: "lightSetShadowCasterMask";
        light_set_bake_mode: "lightSetBakeMode";
        light_set_max_sdfgi_cascade: "lightSetMaxSdfgiCascade";
        light_set_allow_contact_shadows: "lightSetAllowContactShadows";
        light_omni_set_shadow_mode: "lightOmniSetShadowMode";
        light_directional_set_shadow_mode: "lightDirectionalSetShadowMode";
        light_directional_set_blend_splits: "lightDirectionalSetBlendSplits";
        light_directional_set_sky_mode: "lightDirectionalSetSkyMode";
        light_area_set_size: "lightAreaSetSize";
        light_area_set_normalize_energy: "lightAreaSetNormalizeEnergy";
        light_projectors_set_filter: "lightProjectorsSetFilter";
        lightmaps_set_bicubic_filter: "lightmapsSetBicubicFilter";
        positional_soft_shadow_filter_set_quality: "positionalSoftShadowFilterSetQuality";
        directional_soft_shadow_filter_set_quality: "directionalSoftShadowFilterSetQuality";
        directional_shadow_atlas_set_size: "directionalShadowAtlasSetSize";
        reflection_probe_create: "reflectionProbeCreate";
        reflection_probe_set_update_mode: "reflectionProbeSetUpdateMode";
        reflection_probe_set_intensity: "reflectionProbeSetIntensity";
        reflection_probe_set_blend_distance: "reflectionProbeSetBlendDistance";
        reflection_probe_set_ambient_mode: "reflectionProbeSetAmbientMode";
        reflection_probe_set_ambient_color: "reflectionProbeSetAmbientColor";
        reflection_probe_set_ambient_energy: "reflectionProbeSetAmbientEnergy";
        reflection_probe_set_max_distance: "reflectionProbeSetMaxDistance";
        reflection_probe_set_size: "reflectionProbeSetSize";
        reflection_probe_set_origin_offset: "reflectionProbeSetOriginOffset";
        reflection_probe_set_as_interior: "reflectionProbeSetAsInterior";
        reflection_probe_set_enable_box_projection: "reflectionProbeSetEnableBoxProjection";
        reflection_probe_set_enable_shadows: "reflectionProbeSetEnableShadows";
        reflection_probe_set_cull_mask: "reflectionProbeSetCullMask";
        reflection_probe_set_reflection_mask: "reflectionProbeSetReflectionMask";
        reflection_probe_set_resolution: "reflectionProbeSetResolution";
        reflection_probe_set_mesh_lod_threshold: "reflectionProbeSetMeshLodThreshold";
        decal_create: "decalCreate";
        decal_set_size: "decalSetSize";
        decal_set_texture: "decalSetTexture";
        decal_set_emission_energy: "decalSetEmissionEnergy";
        decal_set_albedo_mix: "decalSetAlbedoMix";
        decal_set_modulate: "decalSetModulate";
        decal_set_cull_mask: "decalSetCullMask";
        decal_set_distance_fade: "decalSetDistanceFade";
        decal_set_fade: "decalSetFade";
        decal_set_normal_fade: "decalSetNormalFade";
        decals_set_filter: "decalsSetFilter";
        gi_set_use_half_resolution: "gISetUseHalfResolution";
        voxel_gi_create: "voxelGICreate";
        voxel_gi_allocate_data: "voxelGIAllocateData";
        voxel_gi_get_octree_size: "voxelGIGetOctreeSize";
        voxel_gi_get_octree_cells: "voxelGIGetOctreeCells";
        voxel_gi_get_data_cells: "voxelGIGetDataCells";
        voxel_gi_get_distance_field: "voxelGIGetDistanceField";
        voxel_gi_get_level_counts: "voxelGIGetLevelCounts";
        voxel_gi_get_to_cell_xform: "voxelGIGetToCellXform";
        voxel_gi_set_dynamic_range: "voxelGISetDynamicRange";
        voxel_gi_set_propagation: "voxelGISetPropagation";
        voxel_gi_set_energy: "voxelGISetEnergy";
        voxel_gi_set_baked_exposure_normalization: "voxelGISetBakedExposureNormalization";
        voxel_gi_set_bias: "voxelGISetBias";
        voxel_gi_set_normal_bias: "voxelGISetNormalBias";
        voxel_gi_set_interior: "voxelGISetInterior";
        voxel_gi_set_use_two_bounces: "voxelGISetUseTwoBounces";
        voxel_gi_set_quality: "voxelGISetQuality";
        lightmap_create: "lightmapCreate";
        lightmap_set_textures: "lightmapSetTextures";
        lightmap_set_probe_bounds: "lightmapSetProbeBounds";
        lightmap_set_probe_interior: "lightmapSetProbeInterior";
        lightmap_set_probe_capture_data: "lightmapSetProbeCaptureData";
        lightmap_get_probe_capture_points: "lightmapGetProbeCapturePoints";
        lightmap_get_probe_capture_sh: "lightmapGetProbeCaptureSh";
        lightmap_get_probe_capture_tetrahedra: "lightmapGetProbeCaptureTetrahedra";
        lightmap_get_probe_capture_bsp_tree: "lightmapGetProbeCaptureBspTree";
        lightmap_set_baked_exposure_normalization: "lightmapSetBakedExposureNormalization";
        lightmap_set_probe_capture_update_speed: "lightmapSetProbeCaptureUpdateSpeed";
        particles_create: "particlesCreate";
        particles_set_mode: "particlesSetMode";
        particles_set_emitting: "particlesSetEmitting";
        particles_get_emitting: "particlesGetEmitting";
        particles_set_amount: "particlesSetAmount";
        particles_set_amount_ratio: "particlesSetAmountRatio";
        particles_set_lifetime: "particlesSetLifetime";
        particles_set_one_shot: "particlesSetOneShot";
        particles_set_pre_process_time: "particlesSetPreProcessTime";
        particles_request_process_time: "particlesRequestProcessTime";
        particles_set_explosiveness_ratio: "particlesSetExplosivenessRatio";
        particles_set_randomness_ratio: "particlesSetRandomnessRatio";
        particles_set_interp_to_end: "particlesSetInterpToEnd";
        particles_set_emitter_velocity: "particlesSetEmitterVelocity";
        particles_set_custom_aabb: "particlesSetCustomAabb";
        particles_set_speed_scale: "particlesSetSpeedScale";
        particles_set_use_local_coordinates: "particlesSetUseLocalCoordinates";
        particles_set_process_material: "particlesSetProcessMaterial";
        particles_set_fixed_fps: "particlesSetFixedFps";
        particles_set_interpolate: "particlesSetInterpolate";
        particles_set_fractional_delta: "particlesSetFractionalDelta";
        particles_set_collision_base_size: "particlesSetCollisionBaseSize";
        particles_set_transform_align: "particlesSetTransformAlign";
        particles_set_transform_align_channel_filter: "particlesSetTransformAlignChannelFilter";
        particles_set_transform_align_axis: "particlesSetTransformAlignAxis";
        particles_set_trails: "particlesSetTrails";
        particles_set_trail_bind_poses: "particlesSetTrailBindPoses";
        particles_is_inactive: "particlesIsInactive";
        particles_request_process: "particlesRequestProcess";
        particles_restart: "particlesRestart";
        particles_set_subemitter: "particlesSetSubemitter";
        particles_emit: "particlesEmit";
        particles_set_draw_order: "particlesSetDrawOrder";
        particles_set_draw_passes: "particlesSetDrawPasses";
        particles_set_draw_pass_mesh: "particlesSetDrawPassMesh";
        particles_get_current_aabb: "particlesGetCurrentAabb";
        particles_set_emission_transform: "particlesSetEmissionTransform";
        particles_collision_create: "particlesCollisionCreate";
        particles_collision_set_collision_type: "particlesCollisionSetCollisionType";
        particles_collision_set_cull_mask: "particlesCollisionSetCullMask";
        particles_collision_set_sphere_radius: "particlesCollisionSetSphereRadius";
        particles_collision_set_box_extents: "particlesCollisionSetBoxExtents";
        particles_collision_set_attractor_strength: "particlesCollisionSetAttractorStrength";
        particles_collision_set_attractor_directionality: "particlesCollisionSetAttractorDirectionality";
        particles_collision_set_attractor_attenuation: "particlesCollisionSetAttractorAttenuation";
        particles_collision_set_field_texture: "particlesCollisionSetFieldTexture";
        particles_collision_height_field_update: "particlesCollisionHeightFieldUpdate";
        particles_collision_set_height_field_resolution: "particlesCollisionSetHeightFieldResolution";
        particles_collision_set_height_field_mask: "particlesCollisionSetHeightFieldMask";
        fog_volume_create: "fogVolumeCreate";
        fog_volume_set_shape: "fogVolumeSetShape";
        fog_volume_set_size: "fogVolumeSetSize";
        fog_volume_set_material: "fogVolumeSetMaterial";
        visibility_notifier_create: "visibilityNotifierCreate";
        visibility_notifier_set_aabb: "visibilityNotifierSetAabb";
        visibility_notifier_set_callbacks: "visibilityNotifierSetCallbacks";
        occluder_create: "occluderCreate";
        occluder_set_mesh: "occluderSetMesh";
        camera_create: "cameraCreate";
        camera_set_perspective: "cameraSetPerspective";
        camera_set_orthogonal: "cameraSetOrthogonal";
        camera_set_frustum: "cameraSetFrustum";
        camera_set_xr_projections: "cameraSetXRProjections";
        camera_set_transform: "cameraSetTransform";
        camera_set_cull_mask: "cameraSetCullMask";
        camera_set_environment: "cameraSetEnvironment";
        camera_set_camera_attributes: "cameraSetCameraAttributes";
        camera_set_compositor: "cameraSetCompositor";
        camera_set_use_vertical_aspect: "cameraSetUseVerticalAspect";
        viewport_create: "viewportCreate";
        viewport_set_use_xr: "viewportSetUseXR";
        viewport_set_size: "viewportSetSize";
        viewport_set_active: "viewportSetActive";
        viewport_set_parent_viewport: "viewportSetParentViewport";
        viewport_attach_to_screen: "viewportAttachToScreen";
        viewport_set_render_direct_to_screen: "viewportSetRenderDirectToScreen";
        viewport_set_canvas_cull_mask: "viewportSetCanvasCullMask";
        viewport_set_scaling_3d_mode: "viewportSetScaling3DMode";
        viewport_set_scaling_3d_scale: "viewportSetScaling3DScale";
        viewport_set_fsr_sharpness: "viewportSetFsrSharpness";
        viewport_set_texture_mipmap_bias: "viewportSetTextureMipmapBias";
        viewport_set_anisotropic_filtering_level: "viewportSetAnisotropicFilteringLevel";
        viewport_set_update_mode: "viewportSetUpdateMode";
        viewport_get_update_mode: "viewportGetUpdateMode";
        viewport_set_clear_mode: "viewportSetClearMode";
        viewport_get_render_target: "viewportGetRenderTarget";
        viewport_get_texture: "viewportGetTexture";
        viewport_set_disable_3d: "viewportSetDisable3D";
        viewport_set_disable_2d: "viewportSetDisable2D";
        viewport_set_environment_mode: "viewportSetEnvironmentMode";
        viewport_attach_camera: "viewportAttachCamera";
        viewport_set_scenario: "viewportSetScenario";
        viewport_attach_canvas: "viewportAttachCanvas";
        viewport_remove_canvas: "viewportRemoveCanvas";
        viewport_set_snap_2d_transforms_to_pixel: "viewportSetSnap2DTransformsToPixel";
        viewport_set_snap_2d_vertices_to_pixel: "viewportSetSnap2DVerticesToPixel";
        viewport_set_default_canvas_item_texture_filter: "viewportSetDefaultCanvasItemTextureFilter";
        viewport_set_default_canvas_item_texture_repeat: "viewportSetDefaultCanvasItemTextureRepeat";
        viewport_set_canvas_transform: "viewportSetCanvasTransform";
        viewport_set_canvas_stacking: "viewportSetCanvasStacking";
        viewport_set_transparent_background: "viewportSetTransparentBackground";
        viewport_set_global_canvas_transform: "viewportSetGlobalCanvasTransform";
        viewport_set_sdf_oversize_and_scale: "viewportSetSdfOversizeAndScale";
        viewport_set_positional_shadow_atlas_size: "viewportSetPositionalShadowAtlasSize";
        viewport_set_positional_shadow_atlas_quadrant_subdivision: "viewportSetPositionalShadowAtlasQuadrantSubdivision";
        viewport_set_msaa_3d: "viewportSetMsaa3D";
        viewport_set_msaa_2d: "viewportSetMsaa2D";
        viewport_set_use_hdr_2d: "viewportSetUseHdr2D";
        viewport_set_screen_space_aa: "viewportSetScreenSpaceAA";
        viewport_set_use_taa: "viewportSetUseTaa";
        viewport_set_use_debanding: "viewportSetUseDebanding";
        viewport_set_use_occlusion_culling: "viewportSetUseOcclusionCulling";
        viewport_set_occlusion_rays_per_thread: "viewportSetOcclusionRaysPerThread";
        viewport_set_occlusion_culling_build_quality: "viewportSetOcclusionCullingBuildQuality";
        viewport_get_render_info: "viewportGetRenderInfo";
        viewport_set_debug_draw: "viewportSetDebugDraw";
        viewport_set_measure_render_time: "viewportSetMeasureRenderTime";
        viewport_get_measured_render_time_cpu: "viewportGetMeasuredRenderTimeCpu";
        viewport_get_measured_render_time_gpu: "viewportGetMeasuredRenderTimeGpu";
        viewport_set_vrs_mode: "viewportSetVrsMode";
        viewport_set_vrs_update_mode: "viewportSetVrsUpdateMode";
        viewport_set_vrs_texture: "viewportSetVrsTexture";
        sky_create: "skyCreate";
        sky_set_radiance_size: "skySetRadianceSize";
        sky_set_mode: "skySetMode";
        sky_set_material: "skySetMaterial";
        sky_bake_panorama: "skyBakePanorama";
        compositor_effect_create: "compositorEffectCreate";
        compositor_effect_set_enabled: "compositorEffectSetEnabled";
        compositor_effect_set_callback: "compositorEffectSetCallback";
        compositor_effect_set_flag: "compositorEffectSetFlag";
        compositor_create: "compositorCreate";
        compositor_set_compositor_effects: "compositorSetCompositorEffects";
        environment_create: "environmentCreate";
        environment_set_background: "environmentSetBackground";
        environment_set_camera_id: "environmentSetCameraId";
        environment_set_sky: "environmentSetSky";
        environment_set_sky_custom_fov: "environmentSetSkyCustomFov";
        environment_set_sky_orientation: "environmentSetSkyOrientation";
        environment_set_bg_color: "environmentSetBgColor";
        environment_set_bg_energy: "environmentSetBgEnergy";
        environment_set_canvas_max_layer: "environmentSetCanvasMaxLayer";
        environment_set_ambient_light: "environmentSetAmbientLight";
        environment_set_glow: "environmentSetGlow";
        environment_set_tonemap: "environmentSetTonemap";
        environment_set_tonemap_agx_contrast: "environmentSetTonemapAgxContrast";
        environment_set_adjustment: "environmentSetAdjustment";
        environment_set_ssr: "environmentSetSsr";
        environment_set_ssao: "environmentSetSsao";
        environment_set_fog: "environmentSetFog";
        environment_set_fog_depth: "environmentSetFogDepth";
        environment_set_sdfgi: "environmentSetSdfgi";
        environment_set_volumetric_fog: "environmentSetVolumetricFog";
        environment_glow_set_use_bicubic_upscale: "environmentGlowSetUseBicubicUpscale";
        environment_set_ssr_half_size: "environmentSetSsrHalfSize";
        environment_set_ssr_roughness_quality: "environmentSetSsrRoughnessQuality";
        environment_set_ssao_quality: "environmentSetSsaoQuality";
        environment_set_ssil_quality: "environmentSetSsilQuality";
        environment_set_sdfgi_ray_count: "environmentSetSdfgiRayCount";
        environment_set_sdfgi_frames_to_converge: "environmentSetSdfgiFramesToConverge";
        environment_set_sdfgi_frames_to_update_light: "environmentSetSdfgiFramesToUpdateLight";
        environment_set_volumetric_fog_volume_size: "environmentSetVolumetricFogVolumeSize";
        environment_set_volumetric_fog_filter_active: "environmentSetVolumetricFogFilterActive";
        environment_bake_panorama: "environmentBakePanorama";
        screen_space_roughness_limiter_set_active: "screenSpaceRoughnessLimiterSetActive";
        sub_surface_scattering_set_quality: "subSurfaceScatteringSetQuality";
        sub_surface_scattering_set_scale: "subSurfaceScatteringSetScale";
        camera_attributes_create: "cameraAttributesCreate";
        camera_attributes_set_dof_blur_quality: "cameraAttributesSetDofBlurQuality";
        camera_attributes_set_dof_blur_bokeh_shape: "cameraAttributesSetDofBlurBokehShape";
        camera_attributes_set_dof_blur: "cameraAttributesSetDofBlur";
        camera_attributes_set_exposure: "cameraAttributesSetExposure";
        camera_attributes_set_auto_exposure: "cameraAttributesSetAutoExposure";
        scenario_create: "scenarioCreate";
        scenario_set_environment: "scenarioSetEnvironment";
        scenario_set_fallback_environment: "scenarioSetFallbackEnvironment";
        scenario_set_camera_attributes: "scenarioSetCameraAttributes";
        scenario_set_compositor: "scenarioSetCompositor";
        instance_create2: "instanceCreate2";
        instance_create: "instanceCreate";
        instance_set_base: "instanceSetBase";
        instance_set_scenario: "instanceSetScenario";
        instance_set_layer_mask: "instanceSetLayerMask";
        instance_set_pivot_data: "instanceSetPivotData";
        instance_set_transform: "instanceSetTransform";
        instance_attach_object_instance_id: "instanceAttachObjectInstanceId";
        instance_set_blend_shape_weight: "instanceSetBlendShapeWeight";
        instance_set_surface_override_material: "instanceSetSurfaceOverrideMaterial";
        instance_set_visible: "instanceSetVisible";
        instance_geometry_set_transparency: "instanceGeometrySetTransparency";
        instance_teleport: "instanceTeleport";
        instance_set_custom_aabb: "instanceSetCustomAabb";
        instance_attach_skeleton: "instanceAttachSkeleton";
        instance_set_extra_visibility_margin: "instanceSetExtraVisibilityMargin";
        instance_set_visibility_parent: "instanceSetVisibilityParent";
        instance_set_ignore_culling: "instanceSetIgnoreCulling";
        instance_geometry_set_flag: "instanceGeometrySetFlag";
        instance_geometry_set_cast_shadows_setting: "instanceGeometrySetCastShadowsSetting";
        instance_geometry_set_material_override: "instanceGeometrySetMaterialOverride";
        instance_geometry_set_material_overlay: "instanceGeometrySetMaterialOverlay";
        instance_geometry_set_visibility_range: "instanceGeometrySetVisibilityRange";
        instance_geometry_set_lightmap: "instanceGeometrySetLightmap";
        instance_geometry_set_lod_bias: "instanceGeometrySetLodBias";
        instance_geometry_set_shader_parameter: "instanceGeometrySetShaderParameter";
        instance_geometry_get_shader_parameter: "instanceGeometryGetShaderParameter";
        instance_geometry_get_shader_parameter_default_value: "instanceGeometryGetShaderParameterDefaultValue";
        instance_geometry_get_shader_parameter_list: "instanceGeometryGetShaderParameterList";
        instances_cull_aabb: "instancesCullAabb";
        instances_cull_ray: "instancesCullRay";
        instances_cull_convex: "instancesCullConvex";
        bake_render_uv2: "bakeRenderUV2";
        canvas_create: "canvasCreate";
        canvas_set_item_mirroring: "canvasSetItemMirroring";
        canvas_set_item_repeat: "canvasSetItemRepeat";
        canvas_set_modulate: "canvasSetModulate";
        canvas_set_disable_scale: "canvasSetDisableScale";
        canvas_texture_create: "canvasTextureCreate";
        canvas_texture_set_channel: "canvasTextureSetChannel";
        canvas_texture_set_shading_parameters: "canvasTextureSetShadingParameters";
        canvas_texture_set_texture_filter: "canvasTextureSetTextureFilter";
        canvas_texture_set_texture_repeat: "canvasTextureSetTextureRepeat";
        canvas_item_create: "canvasItemCreate";
        canvas_item_set_parent: "canvasItemSetParent";
        canvas_item_set_default_texture_filter: "canvasItemSetDefaultTextureFilter";
        canvas_item_set_default_texture_repeat: "canvasItemSetDefaultTextureRepeat";
        canvas_item_set_visible: "canvasItemSetVisible";
        canvas_item_set_light_mask: "canvasItemSetLightMask";
        canvas_item_set_visibility_layer: "canvasItemSetVisibilityLayer";
        canvas_item_set_transform: "canvasItemSetTransform";
        canvas_item_set_clip: "canvasItemSetClip";
        canvas_item_set_distance_field_mode: "canvasItemSetDistanceFieldMode";
        canvas_item_set_custom_rect: "canvasItemSetCustomRect";
        canvas_item_set_modulate: "canvasItemSetModulate";
        canvas_item_set_self_modulate: "canvasItemSetSelfModulate";
        canvas_item_set_draw_behind_parent: "canvasItemSetDrawBehindParent";
        canvas_item_set_interpolated: "canvasItemSetInterpolated";
        canvas_item_reset_physics_interpolation: "canvasItemResetPhysicsInterpolation";
        canvas_item_transform_physics_interpolation: "canvasItemTransformPhysicsInterpolation";
        canvas_item_add_line: "canvasItemAddLine";
        canvas_item_add_polyline: "canvasItemAddPolyline";
        canvas_item_add_multiline: "canvasItemAddMultiline";
        canvas_item_add_rect: "canvasItemAddRect";
        canvas_item_add_circle: "canvasItemAddCircle";
        canvas_item_add_ellipse: "canvasItemAddEllipse";
        canvas_item_add_texture_rect: "canvasItemAddTextureRect";
        canvas_item_add_msdf_texture_rect_region: "canvasItemAddMsdfTextureRectRegion";
        canvas_item_add_lcd_texture_rect_region: "canvasItemAddLcdTextureRectRegion";
        canvas_item_add_texture_rect_region: "canvasItemAddTextureRectRegion";
        canvas_item_add_nine_patch: "canvasItemAddNinePatch";
        canvas_item_add_primitive: "canvasItemAddPrimitive";
        canvas_item_add_polygon: "canvasItemAddPolygon";
        canvas_item_add_triangle_array: "canvasItemAddTriangleArray";
        canvas_item_add_mesh: "canvasItemAddMesh";
        canvas_item_add_multimesh: "canvasItemAddMultimesh";
        canvas_item_add_particles: "canvasItemAddParticles";
        canvas_item_add_set_transform: "canvasItemAddSetTransform";
        canvas_item_add_clip_ignore: "canvasItemAddClipIgnore";
        canvas_item_add_animation_slice: "canvasItemAddAnimationSlice";
        canvas_item_set_sort_children_by_y: "canvasItemSetSortChildrenByY";
        canvas_item_set_z_index: "canvasItemSetZIndex";
        canvas_item_set_z_as_relative_to_parent: "canvasItemSetZAsRelativeToParent";
        canvas_item_set_copy_to_backbuffer: "canvasItemSetCopyToBackbuffer";
        canvas_item_attach_skeleton: "canvasItemAttachSkeleton";
        canvas_item_clear: "canvasItemClear";
        canvas_item_set_draw_index: "canvasItemSetDrawIndex";
        canvas_item_set_material: "canvasItemSetMaterial";
        canvas_item_set_use_parent_material: "canvasItemSetUseParentMaterial";
        canvas_item_set_instance_shader_parameter: "canvasItemSetInstanceShaderParameter";
        canvas_item_get_instance_shader_parameter: "canvasItemGetInstanceShaderParameter";
        canvas_item_get_instance_shader_parameter_default_value: "canvasItemGetInstanceShaderParameterDefaultValue";
        canvas_item_get_instance_shader_parameter_list: "canvasItemGetInstanceShaderParameterList";
        canvas_item_set_visibility_notifier: "canvasItemSetVisibilityNotifier";
        canvas_item_set_canvas_group_mode: "canvasItemSetCanvasGroupMode";
        debug_canvas_item_get_rect: "debugCanvasItemGetRect";
        canvas_light_create: "canvasLightCreate";
        canvas_light_attach_to_canvas: "canvasLightAttachToCanvas";
        canvas_light_set_enabled: "canvasLightSetEnabled";
        canvas_light_set_texture_scale: "canvasLightSetTextureScale";
        canvas_light_set_transform: "canvasLightSetTransform";
        canvas_light_set_texture: "canvasLightSetTexture";
        canvas_light_set_texture_offset: "canvasLightSetTextureOffset";
        canvas_light_set_color: "canvasLightSetColor";
        canvas_light_set_height: "canvasLightSetHeight";
        canvas_light_set_energy: "canvasLightSetEnergy";
        canvas_light_set_z_range: "canvasLightSetZRange";
        canvas_light_set_layer_range: "canvasLightSetLayerRange";
        canvas_light_set_item_cull_mask: "canvasLightSetItemCullMask";
        canvas_light_set_item_shadow_cull_mask: "canvasLightSetItemShadowCullMask";
        canvas_light_set_mode: "canvasLightSetMode";
        canvas_light_set_shadow_enabled: "canvasLightSetShadowEnabled";
        canvas_light_set_shadow_filter: "canvasLightSetShadowFilter";
        canvas_light_set_shadow_color: "canvasLightSetShadowColor";
        canvas_light_set_shadow_smooth: "canvasLightSetShadowSmooth";
        canvas_light_set_blend_mode: "canvasLightSetBlendMode";
        canvas_light_set_interpolated: "canvasLightSetInterpolated";
        canvas_light_reset_physics_interpolation: "canvasLightResetPhysicsInterpolation";
        canvas_light_transform_physics_interpolation: "canvasLightTransformPhysicsInterpolation";
        canvas_light_occluder_create: "canvasLightOccluderCreate";
        canvas_light_occluder_attach_to_canvas: "canvasLightOccluderAttachToCanvas";
        canvas_light_occluder_set_enabled: "canvasLightOccluderSetEnabled";
        canvas_light_occluder_set_polygon: "canvasLightOccluderSetPolygon";
        canvas_light_occluder_set_as_sdf_collision: "canvasLightOccluderSetAsSdfCollision";
        canvas_light_occluder_set_transform: "canvasLightOccluderSetTransform";
        canvas_light_occluder_set_light_mask: "canvasLightOccluderSetLightMask";
        canvas_light_occluder_set_interpolated: "canvasLightOccluderSetInterpolated";
        canvas_light_occluder_reset_physics_interpolation: "canvasLightOccluderResetPhysicsInterpolation";
        canvas_light_occluder_transform_physics_interpolation: "canvasLightOccluderTransformPhysicsInterpolation";
        canvas_occluder_polygon_create: "canvasOccluderPolygonCreate";
        canvas_occluder_polygon_set_shape: "canvasOccluderPolygonSetShape";
        canvas_occluder_polygon_set_cull_mode: "canvasOccluderPolygonSetCullMode";
        canvas_set_shadow_texture_size: "canvasSetShadowTextureSize";
        global_shader_parameter_add: "globalShaderParameterAdd";
        global_shader_parameter_remove: "globalShaderParameterRemove";
        global_shader_parameter_get_list: "globalShaderParameterGetList";
        global_shader_parameter_set: "globalShaderParameterSet";
        global_shader_parameter_set_override: "globalShaderParameterSetOverride";
        global_shader_parameter_get: "globalShaderParameterGet";
        global_shader_parameter_get_type: "globalShaderParameterGetType";
        free_rid: "freeRid";
        request_frame_drawn_callback: "requestFrameDrawnCallback";
        has_changed: "hasChanged";
        get_rendering_info: "getRenderingInfo";
        get_video_adapter_name: "getVideoAdapterName";
        get_video_adapter_vendor: "getVideoAdapterVendor";
        get_video_adapter_type: "getVideoAdapterType";
        get_video_adapter_api_version: "getVideoAdapterApiVersion";
        get_current_rendering_driver_name: "getCurrentRenderingDriverName";
        get_current_rendering_method: "getCurrentRenderingMethod";
        make_sphere_mesh: "makeSphereMesh";
        get_test_cube: "getTestCube";
        get_test_texture: "getTestTexture";
        get_white_texture: "getWhiteTexture";
        set_boot_image_with_stretch: "setBootImageWithStretch";
        set_boot_image: "setBootImage";
        get_default_clear_color: "getDefaultClearColor";
        set_default_clear_color: "setDefaultClearColor";
        has_os_feature: "hasOsFeature";
        set_debug_generate_wireframes: "setDebugGenerateWireframes";
        get_frame_setup_time_cpu: "getFrameSetupTimeCpu";
        force_sync: "forceSync";
        force_draw: "forceDraw";
        get_rendering_device: "getRenderingDevice";
        create_local_rendering_device: "createLocalRenderingDevice";
        is_on_render_thread: "isOnRenderThread";
        call_on_render_thread: "callOnRenderThread";
        has_feature: "hasFeature";
        render_loop_enabled: "renderLoopEnabled";
        frame_pre_draw: "framePreDraw";
        frame_post_draw: "framePostDraw";
    }
    /** Server for anything visible.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderingserver.html  
     */
    class RenderingServer extends GObject {
        /** Marks an error that shows that the index array is empty. */
        static readonly NO_INDEX_ARRAY = -1
        
        /** Number of weights/bones per vertex. */
        static readonly ARRAY_WEIGHTS_SIZE = 4
        
        /** The minimum Z-layer for canvas items. */
        static readonly CANVAS_ITEM_Z_MIN = -4096
        
        /** The maximum Z-layer for canvas items. */
        static readonly CANVAS_ITEM_Z_MAX = 4096
        
        /** The minimum canvas layer. */
        static readonly CANVAS_LAYER_MIN = -2147483648
        
        /** The maximum canvas layer. */
        static readonly CANVAS_LAYER_MAX = 2147483647
        
        /** The maximum number of glow levels that can be used with the glow post-processing effect. */
        static readonly MAX_GLOW_LEVELS = 7
        static readonly MAX_CURSORS = 8
        
        /** The maximum number of directional lights that can be rendered at a given time in 2D. */
        static readonly MAX_2D_DIRECTIONAL_LIGHTS = 8
        
        /** The maximum number of surfaces a mesh can have. */
        static readonly MAX_MESH_SURFACES = 256
        
        /** The minimum renderpriority of all materials. */
        static readonly MATERIAL_RENDER_PRIORITY_MIN = -128
        
        /** The maximum renderpriority of all materials. */
        static readonly MATERIAL_RENDER_PRIORITY_MAX = 127
        
        /** The number of custom data arrays available ([constant ARRAY_CUSTOM0], [constant ARRAY_CUSTOM1], [constant ARRAY_CUSTOM2], [constant ARRAY_CUSTOM3]). */
        static readonly ARRAY_CUSTOM_COUNT = 4
        
        /** Particle starts at the specified position. */
        static readonly PARTICLES_EMIT_FLAG_POSITION = 1
        
        /** Particle starts with specified rotation and scale. */
        static readonly PARTICLES_EMIT_FLAG_ROTATION_SCALE = 2
        
        /** Particle starts with the specified velocity vector, which defines the emission direction and speed. */
        static readonly PARTICLES_EMIT_FLAG_VELOCITY = 4
        
        /** Particle starts with specified color. */
        static readonly PARTICLES_EMIT_FLAG_COLOR = 8
        
        /** Particle starts with specified `CUSTOM` data. */
        static readonly PARTICLES_EMIT_FLAG_CUSTOM = 16
        
        /** Creates a 2-dimensional texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_2d_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [Texture2D].  
         *      
         *  **Note:** Not to be confused with [method RenderingDevice.texture_create], which creates the graphics API's own texture type as opposed to the Godot-specific [Texture2D] resource.  
         */
        static texture2DCreate(image: Image): Rid
        
        /** Creates a 2-dimensional layered texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_2d_layered_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [TextureLayered].  
         */
        static texture2DLayeredCreate(layers: GArray<Image>, layeredType: RenderingServer.TextureLayeredType): Rid
        
        /**     
         *  **Note:** The equivalent resource is [Texture3D].  
         */
        static texture3DCreate(format: Image.Format, width: int64, height: int64, depth: int64, mipmaps: boolean, data: GArray<Image>): Rid
        
        /** This method does nothing and always returns an invalid [RID]. */
        static textureProxyCreate(base: Rid): Rid
        
        /** Creates a texture based on a native handle that was created outside of Godot's renderer.  
         *      
         *  **Note:** If using only the rendering device renderer, it's recommend to use [method RenderingDevice.texture_create_from_extension] together with [method RenderingServer.texture_rd_create], rather than this method. This way, the texture's format and usage can be controlled more effectively.  
         */
        static textureCreateFromNativeHandle(type: RenderingServer.TextureType, format: Image.Format, nativeHandle: int64, width: int64, height: int64, depth: int64, layers?: int64 /* = 1 */, layeredType?: RenderingServer.TextureLayeredType /* = 0 */): Rid
        
        /** Creates a 2-dimensional texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_drawable*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [DrawableTexture2D].  
         */
        static textureDrawableCreate(width: int64, height: int64, format: RenderingServer.TextureDrawableFormat, color?: Color /* = new Color(1, 1, 1, 1) */, withMipmaps?: boolean /* = false */): Rid
        
        /** Updates the texture specified by the [param texture] [RID] with the data in [param image]. A [param layer] must also be specified, which should be `0` when updating a single-layer texture ([Texture2D]).  
         *      
         *  **Note:** The [param image] must have the same width, height and format as the current [param texture] data. Otherwise, an error will be printed and the original texture won't be modified. If you need to use different width, height or format, use [method texture_replace] instead.  
         */
        static texture2DUpdate(texture: Rid, image: Image, layer: int64): void
        
        /** Updates the texture specified by the [param texture] [RID]'s data with the data in [param data]. All the texture's layers must be replaced at once.  
         *      
         *  **Note:** The [param texture] must have the same width, height, depth and format as the current texture data. Otherwise, an error will be printed and the original texture won't be modified. If you need to use different width, height, depth or format, use [method texture_replace] instead.  
         */
        static texture3DUpdate(texture: Rid, data: GArray<Image>): void
        
        /** This method does nothing. */
        static textureProxyUpdate(texture: Rid, proxyTo: Rid): void
        
        /** Draws to [param rect] on up to 4 given Drawable [param textures], using a TextureBlit Shader from [param material]. [param modulate] and up to 4 [param source_textures] are uniforms for the Shader to process with. [param to_mipmap] can specify to perform this draw to a lower mipmap level.  
         *      
         *  **Note:** All [param textures] must be the same size and format.  
         */
        static textureDrawableBlitRect(textures: GArray<Rid>, rect: Rect2I, material: Rid, modulate: Color, sourceTextures: GArray<Rid>, toMipmap?: int64 /* = 0 */): void
        
        /** Creates a placeholder for a 2-dimensional layered texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_2d_layered_*` RenderingServer functions, although it does nothing when used. See also [method texture_2d_layered_placeholder_create].  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [PlaceholderTexture2D].  
         */
        static texture2DPlaceholderCreate(): Rid
        
        /** Creates a placeholder for a 2-dimensional layered texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_2d_layered_*` RenderingServer functions, although it does nothing when used. See also [method texture_2d_placeholder_create].  
         *      
         *  **Note:** The equivalent resource is [PlaceholderTextureLayered].  
         */
        static texture2DLayeredPlaceholderCreate(layeredType: RenderingServer.TextureLayeredType): Rid
        
        /** Creates a placeholder for a 3-dimensional texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `texture_3d_*` RenderingServer functions, although it does nothing when used.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [PlaceholderTexture3D].  
         */
        static texture3DPlaceholderCreate(): Rid
        
        /** Returns an [Image] instance from the given [param texture] [RID].  
         *  **Example:** Get the test texture from [method get_test_texture] and apply it to a [Sprite2D] node:  
         *    
         */
        static texture2DGet(texture: Rid): null | Image
        
        /** Returns an [Image] instance from the given [param texture] [RID] and [param layer]. */
        static texture2DLayerGet(texture: Rid, layer: int64): null | Image
        
        /** Returns 3D texture data as an array of [Image]s for the specified texture [RID]. */
        static texture3DGet(texture: Rid): GArray<Image>
        
        /** Calculates new MipMaps for the given Drawable [param texture]. */
        static textureDrawableGenerateMipmaps(texture: Rid): void
        
        /** Returns a ShaderMaterial with the default texture_blit Shader. */
        static textureDrawableGetDefaultMaterial(): Rid
        
        /** Replaces [param texture]'s texture data by the texture specified by the [param by_texture] RID, without changing [param texture]'s RID. */
        static textureReplace(texture: Rid, byTexture: Rid): void
        
        /** Replaces [param texture]'s texture data by the texture specified by the [param by_texture] RID, without changing [param texture]'s RID.  
         *  Unlike [method texture_replace], this method automatically patches any uniform sets that reference [param texture] so they point to the new underlying resource. This makes it suitable for replacing textures that are already bound in materials or shaders without invalidating existing draw state. The new texture may have different dimensions (e.g. for texture streaming mip level changes).  
         *  Textures that are not compatible will likely cause rendering errors, so it's recommended to only use this method on textures that are compatible with each other (e.g. same format and usage flags).  
         */
        static textureReplaceCompatible(texture: Rid, byTexture: Rid): void
        
        /** Sets the size at which the texture should be  *displayed*  in 2D, ignoring its original size. This does not rescale the texture data itself, only how it is drawn in 2D. Set [param width] and [param height] to 0 to disable the size override. */
        static textureSetSizeOverride(texture: Rid, width: int64, height: int64): void
        
        /** Sets the resource path for this texture RID. See also [method texture_get_path].  
         *      
         *  **Note:** This is purely a hint and does not cause the texture to be automatically saved when set to a `res://` path.  
         */
        static textureSetPath(texture: Rid, path: string): void
        
        /** Returns the resource path (starting with `res://` or `uid://`) for the specified texture RID. Returns an empty [String] if the resource is built-in. See also [method texture_set_path]. */
        static textureGetPath(texture: Rid): string
        
        /** Returns the format for the texture. */
        static textureGetFormat(texture: Rid): Image.Format
        
        /** Sets whether the texture RID should force redrawing when it's visible on screen when [member OS.low_processor_usage_mode] is `true`. This is used by [AnimatedTexture] to force redrawing. */
        static textureSetForceRedrawIfVisible(texture: Rid, enable: boolean): void
        
        /** Creates a new texture object based on a texture created directly on the [RenderingDevice]. If the texture contains layers, [param layer_type] is used to define the layer type.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The RenderingServer's [method free_rid] won't free the underlying [param rd_texture], you will want to free the [param rd_texture] using [method RenderingDevice.free_rid].  
         */
        static textureRdCreate(rdTexture: Rid, layerType?: RenderingServer.TextureLayeredType /* = 0 */): Rid
        
        /** Returns a texture [RID] that can be used with [RenderingDevice].  
         *  [param srgb] should be `true` when the texture uses nonlinear sRGB encoding and `false` when the texture uses linear encoding.  
         */
        static textureGetRdTexture(texture: Rid, srgb?: boolean /* = false */): Rid
        
        /** Returns the internal graphics handle for this texture object. For use when communicating with third-party APIs mostly with GDExtension.  
         *  [param srgb] should be `true` when the texture uses nonlinear sRGB encoding and `false` when the texture uses linear encoding.  
         *      
         *  **Note:** This function returns a `uint64_t` which internally maps to a `GLuint` (OpenGL) or `VkImage` (Vulkan).  
         */
        static textureGetNativeHandle(texture: Rid, srgb?: boolean /* = false */): int64
        
        /** Creates an empty shader and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `shader_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [Shader].  
         */
        static shaderCreate(): Rid
        
        /** Sets the shader's source code (which triggers recompilation after being changed). */
        static shaderSetCode(shader: Rid, code: string): void
        
        /** Sets the path hint for the specified shader. This should generally match the [Shader] resource's [member Resource.resource_path]. */
        static shaderSetPathHint(shader: Rid, path: string): void
        
        /** Returns a shader's source code as a string. */
        static shaderGetCode(shader: Rid): string
        
        /** Returns the parameters of a shader. */
        static getShaderParameterList(shader: Rid): GArray<GDictionary>
        
        /** Returns the default value for the specified shader uniform. This is usually the value written in the shader source code. */
        static shaderGetParameterDefault(shader: Rid, name: StringName): any
        
        /** Sets a shader's default texture. Overwrites the texture given by name.  
         *      
         *  **Note:** If the sampler array is used use [param index] to access the specified texture.  
         */
        static shaderSetDefaultTextureParameter(shader: Rid, name: StringName, texture: Rid, index?: int64 /* = 0 */): void
        
        /** Returns a default texture from a shader searched by name.  
         *      
         *  **Note:** If the sampler array is used use [param index] to access the specified texture.  
         */
        static shaderGetDefaultTextureParameter(shader: Rid, name: StringName, index?: int64 /* = 0 */): Rid
        
        /** Creates an empty material and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `material_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [Material].  
         */
        static materialCreate(): Rid
        
        /** Sets a shader material's shader. */
        static materialSetShader(shaderMaterial: Rid, shader: Rid): void
        
        /** Sets a material's parameter. */
        static materialSetParam(material: Rid, parameter: StringName, value: any): void
        
        /** Returns the value of a certain material's parameter. */
        static materialGetParam(material: Rid, parameter: StringName): any
        
        /** Sets a material's render priority. */
        static materialSetRenderPriority(material: Rid, priority: int64): void
        
        /** Sets an object's next material. */
        static materialSetNextPass(material: Rid, nextMaterial: Rid): void
        
        /** When using the Mobile renderer, [method material_set_use_debanding] can be used to enable or disable the debanding feature of 3D materials ([BaseMaterial3D] and [ShaderMaterial]).  
         *  [method material_set_use_debanding] has no effect when using the Compatibility or Forward+ renderer. In Forward+, [Viewport] debanding can be used instead.  
         *  See also [member ProjectSettings.rendering/anti_aliasing/quality/use_debanding] and [method RenderingServer.viewport_set_use_debanding].  
         */
        static materialSetUseDebanding(enable: boolean): void
        
        /** Creates a new mesh with predefined surfaces for it and adds the mesh to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `mesh_*` RenderingServer functions. This method is more efficient for creating meshes with multiple surfaces compared to creating an empty mesh with [method mesh_create] and adding surfaces one by one with [method mesh_add_surface].  
         *  Each element in the [param surfaces] array must follow the same structure as described in [method mesh_add_surface]. The [param blend_shape_count] parameter must match the blend shape data defined in all surfaces.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this mesh to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent resource is [Mesh].  
         */
        static meshCreateFromSurfaces(surfaces: GArray<GDictionary>, blendShapeCount?: int64 /* = 0 */): Rid
        
        /** Creates a new mesh and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `mesh_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this mesh to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent resource is [Mesh].  
         */
        static meshCreate(): Rid
        
        /** Returns the offset of a given attribute by [param array_index] in the start of its respective buffer. */
        static meshSurfaceGetFormatOffset(format: RenderingServer.ArrayFormat, vertexCount: int64, arrayIndex: int64): int64
        
        /** Returns the stride of the vertex positions for a mesh with given [param format]. Note importantly that vertex positions are stored consecutively and are not interleaved with the other attributes in the vertex buffer (normals and tangents). */
        static meshSurfaceGetFormatVertexStride(format: RenderingServer.ArrayFormat, vertexCount: int64): int64
        
        /** Returns the stride of the combined normals and tangents for a mesh with given [param format]. Note importantly that, while normals and tangents are in the vertex buffer with vertices, they are only interleaved with each other and so have a different stride than vertex positions. */
        static meshSurfaceGetFormatNormalTangentStride(format: RenderingServer.ArrayFormat, vertexCount: int64): int64
        
        /** Returns the stride of the attribute buffer for a mesh with given [param format]. */
        static meshSurfaceGetFormatAttributeStride(format: RenderingServer.ArrayFormat, vertexCount: int64): int64
        
        /** Returns the stride of the skin buffer for a mesh with given [param format]. */
        static meshSurfaceGetFormatSkinStride(format: RenderingServer.ArrayFormat, vertexCount: int64): int64
        
        /** Returns the stride of the index buffer for a mesh with the given [param format]. */
        static meshSurfaceGetFormatIndexStride(format: RenderingServer.ArrayFormat, vertexCount: int64): int64
        
        /** Creates a new surface on the given [param mesh]. Equivalent to [method mesh_add_surface_from_arrays], but takes a single [Dictionary] argument instead of separate arguments. The dictionary must follow this structure:  
         *    
         *  See also [method mesh_get_surface], which returns data in the same structure defined above.  
         */
        static meshAddSurface(mesh: Rid, surface: GDictionary): void
        
        /** Creates a new surface on the given [param mesh]. [method mesh_get_surface_count] will become the surface index for this new surface.  
         *  Surfaces are created to be rendered using a [param primitive], which may be any of the values defined in [enum Mesh.PrimitiveType].  
         *  The [param arrays] argument is an array of arrays. Each of the [constant Mesh.ARRAY_MAX] elements contains an array with some of the mesh data for this surface as described by the corresponding member of [enum Mesh.ArrayType] or `null` if it is not used by the surface. For example, `arrays[0]` is the array of vertices. That first vertex sub-array is always required; the others are optional. Adding an index array puts this surface into "index mode" where the vertex and other arrays become the sources of data and the index array defines the vertex order. All sub-arrays must have the same length as the vertex array (or be an exact multiple of the vertex array's length, when multiple elements of a sub-array correspond to a single vertex) or be empty, except for [constant Mesh.ARRAY_INDEX] if it is used.  
         *  The [param blend_shapes] argument is an array of vertex data for each blend shape. Each element is an array of the same structure as [param arrays], but [constant Mesh.ARRAY_VERTEX], [constant Mesh.ARRAY_NORMAL], and [constant Mesh.ARRAY_TANGENT] are set if and only if they are set in [param arrays] and all other entries are `null`.  
         *  The [param lods] argument is a dictionary with [float] keys and [PackedInt32Array] values. Each entry in the dictionary represents an LOD level of the surface, where the value is the [constant Mesh.ARRAY_INDEX] array to use for the LOD level and the key is roughly proportional to the distance at which the LOD stats being used. I.e., increasing the key of an LOD also increases the distance that the objects has to be from the camera before the LOD is used.  
         *  The [param compress_format] argument is the bitwise OR of, as required: One value of [enum ArrayFormat] left shifted by `ARRAY_FORMAT_CUSTOMn_SHIFT` for each custom channel in use, [constant ARRAY_FLAG_USE_DYNAMIC_UPDATE], [constant ARRAY_FLAG_USE_8_BONE_WEIGHTS], or [constant ARRAY_FLAG_USES_EMPTY_VERTEX_ARRAY].  
         *  See [method ArrayMesh.add_surface_from_arrays] and [method ImporterMesh.add_surface] for higher-level equivalents of this method.  
         *      
         *  **Note:** When using indices, it is recommended to only use points, lines, or triangles.  
         */
        static meshAddSurfaceFromArrays(mesh: Rid, primitive: RenderingServer.PrimitiveType, arrays: GArray, blendShapes?: GArray, lods?: GDictionary /* = new GDictionary() */, compressFormat?: RenderingServer.ArrayFormat /* = 0 */): void
        
        /** Returns a mesh's blend shape count. */
        static meshGetBlendShapeCount(mesh: Rid): int64
        
        /** Sets a mesh's blend shape mode. */
        static meshSetBlendShapeMode(mesh: Rid, mode: RenderingServer.BlendShapeMode): void
        
        /** Returns a mesh's blend shape mode. */
        static meshGetBlendShapeMode(mesh: Rid): RenderingServer.BlendShapeMode
        
        /** Sets a mesh's surface's material. */
        static meshSurfaceSetMaterial(mesh: Rid, surface: int64, material: Rid): void
        
        /** Returns a mesh's surface's material. */
        static meshSurfaceGetMaterial(mesh: Rid, surface: int64): Rid
        
        /** Returns a mesh's surface as a dictionary following the same structure as described in [method mesh_add_surface]. */
        static meshGetSurface(mesh: Rid, surface: int64): GDictionary
        
        /** Returns a mesh's surface's buffer arrays. */
        static meshSurfaceGetArrays(mesh: Rid, surface: int64): GArray
        
        /** Returns a mesh's surface's arrays for blend shapes. */
        static meshSurfaceGetBlendShapeArrays(mesh: Rid, surface: int64): GArray<GArray>
        
        /** Returns a mesh's number of surfaces. */
        static meshGetSurfaceCount(mesh: Rid): int64
        
        /** Sets a mesh's custom aabb. */
        static meshSetCustomAabb(mesh: Rid, aabb: Aabb): void
        
        /** Returns a mesh's custom aabb. */
        static meshGetCustomAabb(mesh: Rid): Aabb
        
        /** Removes the surface at the given index from the Mesh, shifting surfaces with higher index down by one. */
        static meshSurfaceRemove(mesh: Rid, surface: int64): void
        
        /** Removes all surfaces from a mesh. */
        static meshClear(mesh: Rid): void
        
        /** Updates the vertex buffer of the mesh surface with the given [param data]. The expected data per vertex is 8 or 12 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector2] or [Vector3] vertices. This value can be determined with [method mesh_surface_get_format_vertex_stride] instead.  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each vertex.  
         *  A [PackedVector3Array] of vertex locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        static meshSurfaceUpdateVertexRegion(mesh: Rid, surface: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Updates the attribute buffer of the mesh surface with the given [param data]. The expected data per attribute is 8 or 12 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector2] or [Vector3] vertices. This value can be determined with [method mesh_surface_get_format_attribute_stride] instead.  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each attribute.  
         *  A [PackedVector3Array] of attribute locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        static meshSurfaceUpdateAttributeRegion(mesh: Rid, surface: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Updates the skin buffer of the mesh surface with the given [param data]. The expected data per skin is 8 or 12 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector2] or [Vector3] vertices. This value can be determined with [method mesh_surface_get_format_skin_stride] instead.  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each skin.  
         *  A [PackedVector3Array] of skin locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        static meshSurfaceUpdateSkinRegion(mesh: Rid, surface: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Updates the index buffer of the mesh surface with the given [param data]. The expected data are 16 or 32-bit unsigned integers, which can be determined with [method mesh_surface_get_format_index_stride]. */
        static meshSurfaceUpdateIndexRegion(mesh: Rid, surface: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Returns the [RenderingDevice] [RID] handle of the vertex buffer of the given mesh surface (Vertex, Normal, Tangent). The returned [RID] can be used like any other buffer on the [RenderingDevice], so the surface vertices can be read or written from a compute shader without a CPU round-trip. This is the [Mesh] equivalent of [method multimesh_get_buffer_rd_rid] and is intended for GPU-driven mesh workflows (procedural meshes, ribbon trails, cloth, hair, grass) implemented from a [GDExtension].  
         *  To bind the buffer as a storage buffer in compute, the surface must have been created with the [constant ARRAY_FLAG_USE_STORAGE_BUFFER] flag set in its format.  
         *  Returns an invalid [RID] if the surface has no vertex buffer or if the rendering backend does not expose [RenderingDevice] [RID]s (such as the OpenGL backend).  
         */
        static meshSurfaceGetVertexBufferRdRid(mesh: Rid, surface: int64): Rid
        
        /** Returns the [RenderingDevice] [RID] handle of the attribute buffer of the given mesh surface (Color, UV, UV2, Custom0-3). The returned [RID] can be used like any other buffer on the [RenderingDevice], so the surface attributes can be read or written from a compute shader without a CPU round-trip.  
         *  To bind the buffer as a storage buffer in compute, the surface must have been created with the [constant ARRAY_FLAG_USE_STORAGE_BUFFER] flag set in its format.  
         *  Returns an invalid [RID] if the surface has no attribute buffer or if the rendering backend does not expose [RenderingDevice] [RID]s (such as the OpenGL backend).  
         */
        static meshSurfaceGetAttributeBufferRdRid(mesh: Rid, surface: int64): Rid
        
        /** Returns the [RenderingDevice] [RID] handle of the skin buffer of the given mesh surface (Bones, Weights). The returned [RID] can be used like any other buffer on the [RenderingDevice], so the skin data can be read or written from a compute shader without a CPU round-trip.  
         *  This buffer is created with the storage-buffer usage bit whenever the surface has skinning data, so it can be bound as a storage buffer in compute even without [constant ARRAY_FLAG_USE_STORAGE_BUFFER].  
         *  Returns an invalid [RID] if the surface has no skin buffer or if the rendering backend does not expose [RenderingDevice] [RID]s (such as the OpenGL backend).  
         */
        static meshSurfaceGetSkinBufferRdRid(mesh: Rid, surface: int64): Rid
        
        /** Returns the [RenderingDevice] [RID] handle of the index buffer of the given mesh surface. The returned [RID] can be used like any other buffer on the [RenderingDevice], so the indices can be read or written from a compute shader without a CPU round-trip.  
         *  To bind the buffer as a storage buffer in compute, the surface must have been created with the [constant ARRAY_FLAG_USE_STORAGE_BUFFER] flag set in its format.  
         *  Returns an invalid [RID] if the surface is not indexed or if the rendering backend does not expose [RenderingDevice] [RID]s (such as the OpenGL backend).  
         */
        static meshSurfaceGetIndexBufferRdRid(mesh: Rid, surface: int64): Rid
        
        /** Sets an optional second mesh which can be used for rendering shadows and the depth prepass. Can be used to increase performance by supplying a mesh with fused vertices and only vertex position data (without normals, UVs, colors, etc.).  
         *      
         *  **Note:** This mesh must have exactly the same vertex positions as the source mesh (including the source mesh's LODs, if present). If vertex positions differ, then the mesh will not draw correctly.  
         */
        static meshSetShadowMesh(mesh: Rid, shadowMesh: Rid): void
        
        /** Creates a new multimesh on the RenderingServer and returns an [RID] handle. This RID will be used in all `multimesh_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this multimesh to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent resource is [MultiMesh].  
         */
        static multimeshCreate(): Rid
        
        /** Sets up the multimesh using the specified data. The number of instances is set by [param instances]. The format of the instance transforms is set by [param transform_format], which should be set according to whether the multimesh is meant to be rendered in 2D or 3D. If [param color_format] is `true`, each instance will have a color associated with it. If [param custom_data_format] is `true`, each instance will have a custom data vector associated with it. If [param use_indirect] is `true`, an indirect command buffer will be created for this multimesh, allowing the instance count to be modified directly on the GPU. See also [method multimesh_get_command_buffer_rd_rid]. */
        static multimeshAllocateData(multimesh: Rid, instances: int64, transformFormat: RenderingServer.MultimeshTransformFormat, colorFormat?: boolean /* = false */, customDataFormat?: boolean /* = false */, useIndirect?: boolean /* = false */): void
        
        /** Returns the number of instances allocated for this multimesh. */
        static multimeshGetInstanceCount(multimesh: Rid): int64
        
        /** Sets the mesh to be drawn by the multimesh. Equivalent to [member MultiMesh.mesh]. */
        static multimeshSetMesh(multimesh: Rid, mesh: Rid): void
        
        /** Sets the [Transform3D] for this instance. Equivalent to [method MultiMesh.set_instance_transform]. */
        static multimeshInstanceSetTransform(multimesh: Rid, index: int64, transform: Transform3D): void
        
        /** Sets the [Transform2D] for this instance. For use when multimesh is used in 2D. Equivalent to [method MultiMesh.set_instance_transform_2d]. */
        static multimeshInstanceSetTransform2D(multimesh: Rid, index: int64, transform: Transform2D): void
        
        /** Sets the color by which this instance will be modulated. Equivalent to [method MultiMesh.set_instance_color]. */
        static multimeshInstanceSetColor(multimesh: Rid, index: int64, color: Color): void
        
        /** Sets the custom data for this instance. Custom data is passed as a [Color], but is interpreted as a `vec4` in the shader. Equivalent to [method MultiMesh.set_instance_custom_data]. */
        static multimeshInstanceSetCustomData(multimesh: Rid, index: int64, customData: Color): void
        
        /** Returns the RID of the mesh that will be used in drawing this multimesh. */
        static multimeshGetMesh(multimesh: Rid): Rid
        
        /** Calculates and returns the axis-aligned bounding box that encloses all instances within the multimesh. */
        static multimeshGetAabb(multimesh: Rid): Aabb
        
        /** Sets the custom AABB for this MultiMesh resource. */
        static multimeshSetCustomAabb(multimesh: Rid, aabb: Aabb): void
        
        /** Returns the custom AABB defined for this MultiMesh resource. */
        static multimeshGetCustomAabb(multimesh: Rid): Aabb
        
        /** Returns the [Transform3D] of the specified instance. */
        static multimeshInstanceGetTransform(multimesh: Rid, index: int64): Transform3D
        
        /** Returns the [Transform2D] of the specified instance. For use when the multimesh is set to use 2D transforms. */
        static multimeshInstanceGetTransform2D(multimesh: Rid, index: int64): Transform2D
        
        /** Returns the color by which the specified instance will be modulated. */
        static multimeshInstanceGetColor(multimesh: Rid, index: int64): Color
        
        /** Returns the custom data associated with the specified instance. */
        static multimeshInstanceGetCustomData(multimesh: Rid, index: int64): Color
        
        /** Sets the number of instances visible at a given time. If -1, all instances that have been allocated are drawn. Equivalent to [member MultiMesh.visible_instance_count]. */
        static multimeshSetVisibleInstances(multimesh: Rid, visible: int64): void
        
        /** Returns the number of visible instances for this multimesh. */
        static multimeshGetVisibleInstances(multimesh: Rid): int64
        
        /** Set the entire data to use for drawing the [param multimesh] at once to [param buffer] (such as instance transforms and colors). [param buffer]'s size must match the number of instances multiplied by the per-instance data size (which depends on the enabled MultiMesh fields). Otherwise, an error message is printed and nothing is rendered. See also [method multimesh_get_buffer].  
         *  The per-instance data size and expected data order is:  
         *  [codeblock lang=text]  
         *  2D:  
         *    - Position: 8 floats (8 floats for Transform2D)  
         *    - Position + Vertex color: 12 floats (8 floats for Transform2D, 4 floats for Color)  
         *    - Position + Custom data: 12 floats (8 floats for Transform2D, 4 floats of custom data)  
         *    - Position + Vertex color + Custom data: 16 floats (8 floats for Transform2D, 4 floats for Color, 4 floats of custom data)  
         *  3D:  
         *    - Position: 12 floats (12 floats for Transform3D)  
         *    - Position + Vertex color: 16 floats (12 floats for Transform3D, 4 floats for Color)  
         *    - Position + Custom data: 16 floats (12 floats for Transform3D, 4 floats of custom data)  
         *    - Position + Vertex color + Custom data: 20 floats (12 floats for Transform3D, 4 floats for Color, 4 floats of custom data)  
         *  [/codeblock]  
         *  Instance transforms are in row-major order. Specifically:  
         *  - For [Transform2D] the float-order is: `(x.x, y.x, padding_float, origin.x, x.y, y.y, padding_float, origin.y)`.  
         *  - For [Transform3D] the float-order is: `(basis.x.x, basis.y.x, basis.z.x, origin.x, basis.x.y, basis.y.y, basis.z.y, origin.y, basis.x.z, basis.y.z, basis.z.z, origin.z)`.  
         */
        static multimeshSetBuffer(multimesh: Rid, buffer: PackedFloat32Array | float32[]): void
        
        /** Returns the [RenderingDevice] [RID] handle of the [MultiMesh] command buffer. This [RID] is only valid if `use_indirect` is set to `true` when allocating data through [method multimesh_allocate_data]. It can be used to directly modify the instance count via buffer.  
         *  The data structure is dependent on both how many surfaces the mesh contains and whether it is indexed or not, the buffer has 5 integers in it, with the last unused if the mesh is not indexed.  
         *  Each of the values in the buffer correspond to these options:  
         *  [codeblock lang=text]  
         *  Indexed:  
         *    0 - indexCount;  
         *    1 - instanceCount;  
         *    2 - firstIndex;  
         *    3 - vertexOffset;  
         *    4 - firstInstance;  
         *  Non-indexed:  
         *    0 - vertexCount;  
         *    1 - instanceCount;  
         *    2 - firstVertex;  
         *    3 - firstInstance;  
         *    4 - unused;  
         *  [/codeblock]  
         */
        static multimeshGetCommandBufferRdRid(multimesh: Rid): Rid
        
        /** Returns the [RenderingDevice] [RID] handle of the [MultiMesh], which can be used as any other buffer on the Rendering Device. */
        static multimeshGetBufferRdRid(multimesh: Rid): Rid
        
        /** Returns the MultiMesh data (such as instance transforms, colors, etc.). See [method multimesh_set_buffer] for details on the returned data.  
         *      
         *  **Note:** If the buffer is in the engine's internal cache, it will have to be fetched from GPU memory and possibly decompressed. This means [method multimesh_get_buffer] is potentially a slow operation and should be avoided whenever possible.  
         */
        static multimeshGetBuffer(multimesh: Rid): PackedFloat32Array
        
        /** Alternative version of [method multimesh_set_buffer] for use with physics interpolation.  
         *  Takes both an array of current data and an array of data for the previous physics tick.  
         */
        static multimeshSetBufferInterpolated(multimesh: Rid, buffer: PackedFloat32Array | float32[], bufferPrevious: PackedFloat32Array | float32[]): void
        
        /** Turns on and off physics interpolation for this MultiMesh resource. */
        static multimeshSetPhysicsInterpolated(multimesh: Rid, interpolated: boolean): void
        
        /** Sets the physics interpolation quality for the [MultiMesh].  
         *  A value of [constant MULTIMESH_INTERP_QUALITY_FAST] gives fast but low quality interpolation, a value of [constant MULTIMESH_INTERP_QUALITY_HIGH] gives slower but higher quality interpolation.  
         */
        static multimeshSetPhysicsInterpolationQuality(multimesh: Rid, quality: RenderingServer.MultimeshPhysicsInterpolationQuality): void
        
        /** Prevents physics interpolation for the specified instance during the current physics tick.  
         *  This is useful when moving an instance to a new location, to give an instantaneous change rather than interpolation from the previous location.  
         */
        static multimeshInstanceResetPhysicsInterpolation(multimesh: Rid, index: int64): void
        
        /** Prevents physics interpolation for all instances during the current physics tick.  
         *  This is useful when moving all instances to new locations, to give instantaneous changes rather than interpolation from the previous locations.  
         */
        static multimeshInstancesResetPhysicsInterpolation(multimesh: Rid): void
        
        /** Creates a skeleton and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `skeleton_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         */
        static skeletonCreate(): Rid
        
        /** Allocates data for this skeleton using the number of bones specified in [param bones]. If [param is_2d_skeleton] is `true`, the skeleton will be treated as a 2D skeleton instead of a 3D skeleton. See also [method skeleton_get_bone_count]. */
        static skeletonAllocateData(skeleton: Rid, bones: int64, is2DSkeleton?: boolean /* = false */): void
        
        /** Returns the number of bones allocated for this skeleton. See also [method skeleton_allocate_data]. */
        static skeletonGetBoneCount(skeleton: Rid): int64
        
        /** Sets the [Transform3D] for a specific bone of this skeleton. */
        static skeletonBoneSetTransform(skeleton: Rid, bone: int64, transform: Transform3D): void
        
        /** Returns the [Transform3D] set for a specific bone of this skeleton. */
        static skeletonBoneGetTransform(skeleton: Rid, bone: int64): Transform3D
        
        /** Sets the [Transform2D] for a specific bone of this skeleton. */
        static skeletonBoneSetTransform2D(skeleton: Rid, bone: int64, transform: Transform2D): void
        
        /** Returns the [Transform2D] set for a specific bone of this skeleton. */
        static skeletonBoneGetTransform2D(skeleton: Rid, bone: int64): Transform2D
        
        /** Sets the base [Transform2D] to use for the specified skeleton. */
        static skeletonSetBaseTransform2D(skeleton: Rid, baseTransform: Transform2D): void
        
        /** Creates a directional light and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID can be used in most `light_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this directional light to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [DirectionalLight3D].  
         */
        static directionalLightCreate(): Rid
        
        /** Creates a new omni light and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID can be used in most `light_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this omni light to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [OmniLight3D].  
         */
        static omniLightCreate(): Rid
        
        /** Creates a spot light and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID can be used in most `light_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this spot light to an instance using [method instance_set_base] using the returned RID.  
         */
        static spotLightCreate(): Rid
        
        /** Creates a new area light and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID can be used in most `light_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this area light to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [AreaLight3D].  
         */
        static areaLightCreate(): Rid
        
        /** Sets the color of the light. Equivalent to [member Light3D.light_color]. */
        static lightSetColor(light: Rid, color: Color): void
        
        /** Sets the specified 3D light parameter. Equivalent to [method Light3D.set_param]. */
        static lightSetParam(light: Rid, param: RenderingServer.LightParam, value: float64): void
        
        /** If `true`, light will cast shadows. Equivalent to [member Light3D.shadow_enabled]. */
        static lightSetShadow(light: Rid, enabled: boolean): void
        
        /** Sets the projector texture to use for the specified 3D light. Equivalent to [member Light3D.light_projector]. */
        static lightSetProjector(light: Rid, texture: Rid): void
        
        /** If `true`, the 3D light will subtract light instead of adding light. Equivalent to [member Light3D.light_negative]. */
        static lightSetNegative(light: Rid, enable: boolean): void
        
        /** Sets the cull mask for this 3D light. Lights only affect objects in the selected layers. Equivalent to [member Light3D.light_cull_mask]. */
        static lightSetCullMask(light: Rid, mask: int64): void
        
        /** Sets the distance fade for this 3D light. This acts as a form of level of detail (LOD) and can be used to improve performance. Equivalent to [member Light3D.distance_fade_enabled], [member Light3D.distance_fade_begin], [member Light3D.distance_fade_shadow], and [member Light3D.distance_fade_length]. */
        static lightSetDistanceFade(decal: Rid, enabled: boolean, begin: float64, shadow: float64, length: float64): void
        
        /** If `true`, reverses the backface culling of the mesh. This can be useful when you have a flat mesh that has a light behind it. If you need to cast a shadow on both sides of the mesh, set the mesh to use double-sided shadows with [method instance_geometry_set_cast_shadows_setting]. Equivalent to [member Light3D.shadow_reverse_cull_face]. */
        static lightSetReverseCullFaceMode(light: Rid, enabled: boolean): void
        
        /** Sets the shadow caster mask for this 3D light. Shadows will only be cast using objects in the selected layers. Equivalent to [member Light3D.shadow_caster_mask]. */
        static lightSetShadowCasterMask(light: Rid, mask: int64): void
        
        /** Sets the bake mode to use for the specified 3D light. Equivalent to [member Light3D.light_bake_mode]. */
        static lightSetBakeMode(light: Rid, bakeMode: RenderingServer.LightBakeMode): void
        
        /** Sets the maximum SDFGI cascade in which the 3D light's indirect lighting is rendered. Higher values allow the light to be rendered in SDFGI further away from the camera. */
        static lightSetMaxSdfgiCascade(light: Rid, cascade: int64): void
        
        /** If `true`, allows screen-space contact shadows for this light. Only used when [member ProjectSettings.rendering/lights_and_shadows/contact_shadow/enabled] is enabled. Equivalent to [member Light3D.shadow_contact_shadows_allow]. */
        static lightSetAllowContactShadows(light: Rid, enable: boolean): void
        
        /** Sets whether to use a dual paraboloid or a cubemap for the shadow map. Dual paraboloid is faster but may suffer from artifacts. Equivalent to [member OmniLight3D.omni_shadow_mode]. */
        static lightOmniSetShadowMode(light: Rid, mode: RenderingServer.LightOmniShadowMode): void
        
        /** Sets the shadow mode for this directional light. Equivalent to [member DirectionalLight3D.directional_shadow_mode]. */
        static lightDirectionalSetShadowMode(light: Rid, mode: RenderingServer.LightDirectionalShadowMode): void
        
        /** If `true`, this directional light will blend between shadow map splits resulting in a smoother transition between them. Equivalent to [member DirectionalLight3D.directional_shadow_blend_splits]. */
        static lightDirectionalSetBlendSplits(light: Rid, enable: boolean): void
        
        /** If `true`, this light will not be used for anything except sky shaders. Use this for lights that impact your sky shader that you may want to hide from affecting the rest of the scene. For example, you may want to enable this when the sun in your sky shader falls below the horizon. */
        static lightDirectionalSetSkyMode(light: Rid, mode: RenderingServer.LightDirectionalSkyMode): void
        
        /** Sets the extents (width and height) in meters for this area light. Equivalent to [member AreaLight3D.area_size]. */
        static lightAreaSetSize(light: Rid, size: Vector2): void
        
        /** Defines whether the energy of an [AreaLight3D] is normalized (divided) by its area. If set to `true`, changing the size does not affect the total energy output. Equivalent to [member AreaLight3D.area_normalize_energy]. */
        static lightAreaSetNormalizeEnergy(light: Rid, enable: boolean): void
        
        /** Sets the texture filter mode to use when rendering light projectors. This parameter is global and cannot be set on a per-light basis. */
        static lightProjectorsSetFilter(filter: RenderingServer.LightProjectorFilter): void
        
        /** Toggles whether a bicubic filter should be used when lightmaps are sampled. This smoothens their appearance at a performance cost. */
        static lightmapsSetBicubicFilter(enable: boolean): void
        
        /** Sets the filter quality for omni and spot light shadows in 3D. See also [member ProjectSettings.rendering/lights_and_shadows/positional_shadow/soft_shadow_filter_quality]. This parameter is global and cannot be set on a per-viewport basis. */
        static positionalSoftShadowFilterSetQuality(quality: RenderingServer.ShadowQuality): void
        
        /** Sets the filter [param quality] for directional light shadows in 3D. See also [member ProjectSettings.rendering/lights_and_shadows/directional_shadow/soft_shadow_filter_quality]. This parameter is global and cannot be set on a per-viewport basis. */
        static directionalSoftShadowFilterSetQuality(quality: RenderingServer.ShadowQuality): void
        
        /** Sets the [param size] of the directional light shadows in 3D. See also [member ProjectSettings.rendering/lights_and_shadows/directional_shadow/size]. This parameter is global and cannot be set on a per-viewport basis. */
        static directionalShadowAtlasSetSize(size: int64, is16Bits: boolean): void
        
        /** Creates a reflection probe and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `reflection_probe_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this reflection probe to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [ReflectionProbe].  
         */
        static reflectionProbeCreate(): Rid
        
        /** Sets how often the reflection probe updates. Can either be once or every frame. */
        static reflectionProbeSetUpdateMode(probe: Rid, mode: RenderingServer.ReflectionProbeUpdateMode): void
        
        /** Sets the intensity of the reflection probe. Intensity modulates the strength of the reflection. Equivalent to [member ReflectionProbe.intensity]. */
        static reflectionProbeSetIntensity(probe: Rid, intensity: float64): void
        
        /** Sets the distance in meters over which a probe blends into the scene. */
        static reflectionProbeSetBlendDistance(probe: Rid, blendDistance: float64): void
        
        /** Sets the reflection probe's ambient light mode. Equivalent to [member ReflectionProbe.ambient_mode]. */
        static reflectionProbeSetAmbientMode(probe: Rid, mode: RenderingServer.ReflectionProbeAmbientMode): void
        
        /** Sets the reflection probe's custom ambient light color. Equivalent to [member ReflectionProbe.ambient_color]. */
        static reflectionProbeSetAmbientColor(probe: Rid, color: Color): void
        
        /** Sets the reflection probe's custom ambient light energy. Equivalent to [member ReflectionProbe.ambient_color_energy]. */
        static reflectionProbeSetAmbientEnergy(probe: Rid, energy: float64): void
        
        /** Sets the max distance away from the probe an object can be before it is culled. Equivalent to [member ReflectionProbe.max_distance]. */
        static reflectionProbeSetMaxDistance(probe: Rid, distance: float64): void
        
        /** Sets the size of the area that the reflection probe will capture. Equivalent to [member ReflectionProbe.size]. */
        static reflectionProbeSetSize(probe: Rid, size: Vector3): void
        
        /** Sets the origin offset to be used when this reflection probe is in box project mode. Equivalent to [member ReflectionProbe.origin_offset]. */
        static reflectionProbeSetOriginOffset(probe: Rid, offset: Vector3): void
        
        /** If `true`, reflections will ignore sky contribution. Equivalent to [member ReflectionProbe.interior]. */
        static reflectionProbeSetAsInterior(probe: Rid, enable: boolean): void
        
        /** If `true`, uses box projection. This can make reflections look more correct in certain situations. Equivalent to [member ReflectionProbe.box_projection]. */
        static reflectionProbeSetEnableBoxProjection(probe: Rid, enable: boolean): void
        
        /** If `true`, computes shadows in the reflection probe. This makes the reflection much slower to compute. Equivalent to [member ReflectionProbe.enable_shadows]. */
        static reflectionProbeSetEnableShadows(probe: Rid, enable: boolean): void
        
        /** Sets the render cull mask for this reflection probe. Only instances with a matching layer will be reflected by this probe. Equivalent to [member ReflectionProbe.cull_mask]. */
        static reflectionProbeSetCullMask(probe: Rid, layers: int64): void
        
        /** Sets the render reflection mask for this reflection probe. Only instances with a matching layer will have reflections applied from this probe. Equivalent to [member ReflectionProbe.reflection_mask]. */
        static reflectionProbeSetReflectionMask(probe: Rid, layers: int64): void
        
        /** Deprecated. This method does nothing. */
        static reflectionProbeSetResolution(probe: Rid, resolution: int64): void
        
        /** Sets the mesh level of detail to use in the reflection probe rendering. Higher values will use less detailed versions of meshes that have LOD variations generated, which can improve performance. Equivalent to [member ReflectionProbe.mesh_lod_threshold]. */
        static reflectionProbeSetMeshLodThreshold(probe: Rid, pixels: float64): void
        
        /** Creates a decal and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `decal_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this decal to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [Decal].  
         */
        static decalCreate(): Rid
        
        /** Sets the [param size] of the decal specified by the [param decal] RID. Equivalent to [member Decal.size]. */
        static decalSetSize(decal: Rid, size: Vector3): void
        
        /** Sets the [param texture] in the given texture [param type] slot for the specified decal. Equivalent to [method Decal.set_texture]. */
        static decalSetTexture(decal: Rid, type: RenderingServer.DecalTexture, texture: Rid): void
        
        /** Sets the emission [param energy] in the decal specified by the [param decal] RID. Equivalent to [member Decal.emission_energy]. */
        static decalSetEmissionEnergy(decal: Rid, energy: float64): void
        
        /** Sets the [param albedo_mix] in the decal specified by the [param decal] RID. Equivalent to [member Decal.albedo_mix]. */
        static decalSetAlbedoMix(decal: Rid, albedoMix: float64): void
        
        /** Sets the color multiplier in the decal specified by the [param decal] RID to [param color]. Equivalent to [member Decal.modulate]. */
        static decalSetModulate(decal: Rid, color: Color): void
        
        /** Sets the cull [param mask] in the decal specified by the [param decal] RID. Equivalent to [member Decal.cull_mask]. */
        static decalSetCullMask(decal: Rid, mask: int64): void
        
        /** Sets the distance fade parameters in the decal specified by the [param decal] RID. Equivalent to [member Decal.distance_fade_enabled], [member Decal.distance_fade_begin] and [member Decal.distance_fade_length]. */
        static decalSetDistanceFade(decal: Rid, enabled: boolean, begin: float64, length: float64): void
        
        /** Sets the upper fade ([param above]) and lower fade ([param below]) in the decal specified by the [param decal] RID. Equivalent to [member Decal.upper_fade] and [member Decal.lower_fade]. */
        static decalSetFade(decal: Rid, above: float64, below: float64): void
        
        /** Sets the normal [param fade] in the decal specified by the [param decal] RID. Equivalent to [member Decal.normal_fade]. */
        static decalSetNormalFade(decal: Rid, fade: float64): void
        
        /** Sets the texture [param filter] mode to use when rendering decals. This parameter is global and cannot be set on a per-decal basis. */
        static decalsSetFilter(filter: RenderingServer.DecalFilter): void
        
        /** If [param half_resolution] is `true`, renders [VoxelGI] and SDFGI ([member Environment.sdfgi_enabled]) buffers at halved resolution on each axis (e.g. 960×540 when the viewport size is 1920×1080). This improves performance significantly when VoxelGI or SDFGI is enabled, at the cost of artifacts that may be visible on polygon edges. The loss in quality becomes less noticeable as the viewport resolution increases. [LightmapGI] rendering is not affected by this setting. Equivalent to [member ProjectSettings.rendering/global_illumination/gi/use_half_resolution]. */
        static gISetUseHalfResolution(halfResolution: boolean): void
        
        /** Creates a new voxel-based global illumination object and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `voxel_gi_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [VoxelGI].  
         */
        static voxelGICreate(): Rid
        
        /** Allocates and initializes the voxel GI data for the specified [param voxel_gi] RID. [param octree_cells] must be a multiple of 32. [param octree_cells] must be double the size of [param data_cells]. The allocated data can be retrieved later using the various `voxel_gi_get_*` methods. */
        static voxelGIAllocateData(voxelGI: Rid, toCellXform: Transform3D, aabb: Aabb, octreeSize: Vector3I, octreeCells: PackedByteArray | byte[] | ArrayBuffer, dataCells: PackedByteArray | byte[] | ArrayBuffer, distanceField: PackedByteArray | byte[] | ArrayBuffer, levelCounts: PackedInt32Array | int32[]): void
        
        /** Returns the octree size for the specified voxel GI data instance, which corresponds to the number of subdivisions per axis. This can be viewed in the editor by hovering the **Bake VoxelGI** button at the top of the 3D editor viewport when a [VoxelGI] node is selected and looking at the **Subdivisions** field in the tooltip. */
        static voxelGIGetOctreeSize(voxelGI: Rid): Vector3I
        
        /** Returns the octree cell data for the specified voxel GI data instance. See also [method voxel_gi_allocate_data]. */
        static voxelGIGetOctreeCells(voxelGI: Rid): PackedByteArray
        
        /** Returns the data cells for the specified voxel GI data instance. See also [method voxel_gi_allocate_data]. */
        static voxelGIGetDataCells(voxelGI: Rid): PackedByteArray
        
        /** Returns the distance field data for the specified voxel GI data instance. See also [method voxel_gi_allocate_data]. */
        static voxelGIGetDistanceField(voxelGI: Rid): PackedByteArray
        
        /** Returns the level counts for the specified voxel GI data instance. See also [method voxel_gi_allocate_data]. */
        static voxelGIGetLevelCounts(voxelGI: Rid): PackedInt32Array
        
        /** Returns the transform to cell space for the specified voxel GI data instance. See also [method voxel_gi_allocate_data]. */
        static voxelGIGetToCellXform(voxelGI: Rid): Transform3D
        
        /** Sets the [member VoxelGIData.dynamic_range] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetDynamicRange(voxelGI: Rid, range: float64): void
        
        /** Sets the [member VoxelGIData.propagation] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetPropagation(voxelGI: Rid, amount: float64): void
        
        /** Sets the [member VoxelGIData.energy] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetEnergy(voxelGI: Rid, energy: float64): void
        
        /** Used to inform the renderer what exposure normalization value was used while baking the voxel gi. This value will be used and modulated at run time to ensure that the voxel gi maintains a consistent level of exposure even if the scene-wide exposure normalization is changed at run time. For more information see [method camera_attributes_set_exposure]. */
        static voxelGISetBakedExposureNormalization(voxelGI: Rid, bakedExposure: float64): void
        
        /** Sets the [member VoxelGIData.bias] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetBias(voxelGI: Rid, bias: float64): void
        
        /** Sets the [member VoxelGIData.normal_bias] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetNormalBias(voxelGI: Rid, bias: float64): void
        
        /** Sets the [member VoxelGIData.interior] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetInterior(voxelGI: Rid, enable: boolean): void
        
        /** Sets the [member VoxelGIData.use_two_bounces] value to use on the specified [param voxel_gi]'s [RID]. */
        static voxelGISetUseTwoBounces(voxelGI: Rid, enable: boolean): void
        
        /** Sets the [member ProjectSettings.rendering/global_illumination/voxel_gi/quality] value to use when rendering. This parameter is global and cannot be set on a per-VoxelGI basis. */
        static voxelGISetQuality(quality: RenderingServer.VoxelGIQuality): void
        
        /** Creates a new lightmap global illumination instance and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `lightmap_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [LightmapGI].  
         */
        static lightmapCreate(): Rid
        
        /** Set the textures on the given [param lightmap] GI instance to the texture array pointed to by the [param light] RID. If the lightmap texture was baked with [member LightmapGI.directional] set to `true`, then [param uses_sh] must also be `true`. */
        static lightmapSetTextures(lightmap: Rid, light: Rid, usesSh: boolean): void
        
        /** Sets the bounds that this lightmap instance should visually affect, both in terms of static lightmap baking and probe-based global illumination. */
        static lightmapSetProbeBounds(lightmap: Rid, bounds: Aabb): void
        
        /** Sets whether the lightmap instance should be considered as interior (when [param interior] is `true`). If the lightmap is marked as interior, environment lighting is ignored when baking lightmaps. */
        static lightmapSetProbeInterior(lightmap: Rid, interior: boolean): void
        
        /** Sets the probe capture data for the given lightmap instance. See [method lightmap_get_probe_capture_points], [method lightmap_get_probe_capture_sh], [method lightmap_get_probe_capture_tetrahedra], and [method lightmap_get_probe_capture_bsp_tree] for the expected data formats. */
        static lightmapSetProbeCaptureData(lightmap: Rid, points: PackedVector3Array | Vector3[], pointSh: PackedColorArray | Color[], tetrahedra: PackedInt32Array | int32[], bspTree: PackedInt32Array | int32[]): void
        
        /** Returns the  *local space*  positions of each lightmap probe capture point. Keep in mind the lightmap instance may have a non-zero transform, which will affect the position of the probe capture points. See also [method lightmap_set_probe_capture_data]. */
        static lightmapGetProbeCapturePoints(lightmap: Rid): PackedVector3Array
        
        /** Returns the L0, L1, and L2 [url=https://en.wikipedia.org/wiki/Spherical_harmonics]spherical harmonics[/url] data for each lightmap probe capture point. This is specified as 9 [Color] values per probe, which means the size of the returned data is always 9 times the number of probe points. See also [method lightmap_set_probe_capture_data]. */
        static lightmapGetProbeCaptureSh(lightmap: Rid): PackedColorArray
        
        /** Returns the tetrahedralization data used for interpolating between lightmap probe capture points. Each tetrahedron is specified as a series of 4 numbers, each being an index into the probe capture points array returned by [method lightmap_get_probe_capture_points]. See also [method lightmap_set_probe_capture_data]. */
        static lightmapGetProbeCaptureTetrahedra(lightmap: Rid): PackedInt32Array
        
        /** Returns the BSP tree data used for accelerating probe lookups. The BSP data is structured as a series of six signed 32-bit values per BSP node in this order: `float plane_x`, `float plane_y`, `float plane_z`, `float plane_distance`, `int32_t over`, `int32_t under`. An empty leaf is denoted by the value `-2147483648` (the minimum 32-bit signed integer). See also [method lightmap_set_probe_capture_data]. */
        static lightmapGetProbeCaptureBspTree(lightmap: Rid): PackedInt32Array
        
        /** Used to inform the renderer what exposure normalization value was used while baking the lightmap. This value will be used and modulated at run time to ensure that the lightmap maintains a consistent level of exposure even if the scene-wide exposure normalization is changed at run time. For more information see [method camera_attributes_set_exposure]. */
        static lightmapSetBakedExposureNormalization(lightmap: Rid, bakedExposure: float64): void
        
        /** The framerate-independent update speed when representing dynamic object lighting from [LightmapProbe]s. Higher values make dynamic object lighting update faster. Higher values can prevent fast-moving objects from having "outdated" indirect lighting displayed on them, at the cost of possible flickering when an object moves from a bright area to a shaded area. See also [member ProjectSettings.rendering/lightmapping/probe_capture/update_speed]. */
        static lightmapSetProbeCaptureUpdateSpeed(speed: float64): void
        
        /** Creates a GPU-based particle system and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `particles_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach these particles to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent nodes are [GPUParticles2D] and [GPUParticles3D].  
         *      
         *  **Note:** All `particles_*` methods only apply to GPU-based particles, not CPU-based particles. [CPUParticles2D] and [CPUParticles3D] do not have equivalent RenderingServer functions available, as these use [MultiMeshInstance2D] and [MultiMeshInstance3D] under the hood (see `multimesh_*` methods).  
         */
        static particlesCreate(): Rid
        
        /** Sets whether the GPU particles specified by the [param particles] RID should be rendered in 2D or 3D according to [param mode]. */
        static particlesSetMode(particles: Rid, mode: RenderingServer.ParticlesMode): void
        
        /** If `true`, particles will emit over time. Setting to `false` does not reset the particles, but only stops their emission. Equivalent to [member GPUParticles3D.emitting]. */
        static particlesSetEmitting(particles: Rid, emitting: boolean): void
        
        /** Returns `true` if particles are currently set to emitting. */
        static particlesGetEmitting(particles: Rid): boolean
        
        /** Sets the number of particles to be drawn and allocates the memory for them. Equivalent to [member GPUParticles3D.amount]. */
        static particlesSetAmount(particles: Rid, amount: int64): void
        
        /** Sets the amount ratio for particles to be emitted. Equivalent to [member GPUParticles3D.amount_ratio]. */
        static particlesSetAmountRatio(particles: Rid, ratio: float64): void
        
        /** Sets the lifetime of each particle in the system. Equivalent to [member GPUParticles3D.lifetime]. */
        static particlesSetLifetime(particles: Rid, lifetime: float64): void
        
        /** If `true`, particles will emit once and then stop. Equivalent to [member GPUParticles3D.one_shot]. */
        static particlesSetOneShot(particles: Rid, oneShot: boolean): void
        
        /** Sets the preprocess time for the particles' animation. This lets you delay starting an animation until after the particles have begun emitting. Equivalent to [member GPUParticles3D.preprocess]. */
        static particlesSetPreProcessTime(particles: Rid, time: float64): void
        
        /** Requests the particles to process for extra process time during a single frame.  
         *  [param process_time] defines the time that the particles will process while emitting is on. [param process_time_residual] defines the time that particles will process with emitting turned off for the simulation. When combined with the particles' speed scale set to `0.0`, this is useful to be able to seek a particle system timeline.  
         */
        static particlesRequestProcessTime(particles: Rid, processTime: float64, processTimeResidual?: float64 /* = 0 */): void
        
        /** Sets the explosiveness ratio. Equivalent to [member GPUParticles3D.explosiveness]. */
        static particlesSetExplosivenessRatio(particles: Rid, ratio: float64): void
        
        /** Sets the emission randomness ratio. This randomizes the emission of particles within their phase. Equivalent to [member GPUParticles3D.randomness]. */
        static particlesSetRandomnessRatio(particles: Rid, ratio: float64): void
        
        /** Sets the value that informs a [ParticleProcessMaterial] to rush all particles towards the end of their lifetime. */
        static particlesSetInterpToEnd(particles: Rid, factor: float64): void
        
        /** Sets the velocity of a particle node, that will be used by [member ParticleProcessMaterial.inherit_velocity_ratio]. */
        static particlesSetEmitterVelocity(particles: Rid, velocity: Vector3): void
        
        /** Sets a custom axis-aligned bounding box for the particle system. Equivalent to [member GPUParticles3D.visibility_aabb]. */
        static particlesSetCustomAabb(particles: Rid, aabb: Aabb): void
        
        /** Sets the speed scale of the particle system. Equivalent to [member GPUParticles3D.speed_scale]. */
        static particlesSetSpeedScale(particles: Rid, scale: float64): void
        
        /** If `true`, particles use local coordinates. If `false` they use global coordinates. Equivalent to [member GPUParticles3D.local_coords]. */
        static particlesSetUseLocalCoordinates(particles: Rid, enable: boolean): void
        
        /** Sets the material for processing the particles.  
         *      
         *  **Note:** This is not the material used to draw the materials. Equivalent to [member GPUParticles3D.process_material].  
         */
        static particlesSetProcessMaterial(particles: Rid, material: Rid): void
        
        /** Sets the frame rate that the particle system rendering will be fixed to. Equivalent to [member GPUParticles3D.fixed_fps]. */
        static particlesSetFixedFps(particles: Rid, fps: int64): void
        
        /** Sets whether particles should use interpolation between fixed steps. Equivalent to [member GPUParticles3D.interpolate]. */
        static particlesSetInterpolate(particles: Rid, enable: boolean): void
        
        /** If `true`, uses fractional delta which smooths the movement of the particles. Equivalent to [member GPUParticles3D.fract_delta]. */
        static particlesSetFractionalDelta(particles: Rid, enable: boolean): void
        
        /** Sets the base size for particle collision. Equivalent to [member GPUParticles3D.collision_base_size]. */
        static particlesSetCollisionBaseSize(particles: Rid, size: float64): void
        
        /** Sets the transform alignment for the particle system. Equivalent to [member GPUParticles3D.transform_align]. */
        static particlesSetTransformAlign(particles: Rid, align: RenderingServer.ParticlesTransformAlign): void
        
        /** When using Z-Billboarding, which CUSTOM channel to read from. */
        static particlesSetTransformAlignChannelFilter(particles: Rid, channelFilter: RenderingServer.ParticlesTransformAlignCustomSrc): void
        
        /** Sets which axis to use for transform alignment. */
        static particlesSetTransformAlignAxis(particles: Rid, rotationAxis: RenderingServer.ParticlesTransformAlignAxis): void
        
        /** If [param enable] is `true`, enables trails for the [param particles] with the specified [param length_sec] in seconds. Equivalent to [member GPUParticles3D.trail_enabled] and [member GPUParticles3D.trail_lifetime]. */
        static particlesSetTrails(particles: Rid, enable: boolean, lengthSec: float64): void
        
        /** Sets the trail bind poses for the particle system. This specified as an array of [Transform3D]s representing the bind pose for each draw pass. See [member GPUParticles3D.draw_skin], [method Skin.get_bind_count], and [method Skin.get_bind_pose]. Set the value for each draw pass to [constant Transform3D.IDENTITY] to use the default behavior, which is what built-in trails use ([RibbonTrailMesh] and [TubeTrailMesh]). */
        static particlesSetTrailBindPoses(particles: Rid, bindPoses: GArray<Transform3D>): void
        
        /** Returns `true` if particles are not emitting and particles are set to inactive. */
        static particlesIsInactive(particles: Rid): boolean
        
        /** Add particle system to list of particle systems that need to be updated. Update will take place on the next frame, or on the next call to [method instances_cull_aabb], [method instances_cull_convex], or [method instances_cull_ray]. */
        static particlesRequestProcess(particles: Rid): void
        
        /** Reset the particles on the next update. Equivalent to [method GPUParticles3D.restart]. */
        static particlesRestart(particles: Rid): void
        
        /** Sets the subemitter particles for the particle system. Equivalent to [member GPUParticles3D.sub_emitter]. */
        static particlesSetSubemitter(particles: Rid, subemitterParticles: Rid): void
        
        /** Manually emits particles from the [param particles] instance. */
        static particlesEmit(particles: Rid, transform: Transform3D, velocity: Vector3, color: Color, custom: Color, emitFlags: int64): void
        
        /** Sets the draw order of the particles. Equivalent to [member GPUParticles3D.draw_order]. */
        static particlesSetDrawOrder(particles: Rid, order: RenderingServer.ParticlesDrawOrder): void
        
        /** Sets the number of draw passes to use. Equivalent to [member GPUParticles3D.draw_passes]. */
        static particlesSetDrawPasses(particles: Rid, count: int64): void
        
        /** Sets the mesh to be used for the specified draw pass. Equivalent to [member GPUParticles3D.draw_pass_1], [member GPUParticles3D.draw_pass_2], [member GPUParticles3D.draw_pass_3], and [member GPUParticles3D.draw_pass_4]. */
        static particlesSetDrawPassMesh(particles: Rid, pass: int64, mesh: Rid): void
        
        /** Calculates and returns the axis-aligned bounding box that contains all the particles. Equivalent to [method GPUParticles3D.capture_aabb]. */
        static particlesGetCurrentAabb(particles: Rid): Aabb
        
        /** Sets the [Transform3D] that will be used by the particles when they first emit. */
        static particlesSetEmissionTransform(particles: Rid, transform: Transform3D): void
        
        /** Creates a new 3D GPU particle collision or attractor and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID can be used in most `particles_collision_*` RenderingServer functions.  
         *      
         *  **Note:** The equivalent nodes are [GPUParticlesCollision3D] and [GPUParticlesAttractor3D].  
         */
        static particlesCollisionCreate(): Rid
        
        /** Sets the collision or attractor shape [param type] for the 3D GPU particles collision or attractor specified by the [param particles_collision] RID. */
        static particlesCollisionSetCollisionType(particlesCollision: Rid, type: RenderingServer.ParticlesCollisionType): void
        
        /** Sets the cull [param mask] for the 3D GPU particles collision or attractor specified by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollision3D.cull_mask] or [member GPUParticlesAttractor3D.cull_mask] depending on the [param particles_collision] type. */
        static particlesCollisionSetCullMask(particlesCollision: Rid, mask: int64): void
        
        /** Sets the [param radius] for the 3D GPU particles sphere collision or attractor specified by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollisionSphere3D.radius] or [member GPUParticlesAttractorSphere3D.radius] depending on the [param particles_collision] type. */
        static particlesCollisionSetSphereRadius(particlesCollision: Rid, radius: float64): void
        
        /** Sets the [param extents] for the 3D GPU particles collision by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollisionBox3D.size], [member GPUParticlesCollisionSDF3D.size], [member GPUParticlesCollisionHeightField3D.size], [member GPUParticlesAttractorBox3D.size] or [member GPUParticlesAttractorVectorField3D.size] depending on the [param particles_collision] type. */
        static particlesCollisionSetBoxExtents(particlesCollision: Rid, extents: Vector3): void
        
        /** Sets the [param strength] for the 3D GPU particles attractor specified by the [param particles_collision] RID. Only used for attractors, not colliders. Equivalent to [member GPUParticlesAttractor3D.strength]. */
        static particlesCollisionSetAttractorStrength(particlesCollision: Rid, strength: float64): void
        
        /** Sets the directionality [param amount] for the 3D GPU particles attractor specified by the [param particles_collision] RID. Only used for attractors, not colliders. Equivalent to [member GPUParticlesAttractor3D.directionality]. */
        static particlesCollisionSetAttractorDirectionality(particlesCollision: Rid, amount: float64): void
        
        /** Sets the attenuation [param curve] for the 3D GPU particles attractor specified by the [param particles_collision] RID. Only used for attractors, not colliders. Equivalent to [member GPUParticlesAttractor3D.attenuation]. */
        static particlesCollisionSetAttractorAttenuation(particlesCollision: Rid, curve: float64): void
        
        /** Sets the signed distance field [param texture] for the 3D GPU particles collision specified by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollisionSDF3D.texture] or [member GPUParticlesAttractorVectorField3D.texture] depending on the [param particles_collision] type. */
        static particlesCollisionSetFieldTexture(particlesCollision: Rid, texture: Rid): void
        
        /** Requests an update for the 3D GPU particle collision heightfield. This may be automatically called by the 3D GPU particle collision heightfield depending on its [member GPUParticlesCollisionHeightField3D.update_mode]. */
        static particlesCollisionHeightFieldUpdate(particlesCollision: Rid): void
        
        /** Sets the heightmap [param resolution] for the 3D GPU particles heightfield collision specified by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollisionHeightField3D.resolution]. */
        static particlesCollisionSetHeightFieldResolution(particlesCollision: Rid, resolution: RenderingServer.ParticlesCollisionHeightfieldResolution): void
        
        /** Sets the heightfield [param mask] for the 3D GPU particles heightfield collision specified by the [param particles_collision] RID. Equivalent to [member GPUParticlesCollisionHeightField3D.heightfield_mask]. */
        static particlesCollisionSetHeightFieldMask(particlesCollision: Rid, mask: int64): void
        
        /** Creates a new fog volume and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `fog_volume_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [FogVolume].  
         */
        static fogVolumeCreate(): Rid
        
        /** Sets the shape of the fog volume to either [constant RenderingServer.FOG_VOLUME_SHAPE_ELLIPSOID], [constant RenderingServer.FOG_VOLUME_SHAPE_CONE], [constant RenderingServer.FOG_VOLUME_SHAPE_CYLINDER], [constant RenderingServer.FOG_VOLUME_SHAPE_BOX] or [constant RenderingServer.FOG_VOLUME_SHAPE_WORLD]. */
        static fogVolumeSetShape(fogVolume: Rid, shape: RenderingServer.FogVolumeShape): void
        
        /** Sets the size of the fog volume when shape is [constant RenderingServer.FOG_VOLUME_SHAPE_ELLIPSOID], [constant RenderingServer.FOG_VOLUME_SHAPE_CONE], [constant RenderingServer.FOG_VOLUME_SHAPE_CYLINDER] or [constant RenderingServer.FOG_VOLUME_SHAPE_BOX]. */
        static fogVolumeSetSize(fogVolume: Rid, size: Vector3): void
        
        /** Sets the [Material] of the fog volume. Can be either a [FogMaterial] or a custom [ShaderMaterial]. */
        static fogVolumeSetMaterial(fogVolume: Rid, material: Rid): void
        
        /** Creates a new 3D visibility notifier object and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `visibility_notifier_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  To place in a scene, attach this notifier to an instance using [method instance_set_base] using the returned RID.  
         *      
         *  **Note:** The equivalent node is [VisibleOnScreenNotifier3D].  
         */
        static visibilityNotifierCreate(): Rid
        
        /** Sets the AABB of the specified visibility notifier. */
        static visibilityNotifierSetAabb(notifier: Rid, aabb: Aabb): void
        
        /** Sets the methods to be called when the notifier enters or exits the view. */
        static visibilityNotifierSetCallbacks(notifier: Rid, enterCallable: Callable, exitCallable: Callable): void
        
        /** Creates an occluder instance and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `occluder_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [Occluder3D] (not to be confused with the [OccluderInstance3D] node).  
         */
        static occluderCreate(): Rid
        
        /** Sets the mesh data for the given occluder RID, which controls the shape of the occlusion culling that will be performed. */
        static occluderSetMesh(occluder: Rid, vertices: PackedVector3Array | Vector3[], indices: PackedInt32Array | int32[]): void
        
        /** Creates a 3D camera and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `camera_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [Camera3D].  
         */
        static cameraCreate(): Rid
        
        /** Sets camera to use perspective projection. Objects on the screen becomes smaller when they are far away. */
        static cameraSetPerspective(camera: Rid, fovyDegrees: float64, zNear: float64, zFar: float64): void
        
        /** Sets camera to use orthogonal projection, also known as orthographic projection. Objects remain the same size on the screen no matter how far away they are. */
        static cameraSetOrthogonal(camera: Rid, size: float64, zNear: float64, zFar: float64): void
        
        /** Sets camera to use frustum projection. This mode allows adjusting the [param offset] argument to create "tilted frustum" effects. */
        static cameraSetFrustum(camera: Rid, size: float64, offset: Vector2, zNear: float64, zFar: float64): void
        
        /** Sets camera to use any set of [param projections]. You can specify one projection for each view set on the viewport. If the views are offset (e.g. ocular distance) and/or skewed, this data can be provided through [param offsets]. */
        static cameraSetXRProjections(camera: Rid, projections: GArray<Projection>, offsets?: GArray<Transform3D>): void
        
        /** Sets [Transform3D] of camera. */
        static cameraSetTransform(camera: Rid, transform: Transform3D): void
        
        /** Sets the cull mask associated with this camera. The cull mask describes which 3D layers are rendered by this camera. Equivalent to [member Camera3D.cull_mask]. */
        static cameraSetCullMask(camera: Rid, layers: int64): void
        
        /** Sets the environment used by this camera. Equivalent to [member Camera3D.environment]. */
        static cameraSetEnvironment(camera: Rid, env: Rid): void
        
        /** Sets the camera_attributes created with [method camera_attributes_create] to the given camera. */
        static cameraSetCameraAttributes(camera: Rid, effects: Rid): void
        
        /** Sets the compositor used by this camera. Equivalent to [member Camera3D.compositor]. */
        static cameraSetCompositor(camera: Rid, compositor: Rid): void
        
        /** If `true`, preserves the horizontal aspect ratio which is equivalent to [constant Camera3D.KEEP_WIDTH]. If `false`, preserves the vertical aspect ratio which is equivalent to [constant Camera3D.KEEP_HEIGHT]. */
        static cameraSetUseVerticalAspect(camera: Rid, enable: boolean): void
        
        /** Creates an empty viewport and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `viewport_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [Viewport].  
         */
        static viewportCreate(): Rid
        
        /** If `true`, the viewport uses augmented or virtual reality technologies. See [XRInterface]. */
        static viewportSetUseXR(viewport: Rid, useXR: boolean): void
        
        /** Sets the viewport's [param width] and [param height] in pixels. Optionally the [param view_count] can be set to increase the number of view layers for stereo rendering. */
        static viewportSetSize(viewport: Rid, width: int64, height: int64, viewCount?: int64 /* = 1 */): void
        
        /** If `true`, sets the viewport active, else sets it inactive. */
        static viewportSetActive(viewport: Rid, active: boolean): void
        
        /** Sets the viewport's parent to the viewport specified by the [param parent_viewport] RID. */
        static viewportSetParentViewport(viewport: Rid, parentViewport: Rid): void
        
        /** Copies the viewport to a region of the screen specified by [param rect]. If [method viewport_set_render_direct_to_screen] is `true`, then the viewport does not use a framebuffer and the contents of the viewport are rendered directly to screen. However, note that the root viewport is drawn last, therefore it will draw over the screen. Accordingly, you must set the root viewport to an area that does not cover the area that you have attached this viewport to.  
         *  For example, you can set the root viewport to not render at all with the following code:  
         *    
         *  Using this can result in significant optimization, especially on lower-end devices. However, it comes at the cost of having to manage your viewports manually. For further optimization, see [method viewport_set_render_direct_to_screen].  
         */
        static viewportAttachToScreen(viewport: Rid, rect?: Rect2 /* = new Rect2(0, 0, 0, 0) */, screen?: int64 /* = 0 */): void
        
        /** If `true`, render the contents of the viewport directly to screen. This allows a low-level optimization where you can skip drawing a viewport to the root viewport. While this optimization can result in a significant increase in speed (especially on older devices), it comes at a cost of usability. When this is enabled, you cannot read from the viewport or from the screen_texture. You also lose the benefit of certain window settings, such as the various stretch modes. Another consequence to be aware of is that in 2D the rendering happens in window coordinates, so if you have a viewport that is double the size of the window, and you set this, then only the portion that fits within the window will be drawn, no automatic scaling is possible, even if your game scene is significantly larger than the window size. */
        static viewportSetRenderDirectToScreen(viewport: Rid, enabled: boolean): void
        
        /** Sets the rendering mask associated with this [Viewport]. Only [CanvasItem] nodes with a matching rendering visibility layer will be rendered by this [Viewport]. */
        static viewportSetCanvasCullMask(viewport: Rid, canvasCullMask: int64): void
        
        /** Sets the 3D resolution scaling mode. Bilinear scaling renders at different resolution to either undersample or supersample the viewport. FidelityFX Super Resolution 1.0, abbreviated to FSR, is an upscaling technology that produces high quality images at fast framerates by using a spatially aware upscaling algorithm. FSR is slightly more expensive than bilinear, but it produces significantly higher image quality. FSR should be used where possible. */
        static viewportSetScaling3DMode(viewport: Rid, scaling3DMode: RenderingServer.ViewportScaling3DMode): void
        
        /** Scales the 3D render buffer based on the viewport size uses an image filter specified in [enum ViewportScaling3DMode] to scale the output image to the full viewport size. Values lower than `1.0` can be used to speed up 3D rendering at the cost of quality (undersampling). Values greater than `1.0` are only valid for bilinear mode and can be used to improve 3D rendering quality at a high performance cost (supersampling). See also [enum ViewportMSAA] for multi-sample antialiasing, which is significantly cheaper but only smoothens the edges of polygons.  
         *  When using FSR upscaling, AMD recommends exposing the following values as preset options to users "Ultra Quality: 0.77", "Quality: 0.67", "Balanced: 0.59", "Performance: 0.5" instead of exposing the entire scale.  
         */
        static viewportSetScaling3DScale(viewport: Rid, scale: float64): void
        
        /** Determines how sharp the upscaled image will be when using the FSR upscaling mode. Sharpness halves with every whole number. Values go from 0.0 (sharpest) to 2.0. Values above 2.0 won't make a visible difference. */
        static viewportSetFsrSharpness(viewport: Rid, sharpness: float64): void
        
        /** Affects the final texture sharpness by reading from a lower or higher mipmap (also called "texture LOD bias"). Negative values make mipmapped textures sharper but grainier when viewed at a distance, while positive values make mipmapped textures blurrier (even when up close). To get sharper textures at a distance without introducing too much graininess, set this between `-0.75` and `0.0`. Enabling temporal antialiasing ([member ProjectSettings.rendering/anti_aliasing/quality/use_taa]) can help reduce the graininess visible when using negative mipmap bias.  
         *      
         *  **Note:** When the 3D scaling mode is set to FSR 1.0, this value is used to adjust the automatic mipmap bias which is calculated internally based on the scale factor. The formula for this is `-log2(1.0 / scale) + mipmap_bias`.  
         *      
         *  **Note:** This method is only supported in the Forward+ and Mobile renderers, not Compatibility. In Compatibility, this method is always treated as if [param mipmap_bias] was set to `0.0`.  
         */
        static viewportSetTextureMipmapBias(viewport: Rid, mipmapBias: float64): void
        
        /** Sets the maximum number of samples to take when using anisotropic filtering on textures (as a power of two). A higher sample count will result in sharper textures at oblique angles, but is more expensive to compute. A value of `0` forcibly disables anisotropic filtering, even on materials where it is enabled.  
         *  The anisotropic filtering level also affects decals and light projectors if they are configured to use anisotropic filtering. See [member ProjectSettings.rendering/textures/decals/filter] and [member ProjectSettings.rendering/textures/light_projectors/filter].  
         *      
         *  **Note:** In 3D, for this setting to have an effect, set [member BaseMaterial3D.texture_filter] to [constant BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC] or [constant BaseMaterial3D.TEXTURE_FILTER_NEAREST_WITH_MIPMAPS_ANISOTROPIC] on materials.  
         *      
         *  **Note:** In 2D, for this setting to have an effect, set [member CanvasItem.texture_filter] to [constant CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC] or [constant CanvasItem.TEXTURE_FILTER_NEAREST_WITH_MIPMAPS_ANISOTROPIC] on the [CanvasItem] node displaying the texture (or in [CanvasTexture]). However, anisotropic filtering is rarely useful in 2D, so only enable it for textures in 2D if it makes a meaningful visual difference.  
         */
        static viewportSetAnisotropicFilteringLevel(viewport: Rid, anisotropicFilteringLevel: RenderingServer.ViewportAnisotropicFiltering): void
        
        /** Sets when the viewport should be updated. */
        static viewportSetUpdateMode(viewport: Rid, updateMode: RenderingServer.ViewportUpdateMode): void
        
        /** Returns the viewport's update mode.  
         *  **Warning:** Calling this from any thread other than the rendering thread will be detrimental to performance.  
         */
        static viewportGetUpdateMode(viewport: Rid): RenderingServer.ViewportUpdateMode
        
        /** Sets the clear mode of a viewport. */
        static viewportSetClearMode(viewport: Rid, clearMode: RenderingServer.ViewportClearMode): void
        
        /** Returns the render target for the viewport. */
        static viewportGetRenderTarget(viewport: Rid): Rid
        
        /** Returns the viewport's last rendered frame. */
        static viewportGetTexture(viewport: Rid): Rid
        
        /** If `true`, the viewport's 3D elements are not rendered. */
        static viewportSetDisable3D(viewport: Rid, disable: boolean): void
        
        /** If `true`, the viewport's canvas (i.e. 2D and GUI elements) is not rendered. */
        static viewportSetDisable2D(viewport: Rid, disable: boolean): void
        
        /** Sets the viewport's environment mode which allows enabling or disabling rendering of 3D environment over 2D canvas. When disabled, 2D will not be affected by the environment. When enabled, 2D will be affected by the environment if the environment background mode is [constant ENV_BG_CANVAS]. The default behavior is to inherit the setting from the viewport's parent. If the topmost parent is also set to [constant VIEWPORT_ENVIRONMENT_INHERIT], then the behavior will be the same as if it was set to [constant VIEWPORT_ENVIRONMENT_ENABLED]. */
        static viewportSetEnvironmentMode(viewport: Rid, mode: RenderingServer.ViewportEnvironmentMode): void
        
        /** Sets a viewport's camera. */
        static viewportAttachCamera(viewport: Rid, camera: Rid): void
        
        /** Sets a viewport's scenario. The scenario contains information about environment information, reflection atlas, etc. */
        static viewportSetScenario(viewport: Rid, scenario: Rid): void
        
        /** Sets a viewport's canvas. */
        static viewportAttachCanvas(viewport: Rid, canvas: Rid): void
        
        /** Detaches a viewport from a canvas. */
        static viewportRemoveCanvas(viewport: Rid, canvas: Rid): void
        
        /** If `true`, canvas item transforms (i.e. origin position) are snapped to the nearest pixel when rendering. This can lead to a crisper appearance at the cost of less smooth movement, especially when [Camera2D] smoothing is enabled. Equivalent to [member ProjectSettings.rendering/2d/snap/snap_2d_transforms_to_pixel]. */
        static viewportSetSnap2DTransformsToPixel(viewport: Rid, enabled: boolean): void
        
        /** If `true`, canvas item vertices (i.e. polygon points) are snapped to the nearest pixel when rendering. This can lead to a crisper appearance at the cost of less smooth movement, especially when [Camera2D] smoothing is enabled. Equivalent to [member ProjectSettings.rendering/2d/snap/snap_2d_vertices_to_pixel]. */
        static viewportSetSnap2DVerticesToPixel(viewport: Rid, enabled: boolean): void
        
        /** Sets the default texture filtering mode for the specified [param viewport] RID. */
        static viewportSetDefaultCanvasItemTextureFilter(viewport: Rid, filter: RenderingServer.CanvasItemTextureFilter): void
        
        /** Sets the default texture repeat mode for the specified [param viewport] RID. */
        static viewportSetDefaultCanvasItemTextureRepeat(viewport: Rid, repeat: RenderingServer.CanvasItemTextureRepeat): void
        
        /** Sets the transformation of a viewport's canvas. */
        static viewportSetCanvasTransform(viewport: Rid, canvas: Rid, offset: Transform2D): void
        
        /** Sets the stacking order for a viewport's canvas.  
         *  [param layer] is the actual canvas layer, while [param sublayer] specifies the stacking order of the canvas among those in the same layer.  
         *      
         *  **Note:** [param layer] should be between [constant CANVAS_LAYER_MIN] and [constant CANVAS_LAYER_MAX] (inclusive). Any other value will wrap around.  
         */
        static viewportSetCanvasStacking(viewport: Rid, canvas: Rid, layer: int64, sublayer: int64): void
        
        /** If `true`, the viewport renders its background as transparent. */
        static viewportSetTransparentBackground(viewport: Rid, enabled: boolean): void
        
        /** Sets the viewport's global transformation matrix. */
        static viewportSetGlobalCanvasTransform(viewport: Rid, transform: Transform2D): void
        
        /** Sets the viewport's 2D signed distance field [member ProjectSettings.rendering/2d/sdf/oversize] and [member ProjectSettings.rendering/2d/sdf/scale]. This is used when sampling the signed distance field in [CanvasItem] shaders as well as [GPUParticles2D] collision. This is  *not*  used by SDFGI in 3D rendering. */
        static viewportSetSdfOversizeAndScale(viewport: Rid, oversize: RenderingServer.ViewportSdfOversize, scale: RenderingServer.ViewportSdfScale): void
        
        /** Sets the [param size] of the shadow atlas's images (used for omni and spot lights) on the viewport specified by the [param viewport] RID. The value is rounded up to the nearest power of 2. If [param use_16_bits] is `true`, use 16 bits for the omni/spot shadow depth map. Enabling this results in shadows having less precision and may result in shadow acne, but can lead to performance improvements on some devices.  
         *      
         *  **Note:** If this is set to `0`, no positional shadows will be visible at all. This can improve performance significantly on low-end systems by reducing both the CPU and GPU load (as fewer draw calls are needed to draw the scene without shadows).  
         */
        static viewportSetPositionalShadowAtlasSize(viewport: Rid, size: int64, use16Bits?: boolean /* = false */): void
        
        /** Sets the number of subdivisions to use in the specified shadow atlas [param quadrant] for omni and spot shadows. See also [method Viewport.set_positional_shadow_atlas_quadrant_subdiv]. */
        static viewportSetPositionalShadowAtlasQuadrantSubdivision(viewport: Rid, quadrant: int64, subdivision: int64): void
        
        /** Sets the multisample antialiasing mode for 3D on the specified [param viewport] RID. Equivalent to [member ProjectSettings.rendering/anti_aliasing/quality/msaa_3d] or [member Viewport.msaa_3d]. */
        static viewportSetMsaa3D(viewport: Rid, msaa: RenderingServer.ViewportMsaa): void
        
        /** Sets the multisample antialiasing mode for 2D/Canvas on the specified [param viewport] RID. Equivalent to [member ProjectSettings.rendering/anti_aliasing/quality/msaa_2d] or [member Viewport.msaa_2d]. */
        static viewportSetMsaa2D(viewport: Rid, msaa: RenderingServer.ViewportMsaa): void
        
        /** If `true`, 2D rendering will use a high dynamic range (HDR) `RGBA16` format framebuffer. Additionally, 2D rendering will be performed on linear values and will be converted using the appropriate transfer function immediately before blitting to the screen (if the Viewport is attached to the screen).  
         *  Practically speaking, this means that the end result of the Viewport will not be clamped to the `0-1` range and can be used in 3D rendering without color encoding adjustments. This allows 2D rendering to take advantage of effects requiring high dynamic range (e.g. 2D glow) as well as substantially improves the appearance of effects requiring highly detailed gradients. This setting has the same effect as [member Viewport.use_hdr_2d].  
         */
        static viewportSetUseHdr2D(viewport: Rid, enabled: boolean): void
        
        /** Sets the viewport's screen-space antialiasing mode. Equivalent to [member ProjectSettings.rendering/anti_aliasing/quality/screen_space_aa] or [member Viewport.screen_space_aa]. */
        static viewportSetScreenSpaceAA(viewport: Rid, mode: RenderingServer.ViewportScreenSpaceAA): void
        
        /** If `true`, use temporal antialiasing. Equivalent to [member ProjectSettings.rendering/anti_aliasing/quality/use_taa] or [member Viewport.use_taa]. */
        static viewportSetUseTaa(viewport: Rid, enable: boolean): void
        
        /** Equivalent to [member Viewport.use_debanding]. See also [member ProjectSettings.rendering/anti_aliasing/quality/use_debanding]. */
        static viewportSetUseDebanding(viewport: Rid, enable: boolean): void
        
        /** If `true`, enables occlusion culling on the specified viewport. Equivalent to [member ProjectSettings.rendering/occlusion_culling/use_occlusion_culling]. */
        static viewportSetUseOcclusionCulling(viewport: Rid, enable: boolean): void
        
        /** Sets the [member ProjectSettings.rendering/occlusion_culling/occlusion_rays_per_thread] to use for occlusion culling. This parameter is global and cannot be set on a per-viewport basis. */
        static viewportSetOcclusionRaysPerThread(raysPerThread: int64): void
        
        /** Sets the [member ProjectSettings.rendering/occlusion_culling/bvh_build_quality] to use for occlusion culling. This parameter is global and cannot be set on a per-viewport basis. */
        static viewportSetOcclusionCullingBuildQuality(quality: RenderingServer.ViewportOcclusionCullingBuildQuality): void
        
        /** Returns a statistic about the rendering engine which can be used for performance profiling. This is separated into render pass [param type]s, each of them having the same [param info]s you can query (different passes will return different values).  
         *  See also [method get_rendering_info], which returns global information across all viewports.  
         *      
         *  **Note:** Viewport rendering information is not available until at least 2 frames have been rendered by the engine. If rendering information is not available, [method viewport_get_render_info] returns `0`. To print rendering information in `_ready()` successfully, use the following:  
         *    
         */
        static viewportGetRenderInfo(viewport: Rid, type: RenderingServer.ViewportRenderInfoType, info: RenderingServer.ViewportRenderInfo): int64
        
        /** Sets the debug draw mode of a viewport. */
        static viewportSetDebugDraw(viewport: Rid, draw: RenderingServer.ViewportDebugDraw): void
        
        /** Sets the measurement for the given [param viewport] RID (obtained using [method Viewport.get_viewport_rid]). Once enabled, [method viewport_get_measured_render_time_cpu] and [method viewport_get_measured_render_time_gpu] will return values greater than `0.0` when queried with the given [param viewport]. */
        static viewportSetMeasureRenderTime(viewport: Rid, enable: boolean): void
        
        /** Returns the CPU time taken to render the last frame in milliseconds. This  *only*  includes time spent in rendering-related operations; scripts' `_process` functions and other engine subsystems are not included in this readout. To get a complete readout of CPU time spent to render the scene, sum the render times of all viewports that are drawn every frame plus [method get_frame_setup_time_cpu]. Unlike [method Engine.get_frames_per_second], this method will accurately reflect CPU utilization even if framerate is capped via V-Sync or [member Engine.max_fps]. See also [method viewport_get_measured_render_time_gpu].  
         *      
         *  **Note:** Requires measurements to be enabled on the specified [param viewport] using [method viewport_set_measure_render_time]. Otherwise, this method returns `0.0`.  
         */
        static viewportGetMeasuredRenderTimeCpu(viewport: Rid): float64
        
        /** Returns the GPU time taken to render the last frame in milliseconds. To get a complete readout of GPU time spent to render the scene, sum the render times of all viewports that are drawn every frame. Unlike [method Engine.get_frames_per_second], this method accurately reflects GPU utilization even if framerate is capped via V-Sync or [member Engine.max_fps]. See also [method viewport_get_measured_render_time_cpu].  
         *      
         *  **Note:** Requires measurements to be enabled on the specified [param viewport] using [method viewport_set_measure_render_time]. Otherwise, this method returns `0.0`.  
         *      
         *  **Note:** When GPU utilization is low enough during a certain period of time, GPUs will decrease their power state (which in turn decreases core and memory clock speeds). This can cause the reported GPU time to increase if GPU utilization is kept low enough by a framerate cap (compared to what it would be at the GPU's highest power state). Keep this in mind when benchmarking using [method viewport_get_measured_render_time_gpu]. This behavior can be overridden in the graphics driver settings at the cost of higher power usage.  
         */
        static viewportGetMeasuredRenderTimeGpu(viewport: Rid): float64
        
        /** Sets the Variable Rate Shading (VRS) mode for the viewport. If the GPU does not support VRS, this property is ignored. Equivalent to [member ProjectSettings.rendering/vrs/mode]. */
        static viewportSetVrsMode(viewport: Rid, mode: RenderingServer.ViewportVrsMode): void
        
        /** Sets the update mode for Variable Rate Shading (VRS) for the viewport. VRS requires the input texture to be converted to the format usable by the VRS method supported by the hardware. The update mode defines how often this happens. If the GPU does not support VRS, or VRS is not enabled, this property is ignored.  
         *  If set to [constant RenderingServer.VIEWPORT_VRS_UPDATE_ONCE], the input texture is copied once and the mode is changed to [constant RenderingServer.VIEWPORT_VRS_UPDATE_DISABLED].  
         */
        static viewportSetVrsUpdateMode(viewport: Rid, mode: RenderingServer.ViewportVrsUpdateMode): void
        
        /** The texture to use when the VRS mode is set to [constant RenderingServer.VIEWPORT_VRS_TEXTURE]. Equivalent to [member ProjectSettings.rendering/vrs/texture]. */
        static viewportSetVrsTexture(viewport: Rid, texture: Rid): void
        
        /** Creates an empty sky and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `sky_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         */
        static skyCreate(): Rid
        
        /** Sets the [param radiance_size] of the sky specified by the [param sky] RID (in pixels). Equivalent to [member Sky.radiance_size]. */
        static skySetRadianceSize(sky: Rid, radianceSize: int64): void
        
        /** Sets the process [param mode] of the sky specified by the [param sky] RID. Equivalent to [member Sky.process_mode]. */
        static skySetMode(sky: Rid, mode: RenderingServer.SkyMode): void
        
        /** Sets the material that the sky uses to render the background, ambient and reflection maps. */
        static skySetMaterial(sky: Rid, material: Rid): void
        
        /** Generates and returns an [Image] containing the radiance map for the specified [param sky] RID. This supports built-in sky material and custom sky shaders. If [param bake_irradiance] is `true`, the irradiance map is saved instead of the radiance map. The radiance map is used to render reflected light, while the irradiance map is used to render ambient light. See also [method environment_bake_panorama].  
         *      
         *  **Note:** The image is saved using linear encoding without any tonemapping performed, which means it will look too dark if viewed directly in an image editor. [param energy] values above `1.0` can be used to brighten the resulting image.  
         *      
         *  **Note:** [param size] should be a 2:1 aspect ratio for the generated panorama to have square pixels. For radiance maps, there is no point in using a height greater than [member Sky.radiance_size], as it won't increase detail. Irradiance maps only contain low-frequency data, so there is usually no point in going past a size of 128×64 pixels when saving an irradiance map.  
         */
        static skyBakePanorama(sky: Rid, energy: float64, bakeIrradiance: boolean, size: Vector2I): null | Image
        
        /** Creates a new rendering effect and adds it to the RenderingServer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         */
        static compositorEffectCreate(): Rid
        
        /** Enables/disables this rendering effect. */
        static compositorEffectSetEnabled(effect: Rid, enabled: boolean): void
        
        /** Sets the callback type ([param callback_type]) and callback method([param callback]) for this rendering effect. */
        static compositorEffectSetCallback(effect: Rid, callbackType: RenderingServer.CompositorEffectCallbackType, callback: Callable): void
        
        /** Sets the flag ([param flag]) for this rendering effect to `true` or `false` ([param set]). */
        static compositorEffectSetFlag(effect: Rid, flag: RenderingServer.CompositorEffectFlags, set: boolean): void
        
        /** Creates a new compositor and adds it to the RenderingServer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         */
        static compositorCreate(): Rid
        
        /** Sets the compositor effects for the specified compositor RID. [param effects] should be an array containing RIDs created with [method compositor_effect_create]. */
        static compositorSetCompositorEffects(compositor: Rid, effects: GArray<Rid>): void
        
        /** Creates an environment and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `environment_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [Environment].  
         */
        static environmentCreate(): Rid
        
        /** Sets the environment's background mode. Equivalent to [member Environment.background_mode]. */
        static environmentSetBackground(env: Rid, bg: RenderingServer.EnvironmentBG): void
        
        /** Sets the camera ID to be used as environment background. */
        static environmentSetCameraId(env: Rid, id: int64): void
        
        /** Sets the [Sky] to be used as the environment's background when using  *BGMode*  sky. Equivalent to [member Environment.sky]. */
        static environmentSetSky(env: Rid, sky: Rid): void
        
        /** Sets a custom field of view for the background [Sky]. Equivalent to [member Environment.sky_custom_fov]. */
        static environmentSetSkyCustomFov(env: Rid, scale: float64): void
        
        /** Sets the rotation of the background [Sky] expressed as a [Basis]. Equivalent to [member Environment.sky_rotation], where the rotation vector is used to construct the [Basis]. */
        static environmentSetSkyOrientation(env: Rid, orientation: Basis): void
        
        /** Color displayed for clear areas of the scene. Only effective if using the [constant ENV_BG_COLOR] background mode. */
        static environmentSetBgColor(env: Rid, color: Color): void
        
        /** Sets the intensity of the background color. */
        static environmentSetBgEnergy(env: Rid, multiplier: float64, exposureValue: float64): void
        
        /** Sets the maximum layer to use if using Canvas background mode. */
        static environmentSetCanvasMaxLayer(env: Rid, maxLayer: int64): void
        
        /** Sets the values to be used for ambient light rendering. See [Environment] for more details. */
        static environmentSetAmbientLight(env: Rid, color: Color, ambient?: RenderingServer.EnvironmentAmbientSource /* = 0 */, energy?: float64 /* = 1 */, skyContribution?: float64 /* = 0 */, reflectionSource?: RenderingServer.EnvironmentReflectionSource /* = 0 */): void
        
        /** Configures glow for the specified environment RID. See `glow_*` properties in [Environment] for more information. */
        static environmentSetGlow(env: Rid, enable: boolean, levels: PackedFloat32Array | float32[], intensity: float64, strength: float64, mix: float64, bloomThreshold: float64, blendMode: RenderingServer.EnvironmentGlowBlendMode, hdrBleedThreshold: float64, hdrBleedScale: float64, hdrLuminanceCap: float64, glowMapStrength: float64, glowMap: Rid): void
        
        /** Sets the variables to be used with the "tonemap" post-process effect. See [Environment] for more details. */
        static environmentSetTonemap(env: Rid, toneMapper: RenderingServer.EnvironmentToneMapper, exposure: float64, white: float64): void
        
        /** See [member Environment.tonemap_agx_contrast] for more details. */
        static environmentSetTonemapAgxContrast(env: Rid, agxContrast: float64): void
        
        /** Sets the values to be used with the "adjustments" post-process effect. See [Environment] for more details. */
        static environmentSetAdjustment(env: Rid, enable: boolean, brightness: float64, contrast: float64, saturation: float64, use1DColorCorrection: boolean, colorCorrection: Rid): void
        
        /** Sets the variables to be used with the screen-space reflections (SSR) post-process effect. See [Environment] for more details. */
        static environmentSetSsr(env: Rid, enable: boolean, maxSteps: int64, fadeIn: float64, fadeOut: float64, depthTolerance: float64): void
        
        /** Sets the variables to be used with the screen-space ambient occlusion (SSAO) post-process effect. See [Environment] for more details. */
        static environmentSetSsao(env: Rid, enable: boolean, radius: float64, intensity: float64, power: float64, detail: float64, horizon: float64, sharpness: float64, lightAffect: float64, aOChannelAffect: float64): void
        
        /** Configures fog for the specified environment RID. See `fog_*` properties in [Environment] for more information. */
        static environmentSetFog(env: Rid, enable: boolean, lightColor: Color, lightEnergy: float64, sunScatter: float64, density: float64, height: float64, heightDensity: float64, aerialPerspective: float64, skyAffect: float64, fogMode?: RenderingServer.EnvironmentFogMode /* = 0 */): void
        
        /** Configures fog depth for the specified environment RID. Only has an effect when the fog mode of the environment is [constant ENV_FOG_MODE_DEPTH]. See `fog_depth_*` properties in [Environment] for more information. */
        static environmentSetFogDepth(env: Rid, curve: float64, begin: float64, end: float64): void
        
        /** Configures signed distance field global illumination for the specified environment RID. See `sdfgi_*` properties in [Environment] for more information. */
        static environmentSetSdfgi(env: Rid, enable: boolean, cascades: int64, minCellSize: float64, yScale: RenderingServer.EnvironmentSdfgiyScale, useOcclusion: boolean, bounceFeedback: float64, readSky: boolean, energy: float64, normalBias: float64, probeBias: float64): void
        
        /** Sets the variables to be used with the volumetric fog post-process effect. See [Environment] for more details. */
        static environmentSetVolumetricFog(env: Rid, enable: boolean, density: float64, albedo: Color, emission: Color, emissionEnergy: float64, anisotropy: float64, length: float64, detailSpread: float64, gIInject: float64, temporalReprojection: boolean, temporalReprojectionAmount: float64, ambientInject: float64, skyAffect: float64): void
        
        /** If [param enable] is `true`, enables bicubic upscaling for glow which improves quality at the cost of performance. Equivalent to [member ProjectSettings.rendering/environment/glow/upscale_mode].  
         *      
         *  **Note:** This setting is only effective when using the Forward+ or Mobile rendering methods, as Compatibility uses a different glow implementation.  
         */
        static environmentGlowSetUseBicubicUpscale(enable: boolean): void
        
        /** Sets whether screen-space reflections will be rendered at full or half size. Half size is faster, but may look pixelated or cause flickering. */
        static environmentSetSsrHalfSize(halfSize: boolean): void
        static environmentSetSsrRoughnessQuality(quality: RenderingServer.EnvironmentSsrRoughnessQuality): void
        
        /** Sets the quality level of the screen-space ambient occlusion (SSAO) post-process effect. See [Environment] for more details. */
        static environmentSetSsaoQuality(quality: RenderingServer.EnvironmentSsaoQuality, halfSize: boolean, adaptiveTarget: float64, blurPasses: int64, fadeOutFrom: float64, fadeOutTo: float64): void
        
        /** Sets the quality level of the screen-space indirect lighting (SSIL) post-process effect. See [Environment] for more details. */
        static environmentSetSsilQuality(quality: RenderingServer.EnvironmentSsilQuality, halfSize: boolean, adaptiveTarget: float64, blurPasses: int64, fadeOutFrom: float64, fadeOutTo: float64): void
        
        /** Sets the number of rays to throw per frame when computing signed distance field global illumination. Equivalent to [member ProjectSettings.rendering/global_illumination/sdfgi/probe_ray_count]. */
        static environmentSetSdfgiRayCount(rayCount: RenderingServer.EnvironmentSdfgiRayCount): void
        
        /** Sets the number of frames to use for converging signed distance field global illumination. Equivalent to [member ProjectSettings.rendering/global_illumination/sdfgi/frames_to_converge]. */
        static environmentSetSdfgiFramesToConverge(frames: RenderingServer.EnvironmentSdfgiFramesToConverge): void
        
        /** Sets the update speed for dynamic lights' indirect lighting when computing signed distance field global illumination. Equivalent to [member ProjectSettings.rendering/global_illumination/sdfgi/frames_to_update_lights]. */
        static environmentSetSdfgiFramesToUpdateLight(frames: RenderingServer.EnvironmentSdfgiFramesToUpdateLight): void
        
        /** Sets the resolution of the volumetric fog's froxel buffer. [param size] is modified by the screen's aspect ratio and then used to set the width and height of the buffer. While [param depth] is directly used to set the depth of the buffer. */
        static environmentSetVolumetricFogVolumeSize(size: int64, depth: int64): void
        
        /** Enables filtering of the volumetric fog scattering buffer. This results in much smoother volumes with very few under-sampling artifacts. */
        static environmentSetVolumetricFogFilterActive(active: boolean): void
        
        /** Generates and returns an [Image] containing the radiance map for the specified [param environment] RID's sky. This supports built-in sky material and custom sky shaders. If [param bake_irradiance] is `true`, the irradiance map is saved instead of the radiance map. The radiance map is used to render reflected light, while the irradiance map is used to render ambient light. See also [method sky_bake_panorama].  
         *      
         *  **Note:** The image is saved using linear encoding without any tonemapping performed, which means it will look too dark if viewed directly in an image editor.  
         *      
         *  **Note:** [param size] should be a 2:1 aspect ratio for the generated panorama to have square pixels. For radiance maps, there is no point in using a height greater than [member Sky.radiance_size], as it won't increase detail. Irradiance maps only contain low-frequency data, so there is usually no point in going past a size of 128×64 pixels when saving an irradiance map.  
         */
        static environmentBakePanorama(environment: Rid, bakeIrradiance: boolean, size: Vector2I): null | Image
        
        /** Sets the screen-space roughness limiter parameters, such as whether it should be enabled and its thresholds. Equivalent to [member ProjectSettings.rendering/anti_aliasing/screen_space_roughness_limiter/enabled], [member ProjectSettings.rendering/anti_aliasing/screen_space_roughness_limiter/amount] and [member ProjectSettings.rendering/anti_aliasing/screen_space_roughness_limiter/limit]. */
        static screenSpaceRoughnessLimiterSetActive(enable: boolean, amount: float64, limit: float64): void
        
        /** Sets [member ProjectSettings.rendering/environment/subsurface_scattering/subsurface_scattering_quality] to use when rendering materials that have subsurface scattering enabled. */
        static subSurfaceScatteringSetQuality(quality: RenderingServer.SubSurfaceScatteringQuality): void
        
        /** Sets the [member ProjectSettings.rendering/environment/subsurface_scattering/subsurface_scattering_scale] and [member ProjectSettings.rendering/environment/subsurface_scattering/subsurface_scattering_depth_scale] to use when rendering materials that have subsurface scattering enabled. */
        static subSurfaceScatteringSetScale(scale: float64, depthScale: float64): void
        
        /** Creates a camera attributes object and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `camera_attributes_` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [CameraAttributes].  
         */
        static cameraAttributesCreate(): Rid
        
        /** Sets the quality level of the DOF blur effect to [param quality]. [param use_jitter] can be used to jitter samples taken during the blur pass to hide artifacts at the cost of looking more fuzzy. */
        static cameraAttributesSetDofBlurQuality(quality: RenderingServer.DofBlurQuality, useJitter: boolean): void
        
        /** Sets the shape of the DOF bokeh pattern to [param shape]. Different shapes may be used to achieve artistic effect, or to meet performance targets. */
        static cameraAttributesSetDofBlurBokehShape(shape: RenderingServer.DofBokehShape): void
        
        /** Sets the parameters to use with the DOF blur effect. These parameters take on the same meaning as their counterparts in [CameraAttributesPractical]. */
        static cameraAttributesSetDofBlur(cameraAttributes: Rid, farEnable: boolean, farDistance: float64, farTransition: float64, nearEnable: boolean, nearDistance: float64, nearTransition: float64, amount: float64): void
        
        /** Sets the exposure values that will be used by the renderers. The normalization amount is used to bake a given Exposure Value (EV) into rendering calculations to reduce the dynamic range of the scene.  
         *  The normalization factor can be calculated from exposure value (EV100) as follows:  
         *    
         *  The exposure value can be calculated from aperture (in f-stops), shutter speed (in seconds), and sensitivity (in ISO) as follows:  
         *    
         */
        static cameraAttributesSetExposure(cameraAttributes: Rid, multiplier: float64, normalization: float64): void
        
        /** Sets the parameters to use with the auto-exposure effect. These parameters take on the same meaning as their counterparts in [CameraAttributes] and [CameraAttributesPractical]. */
        static cameraAttributesSetAutoExposure(cameraAttributes: Rid, enable: boolean, minSensitivity: float64, maxSensitivity: float64, speed: float64, scale: float64): void
        
        /** Creates a scenario and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `scenario_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  The scenario is the 3D world that all the visual instances exist in.  
         */
        static scenarioCreate(): Rid
        
        /** Sets the environment that will be used with this scenario. See also [Environment]. */
        static scenarioSetEnvironment(scenario: Rid, environment: Rid): void
        
        /** Sets the fallback environment to be used by this scenario. The fallback environment is used if no environment is set. Internally, this is used by the editor to provide a default environment. */
        static scenarioSetFallbackEnvironment(scenario: Rid, environment: Rid): void
        
        /** Sets the camera attributes ([param effects]) that will be used with this scenario. See also [CameraAttributes]. */
        static scenarioSetCameraAttributes(scenario: Rid, effects: Rid): void
        
        /** Sets the compositor ([param compositor]) that will be used with this scenario. See also [Compositor]. */
        static scenarioSetCompositor(scenario: Rid, compositor: Rid): void
        
        /** Creates a visual instance, adds it to the RenderingServer, and sets both base and scenario. It can be accessed with the RID that is returned. This RID will be used in all `instance_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method. This is a shorthand for using [method instance_create] and setting the base and scenario manually.  
         */
        static instanceCreate2(base: Rid, scenario: Rid): Rid
        
        /** Creates a visual instance and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `instance_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  An instance is a way of placing a 3D object in the scenario. Objects like particles, meshes, reflection probes and decals need to be associated with an instance to be visible in the scenario using [method instance_set_base].  
         *      
         *  **Note:** The equivalent node is [VisualInstance3D].  
         */
        static instanceCreate(): Rid
        
        /** Sets the base of the instance. A base can be any of the 3D objects that are created in the RenderingServer that can be displayed. For example, any of the light types, mesh, multimesh, particle system, reflection probe, decal, lightmap, voxel GI and visibility notifiers are all types that can be set as the base of an instance in order to be displayed in the scenario. */
        static instanceSetBase(instance: Rid, base: Rid): void
        
        /** Sets the scenario that the instance is in. The scenario is the 3D world that the objects will be displayed in. */
        static instanceSetScenario(instance: Rid, scenario: Rid): void
        
        /** Sets the render layers that this instance will be drawn to. Equivalent to [member VisualInstance3D.layers]. */
        static instanceSetLayerMask(instance: Rid, mask: int64): void
        
        /** Sets the sorting offset and switches between using the bounding box or instance origin for depth sorting. */
        static instanceSetPivotData(instance: Rid, sortingOffset: float64, useAabbCenter: boolean): void
        
        /** Sets the world space transform of the instance. Equivalent to [member Node3D.global_transform]. */
        static instanceSetTransform(instance: Rid, transform: Transform3D): void
        
        /** Attaches a unique Object ID to instance. Object ID must be attached to instance for proper culling with [method instances_cull_aabb], [method instances_cull_convex], and [method instances_cull_ray]. */
        static instanceAttachObjectInstanceId(instance: Rid, id: int64): void
        
        /** Sets the weight for a given blend shape associated with this instance. */
        static instanceSetBlendShapeWeight(instance: Rid, shape: int64, weight: float64): void
        
        /** Sets the override material of a specific surface. Equivalent to [method MeshInstance3D.set_surface_override_material]. */
        static instanceSetSurfaceOverrideMaterial(instance: Rid, surface: int64, material: Rid): void
        
        /** Sets whether an instance is drawn or not. Equivalent to [member Node3D.visible]. */
        static instanceSetVisible(instance: Rid, visible: boolean): void
        
        /** Sets the transparency for the given geometry instance. Equivalent to [member GeometryInstance3D.transparency].  
         *  A transparency of `0.0` is fully opaque, while `1.0` is fully transparent. Values greater than `0.0` (exclusive) will force the geometry's materials to go through the transparent pipeline, which is slower to render and can exhibit rendering issues due to incorrect transparency sorting. However, unlike using a transparent material, setting [param transparency] to a value greater than `0.0` (exclusive) will  *not*  disable shadow rendering.  
         *  In spatial shaders, `1.0 - transparency` is set as the default value of the `ALPHA` built-in.  
         *      
         *  **Note:** [param transparency] is clamped between `0.0` and `1.0`, so this property cannot be used to make transparent materials more opaque than they originally are.  
         */
        static instanceGeometrySetTransparency(instance: Rid, transparency: float64): void
        
        /** Resets motion vectors and other interpolated values. Use this  *after*  teleporting a mesh from one position to another to avoid ghosting artifacts. */
        static instanceTeleport(instance: Rid): void
        
        /** Sets a custom AABB to use when culling objects from the view frustum. Equivalent to setting [member GeometryInstance3D.custom_aabb]. */
        static instanceSetCustomAabb(instance: Rid, aabb: Aabb): void
        
        /** Attaches a skeleton to an instance. Removes the previous skeleton from the instance. */
        static instanceAttachSkeleton(instance: Rid, skeleton: Rid): void
        
        /** Sets a margin to increase the size of the AABB when culling objects from the view frustum. This allows you to avoid culling objects that fall outside the view frustum. Equivalent to [member GeometryInstance3D.extra_cull_margin]. */
        static instanceSetExtraVisibilityMargin(instance: Rid, margin: float64): void
        
        /** Sets the visibility parent for the given instance. Equivalent to [member Node3D.visibility_parent]. */
        static instanceSetVisibilityParent(instance: Rid, parent: Rid): void
        
        /** If `true`, ignores all culling on the specified 3D geometry instance, including frustum culling, occlusion culling, and layer culling. This is not the same as [member GeometryInstance3D.ignore_occlusion_culling], which only ignores occlusion culling but leaves frustum and layer culling intact. */
        static instanceSetIgnoreCulling(instance: Rid, enabled: boolean): void
        
        /** Sets the [param flag] for a given [param instance] to [param enabled]. */
        static instanceGeometrySetFlag(instance: Rid, flag: RenderingServer.InstanceFlags, enabled: boolean): void
        
        /** Sets the shadow casting setting. Equivalent to [member GeometryInstance3D.cast_shadow]. */
        static instanceGeometrySetCastShadowsSetting(instance: Rid, shadowCastingSetting: RenderingServer.ShadowCastingSetting): void
        
        /** Sets a material that will override the material for all surfaces on the mesh associated with this instance. Equivalent to [member GeometryInstance3D.material_override]. */
        static instanceGeometrySetMaterialOverride(instance: Rid, material: Rid): void
        
        /** Sets a material that will be rendered for all surfaces on top of active materials for the mesh associated with this instance. Equivalent to [member GeometryInstance3D.material_overlay]. */
        static instanceGeometrySetMaterialOverlay(instance: Rid, material: Rid): void
        
        /** Sets the visibility range values for the given geometry instance. Equivalent to [member GeometryInstance3D.visibility_range_begin] and related properties. */
        static instanceGeometrySetVisibilityRange(instance: Rid, min: float64, max: float64, minMargin: float64, maxMargin: float64, fadeMode: RenderingServer.VisibilityRangeFadeMode): void
        
        /** Sets the lightmap GI instance to use for the specified 3D geometry instance. The lightmap UV scale for the specified instance (equivalent to [member GeometryInstance3D.gi_lightmap_scale]) and lightmap atlas slice must also be specified. */
        static instanceGeometrySetLightmap(instance: Rid, lightmap: Rid, lightmapUVScale: Rect2, lightmapSlice: int64): void
        
        /** Sets the level of detail bias to use when rendering the specified 3D geometry instance. Higher values result in higher detail from further away. Equivalent to [member GeometryInstance3D.lod_bias]. */
        static instanceGeometrySetLodBias(instance: Rid, lodBias: float64): void
        
        /** Sets the per-instance shader uniform on the specified 3D geometry instance. Equivalent to [method GeometryInstance3D.set_instance_shader_parameter]. */
        static instanceGeometrySetShaderParameter(instance: Rid, parameter: StringName, value: any): void
        
        /** Returns the value of the per-instance shader uniform from the specified 3D geometry instance. Equivalent to [method GeometryInstance3D.get_instance_shader_parameter].  
         *      
         *  **Note:** Per-instance shader parameter names are case-sensitive.  
         */
        static instanceGeometryGetShaderParameter(instance: Rid, parameter: StringName): any
        
        /** Returns the default value of the per-instance shader uniform from the specified 3D geometry instance. Equivalent to [method GeometryInstance3D.get_instance_shader_parameter]. */
        static instanceGeometryGetShaderParameterDefaultValue(instance: Rid, parameter: StringName): any
        
        /** Returns a dictionary of per-instance shader uniform names of the per-instance shader uniform from the specified 3D geometry instance. The returned dictionary is in PropertyInfo format, with the keys `name`, `class_name`, `type`, `hint`, `hint_string` and `usage`. Equivalent to [method GeometryInstance3D.get_instance_shader_parameter]. */
        static instanceGeometryGetShaderParameterList(instance: Rid): GArray<GDictionary>
        
        /** Returns an array of object IDs intersecting with the provided AABB. Only 3D nodes that inherit from [VisualInstance3D] are considered, such as [MeshInstance3D] or [DirectionalLight3D]. Use [method @GlobalScope.instance_from_id] to obtain the actual nodes. A scenario RID must be provided, which is available in the [World3D] you want to query. This forces an update for all resources queued to update.  
         *  **Warning:** This function is primarily intended for editor usage. For in-game use cases, prefer physics collision.  
         */
        static instancesCullAabb(aabb: Aabb, scenario?: Rid /* = new Rid() */): PackedInt64Array
        
        /** Returns an array of object IDs intersecting with the provided 3D ray. Only 3D nodes that inherit from [VisualInstance3D] are considered, such as [MeshInstance3D] or [DirectionalLight3D]. Use [method @GlobalScope.instance_from_id] to obtain the actual nodes. A scenario RID must be provided, which is available in the [World3D] you want to query. This forces an update for all resources queued to update.  
         *  **Warning:** This function is primarily intended for editor usage. For in-game use cases, prefer physics collision.  
         */
        static instancesCullRay(from: Vector3, to: Vector3, scenario?: Rid /* = new Rid() */): PackedInt64Array
        
        /** Returns an array of object IDs intersecting with the provided convex shape. Only 3D nodes that inherit from [VisualInstance3D] are considered, such as [MeshInstance3D] or [DirectionalLight3D]. Use [method @GlobalScope.instance_from_id] to obtain the actual nodes. A scenario RID must be provided, which is available in the [World3D] you want to query. This forces an update for all resources queued to update.  
         *  **Warning:** This function is primarily intended for editor usage. For in-game use cases, prefer physics collision.  
         */
        static instancesCullConvex(convex: GArray<Plane>, scenario?: Rid /* = new Rid() */): PackedInt64Array
        
        /** Bakes the material data of the Mesh passed in the [param base] parameter with optional [param material_overrides] to a set of [Image]s of size [param image_size]. Returns an array of [Image]s containing material properties as specified in [enum BakeChannels]. */
        static bakeRenderUV2(base: Rid, materialOverrides: GArray<Rid>, imageSize: Vector2I): GArray<Image>
        
        /** Creates a canvas and returns the assigned [RID]. It can be accessed with the RID that is returned. This RID will be used in all `canvas_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *  Canvas has no [Resource] or [Node] equivalent.  
         */
        static canvasCreate(): Rid
        
        /** A copy of the canvas item will be drawn with a local offset of the [param mirroring].  
         *      
         *  **Note:** This is equivalent to calling [method canvas_set_item_repeat] like `canvas_set_item_repeat(item, mirroring, 1)`, with an additional check ensuring [param canvas] is a parent of [param item].  
         */
        static canvasSetItemMirroring(canvas: Rid, item: Rid, mirroring: Vector2): void
        
        /** A copy of the canvas item will be drawn with a local offset of the [param repeat_size] by the number of times of the [param repeat_times]. As the [param repeat_times] increases, the copies will spread away from the origin texture. */
        static canvasSetItemRepeat(item: Rid, repeatSize: Vector2, repeatTimes: int64): void
        
        /** Modulates all colors in the given canvas. */
        static canvasSetModulate(canvas: Rid, color: Color): void
        
        /** If [param disable] is `true`, makes 2D rendering ignore the canvas scale defined for each canvas layer. This affects [CanvasLayer]s with the [member CanvasLayer.follow_viewport_enabled] property set to `true`.  
         *  In the editor, this is set to `true` by default, and set to `false` when **View > Preview Canvas Scale** is enabled at the top of the 2D editor viewport.  
         *      
         *  **Note:** Setting this to `true` does not impact the behavior of [member CanvasLayer.scale], [member Node2D.scale], or [member Control.scale].  
         */
        static canvasSetDisableScale(disable: boolean): void
        
        /** Creates a canvas texture and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `canvas_texture_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method. See also [method texture_2d_create].  
         *      
         *  **Note:** The equivalent resource is [CanvasTexture] and is only meant to be used in 2D rendering, not 3D.  
         */
        static canvasTextureCreate(): Rid
        
        /** Sets the [param channel]'s [param texture] for the canvas texture specified by the [param canvas_texture] RID. Equivalent to [member CanvasTexture.diffuse_texture], [member CanvasTexture.normal_texture] and [member CanvasTexture.specular_texture]. */
        static canvasTextureSetChannel(canvasTexture: Rid, channel: RenderingServer.CanvasTextureChannel, texture: Rid): void
        
        /** Sets the [param base_color] and [param shininess] to use for the canvas texture specified by the [param canvas_texture] RID. Equivalent to [member CanvasTexture.specular_color] and [member CanvasTexture.specular_shininess]. */
        static canvasTextureSetShadingParameters(canvasTexture: Rid, baseColor: Color, shininess: float64): void
        
        /** Sets the texture [param filter] mode to use for the canvas texture specified by the [param canvas_texture] RID. */
        static canvasTextureSetTextureFilter(canvasTexture: Rid, filter: RenderingServer.CanvasItemTextureFilter): void
        
        /** Sets the texture [param repeat] mode to use for the canvas texture specified by the [param canvas_texture] RID. */
        static canvasTextureSetTextureRepeat(canvasTexture: Rid, repeat: RenderingServer.CanvasItemTextureRepeat): void
        
        /** Creates a new CanvasItem instance and returns its [RID]. It can be accessed with the RID that is returned. This RID will be used in all `canvas_item_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [CanvasItem].  
         */
        static canvasItemCreate(): Rid
        
        /** Sets a parent [CanvasItem] to the [CanvasItem]. The item will inherit transform, modulation and visibility from its parent, like [CanvasItem] nodes in the scene tree. */
        static canvasItemSetParent(item: Rid, parent: Rid): void
        
        /** Sets the default texture filter mode for the canvas item specified by the [param item] RID. Equivalent to [member CanvasItem.texture_filter]. */
        static canvasItemSetDefaultTextureFilter(item: Rid, filter: RenderingServer.CanvasItemTextureFilter): void
        
        /** Sets the default texture repeat mode for the canvas item specified by the [param item] RID. Equivalent to [member CanvasItem.texture_repeat]. */
        static canvasItemSetDefaultTextureRepeat(item: Rid, repeat: RenderingServer.CanvasItemTextureRepeat): void
        
        /** Sets the visibility of the [CanvasItem]. */
        static canvasItemSetVisible(item: Rid, visible: boolean): void
        
        /** Sets the light [param mask] for the canvas item specified by the [param item] RID. Equivalent to [member CanvasItem.light_mask]. */
        static canvasItemSetLightMask(item: Rid, mask: int64): void
        
        /** Sets the rendering visibility layer associated with this [CanvasItem]. Only [Viewport] nodes with a matching rendering mask will render this [CanvasItem]. */
        static canvasItemSetVisibilityLayer(item: Rid, visibilityLayer: int64): void
        
        /** Sets the [param transform] of the canvas item specified by the [param item] RID. This affects where and how the item will be drawn. Child canvas items' transforms are multiplied by their parent's transform. Equivalent to [member Node2D.transform]. */
        static canvasItemSetTransform(item: Rid, transform: Transform2D): void
        
        /** If [param clip] is `true`, makes the canvas item specified by the [param item] RID not draw anything outside of its rect's coordinates. This clipping is fast, but works only with axis-aligned rectangles. This means that rotation is ignored by the clipping rectangle. For more advanced clipping shapes, use [method canvas_item_set_canvas_group_mode] instead.  
         *      
         *  **Note:** The equivalent node functionality is found in [member Label.clip_text], [RichTextLabel] (always enabled) and more.  
         */
        static canvasItemSetClip(item: Rid, clip: boolean): void
        
        /** If [param enabled] is `true`, enables multichannel signed distance field rendering mode for the canvas item specified by the [param item] RID. This is meant to be used for font rendering, or with specially generated images using [url=https://github.com/Chlumsky/msdfgen]msdfgen[/url]. */
        static canvasItemSetDistanceFieldMode(item: Rid, enabled: boolean): void
        
        /** If [param use_custom_rect] is `true`, sets the custom visibility rectangle (used for culling) to [param rect] for the canvas item specified by [param item]. Setting a custom visibility rect can reduce CPU load when drawing lots of 2D instances. If [param use_custom_rect] is `false`, automatically computes a visibility rectangle based on the canvas item's draw commands. */
        static canvasItemSetCustomRect(item: Rid, useCustomRect: boolean, rect?: Rect2 /* = new Rect2(0, 0, 0, 0) */): void
        
        /** Multiplies the color of the canvas item specified by the [param item] RID, while affecting its children. See also [method canvas_item_set_self_modulate]. Equivalent to [member CanvasItem.modulate]. */
        static canvasItemSetModulate(item: Rid, color: Color): void
        
        /** Multiplies the color of the canvas item specified by the [param item] RID, without affecting its children. See also [method canvas_item_set_modulate]. Equivalent to [member CanvasItem.self_modulate]. */
        static canvasItemSetSelfModulate(item: Rid, color: Color): void
        
        /** If [param enabled] is `true`, draws the canvas item specified by the [param item] RID behind its parent. Equivalent to [member CanvasItem.show_behind_parent]. */
        static canvasItemSetDrawBehindParent(item: Rid, enabled: boolean): void
        
        /** If [param interpolated] is `true`, turns on physics interpolation for the canvas item. */
        static canvasItemSetInterpolated(item: Rid, interpolated: boolean): void
        
        /** Prevents physics interpolation for the current physics tick.  
         *  This is useful when moving a canvas item to a new location, to give an instantaneous change rather than interpolation from the previous location.  
         */
        static canvasItemResetPhysicsInterpolation(item: Rid): void
        
        /** Transforms both the current and previous stored transform for a canvas item.  
         *  This allows transforming a canvas item without creating a "glitch" in the interpolation, which is particularly useful for large worlds utilizing a shifting origin.  
         */
        static canvasItemTransformPhysicsInterpolation(item: Rid, transform: Transform2D): void
        
        /** Draws a line on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_line]. */
        static canvasItemAddLine(item: Rid, from: Vector2, to: Vector2, color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a 2D polyline on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_polyline] and [method CanvasItem.draw_polyline_colors]. */
        static canvasItemAddPolyline(item: Rid, points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a 2D multiline on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_multiline] and [method CanvasItem.draw_multiline_colors]. */
        static canvasItemAddMultiline(item: Rid, points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a rectangle on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_rect]. */
        static canvasItemAddRect(item: Rid, rect: Rect2, color: Color, antialiased?: boolean /* = false */): void
        
        /** Draws a circle on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_circle]. */
        static canvasItemAddCircle(item: Rid, pos: Vector2, radius: float64, color: Color, antialiased?: boolean /* = false */): void
        
        /** Draws an ellipse with semi-major axis [param major] and semi-minor axis [param minor] on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_ellipse]. */
        static canvasItemAddEllipse(item: Rid, pos: Vector2, major: float64, minor: float64, color: Color, antialiased?: boolean /* = false */): void
        
        /** Draws a 2D textured rectangle on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_texture_rect] and [method Texture2D.draw_rect]. */
        static canvasItemAddTextureRect(item: Rid, rect: Rect2, texture: Rid, tile?: boolean /* = false */, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */): void
        
        /** See also [method CanvasItem.draw_msdf_texture_rect_region]. */
        static canvasItemAddMsdfTextureRectRegion(item: Rid, rect: Rect2, texture: Rid, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */, outlineSize?: int64 /* = 0 */, pxRange?: float64 /* = 1 */, scale?: float64 /* = 1 */): void
        
        /** See also [method CanvasItem.draw_lcd_texture_rect_region]. */
        static canvasItemAddLcdTextureRectRegion(item: Rid, rect: Rect2, texture: Rid, srcRect: Rect2, modulate: Color): void
        
        /** Draws the specified region of a 2D textured rectangle on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_texture_rect_region] and [method Texture2D.draw_rect_region]. */
        static canvasItemAddTextureRectRegion(item: Rid, rect: Rect2, texture: Rid, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */, clipUV?: boolean /* = true */): void
        
        /** Draws a nine-patch rectangle on the [CanvasItem] pointed to by the [param item] [RID]. */
        static canvasItemAddNinePatch(item: Rid, rect: Rect2, source: Rect2, texture: Rid, topleft: Vector2, bottomright: Vector2, xAxisMode?: RenderingServer.NinePatchAxisMode /* = 0 */, yAxisMode?: RenderingServer.NinePatchAxisMode /* = 0 */, drawCenter?: boolean /* = true */, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Draws a 2D primitive on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_primitive]. */
        static canvasItemAddPrimitive(item: Rid, points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], uvs: PackedVector2Array | Vector2[], texture: Rid): void
        
        /** Draws a 2D polygon on the [CanvasItem] pointed to by the [param item] [RID]. If you need more flexibility (such as being able to use bones), use [method canvas_item_add_triangle_array] instead. See also [method CanvasItem.draw_polygon].  
         *      
         *  **Note:** If you frequently redraw the same polygon with a large number of vertices, consider pre-calculating the triangulation with [method Geometry2D.triangulate_polygon] and using [method CanvasItem.draw_mesh], [method CanvasItem.draw_multimesh], or [method canvas_item_add_triangle_array].  
         */
        static canvasItemAddPolygon(item: Rid, points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], uvs?: PackedVector2Array | Vector2[] /* = [] */, texture?: Rid /* = new Rid() */): void
        
        /** Draws a triangle array on the [CanvasItem] pointed to by the [param item] [RID]. This is internally used by [Line2D] and [StyleBoxFlat] for rendering. [method canvas_item_add_triangle_array] is highly flexible, but more complex to use than [method canvas_item_add_polygon].  
         *      
         *  **Note:** If [param count] is set to a non-negative value, only the first `count * 3` indices (corresponding to [code skip-lint]count` triangles) will be drawn. Otherwise, all indices are drawn.  
         */
        static canvasItemAddTriangleArray(item: Rid, indices: PackedInt32Array | int32[], points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], uvs?: PackedVector2Array | Vector2[] /* = [] */, bones?: PackedInt32Array | int32[] /* = [] */, weights?: PackedFloat32Array | float32[] /* = [] */, texture?: Rid /* = new Rid() */, count?: int64 /* = -1 */): void
        
        /** Draws a mesh created with [method mesh_create] with given [param transform], [param modulate] color, and [param texture]. This is used internally by [MeshInstance2D]. */
        static canvasItemAddMesh(item: Rid, mesh: Rid, transform?: Transform2D /* = new Transform2D() */, modulate?: Color /* = new Color(1, 1, 1, 1) */, texture?: Rid /* = new Rid() */): void
        
        /** Draws a 2D [MultiMesh] on the [CanvasItem] pointed to by the [param item] [RID]. See also [method CanvasItem.draw_multimesh]. */
        static canvasItemAddMultimesh(item: Rid, mesh: Rid, texture?: Rid /* = new Rid() */): void
        
        /** Draws particles on the [CanvasItem] pointed to by the [param item] [RID]. */
        static canvasItemAddParticles(item: Rid, particles: Rid, texture: Rid): void
        
        /** Sets a [Transform2D] that will be used to transform subsequent canvas item commands. */
        static canvasItemAddSetTransform(item: Rid, transform: Transform2D): void
        
        /** If [param ignore] is `true`, ignore clipping on items drawn with this canvas item until this is called again with [param ignore] set to `false`. */
        static canvasItemAddClipIgnore(item: Rid, ignore: boolean): void
        
        /** Subsequent drawing commands will be ignored unless they fall within the specified animation slice. This is a faster way to implement animations that loop on background rather than redrawing constantly. */
        static canvasItemAddAnimationSlice(item: Rid, animationLength: float64, sliceBegin: float64, sliceEnd: float64, offset?: float64 /* = 0 */): void
        
        /** If [param enabled] is `true`, child nodes with the lowest Y position are drawn before those with a higher Y position. Y-sorting only affects children that inherit from the canvas item specified by the [param item] RID, not the canvas item itself. Equivalent to [member CanvasItem.y_sort_enabled]. */
        static canvasItemSetSortChildrenByY(item: Rid, enabled: boolean): void
        
        /** Sets the [CanvasItem]'s Z index, i.e. its draw order (lower indexes are drawn first). */
        static canvasItemSetZIndex(item: Rid, zIndex: int64): void
        
        /** If this is enabled, the Z index of the parent will be added to the children's Z index. */
        static canvasItemSetZAsRelativeToParent(item: Rid, enabled: boolean): void
        
        /** Sets the [CanvasItem] to copy a rect to the backbuffer. */
        static canvasItemSetCopyToBackbuffer(item: Rid, enabled: boolean, rect: Rect2): void
        
        /** Attaches a skeleton to the [CanvasItem]. Removes the previous skeleton. */
        static canvasItemAttachSkeleton(item: Rid, skeleton: Rid): void
        
        /** Clears the [CanvasItem] and removes all commands in it. */
        static canvasItemClear(item: Rid): void
        
        /** Sets the index for the [CanvasItem]. */
        static canvasItemSetDrawIndex(item: Rid, index: int64): void
        
        /** Sets a new [param material] to the canvas item specified by the [param item] RID. Equivalent to [member CanvasItem.material]. */
        static canvasItemSetMaterial(item: Rid, material: Rid): void
        
        /** Sets if the [CanvasItem] uses its parent's material. */
        static canvasItemSetUseParentMaterial(item: Rid, enabled: boolean): void
        
        /** Sets the per-instance shader uniform on the specified canvas item instance. Equivalent to [method CanvasItem.set_instance_shader_parameter]. */
        static canvasItemSetInstanceShaderParameter(instance: Rid, parameter: StringName, value: any): void
        
        /** Returns the value of the per-instance shader uniform from the specified canvas item instance. Equivalent to [method CanvasItem.get_instance_shader_parameter]. */
        static canvasItemGetInstanceShaderParameter(instance: Rid, parameter: StringName): any
        
        /** Returns the default value of the per-instance shader uniform from the specified canvas item instance. Equivalent to [method CanvasItem.get_instance_shader_parameter]. */
        static canvasItemGetInstanceShaderParameterDefaultValue(instance: Rid, parameter: StringName): any
        
        /** Returns a dictionary of per-instance shader uniform names of the per-instance shader uniform from the specified canvas item instance.  
         *  The returned dictionary is in PropertyInfo format, with the keys `name`, `class_name`, `type`, `hint`, `hint_string`, and `usage`.  
         */
        static canvasItemGetInstanceShaderParameterList(instance: Rid): GArray<GDictionary>
        
        /** Sets the given [CanvasItem] as visibility notifier. [param area] defines the area of detecting visibility. [param enter_callable] is called when the [CanvasItem] enters the screen, [param exit_callable] is called when the [CanvasItem] exits the screen. If [param enable] is `false`, the item will no longer function as notifier.  
         *  This method can be used to manually mimic [VisibleOnScreenNotifier2D].  
         */
        static canvasItemSetVisibilityNotifier(item: Rid, enable: boolean, area: Rect2, enterCallable: Callable, exitCallable: Callable): void
        
        /** Sets the canvas group mode used during 2D rendering for the canvas item specified by the [param item] RID. For faster but more limited clipping, use [method canvas_item_set_clip] instead.  
         *      
         *  **Note:** The equivalent node functionality is found in [CanvasGroup] and [member CanvasItem.clip_children].  
         */
        static canvasItemSetCanvasGroupMode(item: Rid, mode: RenderingServer.CanvasGroupMode, clearMargin?: float64 /* = 5 */, fitEmpty?: boolean /* = false */, fitMargin?: float64 /* = 0 */, blurMipmaps?: boolean /* = false */): void
        
        /** Returns the bounding rectangle for a canvas item in local space, as calculated by the renderer. This bound is used internally for culling.  
         *  **Warning:** This function is intended for debugging in the editor, and will pass through and return a zero [Rect2] in exported projects.  
         */
        static debugCanvasItemGetRect(item: Rid): Rect2
        
        /** Creates a canvas light and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `canvas_light_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [Light2D].  
         */
        static canvasLightCreate(): Rid
        
        /** Attaches the canvas light to the canvas. Removes it from its previous canvas. */
        static canvasLightAttachToCanvas(light: Rid, canvas: Rid): void
        
        /** Enables or disables a canvas light. */
        static canvasLightSetEnabled(light: Rid, enabled: boolean): void
        
        /** Sets the scale factor of a [PointLight2D]'s texture. Equivalent to [member PointLight2D.texture_scale]. */
        static canvasLightSetTextureScale(light: Rid, scale: float64): void
        
        /** Sets the canvas light's [Transform2D]. */
        static canvasLightSetTransform(light: Rid, transform: Transform2D): void
        
        /** Sets the texture to be used by a [PointLight2D]. Equivalent to [member PointLight2D.texture]. */
        static canvasLightSetTexture(light: Rid, texture: Rid): void
        
        /** Sets the offset of a [PointLight2D]'s texture. Equivalent to [member PointLight2D.offset]. */
        static canvasLightSetTextureOffset(light: Rid, offset: Vector2): void
        
        /** Sets the color for a light. */
        static canvasLightSetColor(light: Rid, color: Color): void
        
        /** Sets a canvas light's height. */
        static canvasLightSetHeight(light: Rid, height: float64): void
        
        /** Sets a canvas light's energy. */
        static canvasLightSetEnergy(light: Rid, energy: float64): void
        
        /** Sets the Z range of objects that will be affected by this light. Equivalent to [member Light2D.range_z_min] and [member Light2D.range_z_max]. */
        static canvasLightSetZRange(light: Rid, minZ: int64, maxZ: int64): void
        
        /** The layer range that gets rendered with this light. */
        static canvasLightSetLayerRange(light: Rid, minLayer: int64, maxLayer: int64): void
        
        /** The light mask. See [LightOccluder2D] for more information on light masks. */
        static canvasLightSetItemCullMask(light: Rid, mask: int64): void
        
        /** The binary mask used to determine which layers this canvas light's shadows affects. See [LightOccluder2D] for more information on light masks. */
        static canvasLightSetItemShadowCullMask(light: Rid, mask: int64): void
        
        /** Sets the mode of the canvas light. */
        static canvasLightSetMode(light: Rid, mode: RenderingServer.CanvasLightMode): void
        
        /** Enables or disables the canvas light's shadow. */
        static canvasLightSetShadowEnabled(light: Rid, enabled: boolean): void
        
        /** Sets the canvas light's shadow's filter. */
        static canvasLightSetShadowFilter(light: Rid, filter: RenderingServer.CanvasLightShadowFilter): void
        
        /** Sets the color of the canvas light's shadow. */
        static canvasLightSetShadowColor(light: Rid, color: Color): void
        
        /** Smoothens the shadow. The lower, the smoother. */
        static canvasLightSetShadowSmooth(light: Rid, smooth: float64): void
        
        /** Sets the blend mode for the given canvas light to [param mode]. Equivalent to [member Light2D.blend_mode]. */
        static canvasLightSetBlendMode(light: Rid, mode: RenderingServer.CanvasLightBlendMode): void
        
        /** If [param interpolated] is `true`, turns on physics interpolation for the canvas light. */
        static canvasLightSetInterpolated(light: Rid, interpolated: boolean): void
        
        /** Prevents physics interpolation for the current physics tick.  
         *  This is useful when moving a canvas item to a new location, to give an instantaneous change rather than interpolation from the previous location.  
         */
        static canvasLightResetPhysicsInterpolation(light: Rid): void
        
        /** Transforms both the current and previous stored transform for a canvas light.  
         *  This allows transforming a light without creating a "glitch" in the interpolation, which is particularly useful for large worlds utilizing a shifting origin.  
         */
        static canvasLightTransformPhysicsInterpolation(light: Rid, transform: Transform2D): void
        
        /** Creates a light occluder and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `canvas_light_occluder_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent node is [LightOccluder2D].  
         */
        static canvasLightOccluderCreate(): Rid
        
        /** Attaches a light occluder to the canvas. Removes it from its previous canvas. */
        static canvasLightOccluderAttachToCanvas(occluder: Rid, canvas: Rid): void
        
        /** Enables or disables light occluder. */
        static canvasLightOccluderSetEnabled(occluder: Rid, enabled: boolean): void
        
        /** Sets a light occluder's polygon. */
        static canvasLightOccluderSetPolygon(occluder: Rid, polygon: Rid): void
        
        /** Enables or disables using the light occluder as a signed distance field for 2D particle collision. */
        static canvasLightOccluderSetAsSdfCollision(occluder: Rid, enable: boolean): void
        
        /** Sets a light occluder's [Transform2D]. */
        static canvasLightOccluderSetTransform(occluder: Rid, transform: Transform2D): void
        
        /** The light mask. See [LightOccluder2D] for more information on light masks. */
        static canvasLightOccluderSetLightMask(occluder: Rid, mask: int64): void
        
        /** If [param interpolated] is `true`, turns on physics interpolation for the light occluder. */
        static canvasLightOccluderSetInterpolated(occluder: Rid, interpolated: boolean): void
        
        /** Prevents physics interpolation for the current physics tick.  
         *  This is useful when moving an occluder to a new location, to give an instantaneous change rather than interpolation from the previous location.  
         */
        static canvasLightOccluderResetPhysicsInterpolation(occluder: Rid): void
        
        /** Transforms both the current and previous stored transform for a light occluder.  
         *  This allows transforming an occluder without creating a "glitch" in the interpolation, which is particularly useful for large worlds utilizing a shifting origin.  
         */
        static canvasLightOccluderTransformPhysicsInterpolation(occluder: Rid, transform: Transform2D): void
        
        /** Creates a new light occluder polygon and adds it to the RenderingServer. It can be accessed with the RID that is returned. This RID will be used in all `canvas_occluder_polygon_*` RenderingServer functions.  
         *  Once finished with your RID, you will want to free the RID using the RenderingServer's [method free_rid] method.  
         *      
         *  **Note:** The equivalent resource is [OccluderPolygon2D].  
         */
        static canvasOccluderPolygonCreate(): Rid
        
        /** Sets the shape of the occluder polygon. */
        static canvasOccluderPolygonSetShape(occluderPolygon: Rid, shape: PackedVector2Array | Vector2[], closed: boolean): void
        
        /** Sets an occluder polygon's cull mode. */
        static canvasOccluderPolygonSetCullMode(occluderPolygon: Rid, mode: RenderingServer.CanvasOccluderPolygonCullMode): void
        
        /** Sets the [member ProjectSettings.rendering/2d/shadow_atlas/size] to use for [Light2D] shadow rendering (in pixels). The value is rounded up to the nearest power of 2. */
        static canvasSetShadowTextureSize(size: int64): void
        
        /** Creates a new global shader uniform.  
         *      
         *  **Note:** Global shader parameter names are case-sensitive.  
         */
        static globalShaderParameterAdd(name: StringName, type: RenderingServer.GlobalShaderParameterType, defaultValue: any): void
        
        /** Removes the global shader uniform specified by [param name]. */
        static globalShaderParameterRemove(name: StringName): void
        
        /** Returns the list of global shader uniform names.  
         *      
         *  **Note:** [method global_shader_parameter_get] has a large performance penalty as the rendering thread needs to synchronize with the calling thread, which is slow. Do not use this method during gameplay to avoid stuttering. If you need to read values in a script after setting them, consider creating an autoload where you store the values you need to query at the same time you're setting them as global parameters.  
         */
        static globalShaderParameterGetList(): GArray<StringName>
        
        /** Sets the global shader uniform [param name] to [param value]. */
        static globalShaderParameterSet(name: StringName, value: any): void
        
        /** Overrides the global shader uniform [param name] with [param value]. Equivalent to the [ShaderGlobalsOverride] node. */
        static globalShaderParameterSetOverride(name: StringName, value: any): void
        
        /** Returns the value of the global shader uniform specified by [param name].  
         *      
         *  **Note:** [method global_shader_parameter_get] has a large performance penalty as the rendering thread needs to synchronize with the calling thread, which is slow. Do not use this method during gameplay to avoid stuttering. If you need to read values in a script after setting them, consider creating an autoload where you store the values you need to query at the same time you're setting them as global parameters.  
         */
        static globalShaderParameterGet(name: StringName): any
        
        /** Returns the type associated to the global shader uniform specified by [param name].  
         *      
         *  **Note:** [method global_shader_parameter_get] has a large performance penalty as the rendering thread needs to synchronize with the calling thread, which is slow. Do not use this method during gameplay to avoid stuttering. If you need to read values in a script after setting them, consider creating an autoload where you store the values you need to query at the same time you're setting them as global parameters.  
         */
        static globalShaderParameterGetType(name: StringName): RenderingServer.GlobalShaderParameterType
        
        /** Tries to free an object in the RenderingServer. To avoid memory leaks, this should be called after using an object as memory management does not occur automatically when using RenderingServer directly. */
        static freeRid(rid: Rid): void
        
        /** Schedules a callback to the given callable after a frame has been drawn. */
        static requestFrameDrawnCallback(callable: Callable): void
        
        /** Returns `true` if changes have been made to the RenderingServer's data. [method force_draw] is usually called if this happens. */
        static hasChanged(): boolean
        
        /** Returns a statistic about the rendering engine which can be used for performance profiling. See also [method viewport_get_render_info], which returns information specific to a viewport.  
         *      
         *  **Note:** Only 3D rendering is currently taken into account by some of these values, such as the number of draw calls.  
         *      
         *  **Note:** Rendering information is not available until at least 2 frames have been rendered by the engine. If rendering information is not available, [method get_rendering_info] returns `0`. To print rendering information in `_ready()` successfully, use the following:  
         *    
         */
        static getRenderingInfo(info: RenderingServer.RenderingInfo): int64
        
        /** Returns the name of the video adapter (e.g. "GeForce GTX 1080/PCIe/SSE2").  
         *      
         *  **Note:** When running a headless or server binary, this function returns an empty string.  
         *      
         *  **Note:** On the web platform, some browsers such as Firefox may report a different, fixed GPU name such as "GeForce GTX 980" (regardless of the user's actual GPU model). This is done to make fingerprinting more difficult.  
         */
        static getVideoAdapterName(): string
        
        /** Returns the vendor of the video adapter (e.g. "NVIDIA Corporation").  
         *      
         *  **Note:** When running a headless or server binary, this function returns an empty string.  
         */
        static getVideoAdapterVendor(): string
        
        /** Returns the type of the video adapter. Since dedicated graphics cards from a given generation will  *usually*  be significantly faster than integrated graphics made in the same generation, the device type can be used as a basis for automatic graphics settings adjustment. However, this is not always true, so make sure to provide users with a way to manually override graphics settings.  
         *      
         *  **Note:** When using the OpenGL rendering driver or when running in headless mode, this function always returns [constant RenderingDevice.DEVICE_TYPE_OTHER].  
         */
        static getVideoAdapterType(): RenderingDevice.DeviceType
        
        /** Returns the version of the graphics video adapter  *currently in use*  (e.g. "1.2.189" for Vulkan, "3.3.0 NVIDIA 510.60.02" for OpenGL). This version may be different from the actual latest version supported by the hardware, as Godot may not always request the latest version. See also [method OS.get_video_adapter_driver_info].  
         *      
         *  **Note:** When running a headless or server binary, this function returns an empty string.  
         */
        static getVideoAdapterApiVersion(): string
        
        /** Returns the name of the current rendering driver. This can be `vulkan`, `d3d12`, `metal`, `opengl3`, `opengl3_es`, or `opengl3_angle`. See also [method get_current_rendering_method].  
         *  When [member ProjectSettings.rendering/renderer/rendering_method] is `forward_plus` or `mobile`, the rendering driver is determined by [member ProjectSettings.rendering/rendering_device/driver].  
         *  When [member ProjectSettings.rendering/renderer/rendering_method] is `gl_compatibility`, the rendering driver is determined by [member ProjectSettings.rendering/gl_compatibility/driver].  
         *  The rendering driver is also determined by the `--rendering-driver` command line argument that overrides this project setting, or an automatic fallback that is applied depending on the hardware.  
         */
        static getCurrentRenderingDriverName(): string
        
        /** Returns the name of the current rendering method. This can be `forward_plus`, `mobile`, or `gl_compatibility`. See also [method get_current_rendering_driver_name].  
         *  The rendering method is determined by [member ProjectSettings.rendering/renderer/rendering_method], the `--rendering-method` command line argument that overrides this project setting, or an automatic fallback that is applied depending on the hardware.  
         */
        static getCurrentRenderingMethod(): string
        
        /** Returns a mesh of a sphere with the given number of horizontal subdivisions, vertical subdivisions and radius. See also [method get_test_cube]. */
        static makeSphereMesh(latitudes: int64, longitudes: int64, radius: float64): Rid
        
        /** Returns the RID of the test cube. This mesh will be created and returned on the first call to [method get_test_cube], then it will be cached for subsequent calls. See also [method make_sphere_mesh]. */
        static getTestCube(): Rid
        
        /** Returns the RID of a 256×256 texture with a testing pattern on it (in [constant Image.FORMAT_RGB8] format). This texture will be created and returned on the first call to [method get_test_texture], then it will be cached for subsequent calls. See also [method get_white_texture].  
         *  **Example:** Get the test texture and apply it to a [Sprite2D] node:  
         *    
         */
        static getTestTexture(): Rid
        
        /** Returns the ID of a 4×4 white texture (in [constant Image.FORMAT_RGB8] format). This texture will be created and returned on the first call to [method get_white_texture], then it will be cached for subsequent calls. See also [method get_test_texture].  
         *  **Example:** Get the white texture and apply it to a [Sprite2D] node:  
         *    
         */
        static getWhiteTexture(): Rid
        
        /** Sets a boot image. The [param color] defines the background color. The value of [param stretch_mode] indicates how the image will be stretched (see [enum SplashStretchMode] for possible values). If [param use_filter] is `true`, the image will be scaled with linear interpolation. If [param use_filter] is `false`, the image will be scaled with nearest-neighbor interpolation. */
        static setBootImageWithStretch(image: Image, color: Color, stretchMode: RenderingServer.SplashStretchMode, useFilter?: boolean /* = true */): void
        
        /** Sets a boot image. The [param color] defines the background color. The value of [param scale] indicates if the image will be scaled to fit the screen size. If [param use_filter] is `true`, the image will be scaled with linear interpolation. If [param use_filter] is `false`, the image will be scaled with nearest-neighbor interpolation. */
        static setBootImage(image: Image, color: Color, scale: boolean, useFilter?: boolean /* = true */): void
        
        /** Returns the default clear color which is used when a specific clear color has not been selected. See also [method set_default_clear_color]. */
        static getDefaultClearColor(): Color
        
        /** Sets the default clear color which is used when a specific clear color has not been selected. See also [method get_default_clear_color]. */
        static setDefaultClearColor(color: Color): void
        
        /** Returns `true` if the OS supports a certain [param feature]. Features might be `s3tc`, `rgtc`, `bptc`, `etc`, `etc2`, `astc`, and `astc_hdr`. */
        static hasOsFeature(feature: string): boolean
        
        /** If [param generate] is `true`, generates debug wireframes for all meshes that are loaded when using the Compatibility renderer. By default, the engine does not generate debug wireframes at runtime, since they slow down loading of assets and take up VRAM.  
         *      
         *  **Note:** You must call this method before loading any meshes when using the Compatibility renderer. Otherwise, wireframes will not be used.  
         */
        static setDebugGenerateWireframes(generate: boolean): void
        
        /** Returns the time taken to setup rendering on the CPU in milliseconds. This value is shared across all viewports and does  *not*  require [method viewport_set_measure_render_time] to be enabled on a viewport to be queried. See also [method viewport_get_measured_render_time_cpu]. */
        static getFrameSetupTimeCpu(): float64
        
        /** Forces a synchronization between the CPU and GPU, which may be required in certain cases. Only call this when needed, as CPU-GPU synchronization has a performance cost. */
        static forceSync(): void
        
        /** Forces redrawing of all viewports at once. Must be called from the main thread. */
        static forceDraw(swapBuffers?: boolean /* = true */, frameStep?: float64 /* = 0 */): void
        
        /** Returns the global RenderingDevice.  
         *      
         *  **Note:** When using the OpenGL rendering driver or when running in headless mode, this function always returns `null`.  
         */
        static getRenderingDevice(): null | RenderingDevice
        
        /** Creates a RenderingDevice that can be used to do draw and compute operations on a separate thread. Cannot draw to the screen nor share data with the global RenderingDevice.  
         *      
         *  **Note:** When using the OpenGL rendering driver or when running in headless mode, this function always returns `null`.  
         */
        static createLocalRenderingDevice(): RenderingDevice
        
        /** Returns `true` if our code is currently executing on the rendering thread. */
        static isOnRenderThread(): boolean
        
        /** As the RenderingServer actual logic may run on a separate thread, accessing its internals from the main (or any other) thread will result in errors. To make it easier to run code that can safely access the rendering internals (such as [RenderingDevice] and similar RD classes), push a callable via this function so it will be executed on the render thread. */
        static callOnRenderThread(callable: Callable): void
        
        /** This method does nothing and always returns `false`. */
        static hasFeature(feature: RenderingServer.Features): boolean
        
        /** If `false`, disables rendering completely, but the engine logic is still being processed. You can call [method force_draw] to draw a frame even with rendering disabled. */
        static get renderLoopEnabled(): boolean
        static set renderLoopEnabled(value: boolean)
        
        /** Emitted at the beginning of the frame, before the RenderingServer updates all the Viewports. */
        static readonly framePreDraw: Signal<() => void>
        
        /** Emitted at the end of the frame, after the RenderingServer has finished updating all the Viewports. */
        static readonly framePostDraw: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderingServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderingServer;
    }
}
