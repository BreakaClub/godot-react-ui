declare module "godot" {
    // AUTO-GENERATED
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRHapticBase extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRHapticBase extends __NameMapResource {
    }
    /** OpenXR Haptic feedback base class.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrhapticbase.html  
     */
    class OpenXRHapticBase extends Resource {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRHapticBase;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRHapticBase;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRHapticVibration extends __RPCMapOpenXRHapticBase {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRHapticVibration extends __NameMapOpenXRHapticBase {
    }
    /** Vibration haptic feedback.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrhapticvibration.html  
     */
    class OpenXRHapticVibration extends OpenXRHapticBase {
        constructor(identifier?: any)
        /** The duration of the pulse in nanoseconds. Use `-1` for a minimum duration pulse for the current XR runtime. */
        get duration(): int64
        set duration(value: int64)
        
        /** The frequency of the pulse in Hz. `0.0` will let the XR runtime chose an optimal frequency for the device used. */
        get frequency(): float64
        set frequency(value: float64)
        
        /** The amplitude of the pulse between `0.0` and `1.0`. */
        get amplitude(): float64
        set amplitude(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRHapticVibration;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRHapticVibration;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRIPBinding extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRIPBinding extends __NameMapResource {
        get_binding_modifier_count: "getBindingModifierCount";
        get_binding_modifier: "getBindingModifier";
        get_path_count: "getPathCount";
        has_path: "hasPath";
        add_path: "addPath";
        remove_path: "removePath";
        binding_path: "bindingPath";
        binding_modifiers: "bindingModifiers";
    }
    /** Defines a binding between an [OpenXRAction] and an XR input or output.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxripbinding.html  
     */
    class OpenXRIPBinding extends Resource {
        constructor(identifier?: any)
        /** Get the number of binding modifiers for this binding. */
        getBindingModifierCount(): int64
        
        /** Get the [OpenXRBindingModifier] at this index. */
        getBindingModifier(index: int64): null | OpenXRActionBindingModifier
        
        /** Get the number of input/output paths in this binding. */
        getPathCount(): int64
        
        /** Returns `true` if this input/output path is part of this binding. */
        hasPath(path: string): boolean
        
        /** Add an input/output path to this binding. */
        addPath(path: string): void
        
        /** Removes this input/output path from this binding. */
        removePath(path: string): void
        
        /** [OpenXRAction] that is bound to [member binding_path]. */
        get action(): null | OpenXRAction
        set action(value: null | OpenXRAction)
        
        /** Binding path that defines the input or output bound to [member action].  
         *      
         *  **Note:** Binding paths are suggestions, an XR runtime may choose to bind the action to a different input or output emulating this input or output.  
         */
        get bindingPath(): string
        set bindingPath(value: string)
        
        /** Binding modifiers for this binding. */
        get bindingModifiers(): OpenXRActionBindingModifier
        set bindingModifiers(value: OpenXRActionBindingModifier)
        
        /** Paths that define the inputs or outputs bound on the device. */
        get paths(): PackedStringArray
        set paths(value: PackedStringArray | string[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRIPBinding;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRIPBinding;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRIPBindingModifier extends __RPCMapOpenXRBindingModifier {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRIPBindingModifier extends __NameMapOpenXRBindingModifier {
    }
    /** Binding modifier that applies directly on an interaction profile.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxripbindingmodifier.html  
     */
    class OpenXRIPBindingModifier extends OpenXRBindingModifier {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRIPBindingModifier;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRIPBindingModifier;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRInteractionProfile extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRInteractionProfile extends __NameMapResource {
        get_binding_count: "getBindingCount";
        get_binding: "getBinding";
        get_binding_modifier_count: "getBindingModifierCount";
        get_binding_modifier: "getBindingModifier";
        interaction_profile_path: "interactionProfilePath";
        binding_modifiers: "bindingModifiers";
    }
    /** Suggested bindings object for OpenXR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrinteractionprofile.html  
     */
    class OpenXRInteractionProfile extends Resource {
        constructor(identifier?: any)
        /** Get the number of bindings in this interaction profile. */
        getBindingCount(): int64
        
        /** Retrieve the binding at this index. */
        getBinding(index: int64): null | OpenXRIPBinding
        
        /** Get the number of binding modifiers in this interaction profile. */
        getBindingModifierCount(): int64
        
        /** Get the [OpenXRBindingModifier] at this index. */
        getBindingModifier(index: int64): null | OpenXRIPBindingModifier
        
        /** The interaction profile path identifying the XR device. */
        get interactionProfilePath(): string
        set interactionProfilePath(value: string)
        
        /** Action bindings for this interaction profile. */
        get bindings(): OpenXRIPBinding
        set bindings(value: OpenXRIPBinding)
        
        /** Binding modifiers for this interaction profile. */
        get bindingModifiers(): OpenXRIPBindingModifier
        set bindingModifiers(value: OpenXRIPBindingModifier)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRInteractionProfile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRInteractionProfile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRInteractionProfileEditor extends __RPCMapOpenXRInteractionProfileEditorBase {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRInteractionProfileEditor extends __NameMapOpenXRInteractionProfileEditorBase {
    }
    /** Default OpenXR interaction profile editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrinteractionprofileeditor.html  
     */
    class OpenXRInteractionProfileEditor<Map extends NodePathMap = any> extends OpenXRInteractionProfileEditorBase<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRInteractionProfileEditor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRInteractionProfileEditor;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRInteractionProfileEditorBase extends __RPCMapHBoxContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRInteractionProfileEditorBase extends __NameMapHBoxContainer {
        _add_binding: "_addBinding";
        _remove_binding: "_removeBinding";
    }
    /** Base class for editing interaction profiles.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrinteractionprofileeditorbase.html  
     */
    class OpenXRInteractionProfileEditorBase<Map extends NodePathMap = any> extends HBoxContainer<Map> {
        constructor(identifier?: any)
        /** Setup this editor for the provided [param action_map] and [param interaction_profile]. */
        setup(actionMap: OpenXRActionMap, interactionProfile: OpenXRInteractionProfile): void
        _addBinding(action: string, path: string): void
        _removeBinding(action: string, path: string): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRInteractionProfileEditorBase;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRInteractionProfileEditorBase;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRInteractionProfileMetadata extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRInteractionProfileMetadata extends __NameMapGObject {
        register_profile_rename: "registerProfileRename";
        register_path_rename: "registerPathRename";
        register_top_level_path: "registerTopLevelPath";
        register_interaction_profile: "registerInteractionProfile";
        register_io_path: "registerIOPath";
    }
    /** Meta class registering supported devices in OpenXR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrinteractionprofilemetadata.html  
     */
    class OpenXRInteractionProfileMetadata extends GObject {
        constructor(identifier?: any)
        /** Allows for renaming old interaction profile paths to new paths in order to load and process older action maps. */
        registerProfileRename(oldName: string, newName: string): void
        
        /** Allows for renaming old input/output paths to new paths in order to load and process older action maps. */
        registerPathRename(oldName: string, newName: string): void
        
        /** Registers a top level path to which profiles can be bound. For instance `/user/hand/left` refers to the bind point for the player's left hand. Extensions can register additional top level paths, for instance a haptic vest extension might register `/user/body/vest`.  
         *  [param display_name] is the name shown to the user. [param openxr_path] is the top level path being registered. [param openxr_extension_names] is optional and ensures the top level path is only used if the specified extension is available/enabled.  
         *  When a top level path ends up being bound by OpenXR, an [XRPositionalTracker] is instantiated to manage the state of the device.  
         */
        registerTopLevelPath(displayName: string, openxrPath: string, openxrExtensionNames: string): void
        
        /** Registers an interaction profile using its OpenXR designation (e.g. `/interaction_profiles/khr/simple_controller` is the profile for OpenXR's simple controller profile).  
         *  [param display_name] is the description shown to the user. [param openxr_path] is the interaction profile path being registered. [param openxr_extension_names] optionally restricts this profile to the given extension being enabled/available. If the extension is not available, the profile and all related entries used in an action map are filtered out.  
         */
        registerInteractionProfile(displayName: string, openxrPath: string, openxrExtensionNames: string): void
        
        /** Registers an input/output path for the given [param interaction_profile]. The profile should previously have been registered using [method register_interaction_profile]. [param display_name] is the description shown to the user. [param toplevel_path] specifies the bind path this input/output can be bound to (e.g. `/user/hand/left` or `/user/hand/right`). [param openxr_path] is the action input/output being registered (e.g. `/user/hand/left/input/aim/pose`). [param openxr_extension_names] restricts this input/output to an enabled/available extension, this doesn't need to repeat the extension on the profile but relates to overlapping extension (e.g. `XR_EXT_palm_pose` that introduces `…/input/palm_ext/pose` input paths). [param action_type] defines the type of input or output provided by OpenXR. */
        registerIOPath(interactionProfile: string, displayName: string, toplevelPath: string, openxrPath: string, openxrExtensionNames: string, actionType: OpenXRAction.ActionType): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRInteractionProfileMetadata;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRInteractionProfileMetadata;
    }
    namespace OpenXRInterface {
        enum SessionState {
            SessionStateUnknown = 0,
            SessionStateIdle = 1,
            SessionStateReady = 2,
            SessionStateSynchronized = 3,
            SessionStateVisible = 4,
            SessionStateFocused = 5,
            SessionStateStopping = 6,
            SessionStateLossPending = 7,
            SessionStateExiting = 8,
        }
        enum ViewConfiguration {
            ViewConfigurationMono = 0,
            ViewConfigurationStereo = 1,
            ViewConfigurationStereoWithInset = 2,
            ViewConfigurationUnset = 254,
            ViewConfigurationUnknown = 255,
        }
        enum Hand {
            HandLeft = 0,
            HandRight = 1,
            HandMax = 2,
        }
        enum HandMotionRange {
            HandMotionRangeUnobstructed = 0,
            HandMotionRangeConformToController = 1,
            HandMotionRangeMax = 2,
        }
        enum HandTrackedSource {
            HandTrackedSourceUnknown = 0,
            HandTrackedSourceUnobstructed = 1,
            HandTrackedSourceController = 2,
            HandTrackedSourceMax = 3,
        }
        enum HandJoints {
            HandJointPalm = 0,
            HandJointWrist = 1,
            HandJointThumbMetacarpal = 2,
            HandJointThumbProximal = 3,
            HandJointThumbDistal = 4,
            HandJointThumbTip = 5,
            HandJointIndexMetacarpal = 6,
            HandJointIndexProximal = 7,
            HandJointIndexIntermediate = 8,
            HandJointIndexDistal = 9,
            HandJointIndexTip = 10,
            HandJointMiddleMetacarpal = 11,
            HandJointMiddleProximal = 12,
            HandJointMiddleIntermediate = 13,
            HandJointMiddleDistal = 14,
            HandJointMiddleTip = 15,
            HandJointRingMetacarpal = 16,
            HandJointRingProximal = 17,
            HandJointRingIntermediate = 18,
            HandJointRingDistal = 19,
            HandJointRingTip = 20,
            HandJointLittleMetacarpal = 21,
            HandJointLittleProximal = 22,
            HandJointLittleIntermediate = 23,
            HandJointLittleDistal = 24,
            HandJointLittleTip = 25,
            HandJointMax = 26,
        }
        enum PerfSettingsLevel {
            PerfSettingsLevelPowerSavings = 0,
            PerfSettingsLevelSustainedLow = 1,
            PerfSettingsLevelSustainedHigh = 2,
            PerfSettingsLevelBoost = 3,
        }
        enum PerfSettingsSubDomain {
            PerfSettingsSubDomainCompositing = 0,
            PerfSettingsSubDomainRendering = 1,
            PerfSettingsSubDomainThermal = 2,
        }
        enum PerfSettingsNotificationLevel {
            PerfSettingsNotifLevelNormal = 0,
            PerfSettingsNotifLevelWarning = 1,
            PerfSettingsNotifLevelImpaired = 2,
        }
        enum HandJointFlags {
            HandJointNone = 0,
            HandJointOrientationValid = 1,
            HandJointOrientationTracked = 2,
            HandJointPositionValid = 4,
            HandJointPositionTracked = 8,
            HandJointLinearVelocityValid = 16,
            HandJointAngularVelocityValid = 32,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRInterface extends __RPCMapXRInterface {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRInterface extends __NameMapXRInterface {
        get_session_state: "getSessionState";
        is_user_presence_supported: "isUserPresenceSupported";
        is_user_present: "isUserPresent";
        get_active_view_configuration: "getActiveViewConfiguration";
        get_recommended_target_size: "getRecommendedTargetSize";
        is_foveation_supported: "isFoveationSupported";
        is_action_set_active: "isActionSetActive";
        set_action_set_active: "setActionSetActive";
        get_action_sets: "getActionSets";
        get_available_display_refresh_rates: "getAvailableDisplayRefreshRates";
        set_motion_range: "setMotionRange";
        get_motion_range: "getMotionRange";
        get_hand_tracking_source: "getHandTrackingSource";
        get_hand_joint_flags: "getHandJointFlags";
        get_hand_joint_rotation: "getHandJointRotation";
        get_hand_joint_position: "getHandJointPosition";
        get_hand_joint_radius: "getHandJointRadius";
        get_hand_joint_linear_velocity: "getHandJointLinearVelocity";
        get_hand_joint_angular_velocity: "getHandJointAngularVelocity";
        is_hand_tracking_supported: "isHandTrackingSupported";
        is_hand_interaction_supported: "isHandInteractionSupported";
        is_eye_gaze_interaction_supported: "isEyeGazeInteractionSupported";
        set_cpu_level: "setCpuLevel";
        set_gpu_level: "setGpuLevel";
        display_refresh_rate: "displayRefreshRate";
        render_target_size_multiplier: "renderTargetSizeMultiplier";
        foveation_level: "foveationLevel";
        foveation_dynamic: "foveationDynamic";
        foveation_with_subsampled_images: "foveationWithSubsampledImages";
        vrs_min_radius: "vrsMinRadius";
        vrs_strength: "vrsStrength";
        session_begun: "sessionBegun";
        session_stopping: "sessionStopping";
        session_synchronized: "sessionSynchronized";
        session_focussed: "sessionFocussed";
        session_visible: "sessionVisible";
        session_loss_pending: "sessionLossPending";
        instance_exiting: "instanceExiting";
        pose_recentered: "poseRecentered";
        refresh_rate_changed: "refreshRateChanged";
        cpu_level_changed: "cpuLevelChanged";
        gpu_level_changed: "gpuLevelChanged";
        user_presence_changed: "userPresenceChanged";
    }
    /** Our OpenXR interface.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrinterface.html  
     */
    class OpenXRInterface extends XRInterface {
        constructor(identifier?: any)
        /** Returns the current state of our OpenXR session. */
        getSessionState(): OpenXRInterface.SessionState
        
        /** Returns `true` if OpenXR's user presence extension is supported and enabled.  
         *      
         *  **Note:** This only returns a valid value after OpenXR has been initialized.  
         */
        isUserPresenceSupported(): boolean
        
        /** Returns `true` if system has detected the presence of a user in the XR experience. */
        isUserPresent(): boolean
        
        /** Gets the active view configuration.  
         *      
         *  **Note:** This will only return a valid value after OpenXR is initialized.  
         */
        getActiveViewConfiguration(): OpenXRInterface.ViewConfiguration
        
        /** Returns the recommended render target size from the OpenXR runtime.  
         *  This may not match the current render target size returned by [method XRInterface.get_render_target_size].  
         */
        getRecommendedTargetSize(): Vector2
        
        /** Returns `true` if OpenXR's foveation extension is supported. The interface must be initialized before this returns a valid value.  
         *      
         *  **Note:** When using the Vulkan rendering driver, [member Viewport.vrs_mode] must be set to [constant Viewport.VRS_XR] to support foveation.  
         */
        isFoveationSupported(): boolean
        
        /** Returns `true` if the given action set is active. */
        isActionSetActive(name: string): boolean
        
        /** Sets the given action set as active or inactive. */
        setActionSetActive(name: string, active: boolean): void
        
        /** Returns a list of action sets registered with Godot (loaded from the action map at runtime). */
        getActionSets(): GArray
        
        /** Returns a list of display refresh rates supported by the current HMD. Only returned if this feature is supported by the OpenXR runtime and after the interface has been initialized. */
        getAvailableDisplayRefreshRates(): GArray
        
        /** If handtracking is enabled and motion range is supported, sets the currently configured motion range for [param hand] to [param motion_range]. */
        setMotionRange(hand: OpenXRInterface.Hand, motionRange: OpenXRInterface.HandMotionRange): void
        
        /** If handtracking is enabled and motion range is supported, gets the currently configured motion range for [param hand]. */
        getMotionRange(hand: OpenXRInterface.Hand): OpenXRInterface.HandMotionRange
        
        /** If handtracking is enabled and hand tracking source is supported, gets the source of the hand tracking data for [param hand]. */
        getHandTrackingSource(hand: OpenXRInterface.Hand): OpenXRInterface.HandTrackedSource
        
        /** If handtracking is enabled, returns flags that inform us of the validity of the tracking data. */
        getHandJointFlags(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): OpenXRInterface.HandJointFlags
        
        /** If handtracking is enabled, returns the rotation of a joint ([param joint]) of a hand ([param hand]) as provided by OpenXR. */
        getHandJointRotation(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): Quaternion
        
        /** If handtracking is enabled, returns the position of a joint ([param joint]) of a hand ([param hand]) as provided by OpenXR. This is relative to [XROrigin3D] without worldscale applied! */
        getHandJointPosition(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): Vector3
        
        /** If handtracking is enabled, returns the radius of a joint ([param joint]) of a hand ([param hand]) as provided by OpenXR. This is without worldscale applied! */
        getHandJointRadius(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): float64
        
        /** If handtracking is enabled, returns the linear velocity of a joint ([param joint]) of a hand ([param hand]) as provided by OpenXR. This is relative to [XROrigin3D] without worldscale applied! */
        getHandJointLinearVelocity(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): Vector3
        
        /** If handtracking is enabled, returns the angular velocity of a joint ([param joint]) of a hand ([param hand]) as provided by OpenXR. This is relative to [XROrigin3D]! */
        getHandJointAngularVelocity(hand: OpenXRInterface.Hand, joint: OpenXRInterface.HandJoints): Vector3
        
        /** Returns `true` if OpenXR's hand tracking is supported and enabled.  
         *      
         *  **Note:** This only returns a valid value after OpenXR has been initialized.  
         */
        isHandTrackingSupported(): boolean
        
        /** Returns `true` if OpenXR's hand interaction profile is supported and enabled.  
         *      
         *  **Note:** This only returns a valid value after OpenXR has been initialized.  
         */
        isHandInteractionSupported(): boolean
        
        /** Returns the capabilities of the eye gaze interaction extension.  
         *      
         *  **Note:** This only returns a valid value after OpenXR has been initialized.  
         */
        isEyeGazeInteractionSupported(): boolean
        
        /** Sets the CPU performance level of the OpenXR device. */
        setCpuLevel(level: OpenXRInterface.PerfSettingsLevel): void
        
        /** Sets the GPU performance level of the OpenXR device. */
        setGpuLevel(level: OpenXRInterface.PerfSettingsLevel): void
        
        /** The display refresh rate for the current HMD. Only functional if this feature is supported by the OpenXR runtime and after the interface has been initialized. */
        get displayRefreshRate(): float64
        set displayRefreshRate(value: float64)
        
        /** The render size multiplier for the current HMD. Must be set before the interface has been initialized. */
        get renderTargetSizeMultiplier(): float64
        set renderTargetSizeMultiplier(value: float64)
        
        /** The foveation level, from `0` (off) to `3` (high). The interface must be initialized before this is accessible. */
        get foveationLevel(): int64
        set foveationLevel(value: int64)
        
        /** If `true`, enables dynamic foveation adjustment. The interface must be initialized before this is accessible. If enabled, foveation will automatically be adjusted between low and [member foveation_level]. */
        get foveationDynamic(): boolean
        set foveationDynamic(value: boolean)
        
        /** If `true`, enables subsampled images with foveation, which can provide a performance boost on Vulkan. */
        get foveationWithSubsampledImages(): boolean
        set foveationWithSubsampledImages(value: boolean)
        
        /** The minimum radius around the focal point where full quality is guaranteed if VRS is used as a percentage of screen size.  
         *      
         *  **Note:** Mobile and Forward+ renderers only. Requires [member Viewport.vrs_mode] to be set to [constant Viewport.VRS_XR].  
         */
        get vrsMinRadius(): float64
        set vrsMinRadius(value: float64)
        
        /** The strength used to calculate the VRS density map. The greater this value, the more noticeable VRS is. This improves performance at the cost of quality.  
         *      
         *  **Note:** Mobile and Forward+ renderers only. Requires [member Viewport.vrs_mode] to be set to [constant Viewport.VRS_XR].  
         */
        get vrsStrength(): float64
        set vrsStrength(value: float64)
        
        /** Informs our OpenXR session has been started. */
        readonly sessionBegun: Signal<() => void>
        
        /** Informs our OpenXR session is stopping. */
        readonly sessionStopping: Signal<() => void>
        
        /** Informs our OpenXR session has been synchronized. */
        readonly sessionSynchronized: Signal<() => void>
        
        /** Informs our OpenXR session now has focus, for example output is sent to the HMD and we're receiving XR input. */
        readonly sessionFocussed: Signal<() => void>
        
        /** Informs our OpenXR session is now visible, for example output is sent to the HMD but we don't receive XR input. */
        readonly sessionVisible: Signal<() => void>
        
        /** Informs our OpenXR session is in the process of being lost. */
        readonly sessionLossPending: Signal<() => void>
        
        /** Informs our OpenXR instance is exiting. */
        readonly instanceExiting: Signal<() => void>
        
        /** Informs the user queued a recenter of the player position. */
        readonly poseRecentered: Signal<() => void>
        
        /** Informs the user the HMD refresh rate has changed.  
         *      
         *  **Note:** Only emitted if XR runtime supports the refresh rate extension.  
         */
        readonly refreshRateChanged: Signal<(refreshRate: float64) => void>
        
        /** Informs the device CPU performance level has changed in the specified subdomain. */
        readonly cpuLevelChanged: Signal<(subDomain: int64, fromLevel: int64, toLevel: int64) => void>
        
        /** Informs the device GPU performance level has changed in the specified subdomain. */
        readonly gpuLevelChanged: Signal<(subDomain: int64, fromLevel: int64, toLevel: int64) => void>
        
        /** Signal emitted when the user presence value changes.  
         *      
         *  **Note:** This signal will not be emitted during application startup and application shutdown. Developers should assume user presence is gained on startup and lost on shutdown.  
         */
        readonly userPresenceChanged: Signal<(isUserPresent: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRInterface;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRInterface;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRMarkerTracker extends __RPCMapOpenXRSpatialEntityTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRMarkerTracker extends __NameMapOpenXRSpatialEntityTracker {
        set_marker_data: "setMarkerData";
        get_marker_data: "getMarkerData";
        bounds_size: "boundsSize";
        marker_type: "markerType";
        marker_id: "markerId";
    }
    /** Spatial entity tracker for our spatial entity marker tracking extension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrmarkertracker.html  
     */
    class OpenXRMarkerTracker extends OpenXRSpatialEntityTracker {
        constructor(identifier?: any)
        /** Sets the marker data for this marker.  
         *      
         *  **Note:** This should only be set by marker discovery logic.  
         */
        setMarkerData(markerData: any): void
        
        /** Returns the marker data for this marker. This can return a [String] or [PackedByteArray]. Only applicable to QR Code based markers. */
        getMarkerData(): any
        
        /** The bounds size for this marker. */
        get boundsSize(): int64
        set boundsSize(value: int64)
        
        /** The type of marker. */
        get markerType(): int64
        set markerType(value: int64)
        
        /** The marker ID for this marker, this is only returned for ArUco and April Tag markers. Call [method get_marker_data] for QRCode markers. */
        get markerId(): int64
        set markerId(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRMarkerTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRMarkerTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRPlaneTracker extends __RPCMapOpenXRSpatialEntityTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRPlaneTracker extends __NameMapOpenXRSpatialEntityTracker {
        set_mesh_data: "setMeshData";
        clear_mesh_data: "clearMeshData";
        get_mesh_offset: "getMeshOffset";
        get_vertices: "getVertices";
        get_indices: "getIndices";
        get_mesh: "getMesh";
        get_shape: "getShape";
        bounds_size: "boundsSize";
        plane_alignment: "planeAlignment";
        plane_label: "planeLabel";
        mesh_changed: "meshChanged";
    }
    /** Spatial entity tracker for our spatial entity plane tracking extension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrplanetracker.html  
     */
    class OpenXRPlaneTracker extends OpenXRSpatialEntityTracker {
        constructor(identifier?: any)
        /** Sets the mesh data for this plane. You should only call this if you are handling your own discovery logic. */
        setMeshData(origin: Transform3D, vertices: PackedVector2Array | Vector2[], indices?: PackedInt32Array | int32[] /* = [] */): void
        
        /** Clears the mesh data for this tracker. You should only call this if you are handling your own discovery logic. */
        clearMeshData(): void
        
        /** Gets the transform by which to offset the mesh and collision shape from our pose to display these correctly. */
        getMeshOffset(): Transform3D
        
        /** Gets the vertex data for the mesh. */
        getVertices(): PackedVector2Array
        
        /** Gets the index data for the mesh. */
        getIndices(): PackedInt32Array
        
        /** Gets a mesh created from either the mesh data or from our bounding size for this plane. This mesh is cached and will return the same resource when called while vertex and index data remains unchanged. */
        getMesh(): null | Mesh
        
        /** Gets a collision shape built either from the mesh data or from our bounding size for this plane. */
        getShape(thickness?: float64 /* = 0.01 */): null | Shape3D
        
        /** The bounding size of the plane. This is a 2D size. */
        get boundsSize(): int64
        set boundsSize(value: int64)
        
        /** The main alignment in space of this plane. */
        get planeAlignment(): int64
        set planeAlignment(value: int64)
        
        /** The semantic label for this plane. */
        get planeLabel(): string
        set planeLabel(value: string)
        
        /** Emitted when our mesh data has changed the mesh instance and collision needs to be updated. */
        readonly meshChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRPlaneTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRPlaneTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRRenderModel extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRRenderModel extends __NameMapNode3D {
        get_top_level_path: "getTopLevelPath";
        render_model: "renderModel";
        render_model_top_level_path_changed: "renderModelTopLevelPathChanged";
    }
    /** This node will display an OpenXR render model.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrrendermodel.html  
     */
    class OpenXRRenderModel<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the top level path related to this render model. */
        getTopLevelPath(): string
        
        /** The render model RID for the render model to load, as returned by [method OpenXRRenderModelExtension.render_model_create] or [method OpenXRRenderModelExtension.render_model_get_all]. */
        get renderModel(): Rid
        set renderModel(value: Rid)
        
        /** Emitted when the top level path of this render model has changed. */
        readonly renderModelTopLevelPathChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRRenderModel;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRRenderModel;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRRenderModelExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRRenderModelExtension extends __NameMapOpenXRExtensionWrapper {
        is_active: "isActive";
        render_model_create: "renderModelCreate";
        render_model_destroy: "renderModelDestroy";
        render_model_get_all: "renderModelGetAll";
        render_model_new_scene_instance: "renderModelNewSceneInstance";
        render_model_get_subaction_paths: "renderModelGetSubactionPaths";
        render_model_get_top_level_path: "renderModelGetTopLevelPath";
        render_model_get_confidence: "renderModelGetConfidence";
        render_model_get_root_transform: "renderModelGetRootTransform";
        render_model_get_animatable_node_count: "renderModelGetAnimatableNodeCount";
        render_model_get_animatable_node_name: "renderModelGetAnimatableNodeName";
        render_model_is_animatable_node_visible: "renderModelIsAnimatableNodeVisible";
        render_model_get_animatable_node_transform: "renderModelGetAnimatableNodeTransform";
        render_model_added: "renderModelAdded";
        render_model_removed: "renderModelRemoved";
        render_model_top_level_path_changed: "renderModelTopLevelPathChanged";
    }
    /** This class implements the OpenXR Render Model Extension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrrendermodelextension.html  
     */
    class OpenXRRenderModelExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if OpenXR's render model extension is supported and enabled.  
         *      
         *  **Note:** This only returns a valid value after OpenXR has been initialized.  
         */
        isActive(): boolean
        
        /** Creates a render model object within OpenXR using a render model id.  
         *      
         *  **Note:** This function is exposed for dependent OpenXR extensions that provide render model ids to be used with the render model extension.  
         */
        renderModelCreate(renderModelId: int64): Rid
        
        /** Destroys a render model object within OpenXR that was previously created with [method render_model_create].  
         *      
         *  **Note:** This function is exposed for dependent OpenXR extensions that provide render model ids to be used with the render model extension.  
         */
        renderModelDestroy(renderModel: Rid): void
        
        /** Returns an array of all currently active render models registered with this extension. */
        renderModelGetAll(): GArray<Rid>
        
        /** Returns an instance of a subscene that contains all [MeshInstance3D] nodes that allow you to visualize the render model. */
        renderModelNewSceneInstance(renderModel: Rid): null | Node3D
        
        /** Returns a list of active subaction paths for this [param render_model].  
         *      
         *  **Note:** If different devices are bound to your actions than available in suggested interaction bindings, this information shows paths related to the interaction bindings being mimicked by that device.  
         */
        renderModelGetSubactionPaths(renderModel: Rid): PackedStringArray
        
        /** Returns the top level path associated with this [param render_model]. If provided this identifies whether the render model is associated with the player's hands or other body part. */
        renderModelGetTopLevelPath(renderModel: Rid): string
        
        /** Returns the tracking confidence of the tracking data for the render model. */
        renderModelGetConfidence(renderModel: Rid): XRPose.TrackingConfidence
        
        /** Returns the root transform of a render model. This is the tracked position relative to our [XROrigin3D] node. */
        renderModelGetRootTransform(renderModel: Rid): Transform3D
        
        /** Returns the number of animatable nodes this render model has. */
        renderModelGetAnimatableNodeCount(renderModel: Rid): int64
        
        /** Returns the name of the given animatable node. */
        renderModelGetAnimatableNodeName(renderModel: Rid, index: int64): string
        
        /** Returns `true` if this animatable node should be visible. */
        renderModelIsAnimatableNodeVisible(renderModel: Rid, index: int64): boolean
        
        /** Returns the current local transform for an animatable node. This is updated every frame. */
        renderModelGetAnimatableNodeTransform(renderModel: Rid, index: int64): Transform3D
        
        /** Emitted when a new render model is added. */
        readonly renderModelAdded: Signal<(renderModel: Rid) => void>
        
        /** Emitted when a render model is removed. */
        readonly renderModelRemoved: Signal<(renderModel: Rid) => void>
        
        /** Emitted when the top level path associated with a render model changed. */
        readonly renderModelTopLevelPathChanged: Signal<(renderModel: Rid) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRRenderModelExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRRenderModelExtension;
    }
    namespace OpenXRRenderModelManager {
        enum RenderModelTracker {
            RenderModelTrackerAny = 0,
            RenderModelTrackerNoneSet = 1,
            RenderModelTrackerLeftHand = 2,
            RenderModelTrackerRightHand = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRRenderModelManager extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRRenderModelManager extends __NameMapNode3D {
        make_local_to_pose: "makeLocalToPose";
        render_model_added: "renderModelAdded";
        render_model_removed: "renderModelRemoved";
    }
    /** Helper node that will automatically manage displaying render models.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrrendermodelmanager.html  
     */
    class OpenXRRenderModelManager<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Limits render models to the specified tracker. Include: 0 = All render models, 1 = Render models not related to a tracker, 2 = Render models related to the left hand tracker, 3 = Render models related to the right hand tracker. */
        get tracker(): int64
        set tracker(value: int64)
        
        /** Position render models local to this pose (this will adjust the position of the render models container node). */
        get makeLocalToPose(): string
        set makeLocalToPose(value: string)
        
        /** Emitted when a render model node is added as a child to this node. */
        readonly renderModelAdded: Signal<(renderModel: OpenXRRenderModel) => void>
        
        /** Emitted when a render model child node is about to be removed from this node. */
        readonly renderModelRemoved: Signal<(renderModel: OpenXRRenderModel) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRRenderModelManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRRenderModelManager;
    }
    namespace OpenXRSpatialAnchorCapability {
        enum PersistenceScope {
            PersistenceScopeSystemManaged = 1,
            PersistenceScopeLocalAnchors = 1000781000,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialAnchorCapability extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialAnchorCapability extends __NameMapOpenXRExtensionWrapper {
        is_spatial_anchor_supported: "isSpatialAnchorSupported";
        is_spatial_persistence_supported: "isSpatialPersistenceSupported";
        is_persistence_scope_supported: "isPersistenceScopeSupported";
        create_default_persistence_context: "createDefaultPersistenceContext";
        create_persistence_context: "createPersistenceContext";
        get_persistence_context_handle: "getPersistenceContextHandle";
        free_persistence_context: "freePersistenceContext";
        create_new_anchor: "createNewAnchor";
        remove_anchor: "removeAnchor";
        persist_anchor: "persistAnchor";
        unpersist_anchor: "unpersistAnchor";
        start_entity_discovery: "startEntityDiscovery";
        do_entity_update: "doEntityUpdate";
    }
    /** Implementation for handling spatial entity anchor logic.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialanchorcapability.html  
     */
    class OpenXRSpatialAnchorCapability extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if spatial anchors are supported by the hardware. Only returns a valid value after OpenXR has been initialized. */
        isSpatialAnchorSupported(): boolean
        
        /** Returns `true` if persistent spatial anchors are supported by the hardware. Only returns a valid value after OpenXR has been initialized. */
        isSpatialPersistenceSupported(): boolean
        
        /** Returns `true` if this persistence scope is supported by our spatial anchor capability.  
         *      
         *  **Note:** Only valid after an OpenXR instance has been created.  
         */
        isPersistenceScopeSupported(scope: OpenXRSpatialAnchorCapability.PersistenceScope): boolean
        
        /** Calls [method create_persistence_context] with a configuration that likely works with the XR runtime.  
         *  [param user_callback] is called when the context is created.  
         */
        createDefaultPersistenceContext(userCallback?: Callable /* = new Callable() */): OpenXRFutureResult
        
        /** Creates a new persistence context for storing persistent data.  
         *      
         *  **Note:** This is an asynchronous method and returns an [OpenXRFutureResult] object with which to track the status, discarding this object will not cancel the creation process. On success [param user_callback] will be called if specified. The result value for this function is the [RID] for our persistence context.  
         */
        createPersistenceContext(scope: OpenXRSpatialAnchorCapability.PersistenceScope, userCallback?: Callable /* = new Callable() */): OpenXRFutureResult
        
        /** Returns the internal handle for this persistence context.  
         *      
         *  **Note:** For GDExtension implementations.  
         */
        getPersistenceContextHandle(persistenceContext: Rid): int64
        
        /** Frees a persistence context previously created with [method create_persistence_context]. */
        freePersistenceContext(persistenceContext: Rid): void
        
        /** Creates a new anchor that will be tracked by the XR runtime. The [param transform] should be a transform in the local space of your [XROrigin3D] node. If [param spatial_context] is not specified the default will be used, this requires [member ProjectSettings.xr/openxr/extensions/spatial_entity/enable_builtin_anchor_detection] to be set. The returned tracker will track the location in case our reference space changes.  
         *  [param next] must be a valid next object for the `XrSpatialAnchorCreateInfoEXT` chain.  
         */
        createNewAnchor(transform: Transform3D, spatialContext?: Rid /* = new Rid() */, next?: OpenXRStructureBase): OpenXRAnchorTracker
        
        /** Remove an anchor previously created with [method create_new_anchor]. If this anchor was persistent you must first call [method unpersist_anchor] and await its callback. */
        removeAnchor(anchorTracker: OpenXRAnchorTracker): void
        
        /** Changes this anchor into a persistent anchor. This means its location will be stored on the device and the anchor will be restored the next time your application starts. If [param persistence_context] is not specified the default will be used, this requires [member ProjectSettings.xr/openxr/extensions/spatial_entity/enable_builtin_anchor_detection] to be set.  
         *      
         *  **Note:** This is an asynchronous method and returns an [OpenXRFutureResult] object with which to track the status, discarding this object will not cancel the creation process. On success [param user_callback] will be called if specified. The result value for this function is a boolean which will be set to `true` on successful completion.  
         */
        persistAnchor(anchorTracker: OpenXRAnchorTracker, persistenceContext?: Rid /* = new Rid() */, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Removes the persistent data from this anchor. The runtime will not recreate the anchor when your application restarts. If [param persistence_context] is not specified the default will be used, this requires [member ProjectSettings.xr/openxr/extensions/spatial_entity/enabled] to be set.  
         *      
         *  **Note:** This is an asynchronous method and returns an [OpenXRFutureResult] object with which to track the status, discarding this object will not cancel the creation process. On success [param user_callback] will be called if specified. The result value for this function is a boolean which will be set to `true` on successful completion.  
         */
        unpersistAnchor(anchorTracker: OpenXRAnchorTracker, persistenceContext?: Rid /* = new Rid() */, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Calls [method OpenXRSpatialEntityExtension.discover_spatial_entities] and [method OpenXRSpatialEntityExtension.query_snapshot] with the anchor entities associated with [param spatial_context].  
         *  [param component_data] are the [OpenXRSpatialComponentData]s to discover for this anchor capability.  
         *  If [param next_snapshot_create] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         *  If [param next_snapshot_query] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.query_snapshot].  
         *  [param user_callback], when non-null, is called with two parameters usually twice. The first parameter is the [RID] of the discovery snapshot and the second parameter is a boolean where `false` indicates the discovery snapshot is about to be processed, and `true` indicates the discovery snapshot has been processed and [param component_data] has valid data. The second call is skipped if an error was encountered.  
         *  The returned [OpenXRFutureResult] is identical to the return from [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         */
        startEntityDiscovery(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, nextSnapshotCreate?: OpenXRStructureBase, nextSnapshotQuery?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Calls [method OpenXRSpatialEntityExtension.update_spatial_entities] and [method OpenXRSpatialEntityExtension.query_snapshot] with the anchor entities associated with [param spatial_context].  
         *  [param component_data] are the [OpenXRSpatialComponentData]s to update for this anchor capability.  
         *  If [param next_snapshot_create] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.update_spatial_entities].  
         *  If [param next_snapshot_query] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.query_snapshot].  
         */
        doEntityUpdate(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, nextSnapshotCreate?: OpenXRStructureBase, nextSnapshotQuery?: OpenXRStructureBase): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialAnchorCapability;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialAnchorCapability;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationAnchor extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationAnchor extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        get_enabled_components: "getEnabledComponents";
    }
    /** Configuration header for spatial anchors.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationanchor.html  
     */
    class OpenXRSpatialCapabilityConfigurationAnchor extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationAnchor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationAnchor;
    }
    namespace OpenXRSpatialCapabilityConfigurationAprilTag {
        enum AprilTagDict {
            AprilTagDict16H5 = 1,
            AprilTagDict25H9 = 2,
            AprilTagDict36H10 = 3,
            AprilTagDict36H11 = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationAprilTag extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationAprilTag extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        get_enabled_components: "getEnabledComponents";
        april_dict: "aprilDict";
    }
    /** Configuration header for April tag markers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationapriltag.html  
     */
    class OpenXRSpatialCapabilityConfigurationAprilTag extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        
        /** Dictionary to use to decode April tags.  
         *      
         *  **Note:** Must be set before using this configuration to create a spatial context.  
         */
        get aprilDict(): int64
        set aprilDict(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationAprilTag;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationAprilTag;
    }
    namespace OpenXRSpatialCapabilityConfigurationAruco {
        enum ArucoDict {
            ArucoDict4X450 = 1,
            ArucoDict4X4100 = 2,
            ArucoDict4X4250 = 3,
            ArucoDict4X41000 = 4,
            ArucoDict5X550 = 5,
            ArucoDict5X5100 = 6,
            ArucoDict5X5250 = 7,
            ArucoDict5X51000 = 8,
            ArucoDict6X650 = 9,
            ArucoDict6X6100 = 10,
            ArucoDict6X6250 = 11,
            ArucoDict6X61000 = 12,
            ArucoDict7X750 = 13,
            ArucoDict7X7100 = 14,
            ArucoDict7X7250 = 15,
            ArucoDict7X71000 = 16,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationAruco extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationAruco extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        get_enabled_components: "getEnabledComponents";
        aruco_dict: "arucoDict";
    }
    /** Configuration header for ArUco markers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationaruco.html  
     */
    class OpenXRSpatialCapabilityConfigurationAruco extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        
        /** Dictionary to use to decode ArUco markers.  
         *      
         *  **Note:** Must be set before using this configuration to create a spatial context.  
         */
        get arucoDict(): int64
        set arucoDict(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationAruco;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationAruco;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader extends __NameMapRefCounted {
        _has_valid_configuration: "_hasValidConfiguration";
        _get_configuration: "_getConfiguration";
        has_valid_configuration: "hasValidConfiguration";
        get_configuration: "getConfiguration";
    }
    /** Wrapper base class for OpenXR Spatial Capability Configuration headers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationbaseheader.html  
     */
    class OpenXRSpatialCapabilityConfigurationBaseHeader extends RefCounted {
        constructor(identifier?: any)
        /** Return `true` if this object contains a valid configuration that can be retrieved when calling [method _get_configuration]. */
        /* gdvirtual */ _hasValidConfiguration(): boolean
        
        /** Return a pointer (encoded as an `int64_t`) to a struct holding the spatial capability configuration data. The memory for this struct should remain accessible as long as this object remains instantiated. */
        /* gdvirtual */ _getConfiguration(): int64
        
        /** Returns `true` if this object contains a valid configuration that can be used when calling [method OpenXRSpatialEntityExtension.create_spatial_context]. */
        hasValidConfiguration(): boolean
        
        /** Gets a pointer to the `XrSpatialCapabilityConfigurationBaseHeaderEXT` struct.  
         *      
         *  **Note:** This method is intended to be used from GDExtensions.  
         */
        getConfiguration(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationMicroQrCode extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationMicroQrCode extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        get_enabled_components: "getEnabledComponents";
    }
    /** Configuration header for QR code markers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationmicroqrcode.html  
     */
    class OpenXRSpatialCapabilityConfigurationMicroQrCode extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationMicroQrCode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationMicroQrCode;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationPlaneTracking extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationPlaneTracking extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        supports_mesh_2d: "supportsMesh2D";
        supports_polygons: "supportsPolygons";
        supports_labels: "supportsLabels";
        get_enabled_components: "getEnabledComponents";
    }
    /** Configuration header for plane tracking.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationplanetracking.html  
     */
    class OpenXRSpatialCapabilityConfigurationPlaneTracking extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns `true` if we support the mesh 2D component (only valid after the OpenXR session has started). You can query these using the [OpenXRSpatialComponentMesh2DList] data object. */
        supportsMesh2D(): boolean
        
        /** Returns `true` if we support the polygon 2D component (only valid after the OpenXR session has started). You can query these using the [OpenXRSpatialComponentPolygon2DList] data object. */
        supportsPolygons(): boolean
        
        /** Returns `true` if we support the plane semantic label component (only valid after the OpenXR session has started). You can query these using the [OpenXRSpatialComponentPlaneSemanticLabelList] data object. */
        supportsLabels(): boolean
        
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationPlaneTracking;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationPlaneTracking;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialCapabilityConfigurationQrCode extends __RPCMapOpenXRSpatialCapabilityConfigurationBaseHeader {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialCapabilityConfigurationQrCode extends __NameMapOpenXRSpatialCapabilityConfigurationBaseHeader {
        get_enabled_components: "getEnabledComponents";
    }
    /** Configuration header for micro QR code markers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcapabilityconfigurationqrcode.html  
     */
    class OpenXRSpatialCapabilityConfigurationQrCode extends OpenXRSpatialCapabilityConfigurationBaseHeader {
        constructor(identifier?: any)
        /** Returns the components enabled by this configuration.  
         *      
         *  **Note:** Only valid after this configuration was used to create a spatial context.  
         */
        getEnabledComponents(): PackedInt64Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialCapabilityConfigurationQrCode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialCapabilityConfigurationQrCode;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentAnchorList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentAnchorList extends __NameMapOpenXRSpatialComponentData {
        get_entity_pose: "getEntityPose";
    }
    /** Object for storing the queries anchor result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentanchorlist.html  
     */
    class OpenXRSpatialComponentAnchorList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the transform for the entity at this [param index]. */
        getEntityPose(index: int64): Transform3D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentAnchorList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentAnchorList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentBounded2DList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentBounded2DList extends __NameMapOpenXRSpatialComponentData {
        get_center_pose: "getCenterPose";
        get_size: "getSize";
    }
    /** Object for storing the queries bounded2d result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentbounded2dlist.html  
     */
    class OpenXRSpatialComponentBounded2DList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the center of our bounding rectangle for the entity at this [param index]. */
        getCenterPose(index: int64): Transform3D
        
        /** Returns the size of our bounding rectangle for the entity at this [param index]. */
        getSize(index: int64): Vector2
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentBounded2DList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentBounded2DList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentBounded3DList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentBounded3DList extends __NameMapOpenXRSpatialComponentData {
        get_center_pose: "getCenterPose";
        get_size: "getSize";
    }
    /** Object for storing the queries bounded3d result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentbounded3dlist.html  
     */
    class OpenXRSpatialComponentBounded3DList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the center of our bounding box for the entity at this [param index]. */
        getCenterPose(index: int64): Transform3D
        
        /** Returns the size of our bounding box for the entity at this [param index]. */
        getSize(index: int64): Vector3
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentBounded3DList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentBounded3DList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentData extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentData extends __NameMapRefCounted {
        _set_capacity: "_setCapacity";
        _get_component_type: "_getComponentType";
        _get_structure_data: "_getStructureData";
        set_capacity: "setCapacity";
        get_component_type: "getComponentType";
    }
    /** Object for storing OpenXR spatial entity component data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentdata.html  
     */
    class OpenXRSpatialComponentData extends RefCounted {
        constructor(identifier?: any)
        /** Sets the expected capacity as provided by the spatial entities query system. Buffers should be initialized with the correct storage. */
        /* gdvirtual */ _setCapacity(capacity: int64): void
        
        /** Return the component type for the component we store data for. */
        /* gdvirtual */ _getComponentType(): int64
        
        /** Return a pointer to the structure data that will be submitted along with the snapshot query. This pointer must remain valid as long as this object is instantiated. */
        /* gdvirtual */ _getStructureData(next: int64): int64
        
        /** Sets the expected capacity as provided by the spatial entities query system. Buffers should be initialized with the correct storage. */
        setCapacity(capacity: int64): void
        
        /** Gets this [OpenXRSpatialComponentData]'s `XrSpatialComponentTypeEXT`. */
        getComponentType(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentData;
    }
    namespace OpenXRSpatialComponentMarkerList {
        enum MarkerType {
            MarkerTypeUnknown = 0,
            MarkerTypeQrcode = 1,
            MarkerTypeMicroQrcode = 2,
            MarkerTypeAruco = 3,
            MarkerTypeAprilTag = 4,
            MarkerTypeMax = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentMarkerList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentMarkerList extends __NameMapOpenXRSpatialComponentData {
        get_marker_type: "getMarkerType";
        get_marker_id: "getMarkerId";
        get_marker_data: "getMarkerData";
    }
    /** Object for storing the queries marker result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentmarkerlist.html  
     */
    class OpenXRSpatialComponentMarkerList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the marker type for the marker at this [param index]. */
        getMarkerType(index: int64): OpenXRSpatialComponentMarkerList.MarkerType
        
        /** Returns the marker ID for the marker at this [param index]. Only applicable for ArUco or April Tag markers. */
        getMarkerId(index: int64): int64
        
        /** Returns either a [String] or a [PackedByteArray] buffer with data for the marker at this [param index]. Only applicable for QR code markers. */
        getMarkerData(snapshot: Rid, index: int64): any
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentMarkerList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentMarkerList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentMesh2DList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentMesh2DList extends __NameMapOpenXRSpatialComponentData {
        get_transform: "getTransform";
        get_vertices: "getVertices";
        get_indices: "getIndices";
    }
    /** Object for storing the queries mesh2d result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentmesh2dlist.html  
     */
    class OpenXRSpatialComponentMesh2DList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the transform for positioning our mesh for the entity at this [param index]. */
        getTransform(index: int64): Transform3D
        
        /** Returns the mesh vertices for the entity at this [param index]. */
        getVertices(snapshot: Rid, index: int64): PackedVector2Array
        
        /** Returns the mesh indices for the entity at this [param index]. */
        getIndices(snapshot: Rid, index: int64): PackedInt32Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentMesh2DList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentMesh2DList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentMesh3DList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentMesh3DList extends __NameMapOpenXRSpatialComponentData {
        get_transform: "getTransform";
        get_mesh: "getMesh";
    }
    /** Object for storing the queries mesh3d result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentmesh3dlist.html  
     */
    class OpenXRSpatialComponentMesh3DList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the transform for positioning our mesh for the entity at this [param index]. */
        getTransform(index: int64): Transform3D
        
        /** Returns the mesh for the entity at this [param index]. */
        getMesh(index: int64): null | Mesh
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentMesh3DList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentMesh3DList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentParentList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentParentList extends __NameMapOpenXRSpatialComponentData {
        get_parent: "getParent";
    }
    /** Object for storing the queries parent result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentparentlist.html  
     */
    class OpenXRSpatialComponentParentList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the RID for the parent entity at this [param index]. */
        getParent(index: int64): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentParentList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentParentList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentPersistenceList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentPersistenceList extends __NameMapOpenXRSpatialComponentData {
        get_persistent_uuid: "getPersistentUuid";
        get_persistent_state: "getPersistentState";
    }
    /** Object for storing the query persistence result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentpersistencelist.html  
     */
    class OpenXRSpatialComponentPersistenceList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the persistent uuid for the entity at this [param index]. */
        getPersistentUuid(index: int64): string
        
        /** Returns the persistent state (`XrSpatialPersistenceStateEXT`) for the entity at this [param index]. */
        getPersistentState(index: int64): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentPersistenceList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentPersistenceList;
    }
    namespace OpenXRSpatialComponentPlaneAlignmentList {
        enum PlaneAlignment {
            PlaneAlignmentHorizontalUpward = 0,
            PlaneAlignmentHorizontalDownward = 1,
            PlaneAlignmentVertical = 2,
            PlaneAlignmentArbitrary = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentPlaneAlignmentList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentPlaneAlignmentList extends __NameMapOpenXRSpatialComponentData {
        get_plane_alignment: "getPlaneAlignment";
    }
    /** Object for storing the queries plane alignment result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentplanealignmentlist.html  
     */
    class OpenXRSpatialComponentPlaneAlignmentList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the plane alignment for the parent entity at this [param index]. */
        getPlaneAlignment(index: int64): OpenXRSpatialComponentPlaneAlignmentList.PlaneAlignment
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentPlaneAlignmentList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentPlaneAlignmentList;
    }
    namespace OpenXRSpatialComponentPlaneSemanticLabelList {
        enum PlaneSemanticLabel {
            PlaneSemanticLabelUncategorized = 1,
            PlaneSemanticLabelFloor = 2,
            PlaneSemanticLabelWall = 3,
            PlaneSemanticLabelCeiling = 4,
            PlaneSemanticLabelTable = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentPlaneSemanticLabelList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentPlaneSemanticLabelList extends __NameMapOpenXRSpatialComponentData {
        get_plane_semantic_label: "getPlaneSemanticLabel";
    }
    /** Object for storing the queries plane semantic label result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentplanesemanticlabellist.html  
     */
    class OpenXRSpatialComponentPlaneSemanticLabelList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the plane semantic label for the parent entity at this [param index]. */
        getPlaneSemanticLabel(index: int64): OpenXRSpatialComponentPlaneSemanticLabelList.PlaneSemanticLabel
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentPlaneSemanticLabelList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentPlaneSemanticLabelList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialComponentPolygon2DList extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialComponentPolygon2DList extends __NameMapOpenXRSpatialComponentData {
        get_transform: "getTransform";
        get_vertices: "getVertices";
    }
    /** Object for storing the queries polygon2d result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcomponentpolygon2dlist.html  
     */
    class OpenXRSpatialComponentPolygon2DList extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the transform for positioning our polygon for the entity at this [param index]. */
        getTransform(index: int64): Transform3D
        
        /** Returns the polygon vertices for the entity at this [param index]. */
        getVertices(snapshot: Rid, index: int64): PackedVector2Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialComponentPolygon2DList;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialComponentPolygon2DList;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialContainerExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialContainerExtension extends __NameMapOpenXRExtensionWrapper {
        is_enabled: "isEnabled";
        is_spatial_container_active: "isSpatialContainerActive";
        get_supported_bounds_modes: "getSupportedBoundsModes";
        get_spatial_container_state: "getSpatialContainerState";
        get_spatial_container_bounds: "getSpatialContainerBounds";
        request_spatial_container_bounds_mode: "requestSpatialContainerBoundsMode";
        request_spatial_container_visible: "requestSpatialContainerVisible";
        spatial_container_bounds_changed: "spatialContainerBoundsChanged";
        spatial_container_bounds_mode_request_denied: "spatialContainerBoundsModeRequestDenied";
        spatial_container_closed: "spatialContainerClosed";
        spatial_container_interactable_changed: "spatialContainerInteractableChanged";
        spatial_container_visible_changed: "spatialContainerVisibleChanged";
        spatial_container_visible_request_denied: "spatialContainerVisibleRequestDenied";
    }
    /** OpenXR extension that handles spatial containers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcontainerextension.html  
     */
    class OpenXRSpatialContainerExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if spatial containers are enabled in the project settings and available on the current runtime. */
        isEnabled(): boolean
        
        /** Returns `true` if the main spatial container is active. */
        isSpatialContainerActive(): boolean
        
        /** Returns an array of supported spatial container bounds mode, see [enum OpenXRSpatialContainerState.BoundsMode]. */
        getSupportedBoundsModes(): GArray
        
        /** Retrieves the [OpenXRSpatialContainerState] of the main spatial container. */
        getSpatialContainerState(): null | OpenXRSpatialContainerState
        
        /** Retrieves the bounds of the main spatial container. */
        getSpatialContainerBounds(): Vector3
        
        /** Sends a request to the runtime to update the bounds mode of the main spatial container.  
         *  If the request is accepted, [signal spatial_container_bounds_changed] will be emitted with the updated bounds mode.  
         *  Otherwise, [signal spatial_container_bounds_mode_request_denied] will be emitted.  
         */
        requestSpatialContainerBoundsMode(boundsMode: OpenXRSpatialContainerState.BoundsMode): boolean
        
        /** Sends a request to the runtime to update the visibility of the spatial container.  
         *  If the request is accepted, [signal spatial_container_visible_changed] will be emitted with the updated visibility.  
         *  Otherwise, [signal spatial_container_visible_request_denied] will be emitted.  
         */
        requestSpatialContainerVisible(visible: boolean): boolean
        
        /** Emitted when the bounds of the spatial container specified by [param spatial_container_rid] are updated. */
        readonly spatialContainerBoundsChanged: Signal<(spatialContainerRid: Rid, spatialContainerInfiniteBounds: boolean, spatialContainerBoundsMode: int64, spatialContainerBounds: Vector3) => void>
        
        /** Emitted when a request to update the bounds mode of the spatial container specified by [param spatial_container_rid] is denied by the runtime. */
        readonly spatialContainerBoundsModeRequestDenied: Signal<(spatialContainerRid: Rid) => void>
        
        /** Emitted when the spatial container specified by [param spatial_container_rid] is closed. */
        readonly spatialContainerClosed: Signal<(spatialContainerRid: Rid) => void>
        
        /** Emitted when the interactability of the spatial container specified by [param spatial_container_rid] is updated. */
        readonly spatialContainerInteractableChanged: Signal<(spatialContainerRid: Rid, spatialContainerInteractable: boolean) => void>
        
        /** Emitted when the visibility of the spatial container specified by [param spatial_container_rid] is updated. */
        readonly spatialContainerVisibleChanged: Signal<(spatialContainerRid: Rid, spatialContainerVisible: boolean) => void>
        
        /** Emitted when the runtime denies the visibility request of the spatial container specified by [param spatial_container_rid]. */
        readonly spatialContainerVisibleRequestDenied: Signal<(spatialContainerRid: Rid) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialContainerExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialContainerExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialContainerSelfRenderingExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialContainerSelfRenderingExtension extends __NameMapOpenXRExtensionWrapper {
        is_enabled: "isEnabled";
    }
    /** OpenXR extension that defines "self rendering" for spatial containers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcontainerselfrenderingextension.html  
     */
    class OpenXRSpatialContainerSelfRenderingExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if spatial container self rendering is enabled in the project settings and available on the current runtime. */
        isEnabled(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialContainerSelfRenderingExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialContainerSelfRenderingExtension;
    }
    namespace OpenXRSpatialContainerState {
        enum BoundsMode {
            BoundsModeBounded = 0,
            BoundsModeImmersive = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialContainerState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialContainerState extends __NameMapRefCounted {
        get_bounds_mode: "getBoundsMode";
        is_interactable: "isInteractable";
        is_visible: "isVisible";
    }
    /** An object representing the state of an OpenXR spatial container.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcontainerstate.html  
     */
    class OpenXRSpatialContainerState extends RefCounted {
        constructor(identifier?: any)
        /** Returns the current bounds mode of the spatial container. */
        getBoundsMode(): OpenXRSpatialContainerState.BoundsMode
        
        /** Returns the current interactability of the spatial container. */
        isInteractable(): boolean
        
        /** Returns the current visibility state of the spatial container. */
        isVisible(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialContainerState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialContainerState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialContextPersistenceConfig extends __RPCMapOpenXRStructureBase {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialContextPersistenceConfig extends __NameMapOpenXRStructureBase {
        add_persistence_context: "addPersistenceContext";
        remove_persistence_context: "removePersistenceContext";
        get_persistence_contexts: "getPersistenceContexts";
    }
    /** Configuration header for spatial persistence.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialcontextpersistenceconfig.html  
     */
    class OpenXRSpatialContextPersistenceConfig extends OpenXRStructureBase {
        constructor(identifier?: any)
        /** Adds a persistence context to this configuration. You must add at least one persistence context to create a valid configuration. You can create a persistence context by calling [method OpenXRSpatialAnchorCapability.create_persistence_context]. */
        addPersistenceContext(persistenceContext: Rid): void
        
        /** Removes a persistence context. */
        removePersistenceContext(persistenceContext: Rid): void
        
        /** Gets the persistence context(s) (as [RID]s) received by [method add_persistence_context]. */
        getPersistenceContexts(): GArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialContextPersistenceConfig;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialContextPersistenceConfig;
    }
    namespace OpenXRSpatialEntityExtension {
        enum Capability {
            CapabilityPlaneTracking = 1000741000,
            CapabilityMarkerTrackingQrCode = 1000743000,
            CapabilityMarkerTrackingMicroQrCode = 1000743001,
            CapabilityMarkerTrackingArucoMarker = 1000743002,
            CapabilityMarkerTrackingAprilTag = 1000743003,
            CapabilityAnchor = 1000762000,
        }
        enum ComponentType {
            ComponentTypeBounded2D = 1,
            ComponentTypeBounded3D = 2,
            ComponentTypeParent = 3,
            ComponentTypeMesh3D = 4,
            ComponentTypePlaneAlignment = 1000741000,
            ComponentTypeMesh2D = 1000741001,
            ComponentTypePolygon2D = 1000741002,
            ComponentTypePlaneSemanticLabel = 1000741003,
            ComponentTypeMarker = 1000743000,
            ComponentTypeAnchor = 1000762000,
            ComponentTypePersistence = 1000763000,
        }
        enum TrackingState {
            TrackingUnsupportedCapability = -3,
            TrackingNoPermission = -2,
            TrackingSetupFailed = -1,
            TrackingNotActive = 0,
            TrackingSettingUp = 1,
            TrackingEnabled = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialEntityExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialEntityExtension extends __NameMapOpenXRExtensionWrapper {
        supports_capability: "supportsCapability";
        supports_component_type: "supportsComponentType";
        create_spatial_context: "createSpatialContext";
        get_spatial_context_ready: "getSpatialContextReady";
        free_spatial_context: "freeSpatialContext";
        get_spatial_context_handle: "getSpatialContextHandle";
        discover_spatial_entities_with_component_data: "discoverSpatialEntitiesWithComponentData";
        discover_spatial_entities: "discoverSpatialEntities";
        update_spatial_entities: "updateSpatialEntities";
        free_spatial_snapshot: "freeSpatialSnapshot";
        get_spatial_snapshot_handle: "getSpatialSnapshotHandle";
        get_spatial_snapshot_context: "getSpatialSnapshotContext";
        query_snapshot: "querySnapshot";
        get_string: "getString";
        get_uint8_buffer: "getUint8Buffer";
        get_uint16_buffer: "getUint16Buffer";
        get_uint32_buffer: "getUint32Buffer";
        get_float_buffer: "getFloatBuffer";
        get_vector2_buffer: "getVector2Buffer";
        get_vector3_buffer: "getVector3Buffer";
        find_spatial_entity: "findSpatialEntity";
        add_spatial_entity: "addSpatialEntity";
        make_spatial_entity: "makeSpatialEntity";
        get_spatial_entity_id: "getSpatialEntityId";
        get_spatial_entity_context: "getSpatialEntityContext";
        free_spatial_entity: "freeSpatialEntity";
        spatial_discovery_recommended: "spatialDiscoveryRecommended";
    }
    /** OpenXR extension that handles spatial entities.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialentityextension.html  
     */
    class OpenXRSpatialEntityExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if this spatial entity [param capability] is supported by the hardware used. */
        supportsCapability(capability: OpenXRSpatialEntityExtension.Capability): boolean
        
        /** Returns `true` if this [param capability] supports the [param component_type]. */
        supportsComponentType(capability: OpenXRSpatialEntityExtension.Capability, componentType: OpenXRSpatialEntityExtension.ComponentType): boolean
        
        /** Creates a new spatial context that handles entities for the provided capability configurations. [param capability_configurations] is an array of [OpenXRSpatialCapabilityConfigurationBaseHeader] with the needed capability configuration data.  
         *  [param next] is an optional parameter that can contain additional information for creating our spatial context.  
         *      
         *  **Note:** This is an asynchronous method and returns an [OpenXRFutureResult] object with which to track the status, discarding this object will not cancel the creation process.  
         *  On success [param user_callback] will be called if specified. The result data for this function is the [RID] for our spatial context - the argument will be the OpenXR result code (as an integer).  
         *  On failure [param failed_callback] will be called if specified. The OpenXR result code will be supplied as an integer - the arguments will be the OpenXR result code (as an integer) and a boolean indicating whether requesting the result failed, or the execution failed.  
         */
        createSpatialContext(capabilityConfigurations: GArray<OpenXRSpatialCapabilityConfigurationBaseHeader>, next?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */, failedCallback?: Callable /* = new Callable() */): OpenXRFutureResult
        
        /** Returns `true` if the spatial context finished its creation and is ready to be used. */
        getSpatialContextReady(spatialContext: Rid): boolean
        
        /** Frees a spatial context previously created when calling [method create_spatial_context]. If the spatial context creation is still ongoing, the asynchronous process is cancelled. */
        freeSpatialContext(spatialContext: Rid): void
        
        /** Returns the OpenXR spatial context handle for this snapshot.  
         *      
         *  **Note:** This method is intended to be used from GDExtensions that implement spatial entity capability handlers.  
         */
        getSpatialContextHandle(spatialContext: Rid): int64
        
        /** Convenience method when the caller only has an [Array] of [OpenXRSpatialComponentData] and needs to discover spatial entities. */
        discoverSpatialEntitiesWithComponentData(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, next?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Starts a new discovery query, this will gather all objects tracked by the [param spatial_context] that have at least one of the component types specified in [param component_types].  
         *  [param next] is an optional parameter that can contain additional information for executing the discovery query.  
         *      
         *  **Note:** This is an asynchronous method and returns an [OpenXRFutureResult] object with which to track the status, discarding this object will not cancel the discovery process. On success [param user_callback] will be called if specified. The result data for this function is the [RID] for our snapshot.  
         */
        discoverSpatialEntities(spatialContext: Rid, componentTypes: PackedInt64Array | int64[], next?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Performs a snapshot for a limited number of entities. This is NOT an asynchronous method and will return the snapshot immediately. */
        updateSpatialEntities(spatialContext: Rid, entities: GArray<Rid>, componentTypes: PackedInt64Array | int64[], next?: OpenXRStructureBase): Rid
        
        /** Frees a spatial snapshot previously created when calling [method discover_spatial_entities]. If the spatial snapshot creation is still ongoing, the asynchronous process is cancelled. */
        freeSpatialSnapshot(spatialSnapshot: Rid): void
        
        /** Returns the OpenXR spatial snapshot handle for this snapshot.  
         *      
         *  **Note:** This method is intended to be used from GDExtensions that implement spatial entity capability handlers.  
         */
        getSpatialSnapshotHandle(spatialSnapshot: Rid): int64
        
        /** Returns the spatial context related to this spatial snapshot. */
        getSpatialSnapshotContext(spatialSnapshot: Rid): Rid
        
        /** Queries the snapshot data. This will find all entities in the snapshot that contain all requested components in [param component_data]. The objects held within [param component_data] will then be populated with the queried data. [param component_data] must always have an object of [OpenXRSpatialQueryResultData] as the first entry.  
         *  [param next] is an optional parameter that can contain additional information passed when setting our query conditions.  
         */
        querySnapshot(spatialSnapshot: Rid, componentData: GArray<OpenXRSpatialComponentData>, next?: OpenXRStructureBase): boolean
        
        /** Returns a string from a buffer that was retrieved when taking a snapshot. */
        getString(spatialSnapshot: Rid, bufferId: int64): string
        
        /** Returns a buffer with 8 bit ints from a buffer that was retrieved when taking a snapshot. */
        getUint8Buffer(spatialSnapshot: Rid, bufferId: int64): PackedByteArray
        
        /** Returns a buffer with 16 bit ints from a buffer that was retrieved when taking a snapshot. */
        getUint16Buffer(spatialSnapshot: Rid, bufferId: int64): PackedInt32Array
        
        /** Returns a buffer with 32 bit ints from a buffer that was retrieved when taking a snapshot. */
        getUint32Buffer(spatialSnapshot: Rid, bufferId: int64): PackedInt32Array
        
        /** Returns a buffer with floats from a buffer that was retrieved when taking a snapshot. */
        getFloatBuffer(spatialSnapshot: Rid, bufferId: int64): PackedFloat32Array
        
        /** Returns a buffer with [Vector2] entries from a buffer that was retrieved when taking a snapshot. */
        getVector2Buffer(spatialSnapshot: Rid, bufferId: int64): PackedVector2Array
        
        /** Returns a buffer with [Vector3] entries from a buffer that was retrieved when taking a snapshot. */
        getVector3Buffer(spatialSnapshot: Rid, bufferId: int64): PackedVector3Array
        
        /** Returns the [RID] for the specified spatial entity ID. */
        findSpatialEntity(entityId: int64): Rid
        
        /** Registers an entity that was created directly on the OpenXR runtime. */
        addSpatialEntity(spatialContext: Rid, entityId: int64, entity: int64): Rid
        
        /** Creates a new entity for this [param entity_id]. The [param spatial_context] should match the context that discovered the entity. */
        makeSpatialEntity(spatialContext: Rid, entityId: int64): Rid
        
        /** Returns the internal `XrSpatialEntityIdEXT` associated with the entity. */
        getSpatialEntityId(entity: Rid): int64
        
        /** Returns the spatial context for this entity. */
        getSpatialEntityContext(entity: Rid): Rid
        
        /** Frees an entity previously created when calling [method add_spatial_entity] or [method make_spatial_entity]. */
        freeSpatialEntity(entity: Rid): void
        
        /** Emitted when OpenXR recommends running a discovery query because entities managed by this spatial context have (likely) changed. */
        readonly spatialDiscoveryRecommended: Signal<(spatialContext: Rid) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialEntityExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialEntityExtension;
    }
    namespace OpenXRSpatialEntityTracker {
        enum EntityTrackingState {
            EntityTrackingStateStopped = 1,
            EntityTrackingStatePaused = 2,
            EntityTrackingStateTracking = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialEntityTracker extends __RPCMapXRPositionalTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialEntityTracker extends __NameMapXRPositionalTracker {
        set_spatial_context: "setSpatialContext";
        get_spatial_context: "getSpatialContext";
        get_next: "getNext";
        add_next: "addNext";
        remove_next: "removeNext";
        spatial_tracking_state: "spatialTrackingState";
        next_changed: "nextChanged";
        spatial_tracking_state_changed: "spatialTrackingStateChanged";
    }
    /** Base class for Positional trackers managed by OpenXR's spatial entity extensions.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialentitytracker.html  
     */
    class OpenXRSpatialEntityTracker extends XRPositionalTracker {
        constructor(identifier?: any)
        /** Sets the spatial context used to create this tracker. */
        setSpatialContext(spatialContext: Rid): void
        
        /** Gets the spatial context used to create this [OpenXRSpatialEntityTracker]. */
        getSpatialContext(): Rid
        
        /** Gets the head [OpenXRStructureBase] in the next-chain.  
         *  See also [method add_next] and [method remove_next].  
         */
        getNext(): null | OpenXRStructureBase
        
        /** Adds a new [OpenXRStructureBase] to the next-chain.  
         *  [method get_next] will return this [param next] until either [method add_next] is called again or it's removed in [method remove_next].  
         */
        addNext(next: OpenXRStructureBase): void
        
        /** Removes a [param next] object previously added in [method add_next] from the next-chain. */
        removeNext(next: OpenXRStructureBase): void
        
        /** The spatial entity associated with this tracker. */
        get entity(): Rid
        set entity(value: Rid)
        
        /** The spatial tracking state for this tracker. */
        get spatialTrackingState(): int64
        set spatialTrackingState(value: int64)
        
        /** Emitted when the next-chain changes, from either [method add_next] or [method remove_next]. */
        readonly nextChanged: Signal<() => void>
        readonly spatialTrackingStateChanged: Signal<(spatialTrackingState: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialEntityTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialEntityTracker;
    }
    namespace OpenXRSpatialMarkerTrackingCapability {
        enum MarkerTypeFlags {
            MarkerQrCode = 1,
            MarkerMicroQrCode = 2,
            MarkerAruco = 4,
            MarkerAprilTag = 8,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialMarkerTrackingCapability extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialMarkerTrackingCapability extends __NameMapOpenXRExtensionWrapper {
        is_qrcode_supported: "isQrcodeSupported";
        is_micro_qrcode_supported: "isMicroQrcodeSupported";
        is_aruco_supported: "isArucoSupported";
        is_april_tag_supported: "isAprilTagSupported";
        start_entity_discovery: "startEntityDiscovery";
        do_entity_update: "doEntityUpdate";
        get_built_in_tracking_state: "getBuiltInTrackingState";
        start_built_in_tracking: "startBuiltInTracking";
        stop_built_in_tracking: "stopBuiltInTracking";
    }
    /** Implementation for handling spatial entity marker tracking logic.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialmarkertrackingcapability.html  
     */
    class OpenXRSpatialMarkerTrackingCapability extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if QR code marker tracking is supported by the current device. */
        isQrcodeSupported(): boolean
        
        /** Returns `true` if micro QR code marker tracking is supported by the current device. */
        isMicroQrcodeSupported(): boolean
        
        /** Returns `true` if ArUco marker tracking is supported by the current device. */
        isArucoSupported(): boolean
        
        /** Returns `true` if April tag marker tracking is supported by the current device. */
        isAprilTagSupported(): boolean
        
        /** Calls [method OpenXRSpatialEntityExtension.discover_spatial_entities] and [method OpenXRSpatialEntityExtension.query_snapshot] with the marker entities associated with [param spatial_context].  
         *  [param component_data] are the [OpenXRSpatialComponentData]s to discover for this marker capability.  
         *  If [param next_snapshot_create] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         *  If [param next_snapshot_query] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.query_snapshot].  
         *  [param user_callback], when non-null, is called with two parameters usually twice. The first parameter is the [RID] of the discovery snapshot and the second parameter is a boolean where `false` indicates the discovery snapshot is about to be processed, and `true` indicates the discovery snapshot has been processed and [param component_data] has valid data. The second call is skipped if an error was encountered.  
         *  The returned [OpenXRFutureResult] is identical to the return from [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         */
        startEntityDiscovery(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, nextSnapshotCreate?: OpenXRStructureBase, nextSnapshotQuery?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Calls [method OpenXRSpatialEntityExtension.update_spatial_entities] and [method OpenXRSpatialEntityExtension.query_snapshot] with the marker entities associated with [param spatial_context].  
         *  [param component_data] are the [OpenXRSpatialComponentData]s to update for this marker capability.  
         *  If [param next_snapshot_create] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.update_spatial_entities].  
         *  If [param next_snapshot_query] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.query_snapshot].  
         */
        doEntityUpdate(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, nextSnapshotCreate?: OpenXRStructureBase, nextSnapshotQuery?: OpenXRStructureBase): void
        
        /** Returns the state of the built-in tracking system. */
        getBuiltInTrackingState(): OpenXRSpatialEntityExtension.TrackingState
        
        /** Starts the built-in marker tracking logic for the specified marker types. This will fail if built-in tracking is already enabled. */
        startBuiltInTracking(markerTypes: OpenXRSpatialMarkerTrackingCapability.MarkerTypeFlags): boolean
        
        /** Stops the built-in marker tracking logic. */
        stopBuiltInTracking(clearTrackers?: boolean /* = true */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialMarkerTrackingCapability;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialMarkerTrackingCapability;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialPlaneTrackingCapability extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialPlaneTrackingCapability extends __NameMapOpenXRExtensionWrapper {
        is_supported: "isSupported";
        start_entity_discovery: "startEntityDiscovery";
        get_built_in_tracking_state: "getBuiltInTrackingState";
        start_built_in_tracking: "startBuiltInTracking";
        stop_built_in_tracking: "stopBuiltInTracking";
    }
    /** Implementation for handling spatial entity plane tracking logic.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialplanetrackingcapability.html  
     */
    class OpenXRSpatialPlaneTrackingCapability extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if plane tracking is supported by the current device. */
        isSupported(): boolean
        
        /** Calls [method OpenXRSpatialEntityExtension.discover_spatial_entities] and [method OpenXRSpatialEntityExtension.query_snapshot] with the plane entities associated with [param spatial_context].  
         *  [param component_data] are the [OpenXRSpatialComponentData]s to discover for this plane capability.  
         *  If [param next_snapshot_create] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         *  If [param next_snapshot_query] is non-null, then pass this to the `next` parameter in [method OpenXRSpatialEntityExtension.query_snapshot].  
         *  [param user_callback], when non-null, is called with two parameters usually twice. The first parameter is the [RID] of the discovery snapshot and the second parameter is a boolean where `false` indicates the discovery snapshot is about to be processed, and `true` indicates the discovery snapshot has been processed and [param component_data] has valid data. The second call is skipped if an error was encountered.  
         *  The returned [OpenXRFutureResult] is identical to the return from [method OpenXRSpatialEntityExtension.discover_spatial_entities].  
         */
        startEntityDiscovery(spatialContext: Rid, componentData: GArray<OpenXRSpatialComponentData>, nextSnapshotCreate?: OpenXRStructureBase, nextSnapshotQuery?: OpenXRStructureBase, userCallback?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Returns the state of the built-in tracking system. */
        getBuiltInTrackingState(): OpenXRSpatialEntityExtension.TrackingState
        
        /** Starts the built-in plane tracking logic. This will fail if built-in tracking is already enabled. */
        startBuiltInTracking(): boolean
        
        /** Stops the built-in plane tracking logic. */
        stopBuiltInTracking(clearTrackers?: boolean /* = true */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialPlaneTrackingCapability;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialPlaneTrackingCapability;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRSpatialQueryResultData extends __RPCMapOpenXRSpatialComponentData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRSpatialQueryResultData extends __NameMapOpenXRSpatialComponentData {
        get_capacity: "getCapacity";
        get_entity_id: "getEntityId";
        get_entity_state: "getEntityState";
    }
    /** Object for storing the main query result data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrspatialqueryresultdata.html  
     */
    class OpenXRSpatialQueryResultData extends OpenXRSpatialComponentData {
        constructor(identifier?: any)
        /** Returns the number of entities that were retrieved. */
        getCapacity(): int64
        
        /** Returns the entity id (`XrSpatialEntityIdEXT`) for the entity at this [param index]. */
        getEntityId(index: int64): int64
        
        /** Returns the entity state for the entity at this [param index]. */
        getEntityState(index: int64): OpenXRSpatialEntityTracker.EntityTrackingState
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRSpatialQueryResultData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRSpatialQueryResultData;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRStructureBase extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRStructureBase extends __NameMapRefCounted {
        _get_header: "_getHeader";
        get_header: "getHeader";
        get_structure_type: "getStructureType";
    }
    /** Object for storing OpenXR structure data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrstructurebase.html  
     */
    class OpenXRStructureBase extends RefCounted {
        constructor(identifier?: any)
        /* gdvirtual */ _getHeader(next: int64): int64
        
        /** Returns the structure pointer (any OpenXR structure that has an `XrStructureType`) used for this structure. The pointer is valid as long as the instance exists. */
        getHeader(next: int64): int64
        
        /** Returns the structure type (OpenXR `XrStructureType`) used for this structure. */
        getStructureType(): int64
        
        /** Setting another structure object here chains these structures together to extend the API functionality. Consult the OpenXR documentation for which structures can be used with a given API call. */
        get next(): null | OpenXRStructureBase
        set next(value: null | OpenXRStructureBase)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRStructureBase;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRStructureBase;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRVisibilityMask extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRVisibilityMask extends __NameMapVisualInstance3D {
    }
    /** Draws a stereo correct visibility mask.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrvisibilitymask.html  
     */
    class OpenXRVisibilityMask<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRVisibilityMask;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRVisibilityMask;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOptimizedTranslation extends __RPCMapTranslation {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOptimizedTranslation extends __NameMapTranslation {
    }
    /** An optimized translation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_optimizedtranslation.html  
     */
    class OptimizedTranslation extends Translation {
        constructor(identifier?: any)
        /** Generates and sets an optimized translation from the given [Translation] resource. Returns `true` if successful.  
         *      
         *  **Note:** Messages in [param from] should not use context or plural forms.  
         *      
         *  **Note:** This method is intended to be used in the editor. It does nothing when called from an exported project.  
         */
        generate(from: Translation): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOptimizedTranslation;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOptimizedTranslation;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOptionButton extends __RPCMapButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOptionButton extends __NameMapButton {
        add_item: "addItem";
        add_icon_item: "addIconItem";
        set_item_text: "setItemText";
        set_item_icon: "setItemIcon";
        set_item_disabled: "setItemDisabled";
        set_item_id: "setItemId";
        set_item_metadata: "setItemMetadata";
        set_item_tooltip: "setItemTooltip";
        set_item_auto_translate_mode: "setItemAutoTranslateMode";
        get_item_text: "getItemText";
        get_item_icon: "getItemIcon";
        get_item_id: "getItemId";
        get_item_index: "getItemIndex";
        get_item_metadata: "getItemMetadata";
        get_item_tooltip: "getItemTooltip";
        get_item_auto_translate_mode: "getItemAutoTranslateMode";
        is_item_disabled: "isItemDisabled";
        is_item_separator: "isItemSeparator";
        add_separator: "addSeparator";
        get_selected_id: "getSelectedId";
        get_selected_metadata: "getSelectedMetadata";
        remove_item: "removeItem";
        get_popup: "getPopup";
        show_popup: "showPopup";
        has_selectable_items: "hasSelectableItems";
        get_selectable_item: "getSelectableItem";
        set_disable_shortcuts: "setDisableShortcuts";
        fit_to_longest_item: "fitToLongestItem";
        allow_reselect: "allowReselect";
        search_bar_enabled: "searchBarEnabled";
        search_bar_min_item_count: "searchBarMinItemCount";
        search_bar_fuzzy_search_enabled: "searchBarFuzzySearchEnabled";
        search_bar_fuzzy_search_max_misses: "searchBarFuzzySearchMaxMisses";
        item_count: "itemCount";
        item_selected: "itemSelected";
        item_focused: "itemFocused";
    }
    /** A button that brings up a dropdown with selectable options when pressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_optionbutton.html  
     */
    class OptionButton<Map extends NodePathMap = any> extends Button<Map> {
        constructor(identifier?: any)
        /** Adds an item, with text [param label] and (optionally) [param id]. If no [param id] is passed, the item index will be used as the item's ID. New items are appended at the end.  
         *      
         *  **Note:** The item will be selected if there are no other items.  
         */
        addItem(label: string, id?: int64 /* = -1 */): void
        
        /** Adds an item, with a [param texture] icon, text [param label] and (optionally) [param id]. If no [param id] is passed, the item index will be used as the item's ID. New items are appended at the end.  
         *      
         *  **Note:** The item will be selected if there are no other items.  
         */
        addIconItem(texture: Texture2D, label: string, id?: int64 /* = -1 */): void
        
        /** Sets the text of the item at index [param idx]. */
        setItemText(idx: int64, text: string): void
        
        /** Sets the icon of the item at index [param idx]. */
        setItemIcon(idx: int64, texture: Texture2D): void
        
        /** Sets whether the item at index [param idx] is disabled.  
         *  Disabled items are drawn differently in the dropdown and are not selectable by the user. If the current selected item is set as disabled, it will remain selected.  
         */
        setItemDisabled(idx: int64, disabled: boolean): void
        
        /** Sets the ID of the item at index [param idx]. */
        setItemId(idx: int64, id: int64): void
        
        /** Sets the metadata of an item. Metadata may be of any type and can be used to store extra information about an item, such as an external string ID. */
        setItemMetadata(idx: int64, metadata: any): void
        
        /** Sets the tooltip of the item at index [param idx]. */
        setItemTooltip(idx: int64, tooltip: string): void
        
        /** Sets the auto translate mode of the item at index [param idx].  
         *  Items use [constant Node.AUTO_TRANSLATE_MODE_INHERIT] by default, which uses the same auto translate mode as the [OptionButton] itself.  
         */
        setItemAutoTranslateMode(idx: int64, mode: Node.AutoTranslateMode): void
        
        /** Returns the text of the item at index [param idx]. */
        getItemText(idx: int64): string
        
        /** Returns the icon of the item at index [param idx]. */
        getItemIcon(idx: int64): null | Texture2D
        
        /** Returns the ID of the item at index [param idx]. */
        getItemId(idx: int64): int64
        
        /** Returns the index of the item with the given [param id]. */
        getItemIndex(id: int64): int64
        
        /** Retrieves the metadata of an item. Metadata may be any type and can be used to store extra information about an item, such as an external string ID. */
        getItemMetadata(idx: int64): any
        
        /** Returns the tooltip of the item at index [param idx]. */
        getItemTooltip(idx: int64): string
        
        /** Returns the auto translate mode of the item at index [param idx]. */
        getItemAutoTranslateMode(idx: int64): Node.AutoTranslateMode
        
        /** Returns `true` if the item at index [param idx] is disabled. */
        isItemDisabled(idx: int64): boolean
        
        /** Returns `true` if the item at index [param idx] is marked as a separator. */
        isItemSeparator(idx: int64): boolean
        
        /** Adds a separator to the list of items. Separators help to group items, and can optionally be given a [param text] header. A separator also gets an index assigned, and is appended at the end of the item list. */
        addSeparator(text?: string /* = '' */): void
        
        /** Clears all the items in the [OptionButton]. */
        clear(): void
        
        /** Selects an item by index and makes it the current item. This will work even if the item is disabled.  
         *  Passing `-1` as the index deselects any currently selected item.  
         */
        select(idx: int64): void
        
        /** Returns the ID of the selected item, or `-1` if no item is selected. */
        getSelectedId(): int64
        
        /** Gets the metadata of the selected item. Metadata for items can be set using [method set_item_metadata]. */
        getSelectedMetadata(): any
        
        /** Removes the item at index [param idx]. */
        removeItem(idx: int64): void
        
        /** Returns the [PopupMenu] contained in this button.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getPopup(): null | PopupMenu
        
        /** Adjusts popup position and sizing for the [OptionButton], then shows the [PopupMenu]. Prefer this over using `get_popup().popup()`. */
        showPopup(): void
        
        /** Returns `true` if this button contains at least one item which is not disabled, or marked as a separator. */
        hasSelectableItems(): boolean
        
        /** Returns the index of the first item which is not disabled, or marked as a separator. If [param from_last] is `true`, the items will be searched in reverse order.  
         *  Returns `-1` if no item is found.  
         */
        getSelectableItem(fromLast?: boolean /* = false */): int64
        
        /** If `true`, shortcuts are disabled and cannot be used to trigger the button. */
        setDisableShortcuts(disabled: boolean): void
        
        /** The index of the currently selected item, or `-1` if no item is selected. */
        get selected(): int64
        set selected(value: int64)
        
        /** If `true`, minimum size will be determined by the longest item's width, instead of the currently selected one's. It will also take the popup's margins into account, making the button match its total width.  
         *      
         *  **Note:** For performance reasons, the minimum size doesn't update immediately when adding, removing or modifying items.  
         */
        get fitToLongestItem(): boolean
        set fitToLongestItem(value: boolean)
        
        /** If `true`, the currently selected item can be selected again. */
        get allowReselect(): boolean
        set allowReselect(value: boolean)
        
        /** If `true`, shows a search bar at the top of the [PopupMenu] for filtering items. See [member search_bar_min_item_count] for dynamically controlling its visibility based on the number of items. */
        get searchBarEnabled(): boolean
        set searchBarEnabled(value: boolean)
        
        /** Sets the minimum number of items required for the [PopupMenu] search bar to be visible. [member search_bar_enabled] must be `true` for this to have any effect. */
        get searchBarMinItemCount(): int64
        set searchBarMinItemCount(value: int64)
        
        /** If `true`, enables fuzzy searching in the [PopupMenu] search bar. This allows the search results to include items that almost match the search query, as well items that match the individual characters of the search query, but not in sequence.  
         *  Use [member search_bar_fuzzy_search_max_misses] to set the maximum number of mismatches allowed in the search results.  
         */
        get searchBarFuzzySearchEnabled(): boolean
        set searchBarFuzzySearchEnabled(value: boolean)
        
        /** Sets the maximum number of mismatches allowed in each search result when fuzzy searching is enabled for the [PopupMenu] search bar. Any item with more mismatches will be hidden from the search results. */
        get searchBarFuzzySearchMaxMisses(): int64
        set searchBarFuzzySearchMaxMisses(value: int64)
        
        /** The number of items to select from. */
        get itemCount(): int64
        set itemCount(value: int64)
        
        /** Emitted when the current item has been changed by the user. The index of the item selected is passed as argument.  
         *  [member allow_reselect] must be enabled to reselect an item.  
         */
        readonly itemSelected: Signal<(index: int64) => void>
        
        /** Emitted when the user navigates to an item using the [member ProjectSettings.input/ui_up] or [member ProjectSettings.input/ui_down] input actions. The index of the item focused is passed as argument. */
        readonly itemFocused: Signal<(index: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOptionButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOptionButton;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPckPacker extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPckPacker extends __NameMapRefCounted {
        pck_start: "pckStart";
        add_file: "addFile";
        add_file_from_buffer: "addFileFromBuffer";
        add_file_removal: "addFileRemoval";
    }
    class PckPacker extends RefCounted {
        constructor(identifier?: any)
        pckStart(pckPath: string, alignment?: int64 /* = 32 */, key?: string /* = '0000000000000000000000000000000000000000000000000000000000000000' */, encryptDirectory?: boolean /* = false */): GError
        addFile(targetPath: string, sourcePath: string, encrypt?: boolean /* = false */): GError
        addFileFromBuffer(targetPath: string, data: PackedByteArray | byte[] | ArrayBuffer, encrypt?: boolean /* = false */): GError
        addFileRemoval(targetPath: string): GError
        flush(verbose?: boolean /* = false */): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPckPacker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPckPacker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPackedDataContainer extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPackedDataContainer extends __NameMapResource {
        _iter_init: "_iterInit";
        _iter_get: "_iterGet";
        _iter_next: "_iterNext";
        __data__: "__Data___";
    }
    /** Efficiently packs and serializes [Array] or [Dictionary].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packeddatacontainer.html  
     */
    class PackedDataContainer extends Resource {
        constructor(identifier?: any)
        _iterInit(_unnamedArg0: GArray): any
        _iterGet(_unnamedArg0: any): any
        _iterNext(_unnamedArg0: GArray): any
        
        /** Packs the given container into a binary representation. The [param value] must be either [Array] or [Dictionary], any other type will result in invalid data error.  
         *      
         *  **Note:** Subsequent calls to this method will overwrite the existing data.  
         */
        pack(value: any): GError
        
        /** Returns the size of the packed container (see [method Array.size] and [method Dictionary.size]). */
        size(): int64
        get __Data___(): PackedByteArray
        set __Data___(value: PackedByteArray | byte[] | ArrayBuffer)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPackedDataContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPackedDataContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPackedDataContainerRef extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPackedDataContainerRef extends __NameMapRefCounted {
        _iter_init: "_iterInit";
        _iter_get: "_iterGet";
        _iter_next: "_iterNext";
    }
    /** An internal class used by [PackedDataContainer] to pack nested arrays and dictionaries.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packeddatacontainerref.html  
     */
    class PackedDataContainerRef extends RefCounted {
        constructor(identifier?: any)
        /** Returns the size of the packed container (see [method Array.size] and [method Dictionary.size]). */
        size(): int64
        _iterInit(_unnamedArg0: GArray): any
        _iterGet(_unnamedArg0: any): any
        _iterNext(_unnamedArg0: GArray): any
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPackedDataContainerRef;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPackedDataContainerRef;
    }
    namespace PackedScene {
        enum GenEditState {
            GenEditStateDisabled = 0,
            GenEditStateInstance = 1,
            GenEditStateMain = 2,
            GenEditStateMainInherited = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPackedScene extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPackedScene extends __NameMapResource {
        can_instantiate: "canInstantiate";
        get_state: "getState";
    }
    /** An abstraction of a serialized scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedscene.html  
     */
    class PackedScene<T extends Node = Node> extends Resource {
        constructor(identifier?: any)
        /** Packs the [param path] node, and all owned sub-nodes, into this [PackedScene]. Any existing data will be cleared. See [member Node.owner]. */
        pack(path: T): GError
        
        /** Instantiates the scene's node hierarchy. Triggers child scene instantiation(s). Triggers a [constant Node.NOTIFICATION_SCENE_INSTANTIATED] notification on the root node. */
        instantiate(editState?: PackedScene.GenEditState /* = 0 */): T
        
        /** Returns `true` if the scene file has nodes. */
        canInstantiate(): boolean
        
        /** Returns the [SceneState] representing the scene file contents. */
        getState(): null | SceneState
        get _bundled(): GDictionary
        set _bundled(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPackedScene;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPackedScene;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPacketPeer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPacketPeer extends __NameMapRefCounted {
        get_var: "getVar";
        put_var: "putVar";
        get_packet: "getPacket";
        put_packet: "putPacket";
        get_packet_error: "getPacketError";
        get_available_packet_count: "getAvailablePacketCount";
        encode_buffer_max_size: "encodeBufferMaxSize";
    }
    /** Abstraction and base class for packet-based protocols.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packetpeer.html  
     */
    class PacketPeer extends RefCounted {
        constructor(identifier?: any)
        /** Gets a Variant. If [param allow_objects] is `true`, decoding objects is allowed.  
         *  Internally, this uses the same decoding mechanism as the [method @GlobalScope.bytes_to_var] method.  
         *  **Warning:** Deserialized objects can contain code which gets executed. Do not use this option if the serialized object comes from untrusted sources to avoid potential security threats such as remote code execution.  
         */
        getVar(allowObjects?: boolean /* = false */): any
        
        /** Sends a [Variant] as a packet. If [param full_objects] is `true`, encoding objects is allowed (and can potentially include code).  
         *  Internally, this uses the same encoding mechanism as the [method @GlobalScope.var_to_bytes] method.  
         */
        putVar(var_: any, fullObjects?: boolean /* = false */): GError
        
        /** Gets a raw packet. */
        getPacket(): PackedByteArray
        
        /** Sends a raw packet. */
        putPacket(buffer: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Returns the error state of the last packet received (via [method get_packet] and [method get_var]). */
        getPacketError(): GError
        
        /** Returns the number of packets currently available in the ring-buffer. */
        getAvailablePacketCount(): int64
        
        /** Maximum buffer size allowed when encoding [Variant]s. Raise this value to support heavier memory allocations.  
         *  The [method put_var] method allocates memory on the stack, and the buffer used will grow automatically to the closest power of two to match the size of the [Variant]. If the [Variant] is bigger than [member encode_buffer_max_size], the method will error out with [constant ERR_OUT_OF_MEMORY].  
         */
        get encodeBufferMaxSize(): int64
        set encodeBufferMaxSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPacketPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPacketPeer;
    }
    namespace PacketPeerDtls {
        enum Status {
            StatusDisconnected = 0,
            StatusHandshaking = 1,
            StatusConnected = 2,
            StatusError = 3,
            StatusErrorHostnameMismatch = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPacketPeerDtls extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPacketPeerDtls extends __NameMapPacketPeer {
        connect_to_peer: "connectToPeer";
        get_status: "getStatus";
        disconnect_from_peer: "disconnectFromPeer";
    }
    class PacketPeerDtls extends PacketPeer {
        constructor(identifier?: any)
        poll(): void
        connectToPeer(packetPeer: PacketPeerUdp, hostname: string, clientOptions?: TlsOptions): GError
        getStatus(): PacketPeerDtls.Status
        disconnectFromPeer(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPacketPeerDtls;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPacketPeerDtls;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPacketPeerExtension extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPacketPeerExtension extends __NameMapPacketPeer {
        _get_packet: "_getPacket";
        _put_packet: "_putPacket";
        _get_available_packet_count: "_getAvailablePacketCount";
        _get_max_packet_size: "_getMaxPacketSize";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_packetpeerextension.html */
    class PacketPeerExtension extends PacketPeer {
        constructor(identifier?: any)
        /* gdvirtual */ _getPacket(rBuffer: int64, rBufferSize: int64): GError
        /* gdvirtual */ _putPacket(buffer: int64, bufferSize: int64): GError
        /* gdvirtual */ _getAvailablePacketCount(): int64
        /* gdvirtual */ _getMaxPacketSize(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPacketPeerExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPacketPeerExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPacketPeerStream extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPacketPeerStream extends __NameMapPacketPeer {
        input_buffer_max_size: "inputBufferMaxSize";
        output_buffer_max_size: "outputBufferMaxSize";
        stream_peer: "streamPeer";
    }
    /** Wrapper to use a PacketPeer over a StreamPeer.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packetpeerstream.html  
     */
    class PacketPeerStream extends PacketPeer {
        constructor(identifier?: any)
        get inputBufferMaxSize(): int64
        set inputBufferMaxSize(value: int64)
        get outputBufferMaxSize(): int64
        set outputBufferMaxSize(value: int64)
        
        /** The wrapped [StreamPeer] object. */
        get streamPeer(): null | StreamPeer
        set streamPeer(value: null | StreamPeer)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPacketPeerStream;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPacketPeerStream;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPacketPeerUdp extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPacketPeerUdp extends __NameMapPacketPeer {
        is_bound: "isBound";
        connect_to_host: "connectToHost";
        is_socket_connected: "isSocketConnected";
        get_packet_ip: "getPacketIP";
        get_packet_port: "getPacketPort";
        get_local_port: "getLocalPort";
        set_dest_address: "setDestAddress";
        set_broadcast_enabled: "setBroadcastEnabled";
        join_multicast_group: "joinMulticastGroup";
        leave_multicast_group: "leaveMulticastGroup";
    }
    class PacketPeerUdp extends PacketPeer {
        constructor(identifier?: any)
        bind(port: int64, bindAddress?: string /* = '*' */, recvBufSize?: int64 /* = 65536 */): GError
        close(): void
        wait(): GError
        isBound(): boolean
        connectToHost(host: string, port: int64): GError
        isSocketConnected(): boolean
        getPacketIP(): string
        getPacketPort(): int64
        getLocalPort(): int64
        setDestAddress(host: string, port: int64): GError
        setBroadcastEnabled(enabled: boolean): void
        joinMulticastGroup(multicastAddress: string, interfaceName: string): GError
        leaveMulticastGroup(multicastAddress: string, interfaceName: string): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPacketPeerUdp;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPacketPeerUdp;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPanel extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPanel extends __NameMapControl {
    }
    /** A GUI control that displays a [StyleBox].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_panel.html  
     */
    class Panel<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPanel;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPanel;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPanelContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPanelContainer extends __NameMapContainer {
    }
    /** A container that keeps its child controls within the area of a [StyleBox].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_panelcontainer.html  
     */
    class PanelContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPanelContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPanelContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPanoramaSkyMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPanoramaSkyMaterial extends __NameMapMaterial {
        energy_multiplier: "energyMultiplier";
    }
    /** A material that provides a special texture to a [Sky], usually an HDR panorama.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_panoramaskymaterial.html  
     */
    class PanoramaSkyMaterial extends Material {
        constructor(identifier?: any)
        /** [Texture2D] to be applied to the [PanoramaSkyMaterial]. */
        get panorama(): null | Texture2D
        set panorama(value: null | Texture2D)
        
        /** A boolean value to determine if the background texture should be filtered or not. */
        get filter(): boolean
        set filter(value: boolean)
        
        /** The sky's overall brightness multiplier. Higher values result in a brighter sky. */
        get energyMultiplier(): float64
        set energyMultiplier(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPanoramaSkyMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPanoramaSkyMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapParallax2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapParallax2D extends __NameMapNode2D {
        _camera_moved: "_cameraMoved";
        scroll_scale: "scrollScale";
        scroll_offset: "scrollOffset";
        repeat_size: "repeatSize";
        repeat_times: "repeatTimes";
        limit_begin: "limitBegin";
        limit_end: "limitEnd";
        follow_viewport: "followViewport";
        ignore_camera_scroll: "ignoreCameraScroll";
        screen_offset: "screenOffset";
    }
    /** A node used to create a parallax scrolling background.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_parallax2d.html  
     */
    class Parallax2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        _cameraMoved(transform: Transform2D, screenOffset: Vector2, adjScreenOffset: Vector2): void
        
        /** Multiplier to the final [Parallax2D]'s offset. Can be used to simulate distance from the camera.  
         *  For example, a value of `1` scrolls at the same speed as the camera. A value greater than `1` scrolls faster, making objects appear closer. Less than `1` scrolls slower, making objects appear further, and a value of `0` stops the objects completely.  
         */
        get scrollScale(): Vector2
        set scrollScale(value: Vector2)
        
        /** The [Parallax2D]'s offset. Similar to [member screen_offset] and [member Node2D.position], but will not be overridden.  
         *      
         *  **Note:** Values will loop if [member repeat_size] is set higher than `0`.  
         */
        get scrollOffset(): Vector2
        set scrollOffset(value: Vector2)
        
        /** Repeats the [Texture2D] of each of this node's children and offsets them by this value. When scrolling, the node's position loops, giving the illusion of an infinite scrolling background if the values are larger than the screen size. If an axis is set to `0`, the [Texture2D] will not be repeated. */
        get repeatSize(): Vector2
        set repeatSize(value: Vector2)
        
        /** Velocity at which the offset scrolls automatically, in pixels per second. */
        get autoscroll(): Vector2
        set autoscroll(value: Vector2)
        
        /** Overrides the amount of times the texture repeats. Each texture copy spreads evenly from the original by [member repeat_size]. Useful for when zooming out with a camera. */
        get repeatTimes(): int64
        set repeatTimes(value: int64)
        
        /** Top-left limits for scrolling to begin. If the camera is outside of this limit, the [Parallax2D] stops scrolling. Must be lower than [member limit_end] minus the viewport size to work. */
        get limitBegin(): Vector2
        set limitBegin(value: Vector2)
        
        /** Bottom-right limits for scrolling to end. If the camera is outside of this limit, the [Parallax2D] will stop scrolling. Must be higher than [member limit_begin] and the viewport size combined to work. */
        get limitEnd(): Vector2
        set limitEnd(value: Vector2)
        
        /** If `true`, this [Parallax2D] is offset by the current camera's position. If the [Parallax2D] is in a [CanvasLayer] separate from the current camera, it may be desired to match the value with [member CanvasLayer.follow_viewport_enabled]. */
        get followViewport(): boolean
        set followViewport(value: boolean)
        
        /** If `true`, [Parallax2D]'s position is not affected by the position of the camera. */
        get ignoreCameraScroll(): boolean
        set ignoreCameraScroll(value: boolean)
        
        /** Offset used to scroll this [Parallax2D]. This value is updated automatically unless [member ignore_camera_scroll] is `true`. */
        get screenOffset(): Vector2
        set screenOffset(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapParallax2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapParallax2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapParallaxBackground extends __RPCMapCanvasLayer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapParallaxBackground extends __NameMapCanvasLayer {
        _camera_moved: "_cameraMoved";
        scroll_offset: "scrollOffset";
        scroll_base_offset: "scrollBaseOffset";
        scroll_base_scale: "scrollBaseScale";
        scroll_limit_begin: "scrollLimitBegin";
        scroll_limit_end: "scrollLimitEnd";
        scroll_ignore_camera_zoom: "scrollIgnoreCameraZoom";
    }
    /** A node used to create a parallax scrolling background.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_parallaxbackground.html  
     */
    class ParallaxBackground<Map extends NodePathMap = any> extends CanvasLayer<Map> {
        constructor(identifier?: any)
        _cameraMoved(_unnamedArg0: Transform2D, _unnamedArg1: Vector2, _unnamedArg2: Vector2): void
        
        /** The ParallaxBackground's scroll value. Calculated automatically when using a [Camera2D], but can be used to manually manage scrolling when no camera is present. */
        get scrollOffset(): Vector2
        set scrollOffset(value: Vector2)
        
        /** The base position offset for all [ParallaxLayer] children. */
        get scrollBaseOffset(): Vector2
        set scrollBaseOffset(value: Vector2)
        
        /** The base motion scale for all [ParallaxLayer] children. */
        get scrollBaseScale(): Vector2
        set scrollBaseScale(value: Vector2)
        
        /** Top-left limits for scrolling to begin. If the camera is outside of this limit, the background will stop scrolling. Must be lower than [member scroll_limit_end] to work. */
        get scrollLimitBegin(): Vector2
        set scrollLimitBegin(value: Vector2)
        
        /** Bottom-right limits for scrolling to end. If the camera is outside of this limit, the background will stop scrolling. Must be higher than [member scroll_limit_begin] to work. */
        get scrollLimitEnd(): Vector2
        set scrollLimitEnd(value: Vector2)
        
        /** If `true`, elements in [ParallaxLayer] child aren't affected by the zoom level of the camera. */
        get scrollIgnoreCameraZoom(): boolean
        set scrollIgnoreCameraZoom(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapParallaxBackground;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapParallaxBackground;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapParallaxLayer extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapParallaxLayer extends __NameMapNode2D {
        motion_scale: "motionScale";
        motion_offset: "motionOffset";
        motion_mirroring: "motionMirroring";
    }
    /** A parallax scrolling layer to be used with [ParallaxBackground].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_parallaxlayer.html  
     */
    class ParallaxLayer<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Multiplies the ParallaxLayer's motion. If an axis is set to `0`, it will not scroll. */
        get motionScale(): Vector2
        set motionScale(value: Vector2)
        
        /** The ParallaxLayer's offset relative to the parent ParallaxBackground's [member ParallaxBackground.scroll_offset]. */
        get motionOffset(): Vector2
        set motionOffset(value: Vector2)
        
        /** The interval, in pixels, at which the [ParallaxLayer] is drawn repeatedly. Useful for creating an infinitely scrolling background. If an axis is set to `0`, the [ParallaxLayer] will be drawn only once along that direction.  
         *      
         *  **Note:** If you want the repetition to pixel-perfect match a [Texture2D] displayed by a child node, you should account for any scale applied to the texture when defining this interval. For example, if you use a child [Sprite2D] scaled to `0.5` to display a 600×600 texture, and want this sprite to be repeated continuously horizontally, you should set the mirroring to `Vector2(300, 0)`.  
         *      
         *  **Note:** If the length of the viewport axis is bigger than twice the repeated axis size, it will not repeat infinitely, as the parallax layer only draws 2 instances of the layer at any given time. The visibility window is calculated from the parent [ParallaxBackground]'s position, not the layer's own position. So, if you use mirroring, **do not** change the [ParallaxLayer] position relative to its parent. Instead, if you need to adjust the background's position, set the [member CanvasLayer.offset] property in the parent [ParallaxBackground].  
         *      
         *  **Note:** Despite the name, the layer will not be mirrored, it will only be repeated.  
         */
        get motionMirroring(): Vector2
        set motionMirroring(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapParallaxLayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapParallaxLayer;
    }
    namespace ParticleProcessMaterial {
        enum Parameter {
            ParamInitialLinearVelocity = 0,
            ParamAngularVelocity = 1,
            ParamOrbitVelocity = 2,
            ParamLinearAccel = 3,
            ParamRadialAccel = 4,
            ParamTangentialAccel = 5,
            ParamDamping = 6,
            ParamAngle = 7,
            ParamScale = 8,
            ParamHueVariation = 9,
            ParamAnimSpeed = 10,
            ParamAnimOffset = 11,
            ParamRadialVelocity = 15,
            ParamDirectionalVelocity = 16,
            ParamScaleOverVelocity = 17,
            ParamMax = 18,
            ParamTurbVelInfluence = 13,
            ParamTurbInitDisplacement = 14,
            ParamTurbInfluenceOverLife = 12,
        }
        enum ParticleFlags {
            ParticleFlagAlignYToVelocity = 0,
            ParticleFlagRotateY = 1,
            ParticleFlagDisableZ = 2,
            ParticleFlagDampingAsFriction = 3,
            ParticleFlagInheritEmitterScale = 4,
            ParticleFlagPreserveColor = 5,
            ParticleFlagMax = 6,
        }
        enum EmissionShape {
            EmissionShapePoint = 0,
            EmissionShapeSphere = 1,
            EmissionShapeSphereSurface = 2,
            EmissionShapeBox = 3,
            EmissionShapePoints = 4,
            EmissionShapeDirectedPoints = 5,
            EmissionShapeRing = 6,
            EmissionShapeMax = 7,
        }
        enum SubEmitterMode {
            SubEmitterDisabled = 0,
            SubEmitterConstant = 1,
            SubEmitterAtEnd = 2,
            SubEmitterAtCollision = 3,
            SubEmitterAtStart = 4,
            SubEmitterMax = 5,
        }
        enum CollisionMode {
            CollisionDisabled = 0,
            CollisionRigid = 1,
            CollisionHideOnContact = 2,
            CollisionMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapParticleProcessMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapParticleProcessMaterial extends __NameMapMaterial {
        set_param: "setParam";
        get_param: "getParam";
        set_param_min: "setParamMin";
        get_param_min: "getParamMin";
        set_param_max: "setParamMax";
        get_param_max: "getParamMax";
        set_param_texture: "setParamTexture";
        get_param_texture: "getParamTexture";
        set_particle_flag: "setParticleFlag";
        get_particle_flag: "getParticleFlag";
        lifetime_randomness: "lifetimeRandomness";
        particle_flag_align_y: "particleFlagAlignY";
        particle_flag_rotate_y: "particleFlagRotateY";
        particle_flag_disable_z: "particleFlagDisableZ";
        particle_flag_damping_as_friction: "particleFlagDampingAsFriction";
        particle_flag_inherit_emitter_scale: "particleFlagInheritEmitterScale";
        particle_flag_preserve_color: "particleFlagPreserveColor";
        emission_shape_offset: "emissionShapeOffset";
        emission_shape_scale: "emissionShapeScale";
        emission_shape: "emissionShape";
        emission_sphere_radius: "emissionSphereRadius";
        emission_box_extents: "emissionBoxExtents";
        emission_point_texture: "emissionPointTexture";
        emission_normal_texture: "emissionNormalTexture";
        emission_color_texture: "emissionColorTexture";
        emission_point_count: "emissionPointCount";
        emission_ring_axis: "emissionRingAxis";
        emission_ring_height: "emissionRingHeight";
        emission_ring_radius: "emissionRingRadius";
        emission_ring_inner_radius: "emissionRingInnerRadius";
        emission_ring_cone_angle: "emissionRingConeAngle";
        angle_min: "angleMin";
        angle_max: "angleMax";
        angle_curve: "angleCurve";
        use_rotation_3d: "useRotation3D";
        rotation_3d_min: "rotation3DMin";
        rotation_3d_max: "rotation3DMax";
        inherit_velocity_ratio: "inheritVelocityRatio";
        velocity_pivot: "velocityPivot";
        initial_velocity: "initialVelocity";
        initial_velocity_min: "initialVelocityMin";
        initial_velocity_max: "initialVelocityMax";
        angular_velocity: "angularVelocity";
        angular_velocity_min: "angularVelocityMin";
        angular_velocity_max: "angularVelocityMax";
        angular_velocity_curve: "angularVelocityCurve";
        directional_velocity: "directionalVelocity";
        directional_velocity_min: "directionalVelocityMin";
        directional_velocity_max: "directionalVelocityMax";
        directional_velocity_curve: "directionalVelocityCurve";
        orbit_velocity: "orbitVelocity";
        orbit_velocity_min: "orbitVelocityMin";
        orbit_velocity_max: "orbitVelocityMax";
        orbit_velocity_curve: "orbitVelocityCurve";
        radial_velocity: "radialVelocity";
        radial_velocity_min: "radialVelocityMin";
        radial_velocity_max: "radialVelocityMax";
        radial_velocity_curve: "radialVelocityCurve";
        velocity_limit_curve: "velocityLimitCurve";
        use_rotation_velocity_3d: "useRotationVelocity3D";
        rotation_velocity_3d_min: "rotationVelocity3DMin";
        rotation_velocity_3d_max: "rotationVelocity3DMax";
        rotation_velocity_3d_curve: "rotationVelocity3DCurve";
        linear_accel: "linearAccel";
        linear_accel_min: "linearAccelMin";
        linear_accel_max: "linearAccelMax";
        linear_accel_curve: "linearAccelCurve";
        radial_accel: "radialAccel";
        radial_accel_min: "radialAccelMin";
        radial_accel_max: "radialAccelMax";
        radial_accel_curve: "radialAccelCurve";
        tangential_accel: "tangentialAccel";
        tangential_accel_min: "tangentialAccelMin";
        tangential_accel_max: "tangentialAccelMax";
        tangential_accel_curve: "tangentialAccelCurve";
        damping_min: "dampingMin";
        damping_max: "dampingMax";
        damping_curve: "dampingCurve";
        attractor_interaction_enabled: "attractorInteractionEnabled";
        use_scale_3d: "useScale3D";
        scale_3d_min: "scale3DMin";
        scale_3d_max: "scale3DMax";
        scale_min: "scaleMin";
        scale_max: "scaleMax";
        scale_curve: "scaleCurve";
        scale_over_velocity: "scaleOverVelocity";
        scale_over_velocity_min: "scaleOverVelocityMin";
        scale_over_velocity_max: "scaleOverVelocityMax";
        scale_over_velocity_curve: "scaleOverVelocityCurve";
        color_ramp: "colorRamp";
        color_initial_ramp: "colorInitialRamp";
        alpha_curve: "alphaCurve";
        emission_curve: "emissionCurve";
        hue_variation: "hueVariation";
        hue_variation_min: "hueVariationMin";
        hue_variation_max: "hueVariationMax";
        hue_variation_curve: "hueVariationCurve";
        anim_speed: "animSpeed";
        anim_speed_min: "animSpeedMin";
        anim_speed_max: "animSpeedMax";
        anim_speed_curve: "animSpeedCurve";
        anim_offset: "animOffset";
        anim_offset_min: "animOffsetMin";
        anim_offset_max: "animOffsetMax";
        anim_offset_curve: "animOffsetCurve";
        turbulence_enabled: "turbulenceEnabled";
        turbulence_noise_strength: "turbulenceNoiseStrength";
        turbulence_noise_scale: "turbulenceNoiseScale";
        turbulence_noise_speed: "turbulenceNoiseSpeed";
        turbulence_noise_speed_random: "turbulenceNoiseSpeedRandom";
        turbulence_influence: "turbulenceInfluence";
        turbulence_influence_min: "turbulenceInfluenceMin";
        turbulence_influence_max: "turbulenceInfluenceMax";
        turbulence_initial_displacement: "turbulenceInitialDisplacement";
        turbulence_initial_displacement_min: "turbulenceInitialDisplacementMin";
        turbulence_initial_displacement_max: "turbulenceInitialDisplacementMax";
        turbulence_influence_over_life: "turbulenceInfluenceOverLife";
        collision_mode: "collisionMode";
        collision_friction: "collisionFriction";
        collision_bounce: "collisionBounce";
        collision_use_scale: "collisionUseScale";
        sub_emitter_mode: "subEmitterMode";
        sub_emitter_frequency: "subEmitterFrequency";
        sub_emitter_amount_at_end: "subEmitterAmountAtEnd";
        sub_emitter_amount_at_collision: "subEmitterAmountAtCollision";
        sub_emitter_amount_at_start: "subEmitterAmountAtStart";
        sub_emitter_keep_velocity: "subEmitterKeepVelocity";
        emission_shape_changed: "emissionShapeChanged";
    }
    /** Holds a particle configuration for [GPUParticles2D] or [GPUParticles3D] nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_particleprocessmaterial.html  
     */
    class ParticleProcessMaterial extends Material {
        constructor(identifier?: any)
        /** Sets the minimum and maximum values of the given [param param].  
         *  The `x` component of the argument vector corresponds to minimum and the `y` component corresponds to maximum.  
         */
        setParam(param: ParticleProcessMaterial.Parameter, value: Vector2): void
        
        /** Returns the minimum and maximum values of the given [param param] as a vector.  
         *  The `x` component of the returned vector corresponds to minimum and the `y` component corresponds to maximum.  
         */
        getParam(param: ParticleProcessMaterial.Parameter): Vector2
        
        /** Sets the minimum value range for the given parameter. */
        setParamMin(param: ParticleProcessMaterial.Parameter, value: float64): void
        
        /** Returns the minimum value range for the given parameter. */
        getParamMin(param: ParticleProcessMaterial.Parameter): float64
        
        /** Sets the maximum value range for the given parameter. */
        setParamMax(param: ParticleProcessMaterial.Parameter, value: float64): void
        
        /** Returns the maximum value range for the given parameter. */
        getParamMax(param: ParticleProcessMaterial.Parameter): float64
        
        /** Sets the [Texture2D] for the specified [enum Parameter]. */
        setParamTexture(param: ParticleProcessMaterial.Parameter, texture: Texture2D): void
        
        /** Returns the [Texture2D] used by the specified parameter. */
        getParamTexture(param: ParticleProcessMaterial.Parameter): null | Texture2D
        
        /** Sets the [param particle_flag] to [param enable]. */
        setParticleFlag(particleFlag: ParticleProcessMaterial.ParticleFlags, enable: boolean): void
        
        /** Returns `true` if the specified particle flag is enabled. */
        getParticleFlag(particleFlag: ParticleProcessMaterial.ParticleFlags): boolean
        
        /** Particle lifetime randomness ratio. The equation for the lifetime of a particle is `lifetime * (1.0 - randf() * lifetime_randomness)`. For example, a [member lifetime_randomness] of `0.4` scales the lifetime between `0.6` to `1.0` of its original value. */
        get lifetimeRandomness(): float64
        set lifetimeRandomness(value: float64)
        
        /** Align Y axis of particle with the direction of its velocity. */
        get particleFlagAlignY(): boolean
        set particleFlagAlignY(value: boolean)
        
        /** If `true`, particles rotate around Y axis by [member angle_min]. */
        get particleFlagRotateY(): boolean
        set particleFlagRotateY(value: boolean)
        
        /** If `true`, particles will not move on the z axis. */
        get particleFlagDisableZ(): boolean
        set particleFlagDisableZ(value: boolean)
        
        /** Changes the behavior of the damping properties from a linear deceleration to a deceleration based on speed percentage. */
        get particleFlagDampingAsFriction(): boolean
        set particleFlagDampingAsFriction(value: boolean)
        
        /** If `true`, particles will inherit the scale of the emitter.  
         *      
         *  **Note:** This has no effect when [member GPUParticles3D.local_coords] is `true`, since particles in local space are already affected by the emitter's scale.  
         */
        get particleFlagInheritEmitterScale(): boolean
        set particleFlagInheritEmitterScale(value: boolean)
        
        /** If `true`, preserves the color given by manual emission. To use when using [method GPUParticles3D.emit_particle] or when working with subemitters. */
        get particleFlagPreserveColor(): boolean
        set particleFlagPreserveColor(value: boolean)
        
        /** The offset for the [member emission_shape], in local space. */
        get emissionShapeOffset(): Vector3
        set emissionShapeOffset(value: Vector3)
        
        /** The scale of the [member emission_shape], in local space. */
        get emissionShapeScale(): Vector3
        set emissionShapeScale(value: Vector3)
        
        /** Particles will be emitted inside this region. */
        get emissionShape(): int64
        set emissionShape(value: int64)
        
        /** The sphere's radius if [member emission_shape] is set to [constant EMISSION_SHAPE_SPHERE]. */
        get emissionSphereRadius(): float64
        set emissionSphereRadius(value: float64)
        
        /** The box's extents if [member emission_shape] is set to [constant EMISSION_SHAPE_BOX].  
         *      
         *  **Note:** [member emission_box_extents] starts from the center point and applies the X, Y, and Z values in both directions. The size is twice the area of the extents.  
         */
        get emissionBoxExtents(): Vector3
        set emissionBoxExtents(value: Vector3)
        
        /** Particles will be emitted at positions determined by sampling this texture at a random position. Used with [constant EMISSION_SHAPE_POINTS] and [constant EMISSION_SHAPE_DIRECTED_POINTS]. Can be created automatically from mesh or node by selecting "Create Emission Points from Mesh/Node" under the "Particles" tool in the toolbar. */
        get emissionPointTexture(): null | Texture2D
        set emissionPointTexture(value: null | Texture2D)
        
        /** Particle velocity and rotation will be set by sampling this texture at the same point as the [member emission_point_texture]. Used only in [constant EMISSION_SHAPE_DIRECTED_POINTS]. Can be created automatically from mesh or node by selecting "Create Emission Points from Mesh/Node" under the "Particles" tool in the toolbar. */
        get emissionNormalTexture(): null | Texture2D
        set emissionNormalTexture(value: null | Texture2D)
        
        /** Particle color will be modulated by color determined by sampling this texture at the same point as the [member emission_point_texture].  
         *      
         *  **Note:** [member emission_color_texture] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function. Otherwise, [member emission_color_texture] will have no visible effect.  
         */
        get emissionColorTexture(): null | Texture2D
        set emissionColorTexture(value: null | Texture2D)
        
        /** The number of emission points if [member emission_shape] is set to [constant EMISSION_SHAPE_POINTS] or [constant EMISSION_SHAPE_DIRECTED_POINTS]. */
        get emissionPointCount(): int64
        set emissionPointCount(value: int64)
        
        /** The axis of the ring when using the emitter [constant EMISSION_SHAPE_RING]. */
        get emissionRingAxis(): Vector3
        set emissionRingAxis(value: Vector3)
        
        /** The height of the ring when using the emitter [constant EMISSION_SHAPE_RING]. */
        get emissionRingHeight(): float64
        set emissionRingHeight(value: float64)
        
        /** The radius of the ring when using the emitter [constant EMISSION_SHAPE_RING]. */
        get emissionRingRadius(): float64
        set emissionRingRadius(value: float64)
        
        /** The inner radius of the ring when using the emitter [constant EMISSION_SHAPE_RING]. */
        get emissionRingInnerRadius(): float64
        set emissionRingInnerRadius(value: float64)
        
        /** The angle of the cone when using the emitter [constant EMISSION_SHAPE_RING]. The default angle of 90 degrees results in a ring, while an angle of 0 degrees results in a cone. Intermediate values will result in a ring where one end is larger than the other.  
         *      
         *  **Note:** Depending on [member emission_ring_height], the angle may be clamped if the ring's end is reached to form a perfect cone.  
         */
        get emissionRingConeAngle(): float64
        set emissionRingConeAngle(value: float64)
        get angle(): Vector2
        set angle(value: Vector2)
        
        /** Minimum equivalent of [member angle_max]. */
        get angleMin(): float64
        set angleMin(value: float64)
        
        /** Maximum initial rotation applied to each particle, in degrees.  
         *  Only applied when [member particle_flag_disable_z] or [member particle_flag_rotate_y] are `true` or the [BaseMaterial3D] being used to draw the particle is using [constant BaseMaterial3D.BILLBOARD_PARTICLES].  
         */
        get angleMax(): float64
        set angleMax(value: float64)
        
        /** Each particle's rotation will be animated along this [CurveTexture]. */
        get angleCurve(): null | CurveTexture
        set angleCurve(value: null | CurveTexture)
        
        /** Enable the usage of [member rotation_3d_min] and [member rotation_3d_max]. */
        get useRotation3D(): boolean
        set useRotation3D(value: boolean)
        
        /** The minimum 3D orientation, in degrees. Works only in 3D and if [member use_rotation_3d] is enabled. */
        get rotation3DMin(): Vector3
        set rotation3DMin(value: Vector3)
        
        /** The maximum 3D orientation, in degrees. Works only in 3D and if [member use_rotation_3d] is enabled. */
        get rotation3DMax(): Vector3
        set rotation3DMax(value: Vector3)
        
        /** Percentage of the velocity of the respective [GPUParticles2D] or [GPUParticles3D] inherited by each particle when spawning. */
        get inheritVelocityRatio(): float64
        set inheritVelocityRatio(value: float64)
        
        /** A pivot point used to calculate radial and orbital velocity of particles. */
        get velocityPivot(): Vector3
        set velocityPivot(value: Vector3)
        
        /** Unit vector specifying the particles' emission direction. */
        get direction(): Vector3
        set direction(value: Vector3)
        
        /** Each particle's initial direction range from `+spread` to `-spread` degrees. */
        get spread(): float64
        set spread(value: float64)
        
        /** Amount of [member spread] along the Y axis. */
        get flatness(): float64
        set flatness(value: float64)
        get initialVelocity(): Vector2
        set initialVelocity(value: Vector2)
        
        /** Minimum equivalent of [member initial_velocity_max]. */
        get initialVelocityMin(): float64
        set initialVelocityMin(value: float64)
        
        /** Maximum initial velocity magnitude for each particle. Direction comes from [member direction] and [member spread]. */
        get initialVelocityMax(): float64
        set initialVelocityMax(value: float64)
        get angularVelocity(): Vector2
        set angularVelocity(value: Vector2)
        
        /** Minimum equivalent of [member angular_velocity_max]. */
        get angularVelocityMin(): float64
        set angularVelocityMin(value: float64)
        
        /** Maximum initial angular velocity (rotation speed) applied to each particle in  *degrees*  per second.  
         *  Only applied when [member particle_flag_disable_z] or [member particle_flag_rotate_y] are `true` or the [BaseMaterial3D] being used to draw the particle is using [constant BaseMaterial3D.BILLBOARD_PARTICLES].  
         */
        get angularVelocityMax(): float64
        set angularVelocityMax(value: float64)
        
        /** Each particle's angular velocity (rotation speed) will vary along this [CurveTexture] over its lifetime. */
        get angularVelocityCurve(): null | CurveTexture
        set angularVelocityCurve(value: null | CurveTexture)
        get directionalVelocity(): Vector2
        set directionalVelocity(value: Vector2)
        
        /** Minimum directional velocity value, which is multiplied by [member directional_velocity_curve].  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get directionalVelocityMin(): float64
        set directionalVelocityMin(value: float64)
        
        /** Maximum directional velocity value, which is multiplied by [member directional_velocity_curve].  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get directionalVelocityMax(): float64
        set directionalVelocityMax(value: float64)
        
        /** A curve that specifies the velocity along each of the axes of the particle system along its lifetime.  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get directionalVelocityCurve(): null | CurveXyzTexture
        set directionalVelocityCurve(value: null | CurveXyzTexture)
        get orbitVelocity(): Vector2
        set orbitVelocity(value: Vector2)
        
        /** Minimum equivalent of [member orbit_velocity_max].  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get orbitVelocityMin(): float64
        set orbitVelocityMin(value: float64)
        
        /** Maximum orbital velocity applied to each particle. Makes the particles circle around origin. Specified in number of full rotations around origin per second.  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get orbitVelocityMax(): float64
        set orbitVelocityMax(value: float64)
        
        /** Each particle's orbital velocity will vary along this [CurveTexture].  
         *      
         *  **Note:** For 3D orbital velocity, use a [CurveXYZTexture].  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get orbitVelocityCurve(): null | CurveTexture | CurveXyzTexture
        set orbitVelocityCurve(value: null | CurveTexture | CurveXyzTexture)
        get radialVelocity(): Vector2
        set radialVelocity(value: Vector2)
        
        /** Minimum radial velocity applied to each particle. Makes particles move away from the [member velocity_pivot], or toward it if negative.  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get radialVelocityMin(): float64
        set radialVelocityMin(value: float64)
        
        /** Maximum radial velocity applied to each particle. Makes particles move away from the [member velocity_pivot], or toward it if negative.  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get radialVelocityMax(): float64
        set radialVelocityMax(value: float64)
        
        /** A [CurveTexture] that defines the velocity over the particle's lifetime away (or toward) the [member velocity_pivot].  
         *      
         *  **Note:** Animated velocities will not be affected by damping, use [member velocity_limit_curve] instead.  
         */
        get radialVelocityCurve(): null | CurveTexture
        set radialVelocityCurve(value: null | CurveTexture)
        
        /** A [CurveTexture] that defines the maximum velocity of a particle during its lifetime. */
        get velocityLimitCurve(): null | CurveTexture
        set velocityLimitCurve(value: null | CurveTexture)
        
        /** Enable 3D rotation velocity. */
        get useRotationVelocity3D(): boolean
        set useRotationVelocity3D(value: boolean)
        
        /** Minimum 3D rotation velocity on the particle's local axis. Enable [member use_rotation_velocity_3d] to use this. */
        get rotationVelocity3DMin(): Vector3
        set rotationVelocity3DMin(value: Vector3)
        
        /** Maximum 3D rotation velocity on the particle's local axis. Enable [member use_rotation_velocity_3d] to use this. */
        get rotationVelocity3DMax(): Vector3
        set rotationVelocity3DMax(value: Vector3)
        
        /** Rotation velocity curve over lifetime, per-axis. Enable [member use_rotation_velocity_3d] to use this. */
        get rotationVelocity3DCurve(): null | CurveXyzTexture
        set rotationVelocity3DCurve(value: null | CurveXyzTexture)
        
        /** Gravity applied to every particle. */
        get gravity(): Vector3
        set gravity(value: Vector3)
        get linearAccel(): Vector2
        set linearAccel(value: Vector2)
        
        /** Minimum equivalent of [member linear_accel_max]. */
        get linearAccelMin(): float64
        set linearAccelMin(value: float64)
        
        /** Maximum linear acceleration applied to each particle in the direction of motion. */
        get linearAccelMax(): float64
        set linearAccelMax(value: float64)
        
        /** Each particle's linear acceleration will vary along this [CurveTexture]. */
        get linearAccelCurve(): null | CurveTexture
        set linearAccelCurve(value: null | CurveTexture)
        get radialAccel(): Vector2
        set radialAccel(value: Vector2)
        
        /** Minimum equivalent of [member radial_accel_max]. */
        get radialAccelMin(): float64
        set radialAccelMin(value: float64)
        
        /** Maximum radial acceleration applied to each particle. Makes particle accelerate away from the origin or towards it if negative. */
        get radialAccelMax(): float64
        set radialAccelMax(value: float64)
        
        /** Each particle's radial acceleration will vary along this [CurveTexture]. */
        get radialAccelCurve(): null | CurveTexture
        set radialAccelCurve(value: null | CurveTexture)
        get tangentialAccel(): Vector2
        set tangentialAccel(value: Vector2)
        
        /** Minimum equivalent of [member tangential_accel_max]. */
        get tangentialAccelMin(): float64
        set tangentialAccelMin(value: float64)
        
        /** Maximum tangential acceleration applied to each particle. Tangential acceleration is perpendicular to the particle's velocity giving the particles a swirling motion. */
        get tangentialAccelMax(): float64
        set tangentialAccelMax(value: float64)
        
        /** Each particle's tangential acceleration will vary along this [CurveTexture]. */
        get tangentialAccelCurve(): null | CurveTexture
        set tangentialAccelCurve(value: null | CurveTexture)
        get damping(): Vector2
        set damping(value: Vector2)
        
        /** Minimum equivalent of [member damping_max]. */
        get dampingMin(): float64
        set dampingMin(value: float64)
        
        /** The maximum rate at which particles lose velocity. For example value of `100` means that the particle will go from `100` velocity to `0` in `1` second. */
        get dampingMax(): float64
        set dampingMax(value: float64)
        
        /** Damping will vary along this [CurveTexture]. */
        get dampingCurve(): null | CurveTexture
        set dampingCurve(value: null | CurveTexture)
        
        /** If `true`, interaction with particle attractors is enabled. In 3D, attraction only occurs within the area defined by the [GPUParticles3D] node's [member GPUParticles3D.visibility_aabb]. */
        get attractorInteractionEnabled(): boolean
        set attractorInteractionEnabled(value: boolean)
        
        /** Enable the usage of [member scale_3d_min] and [member scale_3d_max]. */
        get useScale3D(): boolean
        set useScale3D(value: boolean)
        
        /** The minimum value of the random scale vector for each particle.  
         *  Works only if [member use_scale_3d] is enabled.  
         */
        get scale3DMin(): Vector3
        set scale3DMin(value: Vector3)
        
        /** The maximum value of the random scale vector for each particle.  
         *  Works only if [member use_scale_3d] is enabled.  
         */
        get scale3DMax(): Vector3
        set scale3DMax(value: Vector3)
        get scale(): Vector2
        set scale(value: Vector2)
        
        /** Minimum equivalent of [member scale_max]. */
        get scaleMin(): float64
        set scaleMin(value: float64)
        
        /** Maximum initial scale applied to each particle. */
        get scaleMax(): float64
        set scaleMax(value: float64)
        
        /** Each particle's scale will vary along this [CurveTexture] over its lifetime. If a [CurveXYZTexture] is supplied instead, the scale will be separated per-axis. */
        get scaleCurve(): null | CurveTexture | CurveXyzTexture
        set scaleCurve(value: null | CurveTexture | CurveXyzTexture)
        get scaleOverVelocity(): Vector2
        set scaleOverVelocity(value: Vector2)
        
        /** Minimum velocity value reference for [member scale_over_velocity_curve].  
         *  [member scale_over_velocity_curve] will be interpolated between [member scale_over_velocity_min] and [member scale_over_velocity_max].  
         */
        get scaleOverVelocityMin(): float64
        set scaleOverVelocityMin(value: float64)
        
        /** Maximum velocity value reference for [member scale_over_velocity_curve].  
         *  [member scale_over_velocity_curve] will be interpolated between [member scale_over_velocity_min] and [member scale_over_velocity_max].  
         */
        get scaleOverVelocityMax(): float64
        set scaleOverVelocityMax(value: float64)
        
        /** Either a [CurveTexture] or a [CurveXYZTexture] that scales each particle based on its velocity. */
        get scaleOverVelocityCurve(): null | CurveTexture | CurveXyzTexture
        set scaleOverVelocityCurve(value: null | CurveTexture | CurveXyzTexture)
        
        /** Each particle's initial color. If the [GPUParticles2D]'s `texture` is defined, it will be multiplied by this color.  
         *      
         *  **Note:** [member color] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function. Otherwise, [member color] will have no visible effect.  
         */
        get color(): Color
        set color(value: Color)
        
        /** Each particle's color will vary along this [GradientTexture1D] over its lifetime (multiplied with [member color]).  
         *      
         *  **Note:** [member color_ramp] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function. Otherwise, [member color_ramp] will have no visible effect.  
         */
        get colorRamp(): null | GradientTexture1D
        set colorRamp(value: null | GradientTexture1D)
        
        /** Each particle's initial color will vary along this [GradientTexture1D] (multiplied with [member color]).  
         *      
         *  **Note:** [member color_initial_ramp] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function. Otherwise, [member color_initial_ramp] will have no visible effect.  
         */
        get colorInitialRamp(): null | GradientTexture1D
        set colorInitialRamp(value: null | GradientTexture1D)
        
        /** The alpha value of each particle's color will be multiplied by this [CurveTexture] over its lifetime.  
         *      
         *  **Note:** [member alpha_curve] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALPHA *= COLOR.a;` must be inserted in the shader's `fragment()` function. Otherwise, [member alpha_curve] will have no visible effect.  
         */
        get alphaCurve(): null | CurveTexture
        set alphaCurve(value: null | CurveTexture)
        
        /** Each particle's color will be multiplied by this [CurveTexture] over its lifetime.  
         *      
         *  **Note:** [member emission_curve] multiplies the particle mesh's vertex colors. To have a visible effect on a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo]  *must*  be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function. Otherwise, [member emission_curve] will have no visible effect.  
         */
        get emissionCurve(): null | CurveTexture
        set emissionCurve(value: null | CurveTexture)
        get hueVariation(): Vector2
        set hueVariation(value: Vector2)
        
        /** Minimum equivalent of [member hue_variation_max]. */
        get hueVariationMin(): float64
        set hueVariationMin(value: float64)
        
        /** Maximum initial hue variation applied to each particle. It will shift the particle color's hue. */
        get hueVariationMax(): float64
        set hueVariationMax(value: float64)
        
        /** Each particle's hue will vary along this [CurveTexture]. */
        get hueVariationCurve(): null | CurveTexture
        set hueVariationCurve(value: null | CurveTexture)
        get animSpeed(): Vector2
        set animSpeed(value: Vector2)
        
        /** Minimum equivalent of [member anim_speed_max]. */
        get animSpeedMin(): float64
        set animSpeedMin(value: float64)
        
        /** Maximum particle animation speed. Animation speed of `1` means that the particles will make full `0` to `1` offset cycle during lifetime, `2` means `2` cycles etc.  
         *  With animation speed greater than `1`, remember to enable [member CanvasItemMaterial.particles_anim_loop] property if you want the animation to repeat.  
         */
        get animSpeedMax(): float64
        set animSpeedMax(value: float64)
        
        /** Each particle's animation speed will vary along this [CurveTexture]. */
        get animSpeedCurve(): null | CurveTexture
        set animSpeedCurve(value: null | CurveTexture)
        get animOffset(): Vector2
        set animOffset(value: Vector2)
        
        /** Minimum equivalent of [member anim_offset_max]. */
        get animOffsetMin(): float64
        set animOffsetMin(value: float64)
        
        /** Maximum animation offset that corresponds to frame index in the texture. `0` is the first frame, `1` is the last one. See [member CanvasItemMaterial.particles_animation]. */
        get animOffsetMax(): float64
        set animOffsetMax(value: float64)
        
        /** Each particle's animation offset will vary along this [CurveTexture]. */
        get animOffsetCurve(): null | CurveTexture
        set animOffsetCurve(value: null | CurveTexture)
        
        /** If `true`, enables turbulence for the particle system. Turbulence can be used to vary particle movement according to its position (based on a 3D noise pattern). In 3D, [GPUParticlesAttractorVectorField3D] with [NoiseTexture3D] can be used as an alternative to turbulence that works in world space and with multiple particle systems reacting in the same way.  
         *      
         *  **Note:** Enabling turbulence has a high performance cost on the GPU. Only enable turbulence on a few particle systems at once at most, and consider disabling it when targeting mobile/web platforms.  
         */
        get turbulenceEnabled(): boolean
        set turbulenceEnabled(value: boolean)
        
        /** The turbulence noise strength. Increasing this will result in a stronger, more contrasting, flow pattern. */
        get turbulenceNoiseStrength(): float64
        set turbulenceNoiseStrength(value: float64)
        
        /** This value controls the overall scale/frequency of the turbulence noise pattern.  
         *  A small scale will result in smaller features with more detail while a high scale will result in smoother noise with larger features.  
         */
        get turbulenceNoiseScale(): float64
        set turbulenceNoiseScale(value: float64)
        
        /** A scrolling velocity for the turbulence field. This sets a directional trend for the pattern to move in over time.  
         *  The default value of `Vector3(0, 0, 0)` turns off the scrolling.  
         */
        get turbulenceNoiseSpeed(): Vector3
        set turbulenceNoiseSpeed(value: Vector3)
        
        /** The in-place rate of change of the turbulence field. This defines how quickly the noise pattern varies over time.  
         *  A value of 0.0 will result in a fixed pattern.  
         */
        get turbulenceNoiseSpeedRandom(): float64
        set turbulenceNoiseSpeedRandom(value: float64)
        get turbulenceInfluence(): Vector2
        set turbulenceInfluence(value: Vector2)
        
        /** Minimum turbulence influence on each particle.  
         *  The actual amount of turbulence influence on each particle is calculated as a random value between [member turbulence_influence_min] and [member turbulence_influence_max] and multiplied by the amount of turbulence influence from [member turbulence_influence_over_life].  
         */
        get turbulenceInfluenceMin(): float64
        set turbulenceInfluenceMin(value: float64)
        
        /** Maximum turbulence influence on each particle.  
         *  The actual amount of turbulence influence on each particle is calculated as a random value between [member turbulence_influence_min] and [member turbulence_influence_max] and multiplied by the amount of turbulence influence from [member turbulence_influence_over_life].  
         */
        get turbulenceInfluenceMax(): float64
        set turbulenceInfluenceMax(value: float64)
        get turbulenceInitialDisplacement(): Vector2
        set turbulenceInitialDisplacement(value: Vector2)
        
        /** Minimum displacement of each particle's spawn position by the turbulence.  
         *  The actual amount of displacement will be a factor of the underlying turbulence multiplied by a random value between [member turbulence_initial_displacement_min] and [member turbulence_initial_displacement_max].  
         */
        get turbulenceInitialDisplacementMin(): float64
        set turbulenceInitialDisplacementMin(value: float64)
        
        /** Maximum displacement of each particle's spawn position by the turbulence.  
         *  The actual amount of displacement will be a factor of the underlying turbulence multiplied by a random value between [member turbulence_initial_displacement_min] and [member turbulence_initial_displacement_max].  
         */
        get turbulenceInitialDisplacementMax(): float64
        set turbulenceInitialDisplacementMax(value: float64)
        
        /** Each particle's amount of turbulence will be influenced along this [CurveTexture] over its life time. */
        get turbulenceInfluenceOverLife(): null | CurveTexture
        set turbulenceInfluenceOverLife(value: null | CurveTexture)
        
        /** The particles' collision mode.  
         *      
         *  **Note:** 3D Particles can only collide with [GPUParticlesCollision3D] nodes, not [PhysicsBody3D] nodes. To make particles collide with various objects, you can add [GPUParticlesCollision3D] nodes as children of [PhysicsBody3D] nodes. In 3D, collisions only occur within the area defined by the [GPUParticles3D] node's [member GPUParticles3D.visibility_aabb].  
         *      
         *  **Note:** 2D Particles can only collide with [LightOccluder2D] nodes, not [PhysicsBody2D] nodes.  
         */
        get collisionMode(): int64
        set collisionMode(value: int64)
        
        /** The particles' friction. Values range from `0` (frictionless) to `1` (maximum friction). Only effective if [member collision_mode] is [constant COLLISION_RIGID]. */
        get collisionFriction(): float64
        set collisionFriction(value: float64)
        
        /** The particles' bounciness. Values range from `0` (no bounce) to `1` (full bounciness). Only effective if [member collision_mode] is [constant COLLISION_RIGID]. */
        get collisionBounce(): float64
        set collisionBounce(value: float64)
        
        /** If `true`, [member GPUParticles3D.collision_base_size] is multiplied by the particle's effective scale (see [member scale_min], [member scale_max], [member scale_curve], and [member scale_over_velocity_curve]). */
        get collisionUseScale(): boolean
        set collisionUseScale(value: boolean)
        
        /** The particle subemitter mode (see [member GPUParticles2D.sub_emitter] and [member GPUParticles3D.sub_emitter]). */
        get subEmitterMode(): int64
        set subEmitterMode(value: int64)
        
        /** The frequency at which particles should be emitted from the subemitter node. One particle will be spawned every [member sub_emitter_frequency] seconds.  
         *      
         *  **Note:** This value shouldn't exceed [member GPUParticles2D.amount] or [member GPUParticles3D.amount] defined on the  *subemitter node*  (not the main node), relative to the subemitter's particle lifetime. If the number of particles is exceeded, no new particles will spawn from the subemitter until enough particles have expired.  
         */
        get subEmitterFrequency(): float64
        set subEmitterFrequency(value: float64)
        
        /** The amount of particles to spawn from the subemitter node when the particle expires.  
         *      
         *  **Note:** This value shouldn't exceed [member GPUParticles2D.amount] or [member GPUParticles3D.amount] defined on the  *subemitter node*  (not the main node), relative to the subemitter's particle lifetime. If the number of particles is exceeded, no new particles will spawn from the subemitter until enough particles have expired.  
         */
        get subEmitterAmountAtEnd(): int64
        set subEmitterAmountAtEnd(value: int64)
        
        /** The amount of particles to spawn from the subemitter node when a collision occurs. When combined with [constant COLLISION_HIDE_ON_CONTACT] on the main particles material, this can be used to achieve effects such as raindrops hitting the ground.  
         *      
         *  **Note:** This value shouldn't exceed [member GPUParticles2D.amount] or [member GPUParticles3D.amount] defined on the  *subemitter node*  (not the main node), relative to the subemitter's particle lifetime. If the number of particles is exceeded, no new particles will spawn from the subemitter until enough particles have expired.  
         */
        get subEmitterAmountAtCollision(): int64
        set subEmitterAmountAtCollision(value: int64)
        
        /** The amount of particles to spawn from the subemitter node when the particle spawns.  
         *      
         *  **Note:** This value shouldn't exceed [member GPUParticles2D.amount] or [member GPUParticles3D.amount] defined on the  *subemitter node*  (not the main node), relative to the subemitter's particle lifetime. If the number of particles is exceeded, no new particles will spawn from the subemitter until enough particles have expired.  
         */
        get subEmitterAmountAtStart(): int64
        set subEmitterAmountAtStart(value: int64)
        
        /** If `true`, the subemitter inherits the parent particle's velocity when it spawns. */
        get subEmitterKeepVelocity(): boolean
        set subEmitterKeepVelocity(value: boolean)
        
        /** Emitted when this material's emission shape is changed in any way. This includes changes to [member emission_shape], [member emission_shape_scale], or [member emission_sphere_radius], and any other property that affects the emission shape's offset, size, scale, or orientation.  
         *      
         *  **Note:** This signal is only emitted inside the editor for performance reasons.  
         */
        readonly emissionShapeChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapParticleProcessMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapParticleProcessMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPath2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPath2D extends __NameMapNode2D {
    }
    /** Contains a [Curve2D] path for [PathFollow2D] nodes to follow.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_path2d.html  
     */
    class Path2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** A [Curve2D] describing the path. */
        get curve(): null | Curve2D
        set curve(value: null | Curve2D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPath2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPath2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPath3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPath3D extends __NameMapNode3D {
        debug_custom_color: "debugCustomColor";
        curve_changed: "curveChanged";
        debug_color_changed: "debugColorChanged";
    }
    /** Contains a [Curve3D] path for [PathFollow3D] nodes to follow.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_path3d.html  
     */
    class Path3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** A [Curve3D] describing the path. */
        get curve(): null | Curve3D
        set curve(value: null | Curve3D)
        
        /** The custom color used to draw the path in the editor. If set to [constant Color.BLACK] (as by default), the color set in [member ProjectSettings.debug/shapes/paths/geometry_color] is used. */
        get debugCustomColor(): Color
        set debugCustomColor(value: Color)
        
        /** Emitted when the [member curve] changes. */
        readonly curveChanged: Signal<() => void>
        
        /** Emitted when the [member debug_custom_color] changes. */
        readonly debugColorChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPath3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPath3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPathFollow2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPathFollow2D extends __NameMapNode2D {
        progress_ratio: "progressRatio";
        h_offset: "hOffset";
        v_offset: "vOffset";
        cubic_interp: "cubicInterp";
    }
    /** Point sampler for a [Path2D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pathfollow2d.html  
     */
    class PathFollow2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The distance along the path, in pixels. Changing this value sets this node's position to a point within the path. */
        get progress(): float64
        set progress(value: float64)
        
        /** The distance along the path as a number in the range 0.0 (for the first vertex) to 1.0 (for the last). This is just another way of expressing the progress within the path, as the offset supplied is multiplied internally by the path's length.  
         *  It can be set or get only if the [PathFollow2D] is the child of a [Path2D] which is part of the scene tree, and that this [Path2D] has a [Curve2D] with a non-zero length. Otherwise, trying to set this field will print an error, and getting this field will return `0.0`.  
         */
        get progressRatio(): float64
        set progressRatio(value: float64)
        
        /** The node's offset along the curve. */
        get hOffset(): float64
        set hOffset(value: float64)
        
        /** The node's offset perpendicular to the curve. */
        get vOffset(): float64
        set vOffset(value: float64)
        
        /** If `true`, this node rotates to follow the path, with the +X direction facing forward on the path. */
        get rotates(): boolean
        set rotates(value: boolean)
        
        /** If `true`, the position between two cached points is interpolated cubically, and linearly otherwise.  
         *  The points along the [Curve2D] of the [Path2D] are precomputed before use, for faster calculations. The point at the requested offset is then calculated interpolating between two adjacent cached points. This may present a problem if the curve makes sharp turns, as the cached points may not follow the curve closely enough.  
         *  There are two answers to this problem: either increase the number of cached points and increase memory consumption, or make a cubic interpolation between two points at the cost of (slightly) slower calculations.  
         */
        get cubicInterp(): boolean
        set cubicInterp(value: boolean)
        
        /** If `true`, any offset outside the path's length will wrap around, instead of stopping at the ends. Use it for cyclic paths. */
        get loop(): boolean
        set loop(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPathFollow2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPathFollow2D;
    }
    namespace PathFollow3D {
        enum RotationMode {
            RotationNone = 0,
            RotationY = 1,
            RotationXy = 2,
            RotationXyz = 3,
            RotationOriented = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPathFollow3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPathFollow3D extends __NameMapNode3D {
        correct_posture: "correctPosture";
        progress_ratio: "progressRatio";
        h_offset: "hOffset";
        v_offset: "vOffset";
        rotation_mode: "rotationMode";
        use_model_front: "useModelFront";
        cubic_interp: "cubicInterp";
        tilt_enabled: "tiltEnabled";
    }
    /** Point sampler for a [Path3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pathfollow3d.html  
     */
    class PathFollow3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Correct the [param transform]. [param rotation_mode] implicitly specifies how posture (forward, up and sideway direction) is calculated. */
        static correctPosture(transform: Transform3D, rotationMode: PathFollow3D.RotationMode): Transform3D
        
        /** The distance from the first vertex, measured in 3D units along the path. Changing this value sets this node's position to a point within the path. */
        get progress(): float64
        set progress(value: float64)
        
        /** The distance from the first vertex, considering 0.0 as the first vertex and 1.0 as the last. This is just another way of expressing the progress within the path, as the progress supplied is multiplied internally by the path's length.  
         *  It can be set or get only if the [PathFollow3D] is the child of a [Path3D] which is part of the scene tree, and that this [Path3D] has a [Curve3D] with a non-zero length. Otherwise, trying to set this field will print an error, and getting this field will return `0.0`.  
         */
        get progressRatio(): float64
        set progressRatio(value: float64)
        
        /** The node's offset along the curve. */
        get hOffset(): float64
        set hOffset(value: float64)
        
        /** The node's offset perpendicular to the curve. */
        get vOffset(): float64
        set vOffset(value: float64)
        
        /** Allows or forbids rotation on one or more axes, depending on the [enum RotationMode] constants being used. */
        get rotationMode(): int64
        set rotationMode(value: int64)
        
        /** If `true`, the node moves on the travel path with orienting the +Z axis as forward. See also [constant Vector3.FORWARD] and [constant Vector3.MODEL_FRONT]. */
        get useModelFront(): boolean
        set useModelFront(value: boolean)
        
        /** If `true`, the position between two cached points is interpolated cubically, and linearly otherwise.  
         *  The points along the [Curve3D] of the [Path3D] are precomputed before use, for faster calculations. The point at the requested offset is then calculated interpolating between two adjacent cached points. This may present a problem if the curve makes sharp turns, as the cached points may not follow the curve closely enough.  
         *  There are two answers to this problem: either increase the number of cached points and increase memory consumption, or make a cubic interpolation between two points at the cost of (slightly) slower calculations.  
         */
        get cubicInterp(): boolean
        set cubicInterp(value: boolean)
        
        /** If `true`, any offset outside the path's length will wrap around, instead of stopping at the ends. Use it for cyclic paths. */
        get loop(): boolean
        set loop(value: boolean)
        
        /** If `true`, the tilt property of [Curve3D] takes effect. */
        get tiltEnabled(): boolean
        set tiltEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPathFollow3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPathFollow3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicalBone2D extends __RPCMapRigidBody2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicalBone2D extends __NameMapRigidBody2D {
        get_joint: "getJoint";
        is_simulating_physics: "isSimulatingPhysics";
        bone2d_nodepath: "bone2DNodePath";
        bone2d_index: "bone2DIndex";
        auto_configure_joint: "autoConfigureJoint";
        simulate_physics: "simulatePhysics";
        follow_bone_when_simulating: "followBoneWhenSimulating";
    }
    /** A [RigidBody2D]-derived node used to make [Bone2D]s in a [Skeleton2D] react to physics.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicalbone2d.html  
     */
    class PhysicalBone2D<Map extends NodePathMap = any> extends RigidBody2D<Map> {
        constructor(identifier?: any)
        /** Returns the first [Joint2D] child node, if one exists. This is mainly a helper function to make it easier to get the [Joint2D] that the [PhysicalBone2D] is autoconfiguring. */
        getJoint(): null | Joint2D
        
        /** Returns a boolean that indicates whether the [PhysicalBone2D] is running and simulating using the Godot 2D physics engine. When `true`, the PhysicalBone2D node is using physics. */
        isSimulatingPhysics(): boolean
        
        /** The [NodePath] to the [Bone2D] that this [PhysicalBone2D] should simulate. */
        get bone2DNodePath(): NodePath
        set bone2DNodePath(value: NodePath | string)
        
        /** The index of the [Bone2D] that this [PhysicalBone2D] should simulate. */
        get bone2DIndex(): int64
        set bone2DIndex(value: int64)
        
        /** If `true`, the [PhysicalBone2D] will automatically configure the first [Joint2D] child node. The automatic configuration is limited to setting up the node properties and positioning the [Joint2D]. */
        get autoConfigureJoint(): boolean
        set autoConfigureJoint(value: boolean)
        
        /** If `true`, the [PhysicalBone2D] will start simulating using physics. If `false`, the [PhysicalBone2D] will follow the transform of the [Bone2D] node.  
         *      
         *  **Note:** To have the [Bone2D]s visually follow the [PhysicalBone2D], use a [SkeletonModification2DPhysicalBones] modification on the [Skeleton2D] node with the [Bone2D] nodes.  
         */
        get simulatePhysics(): boolean
        set simulatePhysics(value: boolean)
        
        /** If `true`, the [PhysicalBone2D] will keep the transform of the bone it is bound to when simulating physics. */
        get followBoneWhenSimulating(): boolean
        set followBoneWhenSimulating(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicalBone2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicalBone2D;
    }
    namespace PhysicalBone3D {
        enum DampMode {
            DampModeCombine = 0,
            DampModeReplace = 1,
        }
        enum JointType {
            JointTypeNone = 0,
            JointTypePin = 1,
            JointTypeCone = 2,
            JointTypeHinge = 3,
            JointTypeSlider = 4,
            JointType6Dof = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicalBone3D extends __RPCMapPhysicsBody3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicalBone3D extends __NameMapPhysicsBody3D {
        _integrate_forces: "_integrateForces";
        apply_central_impulse: "applyCentralImpulse";
        apply_impulse: "applyImpulse";
        get_joint_rid: "getJointRid";
        get_simulate_physics: "getSimulatePhysics";
        is_simulating_physics: "isSimulatingPhysics";
        get_bone_id: "getBoneId";
        joint_type: "jointType";
        joint_offset: "jointOffset";
        joint_rotation: "jointRotation";
        body_offset: "bodyOffset";
        gravity_scale: "gravityScale";
        custom_integrator: "customIntegrator";
        linear_damp_mode: "linearDampMode";
        linear_damp: "linearDamp";
        angular_damp_mode: "angularDampMode";
        angular_damp: "angularDamp";
        linear_velocity: "linearVelocity";
        angular_velocity: "angularVelocity";
        can_sleep: "canSleep";
    }
    /** A physics body used to make bones in a [Skeleton3D] react to physics.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicalbone3d.html  
     */
    class PhysicalBone3D<Map extends NodePathMap = any> extends PhysicsBody3D<Map> {
        constructor(identifier?: any)
        /** Called during physics processing, allowing you to read and safely modify the simulation state for the object. By default, it is called before the standard force integration, but the [member custom_integrator] property allows you to disable the standard force integration and do fully custom force integration for a body. */
        /* gdvirtual */ _integrateForces(state: PhysicsDirectBodyState3D): void
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_integrate_forces" functions otherwise).  
         *  This is equivalent to using [method apply_impulse] at the body's center of mass.  
         */
        applyCentralImpulse(impulse: Vector3): void
        
        /** Applies a positioned impulse to the PhysicsBone3D.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_integrate_forces" functions otherwise).  
         *  [param position] is the offset from the PhysicsBone3D origin in global coordinates.  
         */
        applyImpulse(impulse: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Returns the joint's internal [RID] from the [PhysicsServer3D]. */
        getJointRid(): Rid
        
        /** Returns `true` if the PhysicsBone3D is allowed to simulate physics. */
        getSimulatePhysics(): boolean
        
        /** Returns `true` if the PhysicsBone3D is currently simulating physics. */
        isSimulatingPhysics(): boolean
        
        /** Returns the unique identifier of the PhysicsBone3D. */
        getBoneId(): int64
        
        /** Sets the joint type. */
        get jointType(): int64
        set jointType(value: int64)
        
        /** Sets the joint's transform. */
        get jointOffset(): Transform3D
        set jointOffset(value: Transform3D)
        
        /** Sets the joint's rotation in radians. */
        get jointRotation(): Vector3
        set jointRotation(value: Vector3)
        
        /** Sets the body's transform. */
        get bodyOffset(): Transform3D
        set bodyOffset(value: Transform3D)
        
        /** The body's mass. */
        get mass(): float64
        set mass(value: float64)
        
        /** The body's friction, from `0` (frictionless) to `1` (max friction). */
        get friction(): float64
        set friction(value: float64)
        
        /** The body's bounciness. Values range from `0` (no bounce) to `1` (full bounciness).  
         *      
         *  **Note:** Even with [member bounce] set to `1.0`, some energy will be lost over time due to linear and angular damping. To have a [PhysicalBone3D] that preserves all its energy over time, set [member bounce] to `1.0`, [member linear_damp_mode] to [constant DAMP_MODE_REPLACE], [member linear_damp] to `0.0`, [member angular_damp_mode] to [constant DAMP_MODE_REPLACE], and [member angular_damp] to `0.0`.  
         */
        get bounce(): float64
        set bounce(value: float64)
        
        /** This is multiplied by [member ProjectSettings.physics/3d/default_gravity] to produce this body's gravity. For example, a value of `1.0` will apply normal gravity, `2.0` will apply double the gravity, and `0.5` will apply half the gravity to this body. */
        get gravityScale(): float64
        set gravityScale(value: float64)
        
        /** If `true`, the standard force integration (like gravity or damping) will be disabled for this body. Other than collision response, the body will only move as determined by the [method _integrate_forces] method, if that virtual method is overridden.  
         *  Setting this property will call the method [method PhysicsServer3D.body_set_omit_force_integration] internally.  
         */
        get customIntegrator(): boolean
        set customIntegrator(value: boolean)
        
        /** Defines how [member linear_damp] is applied. */
        get linearDampMode(): int64
        set linearDampMode(value: int64)
        
        /** Damps the body's movement. By default, the body will use [member ProjectSettings.physics/3d/default_linear_damp] or any value override set by an [Area3D] the body is in. Depending on [member linear_damp_mode], [member linear_damp] may be added to or replace the body's damping value.  
         *  See [member ProjectSettings.physics/3d/default_linear_damp] for more details about damping.  
         */
        get linearDamp(): float64
        set linearDamp(value: float64)
        
        /** Defines how [member angular_damp] is applied. */
        get angularDampMode(): int64
        set angularDampMode(value: int64)
        
        /** Damps the body's rotation. By default, the body will use the [member ProjectSettings.physics/3d/default_angular_damp] project setting or any value override set by an [Area3D] the body is in. Depending on [member angular_damp_mode], you can set [member angular_damp] to be added to or to replace the body's damping value.  
         *  See [member ProjectSettings.physics/3d/default_angular_damp] for more details about damping.  
         */
        get angularDamp(): float64
        set angularDamp(value: float64)
        
        /** The body's linear velocity in units per second. Can be used sporadically, but **don't set this every frame**, because physics may run in another thread and runs at a different granularity. Use [method _integrate_forces] as your process loop for precise control of the body state. */
        get linearVelocity(): Vector3
        set linearVelocity(value: Vector3)
        
        /** The PhysicalBone3D's rotational velocity in  *radians*  per second. */
        get angularVelocity(): Vector3
        set angularVelocity(value: Vector3)
        
        /** If `true`, the body is deactivated when there is no movement, so it will not take part in the simulation until it is awakened by an external force. */
        get canSleep(): boolean
        set canSleep(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicalBone3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicalBone3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicalBoneSimulator3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicalBoneSimulator3D extends __NameMapSkeletonModifier3D {
        is_simulating_physics: "isSimulatingPhysics";
        physical_bones_stop_simulation: "physicalBonesStopSimulation";
        physical_bones_start_simulation: "physicalBonesStartSimulation";
        physical_bones_add_collision_exception: "physicalBonesAddCollisionException";
        physical_bones_remove_collision_exception: "physicalBonesRemoveCollisionException";
    }
    /** Node that can be the parent of [PhysicalBone3D] and can apply the simulation results to [Skeleton3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicalbonesimulator3d.html  
     */
    class PhysicalBoneSimulator3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Returns a boolean that indicates whether the [PhysicalBoneSimulator3D] is running and simulating. */
        isSimulatingPhysics(): boolean
        
        /** Tells the [PhysicalBone3D] nodes in the Skeleton to stop simulating. */
        physicalBonesStopSimulation(): void
        
        /** Tells the [PhysicalBone3D] nodes in the Skeleton to start simulating and reacting to the physics world.  
         *  Optionally, a list of bone names can be passed-in, allowing only the passed-in bones to be simulated.  
         */
        physicalBonesStartSimulation(bones?: GArray<StringName>): void
        
        /** Adds a collision exception to the physical bone.  
         *  Works just like the [RigidBody3D] node.  
         */
        physicalBonesAddCollisionException(exception: Rid): void
        
        /** Removes a collision exception to the physical bone.  
         *  Works just like the [RigidBody3D] node.  
         */
        physicalBonesRemoveCollisionException(exception: Rid): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicalBoneSimulator3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicalBoneSimulator3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicalSkyMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicalSkyMaterial extends __NameMapMaterial {
        rayleigh_coefficient: "rayleighCoefficient";
        rayleigh_color: "rayleighColor";
        mie_coefficient: "mieCoefficient";
        mie_eccentricity: "mieEccentricity";
        mie_color: "mieColor";
        sun_disk_scale: "sunDiskScale";
        ground_color: "groundColor";
        energy_multiplier: "energyMultiplier";
        use_debanding: "useDebanding";
        night_sky: "nightSky";
    }
    /** A material that defines a sky for a [Sky] resource by a set of physical properties.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicalskymaterial.html  
     */
    class PhysicalSkyMaterial extends Material {
        constructor(identifier?: any)
        /** Controls the strength of the [url=https://en.wikipedia.org/wiki/Rayleigh_scattering]Rayleigh scattering[/url]. Rayleigh scattering results from light colliding with small particles. It is responsible for the blue color of the sky. */
        get rayleighCoefficient(): float64
        set rayleighCoefficient(value: float64)
        
        /** Controls the [Color] of the [url=https://en.wikipedia.org/wiki/Rayleigh_scattering]Rayleigh scattering[/url]. While not physically accurate, this allows for the creation of alien-looking planets. For example, setting this to a red [Color] results in a Mars-looking atmosphere with a corresponding blue sunset. */
        get rayleighColor(): Color
        set rayleighColor(value: Color)
        
        /** Controls the strength of [url=https://en.wikipedia.org/wiki/Mie_scattering]Mie scattering[/url] for the sky. Mie scattering results from light colliding with larger particles (like water). On earth, Mie scattering results in a whitish color around the sun and horizon. */
        get mieCoefficient(): float64
        set mieCoefficient(value: float64)
        
        /** Controls the direction of the [url=https://en.wikipedia.org/wiki/Mie_scattering]Mie scattering[/url]. A value of `1` means that when light hits a particle it's passing through straight forward. A value of `-1` means that all light is scatter backwards. */
        get mieEccentricity(): float64
        set mieEccentricity(value: float64)
        
        /** Controls the [Color] of the [url=https://en.wikipedia.org/wiki/Mie_scattering]Mie scattering[/url] effect. While not physically accurate, this allows for the creation of alien-looking planets. */
        get mieColor(): Color
        set mieColor(value: Color)
        
        /** Sets the thickness of the atmosphere. High turbidity creates a foggy-looking atmosphere, while a low turbidity results in a clearer atmosphere. */
        get turbidity(): float64
        set turbidity(value: float64)
        
        /** Sets the size of the sun disk. Default value is based on Sol's perceived size from Earth. */
        get sunDiskScale(): float64
        set sunDiskScale(value: float64)
        
        /** Modulates the [Color] on the bottom half of the sky to represent the ground. */
        get groundColor(): Color
        set groundColor(value: Color)
        
        /** The sky's overall brightness multiplier. Higher values result in a brighter sky. */
        get energyMultiplier(): float64
        set energyMultiplier(value: float64)
        
        /** If `true`, enables debanding. Debanding adds a small amount of noise which helps reduce banding that appears from the smooth changes in color in the sky. */
        get useDebanding(): boolean
        set useDebanding(value: boolean)
        
        /** [Texture2D] for the night sky. This is added to the sky, so if it is bright enough, it may be visible during the day. */
        get nightSky(): null | Texture2D
        set nightSky(value: null | Texture2D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicalSkyMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicalSkyMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsBody2D extends __RPCMapCollisionObject2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsBody2D extends __NameMapCollisionObject2D {
        move_and_collide: "moveAndCollide";
        test_move: "testMove";
        get_gravity: "getGravity";
        get_collision_exceptions: "getCollisionExceptions";
        add_collision_exception_with: "addCollisionExceptionWith";
        remove_collision_exception_with: "removeCollisionExceptionWith";
    }
    /** Abstract base class for 2D game objects affected by physics.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsbody2d.html  
     */
    class PhysicsBody2D<Map extends NodePathMap = any> extends CollisionObject2D<Map> {
        constructor(identifier?: any)
        /** Moves the body along the vector [param motion]. In order to be frame rate independent in [method Node._physics_process] or [method Node._process], [param motion] should be computed using `delta`.  
         *  Returns a [KinematicCollision2D], which contains information about the collision when stopped, or when touching another body along the motion.  
         *  If [param test_only] is `true`, the body does not move but the would-be collision information is given.  
         *  [param safe_margin] is the extra margin used for collision recovery (see [member CharacterBody2D.safe_margin] for more details).  
         *  If [param recovery_as_collision] is `true`, any depenetration from the recovery phase is also reported as a collision; this is used e.g. by [CharacterBody2D] for improving floor detection during floor snapping.  
         */
        moveAndCollide(motion: Vector2, testOnly?: boolean /* = false */, safeMargin?: float64 /* = 0.08 */, recoveryAsCollision?: boolean /* = false */): null | KinematicCollision2D
        
        /** Checks for collisions without moving the body. In order to be frame rate independent in [method Node._physics_process] or [method Node._process], [param motion] should be computed using `delta`.  
         *  Virtually sets the node's position, scale and rotation to that of the given [Transform2D], then tries to move the body along the vector [param motion]. Returns `true` if a collision would stop the body from moving along the whole path.  
         *  [param collision] is an optional object of type [KinematicCollision2D], which contains additional information about the collision when stopped, or when touching another body along the motion.  
         *  [param safe_margin] is the extra margin used for collision recovery (see [member CharacterBody2D.safe_margin] for more details).  
         *  If [param recovery_as_collision] is `true`, any depenetration from the recovery phase is also reported as a collision; this is useful for checking whether the body would  *touch*  any other bodies.  
         */
        testMove(from: Transform2D, motion: Vector2, collision?: KinematicCollision2D, safeMargin?: float64 /* = 0.08 */, recoveryAsCollision?: boolean /* = false */): boolean
        
        /** Returns the gravity vector computed from all sources that can affect the body, including all gravity overrides from [Area2D] nodes and the global world gravity. */
        getGravity(): Vector2
        
        /** Returns an array of nodes that were added as collision exceptions for this body. */
        getCollisionExceptions(): GArray<PhysicsBody2D>
        
        /** Adds a body to the list of bodies that this body can't collide with. */
        addCollisionExceptionWith(body: Node): void
        
        /** Removes a body from the list of bodies that this body can't collide with. */
        removeCollisionExceptionWith(body: Node): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsBody2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsBody2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsBody3D extends __RPCMapCollisionObject3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsBody3D extends __NameMapCollisionObject3D {
        move_and_collide: "moveAndCollide";
        test_move: "testMove";
        get_gravity: "getGravity";
        set_axis_lock: "setAxisLock";
        get_axis_lock: "getAxisLock";
        get_collision_exceptions: "getCollisionExceptions";
        add_collision_exception_with: "addCollisionExceptionWith";
        remove_collision_exception_with: "removeCollisionExceptionWith";
        axis_lock_linear_x: "axisLockLinearX";
        axis_lock_linear_y: "axisLockLinearY";
        axis_lock_linear_z: "axisLockLinearZ";
        axis_lock_angular_x: "axisLockAngularX";
        axis_lock_angular_y: "axisLockAngularY";
        axis_lock_angular_z: "axisLockAngularZ";
    }
    /** Abstract base class for 3D game objects affected by physics.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsbody3d.html  
     */
    class PhysicsBody3D<Map extends NodePathMap = any> extends CollisionObject3D<Map> {
        constructor(identifier?: any)
        /** Moves the body along the vector [param motion]. In order to be frame rate independent in [method Node._physics_process] or [method Node._process], [param motion] should be computed using `delta`.  
         *  The body will stop if it collides. Returns a [KinematicCollision3D], which contains information about the collision when stopped, or when touching another body along the motion.  
         *  If [param test_only] is `true`, the body does not move but the would-be collision information is given.  
         *  [param safe_margin] is the extra margin used for collision recovery (see [member CharacterBody3D.safe_margin] for more details).  
         *  If [param recovery_as_collision] is `true`, any depenetration from the recovery phase is also reported as a collision; this is used e.g. by [CharacterBody3D] for improving floor detection during floor snapping.  
         *  [param max_collisions] allows to retrieve more than one collision result.  
         */
        moveAndCollide(motion: Vector3, testOnly?: boolean /* = false */, safeMargin?: float64 /* = 0.001 */, recoveryAsCollision?: boolean /* = false */, maxCollisions?: int64 /* = 1 */): null | KinematicCollision3D
        
        /** Checks for collisions without moving the body. In order to be frame rate independent in [method Node._physics_process] or [method Node._process], [param motion] should be computed using `delta`.  
         *  Virtually sets the node's position, scale and rotation to that of the given [Transform3D], then tries to move the body along the vector [param motion]. Returns `true` if a collision would stop the body from moving along the whole path.  
         *  [param collision] is an optional object of type [KinematicCollision3D], which contains additional information about the collision when stopped, or when touching another body along the motion.  
         *  [param safe_margin] is the extra margin used for collision recovery (see [member CharacterBody3D.safe_margin] for more details).  
         *  If [param recovery_as_collision] is `true`, any depenetration from the recovery phase is also reported as a collision; this is useful for checking whether the body would  *touch*  any other bodies.  
         *  [param max_collisions] allows to retrieve more than one collision result.  
         */
        testMove(from: Transform3D, motion: Vector3, collision?: KinematicCollision3D, safeMargin?: float64 /* = 0.001 */, recoveryAsCollision?: boolean /* = false */, maxCollisions?: int64 /* = 1 */): boolean
        
        /** Returns the gravity vector computed from all sources that can affect the body, including all gravity overrides from [Area3D] nodes and the global world gravity. */
        getGravity(): Vector3
        
        /** Locks or unlocks the specified linear or rotational [param axis] depending on the value of [param lock]. */
        setAxisLock(axis: PhysicsServer3D.BodyAxis, lock: boolean): void
        
        /** Returns `true` if the specified linear or rotational [param axis] is locked. */
        getAxisLock(axis: PhysicsServer3D.BodyAxis): boolean
        
        /** Returns an array of nodes that were added as collision exceptions for this body. */
        getCollisionExceptions(): GArray<PhysicsBody3D>
        
        /** Adds a body to the list of bodies that this body can't collide with. */
        addCollisionExceptionWith(body: Node): void
        
        /** Removes a body from the list of bodies that this body can't collide with. */
        removeCollisionExceptionWith(body: Node): void
        
        /** Lock the body's linear movement in the X axis. */
        get axisLockLinearX(): boolean
        set axisLockLinearX(value: boolean)
        
        /** Lock the body's linear movement in the Y axis. */
        get axisLockLinearY(): boolean
        set axisLockLinearY(value: boolean)
        
        /** Lock the body's linear movement in the Z axis. */
        get axisLockLinearZ(): boolean
        set axisLockLinearZ(value: boolean)
        
        /** Lock the body's rotation in the X axis. */
        get axisLockAngularX(): boolean
        set axisLockAngularX(value: boolean)
        
        /** Lock the body's rotation in the Y axis. */
        get axisLockAngularY(): boolean
        set axisLockAngularY(value: boolean)
        
        /** Lock the body's rotation in the Z axis. */
        get axisLockAngularZ(): boolean
        set axisLockAngularZ(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsCastMotionResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsCastMotionResult2D extends __NameMapRefCounted {
        safe_fraction: "safeFraction";
        unsafe_fraction: "unsafeFraction";
    }
    /** Stores the result of a shape motion cast query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicscastmotionresult2d.html  
     */
    class PhysicsCastMotionResult2D extends RefCounted {
        constructor(identifier?: any)
        /** The maximum fraction of the motion that can be made without a collision. */
        get safeFraction(): float64
        
        /** The minimum fraction of the distance that must be moved for a collision. */
        get unsafeFraction(): float64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsCastMotionResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsCastMotionResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsCastMotionResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsCastMotionResult3D extends __NameMapRefCounted {
        safe_fraction: "safeFraction";
        unsafe_fraction: "unsafeFraction";
    }
    /** Stores the result of a shape motion cast query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicscastmotionresult3d.html  
     */
    class PhysicsCastMotionResult3D extends RefCounted {
        constructor(identifier?: any)
        /** The maximum fraction of the motion that can be made without a collision. */
        get safeFraction(): float64
        
        /** The minimum fraction of the distance that must be moved for a collision. */
        get unsafeFraction(): float64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsCastMotionResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsCastMotionResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsCollideShapeResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsCollideShapeResult2D extends __NameMapRefCounted {
        get_collision_count: "getCollisionCount";
        get_point_on_queried_shape: "getPointOnQueriedShape";
        get_point_on_colliding_shape: "getPointOnCollidingShape";
        max_collisions: "maxCollisions";
    }
    /** Stores the collision points of a shape collision query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicscollideshaperesult2d.html  
     */
    class PhysicsCollideShapeResult2D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of point pairs detected by the query. */
        getCollisionCount(): int64
        
        /** Returns the collision point on the query shape for the collision at the given index. */
        getPointOnQueriedShape(collisionIndex: int64): Vector2
        
        /** Returns the collision point on the colliding shape for the collision at the given index. */
        getPointOnCollidingShape(collisionIndex: int64): Vector2
        
        /** The maximum number of collisions this object can store. */
        get maxCollisions(): int64
        set maxCollisions(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsCollideShapeResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsCollideShapeResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsCollideShapeResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsCollideShapeResult3D extends __NameMapRefCounted {
        get_collision_count: "getCollisionCount";
        get_point_on_queried_shape: "getPointOnQueriedShape";
        get_point_on_colliding_shape: "getPointOnCollidingShape";
        max_collisions: "maxCollisions";
    }
    /** Stores the collision points of a shape collision query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicscollideshaperesult3d.html  
     */
    class PhysicsCollideShapeResult3D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of point pairs detected by the query. */
        getCollisionCount(): int64
        
        /** Returns the collision point on the query shape for the collision at the given index. */
        getPointOnQueriedShape(collisionIndex: int64): Vector3
        
        /** Returns the collision point on the colliding shape for the collision at the given index. */
        getPointOnCollidingShape(collisionIndex: int64): Vector3
        
        /** The maximum number of collisions this object can store. */
        get maxCollisions(): int64
        set maxCollisions(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsCollideShapeResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsCollideShapeResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectBodyState2D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectBodyState2D extends __NameMapGObject {
        get_velocity_at_local_position: "getVelocityAtLocalPosition";
        apply_central_impulse: "applyCentralImpulse";
        apply_torque_impulse: "applyTorqueImpulse";
        apply_impulse: "applyImpulse";
        apply_central_force: "applyCentralForce";
        apply_force: "applyForce";
        apply_torque: "applyTorque";
        add_constant_central_force: "addConstantCentralForce";
        add_constant_force: "addConstantForce";
        add_constant_torque: "addConstantTorque";
        set_constant_force: "setConstantForce";
        get_constant_force: "getConstantForce";
        set_constant_torque: "setConstantTorque";
        get_constant_torque: "getConstantTorque";
        get_contact_count: "getContactCount";
        get_contact_local_position: "getContactLocalPosition";
        get_contact_local_normal: "getContactLocalNormal";
        get_contact_local_shape: "getContactLocalShape";
        get_contact_local_velocity_at_position: "getContactLocalVelocityAtPosition";
        get_contact_collider: "getContactCollider";
        get_contact_collider_position: "getContactColliderPosition";
        get_contact_collider_id: "getContactColliderId";
        get_contact_collider_object: "getContactColliderObject";
        get_contact_collider_shape: "getContactColliderShape";
        get_contact_collider_velocity_at_position: "getContactColliderVelocityAtPosition";
        get_contact_impulse: "getContactImpulse";
        integrate_forces: "integrateForces";
        get_space_state: "getSpaceState";
        inverse_mass: "inverseMass";
        inverse_inertia: "inverseInertia";
        total_angular_damp: "totalAngularDamp";
        total_linear_damp: "totalLinearDamp";
        total_gravity: "totalGravity";
        center_of_mass: "centerOfMass";
        center_of_mass_local: "centerOfMassLocal";
        angular_velocity: "angularVelocity";
        linear_velocity: "linearVelocity";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
    }
    /** Provides direct access to a physics body in the [PhysicsServer2D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectbodystate2d.html  
     */
    class PhysicsDirectBodyState2D extends GObject {
        constructor(identifier?: any)
        /** Returns the body's velocity at the given relative position.  
         *  [param local_position] is the offset from the body origin in global coordinates.  
         */
        getVelocityAtLocalPosition(localPosition: Vector2): Vector2
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method apply_impulse] at the body's center of mass.  
         */
        applyCentralImpulse(impulse: Vector2): void
        
        /** Applies a rotational impulse to the body without affecting the position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *      
         *  **Note:** [member inverse_inertia] is required for this to work. To have [member inverse_inertia], an active [CollisionShape2D] must be a child of the node, or you can manually set [member inverse_inertia].  
         */
        applyTorqueImpulse(impulse: float64): void
        
        /** Applies a positioned impulse to the body.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyImpulse(impulse: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a directional force without affecting rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method apply_force] at the body's center of mass.  
         */
        applyCentralForce(force?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a positioned force to the body. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyForce(force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a rotational force without affecting position. A force is time dependent and meant to be applied every physics update.  
         *      
         *  **Note:** [member inverse_inertia] is required for this to work. To have [member inverse_inertia], an active [CollisionShape2D] must be a child of the node, or you can manually set [member inverse_inertia].  
         */
        applyTorque(torque: float64): void
        
        /** Adds a constant directional force without affecting rotation that keeps being applied over time until cleared with `constant_force = Vector2(0, 0)`.  
         *  This is equivalent to using [method add_constant_force] at the body's center of mass.  
         */
        addConstantCentralForce(force?: Vector2 /* = Vector2.ZERO */): void
        
        /** Adds a constant positioned force to the body that keeps being applied over time until cleared with `constant_force = Vector2(0, 0)`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        addConstantForce(force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Adds a constant rotational force without affecting position that keeps being applied over time until cleared with `constant_torque = 0`. */
        addConstantTorque(torque: float64): void
        
        /** Sets the body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        setConstantForce(force: Vector2): void
        
        /** Returns the body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        getConstantForce(): Vector2
        
        /** Sets the body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        setConstantTorque(torque: float64): void
        
        /** Returns the body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        getConstantTorque(): float64
        
        /** Returns the number of contacts this body has with other bodies.  
         *      
         *  **Note:** By default, this returns 0 unless bodies are configured to monitor contacts. See [member RigidBody2D.contact_monitor].  
         */
        getContactCount(): int64
        
        /** Returns the position of the contact point on the body in the global coordinate system. */
        getContactLocalPosition(contactIdx: int64): Vector2
        
        /** Returns the local normal at the contact point. */
        getContactLocalNormal(contactIdx: int64): Vector2
        
        /** Returns the local shape index of the collision. */
        getContactLocalShape(contactIdx: int64): int64
        
        /** Returns the velocity vector at the body's contact point. */
        getContactLocalVelocityAtPosition(contactIdx: int64): Vector2
        
        /** Returns the collider's [RID]. */
        getContactCollider(contactIdx: int64): Rid
        
        /** Returns the position of the contact point on the collider in the global coordinate system. */
        getContactColliderPosition(contactIdx: int64): Vector2
        
        /** Returns the collider's object id. */
        getContactColliderId(contactIdx: int64): int64
        
        /** Returns the collider object. This depends on how it was created (will return a scene node if such was used to create it). */
        getContactColliderObject(contactIdx: int64): null | GObject
        
        /** Returns the collider's shape index. */
        getContactColliderShape(contactIdx: int64): int64
        
        /** Returns the velocity vector at the collider's contact point. */
        getContactColliderVelocityAtPosition(contactIdx: int64): Vector2
        
        /** Returns the impulse created by the contact. */
        getContactImpulse(contactIdx: int64): Vector2
        
        /** Updates the body's linear and angular velocity by applying gravity and damping for the equivalent of one physics tick. */
        integrateForces(): void
        
        /** Returns the current state of the space, useful for queries. */
        getSpaceState(): null | PhysicsDirectSpaceState2D
        
        /** The timestep (delta) used for the simulation. */
        get step(): float64
        
        /** The inverse of the mass of the body. */
        get inverseMass(): float64
        
        /** The inverse of the inertia of the body. */
        get inverseInertia(): float64
        
        /** The rate at which the body stops rotating, if there are not any other forces moving it. */
        get totalAngularDamp(): float64
        
        /** The rate at which the body stops moving, if there are not any other forces moving it. */
        get totalLinearDamp(): float64
        
        /** The total gravity vector being currently applied to this body. */
        get totalGravity(): Vector2
        
        /** The body's center of mass position relative to the body's center in the global coordinate system. */
        get centerOfMass(): Vector2
        
        /** The body's center of mass position in the body's local coordinate system. */
        get centerOfMassLocal(): Vector2
        
        /** The body's rotational velocity in  *radians*  per second. */
        get angularVelocity(): float64
        set angularVelocity(value: float64)
        
        /** The body's linear velocity in pixels per second. */
        get linearVelocity(): Vector2
        set linearVelocity(value: Vector2)
        
        /** If `true`, this body is currently sleeping (not active). */
        get sleeping(): boolean
        set sleeping(value: boolean)
        
        /** The body's collision layer. */
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        
        /** The body's collision mask. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The body's transformation matrix. */
        get transform(): Transform2D
        set transform(value: Transform2D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectBodyState2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectBodyState2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectBodyState2DExtension extends __RPCMapPhysicsDirectBodyState2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectBodyState2DExtension extends __NameMapPhysicsDirectBodyState2D {
        _get_total_gravity: "_getTotalGravity";
        _get_total_linear_damp: "_getTotalLinearDamp";
        _get_total_angular_damp: "_getTotalAngularDamp";
        _get_center_of_mass: "_getCenterOfMass";
        _get_center_of_mass_local: "_getCenterOfMassLocal";
        _get_inverse_mass: "_getInverseMass";
        _get_inverse_inertia: "_getInverseInertia";
        _set_linear_velocity: "_setLinearVelocity";
        _get_linear_velocity: "_getLinearVelocity";
        _set_angular_velocity: "_setAngularVelocity";
        _get_angular_velocity: "_getAngularVelocity";
        _set_transform: "_setTransform";
        _get_transform: "_getTransform";
        _get_velocity_at_local_position: "_getVelocityAtLocalPosition";
        _apply_central_impulse: "_applyCentralImpulse";
        _apply_impulse: "_applyImpulse";
        _apply_torque_impulse: "_applyTorqueImpulse";
        _apply_central_force: "_applyCentralForce";
        _apply_force: "_applyForce";
        _apply_torque: "_applyTorque";
        _add_constant_central_force: "_addConstantCentralForce";
        _add_constant_force: "_addConstantForce";
        _add_constant_torque: "_addConstantTorque";
        _set_constant_force: "_setConstantForce";
        _get_constant_force: "_getConstantForce";
        _set_constant_torque: "_setConstantTorque";
        _get_constant_torque: "_getConstantTorque";
        _set_sleep_state: "_setSleepState";
        _is_sleeping: "_isSleeping";
        _set_collision_layer: "_setCollisionLayer";
        _get_collision_layer: "_getCollisionLayer";
        _set_collision_mask: "_setCollisionMask";
        _get_collision_mask: "_getCollisionMask";
        _get_contact_count: "_getContactCount";
        _get_contact_local_position: "_getContactLocalPosition";
        _get_contact_local_normal: "_getContactLocalNormal";
        _get_contact_local_shape: "_getContactLocalShape";
        _get_contact_local_velocity_at_position: "_getContactLocalVelocityAtPosition";
        _get_contact_collider: "_getContactCollider";
        _get_contact_collider_position: "_getContactColliderPosition";
        _get_contact_collider_id: "_getContactColliderId";
        _get_contact_collider_object: "_getContactColliderObject";
        _get_contact_collider_shape: "_getContactColliderShape";
        _get_contact_collider_velocity_at_position: "_getContactColliderVelocityAtPosition";
        _get_contact_impulse: "_getContactImpulse";
        _get_step: "_getStep";
        _integrate_forces: "_integrateForces";
        _get_space_state: "_getSpaceState";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsDirectBodyState2D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectbodystate2dextension.html  
     */
    class PhysicsDirectBodyState2DExtension extends PhysicsDirectBodyState2D {
        constructor(identifier?: any)
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.total_gravity] and its respective getter. */
        /* gdvirtual */ _getTotalGravity(): Vector2
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.total_linear_damp] and its respective getter. */
        /* gdvirtual */ _getTotalLinearDamp(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.total_angular_damp] and its respective getter. */
        /* gdvirtual */ _getTotalAngularDamp(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.center_of_mass] and its respective getter. */
        /* gdvirtual */ _getCenterOfMass(): Vector2
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.center_of_mass_local] and its respective getter. */
        /* gdvirtual */ _getCenterOfMassLocal(): Vector2
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.inverse_mass] and its respective getter. */
        /* gdvirtual */ _getInverseMass(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.inverse_inertia] and its respective getter. */
        /* gdvirtual */ _getInverseInertia(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.linear_velocity] and its respective setter. */
        /* gdvirtual */ _setLinearVelocity(velocity: Vector2): void
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.linear_velocity] and its respective getter. */
        /* gdvirtual */ _getLinearVelocity(): Vector2
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.angular_velocity] and its respective setter. */
        /* gdvirtual */ _setAngularVelocity(velocity: float64): void
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.angular_velocity] and its respective getter. */
        /* gdvirtual */ _getAngularVelocity(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.transform] and its respective setter. */
        /* gdvirtual */ _setTransform(transform: Transform2D): void
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.transform] and its respective getter. */
        /* gdvirtual */ _getTransform(): Transform2D
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_velocity_at_local_position]. */
        /* gdvirtual */ _getVelocityAtLocalPosition(localPosition: Vector2): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_central_impulse]. */
        /* gdvirtual */ _applyCentralImpulse(impulse: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_impulse]. */
        /* gdvirtual */ _applyImpulse(impulse: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_torque_impulse]. */
        /* gdvirtual */ _applyTorqueImpulse(impulse: float64): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_central_force]. */
        /* gdvirtual */ _applyCentralForce(force: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_force]. */
        /* gdvirtual */ _applyForce(force: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.apply_torque]. */
        /* gdvirtual */ _applyTorque(torque: float64): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.add_constant_central_force]. */
        /* gdvirtual */ _addConstantCentralForce(force: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.add_constant_force]. */
        /* gdvirtual */ _addConstantForce(force: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.add_constant_torque]. */
        /* gdvirtual */ _addConstantTorque(torque: float64): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.set_constant_force]. */
        /* gdvirtual */ _setConstantForce(force: Vector2): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_constant_force]. */
        /* gdvirtual */ _getConstantForce(): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.set_constant_torque]. */
        /* gdvirtual */ _setConstantTorque(torque: float64): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_constant_torque]. */
        /* gdvirtual */ _getConstantTorque(): float64
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.sleeping] and its respective setter. */
        /* gdvirtual */ _setSleepState(enabled: boolean): void
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.sleeping] and its respective getter. */
        /* gdvirtual */ _isSleeping(): boolean
        /* gdvirtual */ _setCollisionLayer(layer: int64): void
        /* gdvirtual */ _getCollisionLayer(): int64
        /* gdvirtual */ _setCollisionMask(mask: int64): void
        /* gdvirtual */ _getCollisionMask(): int64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_count]. */
        /* gdvirtual */ _getContactCount(): int64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_local_position]. */
        /* gdvirtual */ _getContactLocalPosition(contactIdx: int64): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_local_normal]. */
        /* gdvirtual */ _getContactLocalNormal(contactIdx: int64): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_local_shape]. */
        /* gdvirtual */ _getContactLocalShape(contactIdx: int64): int64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_local_velocity_at_position]. */
        /* gdvirtual */ _getContactLocalVelocityAtPosition(contactIdx: int64): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider]. */
        /* gdvirtual */ _getContactCollider(contactIdx: int64): Rid
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider_position]. */
        /* gdvirtual */ _getContactColliderPosition(contactIdx: int64): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider_id]. */
        /* gdvirtual */ _getContactColliderId(contactIdx: int64): int64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider_object]. */
        /* gdvirtual */ _getContactColliderObject(contactIdx: int64): null | GObject
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider_shape]. */
        /* gdvirtual */ _getContactColliderShape(contactIdx: int64): int64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_collider_velocity_at_position]. */
        /* gdvirtual */ _getContactColliderVelocityAtPosition(contactIdx: int64): Vector2
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_contact_impulse]. */
        /* gdvirtual */ _getContactImpulse(contactIdx: int64): Vector2
        
        /** Implement to override the behavior of [member PhysicsDirectBodyState2D.step] and its respective getter. */
        /* gdvirtual */ _getStep(): float64
        
        /** Overridable version of [method PhysicsDirectBodyState2D.integrate_forces]. */
        /* gdvirtual */ _integrateForces(): void
        
        /** Overridable version of [method PhysicsDirectBodyState2D.get_space_state]. */
        /* gdvirtual */ _getSpaceState(): null | PhysicsDirectSpaceState2D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectBodyState2DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectBodyState2DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectBodyState3D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectBodyState3D extends __NameMapGObject {
        get_velocity_at_local_position: "getVelocityAtLocalPosition";
        apply_central_impulse: "applyCentralImpulse";
        apply_impulse: "applyImpulse";
        apply_torque_impulse: "applyTorqueImpulse";
        apply_central_force: "applyCentralForce";
        apply_force: "applyForce";
        apply_torque: "applyTorque";
        add_constant_central_force: "addConstantCentralForce";
        add_constant_force: "addConstantForce";
        add_constant_torque: "addConstantTorque";
        set_constant_force: "setConstantForce";
        get_constant_force: "getConstantForce";
        set_constant_torque: "setConstantTorque";
        get_constant_torque: "getConstantTorque";
        get_contact_count: "getContactCount";
        get_contact_local_position: "getContactLocalPosition";
        get_contact_local_normal: "getContactLocalNormal";
        get_contact_impulse: "getContactImpulse";
        get_contact_local_shape: "getContactLocalShape";
        get_contact_local_velocity_at_position: "getContactLocalVelocityAtPosition";
        get_contact_collider: "getContactCollider";
        get_contact_collider_position: "getContactColliderPosition";
        get_contact_collider_id: "getContactColliderId";
        get_contact_collider_object: "getContactColliderObject";
        get_contact_collider_shape: "getContactColliderShape";
        get_contact_collider_velocity_at_position: "getContactColliderVelocityAtPosition";
        integrate_forces: "integrateForces";
        get_space_state: "getSpaceState";
        inverse_mass: "inverseMass";
        total_angular_damp: "totalAngularDamp";
        total_linear_damp: "totalLinearDamp";
        inverse_inertia: "inverseInertia";
        inverse_inertia_tensor: "inverseInertiaTensor";
        total_gravity: "totalGravity";
        center_of_mass: "centerOfMass";
        center_of_mass_local: "centerOfMassLocal";
        principal_inertia_axes: "principalInertiaAxes";
        angular_velocity: "angularVelocity";
        linear_velocity: "linearVelocity";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
    }
    /** Provides direct access to a physics body in the [PhysicsServer3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectbodystate3d.html  
     */
    class PhysicsDirectBodyState3D extends GObject {
        constructor(identifier?: any)
        /** Returns the body's velocity at the given relative position.  
         *  [param local_position] is the offset from the body origin in global coordinates.  
         */
        getVelocityAtLocalPosition(localPosition: Vector3): Vector3
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method apply_impulse] at the body's center of mass.  
         */
        applyCentralImpulse(impulse?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a positioned impulse to the body.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyImpulse(impulse: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational impulse to the body without affecting the position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *      
         *  **Note:** [member inverse_inertia] is required for this to work. To have [member inverse_inertia], an active [CollisionShape3D] must be a child of the node, or you can manually set [member inverse_inertia].  
         */
        applyTorqueImpulse(impulse: Vector3): void
        
        /** Applies a directional force without affecting rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method apply_force] at the body's center of mass.  
         */
        applyCentralForce(force?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a positioned force to the body. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyForce(force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational force without affecting position. A force is time dependent and meant to be applied every physics update.  
         *      
         *  **Note:** [member inverse_inertia] is required for this to work. To have [member inverse_inertia], an active [CollisionShape3D] must be a child of the node, or you can manually set [member inverse_inertia].  
         */
        applyTorque(torque: Vector3): void
        
        /** Adds a constant directional force without affecting rotation that keeps being applied over time until cleared with `constant_force = Vector3(0, 0, 0)`.  
         *  This is equivalent to using [method add_constant_force] at the body's center of mass.  
         */
        addConstantCentralForce(force?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Adds a constant positioned force to the body that keeps being applied over time until cleared with `constant_force = Vector3(0, 0, 0)`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        addConstantForce(force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Adds a constant rotational force without affecting position that keeps being applied over time until cleared with `constant_torque = Vector3(0, 0, 0)`. */
        addConstantTorque(torque: Vector3): void
        
        /** Sets the body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        setConstantForce(force: Vector3): void
        
        /** Returns the body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        getConstantForce(): Vector3
        
        /** Sets the body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        setConstantTorque(torque: Vector3): void
        
        /** Returns the body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        getConstantTorque(): Vector3
        
        /** Returns the number of contacts this body has with other bodies.  
         *      
         *  **Note:** By default, this returns 0 unless bodies are configured to monitor contacts. See [member RigidBody3D.contact_monitor].  
         */
        getContactCount(): int64
        
        /** Returns the position of the contact point on the body in the global coordinate system. */
        getContactLocalPosition(contactIdx: int64): Vector3
        
        /** Returns the local normal at the contact point. */
        getContactLocalNormal(contactIdx: int64): Vector3
        
        /** Impulse created by the contact. */
        getContactImpulse(contactIdx: int64): Vector3
        
        /** Returns the local shape index of the collision. */
        getContactLocalShape(contactIdx: int64): int64
        
        /** Returns the linear velocity vector at the body's contact point. */
        getContactLocalVelocityAtPosition(contactIdx: int64): Vector3
        
        /** Returns the collider's [RID]. */
        getContactCollider(contactIdx: int64): Rid
        
        /** Returns the position of the contact point on the collider in the global coordinate system. */
        getContactColliderPosition(contactIdx: int64): Vector3
        
        /** Returns the collider's object id. */
        getContactColliderId(contactIdx: int64): int64
        
        /** Returns the collider object. */
        getContactColliderObject(contactIdx: int64): null | GObject
        
        /** Returns the collider's shape index. */
        getContactColliderShape(contactIdx: int64): int64
        
        /** Returns the linear velocity vector at the collider's contact point. */
        getContactColliderVelocityAtPosition(contactIdx: int64): Vector3
        
        /** Updates the body's linear and angular velocity by applying gravity and damping for the equivalent of one physics tick. */
        integrateForces(): void
        
        /** Returns the current state of the space, useful for queries. */
        getSpaceState(): null | PhysicsDirectSpaceState3D
        
        /** The timestep (delta) used for the simulation. */
        get step(): float64
        
        /** The inverse of the mass of the body. */
        get inverseMass(): float64
        
        /** The rate at which the body stops rotating, if there are not any other forces moving it. */
        get totalAngularDamp(): float64
        
        /** The rate at which the body stops moving, if there are not any other forces moving it. */
        get totalLinearDamp(): float64
        
        /** The inverse of the inertia of the body. */
        get inverseInertia(): Vector3
        
        /** The inverse of the inertia tensor of the body. */
        get inverseInertiaTensor(): Basis
        
        /** The total gravity vector being currently applied to this body. */
        get totalGravity(): Vector3
        
        /** The body's center of mass position relative to the body's center in the global coordinate system. */
        get centerOfMass(): Vector3
        
        /** The body's center of mass position in the body's local coordinate system. */
        get centerOfMassLocal(): Vector3
        get principalInertiaAxes(): Basis
        
        /** The body's rotational velocity in  *radians*  per second. */
        get angularVelocity(): Vector3
        set angularVelocity(value: Vector3)
        
        /** The body's linear velocity in units per second. */
        get linearVelocity(): Vector3
        set linearVelocity(value: Vector3)
        
        /** If `true`, this body is currently sleeping (not active). */
        get sleeping(): boolean
        set sleeping(value: boolean)
        
        /** The body's collision layer. */
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        
        /** The body's collision mask. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The body's transformation matrix. */
        get transform(): Transform3D
        set transform(value: Transform3D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectBodyState3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectBodyState3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectBodyState3DExtension extends __RPCMapPhysicsDirectBodyState3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectBodyState3DExtension extends __NameMapPhysicsDirectBodyState3D {
        _get_total_gravity: "_getTotalGravity";
        _get_total_linear_damp: "_getTotalLinearDamp";
        _get_total_angular_damp: "_getTotalAngularDamp";
        _get_center_of_mass: "_getCenterOfMass";
        _get_center_of_mass_local: "_getCenterOfMassLocal";
        _get_principal_inertia_axes: "_getPrincipalInertiaAxes";
        _get_inverse_mass: "_getInverseMass";
        _get_inverse_inertia: "_getInverseInertia";
        _get_inverse_inertia_tensor: "_getInverseInertiaTensor";
        _set_linear_velocity: "_setLinearVelocity";
        _get_linear_velocity: "_getLinearVelocity";
        _set_angular_velocity: "_setAngularVelocity";
        _get_angular_velocity: "_getAngularVelocity";
        _set_transform: "_setTransform";
        _get_transform: "_getTransform";
        _get_velocity_at_local_position: "_getVelocityAtLocalPosition";
        _apply_central_impulse: "_applyCentralImpulse";
        _apply_impulse: "_applyImpulse";
        _apply_torque_impulse: "_applyTorqueImpulse";
        _apply_central_force: "_applyCentralForce";
        _apply_force: "_applyForce";
        _apply_torque: "_applyTorque";
        _add_constant_central_force: "_addConstantCentralForce";
        _add_constant_force: "_addConstantForce";
        _add_constant_torque: "_addConstantTorque";
        _set_constant_force: "_setConstantForce";
        _get_constant_force: "_getConstantForce";
        _set_constant_torque: "_setConstantTorque";
        _get_constant_torque: "_getConstantTorque";
        _set_sleep_state: "_setSleepState";
        _is_sleeping: "_isSleeping";
        _set_collision_layer: "_setCollisionLayer";
        _get_collision_layer: "_getCollisionLayer";
        _set_collision_mask: "_setCollisionMask";
        _get_collision_mask: "_getCollisionMask";
        _get_contact_count: "_getContactCount";
        _get_contact_local_position: "_getContactLocalPosition";
        _get_contact_local_normal: "_getContactLocalNormal";
        _get_contact_impulse: "_getContactImpulse";
        _get_contact_local_shape: "_getContactLocalShape";
        _get_contact_local_velocity_at_position: "_getContactLocalVelocityAtPosition";
        _get_contact_collider: "_getContactCollider";
        _get_contact_collider_position: "_getContactColliderPosition";
        _get_contact_collider_id: "_getContactColliderId";
        _get_contact_collider_object: "_getContactColliderObject";
        _get_contact_collider_shape: "_getContactColliderShape";
        _get_contact_collider_velocity_at_position: "_getContactColliderVelocityAtPosition";
        _get_step: "_getStep";
        _integrate_forces: "_integrateForces";
        _get_space_state: "_getSpaceState";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsDirectBodyState3D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectbodystate3dextension.html  
     */
    class PhysicsDirectBodyState3DExtension extends PhysicsDirectBodyState3D {
        constructor(identifier?: any)
        /* gdvirtual */ _getTotalGravity(): Vector3
        /* gdvirtual */ _getTotalLinearDamp(): float64
        /* gdvirtual */ _getTotalAngularDamp(): float64
        /* gdvirtual */ _getCenterOfMass(): Vector3
        /* gdvirtual */ _getCenterOfMassLocal(): Vector3
        /* gdvirtual */ _getPrincipalInertiaAxes(): Basis
        /* gdvirtual */ _getInverseMass(): float64
        /* gdvirtual */ _getInverseInertia(): Vector3
        /* gdvirtual */ _getInverseInertiaTensor(): Basis
        /* gdvirtual */ _setLinearVelocity(velocity: Vector3): void
        /* gdvirtual */ _getLinearVelocity(): Vector3
        /* gdvirtual */ _setAngularVelocity(velocity: Vector3): void
        /* gdvirtual */ _getAngularVelocity(): Vector3
        /* gdvirtual */ _setTransform(transform: Transform3D): void
        /* gdvirtual */ _getTransform(): Transform3D
        /* gdvirtual */ _getVelocityAtLocalPosition(localPosition: Vector3): Vector3
        /* gdvirtual */ _applyCentralImpulse(impulse: Vector3): void
        /* gdvirtual */ _applyImpulse(impulse: Vector3, position: Vector3): void
        /* gdvirtual */ _applyTorqueImpulse(impulse: Vector3): void
        /* gdvirtual */ _applyCentralForce(force: Vector3): void
        /* gdvirtual */ _applyForce(force: Vector3, position: Vector3): void
        /* gdvirtual */ _applyTorque(torque: Vector3): void
        /* gdvirtual */ _addConstantCentralForce(force: Vector3): void
        /* gdvirtual */ _addConstantForce(force: Vector3, position: Vector3): void
        /* gdvirtual */ _addConstantTorque(torque: Vector3): void
        /* gdvirtual */ _setConstantForce(force: Vector3): void
        /* gdvirtual */ _getConstantForce(): Vector3
        /* gdvirtual */ _setConstantTorque(torque: Vector3): void
        /* gdvirtual */ _getConstantTorque(): Vector3
        /* gdvirtual */ _setSleepState(enabled: boolean): void
        /* gdvirtual */ _isSleeping(): boolean
        /* gdvirtual */ _setCollisionLayer(layer: int64): void
        /* gdvirtual */ _getCollisionLayer(): int64
        /* gdvirtual */ _setCollisionMask(mask: int64): void
        /* gdvirtual */ _getCollisionMask(): int64
        /* gdvirtual */ _getContactCount(): int64
        /* gdvirtual */ _getContactLocalPosition(contactIdx: int64): Vector3
        /* gdvirtual */ _getContactLocalNormal(contactIdx: int64): Vector3
        /* gdvirtual */ _getContactImpulse(contactIdx: int64): Vector3
        /* gdvirtual */ _getContactLocalShape(contactIdx: int64): int64
        /* gdvirtual */ _getContactLocalVelocityAtPosition(contactIdx: int64): Vector3
        /* gdvirtual */ _getContactCollider(contactIdx: int64): Rid
        /* gdvirtual */ _getContactColliderPosition(contactIdx: int64): Vector3
        /* gdvirtual */ _getContactColliderId(contactIdx: int64): int64
        /* gdvirtual */ _getContactColliderObject(contactIdx: int64): null | GObject
        /* gdvirtual */ _getContactColliderShape(contactIdx: int64): int64
        /* gdvirtual */ _getContactColliderVelocityAtPosition(contactIdx: int64): Vector3
        /* gdvirtual */ _getStep(): float64
        /* gdvirtual */ _integrateForces(): void
        /* gdvirtual */ _getSpaceState(): null | PhysicsDirectSpaceState3D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectBodyState3DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectBodyState3DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectSpaceState2D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectSpaceState2D extends __NameMapGObject {
        intersect_ray: "intersectRay";
        intersect_point: "intersectPoint";
        intersect_shape: "intersectShape";
        cast_motion: "castMotion";
        collide_shape: "collideShape";
        get_rest_info: "getRestInfo";
        intersect_ray_into: "intersectRayInto";
        intersect_point_into: "intersectPointInto";
        intersect_shape_into: "intersectShapeInto";
        cast_motion_into: "castMotionInto";
        collide_shape_into: "collideShapeInto";
        get_rest_info_into: "getRestInfoInto";
    }
    /** Provides direct access to a physics space in the [PhysicsServer2D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectspacestate2d.html  
     */
    class PhysicsDirectSpaceState2D extends GObject {
        constructor(identifier?: any)
        /** Intersects a ray in a given space. Ray position and other parameters are defined through [PhysicsRayQueryParameters2D]. The returned object is a dictionary with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `normal`: The object's surface normal at the intersection point, or `Vector2(0, 0)` if the ray starts inside the shape and [member PhysicsRayQueryParameters2D.hit_from_inside] is `true`.  
         *  `position`: The intersection point.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  If the ray did not intersect anything, then an empty dictionary is returned instead.  
         */
        intersectRay(parameters: PhysicsRayQueryParameters2D): GDictionary
        
        /** Checks whether a point is inside any solid shape. Position and other parameters are defined through [PhysicsPointQueryParameters2D]. The shapes the point is inside of are returned in an array containing dictionaries with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  The number of intersections can be limited with the [param max_results] parameter, to reduce the processing time.  
         *      
         *  **Note:** [ConcavePolygonShape2D]s and [CollisionPolygon2D]s in `Segments` build mode are not solid shapes. Therefore, they will not be detected.  
         */
        intersectPoint(parameters: PhysicsPointQueryParameters2D, maxResults?: int64 /* = 32 */): GArray<GDictionary>
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space. The intersected shapes are returned in an array containing dictionaries with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  The number of intersections can be limited with the [param max_results] parameter, to reduce the processing time.  
         */
        intersectShape(parameters: PhysicsShapeQueryParameters2D, maxResults?: int64 /* = 32 */): GArray<GDictionary>
        
        /** Checks how far a [Shape2D] can move without colliding. All the parameters for the query, including the shape and the motion, are supplied through a [PhysicsShapeQueryParameters2D] object.  
         *  Returns an array with the safe and unsafe proportions (between 0 and 1) of the motion. The safe proportion is the maximum fraction of the motion that can be made without a collision. The unsafe proportion is the minimum fraction of the distance that must be moved for a collision. If no collision is detected a result of `[1.0, 1.0]` will be returned.  
         *      
         *  **Note:** Any [Shape2D]s that the shape is already colliding with e.g. inside of, will be ignored. Use [method collide_shape] to determine the [Shape2D]s that the shape is already colliding with.  
         */
        castMotion(parameters: PhysicsShapeQueryParameters2D): PackedFloat32Array
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space. The resulting array contains a list of points where the shape intersects another. Like with [method intersect_shape], the number of returned results can be limited to save processing time.  
         *  Returned points are a list of pairs of contact points. For each pair the first one is in the shape passed in [PhysicsShapeQueryParameters2D] object, second one is in the collided shape from the physics space.  
         */
        collideShape(parameters: PhysicsShapeQueryParameters2D, maxResults?: int64 /* = 32 */): GArray<Vector2>
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space. If it collides with more than one shape, the nearest one is selected. The returned object is a dictionary containing the following fields:  
         *  `collider_id`: The colliding object's ID.  
         *  `linear_velocity`: The colliding object's velocity [Vector2]. If the object is an [Area2D], the result is `(0, 0)`.  
         *  `normal`: The collision normal of the query shape at the intersection point, pointing away from the intersecting object.  
         *  `point`: The intersection point.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  If the shape did not intersect anything, then an empty dictionary is returned instead.  
         */
        getRestInfo(parameters: PhysicsShapeQueryParameters2D): GDictionary
        
        /** Intersects a ray in a given space. Ray position and other parameters are defined through [PhysicsRayQueryParameters2D].  
         *  If the ray hits a shape, this method returns `true` and writes the intersection information into the [PhysicsIntersectRayResult2D] object passed in [param result]. If nothing is hit, it returns `false`.  
         */
        intersectRayInto(parameters: PhysicsRayQueryParameters2D, result: PhysicsIntersectRayResult2D): boolean
        
        /** Checks whether a point is inside any solid shape. Position and other parameters are defined through [PhysicsPointQueryParameters2D].  
         *  If one or more shapes overlap the point, this method returns `true` and writes the intersection data into the [PhysicsIntersectPointResult2D] object passed in [param result]. If no intersections are found, it returns `false`.  
         *  The number of intersections can be limited using [member PhysicsIntersectPointResult2D.max_intersections], to reduce the processing time.  
         *      
         *  **Note:** [ConcavePolygonShape2D]s and [CollisionPolygon2D]s in `Segments` build mode are not solid shapes. Therefore, they will not be detected.  
         */
        intersectPointInto(parameters: PhysicsPointQueryParameters2D, result: PhysicsIntersectPointResult2D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space.  
         *  If one or more shapes are found to intersect, this method returns `true` and writes the intersection data into the [PhysicsIntersectShapeResult2D] object passed in [param result]. If no shapes are found to intersect, it returns `false`.  
         *  The number of intersections can be limited using [member PhysicsIntersectShapeResult2D.max_intersections], to reduce the processing time.  
         */
        intersectShapeInto(parameters: PhysicsShapeQueryParameters2D, result: PhysicsIntersectShapeResult2D): boolean
        
        /** Checks how far a [Shape2D] can move without colliding. All the parameters for the query, including the shape and the motion, are supplied through a [PhysicsShapeQueryParameters2D] object.  
         *  If the query is successful, this method returns `true` and writes the motion results into the [PhysicsCastMotionResult2D] object passed in [param result]. If no collision occurs, it returns `false`.  
         *      
         *  **Note:** Any [Shape2D]s that the shape is already colliding with e.g. inside of, will be ignored. Use [method collide_shape_into] to determine the [Shape2D]s that the shape is already colliding with.  
         */
        castMotionInto(parameters: PhysicsShapeQueryParameters2D, result: PhysicsCastMotionResult2D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space.  
         *  If intersections are found, this method returns `true` and writes the collision points into the [PhysicsCollideShapeResult2D] object passed in [param result]. If no intersections are found, it returns `false`.  
         *  The number of returned results can be limited using [member PhysicsCollideShapeResult2D.max_collisions], to reduce the processing time.  
         */
        collideShapeInto(parameters: PhysicsShapeQueryParameters2D, result: PhysicsCollideShapeResult2D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters2D] object, against the space.  
         *  If the shape collides with one or more shapes, this method returns `true` and writes the nearest collision information into the [PhysicsGetRestInfoResult2D] object passed in [param result]. If no collisions occur, it returns `false`.  
         */
        getRestInfoInto(parameters: PhysicsShapeQueryParameters2D, result: PhysicsGetRestInfoResult2D): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectSpaceState2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectSpaceState2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectSpaceState2DExtension extends __RPCMapPhysicsDirectSpaceState2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectSpaceState2DExtension extends __NameMapPhysicsDirectSpaceState2D {
        _intersect_ray: "_intersectRay";
        _intersect_point: "_intersectPoint";
        _intersect_shape: "_intersectShape";
        _cast_motion: "_castMotion";
        _collide_shape: "_collideShape";
        _rest_info: "_restInfo";
        is_body_excluded_from_query: "isBodyExcludedFromQuery";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsDirectSpaceState2D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectspacestate2dextension.html  
     */
    class PhysicsDirectSpaceState2DExtension extends PhysicsDirectSpaceState2D {
        constructor(identifier?: any)
        /* gdvirtual */ _intersectRay(from: Vector2, to: Vector2, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, hitFromInside: boolean, rResult: int64): boolean
        /* gdvirtual */ _intersectPoint(position: Vector2, canvasInstanceId: int64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResults: int64, maxResults: int64): int64
        /* gdvirtual */ _intersectShape(shapeRid: Rid, transform: Transform2D, motion: Vector2, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResult: int64, maxResults: int64): int64
        /* gdvirtual */ _castMotion(shapeRid: Rid, transform: Transform2D, motion: Vector2, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rClosestSafe: int64, rClosestUnsafe: int64): boolean
        /* gdvirtual */ _collideShape(shapeRid: Rid, transform: Transform2D, motion: Vector2, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResults: int64, maxResults: int64, rResultCount: int64): boolean
        /* gdvirtual */ _restInfo(shapeRid: Rid, transform: Transform2D, motion: Vector2, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rRestInfo: int64): boolean
        isBodyExcludedFromQuery(body: Rid): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectSpaceState2DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectSpaceState2DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectSpaceState3D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectSpaceState3D extends __NameMapGObject {
        intersect_ray: "intersectRay";
        intersect_point: "intersectPoint";
        intersect_shape: "intersectShape";
        cast_motion: "castMotion";
        collide_shape: "collideShape";
        get_rest_info: "getRestInfo";
        intersect_ray_into: "intersectRayInto";
        intersect_point_into: "intersectPointInto";
        intersect_shape_into: "intersectShapeInto";
        cast_motion_into: "castMotionInto";
        collide_shape_into: "collideShapeInto";
        get_rest_info_into: "getRestInfoInto";
    }
    /** Provides direct access to a physics space in the [PhysicsServer3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectspacestate3d.html  
     */
    class PhysicsDirectSpaceState3D extends GObject {
        constructor(identifier?: any)
        /** Intersects a ray in a given space. Ray position and other parameters are defined through [PhysicsRayQueryParameters3D]. The returned object is a dictionary with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `normal`: The object's surface normal at the intersection point, or `Vector3(0, 0, 0)` if the ray starts inside the shape and [member PhysicsRayQueryParameters3D.hit_from_inside] is `true`.  
         *  `position`: The intersection point.  
         *  `face_index`: The face index at the intersection point.  
         *      
         *  **Note:** Returns a valid number only if the intersected shape is a [ConcavePolygonShape3D]. Otherwise, `-1` is returned.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  If the ray did not intersect anything, then an empty dictionary is returned instead.  
         */
        intersectRay(parameters: PhysicsRayQueryParameters3D): GDictionary
        
        /** Checks whether a point is inside any solid shape. Position and other parameters are defined through [PhysicsPointQueryParameters3D]. The shapes the point is inside of are returned in an array containing dictionaries with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  The number of intersections can be limited with the [param max_results] parameter, to reduce the processing time.  
         */
        intersectPoint(parameters: PhysicsPointQueryParameters3D, maxResults?: int64 /* = 32 */): GArray<GDictionary>
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space. The intersected shapes are returned in an array containing dictionaries with the following fields:  
         *  `collider`: The colliding object.  
         *  `collider_id`: The colliding object's ID.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  The number of intersections can be limited with the [param max_results] parameter, to reduce the processing time.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        intersectShape(parameters: PhysicsShapeQueryParameters3D, maxResults?: int64 /* = 32 */): GArray<GDictionary>
        
        /** Checks how far a [Shape3D] can move without colliding. All the parameters for the query, including the shape and the motion, are supplied through a [PhysicsShapeQueryParameters3D] object.  
         *  Returns an array with the safe and unsafe proportions (between 0 and 1) of the motion. The safe proportion is the maximum fraction of the motion that can be made without a collision. The unsafe proportion is the minimum fraction of the distance that must be moved for a collision. If no collision is detected a result of `[1.0, 1.0]` will be returned.  
         *      
         *  **Note:** Any [Shape3D]s that the shape is already colliding with e.g. inside of, will be ignored. Use [method collide_shape] to determine the [Shape3D]s that the shape is already colliding with.  
         */
        castMotion(parameters: PhysicsShapeQueryParameters3D): PackedFloat32Array
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space. The resulting array contains a list of points where the shape intersects another. Like with [method intersect_shape], the number of returned results can be limited to save processing time.  
         *  Returned points are a list of pairs of contact points. For each pair the first one is in the shape passed in [PhysicsShapeQueryParameters3D] object, second one is in the collided shape from the physics space.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        collideShape(parameters: PhysicsShapeQueryParameters3D, maxResults?: int64 /* = 32 */): GArray<Vector3>
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space. If it collides with more than one shape, the nearest one is selected. The returned object is a dictionary containing the following fields:  
         *  `collider_id`: The colliding object's ID.  
         *  `linear_velocity`: The colliding object's velocity [Vector3]. If the object is an [Area3D], the result is `(0, 0, 0)`.  
         *  `normal`: The collision normal of the query shape at the intersection point, pointing away from the intersecting object.  
         *  `point`: The intersection point.  
         *  `rid`: The intersecting object's [RID].  
         *  `shape`: The shape index of the colliding shape.  
         *  If the shape did not intersect anything, then an empty dictionary is returned instead.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        getRestInfo(parameters: PhysicsShapeQueryParameters3D): GDictionary
        
        /** Intersects a ray in a given space. Ray position and other parameters are defined through [PhysicsRayQueryParameters3D].  
         *  If the ray hits a shape, this method returns `true` and writes the intersection information into the [PhysicsIntersectRayResult3D] object passed in [param result]. If nothing is hit, it returns `false`.  
         */
        intersectRayInto(parameters: PhysicsRayQueryParameters3D, result: PhysicsIntersectRayResult3D): boolean
        
        /** Checks whether a point is inside any solid shape. Position and other parameters are defined through [PhysicsPointQueryParameters3D].  
         *  If one or more shapes overlap the point, this method returns `true` and writes the intersection data into the [PhysicsIntersectPointResult3D] object passed in [param result]. If no intersections are found, it returns `false`.  
         *  The number of intersections can be limited using [member PhysicsIntersectPointResult3D.max_intersections], to reduce the processing time.  
         */
        intersectPointInto(parameters: PhysicsPointQueryParameters3D, result: PhysicsIntersectPointResult3D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space.  
         *  If one or more shapes are found to intersect, this method returns `true` and writes the intersection data into the [PhysicsIntersectShapeResult3D] object passed in [param result]. If no shapes are found to intersect, it returns `false`.  
         *  The number of intersections can be limited using [member PhysicsIntersectShapeResult3D.max_intersections], to reduce the processing time.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        intersectShapeInto(parameters: PhysicsShapeQueryParameters3D, result: PhysicsIntersectShapeResult3D): boolean
        
        /** Checks how far a [Shape3D] can move without colliding. All the parameters for the query, including the shape and the motion, are supplied through a [PhysicsShapeQueryParameters3D] object.  
         *  If the query is successful, this method returns `true` and writes the motion results into the [PhysicsCastMotionResult3D] object passed in [param result]. If no collision occurs, it returns `false`.  
         *      
         *  **Note:** Any [Shape3D]s that the shape is already colliding with e.g. inside of, will be ignored. Use [method collide_shape_into] to determine the [Shape3D]s that the shape is already colliding with.  
         */
        castMotionInto(parameters: PhysicsShapeQueryParameters3D, result: PhysicsCastMotionResult3D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space.  
         *  If intersections are found, this method returns `true` and writes the collision points into the [PhysicsCollideShapeResult3D] object passed in [param result]. If no intersections are found, it returns `false`.  
         *  The number of returned results can be limited using [member PhysicsCollideShapeResult3D.max_collisions], to reduce the processing time.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        collideShapeInto(parameters: PhysicsShapeQueryParameters3D, result: PhysicsCollideShapeResult3D): boolean
        
        /** Checks the intersections of a shape, given through a [PhysicsShapeQueryParameters3D] object, against the space.  
         *  If the shape collides with one or more shapes, this method returns `true` and writes the nearest collision information into the [PhysicsGetRestInfoResult3D] object passed in [param result]. If no collisions occur, it returns `false`.  
         *      
         *  **Note:** This method does not take into account the `motion` property of the object.  
         */
        getRestInfoInto(parameters: PhysicsShapeQueryParameters3D, result: PhysicsGetRestInfoResult3D): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectSpaceState3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectSpaceState3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsDirectSpaceState3DExtension extends __RPCMapPhysicsDirectSpaceState3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsDirectSpaceState3DExtension extends __NameMapPhysicsDirectSpaceState3D {
        _intersect_ray: "_intersectRay";
        _intersect_point: "_intersectPoint";
        _intersect_shape: "_intersectShape";
        _cast_motion: "_castMotion";
        _collide_shape: "_collideShape";
        _rest_info: "_restInfo";
        _get_closest_point_to_object_volume: "_getClosestPointToObjectVolume";
        is_body_excluded_from_query: "isBodyExcludedFromQuery";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsDirectSpaceState3D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsdirectspacestate3dextension.html  
     */
    class PhysicsDirectSpaceState3DExtension extends PhysicsDirectSpaceState3D {
        constructor(identifier?: any)
        /* gdvirtual */ _intersectRay(from: Vector3, to: Vector3, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, hitFromInside: boolean, hitBackFaces: boolean, pickRay: boolean, rResult: int64): boolean
        /* gdvirtual */ _intersectPoint(position: Vector3, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResults: int64, maxResults: int64): int64
        /* gdvirtual */ _intersectShape(shapeRid: Rid, transform: Transform3D, motion: Vector3, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResultCount: int64, maxResults: int64): int64
        /* gdvirtual */ _castMotion(shapeRid: Rid, transform: Transform3D, motion: Vector3, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rClosestSafe: int64, rClosestUnsafe: int64, rInfo: int64): boolean
        /* gdvirtual */ _collideShape(shapeRid: Rid, transform: Transform3D, motion: Vector3, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rResults: int64, maxResults: int64, rResultCount: int64): boolean
        /* gdvirtual */ _restInfo(shapeRid: Rid, transform: Transform3D, motion: Vector3, margin: float64, collisionMask: int64, collideWithBodies: boolean, collideWithAreas: boolean, rRestInfo: int64): boolean
        /* gdvirtual */ _getClosestPointToObjectVolume(object: Rid, point: Vector3): Vector3
        isBodyExcludedFromQuery(body: Rid): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsDirectSpaceState3DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsDirectSpaceState3DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsGetRestInfoResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsGetRestInfoResult2D extends __NameMapRefCounted {
        collider_rid: "colliderRid";
        collider_id: "colliderId";
        collider_shape: "colliderShape";
        collider_velocity: "colliderVelocity";
    }
    /** Stores the nearest collision information of a shape query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsgetrestinforesult2d.html  
     */
    class PhysicsGetRestInfoResult2D extends RefCounted {
        constructor(identifier?: any)
        /** The intersection point. */
        get point(): Vector2
        
        /** The collision normal of the query shape at the intersection point, pointing away from the intersecting object. */
        get normal(): Vector2
        
        /** The intersecting object's [RID]. */
        get colliderRid(): Rid
        
        /** The colliding object's ID. */
        get colliderId(): int64
        
        /** The shape index of the colliding shape. */
        get colliderShape(): int64
        
        /** The colliding object's velocity [Vector2]. If the object is an [Area2D], the result is `(0, 0)`. */
        get colliderVelocity(): Vector2
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsGetRestInfoResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsGetRestInfoResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsGetRestInfoResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsGetRestInfoResult3D extends __NameMapRefCounted {
        collider_rid: "colliderRid";
        collider_id: "colliderId";
        collider_shape: "colliderShape";
        collider_velocity: "colliderVelocity";
    }
    /** Stores the nearest collision information of a shape query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsgetrestinforesult3d.html  
     */
    class PhysicsGetRestInfoResult3D extends RefCounted {
        constructor(identifier?: any)
        /** The intersection point. */
        get point(): Vector3
        
        /** The collision normal of the query shape at the intersection point, pointing away from the intersecting object. */
        get normal(): Vector3
        
        /** The intersecting object's [RID]. */
        get colliderRid(): Rid
        
        /** The colliding object's ID. */
        get colliderId(): int64
        
        /** The shape index of the colliding shape. */
        get colliderShape(): int64
        
        /** The colliding object's velocity [Vector3]. If the object is an [Area3D], the result is `(0, 0, 0)`. */
        get colliderVelocity(): Vector3
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsGetRestInfoResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsGetRestInfoResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectPointResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectPointResult2D extends __NameMapRefCounted {
        get_intersection_count: "getIntersectionCount";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        max_intersections: "maxIntersections";
    }
    /** Stores the results of a point intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectpointresult2d.html  
     */
    class PhysicsIntersectPointResult2D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of shapes that intersect the queried point. */
        getIntersectionCount(): int64
        
        /** The colliding object's ID. */
        getColliderId(intersectionIndex: int64): int64
        
        /** The intersecting object's [RID]. */
        getColliderRid(intersectionIndex: int64): Rid
        
        /** The colliding object. */
        getCollider(intersectionIndex: int64): null | GObject
        
        /** The shape index of the colliding shape. */
        getColliderShape(intersectionIndex: int64): int64
        
        /** The maximum number of intersections this result object can store. */
        get maxIntersections(): int64
        set maxIntersections(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectPointResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectPointResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectPointResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectPointResult3D extends __NameMapRefCounted {
        get_intersection_count: "getIntersectionCount";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        max_intersections: "maxIntersections";
    }
    /** Stores the results of a point intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectpointresult3d.html  
     */
    class PhysicsIntersectPointResult3D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of shapes that intersect the queried point. */
        getIntersectionCount(): int64
        
        /** The colliding object's ID. */
        getColliderId(intersectionIndex: int64): int64
        
        /** The intersecting object's [RID]. */
        getColliderRid(intersectionIndex: int64): Rid
        
        /** The colliding object. */
        getCollider(intersectionIndex: int64): null | GObject
        
        /** The shape index of the colliding shape. */
        getColliderShape(intersectionIndex: int64): int64
        
        /** The maximum number of intersections this result object can store. */
        get maxIntersections(): int64
        set maxIntersections(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectPointResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectPointResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectRayResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectRayResult2D extends __NameMapRefCounted {
        collider_rid: "colliderRid";
        collider_id: "colliderId";
        collider_shape: "colliderShape";
    }
    /** Stores the result of a ray intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectrayresult2d.html  
     */
    class PhysicsIntersectRayResult2D extends RefCounted {
        constructor(identifier?: any)
        /** The intersection point. */
        get position(): Vector2
        
        /** The object's surface normal at the intersection point, or `Vector2(0, 0)` if the ray starts inside the shape and [member PhysicsRayQueryParameters2D.hit_from_inside] is `true`. */
        get normal(): Vector2
        
        /** The intersecting object's [RID]. */
        get colliderRid(): Rid
        
        /** The colliding object's ID. */
        get colliderId(): int64
        
        /** The colliding object. */
        get collider(): null | GObject
        
        /** The shape index of the colliding shape. */
        get colliderShape(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectRayResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectRayResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectRayResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectRayResult3D extends __NameMapRefCounted {
        collider_rid: "colliderRid";
        collider_id: "colliderId";
        collider_shape: "colliderShape";
        collider_face_index: "colliderFaceIndex";
    }
    /** Stores the result of a ray intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectrayresult3d.html  
     */
    class PhysicsIntersectRayResult3D extends RefCounted {
        constructor(identifier?: any)
        /** The intersection point. */
        get position(): Vector3
        
        /** The object's surface normal at the intersection point, or `Vector3(0, 0, 0)` if the ray starts inside the shape and [member PhysicsRayQueryParameters3D.hit_from_inside] is `true`. */
        get normal(): Vector3
        
        /** The intersecting object's [RID]. */
        get colliderRid(): Rid
        
        /** The colliding object's ID. */
        get colliderId(): int64
        
        /** The colliding object. */
        get collider(): null | GObject
        
        /** The shape index of the colliding shape. */
        get colliderShape(): int64
        
        /** The face index at the intersection point.  
         *      
         *  **Note:** Returns a valid number only if the intersected shape is a [ConcavePolygonShape3D]. Otherwise, `-1` is returned.  
         */
        get colliderFaceIndex(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectRayResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectRayResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectShapeResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectShapeResult2D extends __NameMapRefCounted {
        get_intersection_count: "getIntersectionCount";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        max_intersections: "maxIntersections";
    }
    /** Stores the results of a shape intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectshaperesult2d.html  
     */
    class PhysicsIntersectShapeResult2D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of shapes that intersect with the query shape. */
        getIntersectionCount(): int64
        
        /** The colliding object's ID. */
        getColliderId(intersectionIndex: int64): int64
        
        /** The intersecting object's [RID]. */
        getColliderRid(intersectionIndex: int64): Rid
        
        /** The colliding object. */
        getCollider(intersectionIndex: int64): null | GObject
        
        /** The shape index of the colliding shape. */
        getColliderShape(intersectionIndex: int64): int64
        
        /** The maximum number of intersections this result object can store. */
        get maxIntersections(): int64
        set maxIntersections(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectShapeResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectShapeResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsIntersectShapeResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsIntersectShapeResult3D extends __NameMapRefCounted {
        get_intersection_count: "getIntersectionCount";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        max_intersections: "maxIntersections";
    }
    /** Stores the results of a shape intersection query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsintersectshaperesult3d.html  
     */
    class PhysicsIntersectShapeResult3D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of shapes that intersect with the query shape. */
        getIntersectionCount(): int64
        
        /** The colliding object's ID. */
        getColliderId(intersectionIndex: int64): int64
        
        /** The intersecting object's [RID]. */
        getColliderRid(intersectionIndex: int64): Rid
        
        /** The colliding object. */
        getCollider(intersectionIndex: int64): null | GObject
        
        /** The shape index of the colliding shape. */
        getColliderShape(intersectionIndex: int64): int64
        
        /** The maximum number of intersections this result object can store. */
        get maxIntersections(): int64
        set maxIntersections(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsIntersectShapeResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsIntersectShapeResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsMaterial extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsMaterial extends __NameMapResource {
    }
    /** Holds physics-related properties of a surface, namely its roughness and bounciness.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsmaterial.html  
     */
    class PhysicsMaterial extends Resource {
        constructor(identifier?: any)
        /** The body's friction. Values range from `0` (frictionless) to `1` (maximum friction). */
        get friction(): float64
        set friction(value: float64)
        
        /** If `true`, the physics engine will use the friction of the object marked as "rough" when two objects collide. If `false`, the physics engine will use the lowest friction of all colliding objects instead. If `true` for both colliding objects, the physics engine will use the highest friction. */
        get rough(): boolean
        set rough(value: boolean)
        
        /** The body's bounciness. Values range from `0` (no bounce) to `1` (full bounciness).  
         *      
         *  **Note:** Even with [member bounce] set to `1.0`, some energy will be lost over time due to linear and angular damping. To have a physics body that preserves all its energy over time, set [member bounce] to `1.0`, the body's linear damp mode to **Replace** (if applicable), its linear damp to `0.0`, its angular damp mode to **Replace** (if applicable), and its angular damp to `0.0`.  
         */
        get bounce(): float64
        set bounce(value: float64)
        
        /** If `true`, subtracts the bounciness from the colliding object's bounciness instead of adding it. */
        get absorbent(): boolean
        set absorbent(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsPointQueryParameters2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsPointQueryParameters2D extends __NameMapRefCounted {
        canvas_instance_id: "canvasInstanceId";
        collision_mask: "collisionMask";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
    }
    /** Provides parameters for [method PhysicsDirectSpaceState2D.intersect_point].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicspointqueryparameters2d.html  
     */
    class PhysicsPointQueryParameters2D extends RefCounted {
        constructor(identifier?: any)
        /** The position being queried for, in global coordinates. */
        get position(): Vector2
        set position(value: Vector2)
        
        /** If different from `0`, restricts the query to a specific canvas layer specified by its instance ID. See [method Object.get_instance_id].  
         *  If `0`, restricts the query to the Viewport's default canvas layer.  
         */
        get canvasInstanceId(): int64
        set canvasInstanceId(value: int64)
        
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject2D.get_rid] to get the [RID] associated with a [CollisionObject2D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** If `true`, the query will take [PhysicsBody2D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area2D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsPointQueryParameters2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsPointQueryParameters2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsPointQueryParameters3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsPointQueryParameters3D extends __NameMapRefCounted {
        collision_mask: "collisionMask";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
    }
    /** Provides parameters for [method PhysicsDirectSpaceState3D.intersect_point].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicspointqueryparameters3d.html  
     */
    class PhysicsPointQueryParameters3D extends RefCounted {
        constructor(identifier?: any)
        /** The position being queried for, in global coordinates. */
        get position(): Vector3
        set position(value: Vector3)
        
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject3D.get_rid] to get the [RID] associated with a [CollisionObject3D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** If `true`, the query will take [PhysicsBody3D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area3D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsPointQueryParameters3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsPointQueryParameters3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsRayQueryParameters2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsRayQueryParameters2D extends __NameMapRefCounted {
        collision_mask: "collisionMask";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
        hit_from_inside: "hitFromInside";
    }
    /** Provides parameters for [method PhysicsDirectSpaceState2D.intersect_ray].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsrayqueryparameters2d.html  
     */
    class PhysicsRayQueryParameters2D extends RefCounted {
        constructor(identifier?: any)
        /** Returns a new, pre-configured [PhysicsRayQueryParameters2D] object. Use it to quickly create query parameters using the most common options.  
         *    
         */
        static create(from: Vector2, to: Vector2, collisionMask?: int64 /* = 4294967295 */, exclude?: GArray<Rid>): PhysicsRayQueryParameters2D
        
        /** The starting point of the ray being queried for, in global coordinates. */
        get from(): Vector2
        set from(value: Vector2)
        
        /** The ending point of the ray being queried for, in global coordinates. */
        get to(): Vector2
        set to(value: Vector2)
        
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject2D.get_rid] to get the [RID] associated with a [CollisionObject2D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** If `true`, the query will take [PhysicsBody2D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area2D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, the query will detect a hit when starting inside shapes. In this case the collision normal will be `Vector2(0, 0)`. Does not affect concave polygon shapes. */
        get hitFromInside(): boolean
        set hitFromInside(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsRayQueryParameters2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsRayQueryParameters2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsRayQueryParameters3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsRayQueryParameters3D extends __NameMapRefCounted {
        collision_mask: "collisionMask";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
        hit_from_inside: "hitFromInside";
        hit_back_faces: "hitBackFaces";
    }
    /** Provides parameters for [method PhysicsDirectSpaceState3D.intersect_ray].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsrayqueryparameters3d.html  
     */
    class PhysicsRayQueryParameters3D extends RefCounted {
        constructor(identifier?: any)
        /** Returns a new, pre-configured [PhysicsRayQueryParameters3D] object. Use it to quickly create query parameters using the most common options.  
         *    
         */
        static create(from: Vector3, to: Vector3, collisionMask?: int64 /* = 4294967295 */, exclude?: GArray<Rid>): PhysicsRayQueryParameters3D
        
        /** The starting point of the ray being queried for, in global coordinates. */
        get from(): Vector3
        set from(value: Vector3)
        
        /** The ending point of the ray being queried for, in global coordinates. */
        get to(): Vector3
        set to(value: Vector3)
        
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject3D.get_rid] to get the [RID] associated with a [CollisionObject3D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** If `true`, the query will take [PhysicsBody3D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area3D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, the query will detect a hit when starting inside shapes. In this case the collision normal will be `Vector3(0, 0, 0)`. Does not affect concave polygon shapes or heightmap shapes. */
        get hitFromInside(): boolean
        set hitFromInside(value: boolean)
        
        /** If `true`, the query will hit back faces with concave polygon shapes with back face enabled or heightmap shapes. */
        get hitBackFaces(): boolean
        set hitBackFaces(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsRayQueryParameters3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsRayQueryParameters3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer2DExtension extends __RPCMapPhysicsServer2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer2DExtension extends __NameMapPhysicsServer2D {
        _world_boundary_shape_create: "_worldBoundaryShapeCreate";
        _separation_ray_shape_create: "_separationRayShapeCreate";
        _segment_shape_create: "_segmentShapeCreate";
        _circle_shape_create: "_circleShapeCreate";
        _rectangle_shape_create: "_rectangleShapeCreate";
        _capsule_shape_create: "_capsuleShapeCreate";
        _convex_polygon_shape_create: "_convexPolygonShapeCreate";
        _concave_polygon_shape_create: "_concavePolygonShapeCreate";
        _shape_set_data: "_shapeSetData";
        _shape_set_custom_solver_bias: "_shapeSetCustomSolverBias";
        _shape_get_type: "_shapeGetType";
        _shape_get_data: "_shapeGetData";
        _shape_get_custom_solver_bias: "_shapeGetCustomSolverBias";
        _shape_collide: "_shapeCollide";
        _space_create: "_spaceCreate";
        _space_set_active: "_spaceSetActive";
        _space_is_active: "_spaceIsActive";
        _space_set_param: "_spaceSetParam";
        _space_get_param: "_spaceGetParam";
        _space_get_direct_state: "_spaceGetDirectState";
        _space_set_debug_contacts: "_spaceSetDebugContacts";
        _space_get_contacts: "_spaceGetContacts";
        _space_get_contact_count: "_spaceGetContactCount";
        _area_create: "_areaCreate";
        _area_set_space: "_areaSetSpace";
        _area_get_space: "_areaGetSpace";
        _area_add_shape: "_areaAddShape";
        _area_set_shape: "_areaSetShape";
        _area_set_shape_transform: "_areaSetShapeTransform";
        _area_set_shape_disabled: "_areaSetShapeDisabled";
        _area_get_shape_count: "_areaGetShapeCount";
        _area_get_shape: "_areaGetShape";
        _area_get_shape_transform: "_areaGetShapeTransform";
        _area_remove_shape: "_areaRemoveShape";
        _area_clear_shapes: "_areaClearShapes";
        _area_attach_object_instance_id: "_areaAttachObjectInstanceId";
        _area_get_object_instance_id: "_areaGetObjectInstanceId";
        _area_attach_canvas_instance_id: "_areaAttachCanvasInstanceId";
        _area_get_canvas_instance_id: "_areaGetCanvasInstanceId";
        _area_set_param: "_areaSetParam";
        _area_set_transform: "_areaSetTransform";
        _area_get_param: "_areaGetParam";
        _area_get_transform: "_areaGetTransform";
        _area_set_collision_layer: "_areaSetCollisionLayer";
        _area_get_collision_layer: "_areaGetCollisionLayer";
        _area_set_collision_mask: "_areaSetCollisionMask";
        _area_get_collision_mask: "_areaGetCollisionMask";
        _area_set_monitorable: "_areaSetMonitorable";
        _area_set_pickable: "_areaSetPickable";
        _area_set_monitor_callback: "_areaSetMonitorCallback";
        _area_set_area_monitor_callback: "_areaSetAreaMonitorCallback";
        _body_create: "_bodyCreate";
        _body_set_space: "_bodySetSpace";
        _body_get_space: "_bodyGetSpace";
        _body_set_mode: "_bodySetMode";
        _body_get_mode: "_bodyGetMode";
        _body_add_shape: "_bodyAddShape";
        _body_set_shape: "_bodySetShape";
        _body_set_shape_transform: "_bodySetShapeTransform";
        _body_get_shape_count: "_bodyGetShapeCount";
        _body_get_shape: "_bodyGetShape";
        _body_get_shape_transform: "_bodyGetShapeTransform";
        _body_set_shape_disabled: "_bodySetShapeDisabled";
        _body_set_shape_as_one_way_collision: "_bodySetShapeAsOneWayCollision";
        _body_remove_shape: "_bodyRemoveShape";
        _body_clear_shapes: "_bodyClearShapes";
        _body_attach_object_instance_id: "_bodyAttachObjectInstanceId";
        _body_get_object_instance_id: "_bodyGetObjectInstanceId";
        _body_attach_canvas_instance_id: "_bodyAttachCanvasInstanceId";
        _body_get_canvas_instance_id: "_bodyGetCanvasInstanceId";
        _body_set_continuous_collision_detection_mode: "_bodySetContinuousCollisionDetectionMode";
        _body_get_continuous_collision_detection_mode: "_bodyGetContinuousCollisionDetectionMode";
        _body_set_collision_layer: "_bodySetCollisionLayer";
        _body_get_collision_layer: "_bodyGetCollisionLayer";
        _body_set_collision_mask: "_bodySetCollisionMask";
        _body_get_collision_mask: "_bodyGetCollisionMask";
        _body_set_collision_priority: "_bodySetCollisionPriority";
        _body_get_collision_priority: "_bodyGetCollisionPriority";
        _body_set_param: "_bodySetParam";
        _body_get_param: "_bodyGetParam";
        _body_reset_mass_properties: "_bodyResetMassProperties";
        _body_set_state: "_bodySetState";
        _body_get_state: "_bodyGetState";
        _body_apply_central_impulse: "_bodyApplyCentralImpulse";
        _body_apply_torque_impulse: "_bodyApplyTorqueImpulse";
        _body_apply_impulse: "_bodyApplyImpulse";
        _body_apply_central_force: "_bodyApplyCentralForce";
        _body_apply_force: "_bodyApplyForce";
        _body_apply_torque: "_bodyApplyTorque";
        _body_add_constant_central_force: "_bodyAddConstantCentralForce";
        _body_add_constant_force: "_bodyAddConstantForce";
        _body_add_constant_torque: "_bodyAddConstantTorque";
        _body_set_constant_force: "_bodySetConstantForce";
        _body_get_constant_force: "_bodyGetConstantForce";
        _body_set_constant_torque: "_bodySetConstantTorque";
        _body_get_constant_torque: "_bodyGetConstantTorque";
        _body_set_axis_velocity: "_bodySetAxisVelocity";
        _body_add_collision_exception: "_bodyAddCollisionException";
        _body_remove_collision_exception: "_bodyRemoveCollisionException";
        _body_get_collision_exceptions: "_bodyGetCollisionExceptions";
        _body_set_max_contacts_reported: "_bodySetMaxContactsReported";
        _body_get_max_contacts_reported: "_bodyGetMaxContactsReported";
        _body_set_contacts_reported_depth_threshold: "_bodySetContactsReportedDepthThreshold";
        _body_get_contacts_reported_depth_threshold: "_bodyGetContactsReportedDepthThreshold";
        _body_set_omit_force_integration: "_bodySetOmitForceIntegration";
        _body_is_omitting_force_integration: "_bodyIsOmittingForceIntegration";
        _body_set_state_sync_callback: "_bodySetStateSyncCallback";
        _body_set_force_integration_callback: "_bodySetForceIntegrationCallback";
        _body_collide_shape: "_bodyCollideShape";
        _body_set_pickable: "_bodySetPickable";
        _body_get_direct_state: "_bodyGetDirectState";
        _body_test_motion: "_bodyTestMotion";
        _joint_create: "_jointCreate";
        _joint_clear: "_jointClear";
        _joint_set_param: "_jointSetParam";
        _joint_get_param: "_jointGetParam";
        _joint_disable_collisions_between_bodies: "_jointDisableCollisionsBetweenBodies";
        _joint_is_disabled_collisions_between_bodies: "_jointIsDisabledCollisionsBetweenBodies";
        _joint_make_pin: "_jointMakePin";
        _joint_make_groove: "_jointMakeGroove";
        _joint_make_damped_spring: "_jointMakeDampedSpring";
        _pin_joint_set_flag: "_pinJointSetFlag";
        _pin_joint_get_flag: "_pinJointGetFlag";
        _pin_joint_set_param: "_pinJointSetParam";
        _pin_joint_get_param: "_pinJointGetParam";
        _damped_spring_joint_set_param: "_dampedSpringJointSetParam";
        _damped_spring_joint_get_param: "_dampedSpringJointGetParam";
        _joint_get_type: "_jointGetType";
        _free_rid: "_freeRid";
        _set_active: "_setActive";
        _flush_queries: "_flushQueries";
        _end_sync: "_endSync";
        _is_flushing_queries: "_isFlushingQueries";
        _get_process_info: "_getProcessInfo";
        body_test_motion_is_excluding_body: "bodyTestMotionIsExcludingBody";
        body_test_motion_is_excluding_object: "bodyTestMotionIsExcludingObject";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsServer2D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver2dextension.html  
     */
    class PhysicsServer2DExtension extends PhysicsServer2D {
        constructor(identifier?: any)
        /** Overridable version of [method PhysicsServer2D.world_boundary_shape_create]. */
        /* gdvirtual */ _worldBoundaryShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.separation_ray_shape_create]. */
        /* gdvirtual */ _separationRayShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.segment_shape_create]. */
        /* gdvirtual */ _segmentShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.circle_shape_create]. */
        /* gdvirtual */ _circleShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.rectangle_shape_create]. */
        /* gdvirtual */ _rectangleShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.capsule_shape_create]. */
        /* gdvirtual */ _capsuleShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.convex_polygon_shape_create]. */
        /* gdvirtual */ _convexPolygonShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.concave_polygon_shape_create]. */
        /* gdvirtual */ _concavePolygonShapeCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.shape_set_data]. */
        /* gdvirtual */ _shapeSetData(shape: Rid, data: any): void
        
        /** Should set the custom solver bias for the given [param shape]. It defines how much bodies are forced to separate on contact.  
         *  Overridable version of [PhysicsServer2D]'s internal `shape_get_custom_solver_bias` method. Corresponds to [member Shape2D.custom_solver_bias].  
         */
        /* gdvirtual */ _shapeSetCustomSolverBias(shape: Rid, bias: float64): void
        
        /** Overridable version of [method PhysicsServer2D.shape_get_type]. */
        /* gdvirtual */ _shapeGetType(shape: Rid): PhysicsServer2D.ShapeType
        
        /** Overridable version of [method PhysicsServer2D.shape_get_data]. */
        /* gdvirtual */ _shapeGetData(shape: Rid): any
        
        /** Should return the custom solver bias of the given [param shape], which defines how much bodies are forced to separate on contact when this shape is involved.  
         *  Overridable version of [PhysicsServer2D]'s internal `shape_get_custom_solver_bias` method. Corresponds to [member Shape2D.custom_solver_bias].  
         */
        /* gdvirtual */ _shapeGetCustomSolverBias(shape: Rid): float64
        
        /** Given two shapes and their parameters, should return `true` if a collision between the two would occur, with additional details passed in [param r_results].  
         *  Overridable version of [PhysicsServer2D]'s internal `shape_collide` method. Corresponds to [method PhysicsDirectSpaceState2D.collide_shape].  
         */
        /* gdvirtual */ _shapeCollide(shapeA: Rid, xformA: Transform2D, motionA: Vector2, shapeB: Rid, xformB: Transform2D, motionB: Vector2, rResults: int64, resultMax: int64, rResultCount: int64): boolean
        
        /** Overridable version of [method PhysicsServer2D.space_create]. */
        /* gdvirtual */ _spaceCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.space_set_active]. */
        /* gdvirtual */ _spaceSetActive(space: Rid, active: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.space_is_active]. */
        /* gdvirtual */ _spaceIsActive(space: Rid): boolean
        
        /** Overridable version of [method PhysicsServer2D.space_set_param]. */
        /* gdvirtual */ _spaceSetParam(space: Rid, param: PhysicsServer2D.SpaceParameter, value: float64): void
        
        /** Overridable version of [method PhysicsServer2D.space_get_param]. */
        /* gdvirtual */ _spaceGetParam(space: Rid, param: PhysicsServer2D.SpaceParameter): float64
        
        /** Overridable version of [method PhysicsServer2D.space_get_direct_state]. */
        /* gdvirtual */ _spaceGetDirectState(space: Rid): null | PhysicsDirectSpaceState2D
        
        /** Used internally to allow the given [param space] to store contact points, up to [param max_contacts]. This is automatically set for the main [World2D]'s space when [member SceneTree.debug_collisions_hint] is `true`, or by checking "Visible Collision Shapes" in the editor. Only works in debug builds.  
         *  Overridable version of [PhysicsServer2D]'s internal `space_set_debug_contacts` method.  
         */
        /* gdvirtual */ _spaceSetDebugContacts(space: Rid, maxContacts: int64): void
        
        /** Should return the positions of all contacts that have occurred during the last physics step in the given [param space]. See also [method _space_get_contact_count] and [method _space_set_debug_contacts].  
         *  Overridable version of [PhysicsServer2D]'s internal `space_get_contacts` method.  
         */
        /* gdvirtual */ _spaceGetContacts(space: Rid): PackedVector2Array
        
        /** Should return how many contacts have occurred during the last physics step in the given [param space]. See also [method _space_get_contacts] and [method _space_set_debug_contacts].  
         *  Overridable version of [PhysicsServer2D]'s internal `space_get_contact_count` method.  
         */
        /* gdvirtual */ _spaceGetContactCount(space: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_create]. */
        /* gdvirtual */ _areaCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.area_set_space]. */
        /* gdvirtual */ _areaSetSpace(area: Rid, space: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_space]. */
        /* gdvirtual */ _areaGetSpace(area: Rid): Rid
        
        /** Overridable version of [method PhysicsServer2D.area_add_shape]. */
        /* gdvirtual */ _areaAddShape(area: Rid, shape: Rid, transform: Transform2D, disabled: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_shape]. */
        /* gdvirtual */ _areaSetShape(area: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_shape_transform]. */
        /* gdvirtual */ _areaSetShapeTransform(area: Rid, shapeIdx: int64, transform: Transform2D): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_shape_disabled]. */
        /* gdvirtual */ _areaSetShapeDisabled(area: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_shape_count]. */
        /* gdvirtual */ _areaGetShapeCount(area: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_get_shape]. */
        /* gdvirtual */ _areaGetShape(area: Rid, shapeIdx: int64): Rid
        
        /** Overridable version of [method PhysicsServer2D.area_get_shape_transform]. */
        /* gdvirtual */ _areaGetShapeTransform(area: Rid, shapeIdx: int64): Transform2D
        
        /** Overridable version of [method PhysicsServer2D.area_remove_shape]. */
        /* gdvirtual */ _areaRemoveShape(area: Rid, shapeIdx: int64): void
        
        /** Overridable version of [method PhysicsServer2D.area_clear_shapes]. */
        /* gdvirtual */ _areaClearShapes(area: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.area_attach_object_instance_id]. */
        /* gdvirtual */ _areaAttachObjectInstanceId(area: Rid, id: int64): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_object_instance_id]. */
        /* gdvirtual */ _areaGetObjectInstanceId(area: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_attach_canvas_instance_id]. */
        /* gdvirtual */ _areaAttachCanvasInstanceId(area: Rid, id: int64): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_canvas_instance_id]. */
        /* gdvirtual */ _areaGetCanvasInstanceId(area: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_set_param]. */
        /* gdvirtual */ _areaSetParam(area: Rid, param: PhysicsServer2D.AreaParameter, value: any): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_transform]. */
        /* gdvirtual */ _areaSetTransform(area: Rid, transform: Transform2D): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_param]. */
        /* gdvirtual */ _areaGetParam(area: Rid, param: PhysicsServer2D.AreaParameter): any
        
        /** Overridable version of [method PhysicsServer2D.area_get_transform]. */
        /* gdvirtual */ _areaGetTransform(area: Rid): Transform2D
        
        /** Overridable version of [method PhysicsServer2D.area_set_collision_layer]. */
        /* gdvirtual */ _areaSetCollisionLayer(area: Rid, layer: int64): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_collision_layer]. */
        /* gdvirtual */ _areaGetCollisionLayer(area: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_set_collision_mask]. */
        /* gdvirtual */ _areaSetCollisionMask(area: Rid, mask: int64): void
        
        /** Overridable version of [method PhysicsServer2D.area_get_collision_mask]. */
        /* gdvirtual */ _areaGetCollisionMask(area: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.area_set_monitorable]. */
        /* gdvirtual */ _areaSetMonitorable(area: Rid, monitorable: boolean): void
        
        /** If set to `true`, allows the area with the given [RID] to detect mouse inputs when the mouse cursor is hovering on it.  
         *  Overridable version of [PhysicsServer2D]'s internal `area_set_pickable` method. Corresponds to [member CollisionObject2D.input_pickable].  
         */
        /* gdvirtual */ _areaSetPickable(area: Rid, pickable: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_monitor_callback]. */
        /* gdvirtual */ _areaSetMonitorCallback(area: Rid, callback: Callable): void
        
        /** Overridable version of [method PhysicsServer2D.area_set_area_monitor_callback]. */
        /* gdvirtual */ _areaSetAreaMonitorCallback(area: Rid, callback: Callable): void
        
        /** Overridable version of [method PhysicsServer2D.body_create]. */
        /* gdvirtual */ _bodyCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.body_set_space]. */
        /* gdvirtual */ _bodySetSpace(body: Rid, space: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_space]. */
        /* gdvirtual */ _bodyGetSpace(body: Rid): Rid
        
        /** Overridable version of [method PhysicsServer2D.body_set_mode]. */
        /* gdvirtual */ _bodySetMode(body: Rid, mode: PhysicsServer2D.BodyMode): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_mode]. */
        /* gdvirtual */ _bodyGetMode(body: Rid): PhysicsServer2D.BodyMode
        
        /** Overridable version of [method PhysicsServer2D.body_add_shape]. */
        /* gdvirtual */ _bodyAddShape(body: Rid, shape: Rid, transform: Transform2D, disabled: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_shape]. */
        /* gdvirtual */ _bodySetShape(body: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_shape_transform]. */
        /* gdvirtual */ _bodySetShapeTransform(body: Rid, shapeIdx: int64, transform: Transform2D): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_shape_count]. */
        /* gdvirtual */ _bodyGetShapeCount(body: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.body_get_shape]. */
        /* gdvirtual */ _bodyGetShape(body: Rid, shapeIdx: int64): Rid
        
        /** Overridable version of [method PhysicsServer2D.body_get_shape_transform]. */
        /* gdvirtual */ _bodyGetShapeTransform(body: Rid, shapeIdx: int64): Transform2D
        
        /** Overridable version of [method PhysicsServer2D.body_set_shape_disabled]. */
        /* gdvirtual */ _bodySetShapeDisabled(body: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_shape_as_one_way_collision]. */
        /* gdvirtual */ _bodySetShapeAsOneWayCollision(body: Rid, shapeIdx: int64, enable: boolean, margin: float64, direction: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_remove_shape]. */
        /* gdvirtual */ _bodyRemoveShape(body: Rid, shapeIdx: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_clear_shapes]. */
        /* gdvirtual */ _bodyClearShapes(body: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.body_attach_object_instance_id]. */
        /* gdvirtual */ _bodyAttachObjectInstanceId(body: Rid, id: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_object_instance_id]. */
        /* gdvirtual */ _bodyGetObjectInstanceId(body: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.body_attach_canvas_instance_id]. */
        /* gdvirtual */ _bodyAttachCanvasInstanceId(body: Rid, id: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_canvas_instance_id]. */
        /* gdvirtual */ _bodyGetCanvasInstanceId(body: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.body_set_continuous_collision_detection_mode]. */
        /* gdvirtual */ _bodySetContinuousCollisionDetectionMode(body: Rid, mode: PhysicsServer2D.CcdMode): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_continuous_collision_detection_mode]. */
        /* gdvirtual */ _bodyGetContinuousCollisionDetectionMode(body: Rid): PhysicsServer2D.CcdMode
        
        /** Overridable version of [method PhysicsServer2D.body_set_collision_layer]. */
        /* gdvirtual */ _bodySetCollisionLayer(body: Rid, layer: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_collision_layer]. */
        /* gdvirtual */ _bodyGetCollisionLayer(body: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.body_set_collision_mask]. */
        /* gdvirtual */ _bodySetCollisionMask(body: Rid, mask: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_collision_mask]. */
        /* gdvirtual */ _bodyGetCollisionMask(body: Rid): int64
        
        /** Overridable version of [method PhysicsServer2D.body_set_collision_priority]. */
        /* gdvirtual */ _bodySetCollisionPriority(body: Rid, priority: float64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_collision_priority]. */
        /* gdvirtual */ _bodyGetCollisionPriority(body: Rid): float64
        
        /** Overridable version of [method PhysicsServer2D.body_set_param]. */
        /* gdvirtual */ _bodySetParam(body: Rid, param: PhysicsServer2D.BodyParameter, value: any): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_param]. */
        /* gdvirtual */ _bodyGetParam(body: Rid, param: PhysicsServer2D.BodyParameter): any
        
        /** Overridable version of [method PhysicsServer2D.body_reset_mass_properties]. */
        /* gdvirtual */ _bodyResetMassProperties(body: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_state]. */
        /* gdvirtual */ _bodySetState(body: Rid, state: PhysicsServer2D.BodyState, value: any): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_state]. */
        /* gdvirtual */ _bodyGetState(body: Rid, state: PhysicsServer2D.BodyState): any
        
        /** Overridable version of [method PhysicsServer2D.body_apply_central_impulse]. */
        /* gdvirtual */ _bodyApplyCentralImpulse(body: Rid, impulse: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_apply_torque_impulse]. */
        /* gdvirtual */ _bodyApplyTorqueImpulse(body: Rid, impulse: float64): void
        
        /** Overridable version of [method PhysicsServer2D.body_apply_impulse]. */
        /* gdvirtual */ _bodyApplyImpulse(body: Rid, impulse: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_apply_central_force]. */
        /* gdvirtual */ _bodyApplyCentralForce(body: Rid, force: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_apply_force]. */
        /* gdvirtual */ _bodyApplyForce(body: Rid, force: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_apply_torque]. */
        /* gdvirtual */ _bodyApplyTorque(body: Rid, torque: float64): void
        
        /** Overridable version of [method PhysicsServer2D.body_add_constant_central_force]. */
        /* gdvirtual */ _bodyAddConstantCentralForce(body: Rid, force: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_add_constant_force]. */
        /* gdvirtual */ _bodyAddConstantForce(body: Rid, force: Vector2, position: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_add_constant_torque]. */
        /* gdvirtual */ _bodyAddConstantTorque(body: Rid, torque: float64): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_constant_force]. */
        /* gdvirtual */ _bodySetConstantForce(body: Rid, force: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_constant_force]. */
        /* gdvirtual */ _bodyGetConstantForce(body: Rid): Vector2
        
        /** Overridable version of [method PhysicsServer2D.body_set_constant_torque]. */
        /* gdvirtual */ _bodySetConstantTorque(body: Rid, torque: float64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_constant_torque]. */
        /* gdvirtual */ _bodyGetConstantTorque(body: Rid): float64
        
        /** Overridable version of [method PhysicsServer2D.body_set_axis_velocity]. */
        /* gdvirtual */ _bodySetAxisVelocity(body: Rid, axisVelocity: Vector2): void
        
        /** Overridable version of [method PhysicsServer2D.body_add_collision_exception]. */
        /* gdvirtual */ _bodyAddCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.body_remove_collision_exception]. */
        /* gdvirtual */ _bodyRemoveCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Returns the [RID]s of all bodies added as collision exceptions for the given [param body]. See also [method _body_add_collision_exception] and [method _body_remove_collision_exception].  
         *  Overridable version of [PhysicsServer2D]'s internal `body_get_collision_exceptions` method. Corresponds to [method PhysicsBody2D.get_collision_exceptions].  
         */
        /* gdvirtual */ _bodyGetCollisionExceptions(body: Rid): GArray<Rid>
        
        /** Overridable version of [method PhysicsServer2D.body_set_max_contacts_reported]. */
        /* gdvirtual */ _bodySetMaxContactsReported(body: Rid, amount: int64): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_max_contacts_reported]. */
        /* gdvirtual */ _bodyGetMaxContactsReported(body: Rid): int64
        
        /** Overridable version of [PhysicsServer2D]'s internal `body_set_contacts_reported_depth_threshold` method.  
         *      
         *  **Note:** This method is currently unused by Godot's default physics implementation.  
         */
        /* gdvirtual */ _bodySetContactsReportedDepthThreshold(body: Rid, threshold: float64): void
        
        /** Overridable version of [PhysicsServer2D]'s internal `body_get_contacts_reported_depth_threshold` method.  
         *      
         *  **Note:** This method is currently unused by Godot's default physics implementation.  
         */
        /* gdvirtual */ _bodyGetContactsReportedDepthThreshold(body: Rid): float64
        
        /** Overridable version of [method PhysicsServer2D.body_set_omit_force_integration]. */
        /* gdvirtual */ _bodySetOmitForceIntegration(body: Rid, enable: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.body_is_omitting_force_integration]. */
        /* gdvirtual */ _bodyIsOmittingForceIntegration(body: Rid): boolean
        
        /** Assigns the [param body] to call the given [param callable] during the synchronization phase of the loop, before [method _step] is called. See also [method _sync].  
         *  Overridable version of [method PhysicsServer2D.body_set_state_sync_callback].  
         */
        /* gdvirtual */ _bodySetStateSyncCallback(body: Rid, callable: Callable): void
        
        /** Overridable version of [method PhysicsServer2D.body_set_force_integration_callback]. */
        /* gdvirtual */ _bodySetForceIntegrationCallback(body: Rid, callable: Callable, userdata: any): void
        
        /** Given a [param body], a [param shape], and their respective parameters, this method should return `true` if a collision between the two would occur, with additional details passed in [param r_results].  
         *  Overridable version of [PhysicsServer2D]'s internal `shape_collide` method. Corresponds to [method PhysicsDirectSpaceState2D.collide_shape].  
         */
        /* gdvirtual */ _bodyCollideShape(body: Rid, bodyShape: int64, shape: Rid, shapeXform: Transform2D, motion: Vector2, rResults: int64, resultMax: int64, rResultCount: int64): boolean
        
        /** If set to `true`, allows the body with the given [RID] to detect mouse inputs when the mouse cursor is hovering on it.  
         *  Overridable version of [PhysicsServer2D]'s internal `body_set_pickable` method. Corresponds to [member CollisionObject2D.input_pickable].  
         */
        /* gdvirtual */ _bodySetPickable(body: Rid, pickable: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.body_get_direct_state]. */
        /* gdvirtual */ _bodyGetDirectState(body: Rid): null | PhysicsDirectBodyState2D
        
        /** Overridable version of [method PhysicsServer2D.body_test_motion]. Unlike the exposed implementation, this method does not receive all of the arguments inside a [PhysicsTestMotionParameters2D]. */
        /* gdvirtual */ _bodyTestMotion(body: Rid, from: Transform2D, motion: Vector2, margin: float64, collideSeparationRay: boolean, recoveryAsCollision: boolean, rResult: int64): boolean
        
        /** Overridable version of [method PhysicsServer2D.joint_create]. */
        /* gdvirtual */ _jointCreate(): Rid
        
        /** Overridable version of [method PhysicsServer2D.joint_clear]. */
        /* gdvirtual */ _jointClear(joint: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.joint_set_param]. */
        /* gdvirtual */ _jointSetParam(joint: Rid, param: PhysicsServer2D.JointParam, value: float64): void
        
        /** Overridable version of [method PhysicsServer2D.joint_get_param]. */
        /* gdvirtual */ _jointGetParam(joint: Rid, param: PhysicsServer2D.JointParam): float64
        
        /** Overridable version of [method PhysicsServer2D.joint_disable_collisions_between_bodies]. */
        /* gdvirtual */ _jointDisableCollisionsBetweenBodies(joint: Rid, disable: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.joint_is_disabled_collisions_between_bodies]. */
        /* gdvirtual */ _jointIsDisabledCollisionsBetweenBodies(joint: Rid): boolean
        
        /** Overridable version of [method PhysicsServer2D.joint_make_pin]. */
        /* gdvirtual */ _jointMakePin(joint: Rid, anchor: Vector2, bodyA: Rid, bodyB: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.joint_make_groove]. */
        /* gdvirtual */ _jointMakeGroove(joint: Rid, aGroove1: Vector2, aGroove2: Vector2, bAnchor: Vector2, bodyA: Rid, bodyB: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.joint_make_damped_spring]. */
        /* gdvirtual */ _jointMakeDampedSpring(joint: Rid, anchorA: Vector2, anchorB: Vector2, bodyA: Rid, bodyB: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.pin_joint_set_flag]. */
        /* gdvirtual */ _pinJointSetFlag(joint: Rid, flag: PhysicsServer2D.PinJointFlag, enabled: boolean): void
        
        /** Overridable version of [method PhysicsServer2D.pin_joint_get_flag]. */
        /* gdvirtual */ _pinJointGetFlag(joint: Rid, flag: PhysicsServer2D.PinJointFlag): boolean
        
        /** Overridable version of [method PhysicsServer2D.pin_joint_set_param]. */
        /* gdvirtual */ _pinJointSetParam(joint: Rid, param: PhysicsServer2D.PinJointParam, value: float64): void
        
        /** Overridable version of [method PhysicsServer2D.pin_joint_get_param]. */
        /* gdvirtual */ _pinJointGetParam(joint: Rid, param: PhysicsServer2D.PinJointParam): float64
        
        /** Overridable version of [method PhysicsServer2D.damped_spring_joint_set_param]. */
        /* gdvirtual */ _dampedSpringJointSetParam(joint: Rid, param: PhysicsServer2D.DampedSpringParam, value: float64): void
        
        /** Overridable version of [method PhysicsServer2D.damped_spring_joint_get_param]. */
        /* gdvirtual */ _dampedSpringJointGetParam(joint: Rid, param: PhysicsServer2D.DampedSpringParam): float64
        
        /** Overridable version of [method PhysicsServer2D.joint_get_type]. */
        /* gdvirtual */ _jointGetType(joint: Rid): PhysicsServer2D.JointType
        
        /** Overridable version of [method PhysicsServer2D.free_rid]. */
        /* gdvirtual */ _freeRid(rid: Rid): void
        
        /** Overridable version of [method PhysicsServer2D.set_active]. */
        /* gdvirtual */ _setActive(active: boolean): void
        
        /** Called when the main loop is initialized and creates a new instance of this physics server. See also [method MainLoop._initialize] and [method _finish].  
         *  Overridable version of [PhysicsServer2D]'s internal `init` method.  
         */
        /* gdvirtual */ _init(): void
        
        /** Called every physics step to process the physics simulation. [param step] is the time elapsed since the last physics step, in seconds. It is usually the same as the value returned by [method Node.get_physics_process_delta_time].  
         *  Overridable version of [PhysicsServer2D]'s internal [code skip-lint]step` method.  
         */
        /* gdvirtual */ _step(step: float64): void
        
        /** Called to indicate that the physics server is synchronizing and cannot access physics states if running on a separate thread. See also [method _end_sync].  
         *  Overridable version of [PhysicsServer2D]'s internal `sync` method.  
         */
        /* gdvirtual */ _sync(): void
        
        /** Called every physics step before [method _step] to process all remaining queries.  
         *  Overridable version of [PhysicsServer2D]'s internal `flush_queries` method.  
         */
        /* gdvirtual */ _flushQueries(): void
        
        /** Called to indicate that the physics server has stopped synchronizing. It is in the loop's iteration/physics phase, and can access physics objects even if running on a separate thread. See also [method _sync].  
         *  Overridable version of [PhysicsServer2D]'s internal `end_sync` method.  
         */
        /* gdvirtual */ _endSync(): void
        
        /** Called when the main loop finalizes to shut down the physics server. See also [method MainLoop._finalize] and [method _init].  
         *  Overridable version of [PhysicsServer2D]'s internal `finish` method.  
         */
        /* gdvirtual */ _finish(): void
        
        /** Overridable method that should return `true` when the physics server is processing queries. See also [method _flush_queries].  
         *  Overridable version of [PhysicsServer2D]'s internal `is_flushing_queries` method.  
         */
        /* gdvirtual */ _isFlushingQueries(): boolean
        
        /** Overridable version of [method PhysicsServer2D.get_process_info]. */
        /* gdvirtual */ _getProcessInfo(processInfo: PhysicsServer2D.ProcessInfo): int64
        
        /** Returns `true` if the body with the given [RID] is being excluded from [method _body_test_motion]. See also [method Object.get_instance_id]. */
        bodyTestMotionIsExcludingBody(body: Rid): boolean
        
        /** Returns `true` if the object with the given instance ID is being excluded from [method _body_test_motion]. See also [method Object.get_instance_id]. */
        bodyTestMotionIsExcludingObject(object: int64): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer2DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer2DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer3DExtension extends __RPCMapPhysicsServer3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer3DExtension extends __NameMapPhysicsServer3D {
        _world_boundary_shape_create: "_worldBoundaryShapeCreate";
        _separation_ray_shape_create: "_separationRayShapeCreate";
        _sphere_shape_create: "_sphereShapeCreate";
        _box_shape_create: "_boxShapeCreate";
        _capsule_shape_create: "_capsuleShapeCreate";
        _cylinder_shape_create: "_cylinderShapeCreate";
        _convex_polygon_shape_create: "_convexPolygonShapeCreate";
        _concave_polygon_shape_create: "_concavePolygonShapeCreate";
        _heightmap_shape_create: "_heightmapShapeCreate";
        _custom_shape_create: "_customShapeCreate";
        _shape_set_data: "_shapeSetData";
        _shape_set_custom_solver_bias: "_shapeSetCustomSolverBias";
        _shape_set_margin: "_shapeSetMargin";
        _shape_get_margin: "_shapeGetMargin";
        _shape_get_type: "_shapeGetType";
        _shape_get_data: "_shapeGetData";
        _shape_get_custom_solver_bias: "_shapeGetCustomSolverBias";
        _space_create: "_spaceCreate";
        _space_set_active: "_spaceSetActive";
        _space_is_active: "_spaceIsActive";
        _space_set_param: "_spaceSetParam";
        _space_get_param: "_spaceGetParam";
        _space_get_direct_state: "_spaceGetDirectState";
        _space_set_debug_contacts: "_spaceSetDebugContacts";
        _space_get_contacts: "_spaceGetContacts";
        _space_get_contact_count: "_spaceGetContactCount";
        _area_create: "_areaCreate";
        _area_set_space: "_areaSetSpace";
        _area_get_space: "_areaGetSpace";
        _area_add_shape: "_areaAddShape";
        _area_set_shape: "_areaSetShape";
        _area_set_shape_transform: "_areaSetShapeTransform";
        _area_set_shape_disabled: "_areaSetShapeDisabled";
        _area_get_shape_count: "_areaGetShapeCount";
        _area_get_shape: "_areaGetShape";
        _area_get_shape_transform: "_areaGetShapeTransform";
        _area_remove_shape: "_areaRemoveShape";
        _area_clear_shapes: "_areaClearShapes";
        _area_attach_object_instance_id: "_areaAttachObjectInstanceId";
        _area_get_object_instance_id: "_areaGetObjectInstanceId";
        _area_set_param: "_areaSetParam";
        _area_set_transform: "_areaSetTransform";
        _area_get_param: "_areaGetParam";
        _area_get_transform: "_areaGetTransform";
        _area_set_collision_layer: "_areaSetCollisionLayer";
        _area_get_collision_layer: "_areaGetCollisionLayer";
        _area_set_collision_mask: "_areaSetCollisionMask";
        _area_get_collision_mask: "_areaGetCollisionMask";
        _area_set_monitorable: "_areaSetMonitorable";
        _area_set_ray_pickable: "_areaSetRayPickable";
        _area_set_monitor_callback: "_areaSetMonitorCallback";
        _area_set_area_monitor_callback: "_areaSetAreaMonitorCallback";
        _body_create: "_bodyCreate";
        _body_set_space: "_bodySetSpace";
        _body_get_space: "_bodyGetSpace";
        _body_set_mode: "_bodySetMode";
        _body_get_mode: "_bodyGetMode";
        _body_add_shape: "_bodyAddShape";
        _body_set_shape: "_bodySetShape";
        _body_set_shape_transform: "_bodySetShapeTransform";
        _body_set_shape_disabled: "_bodySetShapeDisabled";
        _body_get_shape_count: "_bodyGetShapeCount";
        _body_get_shape: "_bodyGetShape";
        _body_get_shape_transform: "_bodyGetShapeTransform";
        _body_remove_shape: "_bodyRemoveShape";
        _body_clear_shapes: "_bodyClearShapes";
        _body_attach_object_instance_id: "_bodyAttachObjectInstanceId";
        _body_get_object_instance_id: "_bodyGetObjectInstanceId";
        _body_set_enable_continuous_collision_detection: "_bodySetEnableContinuousCollisionDetection";
        _body_is_continuous_collision_detection_enabled: "_bodyIsContinuousCollisionDetectionEnabled";
        _body_set_collision_layer: "_bodySetCollisionLayer";
        _body_get_collision_layer: "_bodyGetCollisionLayer";
        _body_set_collision_mask: "_bodySetCollisionMask";
        _body_get_collision_mask: "_bodyGetCollisionMask";
        _body_set_collision_priority: "_bodySetCollisionPriority";
        _body_get_collision_priority: "_bodyGetCollisionPriority";
        _body_set_user_flags: "_bodySetUserFlags";
        _body_get_user_flags: "_bodyGetUserFlags";
        _body_set_param: "_bodySetParam";
        _body_get_param: "_bodyGetParam";
        _body_reset_mass_properties: "_bodyResetMassProperties";
        _body_set_state: "_bodySetState";
        _body_get_state: "_bodyGetState";
        _body_apply_central_impulse: "_bodyApplyCentralImpulse";
        _body_apply_impulse: "_bodyApplyImpulse";
        _body_apply_torque_impulse: "_bodyApplyTorqueImpulse";
        _body_apply_central_force: "_bodyApplyCentralForce";
        _body_apply_force: "_bodyApplyForce";
        _body_apply_torque: "_bodyApplyTorque";
        _body_add_constant_central_force: "_bodyAddConstantCentralForce";
        _body_add_constant_force: "_bodyAddConstantForce";
        _body_add_constant_torque: "_bodyAddConstantTorque";
        _body_set_constant_force: "_bodySetConstantForce";
        _body_get_constant_force: "_bodyGetConstantForce";
        _body_set_constant_torque: "_bodySetConstantTorque";
        _body_get_constant_torque: "_bodyGetConstantTorque";
        _body_set_axis_velocity: "_bodySetAxisVelocity";
        _body_set_axis_lock: "_bodySetAxisLock";
        _body_is_axis_locked: "_bodyIsAxisLocked";
        _body_add_collision_exception: "_bodyAddCollisionException";
        _body_remove_collision_exception: "_bodyRemoveCollisionException";
        _body_get_collision_exceptions: "_bodyGetCollisionExceptions";
        _body_set_max_contacts_reported: "_bodySetMaxContactsReported";
        _body_get_max_contacts_reported: "_bodyGetMaxContactsReported";
        _body_set_contacts_reported_depth_threshold: "_bodySetContactsReportedDepthThreshold";
        _body_get_contacts_reported_depth_threshold: "_bodyGetContactsReportedDepthThreshold";
        _body_set_omit_force_integration: "_bodySetOmitForceIntegration";
        _body_is_omitting_force_integration: "_bodyIsOmittingForceIntegration";
        _body_set_state_sync_callback: "_bodySetStateSyncCallback";
        _body_set_force_integration_callback: "_bodySetForceIntegrationCallback";
        _body_set_ray_pickable: "_bodySetRayPickable";
        _body_test_motion: "_bodyTestMotion";
        _body_get_direct_state: "_bodyGetDirectState";
        _soft_body_create: "_softBodyCreate";
        _soft_body_update_rendering_server: "_softBodyUpdateRenderingServer";
        _soft_body_set_space: "_softBodySetSpace";
        _soft_body_get_space: "_softBodyGetSpace";
        _soft_body_set_ray_pickable: "_softBodySetRayPickable";
        _soft_body_set_collision_layer: "_softBodySetCollisionLayer";
        _soft_body_get_collision_layer: "_softBodyGetCollisionLayer";
        _soft_body_set_collision_mask: "_softBodySetCollisionMask";
        _soft_body_get_collision_mask: "_softBodyGetCollisionMask";
        _soft_body_add_collision_exception: "_softBodyAddCollisionException";
        _soft_body_remove_collision_exception: "_softBodyRemoveCollisionException";
        _soft_body_get_collision_exceptions: "_softBodyGetCollisionExceptions";
        _soft_body_set_state: "_softBodySetState";
        _soft_body_get_state: "_softBodyGetState";
        _soft_body_set_transform: "_softBodySetTransform";
        _soft_body_set_simulation_precision: "_softBodySetSimulationPrecision";
        _soft_body_get_simulation_precision: "_softBodyGetSimulationPrecision";
        _soft_body_set_total_mass: "_softBodySetTotalMass";
        _soft_body_get_total_mass: "_softBodyGetTotalMass";
        _soft_body_set_linear_stiffness: "_softBodySetLinearStiffness";
        _soft_body_get_linear_stiffness: "_softBodyGetLinearStiffness";
        _soft_body_set_shrinking_factor: "_softBodySetShrinkingFactor";
        _soft_body_get_shrinking_factor: "_softBodyGetShrinkingFactor";
        _soft_body_set_pressure_coefficient: "_softBodySetPressureCoefficient";
        _soft_body_get_pressure_coefficient: "_softBodyGetPressureCoefficient";
        _soft_body_set_damping_coefficient: "_softBodySetDampingCoefficient";
        _soft_body_get_damping_coefficient: "_softBodyGetDampingCoefficient";
        _soft_body_set_drag_coefficient: "_softBodySetDragCoefficient";
        _soft_body_get_drag_coefficient: "_softBodyGetDragCoefficient";
        _soft_body_set_mesh: "_softBodySetMesh";
        _soft_body_get_bounds: "_softBodyGetBounds";
        _soft_body_move_point: "_softBodyMovePoint";
        _soft_body_get_point_global_position: "_softBodyGetPointGlobalPosition";
        _soft_body_remove_all_pinned_points: "_softBodyRemoveAllPinnedPoints";
        _soft_body_pin_point: "_softBodyPinPoint";
        _soft_body_is_point_pinned: "_softBodyIsPointPinned";
        _soft_body_apply_point_impulse: "_softBodyApplyPointImpulse";
        _soft_body_apply_point_force: "_softBodyApplyPointForce";
        _soft_body_apply_central_impulse: "_softBodyApplyCentralImpulse";
        _soft_body_apply_central_force: "_softBodyApplyCentralForce";
        _joint_create: "_jointCreate";
        _joint_clear: "_jointClear";
        _joint_make_pin: "_jointMakePin";
        _pin_joint_set_param: "_pinJointSetParam";
        _pin_joint_get_param: "_pinJointGetParam";
        _pin_joint_set_local_a: "_pinJointSetLocalA";
        _pin_joint_get_local_a: "_pinJointGetLocalA";
        _pin_joint_set_local_b: "_pinJointSetLocalB";
        _pin_joint_get_local_b: "_pinJointGetLocalB";
        _joint_make_hinge: "_jointMakeHinge";
        _joint_make_hinge_simple: "_jointMakeHingeSimple";
        _hinge_joint_set_param: "_hingeJointSetParam";
        _hinge_joint_get_param: "_hingeJointGetParam";
        _hinge_joint_set_flag: "_hingeJointSetFlag";
        _hinge_joint_get_flag: "_hingeJointGetFlag";
        _joint_make_slider: "_jointMakeSlider";
        _slider_joint_set_param: "_sliderJointSetParam";
        _slider_joint_get_param: "_sliderJointGetParam";
        _joint_make_cone_twist: "_jointMakeConeTwist";
        _cone_twist_joint_set_param: "_coneTwistJointSetParam";
        _cone_twist_joint_get_param: "_coneTwistJointGetParam";
        _joint_make_generic_6dof: "_jointMakeGeneric6Dof";
        _generic_6dof_joint_set_param: "_generic6DofJointSetParam";
        _generic_6dof_joint_get_param: "_generic6DofJointGetParam";
        _generic_6dof_joint_set_flag: "_generic6DofJointSetFlag";
        _generic_6dof_joint_get_flag: "_generic6DofJointGetFlag";
        _generic_6dof_joint_set_angular_target_rotation: "_generic6DofJointSetAngularTargetRotation";
        _generic_6dof_joint_get_angular_target_rotation: "_generic6DofJointGetAngularTargetRotation";
        _joint_get_type: "_jointGetType";
        _joint_set_solver_priority: "_jointSetSolverPriority";
        _joint_get_solver_priority: "_jointGetSolverPriority";
        _joint_disable_collisions_between_bodies: "_jointDisableCollisionsBetweenBodies";
        _joint_is_disabled_collisions_between_bodies: "_jointIsDisabledCollisionsBetweenBodies";
        _free_rid: "_freeRid";
        _set_active: "_setActive";
        _flush_queries: "_flushQueries";
        _end_sync: "_endSync";
        _is_flushing_queries: "_isFlushingQueries";
        _get_process_info: "_getProcessInfo";
        body_test_motion_is_excluding_body: "bodyTestMotionIsExcludingBody";
        body_test_motion_is_excluding_object: "bodyTestMotionIsExcludingObject";
    }
    /** Provides virtual methods that can be overridden to create custom [PhysicsServer3D] implementations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver3dextension.html  
     */
    class PhysicsServer3DExtension extends PhysicsServer3D {
        constructor(identifier?: any)
        /* gdvirtual */ _worldBoundaryShapeCreate(): Rid
        /* gdvirtual */ _separationRayShapeCreate(): Rid
        /* gdvirtual */ _sphereShapeCreate(): Rid
        /* gdvirtual */ _boxShapeCreate(): Rid
        /* gdvirtual */ _capsuleShapeCreate(): Rid
        /* gdvirtual */ _cylinderShapeCreate(): Rid
        /* gdvirtual */ _convexPolygonShapeCreate(): Rid
        /* gdvirtual */ _concavePolygonShapeCreate(): Rid
        /* gdvirtual */ _heightmapShapeCreate(): Rid
        /* gdvirtual */ _customShapeCreate(): Rid
        /* gdvirtual */ _shapeSetData(shape: Rid, data: any): void
        /* gdvirtual */ _shapeSetCustomSolverBias(shape: Rid, bias: float64): void
        /* gdvirtual */ _shapeSetMargin(shape: Rid, margin: float64): void
        /* gdvirtual */ _shapeGetMargin(shape: Rid): float64
        /* gdvirtual */ _shapeGetType(shape: Rid): PhysicsServer3D.ShapeType
        /* gdvirtual */ _shapeGetData(shape: Rid): any
        /* gdvirtual */ _shapeGetCustomSolverBias(shape: Rid): float64
        /* gdvirtual */ _spaceCreate(): Rid
        /* gdvirtual */ _spaceSetActive(space: Rid, active: boolean): void
        /* gdvirtual */ _spaceIsActive(space: Rid): boolean
        /* gdvirtual */ _spaceSetParam(space: Rid, param: PhysicsServer3D.SpaceParameter, value: float64): void
        /* gdvirtual */ _spaceGetParam(space: Rid, param: PhysicsServer3D.SpaceParameter): float64
        /* gdvirtual */ _spaceGetDirectState(space: Rid): null | PhysicsDirectSpaceState3D
        /* gdvirtual */ _spaceSetDebugContacts(space: Rid, maxContacts: int64): void
        /* gdvirtual */ _spaceGetContacts(space: Rid): PackedVector3Array
        /* gdvirtual */ _spaceGetContactCount(space: Rid): int64
        /* gdvirtual */ _areaCreate(): Rid
        /* gdvirtual */ _areaSetSpace(area: Rid, space: Rid): void
        /* gdvirtual */ _areaGetSpace(area: Rid): Rid
        /* gdvirtual */ _areaAddShape(area: Rid, shape: Rid, transform: Transform3D, disabled: boolean): void
        /* gdvirtual */ _areaSetShape(area: Rid, shapeIdx: int64, shape: Rid): void
        /* gdvirtual */ _areaSetShapeTransform(area: Rid, shapeIdx: int64, transform: Transform3D): void
        /* gdvirtual */ _areaSetShapeDisabled(area: Rid, shapeIdx: int64, disabled: boolean): void
        /* gdvirtual */ _areaGetShapeCount(area: Rid): int64
        /* gdvirtual */ _areaGetShape(area: Rid, shapeIdx: int64): Rid
        /* gdvirtual */ _areaGetShapeTransform(area: Rid, shapeIdx: int64): Transform3D
        /* gdvirtual */ _areaRemoveShape(area: Rid, shapeIdx: int64): void
        /* gdvirtual */ _areaClearShapes(area: Rid): void
        /* gdvirtual */ _areaAttachObjectInstanceId(area: Rid, id: int64): void
        /* gdvirtual */ _areaGetObjectInstanceId(area: Rid): int64
        /* gdvirtual */ _areaSetParam(area: Rid, param: PhysicsServer3D.AreaParameter, value: any): void
        /* gdvirtual */ _areaSetTransform(area: Rid, transform: Transform3D): void
        /* gdvirtual */ _areaGetParam(area: Rid, param: PhysicsServer3D.AreaParameter): any
        /* gdvirtual */ _areaGetTransform(area: Rid): Transform3D
        /* gdvirtual */ _areaSetCollisionLayer(area: Rid, layer: int64): void
        /* gdvirtual */ _areaGetCollisionLayer(area: Rid): int64
        /* gdvirtual */ _areaSetCollisionMask(area: Rid, mask: int64): void
        /* gdvirtual */ _areaGetCollisionMask(area: Rid): int64
        /* gdvirtual */ _areaSetMonitorable(area: Rid, monitorable: boolean): void
        /* gdvirtual */ _areaSetRayPickable(area: Rid, enable: boolean): void
        /* gdvirtual */ _areaSetMonitorCallback(area: Rid, callback: Callable): void
        /* gdvirtual */ _areaSetAreaMonitorCallback(area: Rid, callback: Callable): void
        /* gdvirtual */ _bodyCreate(): Rid
        /* gdvirtual */ _bodySetSpace(body: Rid, space: Rid): void
        /* gdvirtual */ _bodyGetSpace(body: Rid): Rid
        /* gdvirtual */ _bodySetMode(body: Rid, mode: PhysicsServer3D.BodyMode): void
        /* gdvirtual */ _bodyGetMode(body: Rid): PhysicsServer3D.BodyMode
        /* gdvirtual */ _bodyAddShape(body: Rid, shape: Rid, transform: Transform3D, disabled: boolean): void
        /* gdvirtual */ _bodySetShape(body: Rid, shapeIdx: int64, shape: Rid): void
        /* gdvirtual */ _bodySetShapeTransform(body: Rid, shapeIdx: int64, transform: Transform3D): void
        /* gdvirtual */ _bodySetShapeDisabled(body: Rid, shapeIdx: int64, disabled: boolean): void
        /* gdvirtual */ _bodyGetShapeCount(body: Rid): int64
        /* gdvirtual */ _bodyGetShape(body: Rid, shapeIdx: int64): Rid
        /* gdvirtual */ _bodyGetShapeTransform(body: Rid, shapeIdx: int64): Transform3D
        /* gdvirtual */ _bodyRemoveShape(body: Rid, shapeIdx: int64): void
        /* gdvirtual */ _bodyClearShapes(body: Rid): void
        /* gdvirtual */ _bodyAttachObjectInstanceId(body: Rid, id: int64): void
        /* gdvirtual */ _bodyGetObjectInstanceId(body: Rid): int64
        /* gdvirtual */ _bodySetEnableContinuousCollisionDetection(body: Rid, enable: boolean): void
        /* gdvirtual */ _bodyIsContinuousCollisionDetectionEnabled(body: Rid): boolean
        /* gdvirtual */ _bodySetCollisionLayer(body: Rid, layer: int64): void
        /* gdvirtual */ _bodyGetCollisionLayer(body: Rid): int64
        /* gdvirtual */ _bodySetCollisionMask(body: Rid, mask: int64): void
        /* gdvirtual */ _bodyGetCollisionMask(body: Rid): int64
        /* gdvirtual */ _bodySetCollisionPriority(body: Rid, priority: float64): void
        /* gdvirtual */ _bodyGetCollisionPriority(body: Rid): float64
        /* gdvirtual */ _bodySetUserFlags(body: Rid, flags: int64): void
        /* gdvirtual */ _bodyGetUserFlags(body: Rid): int64
        /* gdvirtual */ _bodySetParam(body: Rid, param: PhysicsServer3D.BodyParameter, value: any): void
        /* gdvirtual */ _bodyGetParam(body: Rid, param: PhysicsServer3D.BodyParameter): any
        /* gdvirtual */ _bodyResetMassProperties(body: Rid): void
        /* gdvirtual */ _bodySetState(body: Rid, state: PhysicsServer3D.BodyState, value: any): void
        /* gdvirtual */ _bodyGetState(body: Rid, state: PhysicsServer3D.BodyState): any
        /* gdvirtual */ _bodyApplyCentralImpulse(body: Rid, impulse: Vector3): void
        /* gdvirtual */ _bodyApplyImpulse(body: Rid, impulse: Vector3, position: Vector3): void
        /* gdvirtual */ _bodyApplyTorqueImpulse(body: Rid, impulse: Vector3): void
        /* gdvirtual */ _bodyApplyCentralForce(body: Rid, force: Vector3): void
        /* gdvirtual */ _bodyApplyForce(body: Rid, force: Vector3, position: Vector3): void
        /* gdvirtual */ _bodyApplyTorque(body: Rid, torque: Vector3): void
        /* gdvirtual */ _bodyAddConstantCentralForce(body: Rid, force: Vector3): void
        /* gdvirtual */ _bodyAddConstantForce(body: Rid, force: Vector3, position: Vector3): void
        /* gdvirtual */ _bodyAddConstantTorque(body: Rid, torque: Vector3): void
        /* gdvirtual */ _bodySetConstantForce(body: Rid, force: Vector3): void
        /* gdvirtual */ _bodyGetConstantForce(body: Rid): Vector3
        /* gdvirtual */ _bodySetConstantTorque(body: Rid, torque: Vector3): void
        /* gdvirtual */ _bodyGetConstantTorque(body: Rid): Vector3
        /* gdvirtual */ _bodySetAxisVelocity(body: Rid, axisVelocity: Vector3): void
        /* gdvirtual */ _bodySetAxisLock(body: Rid, axis: PhysicsServer3D.BodyAxis, lock: boolean): void
        /* gdvirtual */ _bodyIsAxisLocked(body: Rid, axis: PhysicsServer3D.BodyAxis): boolean
        /* gdvirtual */ _bodyAddCollisionException(body: Rid, exceptedBody: Rid): void
        /* gdvirtual */ _bodyRemoveCollisionException(body: Rid, exceptedBody: Rid): void
        /* gdvirtual */ _bodyGetCollisionExceptions(body: Rid): GArray<Rid>
        /* gdvirtual */ _bodySetMaxContactsReported(body: Rid, amount: int64): void
        /* gdvirtual */ _bodyGetMaxContactsReported(body: Rid): int64
        /* gdvirtual */ _bodySetContactsReportedDepthThreshold(body: Rid, threshold: float64): void
        /* gdvirtual */ _bodyGetContactsReportedDepthThreshold(body: Rid): float64
        /* gdvirtual */ _bodySetOmitForceIntegration(body: Rid, enable: boolean): void
        /* gdvirtual */ _bodyIsOmittingForceIntegration(body: Rid): boolean
        /* gdvirtual */ _bodySetStateSyncCallback(body: Rid, callable: Callable): void
        /* gdvirtual */ _bodySetForceIntegrationCallback(body: Rid, callable: Callable, userdata: any): void
        /* gdvirtual */ _bodySetRayPickable(body: Rid, enable: boolean): void
        /* gdvirtual */ _bodyTestMotion(body: Rid, from: Transform3D, motion: Vector3, margin: float64, maxCollisions: int64, collideSeparationRay: boolean, recoveryAsCollision: boolean, rResult: int64): boolean
        /* gdvirtual */ _bodyGetDirectState(body: Rid): null | PhysicsDirectBodyState3D
        /* gdvirtual */ _softBodyCreate(): Rid
        /* gdvirtual */ _softBodyUpdateRenderingServer(body: Rid, renderingServerHandler: PhysicsServer3DRenderingServerHandler): void
        /* gdvirtual */ _softBodySetSpace(body: Rid, space: Rid): void
        /* gdvirtual */ _softBodyGetSpace(body: Rid): Rid
        /* gdvirtual */ _softBodySetRayPickable(body: Rid, enable: boolean): void
        /* gdvirtual */ _softBodySetCollisionLayer(body: Rid, layer: int64): void
        /* gdvirtual */ _softBodyGetCollisionLayer(body: Rid): int64
        /* gdvirtual */ _softBodySetCollisionMask(body: Rid, mask: int64): void
        /* gdvirtual */ _softBodyGetCollisionMask(body: Rid): int64
        /* gdvirtual */ _softBodyAddCollisionException(body: Rid, bodyB: Rid): void
        /* gdvirtual */ _softBodyRemoveCollisionException(body: Rid, bodyB: Rid): void
        /* gdvirtual */ _softBodyGetCollisionExceptions(body: Rid): GArray<Rid>
        /* gdvirtual */ _softBodySetState(body: Rid, state: PhysicsServer3D.BodyState, variant: any): void
        /* gdvirtual */ _softBodyGetState(body: Rid, state: PhysicsServer3D.BodyState): any
        /* gdvirtual */ _softBodySetTransform(body: Rid, transform: Transform3D): void
        /* gdvirtual */ _softBodySetSimulationPrecision(body: Rid, simulationPrecision: int64): void
        /* gdvirtual */ _softBodyGetSimulationPrecision(body: Rid): int64
        /* gdvirtual */ _softBodySetTotalMass(body: Rid, totalMass: float64): void
        /* gdvirtual */ _softBodyGetTotalMass(body: Rid): float64
        /* gdvirtual */ _softBodySetLinearStiffness(body: Rid, linearStiffness: float64): void
        /* gdvirtual */ _softBodyGetLinearStiffness(body: Rid): float64
        /* gdvirtual */ _softBodySetShrinkingFactor(body: Rid, shrinkingFactor: float64): void
        /* gdvirtual */ _softBodyGetShrinkingFactor(body: Rid): float64
        /* gdvirtual */ _softBodySetPressureCoefficient(body: Rid, pressureCoefficient: float64): void
        /* gdvirtual */ _softBodyGetPressureCoefficient(body: Rid): float64
        /* gdvirtual */ _softBodySetDampingCoefficient(body: Rid, dampingCoefficient: float64): void
        /* gdvirtual */ _softBodyGetDampingCoefficient(body: Rid): float64
        /* gdvirtual */ _softBodySetDragCoefficient(body: Rid, dragCoefficient: float64): void
        /* gdvirtual */ _softBodyGetDragCoefficient(body: Rid): float64
        /* gdvirtual */ _softBodySetMesh(body: Rid, mesh: Rid): void
        /* gdvirtual */ _softBodyGetBounds(body: Rid): Aabb
        /* gdvirtual */ _softBodyMovePoint(body: Rid, pointIndex: int64, globalPosition: Vector3): void
        /* gdvirtual */ _softBodyGetPointGlobalPosition(body: Rid, pointIndex: int64): Vector3
        /* gdvirtual */ _softBodyRemoveAllPinnedPoints(body: Rid): void
        /* gdvirtual */ _softBodyPinPoint(body: Rid, pointIndex: int64, pin: boolean): void
        /* gdvirtual */ _softBodyIsPointPinned(body: Rid, pointIndex: int64): boolean
        /* gdvirtual */ _softBodyApplyPointImpulse(body: Rid, pointIndex: int64, impulse: Vector3): void
        /* gdvirtual */ _softBodyApplyPointForce(body: Rid, pointIndex: int64, force: Vector3): void
        /* gdvirtual */ _softBodyApplyCentralImpulse(body: Rid, impulse: Vector3): void
        /* gdvirtual */ _softBodyApplyCentralForce(body: Rid, force: Vector3): void
        /* gdvirtual */ _jointCreate(): Rid
        /* gdvirtual */ _jointClear(joint: Rid): void
        /* gdvirtual */ _jointMakePin(joint: Rid, bodyA: Rid, localA: Vector3, bodyB: Rid, localB: Vector3): void
        /* gdvirtual */ _pinJointSetParam(joint: Rid, param: PhysicsServer3D.PinJointParam, value: float64): void
        /* gdvirtual */ _pinJointGetParam(joint: Rid, param: PhysicsServer3D.PinJointParam): float64
        /* gdvirtual */ _pinJointSetLocalA(joint: Rid, localA: Vector3): void
        /* gdvirtual */ _pinJointGetLocalA(joint: Rid): Vector3
        /* gdvirtual */ _pinJointSetLocalB(joint: Rid, localB: Vector3): void
        /* gdvirtual */ _pinJointGetLocalB(joint: Rid): Vector3
        /* gdvirtual */ _jointMakeHinge(joint: Rid, bodyA: Rid, hingeA: Transform3D, bodyB: Rid, hingeB: Transform3D): void
        /* gdvirtual */ _jointMakeHingeSimple(joint: Rid, bodyA: Rid, pivotA: Vector3, axisA: Vector3, bodyB: Rid, pivotB: Vector3, axisB: Vector3): void
        /* gdvirtual */ _hingeJointSetParam(joint: Rid, param: PhysicsServer3D.HingeJointParam, value: float64): void
        /* gdvirtual */ _hingeJointGetParam(joint: Rid, param: PhysicsServer3D.HingeJointParam): float64
        /* gdvirtual */ _hingeJointSetFlag(joint: Rid, flag: PhysicsServer3D.HingeJointFlag, enabled: boolean): void
        /* gdvirtual */ _hingeJointGetFlag(joint: Rid, flag: PhysicsServer3D.HingeJointFlag): boolean
        /* gdvirtual */ _jointMakeSlider(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        /* gdvirtual */ _sliderJointSetParam(joint: Rid, param: PhysicsServer3D.SliderJointParam, value: float64): void
        /* gdvirtual */ _sliderJointGetParam(joint: Rid, param: PhysicsServer3D.SliderJointParam): float64
        /* gdvirtual */ _jointMakeConeTwist(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        /* gdvirtual */ _coneTwistJointSetParam(joint: Rid, param: PhysicsServer3D.ConeTwistJointParam, value: float64): void
        /* gdvirtual */ _coneTwistJointGetParam(joint: Rid, param: PhysicsServer3D.ConeTwistJointParam): float64
        /* gdvirtual */ _jointMakeGeneric6Dof(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        /* gdvirtual */ _generic6DofJointSetParam(joint: Rid, axis: Vector3.Axis, param: PhysicsServer3D.G6DofJointAxisParam, value: float64): void
        /* gdvirtual */ _generic6DofJointGetParam(joint: Rid, axis: Vector3.Axis, param: PhysicsServer3D.G6DofJointAxisParam): float64
        /* gdvirtual */ _generic6DofJointSetFlag(joint: Rid, axis: Vector3.Axis, flag: PhysicsServer3D.G6DofJointAxisFlag, enable: boolean): void
        /* gdvirtual */ _generic6DofJointGetFlag(joint: Rid, axis: Vector3.Axis, flag: PhysicsServer3D.G6DofJointAxisFlag): boolean
        /* gdvirtual */ _generic6DofJointSetAngularTargetRotation(joint: Rid, targetRotation: Quaternion): void
        /* gdvirtual */ _generic6DofJointGetAngularTargetRotation(joint: Rid): Quaternion
        /* gdvirtual */ _jointGetType(joint: Rid): PhysicsServer3D.JointType
        /* gdvirtual */ _jointSetSolverPriority(joint: Rid, priority: int64): void
        /* gdvirtual */ _jointGetSolverPriority(joint: Rid): int64
        /* gdvirtual */ _jointDisableCollisionsBetweenBodies(joint: Rid, disable: boolean): void
        /* gdvirtual */ _jointIsDisabledCollisionsBetweenBodies(joint: Rid): boolean
        /* gdvirtual */ _freeRid(rid: Rid): void
        /* gdvirtual */ _setActive(active: boolean): void
        /* gdvirtual */ _init(): void
        /* gdvirtual */ _step(step: float64): void
        /* gdvirtual */ _sync(): void
        /* gdvirtual */ _flushQueries(): void
        /* gdvirtual */ _endSync(): void
        /* gdvirtual */ _finish(): void
        /* gdvirtual */ _isFlushingQueries(): boolean
        /* gdvirtual */ _getProcessInfo(processInfo: PhysicsServer3D.ProcessInfo): int64
        bodyTestMotionIsExcludingBody(body: Rid): boolean
        bodyTestMotionIsExcludingObject(object: int64): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer3DExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer3DExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer3DRenderingServerHandler extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer3DRenderingServerHandler extends __NameMapGObject {
        _set_vertex: "_setVertex";
        _set_normal: "_setNormal";
        _set_aabb: "_setAabb";
        set_vertex: "setVertex";
        set_normal: "setNormal";
        set_aabb: "setAabb";
    }
    /** A class used to provide [method PhysicsServer3DExtension._soft_body_update_rendering_server] with a rendering handler for soft bodies.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver3drenderingserverhandler.html  
     */
    class PhysicsServer3DRenderingServerHandler extends GObject {
        constructor(identifier?: any)
        /** Called by the [PhysicsServer3D] to set the position for the [SoftBody3D] vertex at the index specified by [param vertex_id].  
         *      
         *  **Note:** The [param vertex] parameter used to be of type `const void*` prior to Godot 4.2.  
         */
        /* gdvirtual */ _setVertex(vertexId: int64, vertex: Vector3): void
        
        /** Called by the [PhysicsServer3D] to set the normal for the [SoftBody3D] vertex at the index specified by [param vertex_id].  
         *      
         *  **Note:** The [param normal] parameter used to be of type `const void*` prior to Godot 4.2.  
         */
        /* gdvirtual */ _setNormal(vertexId: int64, normal: Vector3): void
        
        /** Called by the [PhysicsServer3D] to set the bounding box for the [SoftBody3D]. */
        /* gdvirtual */ _setAabb(aabb: Aabb): void
        
        /** Sets the position for the [SoftBody3D] vertex at the index specified by [param vertex_id]. */
        setVertex(vertexId: int64, vertex: Vector3): void
        
        /** Sets the normal for the [SoftBody3D] vertex at the index specified by [param vertex_id]. */
        setNormal(vertexId: int64, normal: Vector3): void
        
        /** Sets the bounding box for the [SoftBody3D]. */
        setAabb(aabb: Aabb): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer3DRenderingServerHandler;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer3DRenderingServerHandler;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsShapeQueryParameters2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsShapeQueryParameters2D extends __NameMapRefCounted {
        collision_mask: "collisionMask";
        shape_rid: "shapeRid";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
    }
    /** Provides parameters for [PhysicsDirectSpaceState2D]'s methods.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsshapequeryparameters2d.html  
     */
    class PhysicsShapeQueryParameters2D extends RefCounted {
        constructor(identifier?: any)
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject2D.get_rid] to get the [RID] associated with a [CollisionObject2D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** The collision margin for the shape. */
        get margin(): float64
        set margin(value: float64)
        
        /** The motion of the shape being queried for. */
        get motion(): Vector2
        set motion(value: Vector2)
        
        /** The [Shape2D] that will be used for collision/intersection queries. This stores the actual reference which avoids the shape to be released while being used for queries, so always prefer using this over [member shape_rid]. */
        get shape(): null | Shape2D
        set shape(value: null | Shape2D)
        
        /** The queried shape's [RID] that will be used for collision/intersection queries. Use this over [member shape] if you want to optimize for performance using the Servers API:  
         *    
         */
        get shapeRid(): Rid
        set shapeRid(value: Rid)
        
        /** The queried shape's transform matrix. */
        get transform(): Transform2D
        set transform(value: Transform2D)
        
        /** If `true`, the query will take [PhysicsBody2D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area2D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsShapeQueryParameters2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsShapeQueryParameters2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsShapeQueryParameters3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsShapeQueryParameters3D extends __NameMapRefCounted {
        collision_mask: "collisionMask";
        shape_rid: "shapeRid";
        collide_with_bodies: "collideWithBodies";
        collide_with_areas: "collideWithAreas";
    }
    /** Provides parameters for [PhysicsDirectSpaceState3D]'s methods.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsshapequeryparameters3d.html  
     */
    class PhysicsShapeQueryParameters3D extends RefCounted {
        constructor(identifier?: any)
        /** The physics layers the query will detect (as a bitmask). By default, all collision layers are detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The list of object [RID]s that will be excluded from collisions. Use [method CollisionObject3D.get_rid] to get the [RID] associated with a [CollisionObject3D]-derived node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then assign it to the property again.  
         */
        get exclude(): GArray<Rid>
        set exclude(value: GArray<Rid>)
        
        /** The collision margin for the shape. */
        get margin(): float64
        set margin(value: float64)
        
        /** The motion of the shape being queried for. */
        get motion(): Vector3
        set motion(value: Vector3)
        
        /** The [Shape3D] that will be used for collision/intersection queries. This stores the actual reference which avoids the shape to be released while being used for queries, so always prefer using this over [member shape_rid]. */
        get shape(): null | Shape3D
        set shape(value: null | Shape3D)
        
        /** The queried shape's [RID] that will be used for collision/intersection queries. Use this over [member shape] if you want to optimize for performance using the Servers API:  
         *    
         */
        get shapeRid(): Rid
        set shapeRid(value: Rid)
        
        /** The queried shape's transform matrix. */
        get transform(): Transform3D
        set transform(value: Transform3D)
        
        /** If `true`, the query will take [PhysicsBody3D]s into account. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** If `true`, the query will take [Area3D]s into account. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsShapeQueryParameters3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsShapeQueryParameters3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsTestMotionParameters2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsTestMotionParameters2D extends __NameMapRefCounted {
        collide_separation_ray: "collideSeparationRay";
        exclude_bodies: "excludeBodies";
        exclude_objects: "excludeObjects";
        recovery_as_collision: "recoveryAsCollision";
    }
    /** Provides parameters for [method PhysicsServer2D.body_test_motion].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicstestmotionparameters2d.html  
     */
    class PhysicsTestMotionParameters2D extends RefCounted {
        constructor(identifier?: any)
        /** Transform in global space where the motion should start. Usually set to [member Node2D.global_transform] for the current body's transform. */
        get from(): Transform2D
        set from(value: Transform2D)
        
        /** Motion vector to define the length and direction of the motion to test. */
        get motion(): Vector2
        set motion(value: Vector2)
        
        /** Increases the size of the shapes involved in the collision detection. */
        get margin(): float64
        set margin(value: float64)
        
        /** If set to `true`, shapes of type [constant PhysicsServer2D.SHAPE_SEPARATION_RAY] are used to detect collisions and can stop the motion. Can be useful when snapping to the ground.  
         *  If set to `false`, shapes of type [constant PhysicsServer2D.SHAPE_SEPARATION_RAY] are only used for separation when overlapping with other bodies. That's the main use for separation ray shapes.  
         */
        get collideSeparationRay(): boolean
        set collideSeparationRay(value: boolean)
        
        /** Optional array of body [RID] to exclude from collision. Use [method CollisionObject2D.get_rid] to get the [RID] associated with a [CollisionObject2D]-derived node. */
        get excludeBodies(): GArray<Rid>
        set excludeBodies(value: GArray<Rid>)
        
        /** Optional array of object unique instance ID to exclude from collision. See [method Object.get_instance_id]. */
        get excludeObjects(): GArray
        set excludeObjects(value: GArray)
        
        /** If set to `true`, any depenetration from the recovery phase is reported as a collision; this is used e.g. by [CharacterBody2D] for improving floor detection during floor snapping.  
         *  If set to `false`, only collisions resulting from the motion are reported, which is generally the desired behavior.  
         */
        get recoveryAsCollision(): boolean
        set recoveryAsCollision(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsTestMotionParameters2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsTestMotionParameters2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsTestMotionParameters3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsTestMotionParameters3D extends __NameMapRefCounted {
        max_collisions: "maxCollisions";
        collide_separation_ray: "collideSeparationRay";
        exclude_bodies: "excludeBodies";
        exclude_objects: "excludeObjects";
        recovery_as_collision: "recoveryAsCollision";
    }
    /** Provides parameters for [method PhysicsServer3D.body_test_motion].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicstestmotionparameters3d.html  
     */
    class PhysicsTestMotionParameters3D extends RefCounted {
        constructor(identifier?: any)
        /** Transform in global space where the motion should start. Usually set to [member Node3D.global_transform] for the current body's transform. */
        get from(): Transform3D
        set from(value: Transform3D)
        
        /** Motion vector to define the length and direction of the motion to test. */
        get motion(): Vector3
        set motion(value: Vector3)
        
        /** Increases the size of the shapes involved in the collision detection. */
        get margin(): float64
        set margin(value: float64)
        
        /** Maximum number of returned collisions, between `1` and `32`. Always returns the deepest detected collisions. */
        get maxCollisions(): int64
        set maxCollisions(value: int64)
        
        /** If set to `true`, shapes of type [constant PhysicsServer3D.SHAPE_SEPARATION_RAY] are used to detect collisions and can stop the motion. Can be useful when snapping to the ground.  
         *  If set to `false`, shapes of type [constant PhysicsServer3D.SHAPE_SEPARATION_RAY] are only used for separation when overlapping with other bodies. That's the main use for separation ray shapes.  
         */
        get collideSeparationRay(): boolean
        set collideSeparationRay(value: boolean)
        
        /** Optional array of body [RID] to exclude from collision. Use [method CollisionObject3D.get_rid] to get the [RID] associated with a [CollisionObject3D]-derived node. */
        get excludeBodies(): GArray<Rid>
        set excludeBodies(value: GArray<Rid>)
        
        /** Optional array of object unique instance ID to exclude from collision. See [method Object.get_instance_id]. */
        get excludeObjects(): GArray
        set excludeObjects(value: GArray)
        
        /** If set to `true`, any depenetration from the recovery phase is reported as a collision; this is used e.g. by [CharacterBody3D] for improving floor detection during floor snapping.  
         *  If set to `false`, only collisions resulting from the motion are reported, which is generally the desired behavior.  
         */
        get recoveryAsCollision(): boolean
        set recoveryAsCollision(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsTestMotionParameters3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsTestMotionParameters3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsTestMotionResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsTestMotionResult2D extends __NameMapRefCounted {
        get_travel: "getTravel";
        get_remainder: "getRemainder";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        get_collider_velocity: "getColliderVelocity";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        get_collision_local_shape: "getCollisionLocalShape";
        get_collision_depth: "getCollisionDepth";
        get_collision_safe_fraction: "getCollisionSafeFraction";
        get_collision_unsafe_fraction: "getCollisionUnsafeFraction";
    }
    /** Describes the motion and collision result from [method PhysicsServer2D.body_test_motion].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicstestmotionresult2d.html  
     */
    class PhysicsTestMotionResult2D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the moving object's travel before collision. */
        getTravel(): Vector2
        
        /** Returns the moving object's remaining movement vector. */
        getRemainder(): Vector2
        
        /** Returns the point of collision in global coordinates, if a collision occurred. */
        getCollisionPoint(): Vector2
        
        /** Returns the colliding body's shape's normal at the point of collision, if a collision occurred. */
        getCollisionNormal(): Vector2
        
        /** Returns the colliding body's velocity, if a collision occurred. */
        getColliderVelocity(): Vector2
        
        /** Returns the unique instance ID of the colliding body's attached [Object], if a collision occurred. See [method Object.get_instance_id]. */
        getColliderId(): int64
        
        /** Returns the colliding body's [RID] used by the [PhysicsServer2D], if a collision occurred. */
        getColliderRid(): Rid
        
        /** Returns the colliding body's attached [Object], if a collision occurred. */
        getCollider(): null | GObject
        
        /** Returns the colliding body's shape index, if a collision occurred. See [CollisionObject2D]. */
        getColliderShape(): int64
        
        /** Returns the moving object's colliding shape, if a collision occurred. */
        getCollisionLocalShape(): int64
        
        /** Returns the length of overlap along the collision normal, if a collision occurred. */
        getCollisionDepth(): float64
        
        /** Returns the maximum fraction of the motion that can occur without a collision, between `0` and `1`. */
        getCollisionSafeFraction(): float64
        
        /** Returns the minimum fraction of the motion needed to collide, if a collision occurred, between `0` and `1`. */
        getCollisionUnsafeFraction(): float64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsTestMotionResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsTestMotionResult2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsTestMotionResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsTestMotionResult3D extends __NameMapRefCounted {
        get_travel: "getTravel";
        get_remainder: "getRemainder";
        get_collision_safe_fraction: "getCollisionSafeFraction";
        get_collision_unsafe_fraction: "getCollisionUnsafeFraction";
        get_collision_count: "getCollisionCount";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        get_collider_velocity: "getColliderVelocity";
        get_collider_id: "getColliderId";
        get_collider_rid: "getColliderRid";
        get_collider: "getCollider";
        get_collider_shape: "getColliderShape";
        get_collision_local_shape: "getCollisionLocalShape";
        get_collision_depth: "getCollisionDepth";
    }
    /** Describes the motion and collision result from [method PhysicsServer3D.body_test_motion].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicstestmotionresult3d.html  
     */
    class PhysicsTestMotionResult3D extends RefCounted {
        constructor(identifier?: any)
        /** Returns the moving object's travel before collision. */
        getTravel(): Vector3
        
        /** Returns the moving object's remaining movement vector. */
        getRemainder(): Vector3
        
        /** Returns the maximum fraction of the motion that can occur without a collision, between `0` and `1`. */
        getCollisionSafeFraction(): float64
        
        /** Returns the minimum fraction of the motion needed to collide, if a collision occurred, between `0` and `1`. */
        getCollisionUnsafeFraction(): float64
        
        /** Returns the number of detected collisions. */
        getCollisionCount(): int64
        
        /** Returns the point of collision in global coordinates given a collision index (the deepest collision by default), if a collision occurred. */
        getCollisionPoint(collisionIndex?: int64 /* = 0 */): Vector3
        
        /** Returns the colliding body's shape's normal at the point of collision given a collision index (the deepest collision by default), if a collision occurred. */
        getCollisionNormal(collisionIndex?: int64 /* = 0 */): Vector3
        
        /** Returns the colliding body's velocity given a collision index (the deepest collision by default), if a collision occurred. */
        getColliderVelocity(collisionIndex?: int64 /* = 0 */): Vector3
        
        /** Returns the unique instance ID of the colliding body's attached [Object] given a collision index (the deepest collision by default), if a collision occurred. See [method Object.get_instance_id]. */
        getColliderId(collisionIndex?: int64 /* = 0 */): int64
        
        /** Returns the colliding body's [RID] used by the [PhysicsServer3D] given a collision index (the deepest collision by default), if a collision occurred. */
        getColliderRid(collisionIndex?: int64 /* = 0 */): Rid
        
        /** Returns the colliding body's attached [Object] given a collision index (the deepest collision by default), if a collision occurred. */
        getCollider(collisionIndex?: int64 /* = 0 */): null | GObject
        
        /** Returns the colliding body's shape index given a collision index (the deepest collision by default), if a collision occurred. See [CollisionObject3D]. */
        getColliderShape(collisionIndex?: int64 /* = 0 */): int64
        
        /** Returns the moving object's colliding shape given a collision index (the deepest collision by default), if a collision occurred. */
        getCollisionLocalShape(collisionIndex?: int64 /* = 0 */): int64
        
        /** Returns the length of overlap along the collision normal given a collision index (the deepest collision by default), if a collision occurred. */
        getCollisionDepth(collisionIndex?: int64 /* = 0 */): float64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsTestMotionResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsTestMotionResult3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPinJoint2D extends __RPCMapJoint2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPinJoint2D extends __NameMapJoint2D {
        angular_limit_enabled: "angularLimitEnabled";
        angular_limit_lower: "angularLimitLower";
        angular_limit_upper: "angularLimitUpper";
        motor_enabled: "motorEnabled";
        motor_target_velocity: "motorTargetVelocity";
    }
    /** A physics joint that attaches two 2D physics bodies at a single point, allowing them to freely rotate.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pinjoint2d.html  
     */
    class PinJoint2D<Map extends NodePathMap = any> extends Joint2D<Map> {
        constructor(identifier?: any)
        /** The higher this value, the more the bond to the pinned partner can flex. */
        get softness(): float64
        set softness(value: float64)
        
        /** If `true`, the pin maximum and minimum rotation, defined by [member angular_limit_lower] and [member angular_limit_upper] are applied. */
        get angularLimitEnabled(): boolean
        set angularLimitEnabled(value: boolean)
        
        /** The minimum rotation. Only active if [member angular_limit_enabled] is `true`. */
        get angularLimitLower(): float64
        set angularLimitLower(value: float64)
        
        /** The maximum rotation. Only active if [member angular_limit_enabled] is `true`. */
        get angularLimitUpper(): float64
        set angularLimitUpper(value: float64)
        
        /** When activated, a motor turns the pin. */
        get motorEnabled(): boolean
        set motorEnabled(value: boolean)
        
        /** Target speed for the motor. In radians per second. */
        get motorTargetVelocity(): float64
        set motorTargetVelocity(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPinJoint2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPinJoint2D;
    }
    namespace PinJoint3D {
        enum Param {
            ParamBias = 0,
            ParamDamping = 1,
            ParamImpulseClamp = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPinJoint3D extends __RPCMapJoint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPinJoint3D extends __NameMapJoint3D {
        set_param: "setParam";
        get_param: "getParam";
        "params/impulse_clamp": "params/impulseClamp";
    }
    /** A physics joint that attaches two 3D physics bodies at a single point, allowing them to freely rotate.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pinjoint3d.html  
     */
    class PinJoint3D<Map extends NodePathMap = any> extends Joint3D<Map> {
        constructor(identifier?: any)
        /** Sets the value of the specified parameter. */
        setParam(param: PinJoint3D.Param, value: float64): void
        
        /** Returns the value of the specified parameter. */
        getParam(param: PinJoint3D.Param): float64
        
        /** The force with which the pinned objects stay in positional relation to each other. The higher, the stronger. */
        get "params/bias"(): float64
        set "params/bias"(value: float64)
        
        /** The force with which the pinned objects stay in velocity relation to each other. The higher, the stronger. */
        get "params/damping"(): float64
        set "params/damping"(value: float64)
        
        /** If above 0, this value is the maximum value for an impulse that this Joint3D produces. */
        get "params/impulseClamp"(): float64
        set "params/impulseClamp"(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPinJoint3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPinJoint3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderCubemap extends __RPCMapPlaceholderTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderCubemap extends __NameMapPlaceholderTextureLayered {
    }
    /** A [Cubemap] without image data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdercubemap.html  
     */
    class PlaceholderCubemap extends PlaceholderTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderCubemap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderCubemap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderCubemapArray extends __RPCMapPlaceholderTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderCubemapArray extends __NameMapPlaceholderTextureLayered {
    }
    /** A [CubemapArray] without image data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdercubemaparray.html  
     */
    class PlaceholderCubemapArray extends PlaceholderTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderCubemapArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderCubemapArray;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderMaterial extends __NameMapMaterial {
    }
    /** Placeholder class for a material.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdermaterial.html  
     */
    class PlaceholderMaterial extends Material {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderMesh extends __RPCMapMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderMesh extends __NameMapMesh {
    }
    /** Placeholder class for a mesh.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdermesh.html  
     */
    class PlaceholderMesh extends Mesh {
        constructor(identifier?: any)
        /** The smallest [AABB] enclosing this mesh in local space. */
        get aabb(): Aabb
        set aabb(value: Aabb)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderTexture2D extends __NameMapTexture2D {
    }
    /** Placeholder class for a 2-dimensional texture.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdertexture2d.html  
     */
    class PlaceholderTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** The texture's size (in pixels). */
        get size(): Vector2
        set size(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderTexture2DArray extends __RPCMapPlaceholderTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderTexture2DArray extends __NameMapPlaceholderTextureLayered {
    }
    /** Placeholder class for a 2-dimensional texture array.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdertexture2darray.html  
     */
    class PlaceholderTexture2DArray extends PlaceholderTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderTexture2DArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderTexture2DArray;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderTexture3D extends __RPCMapTexture3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderTexture3D extends __NameMapTexture3D {
    }
    /** Placeholder class for a 3-dimensional texture.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdertexture3d.html  
     */
    class PlaceholderTexture3D extends Texture3D {
        constructor(identifier?: any)
        /** The texture's size (in pixels). */
        get size(): Vector3I
        set size(value: Vector3I)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderTexture3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderTexture3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaceholderTextureLayered extends __RPCMapTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaceholderTextureLayered extends __NameMapTextureLayered {
    }
    /** Placeholder class for a 2-dimensional texture array.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_placeholdertexturelayered.html  
     */
    class PlaceholderTextureLayered extends TextureLayered {
        constructor(identifier?: any)
        /** The size of each texture layer (in pixels). */
        get size(): Vector2I
        set size(value: Vector2I)
        
        /** The number of layers in the texture array. */
        get layers(): int64
        set layers(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaceholderTextureLayered;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaceholderTextureLayered;
    }
    namespace PlaneMesh {
        enum Orientation {
            FaceX = 0,
            FaceY = 1,
            FaceZ = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPlaneMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPlaneMesh extends __NameMapPrimitiveMesh {
        subdivide_width: "subdivideWidth";
        subdivide_depth: "subdivideDepth";
        center_offset: "centerOffset";
    }
    /** Class representing a planar [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_planemesh.html  
     */
    class PlaneMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Size of the generated plane. */
        get size(): Vector2
        set size(value: Vector2)
        
        /** Number of subdivision along the X axis. */
        get subdivideWidth(): int64
        set subdivideWidth(value: int64)
        
        /** Number of subdivision along the Z axis. */
        get subdivideDepth(): int64
        set subdivideDepth(value: int64)
        
        /** Offset of the generated plane. Useful for particles. */
        get centerOffset(): Vector3
        set centerOffset(value: Vector3)
        
        /** Direction that the [PlaneMesh] is facing. */
        get orientation(): int64
        set orientation(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPlaneMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPlaneMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPointLight2D extends __RPCMapLight2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPointLight2D extends __NameMapLight2D {
        texture_scale: "textureScale";
    }
    /** Positional 2D light source.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pointlight2d.html  
     */
    class PointLight2D<Map extends NodePathMap = any> extends Light2D<Map> {
        constructor(identifier?: any)
        /** [Texture2D] used for the light's appearance. */
        get texture(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture
        set texture(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture)
        
        /** The offset of the light's [member texture]. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** The [member texture]'s scale factor. */
        get textureScale(): float64
        set textureScale(value: float64)
        
        /** The height of the light. Used with 2D normal mapping. The units are in pixels, e.g. if the height is 100, then it will illuminate an object 100 pixels away at a 45° angle to the plane. */
        get height(): float64
        set height(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPointLight2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPointLight2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPointMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPointMesh extends __NameMapPrimitiveMesh {
    }
    /** Mesh with a single point primitive.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_pointmesh.html  
     */
    class PointMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPointMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPointMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPolygon2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPolygon2D extends __NameMapNode2D {
        add_bone: "addBone";
        get_bone_count: "getBoneCount";
        get_bone_path: "getBonePath";
        get_bone_weights: "getBoneWeights";
        erase_bone: "eraseBone";
        clear_bones: "clearBones";
        set_bone_path: "setBonePath";
        set_bone_weights: "setBoneWeights";
        texture_offset: "textureOffset";
        texture_scale: "textureScale";
        texture_rotation: "textureRotation";
        invert_enabled: "invertEnabled";
        invert_border: "invertBorder";
        vertex_colors: "vertexColors";
        internal_vertex_count: "internalVertexCount";
    }
    /** A 2D polygon.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_polygon2d.html  
     */
    class Polygon2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Adds a bone with the specified [param path] and [param weights]. */
        addBone(path: NodePath | string, weights: PackedFloat32Array | float32[]): void
        
        /** Returns the number of bones in this [Polygon2D]. */
        getBoneCount(): int64
        
        /** Returns the path to the node associated with the specified bone. */
        getBonePath(index: int64): NodePath
        
        /** Returns the weight values of the specified bone. */
        getBoneWeights(index: int64): PackedFloat32Array
        
        /** Removes the specified bone from this [Polygon2D]. */
        eraseBone(index: int64): void
        
        /** Removes all bones from this [Polygon2D]. */
        clearBones(): void
        
        /** Sets the path to the node associated with the specified bone. */
        setBonePath(index: int64, path: NodePath | string): void
        
        /** Sets the weight values for the specified bone. */
        setBoneWeights(index: int64, weights: PackedFloat32Array | float32[]): void
        
        /** The polygon's fill color. If [member texture] is set, it will be multiplied by this color. It will also be the default color for vertices not set in [member vertex_colors]. */
        get color(): Color
        set color(value: Color)
        
        /** The offset applied to each vertex. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** If `true`, polygon edges will be anti-aliased. */
        get antialiased(): boolean
        set antialiased(value: boolean)
        
        /** The polygon's fill texture. Use [member uv] to set texture coordinates. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** Amount to offset the polygon's [member texture]. If set to `Vector2(0, 0)`, the texture's origin (its top-left corner) will be placed at the polygon's position. */
        get textureOffset(): Vector2
        set textureOffset(value: Vector2)
        
        /** Amount to multiply the [member uv] coordinates when using [member texture]. Larger values make the texture smaller, and vice versa. */
        get textureScale(): Vector2
        set textureScale(value: Vector2)
        
        /** The texture's rotation in radians. */
        get textureRotation(): float64
        set textureRotation(value: float64)
        
        /** Path to a [Skeleton2D] node used for skeleton-based deformations of this polygon. If empty or invalid, skeletal deformations will not be used. */
        get skeleton(): NodePath
        set skeleton(value: NodePath | string)
        
        /** If `true`, the polygon will be inverted, containing the area outside the defined points and extending to the [member invert_border]. */
        get invertEnabled(): boolean
        set invertEnabled(value: boolean)
        
        /** Added padding applied to the bounding box when [member invert_enabled] is set to `true`. Setting this value too small may result in a "Bad Polygon" error. */
        get invertBorder(): float64
        set invertBorder(value: float64)
        
        /** The polygon's list of vertices. The final point will be connected to the first. */
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        
        /** Texture coordinates for each vertex of the polygon. There should be one UV value per polygon vertex. If there are fewer, undefined vertices will use `Vector2(0, 0)`. */
        get uv(): PackedVector2Array
        set uv(value: PackedVector2Array | Vector2[])
        
        /** Color for each vertex. Colors are interpolated between vertices, resulting in smooth gradients. There should be one per polygon vertex. If there are fewer, undefined vertices will use [member color]. */
        get vertexColors(): PackedColorArray
        set vertexColors(value: PackedColorArray | Color[])
        
        /** The list of polygons, in case more than one is being represented. Every individual polygon is stored as a [PackedInt32Array] where each [int] is an index to a point in [member polygon]. If empty, this property will be ignored, and the resulting single polygon will be composed of all points in [member polygon], using the order they are stored in. */
        get polygons(): GArray
        set polygons(value: GArray)
        get bones(): GArray
        set bones(value: GArray)
        
        /** Number of internal vertices, used for UV mapping. */
        get internalVertexCount(): int64
        set internalVertexCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPolygon2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPolygon2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPolygonOccluder3D extends __RPCMapOccluder3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPolygonOccluder3D extends __NameMapOccluder3D {
        _has_editable_3d_polygon_no_depth: "_hasEditable3DPolygonNoDepth";
    }
    /** Flat 2D polygon shape for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_polygonoccluder3d.html  
     */
    class PolygonOccluder3D extends Occluder3D {
        constructor(identifier?: any)
        _hasEditable3DPolygonNoDepth(): boolean
        
        /** The polygon to use for occlusion culling. The polygon can be convex or concave, but it should have as few points as possible to maximize performance.  
         *  The polygon must  *not*  have intersecting lines. Otherwise, triangulation will fail (with an error message printed).  
         */
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPolygonOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPolygonOccluder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPolygonPathFinder extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPolygonPathFinder extends __NameMapResource {
        find_path: "findPath";
        get_intersections: "getIntersections";
        get_closest_point: "getClosestPoint";
        is_point_inside: "isPointInside";
        set_point_penalty: "setPointPenalty";
        get_point_penalty: "getPointPenalty";
        get_bounds: "getBounds";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_polygonpathfinder.html */
    class PolygonPathFinder extends Resource {
        constructor(identifier?: any)
        /** Sets up [PolygonPathFinder] with an array of points that define the vertices of the polygon, and an array of indices that determine the edges of the polygon.  
         *  The length of [param connections] must be even, returns an error if odd.  
         *    
         */
        setup(points: PackedVector2Array | Vector2[], connections: PackedInt32Array | int32[]): void
        findPath(from: Vector2, to: Vector2): PackedVector2Array
        getIntersections(from: Vector2, to: Vector2): PackedVector2Array
        getClosestPoint(point: Vector2): Vector2
        
        /** Returns `true` if [param point] falls inside the polygon area.  
         *    
         */
        isPointInside(point: Vector2): boolean
        setPointPenalty(idx: int64, penalty: float64): void
        getPointPenalty(idx: int64): float64
        getBounds(): Rect2
        get data(): GDictionary
        set data(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPolygonPathFinder;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPolygonPathFinder;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPopup extends __RPCMapWindow {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPopup extends __NameMapWindow {
        popup_hide: "popupHide";
    }
    /** Base class for contextual windows and panels with fixed position.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_popup.html  
     */
    class Popup<Map extends NodePathMap = any> extends Window<Map> {
        constructor(identifier?: any)
        /** Emitted when the popup is hidden. */
        readonly popupHide: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPopup;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPopup;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPopupMenu extends __RPCMapPopup {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPopupMenu extends __NameMapPopup {
        activate_item_by_event: "activateItemByEvent";
        is_native_menu: "isNativeMenu";
        add_item: "addItem";
        add_icon_item: "addIconItem";
        add_check_item: "addCheckItem";
        add_icon_check_item: "addIconCheckItem";
        add_radio_check_item: "addRadioCheckItem";
        add_icon_radio_check_item: "addIconRadioCheckItem";
        add_multistate_item: "addMultistateItem";
        add_shortcut: "addShortcut";
        add_icon_shortcut: "addIconShortcut";
        add_check_shortcut: "addCheckShortcut";
        add_icon_check_shortcut: "addIconCheckShortcut";
        add_radio_check_shortcut: "addRadioCheckShortcut";
        add_icon_radio_check_shortcut: "addIconRadioCheckShortcut";
        add_submenu_item: "addSubmenuItem";
        add_submenu_node_item: "addSubmenuNodeItem";
        set_item_text: "setItemText";
        set_item_text_direction: "setItemTextDirection";
        set_item_language: "setItemLanguage";
        set_item_auto_translate_mode: "setItemAutoTranslateMode";
        set_item_icon: "setItemIcon";
        set_item_icon_max_width: "setItemIconMaxWidth";
        set_item_icon_modulate: "setItemIconModulate";
        set_item_checked: "setItemChecked";
        set_item_indeterminate: "setItemIndeterminate";
        set_item_id: "setItemId";
        set_item_accelerator: "setItemAccelerator";
        set_item_metadata: "setItemMetadata";
        set_item_disabled: "setItemDisabled";
        set_item_submenu: "setItemSubmenu";
        set_item_submenu_node: "setItemSubmenuNode";
        set_item_as_separator: "setItemAsSeparator";
        set_item_as_checkable: "setItemAsCheckable";
        set_item_as_radio_checkable: "setItemAsRadioCheckable";
        set_item_tooltip: "setItemTooltip";
        set_item_shortcut: "setItemShortcut";
        set_item_indent: "setItemIndent";
        set_item_multistate: "setItemMultistate";
        set_item_multistate_max: "setItemMultistateMax";
        set_item_shortcut_disabled: "setItemShortcutDisabled";
        set_item_index: "setItemIndex";
        toggle_item_checked: "toggleItemChecked";
        toggle_item_multistate: "toggleItemMultistate";
        get_item_text: "getItemText";
        get_item_text_direction: "getItemTextDirection";
        get_item_language: "getItemLanguage";
        get_item_auto_translate_mode: "getItemAutoTranslateMode";
        get_item_icon: "getItemIcon";
        get_item_icon_max_width: "getItemIconMaxWidth";
        get_item_icon_modulate: "getItemIconModulate";
        is_item_checked: "isItemChecked";
        is_item_indeterminate: "isItemIndeterminate";
        get_item_id: "getItemId";
        get_item_index: "getItemIndex";
        get_item_accelerator: "getItemAccelerator";
        get_item_metadata: "getItemMetadata";
        is_item_disabled: "isItemDisabled";
        get_item_submenu: "getItemSubmenu";
        get_item_submenu_node: "getItemSubmenuNode";
        is_item_separator: "isItemSeparator";
        is_item_checkable: "isItemCheckable";
        is_item_radio_checkable: "isItemRadioCheckable";
        is_item_shortcut_disabled: "isItemShortcutDisabled";
        get_item_tooltip: "getItemTooltip";
        get_item_shortcut: "getItemShortcut";
        get_item_indent: "getItemIndent";
        get_item_multistate_max: "getItemMultistateMax";
        get_item_multistate: "getItemMultistate";
        set_focused_item: "setFocusedItem";
        get_focused_item: "getFocusedItem";
        scroll_to_item: "scrollToItem";
        remove_item: "removeItem";
        add_separator: "addSeparator";
        is_system_menu: "isSystemMenu";
        hide_on_item_selection: "hideOnItemSelection";
        hide_on_checkable_item_selection: "hideOnCheckableItemSelection";
        hide_on_state_item_selection: "hideOnStateItemSelection";
        submenu_popup_delay: "submenuPopupDelay";
        allow_search: "allowSearch";
        system_menu_id: "systemMenuId";
        prefer_native_menu: "preferNativeMenu";
        shrink_height: "shrinkHeight";
        shrink_width: "shrinkWidth";
        search_bar_enabled: "searchBarEnabled";
        search_bar_min_item_count: "searchBarMinItemCount";
        search_bar_fuzzy_search_enabled: "searchBarFuzzySearchEnabled";
        search_bar_fuzzy_search_max_misses: "searchBarFuzzySearchMaxMisses";
        item_count: "itemCount";
        id_pressed: "idPressed";
        id_focused: "idFocused";
        index_pressed: "indexPressed";
        menu_changed: "menuChanged";
    }
    /** A modal window used to display a list of options.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_popupmenu.html  
     */
    class PopupMenu<Map extends NodePathMap = any> extends Popup<Map> {
        constructor(identifier?: any)
        /** Checks the provided [param event] against the [PopupMenu]'s shortcuts and accelerators, and activates the first item with matching events. If [param for_global_only] is `true`, only shortcuts and accelerators with `global` set to `true` will be called.  
         *  Returns `true` if an item was successfully activated.  
         *      
         *  **Note:** Certain [Control]s, such as [MenuButton], will call this method automatically.  
         */
        activateItemByEvent(event: InputEvent, forGlobalOnly?: boolean /* = false */): boolean
        
        /** Returns `true` if the system native menu is supported and currently used by this [PopupMenu]. */
        isNativeMenu(): boolean
        
        /** Adds a new item with text [param label].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         *      
         *  **Note:** The provided [param id] is used only in [signal id_pressed] and [signal id_focused] signals. It's not related to the `index` arguments in e.g. [method set_item_checked].  
         */
        addItem(label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a new item with text [param label] and icon [param texture].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         */
        addIconItem(texture: Texture2D, label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a new checkable item with text [param label].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addCheckItem(label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a new checkable item with text [param label] and icon [param texture].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addIconCheckItem(texture: Texture2D, label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a new radio check button with text [param label].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addRadioCheckItem(label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Same as [method add_icon_check_item], but uses a radio check button. */
        addIconRadioCheckItem(texture: Texture2D, label: string, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a new multistate item with text [param label].  
         *  Contrarily to normal binary items, multistate items can have more than two states, as defined by [param max_states]. The default value is defined by [param default_state].  
         *  An [param id] can optionally be provided, as well as an accelerator ([param accel]). If no [param id] is provided, one will be created from the index. If no [param accel] is provided, then the default value of 0 (corresponding to [constant @GlobalScope.KEY_NONE]) will be assigned to the item (which means it won't have any accelerator). See [method get_item_accelerator] for more info on accelerators.  
         *    
         *      
         *  **Note:** Multistate items don't update their state automatically and must be done manually. See [method toggle_item_multistate], [method set_item_multistate] and [method get_item_multistate] for more info on how to control it.  
         */
        addMultistateItem(label: string, maxStates: int64, defaultState?: int64 /* = 0 */, id?: int64 /* = -1 */, accel?: Key /* = 0 */): void
        
        /** Adds a [Shortcut].  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         *  If [param allow_echo] is `true`, the shortcut can be activated with echo events.  
         */
        addShortcut(shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */, allowEcho?: boolean /* = false */): void
        
        /** Adds a new item and assigns the specified [Shortcut] and icon [param texture] to it. Sets the label of the checkbox to the [Shortcut]'s name.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         *  If [param allow_echo] is `true`, the shortcut can be activated with echo events.  
         */
        addIconShortcut(texture: Texture2D, shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */, allowEcho?: boolean /* = false */): void
        
        /** Adds a new checkable item and assigns the specified [Shortcut] to it. Sets the label of the checkbox to the [Shortcut]'s name.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addCheckShortcut(shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */): void
        
        /** Adds a new checkable item and assigns the specified [Shortcut] and icon [param texture] to it. Sets the label of the checkbox to the [Shortcut]'s name.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addIconCheckShortcut(texture: Texture2D, shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */): void
        
        /** Adds a new radio check button and assigns a [Shortcut] to it. Sets the label of the checkbox to the [Shortcut]'s name.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually. See [method set_item_checked] for more info on how to control it.  
         */
        addRadioCheckShortcut(shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */): void
        
        /** Same as [method add_icon_check_shortcut], but uses a radio check button. */
        addIconRadioCheckShortcut(texture: Texture2D, shortcut: Shortcut, id?: int64 /* = -1 */, global?: boolean /* = false */): void
        
        /** Adds an item that will act as a submenu of the parent [PopupMenu] node when clicked. The [param submenu] argument must be the name of an existing [PopupMenu] that has been added as a child to this node. This submenu will be shown when the item is clicked, hovered for long enough, or activated using the `ui_select` or `ui_right` input actions.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         */
        addSubmenuItem(label: string, submenu: string, id?: int64 /* = -1 */): void
        
        /** Adds an item that will act as a submenu of the parent [PopupMenu] node when clicked. This submenu will be shown when the item is clicked, hovered for long enough, or activated using the `ui_select` or `ui_right` input actions.  
         *  [param submenu] must be either child of this [PopupMenu] or has no parent node (in which case it will be automatically added as a child). If the [param submenu] popup has another parent, this method will fail.  
         *  An [param id] can optionally be provided. If no [param id] is provided, one will be created from the index.  
         */
        addSubmenuNodeItem(label: string, submenu: PopupMenu, id?: int64 /* = -1 */): void
        
        /** Sets the text of the item at the given [param index]. */
        setItemText(index: int64, text: string): void
        
        /** Sets item's text base writing direction. */
        setItemTextDirection(index: int64, direction: Control.TextDirection): void
        
        /** Sets the language code of the text for the item at the given index to [param language]. This is used for line-breaking and text shaping algorithms. If [param language] is empty, the current locale is used. */
        setItemLanguage(index: int64, language: string): void
        
        /** Sets the auto translate mode of the item at the given [param index].  
         *  Items use [constant Node.AUTO_TRANSLATE_MODE_INHERIT] by default, which uses the same auto translate mode as the [PopupMenu] itself.  
         */
        setItemAutoTranslateMode(index: int64, mode: Node.AutoTranslateMode): void
        
        /** Replaces the [Texture2D] icon of the item at the given [param index]. */
        setItemIcon(index: int64, icon: Texture2D): void
        
        /** Sets the maximum allowed width of the icon for the item at the given [param index]. This limit is applied on top of the default size of the icon and on top of [theme_item icon_max_width]. The height is adjusted according to the icon's ratio. */
        setItemIconMaxWidth(index: int64, width: int64): void
        
        /** Sets a modulating [Color] of the item's icon at the given [param index]. */
        setItemIconModulate(index: int64, modulate: Color): void
        
        /** Sets the checkstate status of the item at the given [param index]. */
        setItemChecked(index: int64, checked: boolean): void
        
        /** Sets the indeterminate status of the item at the given [param index]. This only applies to checkable items and is represented visually by a horizontal line instead of a checkmark or radio button.  
         *      
         *  **Note:** Indeterminate items just display a horizontal line, but don't have any built-in behavior and must be set as indeterminate manually.  
         */
        setItemIndeterminate(index: int64, indeterminate: boolean): void
        
        /** Sets the [param id] of the item at the given [param index].  
         *  The [param id] is used in [signal id_pressed] and [signal id_focused] signals.  
         */
        setItemId(index: int64, id: int64): void
        
        /** Sets the accelerator of the item at the given [param index]. An accelerator is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. [param accel] is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]). */
        setItemAccelerator(index: int64, accel: Key): void
        
        /** Sets the metadata of an item, which may be of any type. You can later get it with [method get_item_metadata], which provides a simple way of assigning context data to items. */
        setItemMetadata(index: int64, metadata: any): void
        
        /** Enables/disables the item at the given [param index]. When it is disabled, it can't be selected and its action can't be invoked. */
        setItemDisabled(index: int64, disabled: boolean): void
        
        /** Sets the submenu of the item at the given [param index]. The submenu is the name of a child [PopupMenu] node that would be shown when the item is clicked. */
        setItemSubmenu(index: int64, submenu: string): void
        
        /** Sets the submenu of the item at the given [param index]. The submenu is a [PopupMenu] node that would be shown when the item is clicked. It must either be a child of this [PopupMenu] or has no parent (in which case it will be automatically added as a child). If the [param submenu] popup has another parent, this method will fail. */
        setItemSubmenuNode(index: int64, submenu: PopupMenu): void
        
        /** Mark the item at the given [param index] as a separator, which means that it would be displayed as a line. If `false`, sets the type of the item to plain text. */
        setItemAsSeparator(index: int64, enable: boolean): void
        
        /** Sets whether the item at the given [param index] has a checkbox. If `false`, sets the type of the item to plain text.  
         *      
         *  **Note:** Checkable items just display a checkmark, but don't have any built-in checking behavior and must be checked/unchecked manually.  
         */
        setItemAsCheckable(index: int64, enable: boolean): void
        
        /** Sets the type of the item at the given [param index] to radio button. If `false`, sets the type of the item to plain text. */
        setItemAsRadioCheckable(index: int64, enable: boolean): void
        
        /** Sets the [String] tooltip of the item at the given [param index]. */
        setItemTooltip(index: int64, tooltip: string): void
        
        /** Sets a [Shortcut] for the item at the given [param index]. */
        setItemShortcut(index: int64, shortcut: Shortcut, global?: boolean /* = false */): void
        
        /** Sets the horizontal offset of the item at the given [param index]. */
        setItemIndent(index: int64, indent: int64): void
        
        /** Sets the state of a multistate item. See [method add_multistate_item] for details. */
        setItemMultistate(index: int64, state: int64): void
        
        /** Sets the max states of a multistate item. See [method add_multistate_item] for details. */
        setItemMultistateMax(index: int64, maxStates: int64): void
        
        /** Disables the [Shortcut] of the item at the given [param index]. */
        setItemShortcutDisabled(index: int64, disabled: boolean): void
        
        /** Changes the index of the item at index [param index] to be at index [param target_index]. This can be used to move an item above other items. The moved item will keep the same ID, even if it was generated from the original index.  
         *      
         *  **Note:** The indices of any items between index [param index] and index [param target_index] will be shifted by one.  
         */
        setItemIndex(index: int64, targetIndex: int64): void
        
        /** Toggles the check state of the item at the given [param index]. */
        toggleItemChecked(index: int64): void
        
        /** Cycle to the next state of a multistate item. See [method add_multistate_item] for details. */
        toggleItemMultistate(index: int64): void
        
        /** Returns the text of the item at the given [param index]. */
        getItemText(index: int64): string
        
        /** Returns item's text base writing direction. */
        getItemTextDirection(index: int64): Control.TextDirection
        
        /** Returns item's text language code. */
        getItemLanguage(index: int64): string
        
        /** Returns the auto translate mode of the item at the given [param index]. */
        getItemAutoTranslateMode(index: int64): Node.AutoTranslateMode
        
        /** Returns the icon of the item at the given [param index]. */
        getItemIcon(index: int64): null | Texture2D
        
        /** Returns the maximum allowed width of the icon for the item at the given [param index]. */
        getItemIconMaxWidth(index: int64): int64
        
        /** Returns a [Color] modulating the item's icon at the given [param index]. */
        getItemIconModulate(index: int64): Color
        
        /** Returns `true` if the item at the given [param index] is checked. */
        isItemChecked(index: int64): boolean
        
        /** Returns `true` if the item at the given [param index] is in an indeterminate state. This only applies to checkable items and is represented visually by a horizontal line instead of a checkmark or radio button.  
         *  See [method set_item_indeterminate] for more info on how to set an item as indeterminate.  
         *      
         *  **Note:** Indeterminate items just display a horizontal line, but don't have any built-in behavior and must be set as indeterminate manually.  
         */
        isItemIndeterminate(index: int64): boolean
        
        /** Returns the ID of the item at the given [param index]. */
        getItemId(index: int64): int64
        
        /** Returns the index of the item containing the specified [param id]. The index is automatically assigned to each item by the engine when added and represents the order items will be displayed. */
        getItemIndex(id: int64): int64
        
        /** Returns the accelerator of the item at the given [param index]. An accelerator is a keyboard shortcut that can be pressed to trigger the menu button even if it's not currently open. The return value is an integer which is generally a combination of [enum KeyModifierMask]s and [enum Key]s using bitwise OR such as `KEY_MASK_CTRL | KEY_A` ([kbd]Ctrl + A[/kbd]). If no accelerator is defined for the specified [param index], [method get_item_accelerator] returns `0` (corresponding to [constant @GlobalScope.KEY_NONE]). */
        getItemAccelerator(index: int64): Key
        
        /** Returns the metadata of the specified item, which might be of any type. You can set it with [method set_item_metadata], which provides a simple way of assigning context data to items. */
        getItemMetadata(index: int64): any
        
        /** Returns `true` if the item at the given [param index] is disabled. When it is disabled it can't be selected, or its action invoked.  
         *  See [method set_item_disabled] for more info on how to disable an item.  
         */
        isItemDisabled(index: int64): boolean
        
        /** Returns the submenu name of the item at the given [param index]. See [method add_submenu_item] for more info on how to add a submenu. */
        getItemSubmenu(index: int64): string
        
        /** Returns the submenu of the item at the given [param index], or `null` if no submenu was added. See [method add_submenu_node_item] for more info on how to add a submenu. */
        getItemSubmenuNode(index: int64): null | PopupMenu
        
        /** Returns `true` if the item is a separator. If it is, it will be displayed as a line. See [method add_separator] for more info on how to add a separator. */
        isItemSeparator(index: int64): boolean
        
        /** Returns `true` if the item at the given [param index] is checkable in some way, i.e. if it has a checkbox or radio button.  
         *      
         *  **Note:** Checkable items just display a checkmark or radio button, but don't have any built-in checking behavior and must be checked/unchecked manually.  
         */
        isItemCheckable(index: int64): boolean
        
        /** Returns `true` if the item at the given [param index] has radio button-style checkability.  
         *      
         *  **Note:** This is purely cosmetic; you must add the logic for checking/unchecking items in radio groups.  
         */
        isItemRadioCheckable(index: int64): boolean
        
        /** Returns `true` if the specified item's shortcut is disabled. */
        isItemShortcutDisabled(index: int64): boolean
        
        /** Returns the tooltip associated with the item at the given [param index]. */
        getItemTooltip(index: int64): string
        
        /** Returns the [Shortcut] associated with the item at the given [param index]. */
        getItemShortcut(index: int64): null | Shortcut
        
        /** Returns the horizontal offset of the item at the given [param index]. */
        getItemIndent(index: int64): int64
        
        /** Returns the max states of the item at the given [param index]. */
        getItemMultistateMax(index: int64): int64
        
        /** Returns the state of the item at the given [param index]. */
        getItemMultistate(index: int64): int64
        
        /** Sets the currently focused item as the given [param index].  
         *  Passing `-1` as the index makes so that no item is focused.  
         */
        setFocusedItem(index: int64): void
        
        /** Returns the index of the currently focused item. Returns `-1` if no item is focused. */
        getFocusedItem(): int64
        
        /** Moves the scroll view to make the item at the given [param index] visible. */
        scrollToItem(index: int64): void
        
        /** Removes the item at the given [param index] from the menu.  
         *      
         *  **Note:** The indices of items after the removed item will be shifted by one.  
         */
        removeItem(index: int64): void
        
        /** Adds a separator between items. Separators also occupy an index, which you can set by using the [param id] parameter.  
         *  A [param label] can optionally be provided, which will appear at the center of the separator.  
         */
        addSeparator(label?: string /* = '' */, id?: int64 /* = -1 */): void
        
        /** Removes all items from the [PopupMenu]. If [param free_submenus] is `true`, the submenu nodes are automatically freed. */
        clear(freeSubmenus?: boolean /* = false */): void
        
        /** Returns `true` if the menu is bound to the special system menu. */
        isSystemMenu(): boolean
        
        /** If `true`, hides the [PopupMenu] when an item is selected. */
        get hideOnItemSelection(): boolean
        set hideOnItemSelection(value: boolean)
        
        /** If `true`, hides the [PopupMenu] when a checkbox or radio button is selected. */
        get hideOnCheckableItemSelection(): boolean
        set hideOnCheckableItemSelection(value: boolean)
        
        /** If `true`, hides the [PopupMenu] when a state item is selected. */
        get hideOnStateItemSelection(): boolean
        set hideOnStateItemSelection(value: boolean)
        
        /** Sets the delay time in seconds for the submenu item to popup on mouse hovering. If the popup menu is added as a child of another (acting as a submenu), it will inherit the delay time of the parent menu item.  
         *      
         *  **Note:** If the mouse is exiting a submenu item with an open submenu and enters a different submenu item, the submenu popup delay time is affected by the direction of the mouse movement toward the open submenu. If the mouse is moving toward the submenu, the open submenu will wait approximately `0.5` seconds before closing, which then allows the hovered submenu item to open. This additional delay allows the mouse time to move to the open submenu across other menu items without prematurely closing. If the mouse is not moving toward the open submenu, for example in a downward direction, the open submenu will close immediately.  
         */
        get submenuPopupDelay(): float64
        set submenuPopupDelay(value: float64)
        
        /** If `true`, allows navigating [PopupMenu] with letter keys. */
        get allowSearch(): boolean
        set allowSearch(value: boolean)
        
        /** If set to one of the values of [enum NativeMenu.SystemMenus], this [PopupMenu] is bound to the special system menu. Only one [PopupMenu] can be bound to each special menu at a time. */
        get systemMenuId(): int64
        set systemMenuId(value: int64)
        
        /** If `true`, [MenuBar] will use native menu when supported.  
         *      
         *  **Note:** If [PopupMenu] is linked to [StatusIndicator], [MenuBar], or another [PopupMenu] item it can use native menu regardless of this property, use [method is_native_menu] to check it.  
         */
        get preferNativeMenu(): boolean
        set preferNativeMenu(value: boolean)
        
        /** If `true`, shrinks [PopupMenu] to minimum height when it's shown. */
        get shrinkHeight(): boolean
        set shrinkHeight(value: boolean)
        
        /** If `true`, shrinks [PopupMenu] to minimum width when it's shown. */
        get shrinkWidth(): boolean
        set shrinkWidth(value: boolean)
        
        /** If `true`, shows a search bar at the top of the [PopupMenu] for filtering items. See [member search_bar_min_item_count] for dynamically controlling its visibility based on the number of items.  
         *      
         *  **Note:** When enabled, [member allow_search] is ignored.  
         */
        get searchBarEnabled(): boolean
        set searchBarEnabled(value: boolean)
        
        /** Sets the minimum number of items required for the search bar to be visible. [member search_bar_enabled] must be `true` for this to have any effect. Separator items are not counted. */
        get searchBarMinItemCount(): int64
        set searchBarMinItemCount(value: int64)
        
        /** If `true`, enables fuzzy searching in the [PopupMenu] search bar. This allows the search results to include items that almost match the search query, as well items that match the individual characters of the search query, but not in sequence.  
         *  Use [member search_bar_fuzzy_search_max_misses] to set the maximum number of mismatches allowed in the search results.  
         */
        get searchBarFuzzySearchEnabled(): boolean
        set searchBarFuzzySearchEnabled(value: boolean)
        
        /** Sets the maximum number of mismatches allowed in each search result when fuzzy searching is enabled for the [PopupMenu] search bar. Any item with more mismatches will be hidden from the search results. */
        get searchBarFuzzySearchMaxMisses(): int64
        set searchBarFuzzySearchMaxMisses(value: int64)
        
        /** The number of items currently in the list. */
        get itemCount(): int64
        set itemCount(value: int64)
        
        /** Emitted when an item of some [param id] is pressed. Also emitted when its accelerator is activated on macOS.  
         *      
         *  **Note:** If [param id] is negative (either explicitly or due to overflow), this will return the corresponding index instead.  
         */
        readonly idPressed: Signal<(id: int64) => void>
        
        /** Emitted when the user navigated to an item of some [param id] using the [member ProjectSettings.input/ui_up] or [member ProjectSettings.input/ui_down] input action. */
        readonly idFocused: Signal<(id: int64) => void>
        
        /** Emitted when an item of some [param index] is pressed. Also emitted when its accelerator is activated on macOS. */
        readonly indexPressed: Signal<(index: int64) => void>
        
        /** Emitted when any item is added, modified or removed. */
        readonly menuChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPopupMenu;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPopupMenu;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPopupPanel extends __RPCMapPopup {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPopupPanel extends __NameMapPopup {
    }
    /** A popup with a panel background.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_popuppanel.html  
     */
    class PopupPanel<Map extends NodePathMap = any> extends Popup<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPopupPanel;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPopupPanel;
    }
    namespace PortableCompressedTexture2D {
        enum CompressionMode {
            CompressionModeLossless = 0,
            CompressionModeLossy = 1,
            CompressionModeBasisUniversal = 2,
            CompressionModeS3Tc = 3,
            CompressionModeEtc2 = 4,
            CompressionModeBptc = 5,
            CompressionModeAstc = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPortableCompressedTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPortableCompressedTexture2D extends __NameMapTexture2D {
        create_from_image: "createFromImage";
        get_compression_mode: "getCompressionMode";
        set_basisu_compressor_params: "setBasisuCompressorParams";
        set_keep_all_compressed_buffers: "setKeepAllCompressedBuffers";
        is_keeping_all_compressed_buffers: "isKeepingAllCompressedBuffers";
        size_override: "sizeOverride";
        keep_compressed_buffer: "keepCompressedBuffer";
    }
    /** Provides a compressed texture for disk and/or VRAM in a way that is portable.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_portablecompressedtexture2d.html  
     */
    class PortableCompressedTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** Initializes the compressed texture from a base image. The compression mode must be provided.  
         *  [param normal_map] is recommended to ensure optimum quality if this image will be used as a normal map.  
         *  If lossy compression is requested, the quality setting can optionally be provided. This maps to Lossy WebP compression quality.  
         */
        createFromImage(image: Image, compressionMode: PortableCompressedTexture2D.CompressionMode, normalMap?: boolean /* = false */, lossyQuality?: float64 /* = 0.8 */): void
        
        /** Return the compression mode used (valid after initialized). */
        getCompressionMode(): PortableCompressedTexture2D.CompressionMode
        
        /** Sets the compressor parameters for Basis Universal compression. See also the settings in [ResourceImporterTexture].  
         *      
         *  **Note:** This method must be called before [method create_from_image] for this to work.  
         */
        setBasisuCompressorParams(uastcLevel: int64, rdoQualityLoss: float64): void
        
        /** If [param keep] is `true`, overrides the flag globally for all textures of this type. This is used primarily by the editor. */
        static setKeepAllCompressedBuffers(keep: boolean): void
        
        /** Returns `true` if the flag is overridden for all textures of this type. */
        static isKeepingAllCompressedBuffers(): boolean
        get _data(): PackedByteArray
        set _data(value: PackedByteArray | byte[] | ArrayBuffer)
        
        /** Allows overriding the texture's size (for 2D only). */
        get sizeOverride(): Vector2
        set sizeOverride(value: Vector2)
        
        /** If `true`, when running in the editor, this texture will keep the source-compressed data in memory, allowing the data to persist after loading. Otherwise, the source-compressed data is lost after loading and the texture can't be re-saved.  
         *      
         *  **Note:** This property must be set before [method create_from_image] for this to work.  
         */
        get keepCompressedBuffer(): boolean
        set keepCompressedBuffer(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPortableCompressedTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPortableCompressedTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPrimitiveMesh extends __RPCMapMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPrimitiveMesh extends __NameMapMesh {
        _create_mesh_array: "_createMeshArray";
        get_mesh_arrays: "getMeshArrays";
        request_update: "requestUpdate";
        custom_aabb: "customAabb";
        flip_faces: "flipFaces";
        add_uv2: "addUV2";
        uv2_padding: "uV2Padding";
    }
    /** Base class for all primitive meshes. Handles applying a [Material] to a primitive mesh.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_primitivemesh.html  
     */
    class PrimitiveMesh extends Mesh {
        constructor(identifier?: any)
        /** Override this method to customize how this primitive mesh should be generated. Should return an [Array] where each element is another Array of values required for the mesh (see the [enum Mesh.ArrayType] constants). */
        /* gdvirtual */ _createMeshArray(): GArray
        
        /** Returns the mesh arrays used to make up the surface of this primitive mesh.  
         *  **Example:** Pass the result to [method ArrayMesh.add_surface_from_arrays] to create a new surface:  
         *    
         */
        getMeshArrays(): GArray
        
        /** Request an update of this primitive mesh based on its properties. */
        requestUpdate(): void
        
        /** The current [Material] of the primitive mesh. */
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        
        /** Overrides the [AABB] with one defined by user for use with frustum culling. Especially useful to avoid unexpected culling when using a shader to offset vertices. */
        get customAabb(): Aabb
        set customAabb(value: Aabb)
        
        /** If `true`, the order of the vertices in each triangle is reversed, resulting in the backside of the mesh being drawn.  
         *  This gives the same result as using [constant BaseMaterial3D.CULL_FRONT] in [member BaseMaterial3D.cull_mode].  
         */
        get flipFaces(): boolean
        set flipFaces(value: boolean)
        
        /** If set, generates UV2 UV coordinates applying a padding using the [member uv2_padding] setting. UV2 is needed for lightmapping. */
        get addUV2(): boolean
        set addUV2(value: boolean)
        
        /** If [member add_uv2] is set, specifies the padding in pixels applied along seams of the mesh. Lower padding values allow making better use of the lightmap texture (resulting in higher texel density), but may introduce visible lightmap bleeding along edges.  
         *  If the size of the lightmap texture can't be determined when generating the mesh, UV2 is calculated assuming a texture size of 1024×1024.  
         */
        get uV2Padding(): float64
        set uV2Padding(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPrimitiveMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPrimitiveMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPrismMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPrismMesh extends __NameMapPrimitiveMesh {
        left_to_right: "leftToRight";
        subdivide_width: "subdivideWidth";
        subdivide_height: "subdivideHeight";
        subdivide_depth: "subdivideDepth";
    }
    /** Class representing a prism-shaped [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_prismmesh.html  
     */
    class PrismMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Displacement of the upper edge along the X axis. 0.0 positions edge straight above the bottom-left edge. */
        get leftToRight(): float64
        set leftToRight(value: float64)
        
        /** Size of the prism. */
        get size(): Vector3
        set size(value: Vector3)
        
        /** Number of added edge loops along the X axis. */
        get subdivideWidth(): int64
        set subdivideWidth(value: int64)
        
        /** Number of added edge loops along the Y axis. */
        get subdivideHeight(): int64
        set subdivideHeight(value: int64)
        
        /** Number of added edge loops along the Z axis. */
        get subdivideDepth(): int64
        set subdivideDepth(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPrismMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPrismMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapProceduralSkyMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapProceduralSkyMaterial extends __NameMapMaterial {
        sky_top_color: "skyTopColor";
        sky_horizon_color: "skyHorizonColor";
        sky_curve: "skyCurve";
        sky_energy_multiplier: "skyEnergyMultiplier";
        sky_cover: "skyCover";
        sky_cover_modulate: "skyCoverModulate";
        ground_bottom_color: "groundBottomColor";
        ground_horizon_color: "groundHorizonColor";
        ground_curve: "groundCurve";
        ground_energy_multiplier: "groundEnergyMultiplier";
        sun_angle_max: "sunAngleMax";
        sun_curve: "sunCurve";
        use_debanding: "useDebanding";
        energy_multiplier: "energyMultiplier";
    }
    /** A material that defines a simple sky for a [Sky] resource.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_proceduralskymaterial.html  
     */
    class ProceduralSkyMaterial extends Material {
        constructor(identifier?: any)
        /** Color of the sky at the top. Blends with [member sky_horizon_color]. */
        get skyTopColor(): Color
        set skyTopColor(value: Color)
        
        /** Color of the sky at the horizon. Blends with [member sky_top_color]. */
        get skyHorizonColor(): Color
        set skyHorizonColor(value: Color)
        
        /** How quickly the [member sky_horizon_color] fades into the [member sky_top_color]. */
        get skyCurve(): float64
        set skyCurve(value: float64)
        
        /** Multiplier for sky color. A higher value will make the sky brighter. */
        get skyEnergyMultiplier(): float64
        set skyEnergyMultiplier(value: float64)
        
        /** The sky cover texture to use. This texture must use an equirectangular projection (similar to [PanoramaSkyMaterial]). The texture's colors will be  *added*  to the existing sky color, and will be multiplied by [member sky_energy_multiplier] and [member sky_cover_modulate]. This is mainly suited to displaying stars at night, but it can also be used to display clouds at day or night (with a non-physically-accurate look). */
        get skyCover(): null | Texture2D
        set skyCover(value: null | Texture2D)
        
        /** The tint to apply to the [member sky_cover] texture. This can be used to change the sky cover's colors or opacity independently of the sky energy, which is useful for day/night or weather transitions. Only effective if a texture is defined in [member sky_cover]. */
        get skyCoverModulate(): Color
        set skyCoverModulate(value: Color)
        
        /** Color of the ground at the bottom. Blends with [member ground_horizon_color]. */
        get groundBottomColor(): Color
        set groundBottomColor(value: Color)
        
        /** Color of the ground at the horizon. Blends with [member ground_bottom_color]. */
        get groundHorizonColor(): Color
        set groundHorizonColor(value: Color)
        
        /** How quickly the [member ground_horizon_color] fades into the [member ground_bottom_color]. */
        get groundCurve(): float64
        set groundCurve(value: float64)
        
        /** Multiplier for ground color. A higher value will make the ground brighter. */
        get groundEnergyMultiplier(): float64
        set groundEnergyMultiplier(value: float64)
        
        /** Distance from center of sun where it fades out completely. */
        get sunAngleMax(): float64
        set sunAngleMax(value: float64)
        
        /** How quickly the sun fades away between the edge of the sun disk and [member sun_angle_max]. */
        get sunCurve(): float64
        set sunCurve(value: float64)
        
        /** If `true`, enables debanding. Debanding adds a small amount of noise which helps reduce banding that appears from the smooth changes in color in the sky. */
        get useDebanding(): boolean
        set useDebanding(value: boolean)
        
        /** The sky's overall brightness multiplier. Higher values result in a brighter sky. */
        get energyMultiplier(): float64
        set energyMultiplier(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapProceduralSkyMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapProceduralSkyMaterial;
    }
    namespace ProgressBar {
        enum FillMode {
            FillBeginToEnd = 0,
            FillEndToBegin = 1,
            FillTopToBottom = 2,
            FillBottomToTop = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapProgressBar extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapProgressBar extends __NameMapRange {
        fill_mode: "fillMode";
        show_percentage: "showPercentage";
        editor_preview_indeterminate: "editorPreviewIndeterminate";
    }
    /** A control used for visual representation of a percentage.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_progressbar.html  
     */
    class ProgressBar<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** The fill direction. See [enum FillMode] for possible values. */
        get fillMode(): int64
        set fillMode(value: int64)
        
        /** If `true`, the fill percentage is displayed on the bar. */
        get showPercentage(): boolean
        set showPercentage(value: boolean)
        
        /** When set to `true`, the progress bar indicates that something is happening with an animation, but does not show the fill percentage or value. */
        get indeterminate(): boolean
        set indeterminate(value: boolean)
        
        /** If `false`, the [member indeterminate] animation will be paused in the editor. */
        get editorPreviewIndeterminate(): boolean
        set editorPreviewIndeterminate(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapProgressBar;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapProgressBar;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPropertyTweener extends __RPCMapTweener {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPropertyTweener extends __NameMapTweener {
        from_current: "fromCurrent";
        as_relative: "asRelative";
        set_trans: "setTrans";
        set_ease: "setEase";
        set_custom_interpolator: "setCustomInterpolator";
        set_delay: "setDelay";
    }
    /** Interpolates an [Object]'s property over time.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_propertytweener.html  
     */
    class PropertyTweener extends Tweener {
        constructor(identifier?: any)
        /** Sets a custom initial value to the [PropertyTweener].  
         *  **Example:** Move the node from position `(100, 100)` to `(200, 100)`.  
         *    
         */
        from(value: any): null | PropertyTweener
        
        /** Makes the [PropertyTweener] use the current property value (i.e. at the time of creating this [PropertyTweener]) as a starting point. This is equivalent of using [method from] with the current value. These two calls will do the same:  
         *    
         */
        fromCurrent(): null | PropertyTweener
        
        /** When called, the final value will be used as a relative value instead.  
         *  **Example:** Move the node by `100` pixels to the right.  
         *    
         */
        asRelative(): null | PropertyTweener
        
        /** Sets the type of used transition from [enum Tween.TransitionType]. If not set, the default transition is used from the [Tween] that contains this Tweener. */
        setTrans(trans: Tween.TransitionType): null | PropertyTweener
        
        /** Sets the type of used easing from [enum Tween.EaseType]. If not set, the default easing is used from the [Tween] that contains this Tweener. */
        setEase(ease: Tween.EaseType): null | PropertyTweener
        
        /** Allows interpolating the value with a custom easing function. The provided [param interpolator_method] will be called with a value ranging from `0.0` to `1.0` and is expected to return a value within the same range (values outside the range can be used for overshoot). The return value of the method is then used for interpolation between initial and final value. Note that the parameter passed to the method is still subject to the tweener's own easing.  
         *    
         */
        setCustomInterpolator(interpolatorMethod: Callable): null | PropertyTweener
        
        /** Sets the time in seconds after which the [PropertyTweener] will start interpolating. By default there's no delay. */
        setDelay(delay: float64): null | PropertyTweener
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPropertyTweener;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPropertyTweener;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapQuadMesh extends __RPCMapPlaneMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapQuadMesh extends __NameMapPlaneMesh {
    }
    /** Class representing a square mesh facing the camera.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_quadmesh.html  
     */
    class QuadMesh extends PlaneMesh {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapQuadMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapQuadMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapQuadOccluder3D extends __RPCMapOccluder3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapQuadOccluder3D extends __NameMapOccluder3D {
    }
    /** Flat plane shape for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_quadoccluder3d.html  
     */
    class QuadOccluder3D extends Occluder3D {
        constructor(identifier?: any)
        /** The quad's size in 3D units. */
        get size(): Vector2
        set size(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapQuadOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapQuadOccluder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDAccelerationStructureGeometry extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDAccelerationStructureGeometry extends __NameMapRefCounted {
        vertex_buffer: "vertexBuffer";
        vertex_offset: "vertexOffset";
        vertex_stride: "vertexStride";
        vertex_count: "vertexCount";
        vertex_format: "vertexFormat";
        index_buffer: "indexBuffer";
        index_offset: "indexOffset";
        index_count: "indexCount";
    }
    /** Acceleration structure geometry (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdaccelerationstructuregeometry.html  
     */
    class RDAccelerationStructureGeometry extends RefCounted {
        constructor(identifier?: any)
        /** Flags for the geometry. */
        get flags(): int64
        set flags(value: int64)
        
        /** Buffer containing vertices. */
        get vertexBuffer(): Rid
        set vertexBuffer(value: Rid)
        
        /** Byte offset of the first vertex in [member vertex_buffer]. */
        get vertexOffset(): int64
        set vertexOffset(value: int64)
        
        /** Number of bytes between each vertex in [member vertex_buffer]. */
        get vertexStride(): int64
        set vertexStride(value: int64)
        
        /** Number of vertices used by this geometry in [member vertex_buffer]. */
        get vertexCount(): int64
        set vertexCount(value: int64)
        
        /** Format of the vertices in [member vertex_buffer]. */
        get vertexFormat(): int64
        set vertexFormat(value: int64)
        
        /** Buffer containing vertex indices. If `null`, triangles are non-indexed. */
        get indexBuffer(): Rid
        set indexBuffer(value: Rid)
        
        /** Byte offset of the first index in [member index_buffer]. */
        get indexOffset(): int64
        set indexOffset(value: int64)
        
        /** Number of indices used by this geometry in [member index_buffer]. */
        get indexCount(): int64
        set indexCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDAccelerationStructureGeometry;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDAccelerationStructureGeometry;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDAccelerationStructureInstance extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDAccelerationStructureInstance extends __NameMapRefCounted {
        hit_sbt_range: "hitSbtRange";
    }
    /** Acceleration structure instance (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdaccelerationstructureinstance.html  
     */
    class RDAccelerationStructureInstance extends RefCounted {
        constructor(identifier?: any)
        /** Transform applied to the referenced BLAS for this instance. */
        get transform(): Transform3D
        set transform(value: Transform3D)
        
        /** Custom instance ID that can be accessed in GLSL using `gl_InstanceCustomIndexEXT`. */
        get id(): int64
        set id(value: int64)
        
        /** Visibility mask used to control which rays can intersect this instance. */
        get mask(): int64
        set mask(value: int64)
        
        /** Hit shader binding table range used for this instance, allocated using the [method RenderingDevice.hit_sbt_range_alloc] method. */
        get hitSbtRange(): int64
        set hitSbtRange(value: int64)
        
        /** Flags for the instance. */
        get flags(): int64
        set flags(value: int64)
        
        /** The BLAS referenced by this instance. If `null`, the instance is treated as a placeholder but still contributes to `gl_InstanceIndex` in GLSL. */
        get blas(): Rid
        set blas(value: Rid)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDAccelerationStructureInstance;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDAccelerationStructureInstance;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDAttachmentFormat extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDAttachmentFormat extends __NameMapRefCounted {
        usage_flags: "usageFlags";
    }
    /** Attachment format (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdattachmentformat.html  
     */
    class RDAttachmentFormat extends RefCounted {
        constructor(identifier?: any)
        /** The attachment's data format. */
        get format(): int64
        set format(value: int64)
        
        /** The number of samples used when sampling the attachment. */
        get samples(): int64
        set samples(value: int64)
        
        /** The attachment's usage flags, which determine what can be done with it. */
        get usageFlags(): int64
        set usageFlags(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDAttachmentFormat;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDAttachmentFormat;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDFramebufferPass extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDFramebufferPass extends __NameMapRefCounted {
        color_attachments: "colorAttachments";
        input_attachments: "inputAttachments";
        resolve_attachments: "resolveAttachments";
        preserve_attachments: "preserveAttachments";
        depth_attachment: "depthAttachment";
    }
    /** Framebuffer pass attachment description (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdframebufferpass.html  
     */
    class RDFramebufferPass extends RefCounted {
        /** Attachment is unused. */
        static readonly ATTACHMENT_UNUSED = -1
        constructor(identifier?: any)
        
        /** Color attachments in order starting from 0. If this attachment is not used by the shader, pass ATTACHMENT_UNUSED to skip. */
        get colorAttachments(): PackedInt32Array
        set colorAttachments(value: PackedInt32Array | int32[])
        
        /** Used for multipass framebuffers (more than one render pass). Converts an attachment to an input. Make sure to also supply it properly in the [RDUniform] for the uniform set. */
        get inputAttachments(): PackedInt32Array
        set inputAttachments(value: PackedInt32Array | int32[])
        
        /** If the color attachments are multisampled, non-multisampled resolve attachments can be provided. */
        get resolveAttachments(): PackedInt32Array
        set resolveAttachments(value: PackedInt32Array | int32[])
        
        /** Attachments to preserve in this pass (otherwise they are erased). */
        get preserveAttachments(): PackedInt32Array
        set preserveAttachments(value: PackedInt32Array | int32[])
        
        /** Depth attachment. ATTACHMENT_UNUSED should be used if no depth buffer is required for this pass. */
        get depthAttachment(): int64
        set depthAttachment(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDFramebufferPass;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDFramebufferPass;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDHitGroup extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDHitGroup extends __NameMapRefCounted {
        closest_hit_shader: "closestHitShader";
        any_hit_shader: "anyHitShader";
        intersection_shader: "intersectionShader";
    }
    /** Hit group (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdhitgroup.html  
     */
    class RDHitGroup extends RefCounted {
        constructor(identifier?: any)
        /** Closest-hit shader for this hit group. Executed for the closest intersection. Can be `null`. */
        get closestHitShader(): null | GObject
        set closestHitShader(value: null | GObject)
        
        /** Any-hit shader for this hit group. Executed for each potential intersection. Can be `null`. */
        get anyHitShader(): null | GObject
        set anyHitShader(value: null | GObject)
        
        /** Intersection shader for this hit group. Required for non-triangle geometry. Must be `null` when using for triangle geometry. */
        get intersectionShader(): null | GObject
        set intersectionShader(value: null | GObject)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDHitGroup;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDHitGroup;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineColorBlendState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineColorBlendState extends __NameMapRefCounted {
        enable_logic_op: "enableLogicOp";
        logic_op: "logicOp";
        blend_constant: "blendConstant";
    }
    /** Pipeline color blend state (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinecolorblendstate.html  
     */
    class RDPipelineColorBlendState extends RefCounted {
        constructor(identifier?: any)
        /** If `true`, performs the logic operation defined in [member logic_op]. */
        get enableLogicOp(): boolean
        set enableLogicOp(value: boolean)
        
        /** The logic operation to perform for blending. Only effective if [member enable_logic_op] is `true`. */
        get logicOp(): int64
        set logicOp(value: int64)
        
        /** The constant color to blend with. See also [method RenderingDevice.draw_list_set_blend_constants]. */
        get blendConstant(): Color
        set blendConstant(value: Color)
        
        /** The attachments that are blended together. */
        get attachments(): GArray<RDPipelineColorBlendStateAttachment>
        set attachments(value: GArray<RDPipelineColorBlendStateAttachment>)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineColorBlendState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineColorBlendState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineColorBlendStateAttachment extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineColorBlendStateAttachment extends __NameMapRefCounted {
        set_as_mix: "setAsMix";
        enable_blend: "enableBlend";
        src_color_blend_factor: "srcColorBlendFactor";
        dst_color_blend_factor: "dstColorBlendFactor";
        color_blend_op: "colorBlendOp";
        src_alpha_blend_factor: "srcAlphaBlendFactor";
        dst_alpha_blend_factor: "dstAlphaBlendFactor";
        alpha_blend_op: "alphaBlendOp";
        write_r: "writeR";
        write_g: "writeG";
        write_b: "writeB";
        write_a: "writeA";
    }
    /** Pipeline color blend state attachment (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinecolorblendstateattachment.html  
     */
    class RDPipelineColorBlendStateAttachment extends RefCounted {
        constructor(identifier?: any)
        /** Convenience method to perform standard mix blending with straight (non-premultiplied) alpha. This sets [member enable_blend] to `true`, [member src_color_blend_factor] to [constant RenderingDevice.BLEND_FACTOR_SRC_ALPHA], [member dst_color_blend_factor] to [constant RenderingDevice.BLEND_FACTOR_ONE_MINUS_SRC_ALPHA], [member src_alpha_blend_factor] to [constant RenderingDevice.BLEND_FACTOR_SRC_ALPHA] and [member dst_alpha_blend_factor] to [constant RenderingDevice.BLEND_FACTOR_ONE_MINUS_SRC_ALPHA]. */
        setAsMix(): void
        
        /** If `true`, performs blending between the source and destination according to the factors defined in [member src_color_blend_factor], [member dst_color_blend_factor], [member src_alpha_blend_factor] and [member dst_alpha_blend_factor]. The blend modes [member color_blend_op] and [member alpha_blend_op] are also taken into account, with [member write_r], [member write_g], [member write_b] and [member write_a] controlling the output. */
        get enableBlend(): boolean
        set enableBlend(value: boolean)
        
        /** Controls how the blend factor for the color channels is determined based on the source's fragments. */
        get srcColorBlendFactor(): int64
        set srcColorBlendFactor(value: int64)
        
        /** Controls how the blend factor for the color channels is determined based on the destination's fragments. */
        get dstColorBlendFactor(): int64
        set dstColorBlendFactor(value: int64)
        
        /** The blend mode to use for the red/green/blue color channels. */
        get colorBlendOp(): int64
        set colorBlendOp(value: int64)
        
        /** Controls how the blend factor for the alpha channel is determined based on the source's fragments. */
        get srcAlphaBlendFactor(): int64
        set srcAlphaBlendFactor(value: int64)
        
        /** Controls how the blend factor for the alpha channel is determined based on the destination's fragments. */
        get dstAlphaBlendFactor(): int64
        set dstAlphaBlendFactor(value: int64)
        
        /** The blend mode to use for the alpha channel. */
        get alphaBlendOp(): int64
        set alphaBlendOp(value: int64)
        
        /** If `true`, writes the new red color channel to the final result. */
        get writeR(): boolean
        set writeR(value: boolean)
        
        /** If `true`, writes the new green color channel to the final result. */
        get writeG(): boolean
        set writeG(value: boolean)
        
        /** If `true`, writes the new blue color channel to the final result. */
        get writeB(): boolean
        set writeB(value: boolean)
        
        /** If `true`, writes the new alpha channel to the final result. */
        get writeA(): boolean
        set writeA(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineColorBlendStateAttachment;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineColorBlendStateAttachment;
    }
}
