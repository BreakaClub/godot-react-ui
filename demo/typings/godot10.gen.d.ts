declare module "godot" {
    // AUTO-GENERATED
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorld2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorld2D extends __NameMapResource {
        navigation_map: "navigationMap";
        direct_space_state: "directSpaceState";
    }
    /** A resource that holds all components of a 2D world, such as a canvas and a physics space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_world2d.html  
     */
    class World2D extends Resource {
        constructor(identifier?: any)
        /** The [RID] of this world's canvas resource. Used by the [RenderingServer] for 2D drawing. */
        get canvas(): Rid
        
        /** The [RID] of this world's navigation map. Used by the [NavigationServer2D]. */
        get navigationMap(): Rid
        
        /** The [RID] of this world's physics space resource. Used by the [PhysicsServer2D] for 2D physics, treating it as both a space and an area. */
        get space(): Rid
        
        /** Direct access to the world's physics 2D space state. Used for querying current and potential collisions. When using multi-threaded physics, access is limited to [method Node._physics_process] in the main thread. */
        get directSpaceState(): null | PhysicsDirectSpaceState2D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorld2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorld2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorld3D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorld3D extends __NameMapResource {
        fallback_environment: "fallbackEnvironment";
        camera_attributes: "cameraAttributes";
        navigation_map: "navigationMap";
        direct_space_state: "directSpaceState";
    }
    /** A resource that holds all components of a 3D world, such as a visual scenario and a physics space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_world3d.html  
     */
    class World3D extends Resource {
        constructor(identifier?: any)
        /** The World3D's [Environment]. */
        get environment(): null | Environment
        set environment(value: null | Environment)
        
        /** The World3D's fallback environment will be used if [member environment] fails or is missing. */
        get fallbackEnvironment(): null | Environment
        set fallbackEnvironment(value: null | Environment)
        
        /** The default [CameraAttributes] resource to use if none set on the [Camera3D]. */
        get cameraAttributes(): null | CameraAttributesPractical | CameraAttributesPhysical
        set cameraAttributes(value: null | CameraAttributesPractical | CameraAttributesPhysical)
        
        /** The World3D's physics space. */
        get space(): Rid
        
        /** The [RID] of this world's navigation map. Used by the [NavigationServer3D]. */
        get navigationMap(): Rid
        
        /** The World3D's visual scenario. */
        get scenario(): Rid
        
        /** Direct access to the world's physics 3D space state. Used for querying current and potential collisions. When using multi-threaded physics, access is limited to [method Node._physics_process] in the main thread. */
        get directSpaceState(): null | PhysicsDirectSpaceState3D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorld3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorld3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorldBoundaryShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorldBoundaryShape2D extends __NameMapShape2D {
    }
    /** A 2D world boundary (half-plane) shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_worldboundaryshape2d.html  
     */
    class WorldBoundaryShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The line's normal, typically a unit vector. Its direction indicates the non-colliding half-plane. Can be of any length but zero. Defaults to [constant Vector2.UP]. */
        get normal(): Vector2
        set normal(value: Vector2)
        
        /** The distance from the origin to the line, expressed in terms of [member normal] (according to its direction and magnitude). Actual absolute distance from the origin to the line can be calculated as `abs(distance) / normal.length()`.  
         *  In the scalar equation of the line `ax + by = d`, this is `d`, while the `(a, b)` coordinates are represented by the [member normal] property.  
         */
        get distance(): float64
        set distance(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorldBoundaryShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorldBoundaryShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorldBoundaryShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorldBoundaryShape3D extends __NameMapShape3D {
    }
    /** A 3D world boundary (half-space) shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_worldboundaryshape3d.html  
     */
    class WorldBoundaryShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The [Plane] used by the [WorldBoundaryShape3D] for collision. */
        get plane(): Plane
        set plane(value: Plane)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorldBoundaryShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorldBoundaryShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapWorldEnvironment extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapWorldEnvironment extends __NameMapNode {
        camera_attributes: "cameraAttributes";
    }
    /** Default environment properties for the entire scene (post-processing effects, lighting and background settings).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_worldenvironment.html  
     */
    class WorldEnvironment<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** The [Environment] resource used by this [WorldEnvironment], defining the default properties. */
        get environment(): null | Environment
        set environment(value: null | Environment)
        
        /** The default [CameraAttributes] resource to use if none set on the [Camera3D]. */
        get cameraAttributes(): null | CameraAttributesPractical | CameraAttributesPhysical
        set cameraAttributes(value: null | CameraAttributesPractical | CameraAttributesPhysical)
        
        /** The default [Compositor] resource to use if none set on the [Camera3D]. */
        get compositor(): null | Compositor
        set compositor(value: null | Compositor)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapWorldEnvironment;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapWorldEnvironment;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapX509Certificate extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapX509Certificate extends __NameMapResource {
        save_to_string: "saveToString";
        load_from_string: "loadFromString";
    }
    /** An X509 certificate (e.g. for TLS).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_x509certificate.html  
     */
    class X509Certificate extends Resource {
        constructor(identifier?: any)
        /** Saves a certificate to the given [param path] (should be a "*.crt" file). */
        save(path: string): GError
        
        /** Loads a certificate from [param path] ("*.crt" file). */
        load(path: string): GError
        
        /** Returns a string representation of the certificate, or an empty string if the certificate is invalid. */
        saveToString(): string
        
        /** Loads a certificate from the given [param string]. */
        loadFromString(string_: string): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapX509Certificate;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapX509Certificate;
    }
    namespace XmlParser {
        enum NodeType {
            NodeNone = 0,
            NodeElement = 1,
            NodeElementEnd = 2,
            NodeText = 3,
            NodeComment = 4,
            NodeCdata = 5,
            NodeUnknown = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXmlParser extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXmlParser extends __NameMapRefCounted {
        get_node_type: "getNodeType";
        get_node_name: "getNodeName";
        get_node_data: "getNodeData";
        get_node_offset: "getNodeOffset";
        get_attribute_count: "getAttributeCount";
        get_attribute_name: "getAttributeName";
        get_attribute_value: "getAttributeValue";
        has_attribute: "hasAttribute";
        get_named_attribute_value: "getNamedAttributeValue";
        get_named_attribute_value_safe: "getNamedAttributeValueSafe";
        is_empty: "isEmpty";
        get_current_line: "getCurrentLine";
        skip_section: "skipSection";
        open_buffer: "openBuffer";
    }
    class XmlParser extends RefCounted {
        constructor(identifier?: any)
        read(): GError
        getNodeType(): XmlParser.NodeType
        getNodeName(): string
        getNodeData(): string
        getNodeOffset(): int64
        getAttributeCount(): int64
        getAttributeName(idx: int64): string
        getAttributeValue(idx: int64): string
        hasAttribute(name: string): boolean
        getNamedAttributeValue(name: string): string
        getNamedAttributeValueSafe(name: string): string
        isEmpty(): boolean
        getCurrentLine(): int64
        skipSection(): void
        seek(position: int64): GError
        open(file: string): GError
        openBuffer(buffer: PackedByteArray | byte[] | ArrayBuffer): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXmlParser;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXmlParser;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRAnchor3D extends __RPCMapXRNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRAnchor3D extends __NameMapXRNode3D {
        get_size: "getSize";
        get_plane: "getPlane";
    }
    /** An anchor point in AR space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xranchor3d.html  
     */
    class XRAnchor3D<Map extends NodePathMap = any> extends XRNode3D<Map> {
        constructor(identifier?: any)
        /** Returns the estimated size of the plane that was detected. Say when the anchor relates to a table in the real world, this is the estimated size of the surface of that table. */
        getSize(): Vector3
        
        /** Returns a plane aligned with our anchor; handy for intersection testing. */
        getPlane(): Plane
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRAnchor3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRAnchor3D;
    }
    namespace XRBodyModifier3D {
        enum BodyUpdate {
            BodyUpdateUpperBody = 1,
            BodyUpdateLowerBody = 2,
            BodyUpdateHands = 4,
        }
        enum BoneUpdate {
            BoneUpdateFull = 0,
            BoneUpdateRotationOnly = 1,
            BoneUpdateMax = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRBodyModifier3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRBodyModifier3D extends __NameMapSkeletonModifier3D {
        body_tracker: "bodyTracker";
        body_update: "bodyUpdate";
        bone_update: "boneUpdate";
    }
    /** A node for driving body meshes from [XRBodyTracker] data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrbodymodifier3d.html  
     */
    class XRBodyModifier3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** The name of the [XRBodyTracker] registered with [XRServer] to obtain the body tracking data from. */
        get bodyTracker(): string
        set bodyTracker(value: string)
        
        /** Specifies the body parts to update. */
        get bodyUpdate(): int64
        set bodyUpdate(value: int64)
        
        /** Specifies the type of updates to perform on the bones. */
        get boneUpdate(): int64
        set boneUpdate(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRBodyModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRBodyModifier3D;
    }
    namespace XRBodyTracker {
        enum BodyFlags {
            BodyFlagUpperBodySupported = 1,
            BodyFlagLowerBodySupported = 2,
            BodyFlagHandsSupported = 4,
        }
        enum Joint {
            JointRoot = 0,
            JointHips = 1,
            JointSpine = 2,
            JointChest = 3,
            JointUpperChest = 4,
            JointNeck = 5,
            JointHead = 6,
            JointHeadTip = 7,
            JointLeftShoulder = 8,
            JointLeftUpperArm = 9,
            JointLeftLowerArm = 10,
            JointRightShoulder = 11,
            JointRightUpperArm = 12,
            JointRightLowerArm = 13,
            JointLeftUpperLeg = 14,
            JointLeftLowerLeg = 15,
            JointLeftFoot = 16,
            JointLeftToes = 17,
            JointRightUpperLeg = 18,
            JointRightLowerLeg = 19,
            JointRightFoot = 20,
            JointRightToes = 21,
            JointLeftHand = 22,
            JointLeftPalm = 23,
            JointLeftWrist = 24,
            JointLeftThumbMetacarpal = 25,
            JointLeftThumbPhalanxProximal = 26,
            JointLeftThumbPhalanxDistal = 27,
            JointLeftThumbTip = 28,
            JointLeftIndexFingerMetacarpal = 29,
            JointLeftIndexFingerPhalanxProximal = 30,
            JointLeftIndexFingerPhalanxIntermediate = 31,
            JointLeftIndexFingerPhalanxDistal = 32,
            JointLeftIndexFingerTip = 33,
            JointLeftMiddleFingerMetacarpal = 34,
            JointLeftMiddleFingerPhalanxProximal = 35,
            JointLeftMiddleFingerPhalanxIntermediate = 36,
            JointLeftMiddleFingerPhalanxDistal = 37,
            JointLeftMiddleFingerTip = 38,
            JointLeftRingFingerMetacarpal = 39,
            JointLeftRingFingerPhalanxProximal = 40,
            JointLeftRingFingerPhalanxIntermediate = 41,
            JointLeftRingFingerPhalanxDistal = 42,
            JointLeftRingFingerTip = 43,
            JointLeftPinkyFingerMetacarpal = 44,
            JointLeftPinkyFingerPhalanxProximal = 45,
            JointLeftPinkyFingerPhalanxIntermediate = 46,
            JointLeftPinkyFingerPhalanxDistal = 47,
            JointLeftPinkyFingerTip = 48,
            JointRightHand = 49,
            JointRightPalm = 50,
            JointRightWrist = 51,
            JointRightThumbMetacarpal = 52,
            JointRightThumbPhalanxProximal = 53,
            JointRightThumbPhalanxDistal = 54,
            JointRightThumbTip = 55,
            JointRightIndexFingerMetacarpal = 56,
            JointRightIndexFingerPhalanxProximal = 57,
            JointRightIndexFingerPhalanxIntermediate = 58,
            JointRightIndexFingerPhalanxDistal = 59,
            JointRightIndexFingerTip = 60,
            JointRightMiddleFingerMetacarpal = 61,
            JointRightMiddleFingerPhalanxProximal = 62,
            JointRightMiddleFingerPhalanxIntermediate = 63,
            JointRightMiddleFingerPhalanxDistal = 64,
            JointRightMiddleFingerTip = 65,
            JointRightRingFingerMetacarpal = 66,
            JointRightRingFingerPhalanxProximal = 67,
            JointRightRingFingerPhalanxIntermediate = 68,
            JointRightRingFingerPhalanxDistal = 69,
            JointRightRingFingerTip = 70,
            JointRightPinkyFingerMetacarpal = 71,
            JointRightPinkyFingerPhalanxProximal = 72,
            JointRightPinkyFingerPhalanxIntermediate = 73,
            JointRightPinkyFingerPhalanxDistal = 74,
            JointRightPinkyFingerTip = 75,
            JointLowerChest = 76,
            JointLeftScapula = 77,
            JointLeftWristTwist = 78,
            JointRightScapula = 79,
            JointRightWristTwist = 80,
            JointLeftFootTwist = 81,
            JointLeftHeel = 82,
            JointLeftMiddleFoot = 83,
            JointRightFootTwist = 84,
            JointRightHeel = 85,
            JointRightMiddleFoot = 86,
            JointMax = 87,
        }
        enum JointFlags {
            JointFlagOrientationValid = 1,
            JointFlagOrientationTracked = 2,
            JointFlagPositionValid = 4,
            JointFlagPositionTracked = 8,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRBodyTracker extends __RPCMapXRPositionalTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRBodyTracker extends __NameMapXRPositionalTracker {
        set_joint_flags: "setJointFlags";
        get_joint_flags: "getJointFlags";
        set_joint_transform: "setJointTransform";
        get_joint_transform: "getJointTransform";
        has_tracking_data: "hasTrackingData";
        body_flags: "bodyFlags";
    }
    /** A tracked body in XR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrbodytracker.html  
     */
    class XRBodyTracker extends XRPositionalTracker {
        constructor(identifier?: any)
        /** Sets flags about the validity of the tracking data for the given body joint. */
        setJointFlags(joint: XRBodyTracker.Joint, flags: XRBodyTracker.JointFlags): void
        
        /** Returns flags about the validity of the tracking data for the given body joint. */
        getJointFlags(joint: XRBodyTracker.Joint): XRBodyTracker.JointFlags
        
        /** Sets the transform for the given body joint. */
        setJointTransform(joint: XRBodyTracker.Joint, transform: Transform3D): void
        
        /** Returns the transform for the given body joint. */
        getJointTransform(joint: XRBodyTracker.Joint): Transform3D
        
        /** If `true`, the body tracking data is valid. */
        get hasTrackingData(): boolean
        set hasTrackingData(value: boolean)
        
        /** The type of body tracking data captured. */
        get bodyFlags(): int64
        set bodyFlags(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRBodyTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRBodyTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRCamera3D extends __RPCMapCamera3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRCamera3D extends __NameMapCamera3D {
    }
    /** A camera node which automatically positions itself based on XR tracking data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrcamera3d.html  
     */
    class XRCamera3D<Map extends NodePathMap = any> extends Camera3D<Map> {
        constructor(identifier?: any)
        /** The name of the camera tracker we're bound to. Which trackers are available is not known during design time.  
         *  The default tracker refers to the HMD position of the main player. Consult the documentation of the [XRInterface] for any additional trackers. There may be additional tracked headsets for multiplayer systems or a tracker may be available for a physical camera in a mixed reality scenario.  
         */
        get tracker(): string
        set tracker(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRCamera3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRCamera3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRController3D extends __RPCMapXRNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRController3D extends __NameMapXRNode3D {
        is_button_pressed: "isButtonPressed";
        get_input: "getInput";
        get_float: "getFloat";
        get_vector2: "getVector2";
        get_tracker_hand: "getTrackerHand";
        button_pressed: "buttonPressed";
        button_released: "buttonReleased";
        input_float_changed: "inputFloatChanged";
        input_vector2_changed: "inputVector2Changed";
        profile_changed: "profileChanged";
    }
    /** A 3D node representing a spatially-tracked controller.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrcontroller3d.html  
     */
    class XRController3D<Map extends NodePathMap = any> extends XRNode3D<Map> {
        constructor(identifier?: any)
        /** Returns `true` if the button with the given [param name] is pressed.  
         *      
         *  **Note:** The current [XRInterface] defines the [param name] for each input. In the case of OpenXR, these are the names of actions in the current action set.  
         */
        isButtonPressed(name: StringName): boolean
        
        /** Returns a [Variant] for the input with the given [param name]. This works for any input type, the variant will be typed according to the actions configuration.  
         *      
         *  **Note:** The current [XRInterface] defines the [param name] for each input. In the case of OpenXR, these are the names of actions in the current action set.  
         */
        getInput(name: StringName): any
        
        /** Returns a numeric value for the input with the given [param name]. This is used for triggers and grip sensors.  
         *      
         *  **Note:** The current [XRInterface] defines the [param name] for each input. In the case of OpenXR, these are the names of actions in the current action set.  
         */
        getFloat(name: StringName): float64
        
        /** Returns a [Vector2] for the input with the given [param name]. This is used for thumbsticks and thumbpads found on many controllers.  
         *      
         *  **Note:** The current [XRInterface] defines the [param name] for each input. In the case of OpenXR, these are the names of actions in the current action set.  
         */
        getVector2(name: StringName): Vector2
        
        /** Returns the hand holding this controller, if known. */
        getTrackerHand(): XRPositionalTracker.TrackerHand
        
        /** Emitted when a button on this controller is pressed. */
        readonly buttonPressed: Signal<(actionName: string) => void>
        
        /** Emitted when a button on this controller is released. */
        readonly buttonReleased: Signal<(actionName: string) => void>
        
        /** Emitted when a trigger or similar input on this controller changes value. */
        readonly inputFloatChanged: Signal<(actionName: string, value: float64) => void>
        
        /** Emitted when a thumbstick or thumbpad on this controller is moved. */
        readonly inputVector2Changed: Signal<(actionName: string, value: Vector2) => void>
        
        /** Emitted when the interaction profile on this controller is changed. */
        readonly profileChanged: Signal<(role: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRController3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRController3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRControllerTracker extends __RPCMapXRPositionalTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRControllerTracker extends __NameMapXRPositionalTracker {
    }
    /** A tracked controller.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrcontrollertracker.html  
     */
    class XRControllerTracker extends XRPositionalTracker {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRControllerTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRControllerTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRFaceModifier3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRFaceModifier3D extends __NameMapNode3D {
        face_tracker: "faceTracker";
    }
    /** A node for driving standard face meshes from [XRFaceTracker] weights.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrfacemodifier3d.html  
     */
    class XRFaceModifier3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** The [XRFaceTracker] path. */
        get faceTracker(): string
        set faceTracker(value: string)
        
        /** The [NodePath] of the face [MeshInstance3D]. */
        get target(): NodePath
        set target(value: NodePath | string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRFaceModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRFaceModifier3D;
    }
    namespace XRFaceTracker {
        enum BlendShapeEntry {
            FtEyeLookOutRight = 0,
            FtEyeLookInRight = 1,
            FtEyeLookUpRight = 2,
            FtEyeLookDownRight = 3,
            FtEyeLookOutLeft = 4,
            FtEyeLookInLeft = 5,
            FtEyeLookUpLeft = 6,
            FtEyeLookDownLeft = 7,
            FtEyeClosedRight = 8,
            FtEyeClosedLeft = 9,
            FtEyeSquintRight = 10,
            FtEyeSquintLeft = 11,
            FtEyeWideRight = 12,
            FtEyeWideLeft = 13,
            FtEyeDilationRight = 14,
            FtEyeDilationLeft = 15,
            FtEyeConstrictRight = 16,
            FtEyeConstrictLeft = 17,
            FtBrowPinchRight = 18,
            FtBrowPinchLeft = 19,
            FtBrowLowererRight = 20,
            FtBrowLowererLeft = 21,
            FtBrowInnerUpRight = 22,
            FtBrowInnerUpLeft = 23,
            FtBrowOuterUpRight = 24,
            FtBrowOuterUpLeft = 25,
            FtNoseSneerRight = 26,
            FtNoseSneerLeft = 27,
            FtNasalDilationRight = 28,
            FtNasalDilationLeft = 29,
            FtNasalConstrictRight = 30,
            FtNasalConstrictLeft = 31,
            FtCheekSquintRight = 32,
            FtCheekSquintLeft = 33,
            FtCheekPuffRight = 34,
            FtCheekPuffLeft = 35,
            FtCheekSuckRight = 36,
            FtCheekSuckLeft = 37,
            FtJawOpen = 38,
            FtMouthClosed = 39,
            FtJawRight = 40,
            FtJawLeft = 41,
            FtJawForward = 42,
            FtJawBackward = 43,
            FtJawClench = 44,
            FtJawMandibleRaise = 45,
            FtLipSuckUpperRight = 46,
            FtLipSuckUpperLeft = 47,
            FtLipSuckLowerRight = 48,
            FtLipSuckLowerLeft = 49,
            FtLipSuckCornerRight = 50,
            FtLipSuckCornerLeft = 51,
            FtLipFunnelUpperRight = 52,
            FtLipFunnelUpperLeft = 53,
            FtLipFunnelLowerRight = 54,
            FtLipFunnelLowerLeft = 55,
            FtLipPuckerUpperRight = 56,
            FtLipPuckerUpperLeft = 57,
            FtLipPuckerLowerRight = 58,
            FtLipPuckerLowerLeft = 59,
            FtMouthUpperUpRight = 60,
            FtMouthUpperUpLeft = 61,
            FtMouthLowerDownRight = 62,
            FtMouthLowerDownLeft = 63,
            FtMouthUpperDeepenRight = 64,
            FtMouthUpperDeepenLeft = 65,
            FtMouthUpperRight = 66,
            FtMouthUpperLeft = 67,
            FtMouthLowerRight = 68,
            FtMouthLowerLeft = 69,
            FtMouthCornerPullRight = 70,
            FtMouthCornerPullLeft = 71,
            FtMouthCornerSlantRight = 72,
            FtMouthCornerSlantLeft = 73,
            FtMouthFrownRight = 74,
            FtMouthFrownLeft = 75,
            FtMouthStretchRight = 76,
            FtMouthStretchLeft = 77,
            FtMouthDimpleRight = 78,
            FtMouthDimpleLeft = 79,
            FtMouthRaiserUpper = 80,
            FtMouthRaiserLower = 81,
            FtMouthPressRight = 82,
            FtMouthPressLeft = 83,
            FtMouthTightenerRight = 84,
            FtMouthTightenerLeft = 85,
            FtTongueOut = 86,
            FtTongueUp = 87,
            FtTongueDown = 88,
            FtTongueRight = 89,
            FtTongueLeft = 90,
            FtTongueRoll = 91,
            FtTongueBlendDown = 92,
            FtTongueCurlUp = 93,
            FtTongueSquish = 94,
            FtTongueFlat = 95,
            FtTongueTwistRight = 96,
            FtTongueTwistLeft = 97,
            FtSoftPalateClose = 98,
            FtThroatSwallow = 99,
            FtNeckFlexRight = 100,
            FtNeckFlexLeft = 101,
            FtEyeClosed = 102,
            FtEyeWide = 103,
            FtEyeSquint = 104,
            FtEyeDilation = 105,
            FtEyeConstrict = 106,
            FtBrowDownRight = 107,
            FtBrowDownLeft = 108,
            FtBrowDown = 109,
            FtBrowUpRight = 110,
            FtBrowUpLeft = 111,
            FtBrowUp = 112,
            FtNoseSneer = 113,
            FtNasalDilation = 114,
            FtNasalConstrict = 115,
            FtCheekPuff = 116,
            FtCheekSuck = 117,
            FtCheekSquint = 118,
            FtLipSuckUpper = 119,
            FtLipSuckLower = 120,
            FtLipSuck = 121,
            FtLipFunnelUpper = 122,
            FtLipFunnelLower = 123,
            FtLipFunnel = 124,
            FtLipPuckerUpper = 125,
            FtLipPuckerLower = 126,
            FtLipPucker = 127,
            FtMouthUpperUp = 128,
            FtMouthLowerDown = 129,
            FtMouthOpen = 130,
            FtMouthRight = 131,
            FtMouthLeft = 132,
            FtMouthSmileRight = 133,
            FtMouthSmileLeft = 134,
            FtMouthSmile = 135,
            FtMouthSadRight = 136,
            FtMouthSadLeft = 137,
            FtMouthSad = 138,
            FtMouthStretch = 139,
            FtMouthDimple = 140,
            FtMouthTightener = 141,
            FtMouthPress = 142,
            FtMax = 143,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRFaceTracker extends __RPCMapXRTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRFaceTracker extends __NameMapXRTracker {
        get_blend_shape: "getBlendShape";
        set_blend_shape: "setBlendShape";
        blend_shapes: "blendShapes";
    }
    /** A tracked face.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrfacetracker.html  
     */
    class XRFaceTracker extends XRTracker {
        constructor(identifier?: any)
        /** Returns the requested face blend shape weight. */
        getBlendShape(blendShape: XRFaceTracker.BlendShapeEntry): float64
        
        /** Sets a face blend shape weight. */
        setBlendShape(blendShape: XRFaceTracker.BlendShapeEntry, weight: float64): void
        
        /** The array of face blend shape weights with indices corresponding to the [enum BlendShapeEntry] enum. */
        get blendShapes(): PackedFloat32Array
        set blendShapes(value: PackedFloat32Array | float32[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRFaceTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRFaceTracker;
    }
    namespace XRHandModifier3D {
        enum BoneUpdate {
            BoneUpdateFull = 0,
            BoneUpdateRotationOnly = 1,
            BoneUpdateMax = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRHandModifier3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRHandModifier3D extends __NameMapSkeletonModifier3D {
        hand_tracker: "handTracker";
        bone_update: "boneUpdate";
    }
    /** A node for driving hand meshes from [XRHandTracker] data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrhandmodifier3d.html  
     */
    class XRHandModifier3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** The name of the [XRHandTracker] registered with [XRServer] to obtain the hand tracking data from. */
        get handTracker(): string
        set handTracker(value: string)
        
        /** Specifies the type of updates to perform on the bones. */
        get boneUpdate(): int64
        set boneUpdate(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRHandModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRHandModifier3D;
    }
    namespace XRHandTracker {
        enum HandTrackingSource {
            HandTrackingSourceUnknown = 0,
            HandTrackingSourceUnobstructed = 1,
            HandTrackingSourceController = 2,
            HandTrackingSourceNotTracked = 3,
            HandTrackingSourceMax = 4,
        }
        enum HandJoint {
            HandJointPalm = 0,
            HandJointWrist = 1,
            HandJointThumbMetacarpal = 2,
            HandJointThumbPhalanxProximal = 3,
            HandJointThumbPhalanxDistal = 4,
            HandJointThumbTip = 5,
            HandJointIndexFingerMetacarpal = 6,
            HandJointIndexFingerPhalanxProximal = 7,
            HandJointIndexFingerPhalanxIntermediate = 8,
            HandJointIndexFingerPhalanxDistal = 9,
            HandJointIndexFingerTip = 10,
            HandJointMiddleFingerMetacarpal = 11,
            HandJointMiddleFingerPhalanxProximal = 12,
            HandJointMiddleFingerPhalanxIntermediate = 13,
            HandJointMiddleFingerPhalanxDistal = 14,
            HandJointMiddleFingerTip = 15,
            HandJointRingFingerMetacarpal = 16,
            HandJointRingFingerPhalanxProximal = 17,
            HandJointRingFingerPhalanxIntermediate = 18,
            HandJointRingFingerPhalanxDistal = 19,
            HandJointRingFingerTip = 20,
            HandJointPinkyFingerMetacarpal = 21,
            HandJointPinkyFingerPhalanxProximal = 22,
            HandJointPinkyFingerPhalanxIntermediate = 23,
            HandJointPinkyFingerPhalanxDistal = 24,
            HandJointPinkyFingerTip = 25,
            HandJointMax = 26,
        }
        enum HandJointFlags {
            HandJointFlagOrientationValid = 1,
            HandJointFlagOrientationTracked = 2,
            HandJointFlagPositionValid = 4,
            HandJointFlagPositionTracked = 8,
            HandJointFlagLinearVelocityValid = 16,
            HandJointFlagAngularVelocityValid = 32,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRHandTracker extends __RPCMapXRPositionalTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRHandTracker extends __NameMapXRPositionalTracker {
        set_hand_joint_flags: "setHandJointFlags";
        get_hand_joint_flags: "getHandJointFlags";
        set_hand_joint_transform: "setHandJointTransform";
        get_hand_joint_transform: "getHandJointTransform";
        set_hand_joint_radius: "setHandJointRadius";
        get_hand_joint_radius: "getHandJointRadius";
        set_hand_joint_linear_velocity: "setHandJointLinearVelocity";
        get_hand_joint_linear_velocity: "getHandJointLinearVelocity";
        set_hand_joint_angular_velocity: "setHandJointAngularVelocity";
        get_hand_joint_angular_velocity: "getHandJointAngularVelocity";
        has_tracking_data: "hasTrackingData";
        hand_tracking_source: "handTrackingSource";
    }
    /** A tracked hand in XR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrhandtracker.html  
     */
    class XRHandTracker extends XRPositionalTracker {
        constructor(identifier?: any)
        /** Sets flags about the validity of the tracking data for the given hand joint. */
        setHandJointFlags(joint: XRHandTracker.HandJoint, flags: XRHandTracker.HandJointFlags): void
        
        /** Returns flags about the validity of the tracking data for the given hand joint. */
        getHandJointFlags(joint: XRHandTracker.HandJoint): XRHandTracker.HandJointFlags
        
        /** Sets the transform for the given hand joint. */
        setHandJointTransform(joint: XRHandTracker.HandJoint, transform: Transform3D): void
        
        /** Returns the transform for the given hand joint. */
        getHandJointTransform(joint: XRHandTracker.HandJoint): Transform3D
        
        /** Sets the radius of the given hand joint. */
        setHandJointRadius(joint: XRHandTracker.HandJoint, radius: float64): void
        
        /** Returns the radius of the given hand joint. */
        getHandJointRadius(joint: XRHandTracker.HandJoint): float64
        
        /** Sets the linear velocity for the given hand joint. */
        setHandJointLinearVelocity(joint: XRHandTracker.HandJoint, linearVelocity: Vector3): void
        
        /** Returns the linear velocity for the given hand joint. */
        getHandJointLinearVelocity(joint: XRHandTracker.HandJoint): Vector3
        
        /** Sets the angular velocity for the given hand joint. */
        setHandJointAngularVelocity(joint: XRHandTracker.HandJoint, angularVelocity: Vector3): void
        
        /** Returns the angular velocity for the given hand joint. */
        getHandJointAngularVelocity(joint: XRHandTracker.HandJoint): Vector3
        
        /** If `true`, the hand tracking data is valid. */
        get hasTrackingData(): boolean
        set hasTrackingData(value: boolean)
        
        /** The source of the hand tracking data. */
        get handTrackingSource(): int64
        set handTrackingSource(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRHandTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRHandTracker;
    }
    namespace XRInterface {
        enum Capabilities {
            XRNone = 0,
            XRMono = 1,
            XRStereo = 2,
            XRQuad = 4,
            XRVr = 8,
            XRAr = 16,
            XRExternal = 32,
        }
        enum TrackingStatus {
            XRNormalTracking = 0,
            XRExcessiveMotion = 1,
            XRInsufficientFeatures = 2,
            XRUnknownTracking = 3,
            XRNotTracking = 4,
        }
        enum PlayAreaMode {
            XRPlayAreaUnknown = 0,
            XRPlayArea3Dof = 1,
            XRPlayAreaSitting = 2,
            XRPlayAreaRoomscale = 3,
            XRPlayAreaStage = 4,
            XRPlayAreaCustom = 2147483647,
        }
        enum EnvironmentBlendMode {
            XREnvBlendModeOpaque = 0,
            XREnvBlendModeAdditive = 1,
            XREnvBlendModeAlphaBlend = 2,
        }
        enum VrsTextureFormat {
            XRVrsTextureFormatUnified = 0,
            XRVrsTextureFormatFragmentShadingRate = 1,
            XRVrsTextureFormatFragmentDensityMap = 2,
            XRVrsTextureFormatRasterizationRateMap = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRInterface extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRInterface extends __NameMapRefCounted {
        get_name: "getName";
        get_capabilities: "getCapabilities";
        is_initialized: "isInitialized";
        get_system_info: "getSystemInfo";
        get_tracking_status: "getTrackingStatus";
        get_render_target_size: "getRenderTargetSize";
        get_view_count: "getViewCount";
        trigger_haptic_pulse: "triggerHapticPulse";
        supports_play_area_mode: "supportsPlayAreaMode";
        get_play_area: "getPlayArea";
        get_camera_feed_id: "getCameraFeedId";
        is_passthrough_supported: "isPassthroughSupported";
        is_passthrough_enabled: "isPassthroughEnabled";
        start_passthrough: "startPassthrough";
        stop_passthrough: "stopPassthrough";
        get_camera_projections: "getCameraProjections";
        get_camera_offsets: "getCameraOffsets";
        get_transform_for_view: "getTransformForView";
        get_projection_for_view: "getProjectionForView";
        get_supported_environment_blend_modes: "getSupportedEnvironmentBlendModes";
        interface_is_primary: "interfaceIsPrimary";
        xr_play_area_mode: "xRPlayAreaMode";
        environment_blend_mode: "environmentBlendMode";
        ar_is_anchor_detection_enabled: "arIsAnchorDetectionEnabled";
        play_area_changed: "playAreaChanged";
    }
    /** Base class for an XR interface implementation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrinterface.html  
     */
    class XRInterface extends RefCounted {
        constructor(identifier?: any)
        /** Returns the name of this interface (`"OpenXR"`, `"OpenVR"`, `"OpenHMD"`, `"ARKit"`, etc.). */
        getName(): StringName
        
        /** Returns a combination of [enum Capabilities] flags providing information about the capabilities of this interface. */
        getCapabilities(): int64
        
        /** Returns `true` if this interface has been initialized. */
        isInitialized(): boolean
        
        /** Call this to initialize this interface. The first interface that is initialized is identified as the primary interface and it will be used for rendering output.  
         *  After initializing the interface you want to use you then need to enable the AR/VR mode of a viewport and rendering should commence.  
         *      
         *  **Note:** You must enable the XR mode on the main viewport for any device that uses the main output of Godot, such as for mobile VR.  
         *  If you do this for a platform that handles its own output (such as OpenVR) Godot will show just one eye without distortion on screen. Alternatively, you can add a separate viewport node to your scene and enable AR/VR on that viewport. It will be used to output to the HMD, leaving you free to do anything you like in the main window, such as using a separate camera as a spectator camera or rendering something completely different.  
         *  While currently not used, you can activate additional interfaces. You may wish to do this if you want to track controllers from other platforms. However, at this point in time only one interface can render to an HMD.  
         */
        initialize(): boolean
        
        /** Turns the interface off. */
        uninitialize(): void
        
        /** Returns a [Dictionary] with extra system info. Interfaces are expected to return `XRRuntimeName` and `XRRuntimeVersion` providing info about the used XR runtime. Additional entries may be provided specific to an interface.  
         *      
         *  **Note:**This information may only be available after [method initialize] was successfully called.  
         */
        getSystemInfo(): GDictionary
        
        /** If supported, returns the status of our tracking. This will allow you to provide feedback to the user whether there are issues with positional tracking. */
        getTrackingStatus(): XRInterface.TrackingStatus
        
        /** Returns the resolution at which we should render our intermediate results before things like lens distortion are applied by the VR platform. */
        getRenderTargetSize(): Vector2
        
        /** Returns the number of views that need to be rendered for this device. 1 for Monoscopic, 2 for Stereoscopic. */
        getViewCount(): int64
        
        /** Triggers a haptic pulse on a device associated with this interface.  
         *  [param action_name] is the name of the action for this pulse.  
         *  [param tracker_name] is optional and can be used to direct the pulse to a specific device provided that device is bound to this haptic.  
         *  [param frequency] is the frequency of the pulse, set to `0.0` to have the system use a default frequency.  
         *  [param amplitude] is the amplitude of the pulse between `0.0` and `1.0`.  
         *  [param duration_sec] is the duration of the pulse in seconds.  
         *  [param delay_sec] is a delay in seconds before the pulse is given.  
         */
        triggerHapticPulse(actionName: string, trackerName: StringName, frequency: float64, amplitude: float64, durationSec: float64, delaySec: float64): void
        
        /** Call this to find out if a given play area mode is supported by this interface. */
        supportsPlayAreaMode(mode: XRInterface.PlayAreaMode): boolean
        
        /** Returns an array of vectors that represent the physical play area mapped to the virtual space around the [XROrigin3D] point. The points form a convex polygon that can be used to react to or visualize the play area. This returns an empty array if this feature is not supported or if the information is not yet available. */
        getPlayArea(): PackedVector3Array
        
        /** If this is an AR interface that requires displaying a camera feed as the background, this method returns the feed ID in the [CameraServer] for this interface. */
        getCameraFeedId(): int64
        
        /** Returns `true` if this interface supports passthrough. */
        isPassthroughSupported(): boolean
        
        /** Returns `true` if passthrough is enabled. */
        isPassthroughEnabled(): boolean
        
        /** Starts passthrough, will return `false` if passthrough couldn't be started.  
         *      
         *  **Note:** The viewport used for XR must have a transparent background, otherwise passthrough may not properly render.  
         */
        startPassthrough(): boolean
        
        /** Stops passthrough. */
        stopPassthrough(): void
        
        /** Gets an array of projection matrices for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera. Returns an empty array if this interface is not responsible for this tracker. */
        getCameraProjections(trackerName: StringName, aspect: float64, near: float64, far: float64): GArray<Projection>
        
        /** Gets an array of offset transforms for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera. Returns an empty array if this interface is not responsible for this tracker. */
        getCameraOffsets(trackerName: StringName): GArray<Transform3D>
        
        /** Returns the transform for a view/eye.  
         *  [param view] is the view/eye index.  
         *  [param cam_transform] is the transform that maps device coordinates to scene coordinates, typically the [member Node3D.global_transform] of the current XROrigin3D.  
         */
        getTransformForView(view: int64, camTransform: Transform3D): Transform3D
        
        /** Returns the projection matrix for a view/eye. */
        getProjectionForView(view: int64, aspect: float64, near: float64, far: float64): Projection
        
        /** Returns the an array of supported environment blend modes, see [enum XRInterface.EnvironmentBlendMode]. */
        getSupportedEnvironmentBlendModes(): GArray
        
        /** `true` if this is the primary interface. */
        get interfaceIsPrimary(): boolean
        set interfaceIsPrimary(value: boolean)
        
        /** The play area mode for this interface. */
        get xRPlayAreaMode(): int64
        set xRPlayAreaMode(value: int64)
        
        /** Specify how XR should blend in the environment. This is specific to certain AR and passthrough devices where camera images are blended in by the XR compositor. */
        get environmentBlendMode(): int64
        set environmentBlendMode(value: int64)
        
        /** On an AR interface, `true` if anchor detection is enabled. */
        get arIsAnchorDetectionEnabled(): boolean
        set arIsAnchorDetectionEnabled(value: boolean)
        
        /** Emitted when the play area is changed. This can be a result of the player resetting the boundary or entering a new play area, the player changing the play area mode, the world scale changing or the player resetting their headset orientation. */
        readonly playAreaChanged: Signal<(mode: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRInterface;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRInterface;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRInterfaceExtension extends __RPCMapXRInterface {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRInterfaceExtension extends __NameMapXRInterface {
        _get_name: "_getName";
        _get_capabilities: "_getCapabilities";
        _is_initialized: "_isInitialized";
        _get_system_info: "_getSystemInfo";
        _supports_play_area_mode: "_supportsPlayAreaMode";
        _get_play_area_mode: "_getPlayAreaMode";
        _set_play_area_mode: "_setPlayAreaMode";
        _get_play_area: "_getPlayArea";
        _get_render_target_size: "_getRenderTargetSize";
        _get_view_count: "_getViewCount";
        _get_camera_transform: "_getCameraTransform";
        _get_camera_projections: "_getCameraProjections";
        _get_camera_offsets: "_getCameraOffsets";
        _get_transform_for_view: "_getTransformForView";
        _get_projection_for_view: "_getProjectionForView";
        _get_vrs_texture: "_getVrsTexture";
        _get_vrs_texture_format: "_getVrsTextureFormat";
        _pre_render: "_preRender";
        _pre_draw_viewport: "_preDrawViewport";
        _post_draw_viewport: "_postDrawViewport";
        _end_frame: "_endFrame";
        _get_suggested_tracker_names: "_getSuggestedTrackerNames";
        _get_suggested_pose_names: "_getSuggestedPoseNames";
        _get_tracking_status: "_getTrackingStatus";
        _trigger_haptic_pulse: "_triggerHapticPulse";
        _get_anchor_detection_is_enabled: "_getAnchorDetectionIsEnabled";
        _set_anchor_detection_is_enabled: "_setAnchorDetectionIsEnabled";
        _get_camera_feed_id: "_getCameraFeedId";
        _get_color_texture: "_getColorTexture";
        _get_depth_texture: "_getDepthTexture";
        _get_velocity_texture: "_getVelocityTexture";
        get_color_texture: "getColorTexture";
        get_depth_texture: "getDepthTexture";
        get_velocity_texture: "getVelocityTexture";
        add_blit: "addBlit";
        get_render_target_texture: "getRenderTargetTexture";
    }
    /** Base class for XR interface extensions (plugins).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrinterfaceextension.html  
     */
    class XRInterfaceExtension extends XRInterface {
        constructor(identifier?: any)
        /** Returns the name of this interface. */
        /* gdvirtual */ _getName(): StringName
        
        /** Returns the capabilities of this interface. */
        /* gdvirtual */ _getCapabilities(): int64
        
        /** Returns `true` if this interface has been initialized. */
        /* gdvirtual */ _isInitialized(): boolean
        
        /** Initializes the interface, returns `true` on success. */
        /* gdvirtual */ _initialize(): boolean
        
        /** Uninitialize the interface. */
        /* gdvirtual */ _uninitialize(): void
        
        /** Returns a [Dictionary] with system information related to this interface. */
        /* gdvirtual */ _getSystemInfo(): GDictionary
        
        /** Returns `true` if this interface supports this play area mode. */
        /* gdvirtual */ _supportsPlayAreaMode(mode: XRInterface.PlayAreaMode): boolean
        
        /** Returns the play area mode that sets up our play area. */
        /* gdvirtual */ _getPlayAreaMode(): XRInterface.PlayAreaMode
        
        /** Set the play area mode for this interface. */
        /* gdvirtual */ _setPlayAreaMode(mode: XRInterface.PlayAreaMode): boolean
        
        /** Returns a [PackedVector3Array] that represents the play areas boundaries (if applicable). */
        /* gdvirtual */ _getPlayArea(): PackedVector3Array
        
        /** Returns the size of our render target for this interface, this overrides the size of the [Viewport] marked as the xr viewport. */
        /* gdvirtual */ _getRenderTargetSize(): Vector2
        
        /** Returns the number of views this interface requires, 1 for mono, 2 for stereoscopic. */
        /* gdvirtual */ _getViewCount(): int64
        
        /** Returns the [Transform3D] that positions the [XRCamera3D] in the world. */
        /* gdvirtual */ _getCameraTransform(): Transform3D
        
        /** Gets an array of projection matrices for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera. Returns an empty array if this interface is not responsible for this tracker. */
        /* gdvirtual */ _getCameraProjections(trackerName: StringName, aspect: float64, zNear: float64, zFar: float64): GArray<Projection>
        
        /** Gets an array of offset transforms for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera. Returns an empty array if this interface is not responsible for this tracker. */
        /* gdvirtual */ _getCameraOffsets(trackerName: StringName): GArray<Transform3D>
        
        /** Returns a [Transform3D] for a given view. */
        /* gdvirtual */ _getTransformForView(view: int64, camTransform: Transform3D): Transform3D
        
        /** Returns the projection matrix for the given view as a [PackedFloat64Array]. */
        /* gdvirtual */ _getProjectionForView(view: int64, aspect: float64, zNear: float64, zFar: float64): PackedFloat64Array
        /* gdvirtual */ _getVrsTexture(): Rid
        
        /** Returns the format of the texture returned by [method _get_vrs_texture]. */
        /* gdvirtual */ _getVrsTextureFormat(): XRInterface.VrsTextureFormat
        
        /** Called if this [XRInterfaceExtension] is active before our physics and game process is called. Most XR interfaces will update its [XRPositionalTracker]s at this point in time. */
        /* gdvirtual */ _process(): void
        
        /** Called if this [XRInterfaceExtension] is active before rendering starts. Most XR interfaces will sync tracking at this point in time. */
        /* gdvirtual */ _preRender(): void
        
        /** Called if this is our primary [XRInterfaceExtension] before we start processing a [Viewport] for every active XR [Viewport], returns `true` if that viewport should be rendered. An XR interface may return `false` if the user has taken off their headset and we can pause rendering. */
        /* gdvirtual */ _preDrawViewport(renderTarget: Rid): boolean
        
        /** Called after the XR [Viewport] draw logic has completed. */
        /* gdvirtual */ _postDrawViewport(renderTarget: Rid, screenRect: Rect2): void
        
        /** Called if interface is active and queues have been submitted. */
        /* gdvirtual */ _endFrame(): void
        
        /** Returns a [PackedStringArray] with tracker names configured by this interface. Note that user configuration can override this list. */
        /* gdvirtual */ _getSuggestedTrackerNames(): PackedStringArray
        
        /** Returns a [PackedStringArray] with pose names configured by this interface. Note that user configuration can override this list. */
        /* gdvirtual */ _getSuggestedPoseNames(trackerName: StringName): PackedStringArray
        
        /** Returns the current status of our tracking. */
        /* gdvirtual */ _getTrackingStatus(): XRInterface.TrackingStatus
        
        /** Triggers a haptic pulse to be emitted on the specified tracker. */
        /* gdvirtual */ _triggerHapticPulse(actionName: string, trackerName: StringName, frequency: float64, amplitude: float64, durationSec: float64, delaySec: float64): void
        
        /** Return `true` if anchor detection is enabled for this interface. */
        /* gdvirtual */ _getAnchorDetectionIsEnabled(): boolean
        
        /** Enables anchor detection on this interface if supported. */
        /* gdvirtual */ _setAnchorDetectionIsEnabled(enabled: boolean): void
        
        /** Returns the camera feed ID for the [CameraFeed] registered with the [CameraServer] that should be presented as the background on an AR capable device (if applicable). */
        /* gdvirtual */ _getCameraFeedId(): int64
        
        /** Return color texture into which to render (if applicable). */
        /* gdvirtual */ _getColorTexture(): Rid
        
        /** Return depth texture into which to render (if applicable). */
        /* gdvirtual */ _getDepthTexture(): Rid
        
        /** Return velocity texture into which to render (if applicable). */
        /* gdvirtual */ _getVelocityTexture(): Rid
        getColorTexture(): Rid
        getDepthTexture(): Rid
        getVelocityTexture(): Rid
        
        /** Blits our render results to screen optionally applying lens distortion. This can only be called while processing `_commit_views`. */
        addBlit(renderTarget: Rid, srcRect: Rect2, dstRect: Rect2I, useLayer: boolean, layer: int64, applyLensDistortion: boolean, eyeCenter: Vector2, k1: float64, k2: float64, upscale: float64, aspectRatio: float64): void
        
        /** Returns a valid [RID] for a texture to which we should render the current frame if supported by the interface. */
        getRenderTargetTexture(renderTarget: Rid): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRInterfaceExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRInterfaceExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRNode3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRNode3D extends __NameMapNode3D {
        get_is_active: "getIsActive";
        get_has_tracking_data: "getHasTrackingData";
        get_pose: "getPose";
        trigger_haptic_pulse: "triggerHapticPulse";
        show_when_tracked: "showWhenTracked";
        tracking_changed: "trackingChanged";
    }
    /** A 3D node that has its position automatically updated by the [XRServer].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrnode3d.html  
     */
    class XRNode3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns `true` if the [member tracker] has been registered and the [member pose] is being tracked. */
        getIsActive(): boolean
        
        /** Returns `true` if the [member tracker] has current tracking data for the [member pose] being tracked. */
        getHasTrackingData(): boolean
        
        /** Returns the [XRPose] containing the current state of the pose being tracked. This gives access to additional properties of this pose. */
        getPose(): null | XRPose
        
        /** Triggers a haptic pulse on a device associated with this interface.  
         *  [param action_name] is the name of the action for this pulse.  
         *  [param frequency] is the frequency of the pulse, set to `0.0` to have the system use a default frequency.  
         *  [param amplitude] is the amplitude of the pulse between `0.0` and `1.0`.  
         *  [param duration_sec] is the duration of the pulse in seconds.  
         *  [param delay_sec] is a delay in seconds before the pulse is given.  
         */
        triggerHapticPulse(actionName: string, frequency: float64, amplitude: float64, durationSec: float64, delaySec: float64): void
        
        /** The name of the tracker we're bound to. Which trackers are available is not known during design time.  
         *  Godot defines a number of standard trackers such as `left_hand` and `right_hand` but others may be configured within a given [XRInterface].  
         */
        get tracker(): string
        set tracker(value: string)
        
        /** The name of the pose we're bound to. Which poses a tracker supports is not known during design time.  
         *  Godot defines number of standard pose names such as `aim` and `grip` but other may be configured within a given [XRInterface].  
         */
        get pose(): string
        set pose(value: string)
        
        /** Enables showing the node when tracking starts, and hiding the node when tracking is lost. */
        get showWhenTracked(): boolean
        set showWhenTracked(value: boolean)
        
        /** Emitted when the [member tracker] starts or stops receiving updated tracking data for the [member pose] being tracked. The [param tracking] argument indicates whether the tracker is getting updated tracking data. */
        readonly trackingChanged: Signal<(tracking: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRNode3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRNode3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXROrigin3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXROrigin3D extends __NameMapNode3D {
        world_scale: "worldScale";
    }
    /** The origin point in AR/VR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrorigin3d.html  
     */
    class XROrigin3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** The scale of the game world compared to the real world. This is the same as [member XRServer.world_scale]. By default, most AR/VR platforms assume that 1 game unit corresponds to 1 real world meter. */
        get worldScale(): float64
        set worldScale(value: float64)
        
        /** If `true`, this origin node is currently being used by the [XRServer]. Only one origin point can be used at a time. */
        get current(): boolean
        set current(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXROrigin3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXROrigin3D;
    }
    namespace XRPose {
        enum TrackingConfidence {
            XRTrackingConfidenceNone = 0,
            XRTrackingConfidenceLow = 1,
            XRTrackingConfidenceHigh = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRPose extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRPose extends __NameMapRefCounted {
        set_name: "setName";
        get_name: "getName";
        get_adjusted_transform: "getAdjustedTransform";
        has_tracking_data: "hasTrackingData";
        linear_velocity: "linearVelocity";
        angular_velocity: "angularVelocity";
        tracking_confidence: "trackingConfidence";
    }
    /** This object contains all data related to a pose on a tracked object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrpose.html  
     */
    class XRPose extends RefCounted {
        constructor(identifier?: any)
        setName(name: StringName): void
        getName(): StringName
        
        /** Returns the [member transform] with world scale and our reference frame applied. This is the transform used to position [XRNode3D] objects. */
        getAdjustedTransform(): Transform3D
        
        /** If `true` our tracking data is up to date. If `false` we're no longer receiving new tracking data and our state is whatever that last valid state was. */
        get hasTrackingData(): boolean
        set hasTrackingData(value: boolean)
        
        /** The transform containing the original and transform as reported by the XR runtime. */
        get transform(): string
        set transform(value: string)
        
        /** The linear velocity of this pose. */
        get linearVelocity(): string
        set linearVelocity(value: string)
        
        /** The angular velocity for this pose. */
        get angularVelocity(): string
        set angularVelocity(value: string)
        
        /** The tracking confidence for this pose, provides insight on how accurate the spatial positioning of this record is. */
        get trackingConfidence(): int64
        set trackingConfidence(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRPose;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRPose;
    }
    namespace XRPositionalTracker {
        enum TrackerHand {
            TrackerHandUnknown = 0,
            TrackerHandLeft = 1,
            TrackerHandRight = 2,
            TrackerHandMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRPositionalTracker extends __RPCMapXRTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRPositionalTracker extends __NameMapXRTracker {
        has_pose: "hasPose";
        get_pose: "getPose";
        invalidate_pose: "invalidatePose";
        set_pose: "setPose";
        get_input: "getInput";
        set_input: "setInput";
        pose_changed: "poseChanged";
        pose_lost_tracking: "poseLostTracking";
        button_pressed: "buttonPressed";
        button_released: "buttonReleased";
        input_float_changed: "inputFloatChanged";
        input_vector2_changed: "inputVector2Changed";
        profile_changed: "profileChanged";
    }
    /** A tracked object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrpositionaltracker.html  
     */
    class XRPositionalTracker extends XRTracker {
        constructor(identifier?: any)
        /** Returns `true` if the tracker is available and is currently tracking the bound [param name] pose. */
        hasPose(name: StringName): boolean
        
        /** Returns the current [XRPose] state object for the bound [param name] pose. */
        getPose(name: StringName): null | XRPose
        
        /** Marks this pose as invalid, we don't clear the last reported state but it allows users to decide if trackers need to be hidden if we lose tracking or just remain at their last known position. */
        invalidatePose(name: StringName): void
        
        /** Sets the transform, linear velocity, angular velocity and tracking confidence for the given pose. This method is called by an [XRInterface] implementation and should not be used directly. */
        setPose(name: StringName, transform: Transform3D, linearVelocity: Vector3, angularVelocity: Vector3, trackingConfidence: XRPose.TrackingConfidence): void
        
        /** Returns an input for this tracker. It can return a boolean, float or [Vector2] value depending on whether the input is a button, trigger or thumbstick/thumbpad. */
        getInput(name: StringName): any
        
        /** Changes the value for the given input. This method is called by an [XRInterface] implementation and should not be used directly. */
        setInput(name: StringName, value: any): void
        
        /** The profile associated with this tracker, interface dependent but will indicate the type of controller being tracked. */
        get profile(): string
        set profile(value: string)
        
        /** Defines which hand this tracker relates to. */
        get hand(): int64
        set hand(value: int64)
        
        /** Emitted when the state of a pose tracked by this tracker changes. */
        readonly poseChanged: Signal<(pose: XRPose) => void>
        
        /** Emitted when a pose tracked by this tracker stops getting updated tracking data. */
        readonly poseLostTracking: Signal<(pose: XRPose) => void>
        
        /** Emitted when a button on this tracker is pressed. Note that many XR runtimes allow other inputs to be mapped to buttons. */
        readonly buttonPressed: Signal<(actionName: string) => void>
        
        /** Emitted when a button on this tracker is released. */
        readonly buttonReleased: Signal<(actionName: string) => void>
        
        /** Emitted when a trigger or similar input on this tracker changes value. */
        readonly inputFloatChanged: Signal<(actionName: string, value: float64) => void>
        
        /** Emitted when a thumbstick or thumbpad on this tracker moves. */
        readonly inputVector2Changed: Signal<(actionName: string, vector: Vector2) => void>
        
        /** Emitted when the profile of our tracker changes. */
        readonly profileChanged: Signal<(role: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRPositionalTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRPositionalTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRTracker extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRTracker extends __NameMapRefCounted {
        get_tracker_name: "getTrackerName";
        set_tracker_name: "setTrackerName";
    }
    /** A tracked object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrtracker.html  
     */
    class XRTracker extends RefCounted {
        constructor(identifier?: any)
        getTrackerName(): StringName
        setTrackerName(name: StringName): void
        
        /** The type of tracker. */
        get type(): int64
        set type(value: int64)
        
        /** The description of this tracker. */
        get description(): string
        set description(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRTracker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXrvrs extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXrvrs extends __NameMapGObject {
        make_vrs_texture: "makeVrsTexture";
        vrs_min_radius: "vrsMinRadius";
        vrs_strength: "vrsStrength";
        vrs_render_region: "vrsRenderRegion";
    }
    class Xrvrs extends GObject {
        constructor(identifier?: any)
        makeVrsTexture(targetSize: Vector2, eyeFoci: PackedVector2Array | Vector2[]): Rid
        get vrsMinRadius(): float64
        set vrsMinRadius(value: float64)
        get vrsStrength(): float64
        set vrsStrength(value: float64)
        get vrsRenderRegion(): Rect2I
        set vrsRenderRegion(value: Rect2I)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXrvrs;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXrvrs;
    }
    namespace ZipPacker {
        enum ZipAppend {
            AppendCreate = 0,
            AppendCreateafter = 1,
            AppendAddinzip = 2,
        }
        enum CompressionLevel {
            CompressionDefault = -1,
            CompressionNone = 0,
            CompressionFast = 1,
            CompressionBest = 9,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapZipPacker extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapZipPacker extends __NameMapRefCounted {
        add_directory: "addDirectory";
        start_file: "startFile";
        write_file: "writeFile";
        close_file: "closeFile";
        compression_level: "compressionLevel";
    }
    class ZipPacker extends RefCounted {
        constructor(identifier?: any)
        open(path: string, append?: ZipPacker.ZipAppend /* = 0 */): GError
        addDirectory(path: string, permissions?: FileAccess.UnixPermissionFlags /* = 493 */, modifiedTime?: int64 /* = 0 */): GError
        startFile(path: string, permissions?: FileAccess.UnixPermissionFlags /* = 420 */, modifiedTime?: int64 /* = 0 */): GError
        writeFile(data: PackedByteArray | byte[] | ArrayBuffer): GError
        closeFile(): GError
        close(): GError
        get compressionLevel(): int64
        set compressionLevel(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapZipPacker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapZipPacker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapZipReader extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapZipReader extends __NameMapRefCounted {
        get_files: "getFiles";
        read_file: "readFile";
        file_exists: "fileExists";
        get_compression_level: "getCompressionLevel";
    }
    class ZipReader extends RefCounted {
        constructor(identifier?: any)
        open(path: string): GError
        close(): GError
        getFiles(): PackedStringArray
        readFile(path: string, caseSensitive?: boolean /* = true */): PackedByteArray
        fileExists(path: string, caseSensitive?: boolean /* = true */): boolean
        getCompressionLevel(path: string, caseSensitive?: boolean /* = true */): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapZipReader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapZipReader;
    }
    namespace Vector2 {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
        }
    }
    /** A 2D vector using floating-point coordinates.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_vector2.html  
     */
    class Vector2 {
        /** Zero vector, a vector with all components set to `0`. */
        static readonly ZERO: Readonly<Vector2>
        
        /** One vector, a vector with all components set to `1`. */
        static readonly ONE: Readonly<Vector2>
        
        /** Infinity vector, a vector with all components set to [constant @GDScript.INF]. */
        static readonly INF: Readonly<Vector2>
        
        /** Left unit vector. Represents the direction of left. */
        static readonly LEFT: Readonly<Vector2>
        
        /** Right unit vector. Represents the direction of right. */
        static readonly RIGHT: Readonly<Vector2>
        
        /** Up unit vector. Y is down in 2D, so this vector points -Y. */
        static readonly UP: Readonly<Vector2>
        
        /** Down unit vector. Y is down in 2D, so this vector points +Y. */
        static readonly DOWN: Readonly<Vector2>
        constructor()
        constructor(from: Vector2)
        constructor(from: Vector2I)
        constructor(x: float64, y: float64)
        
        /** Returns this vector's angle with respect to the positive X axis, or `(1, 0)` vector, in radians.  
         *  For example, `Vector2.RIGHT.angle()` will return zero, `Vector2.DOWN.angle()` will return `PI / 2` (a quarter turn, or 90 degrees), and `Vector2(1, -1).angle()` will return `-PI / 4` (a negative eighth turn, or -45 degrees).  
         *  This is equivalent to calling [method @GlobalScope.atan2] with [member y] and [member x].  
         *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/vector2_angle.png]Illustration of the returned angle.[/url]  
         */
        angle(): float64
        
        /** Returns the signed angle to the given vector, in radians. The result ranges from `-PI` to `PI` (inclusive).  
         *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/vector2_angle_to.png]Illustration of the returned angle.[/url]  
         */
        angleTo(to: Vector2): float64
        
        /** Returns the signed angle between the X axis and the line from this vector to point [param to], in radians. The result ranges from `-PI` to `PI` (inclusive).  
         *  `a.angle_to_point(b)` is equivalent to `(b - a).angle()`. See also [method angle].  
         *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/vector2_angle_to_point.png]Illustration of the returned angle.[/url]  
         */
        angleToPoint(to: Vector2): float64
        
        /** Returns the normalized vector pointing from this vector to [param to].  
         *  `a.direction_to(b)` is equivalent to `(b - a).normalized()`. See also [method normalized].  
         */
        directionTo(to: Vector2): Vector2
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to]. */
        distanceTo(to: Vector2): float64
        
        /** Returns the squared [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to].  
         *  This method runs faster than [method distance_to], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        distanceSquaredTo(to: Vector2): float64
        
        /** Returns the length (magnitude) of this vector. */
        length(): float64
        
        /** Returns the squared length (squared magnitude) of this vector.  
         *  This method runs faster than [method length], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        lengthSquared(): float64
        
        /** Returns the vector with a maximum length by limiting its length to [param length]. If the vector is non-finite, the result is undefined. */
        limitLength(length?: float64 /* = 1 */): Vector2
        
        /** Returns the result of scaling the vector to unit length. Equivalent to `v / v.length()`. Returns `(0, 0)` if `v.length() == 0`. See also [method is_normalized].  
         *      
         *  **Note:** This function may return incorrect values if the input vector length is near zero.  
         */
        normalized(): Vector2
        
        /** Returns `true` if the vector is normalized, i.e. its length is approximately equal to 1. */
        isNormalized(): boolean
        
        /** Returns `true` if this vector and [param to] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(to: Vector2): boolean
        
        /** Returns `true` if this vector's values are approximately zero, by running [method @GlobalScope.is_zero_approx] on each component.  
         *  This method is faster than using [method is_equal_approx] with one value as a zero vector.  
         */
        isZeroApprox(): boolean
        
        /** Returns `true` if this vector is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns the inverse of the vector. This is the same as `Vector2(1.0 / v.x, 1.0 / v.y)`. */
        inverse(): Vector2
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param mod]. */
        posmod(mod: float64): Vector2
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param modv]'s components. */
        posmodv(modv: Vector2): Vector2
        
        /** Returns a new vector resulting from projecting this vector onto the given vector [param b]. The resulting new vector is parallel to [param b]. See also [method slide].  
         *      
         *  **Note:** If the vector [param b] is a zero vector, the components of the resulting new vector will be [constant @GDScript.NAN].  
         */
        project(b: Vector2): Vector2
        
        /** Returns the result of the linear interpolation between this vector and [param to] by amount [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        lerp(to: Vector2, weight: float64): Vector2
        
        /** Returns the result of spherical linear interpolation between this vector and [param to], by amount [param weight]. [param weight] is on the range of 0.0 to 1.0, representing the amount of interpolation.  
         *  This method also handles interpolating the lengths if the input vectors have different lengths. For the special case of one or both input vectors having zero length, this method behaves like [method lerp].  
         */
        slerp(to: Vector2, weight: float64): Vector2
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        cubicInterpolate(b: Vector2, preA: Vector2, postB: Vector2, weight: float64): Vector2
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation.  
         *  It can perform smoother interpolation than [method cubic_interpolate] by the time values.  
         */
        cubicInterpolateInTime(b: Vector2, preA: Vector2, postB: Vector2, weight: float64, bT: float64, preAT: float64, postBT: float64): Vector2
        
        /** Returns the point at the given [param t] on the [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by this vector and the given [param control_1], [param control_2], and [param end] points. */
        bezierInterpolate(control1: Vector2, control2: Vector2, end: Vector2, t: float64): Vector2
        
        /** Returns the derivative at the given [param t] on the [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by this vector and the given [param control_1], [param control_2], and [param end] points. */
        bezierDerivative(control1: Vector2, control2: Vector2, end: Vector2, t: float64): Vector2
        
        /** Returns the axis of the vector's highest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_X]. */
        maxAxisIndex(): int64
        
        /** Returns the axis of the vector's lowest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_Y]. */
        minAxisIndex(): int64
        
        /** Returns a new vector moved toward [param to] by the fixed [param delta] amount. Will not go past the final value. */
        moveToward(to: Vector2, delta: float64): Vector2
        
        /** Returns the result of rotating this vector by [param angle] (in radians). See also [method @GlobalScope.deg_to_rad]. */
        rotated(angle: float64): Vector2
        
        /** Returns a perpendicular vector rotated 90 degrees counter-clockwise compared to the original, with the same length. */
        orthogonal(): Vector2
        
        /** Returns a new vector with all components rounded down (towards negative infinity). */
        floor(): Vector2
        
        /** Returns a new vector with all components rounded up (towards positive infinity). */
        ceil(): Vector2
        
        /** Returns a new vector with all components rounded to the nearest integer, with halfway cases rounded away from zero. */
        round(): Vector2
        
        /** Returns this vector's aspect ratio, which is [member x] divided by [member y]. */
        aspect(): float64
        
        /** Returns the dot product of this vector and [param with]. This can be used to compare the angle between two vectors. For example, this can be used to determine whether an enemy is facing the player.  
         *  The dot product will be `0` for a right angle (90 degrees), greater than 0 for angles narrower than 90 degrees and lower than 0 for angles wider than 90 degrees.  
         *  When using unit (normalized) vectors, the result will always be between `-1.0` (180 degree angle) when the vectors are facing opposite directions, and `1.0` (0 degree angle) when the vectors are aligned.  
         *      
         *  **Note:** `a.dot(b)` is equivalent to `b.dot(a)`.  
         */
        dot(with_: Vector2): float64
        
        /** Returns a new vector resulting from sliding this vector along a line with normal [param n]. The resulting new vector is perpendicular to [param n], and is equivalent to this vector minus its projection on [param n]. See also [method project].  
         *      
         *  **Note:** The vector [param n] must be normalized. See also [method normalized].  
         */
        slide(n: Vector2): Vector2
        
        /** Returns the vector "bounced off" from a line defined by the given normal [param n] perpendicular to the line.  
         *      
         *  **Note:** [method bounce] performs the operation that most engines and frameworks call [code skip-lint]reflect()`.  
         */
        bounce(n: Vector2): Vector2
        
        /** Returns the result of reflecting the vector from a line defined by the given direction vector [param line].  
         *      
         *  **Note:** [method reflect] differs from what other engines and frameworks call [code skip-lint]reflect()`. In other engines, [code skip-lint]reflect()` takes a normal direction which is a direction perpendicular to the line. In Godot, you specify the direction of the line directly. See also [method bounce] which does what most engines call [code skip-lint]reflect()`.  
         */
        reflect(line: Vector2): Vector2
        
        /** Returns the 2D analog of the cross product for this vector and [param with].  
         *  This is the signed area of the parallelogram formed by the two vectors. If the second vector is clockwise from the first vector, then the cross product is the positive area. If counter-clockwise, the cross product is the negative area. If the two vectors are parallel this returns zero, making it useful for testing if two vectors are parallel.  
         *      
         *  **Note:** Cross product is not defined in 2D mathematically. This method embeds the 2D vectors in the XY plane of 3D space and uses their cross product's Z component as the analog.  
         */
        cross(with_: Vector2): float64
        
        /** Returns a new vector with all components in absolute values (i.e. positive). */
        abs(): Vector2
        
        /** Returns a new vector with each component set to `1.0` if it's positive, `-1.0` if it's negative, and `0.0` if it's zero. The result is identical to calling [method @GlobalScope.sign] on each component. */
        sign(): Vector2
        
        /** Returns a new vector with all components clamped between the components of [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clamp(min: Vector2, max: Vector2): Vector2
        
        /** Returns a new vector with all components clamped between [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clampf(min: float64, max: float64): Vector2
        
        /** Returns a new vector with each component snapped to the nearest multiple of the corresponding component in [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snapped(step: Vector2): Vector2
        
        /** Returns a new vector with each component snapped to the nearest multiple of [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snappedf(step: float64): Vector2
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector2(minf(x, with.x), minf(y, with.y))`. */
        min(with_: Vector2): Vector2
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector2(minf(x, with), minf(y, with))`. */
        minf(with_: float64): Vector2
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector2(maxf(x, with.x), maxf(y, with.y))`. */
        max(with_: Vector2): Vector2
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector2(maxf(x, with), maxf(y, with))`. */
        maxf(with_: float64): Vector2
        
        /** Creates a [Vector2] rotated to the given [param angle] in radians. This is equivalent to doing `Vector2(cos(angle), sin(angle))` or `Vector2.RIGHT.rotated(angle)`.  
         *    
         *      
         *  **Note:** The length of the returned [Vector2] is  *approximately*  `1.0`, but is is not guaranteed to be exactly `1.0` due to floating-point precision issues. Call [method normalized] on the returned [Vector2] if you require a unit vector.  
         */
        static fromAngle(angle: float64): Vector2
        static ADD(left: Vector2, right: Vector2): Vector2
        static SUBTRACT(left: Vector2, right: Vector2): Vector2
        static MULTIPLY(left: float64, right: Vector2): Vector2
        static MULTIPLY(left: Vector2, right: Vector2): Vector2
        static MULTIPLY(left: Vector2, right: float64): Vector2
        static DIVIDE(left: Vector2, right: Vector2): Vector2
        static DIVIDE(left: Vector2, right: float64): Vector2
        static NEGATE(left: Vector2): Vector2
        static EQUAL(left: Vector2, right: Vector2): boolean
        static NOT_EQUAL(left: Vector2, right: Vector2): boolean
        static LESS(left: Vector2, right: Vector2): boolean
        static LESS_EQUAL(left: Vector2, right: Vector2): boolean
        static GREATER(left: Vector2, right: Vector2): boolean
        static GREATER_EQUAL(left: Vector2, right: Vector2): boolean
        get x(): float64
        set x(value: float64)
        get y(): float64
        set y(value: float64)
    }
    namespace Vector2I {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
        }
    }
    class Vector2I {
        static readonly ZERO: Readonly<Vector2I>
        static readonly ONE: Readonly<Vector2I>
        static readonly MIN: Readonly<Vector2I>
        static readonly MAX: Readonly<Vector2I>
        static readonly LEFT: Readonly<Vector2I>
        static readonly RIGHT: Readonly<Vector2I>
        static readonly UP: Readonly<Vector2I>
        static readonly DOWN: Readonly<Vector2I>
        constructor()
        constructor(from: Vector2I)
        constructor(from: Vector2)
        constructor(x: int64, y: int64)
        aspect(): float64
        maxAxisIndex(): int64
        minAxisIndex(): int64
        distanceTo(to: Vector2I): float64
        distanceSquaredTo(to: Vector2I): int64
        length(): float64
        lengthSquared(): int64
        sign(): Vector2I
        abs(): Vector2I
        clamp(min: Vector2I, max: Vector2I): Vector2I
        clampi(min: int64, max: int64): Vector2I
        snapped(step: Vector2I): Vector2I
        snappedi(step: int64): Vector2I
        min(with_: Vector2I): Vector2I
        mini(with_: int64): Vector2I
        max(with_: Vector2I): Vector2I
        maxi(with_: int64): Vector2I
        static ADD(left: Vector2I, right: Vector2I): Vector2I
        static SUBTRACT(left: Vector2I, right: Vector2I): Vector2I
        static MULTIPLY(left: float64, right: Vector2I): Vector2I
        static MULTIPLY(left: Vector2I, right: Vector2I): Vector2I
        static MULTIPLY(left: Vector2I, right: float64): Vector2I
        static DIVIDE(left: Vector2I, right: Vector2I): Vector2I
        static DIVIDE(left: Vector2I, right: float64): Vector2I
        static NEGATE(left: Vector2I): Vector2I
        static EQUAL(left: Vector2I, right: Vector2I): boolean
        static NOT_EQUAL(left: Vector2I, right: Vector2I): boolean
        static LESS(left: Vector2I, right: Vector2I): boolean
        static LESS_EQUAL(left: Vector2I, right: Vector2I): boolean
        static GREATER(left: Vector2I, right: Vector2I): boolean
        static GREATER_EQUAL(left: Vector2I, right: Vector2I): boolean
        get x(): int64
        set x(value: int64)
        get y(): int64
        set y(value: int64)
    }
    /** A 2D axis-aligned bounding box using floating-point coordinates.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rect2.html  
     */
    class Rect2 {
        constructor()
        constructor(from: Rect2)
        constructor(from: Rect2I)
        constructor(position: Vector2, size: Vector2)
        constructor(x: float64, y: float64, width: float64, height: float64)
        
        /** Returns the center point of the rectangle. This is the same as `position + (size / 2.0)`. */
        getCenter(): Vector2
        
        /** Returns the rectangle's area. This is equivalent to `size.x * size.y`. See also [method has_area]. */
        getArea(): float64
        
        /** Returns `true` if this rectangle has positive width and height. See also [method get_area]. */
        hasArea(): boolean
        
        /** Returns `true` if the rectangle contains the given [param point]. By convention, points on the right and bottom edges are **not** included.  
         *      
         *  **Note:** This method is not reliable for [Rect2] with a  *negative*  [member size]. Use [method abs] first to get a valid rectangle.  
         */
        hasPoint(point: Vector2): boolean
        
        /** Returns `true` if this rectangle and [param rect] are approximately equal, by calling [method Vector2.is_equal_approx] on the [member position] and the [member size]. */
        isEqualApprox(rect: Rect2): boolean
        
        /** Returns `true` if this rectangle's values are finite, by calling [method Vector2.is_finite] on the [member position] and the [member size]. */
        isFinite(): boolean
        
        /** Returns `true` if this rectangle overlaps with the [param b] rectangle. The edges of both rectangles are excluded, unless [param include_borders] is `true`. */
        intersects(b: Rect2, includeBorders?: boolean /* = false */): boolean
        
        /** Returns `true` if this rectangle  *completely*  encloses the [param b] rectangle. */
        encloses(b: Rect2): boolean
        
        /** Returns the intersection between this rectangle and [param b]. If the rectangles do not intersect, returns an empty [Rect2].  
         *    
         *      
         *  **Note:** If you only need to know whether two rectangles are overlapping, use [method intersects], instead.  
         */
        intersection(b: Rect2): Rect2
        
        /** Returns a [Rect2] that encloses both this rectangle and [param b] around the edges. See also [method encloses]. */
        merge(b: Rect2): Rect2
        
        /** Returns a copy of this rectangle expanded to align the edges with the given [param to] point, if necessary.  
         *    
         */
        expand(to: Vector2): Rect2
        
        /** Returns the vertex's position of this rect that's the farthest in the given direction. This point is commonly known as the support point in collision detection algorithms. */
        getSupport(direction: Vector2): Vector2
        
        /** Returns a copy of this rectangle extended on all sides by the given [param amount]. A negative [param amount] shrinks the rectangle instead. See also [method grow_individual] and [method grow_side].  
         *    
         */
        grow(amount: float64): Rect2
        
        /** Returns a copy of this rectangle with its [param side] extended by the given [param amount] (see [enum Side] constants). A negative [param amount] shrinks the rectangle, instead. See also [method grow] and [method grow_individual]. */
        growSide(side: int64, amount: float64): Rect2
        
        /** Returns a copy of this rectangle with its [param left], [param top], [param right], and [param bottom] sides extended by the given amounts. Negative values shrink the sides, instead. See also [method grow] and [method grow_side]. */
        growIndividual(left: float64, top: float64, right: float64, bottom: float64): Rect2
        
        /** Returns a [Rect2] equivalent to this rectangle, with its width and height modified to be non-negative values, and with its [member position] being the top-left corner of the rectangle.  
         *    
         *      
         *  **Note:** It's recommended to use this method when [member size] is negative, as most other methods in Godot assume that the [member position] is the top-left corner, and the [member end] is the bottom-right corner.  
         */
        abs(): Rect2
        get position(): Vector2
        set position(value: Vector2)
        get size(): Vector2
        set size(value: Vector2)
        get end(): Vector2
        set end(value: Vector2)
    }
    class Rect2I {
        constructor()
        constructor(from: Rect2I)
        constructor(from: Rect2)
        constructor(position: Vector2I, size: Vector2I)
        constructor(x: int64, y: int64, width: int64, height: int64)
        getCenter(): Vector2I
        getArea(): int64
        hasArea(): boolean
        hasPoint(point: Vector2I): boolean
        intersects(b: Rect2I): boolean
        encloses(b: Rect2I): boolean
        intersection(b: Rect2I): Rect2I
        merge(b: Rect2I): Rect2I
        expand(to: Vector2I): Rect2I
        grow(amount: int64): Rect2I
        growSide(side: int64, amount: int64): Rect2I
        growIndividual(left: int64, top: int64, right: int64, bottom: int64): Rect2I
        abs(): Rect2I
        get position(): Vector2I
        set position(value: Vector2I)
        get size(): Vector2I
        set size(value: Vector2I)
        get end(): Vector2I
        set end(value: Vector2I)
    }
    namespace Vector3 {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
            AxisZ = 2,
        }
    }
    /** A 3D vector using floating-point coordinates.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_vector3.html  
     */
    class Vector3 {
        /** Zero vector, a vector with all components set to `0`. */
        static readonly ZERO: Readonly<Vector3>
        
        /** One vector, a vector with all components set to `1`. */
        static readonly ONE: Readonly<Vector3>
        
        /** Infinity vector, a vector with all components set to [constant @GDScript.INF]. */
        static readonly INF: Readonly<Vector3>
        
        /** Left unit vector. Represents the local direction of left, and the global direction of west. */
        static readonly LEFT: Readonly<Vector3>
        
        /** Right unit vector. Represents the local direction of right, and the global direction of east. */
        static readonly RIGHT: Readonly<Vector3>
        
        /** Up unit vector. */
        static readonly UP: Readonly<Vector3>
        
        /** Down unit vector. */
        static readonly DOWN: Readonly<Vector3>
        
        /** Forward unit vector. Represents the local direction of forward, and the global direction of north. Keep in mind that the forward direction for lights, cameras, etc is different from 3D assets like characters, which face towards the camera by convention. Use [constant Vector3.MODEL_FRONT] and similar constants when working in 3D asset space. */
        static readonly FORWARD: Readonly<Vector3>
        
        /** Back unit vector. Represents the local direction of back, and the global direction of south. */
        static readonly BACK: Readonly<Vector3>
        
        /** Unit vector pointing towards the left side of imported 3D assets. */
        static readonly MODEL_LEFT: Readonly<Vector3>
        
        /** Unit vector pointing towards the right side of imported 3D assets. */
        static readonly MODEL_RIGHT: Readonly<Vector3>
        
        /** Unit vector pointing towards the top side (up) of imported 3D assets. */
        static readonly MODEL_TOP: Readonly<Vector3>
        
        /** Unit vector pointing towards the bottom side (down) of imported 3D assets. */
        static readonly MODEL_BOTTOM: Readonly<Vector3>
        
        /** Unit vector pointing towards the front side (facing forward) of imported 3D assets. */
        static readonly MODEL_FRONT: Readonly<Vector3>
        
        /** Unit vector pointing towards the rear side (back) of imported 3D assets. */
        static readonly MODEL_REAR: Readonly<Vector3>
        constructor()
        constructor(from: Vector3)
        constructor(from: Vector3I)
        constructor(x: float64, y: float64, z: float64)
        
        /** Returns the axis of the vector's lowest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_Z]. */
        minAxisIndex(): int64
        
        /** Returns the axis of the vector's highest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_X]. */
        maxAxisIndex(): int64
        
        /** Returns the unsigned minimum angle to the given vector, in radians. */
        angleTo(to: Vector3): float64
        
        /** Returns the signed angle to the given vector, in radians. The sign of the angle is positive in a counter-clockwise direction and negative in a clockwise direction when viewed from the side specified by the [param axis]. */
        signedAngleTo(to: Vector3, axis: Vector3): float64
        
        /** Returns the normalized vector pointing from this vector to [param to].  
         *  `a.direction_to(b)` is equivalent to `(b - a).normalized()`. See also [method normalized].  
         */
        directionTo(to: Vector3): Vector3
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to]. */
        distanceTo(to: Vector3): float64
        
        /** Returns the squared [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to].  
         *  This method runs faster than [method distance_to], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        distanceSquaredTo(to: Vector3): float64
        
        /** Returns the length (magnitude) of this vector. */
        length(): float64
        
        /** Returns the squared length (squared magnitude) of this vector.  
         *  This method runs faster than [method length], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        lengthSquared(): float64
        
        /** Returns the vector with a maximum length by limiting its length to [param length]. If the vector is non-finite, the result is undefined. */
        limitLength(length?: float64 /* = 1 */): Vector3
        
        /** Returns the result of scaling the vector to unit length. Equivalent to `v / v.length()`. Returns `(0, 0, 0)` if `v.length() == 0`. See also [method is_normalized].  
         *      
         *  **Note:** This function may return incorrect values if the input vector length is near zero.  
         */
        normalized(): Vector3
        
        /** Returns `true` if the vector is normalized, i.e. its length is approximately equal to 1. */
        isNormalized(): boolean
        
        /** Returns `true` if this vector and [param to] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(to: Vector3): boolean
        
        /** Returns `true` if this vector's values are approximately zero, by running [method @GlobalScope.is_zero_approx] on each component.  
         *  This method is faster than using [method is_equal_approx] with one value as a zero vector.  
         */
        isZeroApprox(): boolean
        
        /** Returns `true` if this vector is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns the inverse of the vector. This is the same as `Vector3(1.0 / v.x, 1.0 / v.y, 1.0 / v.z)`. */
        inverse(): Vector3
        
        /** Returns a new vector with all components clamped between the components of [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clamp(min: Vector3, max: Vector3): Vector3
        
        /** Returns a new vector with all components clamped between [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clampf(min: float64, max: float64): Vector3
        
        /** Returns a new vector with each component snapped to the nearest multiple of the corresponding component in [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snapped(step: Vector3): Vector3
        
        /** Returns a new vector with each component snapped to the nearest multiple of [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snappedf(step: float64): Vector3
        
        /** Returns the result of rotating this vector around a given axis by [param angle] (in radians). The axis must be a normalized vector. See also [method @GlobalScope.deg_to_rad]. */
        rotated(axis: Vector3, angle: float64): Vector3
        
        /** Returns the result of the linear interpolation between this vector and [param to] by amount [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        lerp(to: Vector3, weight: float64): Vector3
        
        /** Returns the result of spherical linear interpolation between this vector and [param to], by amount [param weight]. [param weight] is on the range of 0.0 to 1.0, representing the amount of interpolation.  
         *  This method also handles interpolating the lengths if the input vectors have different lengths. For the special case of one or both input vectors having zero length, this method behaves like [method lerp].  
         */
        slerp(to: Vector3, weight: float64): Vector3
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        cubicInterpolate(b: Vector3, preA: Vector3, postB: Vector3, weight: float64): Vector3
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation.  
         *  It can perform smoother interpolation than [method cubic_interpolate] by the time values.  
         */
        cubicInterpolateInTime(b: Vector3, preA: Vector3, postB: Vector3, weight: float64, bT: float64, preAT: float64, postBT: float64): Vector3
        
        /** Returns the point at the given [param t] on the [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by this vector and the given [param control_1], [param control_2], and [param end] points. */
        bezierInterpolate(control1: Vector3, control2: Vector3, end: Vector3, t: float64): Vector3
        
        /** Returns the derivative at the given [param t] on the [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by this vector and the given [param control_1], [param control_2], and [param end] points. */
        bezierDerivative(control1: Vector3, control2: Vector3, end: Vector3, t: float64): Vector3
        
        /** Returns a new vector moved toward [param to] by the fixed [param delta] amount. Will not go past the final value. */
        moveToward(to: Vector3, delta: float64): Vector3
        
        /** Returns the dot product of this vector and [param with]. This can be used to compare the angle between two vectors. For example, this can be used to determine whether an enemy is facing the player.  
         *  The dot product will be `0` for a right angle (90 degrees), greater than 0 for angles narrower than 90 degrees and lower than 0 for angles wider than 90 degrees.  
         *  When using unit (normalized) vectors, the result will always be between `-1.0` (180 degree angle) when the vectors are facing opposite directions, and `1.0` (0 degree angle) when the vectors are aligned.  
         *      
         *  **Note:** `a.dot(b)` is equivalent to `b.dot(a)`.  
         */
        dot(with_: Vector3): float64
        
        /** Returns the cross product of this vector and [param with].  
         *  This returns a vector perpendicular to both this and [param with], which would be the normal vector of the plane defined by the two vectors. As there are two such vectors, in opposite directions, this method returns the vector defined by a right-handed coordinate system. If the two vectors are parallel this returns an empty vector, making it useful for testing if two vectors are parallel.  
         */
        cross(with_: Vector3): Vector3
        
        /** Returns the outer product with [param with]. */
        outer(with_: Vector3): Basis
        
        /** Returns a new vector with all components in absolute values (i.e. positive). */
        abs(): Vector3
        
        /** Returns a new vector with all components rounded down (towards negative infinity). */
        floor(): Vector3
        
        /** Returns a new vector with all components rounded up (towards positive infinity). */
        ceil(): Vector3
        
        /** Returns a new vector with all components rounded to the nearest integer, with halfway cases rounded away from zero. */
        round(): Vector3
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param mod]. */
        posmod(mod: float64): Vector3
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param modv]'s components. */
        posmodv(modv: Vector3): Vector3
        
        /** Returns a new vector resulting from projecting this vector onto the given vector [param b]. The resulting new vector is parallel to [param b]. See also [method slide].  
         *      
         *  **Note:** If the vector [param b] is a zero vector, the components of the resulting new vector will be [constant @GDScript.NAN].  
         */
        project(b: Vector3): Vector3
        
        /** Returns a new vector resulting from sliding this vector along a plane with normal [param n]. The resulting new vector is perpendicular to [param n], and is equivalent to this vector minus its projection on [param n]. See also [method project].  
         *      
         *  **Note:** The vector [param n] must be normalized. See also [method normalized].  
         */
        slide(n: Vector3): Vector3
        
        /** Returns the vector "bounced off" from a plane defined by the given normal [param n].  
         *      
         *  **Note:** [method bounce] performs the operation that most engines and frameworks call [code skip-lint]reflect()`.  
         */
        bounce(n: Vector3): Vector3
        
        /** Returns the result of reflecting the vector through a plane defined by the given normal vector [param n].  
         *      
         *  **Note:** [method reflect] differs from what other engines and frameworks call [code skip-lint]reflect()`. In other engines, [code skip-lint]reflect()` returns the result of the vector reflected by the given plane. The reflection thus passes through the given normal. While in Godot the reflection passes through the plane and can be thought of as bouncing off the normal. See also [method bounce] which does what most engines call [code skip-lint]reflect()`.  
         */
        reflect(n: Vector3): Vector3
        
        /** Returns a new vector with each component set to `1.0` if it's positive, `-1.0` if it's negative, and `0.0` if it's zero. The result is identical to calling [method @GlobalScope.sign] on each component. */
        sign(): Vector3
        
        /** Returns the octahedral-encoded (oct32) form of this [Vector3] as a [Vector2]. Since a [Vector2] occupies 1/3 less memory compared to [Vector3], this form of compression can be used to pass greater amounts of [method normalized] [Vector3]s without increasing storage or memory requirements. See also [method octahedron_decode].  
         *      
         *  **Note:** [method octahedron_encode] can only be used for [method normalized] vectors. [method octahedron_encode] does  *not*  check whether this [Vector3] is normalized, and will return a value that does not decompress to the original value if the [Vector3] is not normalized.  
         *      
         *  **Note:** Octahedral compression is  *lossy* , although visual differences are rarely perceptible in real world scenarios.  
         */
        octahedronEncode(): Vector2
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector3(minf(x, with.x), minf(y, with.y), minf(z, with.z))`. */
        min(with_: Vector3): Vector3
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector3(minf(x, with), minf(y, with), minf(z, with))`. */
        minf(with_: float64): Vector3
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector3(maxf(x, with.x), maxf(y, with.y), maxf(z, with.z))`. */
        max(with_: Vector3): Vector3
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector3(maxf(x, with), maxf(y, with), maxf(z, with))`. */
        maxf(with_: float64): Vector3
        
        /** Returns the [Vector3] from an octahedral-compressed form created using [method octahedron_encode] (stored as a [Vector2]). */
        static octahedronDecode(uv: Vector2): Vector3
        static ADD(left: Vector3, right: Vector3): Vector3
        static SUBTRACT(left: Vector3, right: Vector3): Vector3
        static MULTIPLY(left: float64, right: Vector3): Vector3
        static MULTIPLY(left: Vector3, right: Vector3): Vector3
        static MULTIPLY(left: Vector3, right: float64): Vector3
        static DIVIDE(left: Vector3, right: Vector3): Vector3
        static DIVIDE(left: Vector3, right: float64): Vector3
        static NEGATE(left: Vector3): Vector3
        static EQUAL(left: Vector3, right: Vector3): boolean
        static NOT_EQUAL(left: Vector3, right: Vector3): boolean
        static LESS(left: Vector3, right: Vector3): boolean
        static LESS_EQUAL(left: Vector3, right: Vector3): boolean
        static GREATER(left: Vector3, right: Vector3): boolean
        static GREATER_EQUAL(left: Vector3, right: Vector3): boolean
        get x(): float64
        set x(value: float64)
        get y(): float64
        set y(value: float64)
        get z(): float64
        set z(value: float64)
    }
    namespace Vector3I {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
            AxisZ = 2,
        }
    }
    class Vector3I {
        static readonly ZERO: Readonly<Vector3I>
        static readonly ONE: Readonly<Vector3I>
        static readonly MIN: Readonly<Vector3I>
        static readonly MAX: Readonly<Vector3I>
        static readonly LEFT: Readonly<Vector3I>
        static readonly RIGHT: Readonly<Vector3I>
        static readonly UP: Readonly<Vector3I>
        static readonly DOWN: Readonly<Vector3I>
        static readonly FORWARD: Readonly<Vector3I>
        static readonly BACK: Readonly<Vector3I>
        constructor()
        constructor(from: Vector3I)
        constructor(from: Vector3)
        constructor(x: int64, y: int64, z: int64)
        minAxisIndex(): int64
        maxAxisIndex(): int64
        distanceTo(to: Vector3I): float64
        distanceSquaredTo(to: Vector3I): int64
        length(): float64
        lengthSquared(): int64
        sign(): Vector3I
        abs(): Vector3I
        clamp(min: Vector3I, max: Vector3I): Vector3I
        clampi(min: int64, max: int64): Vector3I
        snapped(step: Vector3I): Vector3I
        snappedi(step: int64): Vector3I
        min(with_: Vector3I): Vector3I
        mini(with_: int64): Vector3I
        max(with_: Vector3I): Vector3I
        maxi(with_: int64): Vector3I
        static ADD(left: Vector3I, right: Vector3I): Vector3I
        static SUBTRACT(left: Vector3I, right: Vector3I): Vector3I
        static MULTIPLY(left: float64, right: Vector3I): Vector3I
        static MULTIPLY(left: Vector3I, right: Vector3I): Vector3I
        static MULTIPLY(left: Vector3I, right: float64): Vector3I
        static DIVIDE(left: Vector3I, right: Vector3I): Vector3I
        static DIVIDE(left: Vector3I, right: float64): Vector3I
        static NEGATE(left: Vector3I): Vector3I
        static EQUAL(left: Vector3I, right: Vector3I): boolean
        static NOT_EQUAL(left: Vector3I, right: Vector3I): boolean
        static LESS(left: Vector3I, right: Vector3I): boolean
        static LESS_EQUAL(left: Vector3I, right: Vector3I): boolean
        static GREATER(left: Vector3I, right: Vector3I): boolean
        static GREATER_EQUAL(left: Vector3I, right: Vector3I): boolean
        get x(): int64
        set x(value: int64)
        get y(): int64
        set y(value: int64)
        get z(): int64
        set z(value: int64)
    }
    /** A 2×3 matrix representing a 2D transformation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_transform2d.html  
     */
    class Transform2D {
        /** The identity [Transform2D]. This is a transform with no translation, no rotation, and a scale of [constant Vector2.ONE]. This also means that:  
         *  - The [member x] points right ([constant Vector2.RIGHT]);  
         *  - The [member y] points down ([constant Vector2.DOWN]).  
         *    
         *  If a [Vector2], a [Rect2], a [PackedVector2Array], or another [Transform2D] is transformed (multiplied) by this constant, no transformation occurs.  
         *      
         *  **Note:** In GDScript, this constant is equivalent to creating a [constructor Transform2D] without any arguments. It can be used to make your code clearer, and for consistency with C#.  
         */
        static readonly IDENTITY: Readonly<Transform2D>
        
        /** When any transform is multiplied by [constant FLIP_X], it negates all components of the [member x] axis (the X column).  
         *  When [constant FLIP_X] is multiplied by any transform, it negates the [member Vector2.x] component of all axes (the X row).  
         */
        static readonly FLIP_X: Readonly<Transform2D>
        
        /** When any transform is multiplied by [constant FLIP_Y], it negates all components of the [member y] axis (the Y column).  
         *  When [constant FLIP_Y] is multiplied by any transform, it negates the [member Vector2.y] component of all axes (the Y row).  
         */
        static readonly FLIP_Y: Readonly<Transform2D>
        constructor()
        constructor(from: Transform2D)
        constructor(rotation: float64, position: Vector2)
        constructor(rotation: float64, scale: Vector2, skew: float64, position: Vector2)
        constructor(xAxis: Vector2, yAxis: Vector2, origin: Vector2)
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Invertible_matrix]inverted version of this transform[/url].  
         *      
         *  **Note:** For this method to return correctly, the transform's basis needs to be  *orthonormal*  (see [method orthonormalized]). That means the basis should only represent a rotation. If it does not, use [method affine_inverse] instead.  
         */
        inverse(): Transform2D
        
        /** Returns the inverted version of this transform. Unlike [method inverse], this method works with almost any basis, including non-uniform ones, but is slower.  
         *      
         *  **Note:** For this method to return correctly, the transform's basis needs to have a determinant that is not exactly `0.0` (see [method determinant]).  
         */
        affineInverse(): Transform2D
        
        /** Returns this transform's rotation (in radians). This is equivalent to [member x]'s angle (see [method Vector2.angle]). */
        getRotation(): float64
        
        /** Returns this transform's translation. Equivalent to [member origin]. */
        getOrigin(): Vector2
        
        /** Returns the length of both [member x] and [member y], as a [Vector2]. If this transform's basis is not skewed, this value is the scaling factor. It is not affected by rotation.  
         *    
         *      
         *  **Note:** If the value returned by [method determinant] is negative, the scale is also negative.  
         */
        getScale(): Vector2
        
        /** Returns this transform's skew (in radians). */
        getSkew(): float64
        
        /** Returns a copy of this transform with its basis orthonormalized. An orthonormal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *normalized*  (the axes have a length of `1.0`), which also means it can only represent a rotation. */
        orthonormalized(): Transform2D
        
        /** Returns a copy of this transform rotated by the given [param angle] (in radians).  
         *  If [param angle] is positive, the transform is rotated clockwise.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding rotation transform `R` from the left, i.e., `R * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        rotated(angle: float64): Transform2D
        
        /** Returns a copy of the transform rotated by the given [param angle] (in radians).  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding rotation transform `R` from the right, i.e., `X * R`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        rotatedLocal(angle: float64): Transform2D
        
        /** Returns a copy of the transform scaled by the given [param scale] factor.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding scaling transform `S` from the left, i.e., `S * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        scaled(scale: Vector2): Transform2D
        
        /** Returns a copy of the transform scaled by the given [param scale] factor.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding scaling transform `S` from the right, i.e., `X * S`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        scaledLocal(scale: Vector2): Transform2D
        
        /** Returns a copy of the transform translated by the given [param offset].  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding translation transform `T` from the left, i.e., `T * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        translated(offset: Vector2): Transform2D
        
        /** Returns a copy of the transform translated by the given [param offset].  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding translation transform `T` from the right, i.e., `X * T`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        translatedLocal(offset: Vector2): Transform2D
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Determinant]determinant[/url] of this transform basis's matrix. For advanced math, this number can be used to determine a few attributes:  
         *  - If the determinant is exactly `0.0`, the basis is not invertible (see [method inverse]).  
         *  - If the determinant is a negative number, the basis represents a negative scale.  
         *      
         *  **Note:** If the basis's scale is the same for every axis, its determinant is always that scale by the power of 2.  
         */
        determinant(): float64
        
        /** Returns a copy of the [param v] vector, transformed (multiplied) by the transform basis's matrix. Unlike the multiplication operator (`*`), this method ignores the [member origin]. */
        basisXform(v: Vector2): Vector2
        
        /** Returns a copy of the [param v] vector, transformed (multiplied) by the inverse transform basis's matrix (see [method inverse]). This method ignores the [member origin].  
         *      
         *  **Note:** This method assumes that this transform's basis is  *orthonormal*  (see [method orthonormalized]). If the basis is not orthonormal, `transform.affine_inverse().basis_xform(vector)` should be used instead (see [method affine_inverse]).  
         */
        basisXformInv(v: Vector2): Vector2
        
        /** Returns the result of the linear interpolation between this transform and [param xform] by the given [param weight].  
         *  The [param weight] should be between `0.0` and `1.0` (inclusive). Values outside this range are allowed and can be used to perform  *extrapolation*  instead.  
         */
        interpolateWith(xform: Transform2D, weight: float64): Transform2D
        
        /** Returns `true` if this transform's basis is conformal. A conformal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *uniform*  (the axes share the same length). This method can be especially useful during physics calculations. */
        isConformal(): boolean
        
        /** Returns `true` if this transform and [param xform] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(xform: Transform2D): boolean
        
        /** Returns `true` if this transform is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns a copy of the transform rotated such that the rotated X-axis points towards the [param target] position, in global space. */
        lookingAt(target?: Vector2 /* = Vector2.ZERO */): Transform2D
        static MULTIPLY(left: Transform2D, right: Transform2D): Transform2D
        static MULTIPLY(left: Transform2D, right: float64): Transform2D
        static MULTIPLY(left: Transform2D, right: Vector2): Vector2
        static MULTIPLY(left: Vector2, right: Transform2D): Vector2
        static MULTIPLY(left: Transform2D, right: Rect2): Rect2
        static MULTIPLY(left: Rect2, right: Transform2D): Rect2
        static MULTIPLY(left: Transform2D, right: PackedVector2Array | Vector2[]): PackedVector2Array
        static MULTIPLY(left: PackedVector2Array | Vector2[], right: Transform2D): PackedVector2Array
        static EQUAL(left: Transform2D, right: Transform2D): boolean
        static NOT_EQUAL(left: Transform2D, right: Transform2D): boolean
        get x(): Vector2
        set x(value: Vector2)
        get y(): Vector2
        set y(value: Vector2)
        get origin(): Vector2
        set origin(value: Vector2)
    }
    namespace Vector4 {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
            AxisZ = 2,
            AxisW = 3,
        }
    }
    /** A 4D vector using floating-point coordinates.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_vector4.html  
     */
    class Vector4 {
        /** Zero vector, a vector with all components set to `0`. */
        static readonly ZERO: Readonly<Vector4>
        
        /** One vector, a vector with all components set to `1`. */
        static readonly ONE: Readonly<Vector4>
        
        /** Infinity vector, a vector with all components set to [constant @GDScript.INF]. */
        static readonly INF: Readonly<Vector4>
        constructor()
        constructor(from: Vector4)
        constructor(from: Vector4I)
        constructor(x: float64, y: float64, z: float64, w: float64)
        
        /** Returns the axis of the vector's lowest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_W]. */
        minAxisIndex(): int64
        
        /** Returns the axis of the vector's highest value. See `AXIS_*` constants. If all components are equal, this method returns [constant AXIS_X]. */
        maxAxisIndex(): int64
        
        /** Returns the length (magnitude) of this vector. */
        length(): float64
        
        /** Returns the squared length (squared magnitude) of this vector.  
         *  This method runs faster than [method length], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        lengthSquared(): float64
        
        /** Returns a new vector with all components in absolute values (i.e. positive). */
        abs(): Vector4
        
        /** Returns a new vector with each component set to `1.0` if it's positive, `-1.0` if it's negative, and `0.0` if it's zero. The result is identical to calling [method @GlobalScope.sign] on each component. */
        sign(): Vector4
        
        /** Returns a new vector with all components rounded down (towards negative infinity). */
        floor(): Vector4
        
        /** Returns a new vector with all components rounded up (towards positive infinity). */
        ceil(): Vector4
        
        /** Returns a new vector with all components rounded to the nearest integer, with halfway cases rounded away from zero. */
        round(): Vector4
        
        /** Returns the result of the linear interpolation between this vector and [param to] by amount [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        lerp(to: Vector4, weight: float64): Vector4
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation. */
        cubicInterpolate(b: Vector4, preA: Vector4, postB: Vector4, weight: float64): Vector4
        
        /** Performs a cubic interpolation between this vector and [param b] using [param pre_a] and [param post_b] as handles, and returns the result at position [param weight]. [param weight] is on the range of `0.0` to `1.0`, representing the amount of interpolation.  
         *  It can perform smoother interpolation than [method cubic_interpolate] by the time values.  
         */
        cubicInterpolateInTime(b: Vector4, preA: Vector4, postB: Vector4, weight: float64, bT: float64, preAT: float64, postBT: float64): Vector4
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param mod]. */
        posmod(mod: float64): Vector4
        
        /** Returns a vector composed of the [method @GlobalScope.fposmod] of this vector's components and [param modv]'s components. */
        posmodv(modv: Vector4): Vector4
        
        /** Returns a new vector with each component snapped to the nearest multiple of the corresponding component in [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snapped(step: Vector4): Vector4
        
        /** Returns a new vector with each component snapped to the nearest multiple of [param step]. This can also be used to round the components to an arbitrary number of decimals. */
        snappedf(step: float64): Vector4
        
        /** Returns a new vector with all components clamped between the components of [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clamp(min: Vector4, max: Vector4): Vector4
        
        /** Returns a new vector with all components clamped between [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clampf(min: float64, max: float64): Vector4
        
        /** Returns the result of scaling the vector to unit length. Equivalent to `v / v.length()`. Returns `(0, 0, 0, 0)` if `v.length() == 0`. See also [method is_normalized].  
         *      
         *  **Note:** This function may return incorrect values if the input vector length is near zero.  
         */
        normalized(): Vector4
        
        /** Returns `true` if the vector is normalized, i.e. its length is approximately equal to 1. */
        isNormalized(): boolean
        
        /** Returns the normalized vector pointing from this vector to [param to].  
         *  `a.direction_to(b)` is equivalent to `(b - a).normalized()`. See also [method normalized].  
         */
        directionTo(to: Vector4): Vector4
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to]. */
        distanceTo(to: Vector4): float64
        
        /** Returns the squared [url=https://en.wikipedia.org/wiki/Euclidean_distance]Euclidean distance[/url] between this vector and [param to].  
         *  This method runs faster than [method distance_to], so prefer it if you need to compare vectors or need the squared distance for some formula.  
         */
        distanceSquaredTo(to: Vector4): float64
        
        /** Returns the dot product of this vector and [param with]. */
        dot(with_: Vector4): float64
        
        /** Returns the inverse of the vector. This is the same as `Vector4(1.0 / v.x, 1.0 / v.y, 1.0 / v.z, 1.0 / v.w)`. */
        inverse(): Vector4
        
        /** Returns `true` if this vector and [param to] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(to: Vector4): boolean
        
        /** Returns `true` if this vector's values are approximately zero, by running [method @GlobalScope.is_zero_approx] on each component.  
         *  This method is faster than using [method is_equal_approx] with one value as a zero vector.  
         */
        isZeroApprox(): boolean
        
        /** Returns `true` if this vector is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector4(minf(x, with.x), minf(y, with.y), minf(z, with.z), minf(w, with.w))`. */
        min(with_: Vector4): Vector4
        
        /** Returns the component-wise minimum of this and [param with], equivalent to `Vector4(minf(x, with), minf(y, with), minf(z, with), minf(w, with))`. */
        minf(with_: float64): Vector4
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector4(maxf(x, with.x), maxf(y, with.y), maxf(z, with.z), maxf(w, with.w))`. */
        max(with_: Vector4): Vector4
        
        /** Returns the component-wise maximum of this and [param with], equivalent to `Vector4(maxf(x, with), maxf(y, with), maxf(z, with), maxf(w, with))`. */
        maxf(with_: float64): Vector4
        static ADD(left: Vector4, right: Vector4): Vector4
        static SUBTRACT(left: Vector4, right: Vector4): Vector4
        static MULTIPLY(left: float64, right: Vector4): Vector4
        static MULTIPLY(left: Vector4, right: Vector4): Vector4
        static MULTIPLY(left: Vector4, right: float64): Vector4
        static DIVIDE(left: Vector4, right: Vector4): Vector4
        static DIVIDE(left: Vector4, right: float64): Vector4
        static NEGATE(left: Vector4): Vector4
        static EQUAL(left: Vector4, right: Vector4): boolean
        static NOT_EQUAL(left: Vector4, right: Vector4): boolean
        static LESS(left: Vector4, right: Vector4): boolean
        static LESS_EQUAL(left: Vector4, right: Vector4): boolean
        static GREATER(left: Vector4, right: Vector4): boolean
        static GREATER_EQUAL(left: Vector4, right: Vector4): boolean
        get x(): float64
        set x(value: float64)
        get y(): float64
        set y(value: float64)
        get z(): float64
        set z(value: float64)
        get w(): float64
        set w(value: float64)
    }
    namespace Vector4I {
        enum Axis {
            AxisX = 0,
            AxisY = 1,
            AxisZ = 2,
            AxisW = 3,
        }
    }
    class Vector4I {
        static readonly ZERO: Readonly<Vector4I>
        static readonly ONE: Readonly<Vector4I>
        static readonly MIN: Readonly<Vector4I>
        static readonly MAX: Readonly<Vector4I>
        constructor()
        constructor(from: Vector4I)
        constructor(from: Vector4)
        constructor(x: int64, y: int64, z: int64, w: int64)
        minAxisIndex(): int64
        maxAxisIndex(): int64
        length(): float64
        lengthSquared(): int64
        sign(): Vector4I
        abs(): Vector4I
        clamp(min: Vector4I, max: Vector4I): Vector4I
        clampi(min: int64, max: int64): Vector4I
        snapped(step: Vector4I): Vector4I
        snappedi(step: int64): Vector4I
        min(with_: Vector4I): Vector4I
        mini(with_: int64): Vector4I
        max(with_: Vector4I): Vector4I
        maxi(with_: int64): Vector4I
        distanceTo(to: Vector4I): float64
        distanceSquaredTo(to: Vector4I): int64
        static ADD(left: Vector4I, right: Vector4I): Vector4I
        static SUBTRACT(left: Vector4I, right: Vector4I): Vector4I
        static MULTIPLY(left: float64, right: Vector4I): Vector4I
        static MULTIPLY(left: Vector4I, right: Vector4I): Vector4I
        static MULTIPLY(left: Vector4I, right: float64): Vector4I
        static DIVIDE(left: Vector4I, right: Vector4I): Vector4I
        static DIVIDE(left: Vector4I, right: float64): Vector4I
        static NEGATE(left: Vector4I): Vector4I
        static EQUAL(left: Vector4I, right: Vector4I): boolean
        static NOT_EQUAL(left: Vector4I, right: Vector4I): boolean
        static LESS(left: Vector4I, right: Vector4I): boolean
        static LESS_EQUAL(left: Vector4I, right: Vector4I): boolean
        static GREATER(left: Vector4I, right: Vector4I): boolean
        static GREATER_EQUAL(left: Vector4I, right: Vector4I): boolean
        get x(): int64
        set x(value: int64)
        get y(): int64
        set y(value: int64)
        get z(): int64
        set z(value: int64)
        get w(): int64
        set w(value: int64)
    }
    /** A plane in Hessian normal form.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_plane.html  
     */
    class Plane {
        /** A plane that extends in the Y and Z axes (normal vector points +X). */
        static readonly PLANE_YZ: Readonly<Plane>
        
        /** A plane that extends in the X and Z axes (normal vector points +Y). */
        static readonly PLANE_XZ: Readonly<Plane>
        
        /** A plane that extends in the X and Y axes (normal vector points +Z). */
        static readonly PLANE_XY: Readonly<Plane>
        constructor()
        constructor(from: Plane)
        constructor(normal: Vector3)
        constructor(normal: Vector3, d: float64)
        constructor(normal: Vector3, point: Vector3)
        constructor(point1: Vector3, point2: Vector3, point3: Vector3)
        constructor(a: float64, b: float64, c: float64, d: float64)
        
        /** Returns a copy of the plane, with normalized [member normal] (so it's a unit vector). Returns `Plane(0, 0, 0, 0)` if [member normal] can't be normalized (it has zero length). */
        normalized(): Plane
        
        /** Returns the center of the plane. */
        getCenter(): Vector3
        
        /** Returns `true` if this plane and [param to_plane] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(toPlane: Plane): boolean
        
        /** Returns `true` if this plane is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns `true` if [param point] is located above the plane. */
        isPointOver(point: Vector3): boolean
        
        /** Returns the shortest distance from the plane to the position [param point]. If the point is above the plane, the distance will be positive. If below, the distance will be negative. */
        distanceTo(point: Vector3): float64
        
        /** Returns `true` if [param point] is inside the plane. Comparison uses a custom minimum [param tolerance] threshold. */
        hasPoint(point: Vector3, tolerance?: float64 /* = 0.00001 */): boolean
        
        /** Returns the orthogonal projection of [param point] into a point in the plane. */
        project(point: Vector3): Vector3
        
        /** Returns the intersection point of the three planes [param b], [param c] and this plane. If no intersection is found, `null` is returned. */
        intersect3(b: Plane, c: Plane): any
        
        /** Returns the intersection point of a ray consisting of the position [param from] and the direction normal [param dir] with this plane. If no intersection is found, `null` is returned. */
        intersectsRay(from: Vector3, dir: Vector3): any
        
        /** Returns the intersection point of a segment from position [param from] to position [param to] with this plane. If no intersection is found, `null` is returned. */
        intersectsSegment(from: Vector3, to: Vector3): any
        static NEGATE(left: Plane): Plane
        static EQUAL(left: Plane, right: Plane): boolean
        static NOT_EQUAL(left: Plane, right: Plane): boolean
        get x(): float64
        set x(value: float64)
        get y(): float64
        set y(value: float64)
        get z(): float64
        set z(value: float64)
        get d(): float64
        set d(value: float64)
        get normal(): Vector3
        set normal(value: Vector3)
    }
    /** A unit quaternion used for representing 3D rotations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_quaternion.html  
     */
    class Quaternion {
        /** The identity quaternion, representing no rotation. This has the same rotation as [constant Basis.IDENTITY].  
         *  If a [Vector3] is rotated (multiplied) by this quaternion, it does not change.  
         *      
         *  **Note:** In GDScript, this constant is equivalent to creating a [constructor Quaternion] without any arguments. It can be used to make your code clearer, and for consistency with C#.  
         */
        static readonly IDENTITY: Readonly<Quaternion>
        constructor()
        constructor(from: Quaternion)
        constructor(from: Basis)
        constructor(axis: Vector3, angle: float64)
        constructor(arcFrom: Vector3, arcTo: Vector3)
        constructor(x: float64, y: float64, z: float64, w: float64)
        
        /** Returns this quaternion's length, also called magnitude. */
        length(): float64
        
        /** Returns this quaternion's length, squared.  
         *      
         *  **Note:** This method is faster than [method length], so prefer it if you only need to compare quaternion lengths.  
         */
        lengthSquared(): float64
        
        /** Returns a copy of this quaternion, normalized so that its length is `1.0`. See also [method is_normalized]. */
        normalized(): Quaternion
        
        /** Returns `true` if this quaternion is normalized. See also [method normalized]. */
        isNormalized(): boolean
        
        /** Returns `true` if this quaternion and [param to] are approximately equal, by calling [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(to: Quaternion): boolean
        
        /** Returns `true` if this quaternion is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        
        /** Returns the inverse version of this quaternion, inverting the sign of every component except [member w]. */
        inverse(): Quaternion
        
        /** Returns the logarithm of this quaternion. Multiplies this quaternion's rotation axis by its rotation angle, and stores the result in the returned quaternion's vector part ([member x], [member y], and [member z]). The returned quaternion's real part ([member w]) is always `0.0`. */
        log(): Quaternion
        
        /** Returns the exponential of this quaternion. The rotation axis of the result is the normalized rotation axis of this quaternion, the angle of the result is the length of the vector part of this quaternion. */
        exp(): Quaternion
        
        /** Returns the angle between this quaternion and [param to]. This is the magnitude of the angle you would need to rotate by to get from one to the other.  
         *      
         *  **Note:** The magnitude of the floating-point error for this method is abnormally high, so methods such as `is_zero_approx` will not work reliably.  
         */
        angleTo(to: Quaternion): float64
        
        /** Returns the dot product between this quaternion and [param with].  
         *  This is equivalent to `(quat.x * with.x) + (quat.y * with.y) + (quat.z * with.z) + (quat.w * with.w)`.  
         */
        dot(with_: Quaternion): float64
        
        /** Performs a spherical-linear interpolation with the [param to] quaternion, given a [param weight] and returns the result. Both this quaternion and [param to] must be normalized. */
        slerp(to: Quaternion, weight: float64): Quaternion
        
        /** Performs a spherical-linear interpolation with the [param to] quaternion, given a [param weight] and returns the result. Unlike [method slerp], this method does not check if the rotation path is smaller than 90 degrees. Both this quaternion and [param to] must be normalized. */
        slerpni(to: Quaternion, weight: float64): Quaternion
        
        /** Performs a spherical cubic interpolation between quaternions [param pre_a], this quaternion, [param b], and [param post_b], by the given amount [param weight]. */
        sphericalCubicInterpolate(b: Quaternion, preA: Quaternion, postB: Quaternion, weight: float64): Quaternion
        
        /** Performs a spherical cubic interpolation between quaternions [param pre_a], this quaternion, [param b], and [param post_b], by the given amount [param weight].  
         *  It can perform smoother interpolation than [method spherical_cubic_interpolate] by the time values.  
         */
        sphericalCubicInterpolateInTime(b: Quaternion, preA: Quaternion, postB: Quaternion, weight: float64, bT: float64, preAT: float64, postBT: float64): Quaternion
        
        /** Returns this quaternion's rotation as a [Vector3] of [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians.  
         *  The order of each consecutive rotation can be changed with [param order] (see [enum EulerOrder] constants). In Godot, Euler angles always use intrinsic order. By default, the intrinsic YXZ convention is used ([constant EULER_ORDER_YXZ]): since we are decomposing, local Z (roll) is calculated first, then local X (pitch), and lastly local Y (yaw). When using the opposite method [method from_euler] to compose a rotation, this order is reversed.  
         */
        getEuler(order?: int64 /* = 2 */): Vector3
        
        /** Constructs a new [Quaternion] from the given [Vector3] of [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians. In Godot, Euler angles always use intrinsic order. This method always uses the intrinsic YXZ convention ([constant EULER_ORDER_YXZ]). */
        static fromEuler(euler: Vector3): Quaternion
        
        /** Returns the rotation axis of the rotation represented by this quaternion. */
        getAxis(): Vector3
        
        /** Returns the angle of the rotation represented by this quaternion.  
         *      
         *  **Note:** The quaternion must be normalized.  
         */
        getAngle(): float64
        static ADD(left: Quaternion, right: Quaternion): Quaternion
        static SUBTRACT(left: Quaternion, right: Quaternion): Quaternion
        static MULTIPLY(left: Quaternion, right: Quaternion): Quaternion
        static MULTIPLY(left: Quaternion, right: float64): Quaternion
        static MULTIPLY(left: float64, right: Quaternion): Quaternion
        static MULTIPLY(left: Vector3, right: Quaternion): Vector3
        static MULTIPLY(left: Quaternion, right: Vector3): Vector3
        static DIVIDE(left: Quaternion, right: float64): Quaternion
        static NEGATE(left: Quaternion): Quaternion
        static EQUAL(left: Quaternion, right: Quaternion): boolean
        static NOT_EQUAL(left: Quaternion, right: Quaternion): boolean
        get x(): float64
        set x(value: float64)
        get y(): float64
        set y(value: float64)
        get z(): float64
        set z(value: float64)
        get w(): float64
        set w(value: float64)
    }
    class Aabb {
        constructor()
        constructor(from: Aabb)
        constructor(position: Vector3, size: Vector3)
        abs(): Aabb
        getCenter(): Vector3
        getVolume(): float64
        hasVolume(): boolean
        hasSurface(): boolean
        hasPoint(point: Vector3): boolean
        isEqualApprox(aabb: Aabb): boolean
        isFinite(): boolean
        intersects(with_: Aabb): boolean
        encloses(with_: Aabb): boolean
        intersectsPlane(plane: Plane): boolean
        intersection(with_: Aabb): Aabb
        merge(with_: Aabb): Aabb
        expand(toPoint: Vector3): Aabb
        grow(by: float64): Aabb
        getSupport(direction: Vector3): Vector3
        getLongestAxis(): Vector3
        getLongestAxisIndex(): int64
        getLongestAxisSize(): float64
        getShortestAxis(): Vector3
        getShortestAxisIndex(): int64
        getShortestAxisSize(): float64
        getEndpoint(idx: int64): Vector3
        intersectsSegment(from: Vector3, to: Vector3): any
        intersectsRay(from: Vector3, dir: Vector3): any
        static EQUAL(left: Aabb, right: Aabb): boolean
        static NOT_EQUAL(left: Aabb, right: Aabb): boolean
        get position(): Vector3
        set position(value: Vector3)
        get size(): Vector3
        set size(value: Vector3)
        get end(): Vector3
        set end(value: Vector3)
    }
    /** A 3×3 matrix for representing 3D rotation and scale.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_basis.html  
     */
    class Basis {
        /** The identity [Basis]. This is an orthonormal basis with no rotation, no shear, and a scale of [constant Vector3.ONE]. This also means that:  
         *  - The [member x] points right ([constant Vector3.RIGHT]);  
         *  - The [member y] points up ([constant Vector3.UP]);  
         *  - The [member z] points back ([constant Vector3.BACK]).  
         *    
         *  If a [Vector3] or another [Basis] is transformed (multiplied) by this constant, no transformation occurs.  
         *      
         *  **Note:** In GDScript, this constant is equivalent to creating a [constructor Basis] without any arguments. It can be used to make your code clearer, and for consistency with C#.  
         */
        static readonly IDENTITY: Readonly<Basis>
        
        /** When any basis is multiplied by [constant FLIP_X], it negates all components of the [member x] axis (the X column).  
         *  When [constant FLIP_X] is multiplied by any basis, it negates the [member Vector3.x] component of all axes (the X row).  
         */
        static readonly FLIP_X: Readonly<Basis>
        
        /** When any basis is multiplied by [constant FLIP_Y], it negates all components of the [member y] axis (the Y column).  
         *  When [constant FLIP_Y] is multiplied by any basis, it negates the [member Vector3.y] component of all axes (the Y row).  
         */
        static readonly FLIP_Y: Readonly<Basis>
        
        /** When any basis is multiplied by [constant FLIP_Z], it negates all components of the [member z] axis (the Z column).  
         *  When [constant FLIP_Z] is multiplied by any basis, it negates the [member Vector3.z] component of all axes (the Z row).  
         */
        static readonly FLIP_Z: Readonly<Basis>
        constructor()
        constructor(from: Basis)
        constructor(from: Quaternion)
        constructor(axis: Vector3, angle: float64)
        constructor(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3)
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Invertible_matrix]inverse of this basis's matrix[/url]. */
        inverse(): Basis
        
        /** Returns the transposed version of this basis. This turns the basis matrix's columns into rows, and its rows into columns.  
         *    
         */
        transposed(): Basis
        
        /** Returns the orthonormalized version of this basis. An orthonormal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *normalized*  (the axes have a length of `1.0`), which also means it can only represent a rotation.  
         *  It is often useful to call this method to avoid rounding errors on a rotating basis:  
         *    
         */
        orthonormalized(): Basis
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Determinant]determinant[/url] of this basis's matrix. For advanced math, this number can be used to determine a few attributes:  
         *  - If the determinant is exactly `0.0`, the basis is not invertible (see [method inverse]).  
         *  - If the determinant is a negative number, the basis represents a negative scale.  
         *      
         *  **Note:** If the basis's scale is the same for every axis, its determinant is always that scale by the power of 3.  
         */
        determinant(): float64
        
        /** Returns a copy of this basis rotated around the given [param axis] by the given [param angle] (in radians).  
         *  The [param axis] must be a normalized vector (see [method Vector3.normalized]). If [param angle] is positive, the basis is rotated counter-clockwise around the axis.  
         *    
         */
        rotated(axis: Vector3, angle: float64): Basis
        
        /** Returns this basis with each axis's components scaled by the given [param scale]'s components.  
         *  The basis matrix's rows are multiplied by [param scale]'s components. This operation is a global scale (relative to the parent).  
         *    
         */
        scaled(scale: Vector3): Basis
        
        /** Returns this basis with each axis scaled by the corresponding component in the given [param scale].  
         *  The basis matrix's columns are multiplied by [param scale]'s components. This operation is a local scale (relative to self).  
         *    
         */
        scaledLocal(scale: Vector3): Basis
        
        /** Returns the length of each axis of this basis, as a [Vector3]. If the basis is not sheared, this value is the scaling factor. It is not affected by rotation.  
         *    
         *      
         *  **Note:** If the value returned by [method determinant] is negative, the scale is also negative.  
         */
        getScale(): Vector3
        
        /** Returns this basis's rotation as a [Vector3] of [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians. For the returned value:  
         *  - The [member Vector3.x] contains the angle around the [member x] axis (pitch);  
         *  - The [member Vector3.y] contains the angle around the [member y] axis (yaw);  
         *  - The [member Vector3.z] contains the angle around the [member z] axis (roll).  
         *  The order of each consecutive rotation can be changed with [param order] (see [enum EulerOrder] constants). In Godot, Euler angles always use intrinsic order. By default, the intrinsic YXZ convention is used ([constant EULER_ORDER_YXZ]): since we are decomposing, local Z (roll) is calculated first, then local X (pitch), and lastly local Y (yaw). When using the opposite method [method from_euler] to compose a rotation, this order is reversed.  
         *      
         *  **Note:** For this method to return correctly, the basis needs to be  *orthonormal*  (see [method orthonormalized]).  
         *      
         *  **Note:** Euler angles are much more intuitive but are not suitable for 3D math. Because of this, consider using the [method get_rotation_quaternion] method instead, which returns a [Quaternion].  
         *      
         *  **Note:** In the Inspector dock, a basis's rotation is often displayed in Euler angles (in degrees), as is the case with the [member Node3D.rotation] property.  
         */
        getEuler(order?: int64 /* = 2 */): Vector3
        
        /** Returns the transposed dot product between [param with] and the [member x] axis (see [method transposed]).  
         *  This is equivalent to `basis.x.dot(vector)`.  
         */
        tdotx(with_: Vector3): float64
        
        /** Returns the transposed dot product between [param with] and the [member y] axis (see [method transposed]).  
         *  This is equivalent to `basis.y.dot(vector)`.  
         */
        tdoty(with_: Vector3): float64
        
        /** Returns the transposed dot product between [param with] and the [member z] axis (see [method transposed]).  
         *  This is equivalent to `basis.z.dot(vector)`.  
         */
        tdotz(with_: Vector3): float64
        
        /** Performs a spherical-linear interpolation with the [param to] basis, given a [param weight]. Both this basis and [param to] should represent a rotation.  
         *  **Example:** Smoothly rotate a [Node3D] to the target basis over time, with a [Tween]:  
         *    
         */
        slerp(to: Basis, weight: float64): Basis
        
        /** Returns `true` if this basis is conformal. A conformal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *uniform*  (the axes share the same length). This method can be especially useful during physics calculations. */
        isConformal(): boolean
        
        /** Returns `true` if this basis and [param b] are approximately equal, by calling [method @GlobalScope.is_equal_approx] on all vector components. */
        isEqualApprox(b: Basis): boolean
        
        /** Returns `true` if this basis is finite, by calling [method @GlobalScope.is_finite] on all vector components. */
        isFinite(): boolean
        
        /** Returns `true` if this basis is orthonormal. An orthonormal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *normalized*  (the length of every axis is `1.0`). This method can be especially useful during physics calculations. */
        isOrthonormal(): boolean
        
        /** Returns this basis's rotation as a [Quaternion].  
         *      
         *  **Note:** Quaternions are much more suitable for 3D math but are less intuitive. For user interfaces, consider using the [method get_euler] method, which returns Euler angles.  
         */
        getRotationQuaternion(): Quaternion
        
        /** Creates a new [Basis] with a rotation such that the forward axis (-Z) points towards the [param target] position.  
         *  By default, the -Z axis (camera forward) is treated as forward (implies +X is right). If [param use_model_front] is `true`, the +Z axis (asset front) is treated as forward (implies +X is left) and points toward the [param target] position.  
         *  The up axis (+Y) points as close to the [param up] vector as possible while staying perpendicular to the forward axis. The returned basis is orthonormalized (see [method orthonormalized]).  
         *  The [param target] and the [param up] cannot be [constant Vector3.ZERO], and shouldn't be colinear to avoid unintended rotation around local Z axis.  
         */
        static lookingAt(target: Vector3, up?: Vector3 /* = Vector3.ZERO */, useModelFront?: boolean /* = false */): Basis
        
        /** Constructs a new [Basis] that only represents scale, with no rotation or shear, from the given [param scale] vector.  
         *    
         *      
         *  **Note:** In linear algebra, the matrix of this basis is also known as a [url=https://en.wikipedia.org/wiki/Diagonal_matrix]diagonal matrix[/url].  
         */
        static fromScale(scale: Vector3): Basis
        
        /** Constructs a new [Basis] that only represents rotation from the given [Vector3] of [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians.  
         *  - The [member Vector3.x] should contain the angle around the [member x] axis (pitch);  
         *  - The [member Vector3.y] should contain the angle around the [member y] axis (yaw);  
         *  - The [member Vector3.z] should contain the angle around the [member z] axis (roll).  
         *    
         *  The order of each consecutive rotation can be changed with [param order] (see [enum EulerOrder] constants). In Godot, Euler angles always use intrinsic order. By default, the intrinsic YXZ convention is used ([constant EULER_ORDER_YXZ]): the basis rotates first around the local Y axis (yaw), then local X (pitch), and lastly local Z (roll). When using the opposite method [method get_euler] to decompose a rotation, this order is reversed.  
         */
        static fromEuler(euler: Vector3, order?: int64 /* = 2 */): Basis
        static MULTIPLY(left: Basis, right: Basis): Basis
        static MULTIPLY(left: Basis, right: float64): Basis
        static MULTIPLY(left: Basis, right: Vector3): Vector3
        static MULTIPLY(left: Vector3, right: Basis): Vector3
        static EQUAL(left: Basis, right: Basis): boolean
        static NOT_EQUAL(left: Basis, right: Basis): boolean
        get x(): Vector3
        set x(value: Vector3)
        get y(): Vector3
        set y(value: Vector3)
        get z(): Vector3
        set z(value: Vector3)
    }
    /** A 3×4 matrix representing a 3D transformation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_transform3d.html  
     */
    class Transform3D {
        /** The identity [Transform3D]. This is a transform with no translation, no rotation, and a scale of [constant Vector3.ONE]. Its [member basis] is equal to [constant Basis.IDENTITY]. This also means that:  
         *  - Its [member Basis.x] points right ([constant Vector3.RIGHT]);  
         *  - Its [member Basis.y] points up ([constant Vector3.UP]);  
         *  - Its [member Basis.z] points back ([constant Vector3.BACK]).  
         *    
         *  If a [Vector3], an [AABB], a [Plane], a [PackedVector3Array], or another [Transform3D] is transformed (multiplied) by this constant, no transformation occurs.  
         *      
         *  **Note:** In GDScript, this constant is equivalent to creating a [constructor Transform3D] without any arguments. It can be used to make your code clearer, and for consistency with C#.  
         */
        static readonly IDENTITY: Readonly<Transform3D>
        
        /** [Transform3D] with mirroring applied perpendicular to the YZ plane. Its [member basis] is equal to [constant Basis.FLIP_X]. */
        static readonly FLIP_X: Readonly<Transform3D>
        
        /** [Transform3D] with mirroring applied perpendicular to the XZ plane. Its [member basis] is equal to [constant Basis.FLIP_Y]. */
        static readonly FLIP_Y: Readonly<Transform3D>
        
        /** [Transform3D] with mirroring applied perpendicular to the XY plane. Its [member basis] is equal to [constant Basis.FLIP_Z]. */
        static readonly FLIP_Z: Readonly<Transform3D>
        constructor()
        constructor(from: Transform3D)
        constructor(basis: Basis, origin: Vector3)
        constructor(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3, origin: Vector3)
        constructor(from: Projection)
        
        /** Returns the [url=https://en.wikipedia.org/wiki/Invertible_matrix]inverted version of this transform[/url]. See also [method Basis.inverse].  
         *      
         *  **Note:** For this method to return correctly, the transform's [member basis] needs to be  *orthonormal*  (see [method orthonormalized]). That means the basis should only represent a rotation. If it does not, use [method affine_inverse] instead.  
         */
        inverse(): Transform3D
        
        /** Returns the inverted version of this transform. Unlike [method inverse], this method works with almost any [member basis], including non-uniform ones, but is slower. See also [method Basis.inverse].  
         *      
         *  **Note:** For this method to return correctly, the transform's [member basis] needs to have a determinant that is not exactly `0.0` (see [method Basis.determinant]).  
         */
        affineInverse(): Transform3D
        
        /** Returns a copy of this transform with its [member basis] orthonormalized. An orthonormal basis is both  *orthogonal*  (the axes are perpendicular to each other) and  *normalized*  (the axes have a length of `1.0`), which also means it can only represent a rotation. See also [method Basis.orthonormalized]. */
        orthonormalized(): Transform3D
        
        /** Returns a copy of this transform rotated around the given [param axis] by the given [param angle] (in radians).  
         *  The [param axis] must be a normalized vector (see [method Vector3.normalized]). If [param angle] is positive, the basis is rotated counter-clockwise around the axis.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding rotation transform `R` from the left, i.e., `R * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        rotated(axis: Vector3, angle: float64): Transform3D
        
        /** Returns a copy of this transform rotated around the given [param axis] by the given [param angle] (in radians).  
         *  The [param axis] must be a normalized vector in the transform's local coordinate system. For example, to rotate around the local X-axis, use [constant Vector3.RIGHT].  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding rotation transform `R` from the right, i.e., `X * R`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        rotatedLocal(axis: Vector3, angle: float64): Transform3D
        
        /** Returns a copy of this transform scaled by the given [param scale] factor.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding scaling transform `S` from the left, i.e., `S * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        scaled(scale: Vector3): Transform3D
        
        /** Returns a copy of this transform scaled by the given [param scale] factor.  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding scaling transform `S` from the right, i.e., `X * S`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        scaledLocal(scale: Vector3): Transform3D
        
        /** Returns a copy of this transform translated by the given [param offset].  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding translation transform `T` from the left, i.e., `T * X`.  
         *  This can be seen as transforming with respect to the global/parent frame.  
         */
        translated(offset: Vector3): Transform3D
        
        /** Returns a copy of this transform translated by the given [param offset].  
         *  This method is an optimized version of multiplying the given transform `X` with a corresponding translation transform `T` from the right, i.e., `X * T`.  
         *  This can be seen as transforming with respect to the local frame.  
         */
        translatedLocal(offset: Vector3): Transform3D
        
        /** Returns a copy of this transform rotated so that the forward axis (-Z) points towards the [param target] position.  
         *  The up axis (+Y) points as close to the [param up] vector as possible while staying perpendicular to the forward axis. The resulting transform is orthonormalized. The existing rotation, scale, and skew information from the original transform is discarded. The [param target] and [param up] vectors cannot be zero, cannot be parallel to each other, and are defined in global/parent space.  
         *  If [param use_model_front] is `true`, the +Z axis (asset front) is treated as forward (implies +X is left) and points toward the [param target] position. By default, the -Z axis (camera forward) is treated as forward (implies +X is right).  
         */
        lookingAt(target: Vector3, up?: Vector3 /* = Vector3.ZERO */, useModelFront?: boolean /* = false */): Transform3D
        
        /** Returns the result of the linear interpolation between this transform and [param xform] by the given [param weight].  
         *  The [param weight] should be between `0.0` and `1.0` (inclusive). Values outside this range are allowed and can be used to perform  *extrapolation*  instead.  
         */
        interpolateWith(xform: Transform3D, weight: float64): Transform3D
        
        /** Returns `true` if this transform and [param xform] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(xform: Transform3D): boolean
        
        /** Returns `true` if this transform is finite, by calling [method @GlobalScope.is_finite] on each component. */
        isFinite(): boolean
        static MULTIPLY(left: Transform3D, right: Transform3D): Transform3D
        static MULTIPLY(left: Transform3D, right: float64): Transform3D
        static MULTIPLY(left: Transform3D, right: Vector3): Vector3
        static MULTIPLY(left: Vector3, right: Transform3D): Vector3
        static MULTIPLY(left: Transform3D, right: Aabb): Aabb
        static MULTIPLY(left: Aabb, right: Transform3D): Aabb
        static MULTIPLY(left: Transform3D, right: Plane): Plane
        static MULTIPLY(left: Plane, right: Transform3D): Plane
        static MULTIPLY(left: Transform3D, right: PackedVector3Array | Vector3[]): PackedVector3Array
        static MULTIPLY(left: PackedVector3Array | Vector3[], right: Transform3D): PackedVector3Array
        static EQUAL(left: Transform3D, right: Transform3D): boolean
        static NOT_EQUAL(left: Transform3D, right: Transform3D): boolean
        get basis(): Basis
        set basis(value: Basis)
        get origin(): Vector3
        set origin(value: Vector3)
    }
    namespace Projection {
        enum Planes {
            PlaneNear = 0,
            PlaneFar = 1,
            PlaneLeft = 2,
            PlaneTop = 3,
            PlaneRight = 4,
            PlaneBottom = 5,
        }
    }
    /** A 4×4 matrix for 3D projective transformations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_projection.html  
     */
    class Projection {
        /** A [Projection] with no transformation defined. When applied to other data structures, no transformation is performed. */
        static readonly IDENTITY: Readonly<Projection>
        
        /** A [Projection] with all values initialized to 0. When applied to other data structures, they will be zeroed. */
        static readonly ZERO: Readonly<Projection>
        constructor()
        constructor(from: Projection)
        constructor(from: Transform3D)
        constructor(xAxis: Vector4, yAxis: Vector4, zAxis: Vector4, wAxis: Vector4)
        
        /** Creates a new [Projection] that projects positions from a depth range of `-1` to `1` to one that ranges from `0` to `1`, and flips the projected positions vertically, according to [param flip_y]. */
        static createDepthCorrection(flipY: boolean): Projection
        
        /** Creates a new [Projection] that projects positions into the given [Rect2]. */
        static createLightAtlasRect(rect: Rect2): Projection
        
        /** Creates a new [Projection] that projects positions using a perspective projection with the given Y-axis field of view (in degrees), X:Y aspect ratio, and clipping planes.  
         *  [param flip_fov] determines whether the projection's field of view is flipped over its diagonal.  
         */
        static createPerspective(fovy: float64, aspect: float64, zNear: float64, zFar: float64, flipFov?: boolean /* = false */): Projection
        
        /** Creates a new [Projection] that projects positions using a perspective projection with the given Y-axis field of view (in degrees), X:Y aspect ratio, and clipping distances. The projection is adjusted for a head-mounted display with the given distance between eyes and distance to a point that can be focused on.  
         *  [param eye] creates the projection for the left eye when set to 1, or the right eye when set to 2.  
         *  [param flip_fov] determines whether the projection's field of view is flipped over its diagonal.  
         */
        static createPerspectiveHmd(fovy: float64, aspect: float64, zNear: float64, zFar: float64, flipFov: boolean, eye: int64, intraocularDist: float64, convergenceDist: float64): Projection
        
        /** Creates a new [Projection] for projecting positions onto a head-mounted display with the given X:Y aspect ratio, distance between eyes, display width, distance to lens, oversampling factor, and depth clipping planes.  
         *  [param eye] creates the projection for the left eye when set to 1, or the right eye when set to 2.  
         */
        static createForHmd(eye: int64, aspect: float64, intraocularDist: float64, displayWidth: float64, displayToLens: float64, oversample: float64, zNear: float64, zFar: float64): Projection
        
        /** Creates a new [Projection] that projects positions using an orthogonal projection with the given clipping planes. */
        static createOrthogonal(left: float64, right: float64, bottom: float64, top: float64, zNear: float64, zFar: float64): Projection
        
        /** Creates a new [Projection] that projects positions using an orthogonal projection with the given size, X:Y aspect ratio, and clipping planes.  
         *  [param flip_fov] determines whether the projection's field of view is flipped over its diagonal.  
         */
        static createOrthogonalAspect(size: float64, aspect: float64, zNear: float64, zFar: float64, flipFov?: boolean /* = false */): Projection
        
        /** Creates a new [Projection] that projects positions in a frustum with the given clipping planes. */
        static createFrustum(left: float64, right: float64, bottom: float64, top: float64, zNear: float64, zFar: float64): Projection
        
        /** Creates a new [Projection] that projects positions in a frustum with the given size, X:Y aspect ratio, offset, and clipping planes.  
         *  [param flip_fov] determines whether the projection's field of view is flipped over its diagonal.  
         */
        static createFrustumAspect(size: float64, aspect: float64, offset: Vector2, zNear: float64, zFar: float64, flipFov?: boolean /* = false */): Projection
        
        /** Creates a new [Projection] that scales a given projection to fit around a given [AABB] in projection space. */
        static createFitAabb(aabb: Aabb): Projection
        
        /** Returns a scalar value that is the signed factor by which areas are scaled by this matrix. If the sign is negative, the matrix flips the orientation of the area.  
         *  The determinant can be used to calculate the invertibility of a matrix or solve linear systems of equations involving the matrix, among other applications.  
         */
        determinant(): float64
        
        /** Returns a [Projection] with the near clipping distance adjusted to be [param new_znear].  
         *      
         *  **Note:** The original [Projection] must be a perspective projection.  
         */
        perspectiveZnearAdjusted(newZnear: float64): Projection
        
        /** Returns the clipping plane of this [Projection] whose index is given by [param plane].  
         *  [param plane] should be equal to one of [constant PLANE_NEAR], [constant PLANE_FAR], [constant PLANE_LEFT], [constant PLANE_TOP], [constant PLANE_RIGHT], or [constant PLANE_BOTTOM].  
         */
        getProjectionPlane(plane: int64): Plane
        
        /** Returns a copy of this [Projection] with the signs of the values of the Y column flipped. */
        flippedY(): Projection
        
        /** Returns a [Projection] with the X and Y values from the given [Vector2] added to the first and second values of the final column respectively. */
        jitterOffseted(offset: Vector2): Projection
        
        /** Returns the vertical field of view of the projection (in degrees) associated with the given horizontal field of view (in degrees) and aspect ratio.  
         *      
         *  **Note:** Unlike most methods of [Projection], [param aspect] is expected to be 1 divided by the X:Y aspect ratio.  
         */
        static getFovy(fovx: float64, aspect: float64): float64
        
        /** Returns the distance for this [Projection] beyond which positions are clipped. */
        getZFar(): float64
        
        /** Returns the distance for this [Projection] before which positions are clipped. */
        getZNear(): float64
        
        /** Returns the X:Y aspect ratio of this [Projection]'s viewport. */
        getAspect(): float64
        
        /** Returns the horizontal field of view of the projection (in degrees). */
        getFov(): float64
        
        /** Returns `true` if this [Projection] performs an orthogonal projection. */
        isOrthogonal(): boolean
        
        /** Returns the dimensions of the viewport plane that this [Projection] projects positions onto, divided by two. */
        getViewportHalfExtents(): Vector2
        
        /** Returns the dimensions of the far clipping plane of the projection, divided by two. */
        getFarPlaneHalfExtents(): Vector2
        
        /** Returns a [Projection] that performs the inverse of this [Projection]'s projective transformation. */
        inverse(): Projection
        
        /** Returns [param for_pixel_width] divided by the viewport's width measured in meters on the near plane, after this [Projection] is applied. */
        getPixelsPerMeter(forPixelWidth: int64): int64
        
        /** Returns the factor by which the visible level of detail is scaled by this [Projection]. */
        getLodMultiplier(): float64
        static MULTIPLY(left: Projection, right: Projection): Projection
        static MULTIPLY(left: Projection, right: Vector4): Vector4
        static MULTIPLY(left: Vector4, right: Projection): Vector4
        static EQUAL(left: Projection, right: Projection): boolean
        static NOT_EQUAL(left: Projection, right: Projection): boolean
        get x(): Vector4
        set x(value: Vector4)
        get y(): Vector4
        set y(value: Vector4)
        get z(): Vector4
        set z(value: Vector4)
        get w(): Vector4
        set w(value: Vector4)
    }
    /** A color represented in RGBA format.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_color.html  
     */
    class Color {
        /** Alice blue color. */
        static readonly ALICE_BLUE: Readonly<Color>
        
        /** Antique white color. */
        static readonly ANTIQUE_WHITE: Readonly<Color>
        
        /** Aqua color. */
        static readonly AQUA: Readonly<Color>
        
        /** Aquamarine color. */
        static readonly AQUAMARINE: Readonly<Color>
        
        /** Azure color. */
        static readonly AZURE: Readonly<Color>
        
        /** Beige color. */
        static readonly BEIGE: Readonly<Color>
        
        /** Bisque color. */
        static readonly BISQUE: Readonly<Color>
        
        /** Black color. In GDScript, this is the default value of any color. */
        static readonly BLACK: Readonly<Color>
        
        /** Blanched almond color. */
        static readonly BLANCHED_ALMOND: Readonly<Color>
        
        /** Blue color. */
        static readonly BLUE: Readonly<Color>
        
        /** Blue violet color. */
        static readonly BLUE_VIOLET: Readonly<Color>
        
        /** Brown color. */
        static readonly BROWN: Readonly<Color>
        
        /** Burlywood color. */
        static readonly BURLYWOOD: Readonly<Color>
        
        /** Cadet blue color. */
        static readonly CADET_BLUE: Readonly<Color>
        
        /** Chartreuse color. */
        static readonly CHARTREUSE: Readonly<Color>
        
        /** Chocolate color. */
        static readonly CHOCOLATE: Readonly<Color>
        
        /** Coral color. */
        static readonly CORAL: Readonly<Color>
        
        /** Cornflower blue color. */
        static readonly CORNFLOWER_BLUE: Readonly<Color>
        
        /** Cornsilk color. */
        static readonly CORNSILK: Readonly<Color>
        
        /** Crimson color. */
        static readonly CRIMSON: Readonly<Color>
        
        /** Cyan color. */
        static readonly CYAN: Readonly<Color>
        
        /** Dark blue color. */
        static readonly DARK_BLUE: Readonly<Color>
        
        /** Dark cyan color. */
        static readonly DARK_CYAN: Readonly<Color>
        
        /** Dark goldenrod color. */
        static readonly DARK_GOLDENROD: Readonly<Color>
        
        /** Dark gray color. */
        static readonly DARK_GRAY: Readonly<Color>
        
        /** Dark green color. */
        static readonly DARK_GREEN: Readonly<Color>
        
        /** Dark khaki color. */
        static readonly DARK_KHAKI: Readonly<Color>
        
        /** Dark magenta color. */
        static readonly DARK_MAGENTA: Readonly<Color>
        
        /** Dark olive green color. */
        static readonly DARK_OLIVE_GREEN: Readonly<Color>
        
        /** Dark orange color. */
        static readonly DARK_ORANGE: Readonly<Color>
        
        /** Dark orchid color. */
        static readonly DARK_ORCHID: Readonly<Color>
        
        /** Dark red color. */
        static readonly DARK_RED: Readonly<Color>
        
        /** Dark salmon color. */
        static readonly DARK_SALMON: Readonly<Color>
        
        /** Dark sea green color. */
        static readonly DARK_SEA_GREEN: Readonly<Color>
        
        /** Dark slate blue color. */
        static readonly DARK_SLATE_BLUE: Readonly<Color>
        
        /** Dark slate gray color. */
        static readonly DARK_SLATE_GRAY: Readonly<Color>
        
        /** Dark turquoise color. */
        static readonly DARK_TURQUOISE: Readonly<Color>
        
        /** Dark violet color. */
        static readonly DARK_VIOLET: Readonly<Color>
        
        /** Deep pink color. */
        static readonly DEEP_PINK: Readonly<Color>
        
        /** Deep sky blue color. */
        static readonly DEEP_SKY_BLUE: Readonly<Color>
        
        /** Dim gray color. */
        static readonly DIM_GRAY: Readonly<Color>
        
        /** Dodger blue color. */
        static readonly DODGER_BLUE: Readonly<Color>
        
        /** Firebrick color. */
        static readonly FIREBRICK: Readonly<Color>
        
        /** Floral white color. */
        static readonly FLORAL_WHITE: Readonly<Color>
        
        /** Forest green color. */
        static readonly FOREST_GREEN: Readonly<Color>
        
        /** Fuchsia color. */
        static readonly FUCHSIA: Readonly<Color>
        
        /** Gainsboro color. */
        static readonly GAINSBORO: Readonly<Color>
        
        /** Ghost white color. */
        static readonly GHOST_WHITE: Readonly<Color>
        
        /** Gold color. */
        static readonly GOLD: Readonly<Color>
        
        /** Goldenrod color. */
        static readonly GOLDENROD: Readonly<Color>
        
        /** Gray color. */
        static readonly GRAY: Readonly<Color>
        
        /** Green color. */
        static readonly GREEN: Readonly<Color>
        
        /** Green yellow color. */
        static readonly GREEN_YELLOW: Readonly<Color>
        
        /** Honeydew color. */
        static readonly HONEYDEW: Readonly<Color>
        
        /** Hot pink color. */
        static readonly HOT_PINK: Readonly<Color>
        
        /** Indian red color. */
        static readonly INDIAN_RED: Readonly<Color>
        
        /** Indigo color. */
        static readonly INDIGO: Readonly<Color>
        
        /** Ivory color. */
        static readonly IVORY: Readonly<Color>
        
        /** Khaki color. */
        static readonly KHAKI: Readonly<Color>
        
        /** Lavender color. */
        static readonly LAVENDER: Readonly<Color>
        
        /** Lavender blush color. */
        static readonly LAVENDER_BLUSH: Readonly<Color>
        
        /** Lawn green color. */
        static readonly LAWN_GREEN: Readonly<Color>
        
        /** Lemon chiffon color. */
        static readonly LEMON_CHIFFON: Readonly<Color>
        
        /** Light blue color. */
        static readonly LIGHT_BLUE: Readonly<Color>
        
        /** Light coral color. */
        static readonly LIGHT_CORAL: Readonly<Color>
        
        /** Light cyan color. */
        static readonly LIGHT_CYAN: Readonly<Color>
        
        /** Light goldenrod color. */
        static readonly LIGHT_GOLDENROD: Readonly<Color>
        
        /** Light gray color. */
        static readonly LIGHT_GRAY: Readonly<Color>
        
        /** Light green color. */
        static readonly LIGHT_GREEN: Readonly<Color>
        
        /** Light pink color. */
        static readonly LIGHT_PINK: Readonly<Color>
        
        /** Light salmon color. */
        static readonly LIGHT_SALMON: Readonly<Color>
        
        /** Light sea green color. */
        static readonly LIGHT_SEA_GREEN: Readonly<Color>
        
        /** Light sky blue color. */
        static readonly LIGHT_SKY_BLUE: Readonly<Color>
        
        /** Light slate gray color. */
        static readonly LIGHT_SLATE_GRAY: Readonly<Color>
        
        /** Light steel blue color. */
        static readonly LIGHT_STEEL_BLUE: Readonly<Color>
        
        /** Light yellow color. */
        static readonly LIGHT_YELLOW: Readonly<Color>
        
        /** Lime color. */
        static readonly LIME: Readonly<Color>
        
        /** Lime green color. */
        static readonly LIME_GREEN: Readonly<Color>
        
        /** Linen color. */
        static readonly LINEN: Readonly<Color>
        
        /** Magenta color. */
        static readonly MAGENTA: Readonly<Color>
        
        /** Maroon color. */
        static readonly MAROON: Readonly<Color>
        
        /** Medium aquamarine color. */
        static readonly MEDIUM_AQUAMARINE: Readonly<Color>
        
        /** Medium blue color. */
        static readonly MEDIUM_BLUE: Readonly<Color>
        
        /** Medium orchid color. */
        static readonly MEDIUM_ORCHID: Readonly<Color>
        
        /** Medium purple color. */
        static readonly MEDIUM_PURPLE: Readonly<Color>
        
        /** Medium sea green color. */
        static readonly MEDIUM_SEA_GREEN: Readonly<Color>
        
        /** Medium slate blue color. */
        static readonly MEDIUM_SLATE_BLUE: Readonly<Color>
        
        /** Medium spring green color. */
        static readonly MEDIUM_SPRING_GREEN: Readonly<Color>
        
        /** Medium turquoise color. */
        static readonly MEDIUM_TURQUOISE: Readonly<Color>
        
        /** Medium violet red color. */
        static readonly MEDIUM_VIOLET_RED: Readonly<Color>
        
        /** Midnight blue color. */
        static readonly MIDNIGHT_BLUE: Readonly<Color>
        
        /** Mint cream color. */
        static readonly MINT_CREAM: Readonly<Color>
        
        /** Misty rose color. */
        static readonly MISTY_ROSE: Readonly<Color>
        
        /** Moccasin color. */
        static readonly MOCCASIN: Readonly<Color>
        
        /** Navajo white color. */
        static readonly NAVAJO_WHITE: Readonly<Color>
        
        /** Navy blue color. */
        static readonly NAVY_BLUE: Readonly<Color>
        
        /** Old lace color. */
        static readonly OLD_LACE: Readonly<Color>
        
        /** Olive color. */
        static readonly OLIVE: Readonly<Color>
        
        /** Olive drab color. */
        static readonly OLIVE_DRAB: Readonly<Color>
        
        /** Orange color. */
        static readonly ORANGE: Readonly<Color>
        
        /** Orange red color. */
        static readonly ORANGE_RED: Readonly<Color>
        
        /** Orchid color. */
        static readonly ORCHID: Readonly<Color>
        
        /** Pale goldenrod color. */
        static readonly PALE_GOLDENROD: Readonly<Color>
        
        /** Pale green color. */
        static readonly PALE_GREEN: Readonly<Color>
        
        /** Pale turquoise color. */
        static readonly PALE_TURQUOISE: Readonly<Color>
        
        /** Pale violet red color. */
        static readonly PALE_VIOLET_RED: Readonly<Color>
        
        /** Papaya whip color. */
        static readonly PAPAYA_WHIP: Readonly<Color>
        
        /** Peach puff color. */
        static readonly PEACH_PUFF: Readonly<Color>
        
        /** Peru color. */
        static readonly PERU: Readonly<Color>
        
        /** Pink color. */
        static readonly PINK: Readonly<Color>
        
        /** Plum color. */
        static readonly PLUM: Readonly<Color>
        
        /** Powder blue color. */
        static readonly POWDER_BLUE: Readonly<Color>
        
        /** Purple color. */
        static readonly PURPLE: Readonly<Color>
        
        /** Rebecca purple color. */
        static readonly REBECCA_PURPLE: Readonly<Color>
        
        /** Red color. */
        static readonly RED: Readonly<Color>
        
        /** Rosy brown color. */
        static readonly ROSY_BROWN: Readonly<Color>
        
        /** Royal blue color. */
        static readonly ROYAL_BLUE: Readonly<Color>
        
        /** Saddle brown color. */
        static readonly SADDLE_BROWN: Readonly<Color>
        
        /** Salmon color. */
        static readonly SALMON: Readonly<Color>
        
        /** Sandy brown color. */
        static readonly SANDY_BROWN: Readonly<Color>
        
        /** Sea green color. */
        static readonly SEA_GREEN: Readonly<Color>
        
        /** Seashell color. */
        static readonly SEASHELL: Readonly<Color>
        
        /** Sienna color. */
        static readonly SIENNA: Readonly<Color>
        
        /** Silver color. */
        static readonly SILVER: Readonly<Color>
        
        /** Sky blue color. */
        static readonly SKY_BLUE: Readonly<Color>
        
        /** Slate blue color. */
        static readonly SLATE_BLUE: Readonly<Color>
        
        /** Slate gray color. */
        static readonly SLATE_GRAY: Readonly<Color>
        
        /** Snow color. */
        static readonly SNOW: Readonly<Color>
        
        /** Spring green color. */
        static readonly SPRING_GREEN: Readonly<Color>
        
        /** Steel blue color. */
        static readonly STEEL_BLUE: Readonly<Color>
        
        /** Tan color. */
        static readonly TAN: Readonly<Color>
        
        /** Teal color. */
        static readonly TEAL: Readonly<Color>
        
        /** Thistle color. */
        static readonly THISTLE: Readonly<Color>
        
        /** Tomato color. */
        static readonly TOMATO: Readonly<Color>
        
        /** Transparent color (white with zero alpha). */
        static readonly TRANSPARENT: Readonly<Color>
        
        /** Turquoise color. */
        static readonly TURQUOISE: Readonly<Color>
        
        /** Violet color. */
        static readonly VIOLET: Readonly<Color>
        
        /** Web gray color. */
        static readonly WEB_GRAY: Readonly<Color>
        
        /** Web green color. */
        static readonly WEB_GREEN: Readonly<Color>
        
        /** Web maroon color. */
        static readonly WEB_MAROON: Readonly<Color>
        
        /** Web purple color. */
        static readonly WEB_PURPLE: Readonly<Color>
        
        /** Wheat color. */
        static readonly WHEAT: Readonly<Color>
        
        /** White color. */
        static readonly WHITE: Readonly<Color>
        
        /** White smoke color. */
        static readonly WHITE_SMOKE: Readonly<Color>
        
        /** Yellow color. */
        static readonly YELLOW: Readonly<Color>
        
        /** Yellow green color. */
        static readonly YELLOW_GREEN: Readonly<Color>
        constructor()
        constructor(from: Color)
        constructor(from: Color, alpha: float64)
        constructor(r: float64, g: float64, b: float64)
        constructor(r: float64, g: float64, b: float64, a: float64)
        constructor(code: string)
        constructor(code: string, alpha: float64)
        
        /** Returns the color converted to a 32-bit integer in ARGB format (each component is 8 bits). ARGB is more compatible with DirectX.  
         *    
         */
        toArgb32(): int64
        
        /** Returns the color converted to a 32-bit integer in ABGR format (each component is 8 bits). ABGR is the reversed version of the default RGBA format.  
         *    
         */
        toAbgr32(): int64
        
        /** Returns the color converted to a 32-bit integer in RGBA format (each component is 8 bits). RGBA is Godot's default format. This method is the inverse of [method hex].  
         *    
         */
        toRgba32(): int64
        
        /** Returns the color converted to a 64-bit integer in ARGB format (each component is 16 bits). ARGB is more compatible with DirectX.  
         *    
         */
        toArgb64(): int64
        
        /** Returns the color converted to a 64-bit integer in ABGR format (each component is 16 bits). ABGR is the reversed version of the default RGBA format.  
         *    
         */
        toAbgr64(): int64
        
        /** Returns the color converted to a 64-bit integer in RGBA format (each component is 16 bits). RGBA is Godot's default format. This method is the inverse of [method hex64].  
         *    
         */
        toRgba64(): int64
        
        /** Returns the color converted to an HTML hexadecimal color [String] in RGBA format, without the hash (`#`) prefix.  
         *  Setting [param with_alpha] to `false`, excludes alpha from the hexadecimal string, using RGB format instead of RGBA format.  
         *    
         */
        toHtml(withAlpha?: boolean /* = true */): string
        
        /** Returns a new color with all components clamped between the components of [param min] and [param max], by running [method @GlobalScope.clamp] on each component. */
        clamp(min?: Color /* = new Color(0, 0, 0, 0) */, max?: Color /* = new Color(1, 1, 1, 1) */): Color
        
        /** Returns the color with its [member r], [member g], and [member b] components inverted (`(1 - r, 1 - g, 1 - b, a)`).  
         *    
         */
        inverted(): Color
        
        /** Returns the linear interpolation between this color's components and [param to]'s components. The interpolation factor [param weight] should be between 0.0 and 1.0 (inclusive). See also [method @GlobalScope.lerp].  
         *    
         */
        lerp(to: Color, weight: float64): Color
        
        /** Returns a new color resulting from making this color lighter by the specified [param amount], which should be a ratio from 0.0 to 1.0. See also [method darkened].  
         *    
         */
        lightened(amount: float64): Color
        
        /** Returns a new color resulting from making this color darker by the specified [param amount] (ratio from 0.0 to 1.0). See also [method lightened].  
         *    
         */
        darkened(amount: float64): Color
        
        /** Returns a new color resulting from overlaying this color over the given color. In a painting program, you can imagine it as the [param over] color painted over this color (including alpha).  
         *    
         */
        blend(over: Color): Color
        
        /** Returns the light intensity of the color, as a value between 0.0 and 1.0 (inclusive). This is useful when determining light or dark color. Colors with a luminance smaller than 0.5 can be generally considered dark.  
         *      
         *  **Note:** [method get_luminance] relies on the color using linear encoding to return an accurate relative luminance value. If the color uses the default nonlinear sRGB encoding, use [method srgb_to_linear] to convert it to linear encoding first.  
         */
        getLuminance(): float64
        
        /** Returns a copy of the color that uses linear encoding. This method requires the original color to be encoded using the [url=https://en.wikipedia.org/wiki/SRGB]nonlinear sRGB transfer function[/url]. See also [method linear_to_srgb] which performs the opposite operation.  
         *      
         *  **Note:** The color's alpha channel ([member a]) is not affected. The alpha channel is always stored with linear encoding, regardless of the color space of the other color channels.  
         */
        srgbToLinear(): Color
        
        /** Returns a copy of the color that is encoded using the [url=https://en.wikipedia.org/wiki/SRGB]nonlinear sRGB transfer function[/url]. This method requires the original color to use linear encoding. See also [method srgb_to_linear] which performs the opposite operation.  
         *      
         *  **Note:** The color's alpha channel ([member a]) is not affected. The alpha channel is always stored with linear encoding, regardless of the color space of the other color channels.  
         */
        linearToSrgb(): Color
        
        /** Returns `true` if this color and [param to] are approximately equal, by running [method @GlobalScope.is_equal_approx] on each component. */
        isEqualApprox(to: Color): boolean
        
        /** Returns the [Color] associated with the provided [param hex] integer in 32-bit RGBA format (8 bits per channel). This method is the inverse of [method to_rgba32].  
         *  In GDScript and C#, the [int] is best visualized with hexadecimal notation (`"0x"` prefix, making it `"0xRRGGBBAA"`).  
         *    
         *  If you want to use hex notation in a constant expression, use the equivalent constructor instead (i.e. `Color(0xRRGGBBAA)`).  
         */
        static hex(hex: int64): Color
        
        /** Returns the [Color] associated with the provided [param hex] integer in 64-bit RGBA format (16 bits per channel). This method is the inverse of [method to_rgba64].  
         *  In GDScript and C#, the [int] is best visualized with hexadecimal notation (`"0x"` prefix, making it `"0xRRRRGGGGBBBBAAAA"`).  
         */
        static hex64(hex: int64): Color
        
        /** Returns a new color from [param rgba], an HTML hexadecimal color string. [param rgba] is not case-sensitive, and may be prefixed by a hash sign (`#`).  
         *  [param rgba] must be a valid three-digit or six-digit hexadecimal color string, and may contain an alpha channel value. If [param rgba] does not contain an alpha channel value, an alpha channel value of 1.0 is applied. If [param rgba] is invalid, returns an empty color.  
         *    
         */
        static html(rgba: string): Color
        
        /** Returns `true` if [param color] is a valid HTML hexadecimal color string. The string must be a hexadecimal value (case-insensitive) of either 3, 4, 6 or 8 digits, and may be prefixed by a hash sign (`#`). This method is identical to [method String.is_valid_html_color].  
         *    
         */
        static htmlIsValid(color: string): boolean
        
        /** Creates a [Color] from the given string, which can be either an HTML color code or a named color (case-insensitive). Returns [param default] if the color cannot be inferred from the string.  
         *  If you want to create a color from String in a constant expression, use the equivalent constructor instead (i.e. `Color("color string")`).  
         */
        static fromString(str: string, default_: Color): Color
        
        /** Constructs a color from an [url=https://en.wikipedia.org/wiki/HSL_and_HSV]HSV profile[/url]. The hue ([param h]), saturation ([param s]), and value ([param v]) are typically between 0.0 and 1.0.  
         *    
         */
        static fromHsv(h: float64, s: float64, v: float64, alpha?: float64 /* = 1 */): Color
        
        /** Constructs a color from an [url=https://bottosson.github.io/posts/colorpicker/]OK HSL profile[/url]. The hue ([param h]), saturation ([param s]), and lightness ([param l]) are typically between 0.0 and 1.0.  
         *    
         */
        static fromOkHsl(h: float64, s: float64, l: float64, alpha?: float64 /* = 1 */): Color
        
        /** Decodes a [Color] from an RGBE9995 format integer. See [constant Image.FORMAT_RGBE9995]. */
        static fromRgbe9995(rgbe: int64): Color
        
        /** Returns a [Color] constructed from red ([param r8]), green ([param g8]), blue ([param b8]), and optionally alpha ([param a8]) integer channels, each divided by `255.0` for their final value.  
         *    
         *      
         *  **Note:** Due to the lower precision of [method from_rgba8] compared to the standard [Color] constructor, a color created with [method from_rgba8] will generally not be equal to the same color created with the standard [Color] constructor. Use [method is_equal_approx] for comparisons to avoid issues with floating-point precision error.  
         */
        static fromRgba8(r8: int64, g8: int64, b8: int64, a8?: int64 /* = 255 */): Color
        static ADD(left: Color, right: Color): Color
        static SUBTRACT(left: Color, right: Color): Color
        static MULTIPLY(left: Color, right: Color): Color
        static MULTIPLY(left: Color, right: float64): Color
        static MULTIPLY(left: float64, right: Color): Color
        static DIVIDE(left: Color, right: Color): Color
        static DIVIDE(left: Color, right: float64): Color
        static NEGATE(left: Color): Color
        static EQUAL(left: Color, right: Color): boolean
        static NOT_EQUAL(left: Color, right: Color): boolean
        get r(): float64
        set r(value: float64)
        get g(): float64
        set g(value: float64)
        get b(): float64
        set b(value: float64)
        get a(): float64
        set a(value: float64)
        get r8(): int64
        set r8(value: int64)
        get g8(): int64
        set g8(value: int64)
        get b8(): int64
        set b8(value: int64)
        get a8(): int64
        set a8(value: int64)
        get h(): float64
        set h(value: float64)
        get s(): float64
        set s(value: float64)
        get v(): float64
        set v(value: float64)
        get okHslH(): float64
        set okHslH(value: float64)
        get okHslS(): float64
        set okHslS(value: float64)
        get okHslL(): float64
        set okHslL(value: float64)
    }
    /** A pre-parsed scene tree path.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_nodepath.html  
     */
    class NodePath {
        constructor()
        constructor(from: NodePath | string)
        constructor(from: string)
        
        /** Returns `true` if the node path is absolute. Unlike a relative path, an absolute path is represented by a leading slash character (`/`) and always begins from the [SceneTree]. It can be used to reliably access nodes from the root node (e.g. `"/root/Global"` if an autoload named "Global" exists). */
        isAbsolute(): boolean
        
        /** Returns the number of node names in the path. Property subnames are not included.  
         *  For example, `"../RigidBody2D/Sprite2D:texture"` contains 3 node names.  
         */
        getNameCount(): int64
        
        /** Returns the node name indicated by [param idx], starting from 0. If [param idx] is out of bounds, an error is generated. See also [method get_subname_count] and [method get_name_count].  
         *    
         */
        getName(idx: int64): StringName
        
        /** Returns the number of property names ("subnames") in the path. Each subname in the node path is listed after a colon character (`:`).  
         *  For example, `"Level/RigidBody2D/Sprite2D:texture:resource_name"` contains 2 subnames.  
         */
        getSubnameCount(): int64
        
        /** Returns the 32-bit hash value representing the node path's contents.  
         *      
         *  **Note:** Node paths with equal hash values are  *not*  guaranteed to be the same, as a result of hash collisions. Node paths with different hash values are guaranteed to be different.  
         */
        hash(): int64
        
        /** Returns the property name indicated by [param idx], starting from 0. If [param idx] is out of bounds, an error is generated. See also [method get_subname_count].  
         *    
         */
        getSubname(idx: int64): StringName
        
        /** Returns all node names concatenated with a slash character (`/`) as a single [StringName]. */
        getConcatenatedNames(): StringName
        
        /** Returns all property subnames concatenated with a colon character (`:`) as a single [StringName].  
         *    
         */
        getConcatenatedSubnames(): StringName
        
        /** Returns the slice of the [NodePath], from [param begin] (inclusive) to [param end] (exclusive), as a new [NodePath].  
         *  The absolute value of [param begin] and [param end] will be clamped to the sum of [method get_name_count] and [method get_subname_count], so the default value for [param end] makes it slice to the end of the [NodePath] by default (i.e. `path.slice(1)` is a shorthand for `path.slice(1, path.get_name_count() + path.get_subname_count())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the [NodePath] (i.e. `path.slice(0, -2)` is a shorthand for `path.slice(0, path.get_name_count() + path.get_subname_count() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): NodePath
        
        /** Returns a copy of this node path with a colon character (`:`) prefixed, transforming it to a pure property path with no node names (relative to the current node).  
         *    
         */
        getAsPropertyPath(): NodePath
        
        /** Returns `true` if the node path has been constructed from an empty [String] (`""`). */
        isEmpty(): boolean
        static EQUAL(left: NodePath | string, right: NodePath | string): boolean
        static NOT_EQUAL(left: NodePath | string, right: NodePath | string): boolean
    }
    class Rid {
        constructor()
        constructor(from: Rid)
        isValid(): boolean
        getId(): int64
        static EQUAL(left: Rid, right: Rid): boolean
        static NOT_EQUAL(left: Rid, right: Rid): boolean
        static LESS(left: Rid, right: Rid): boolean
        static LESS_EQUAL(left: Rid, right: Rid): boolean
        static GREATER(left: Rid, right: Rid): boolean
        static GREATER_EQUAL(left: Rid, right: Rid): boolean
    }
    /** A built-in type representing a method or a standalone function.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_callable.html  
     */
    class Callable<T extends Function = Function> {
        /**
         * Create godot Callable without a bound object.
         */
        static create<F extends Function>(fn: F): Callable<F>
        /**
         * Create godot Callable with a bound object `self`.
         */
        static create<S extends Object, F extends (this: S, ...args: any[]) => any>(self: S, fn: F): Callable<F>
        constructor()
        constructor(from: Callable)
        constructor(object: GObject, method: StringName)
        
        /** Creates a new [Callable] for the method named [param method] in the specified [param variant]. To represent a method of a built-in [Variant] type, a custom callable is used (see [method is_custom]). If [param variant] is [Object], then a standard callable will be created instead.  
         *      
         *  **Note:** This method is always necessary for the [Dictionary] type, as property syntax is used to access its entries. You may also use this method when [param variant]'s type is not known in advance (for polymorphism).  
         */
        static create(variant: any, method: StringName): Callable
        
        /** Calls the method represented by this [Callable]. Unlike [method call], this method expects all arguments to be contained inside the [param arguments] [Array]. */
        callv(arguments_: GArray): any
        
        /** Returns `true` if this [Callable] has no target to call the method on. Equivalent to `callable == Callable()`.  
         *      
         *  **Note:** This is  *not*  the same as `not is_valid()` and using `not is_null()` will  *not*  guarantee that this callable can be called. Use [method is_valid] instead.  
         */
        isNull(): boolean
        
        /** Returns `true` if this [Callable] is a custom callable. Custom callables are used:  
         *  - for binding/unbinding arguments (see [method bind] and [method unbind]);  
         *  - for representing methods of built-in [Variant] types (see [method create]);  
         *  - for representing global and lambda functions in GDScript;  
         *  - for other purposes in the core, GDExtension, and C#.  
         */
        isCustom(): boolean
        
        /** Returns `true` if this [Callable] is a standard callable. This method is the opposite of [method is_custom]. Returns `false` if this callable is a lambda function. */
        isStandard(): boolean
        
        /** Returns `true` if the callable's object exists and has a valid method name assigned, or is a custom callable. */
        isValid(): boolean
        
        /** Returns the object on which this [Callable] is called. */
        getObject(): null | GObject
        
        /** Returns the ID of this [Callable]'s object (see [method Object.get_instance_id]). */
        getObjectId(): int64
        
        /** Returns the name of the method represented by this [Callable]. If the callable is a GDScript lambda function, returns the function's name or `"<anonymous lambda>"`. */
        getMethod(): StringName
        
        /** Returns the total number of arguments this [Callable] should take, including optional arguments. This means that any arguments bound with [method bind] are  *subtracted*  from the result, and any arguments unbound with [method unbind] are  *added*  to the result. */
        getArgumentCount(): int64
        
        /** Returns the total amount of arguments bound via successive [method bind] or [method unbind] calls. This is the same as the size of the array returned by [method get_bound_arguments]. See [method get_bound_arguments] for details.  
         *      
         *  **Note:** The [method get_bound_arguments_count] and [method get_unbound_arguments_count] methods can both return positive values.  
         */
        getBoundArgumentsCount(): int64
        
        /** Returns the array of arguments bound via successive [method bind] or [method unbind] calls. These arguments will be added  *after*  the arguments passed to the call, from which [method get_unbound_arguments_count] arguments on the right have been previously excluded.  
         *    
         */
        getBoundArguments(): GArray
        
        /** Returns the total amount of arguments unbound via successive [method bind] or [method unbind] calls. See [method get_bound_arguments] for details.  
         *      
         *  **Note:** The [method get_bound_arguments_count] and [method get_unbound_arguments_count] methods can both return positive values.  
         */
        getUnboundArgumentsCount(): int64
        
        /** Returns the 32-bit hash value of this [Callable]'s object.  
         *      
         *  **Note:** [Callable]s with equal content will always produce identical hash values. However, the reverse is not true. Returning identical hash values does  *not*  imply the callables are equal, because different callables can have identical hash values due to hash collisions. The engine uses a 32-bit hash algorithm for [method hash].  
         */
        hash(): int64
        
        /** Returns a copy of this [Callable] with one or more arguments bound, reading them from an array. When called, the bound arguments are passed  *after*  the arguments supplied by [method call]. See also [method unbind].  
         *      
         *  **Note:** When this method is chained with other similar methods, the order in which the argument list is modified is read from right to left.  
         */
        bindv(arguments_: GArray): Callable
        
        /** Returns a copy of this [Callable] with a number of arguments unbound. In other words, when the new callable is called the last few arguments supplied by the user are ignored, according to [param argcount]. The remaining arguments are passed to the callable. This allows to use the original callable in a context that attempts to pass more arguments than this callable can handle, e.g. a signal with a fixed number of arguments. See also [method bind].  
         *      
         *  **Note:** When this method is chained with other similar methods, the order in which the argument list is modified is read from right to left.  
         *    
         */
        unbind(argcount: int64): Callable
        
        /** Calls the method represented by this [Callable]. Arguments can be passed and should match the method's signature. */
        call: T
        
        /** Calls the method represented by this [Callable] in deferred mode, i.e. at the end of the current frame. Arguments can be passed and should match the method's signature.  
         *    
         *      
         *  **Note:** Deferred calls are processed at idle time. Idle time happens mainly at the end of process and physics frames. In it, deferred calls will be run until there are none left, which means you can defer calls from other deferred calls and they'll still be run in the current idle time cycle. This means you should not call a method deferred from itself (or from a method called by it), as this causes infinite recursion the same way as if you had called the method directly.  
         *  See also [method Object.call_deferred].  
         */
        callDeferred(...varargs: any[]): void
        
        /** Perform an RPC (Remote Procedure Call) on all connected peers. This is used for multiplayer and is normally not available, unless the function being called has been marked as  *RPC*  (using [annotation @GDScript.@rpc] or [method Node.rpc_config]). Calling this method on unsupported functions will result in an error. See [method Node.rpc]. */
        rpc(...varargs: any[]): void
        
        /** Perform an RPC (Remote Procedure Call) on a specific peer ID (see multiplayer documentation for reference). This is used for multiplayer and is normally not available unless the function being called has been marked as  *RPC*  (using [annotation @GDScript.@rpc] or [method Node.rpc_config]). Calling this method on unsupported functions will result in an error. See [method Node.rpc_id]. */
        rpcId(peerId: int64, ...varargs: any[]): void
        
        /** Returns a copy of this [Callable] with one or more arguments bound. When called, the bound arguments are passed  *after*  the arguments supplied by [method call]. See also [method unbind].  
         *      
         *  **Note:** When this method is chained with other similar methods, the order in which the argument list is modified is read from right to left.  
         */
        bind<A extends any[]>(...varargs: A): Callable<BindRight<T, A>>
        static EQUAL(left: Callable, right: Callable): boolean
        static NOT_EQUAL(left: Callable, right: Callable): boolean
    }
    /** A built-in type representing a signal of an [Object].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_signal.html  
     */
    class Signal<T extends (...args: any[]) => void = (...args: any[]) => void> {
        asPromise(): Parameters<T> extends [] ? Promise<void> : Parameters<T> extends [infer R] ? Promise<R> : Promise<Parameters<T>>
        constructor()
        constructor(from: Signal)
        constructor(object: GObject, signal: StringName)
        
        /** Returns `true` if this [Signal] has no object and the signal name is empty. Equivalent to `signal == Signal()`. */
        isNull(): boolean
        
        /** Returns the object emitting this signal. */
        getObject(): null | GObject
        
        /** Returns the ID of the object emitting this signal (see [method Object.get_instance_id]). */
        getObjectId(): int64
        
        /** Returns the name of this signal. */
        getName(): StringName
        
        /** Connects this signal to the specified [param callable]. Optional [param flags] can be also added to configure the connection's behavior (see [enum Object.ConnectFlags] constants). You can provide additional arguments to the connected [param callable] by using [method Callable.bind]. Returns [constant OK] if the signal was successfully connected, or [constant ERR_INVALID_PARAMETER] if the [Callable] is null or invalid.  
         *  A signal can only be connected once to the same [Callable]. If the signal is already connected, this method returns [constant ERR_INVALID_PARAMETER] and prints an error, unless the signal is connected with [constant Object.CONNECT_REFERENCE_COUNTED]. To prevent this, use [method is_connected] first to check for existing connections.  
         *    
         *      
         *  **Note:** If the [param callable]'s object is freed, the connection will be lost.  
         */
        connect(callable: Callable<T>, flags?: int64 /* = 0 */): int64
        
        /** Disconnects this signal from the specified [Callable]. If the connection does not exist, prints an error. Use [method is_connected] to make sure that the connection exists. */
        disconnect(callable: Callable<T>): void
        
        /** Returns `true` if the specified [Callable] is connected to this signal. */
        isConnected(callable: Callable<T>): boolean
        
        /** Returns an [Array] of connections for this signal. Each connection is represented as a [Dictionary] that contains three entries:  
         *  - `signal` is a reference to this signal;  
         *  - `callable` is a reference to the connected [Callable];  
         *  - `flags` is a combination of [enum Object.ConnectFlags].  
         */
        getConnections(): GArray
        
        /** Returns `true` if any [Callable] is connected to this signal. */
        hasConnections(): boolean
        
        /** Emits this signal. All [Callable]s connected to this signal will be triggered. This method supports a variable number of arguments, so parameters can be passed as a comma separated list. */
        emit: T
        static EQUAL(left: Signal, right: Signal): boolean
        static NOT_EQUAL(left: Signal, right: Signal): boolean
    }
    type GArrayCreateSource<T> = ReadonlyArray<T> | {
        [Symbol.iterator](): IteratorObject<GDataStructureCreateValue<T>>;
        [K: number]: GDataStructureCreateValue<T>;
    }
    type GDataStructureCreateValue<V> = V | (
         V extends GArray<infer T>
     ? [T] extends [any[]]
         ? GArrayCreateSource<{ [I in keyof T]: GDataStructureCreateValue<T[I]> }>
         : GArrayCreateSource<GDataStructureCreateValue<T>>
     : V extends GDictionary<infer T>
         ? { [K in keyof T]: GDataStructureCreateValue<T[K]> }
         : never
         )
    class GDictionary<T = Record<any, any>> {
        /** Builder function that returns a GDictionary with properties populated from a source JS object. */
        static create<V extends { [key: number | string]: GWrappableValue }>(properties: V): GValueWrap<V>
        static create<V extends GDictionary<any>>(properties: V extends GDictionary<infer T> ? { [K in keyof T]: GDataStructureCreateValue<T[K]> } : never): V
        [Symbol.iterator](): IteratorObject<{ key: any, value: any }>
        /** Returns a Proxy that targets this GDictionary but behaves similar to a regular JavaScript object. Values are exposed as enumerable properties, so Object.keys(), Object.entries() etc. will work. */
        proxy<Write extends boolean = false>(): Write extends true ? GDictionaryProxy<T> : GDictionaryReadProxy<T>
        
        setKeyed<K extends keyof T>(key: K, value: T[K]): void
        getKeyed<K extends keyof T>(key: K): UndefinedToNull<T[K]>
        constructor()
        constructor(from: GDictionary)
        constructor(base: GDictionary, keyType: int64, keyClassName: StringName, keyScript: any, valueType: int64, valueClassName: StringName, valueScript: any)
        size(): int64
        isEmpty(): boolean
        clear(): void
        assign(dictionary: T): void
        sort(): void
        merge(dictionary: T, overwrite?: boolean /* = false */): void
        merged<U>(dictionary: GDictionary<U>, overwrite?: boolean /* = false */): GDictionary<T & U>
        has(key: keyof T): boolean
        hasAll(keys: keyof T extends GAny ? GArray<keyof T> : GArray): boolean
        findKey(value: T[keyof T]): keyof T
        erase(key: keyof T): boolean
        hash(): int64
        keys(): keyof T extends GAny ? GArray<keyof T> : GArray
        values(): UndefinedToNull<T[keyof T]> extends GAny ? GArray<UndefinedToNull<T[keyof T]>> : GArray
        duplicate(deep?: boolean /* = false */): GDictionary<T>
        duplicateDeep(deepSubresourcesMode?: int64 /* = 1 */): GDictionary
        get<K extends keyof T>(key: K, default_?: any /* = {} */): UndefinedToNull<T[K]>
        getOrAdd<K extends keyof T>(key: K, default_: T[K] /* = {} */): UndefinedToNull<T[K]>
        set<K extends keyof T>(key: K, value: T[K]): boolean
        isTyped(): boolean
        isTypedKey(): boolean
        isTypedValue(): boolean
        isSameTyped(dictionary: GDictionary): boolean
        isSameTypedKey(dictionary: GDictionary): boolean
        isSameTypedValue(dictionary: GDictionary): boolean
        getTypedKeyBuiltin(): int64
        getTypedValueBuiltin(): int64
        getTypedKeyClassName(): StringName
        getTypedValueClassName(): StringName
        getTypedKeyScript(): any
        getTypedValueScript(): any
        makeReadOnly(): void
        isReadOnly(): boolean
        recursiveEqual(dictionary: GDictionary, recursionCount: int64): boolean
        static EQUAL(left: GDictionary, right: GDictionary): boolean
        static NOT_EQUAL(left: GDictionary, right: GDictionary): boolean
    }
    class GArray<T extends GAny | GAny[] = GAny | GAny[]> {
        /** Builder function that returns a GArray populated with elements from a JS array. */
        static create<A extends any[]>(elements: A): GValueWrap<A>
        static create<A extends GArray<any>>(
            elements: A extends GArray<infer T>
                ? [T] extends [any[]]
                    ? { [I in keyof T]: GDataStructureCreateValue<T[I]> }
                    : Array<GDataStructureCreateValue<T>>
                : never
        ): GValueWrap<A>
        static create<E extends GAny>(elements: Array<GDataStructureCreateValue<E>>): GArray<E>
        [Symbol.iterator](): IteratorObject<GArrayElement<T>>
        /** Returns a Proxy that targets this GArray but behaves similar to a JavaScript array. */
        proxy<Write extends boolean = false>(): Write extends true ? GArrayProxy<GArrayElement<T>> : GArrayReadProxy<GArrayElement<T>>
        
        setIndexed<I extends int64>(index: I, value: GArrayElement<T, I>): void
        getIndexed<I extends int64>(index: I): GArrayElement<T, I>
        constructor()
        constructor(from: GArray)
        constructor(base: GArray, type: int64, className: StringName, script: any)
        constructor(from: PackedByteArray | byte[] | ArrayBuffer)
        constructor(from: PackedInt32Array | int32[])
        constructor(from: PackedInt64Array | int64[])
        constructor(from: PackedFloat32Array | float32[])
        constructor(from: PackedFloat64Array | float64[])
        constructor(from: PackedStringArray | string[])
        constructor(from: PackedVector2Array | Vector2[])
        constructor(from: PackedVector3Array | Vector3[])
        constructor(from: PackedColorArray | Color[])
        constructor(from: PackedVector4Array)
        size(): int64
        isEmpty(): boolean
        clear(): void
        hash(): int64
        assign(array: GArray): void
        get<I extends int64>(index: I): GArrayElement<T, I>
        set<I extends int64>(index: I, value: GArrayElement<T, I>): void
        pushBack(value: GArrayElement<T>): void
        pushFront(value: GArrayElement<T>): void
        append(value: GArrayElement<T>): void
        appendArray(array: GArray<GArrayElement<T>>): void
        resize(size: int64): int64
        insert(position: int64, value: GArrayElement<T>): int64
        removeAt(position: int64): void
        fill(value: GArrayElement<T>): void
        erase(value: GArrayElement<T>): void
        front(): GArrayElement<T>
        back(): GArrayElement<T>
        pickRandom(): GArrayElement<T>
        find(what: GArrayElement<T>, from?: int64 /* = 0 */): int64
        findCustom(callable: Callable, from?: int64 /* = 0 */): int64
        rfind(what: GArrayElement<T>, from?: int64 /* = -1 */): int64
        rfindCustom(callable: Callable, from?: int64 /* = -1 */): int64
        count(value: GArrayElement<T>): int64
        has(value: GArrayElement<T>): boolean
        popBack(): GArrayElement<T>
        popFront(): GArrayElement<T>
        popAt(position: int64): GArrayElement<T>
        sort(): void
        sortCustom(func: Callable<(a: GArrayElement<T>, b: GArrayElement<T>) => boolean>): void
        shuffle(): void
        bsearch(value: GArrayElement<T>, before?: boolean /* = true */): int64
        bsearchCustom(value: GArrayElement<T>, func: Callable<(a: GArrayElement<T>, b: GArrayElement<T>) => boolean>, before?: boolean /* = true */): int64
        reverse(): void
        duplicate(deep?: boolean /* = false */): this
        duplicateDeep(deepSubresourcesMode?: int64 /* = 1 */): GArray
        slice(begin: int64, end?: int64 /* = 2147483647 */, step?: int64 /* = 1 */, deep?: boolean /* = false */): GArray<GArrayElement<T>>
        filter(callable: Callable<(value: GArrayElement<T>) => boolean>): GArray<GArrayElement<T>>
        map<U extends GAny>(callable: Callable<(value: GArrayElement<T>) => U>): GArray<U>
        reduce(callable: Callable, accum?: any /* = {} */): any
        any(callable: Callable<(value: GArrayElement<T>) => boolean>): boolean
        all(callable: Callable<(value: GArrayElement<T>) => boolean>): boolean
        max(): GArrayElement<T>
        min(): GArrayElement<T>
        isTyped(): boolean
        isSameTyped(array: GArray): boolean
        getTypedBuiltin(): int64
        getTypedClassName(): StringName
        getTypedScript(): any
        makeReadOnly(): void
        isReadOnly(): boolean
        static EQUAL(left: GArray, right: GArray): boolean
        static NOT_EQUAL(left: GArray, right: GArray): boolean
        static LESS(left: GArray, right: GArray): boolean
        static LESS_EQUAL(left: GArray, right: GArray): boolean
        static GREATER(left: GArray, right: GArray): boolean
        static GREATER_EQUAL(left: GArray, right: GArray): boolean
    }
    /** A packed array of bytes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedbytearray.html  
     */
    class PackedByteArray {
        /** [jsb utility method] Converts a PackedByteArray to a JavaScript ArrayBuffer. */
        toArrayBuffer(): ArrayBuffer
        constructor()
        constructor(from: PackedByteArray | byte[] | ArrayBuffer)
        constructor(from: GArray)
        
        /** Returns the byte at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `0`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): int64
        
        /** Changes the byte at the given index. */
        set(index: int64, value: int64): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends an element at the end of the array. */
        pushBack(value: int64): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: int64): boolean
        
        /** Appends a [PackedByteArray] at the end of this array. */
        appendArray(array: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: int64): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: int64): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value]. */
        has(value: int64): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedByteArray], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedByteArray].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedByteArray
        
        /** Sorts the elements of the array in ascending order. */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         */
        bsearch(value: int64, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedByteArray
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed. */
        find(value: int64, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array. */
        rfind(value: int64, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array. */
        count(value: int64): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead. */
        erase(value: int64): boolean
        
        /** Converts ASCII/Latin-1 encoded array to [String]. Fast alternative to [method get_string_from_utf8] if the content is ASCII/Latin-1 only. Unlike the UTF-8 function this function maps every byte to a character in the array. Multibyte sequences will not be interpreted correctly. For parsing user input always use [method get_string_from_utf8]. This is the inverse of [method String.to_ascii_buffer]. */
        getStringFromAscii(): string
        
        /** Converts UTF-8 encoded array to [String]. Slower than [method get_string_from_ascii] but supports UTF-8 encoded data. Use this function if you are unsure about the source of the data. For user input this function should always be preferred. Returns empty string if source array is not valid UTF-8 string. This is the inverse of [method String.to_utf8_buffer]. */
        getStringFromUtf8(): string
        
        /** Converts UTF-16 encoded array to [String]. If the BOM is missing, little-endianness is assumed. Returns empty string if source array is not valid UTF-16 string. This is the inverse of [method String.to_utf16_buffer]. */
        getStringFromUtf16(): string
        
        /** Converts UTF-32 encoded array to [String]. Returns empty string if source array is not valid UTF-32 string. This is the inverse of [method String.to_utf32_buffer]. */
        getStringFromUtf32(): string
        
        /** Converts wide character (`wchar_t`, UTF-16 on Windows, UTF-32 on other platforms) encoded array to [String]. Returns empty string if source array is not valid wide string. This is the inverse of [method String.to_wchar_buffer]. */
        getStringFromWchar(): string
        
        /** Converts system multibyte code page encoded array to [String]. If conversion fails, empty string is returned. This is the inverse of [method String.to_multibyte_char_buffer].  
         *  The values permitted for [param encoding] are system dependent. If [param encoding] is empty string, system default encoding is used.  
         *  - For Windows, see [url=https://learn.microsoft.com/en-us/windows/win32/Intl/code-page-identifiers]Code Page Identifiers[/url] .NET names.  
         *  - For macOS and Linux/BSD, see `libiconv` library documentation and `iconv --list` for a list of supported encodings.  
         */
        getStringFromMultibyteChar(encoding?: string /* = '' */): string
        
        /** Returns a hexadecimal representation of this array as a [String].  
         *    
         */
        hexEncode(): string
        
        /** Returns a new [PackedByteArray] with the data compressed. Set the compression mode using one of [enum FileAccess.CompressionMode]'s constants. */
        compress(compressionMode?: int64 /* = 0 */): PackedByteArray
        
        /** Returns a new [PackedByteArray] with the data decompressed. Set [param buffer_size] to the size of the uncompressed data. Set the compression mode using one of [enum FileAccess.CompressionMode]'s constants.  
         *      
         *  **Note:** Decompression is not guaranteed to work with data not compressed by Godot, for example if data compressed with the deflate compression mode lacks a checksum or header.  
         */
        decompress(bufferSize: int64, compressionMode?: int64 /* = 0 */): PackedByteArray
        
        /** Returns a new [PackedByteArray] with the data decompressed. Set the compression mode using one of [enum FileAccess.CompressionMode]'s constants. **This method only accepts brotli, gzip, and deflate compression modes.**  
         *  This method is potentially slower than [method decompress], as it may have to re-allocate its output buffer multiple times while decompressing, whereas [method decompress] knows the size of its output buffer from the beginning.  
         *  GZIP has a maximal compression ratio of 1032:1, meaning it's very possible for a small compressed payload to decompress to a potentially very large output. To guard against this, you may provide a maximum size this function is allowed to allocate in bytes via [param max_output_size]. Passing -1 will allow for unbounded output. If any positive value is passed, and the decompression exceeds that amount in bytes, then an error will be returned.  
         *      
         *  **Note:** Decompression is not guaranteed to work with data not compressed by Godot, for example if data compressed with the deflate compression mode lacks a checksum or header.  
         */
        decompressDynamic(maxOutputSize: int64, compressionMode?: int64 /* = 0 */): PackedByteArray
        
        /** Decodes a 8-bit unsigned integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeU8(byteOffset: int64): int64
        
        /** Decodes a 8-bit signed integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeS8(byteOffset: int64): int64
        
        /** Decodes a 16-bit unsigned integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeU16(byteOffset: int64): int64
        
        /** Decodes a 16-bit signed integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeS16(byteOffset: int64): int64
        
        /** Decodes a 32-bit unsigned integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeU32(byteOffset: int64): int64
        
        /** Decodes a 32-bit signed integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeS32(byteOffset: int64): int64
        
        /** Decodes a 64-bit unsigned integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeU64(byteOffset: int64): int64
        
        /** Decodes a 64-bit signed integer number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0` if a valid number can't be decoded. */
        decodeS64(byteOffset: int64): int64
        
        /** Decodes a 16-bit floating-point number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0.0` if a valid number can't be decoded. */
        decodeHalf(byteOffset: int64): float64
        
        /** Decodes a 32-bit floating-point number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0.0` if a valid number can't be decoded. */
        decodeFloat(byteOffset: int64): float64
        
        /** Decodes a 64-bit floating-point number from the bytes starting at [param byte_offset]. Fails if the byte count is insufficient. Returns `0.0` if a valid number can't be decoded. */
        decodeDouble(byteOffset: int64): float64
        
        /** Returns `true` if a valid [Variant] value can be decoded at the [param byte_offset]. Returns `false` otherwise or when the value is [Object]-derived and [param allow_objects] is `false`. */
        hasEncodedVar(byteOffset: int64, allowObjects?: boolean /* = false */): boolean
        
        /** Decodes a [Variant] from the bytes starting at [param byte_offset]. Returns `null` if a valid variant can't be decoded or the value is [Object]-derived and [param allow_objects] is `false`. */
        decodeVar(byteOffset: int64, allowObjects?: boolean /* = false */): any
        
        /** Decodes a size of a [Variant] from the bytes starting at [param byte_offset]. Requires at least 4 bytes of data starting at the offset, otherwise fails. */
        decodeVarSize(byteOffset: int64, allowObjects?: boolean /* = false */): int64
        
        /** Returns a copy of the data converted to a [PackedInt32Array], where each block of 4 bytes has been converted to a signed 32-bit integer (C++ `int32_t`).  
         *  The size of the input array must be a multiple of 4 (size of 32-bit integer). The size of the new array will be `byte_array.size() / 4`.  
         *  If the original data can't be converted to signed 32-bit integers, the resulting data is undefined.  
         */
        toInt32Array(): PackedInt32Array
        
        /** Returns a copy of the data converted to a [PackedInt64Array], where each block of 8 bytes has been converted to a signed 64-bit integer (C++ `int64_t`, Godot [int]).  
         *  The size of the input array must be a multiple of 8 (size of 64-bit integer). The size of the new array will be `byte_array.size() / 8`.  
         *  If the original data can't be converted to signed 64-bit integers, the resulting data is undefined.  
         */
        toInt64Array(): PackedInt64Array
        
        /** Returns a copy of the data converted to a [PackedFloat32Array], where each block of 4 bytes has been converted to a 32-bit float (C++ [code skip-lint]float`).  
         *  The size of the input array must be a multiple of 4 (size of 32-bit float). The size of the new array will be `byte_array.size() / 4`.  
         *  If the original data can't be converted to 32-bit floats, the resulting data is undefined.  
         */
        toFloat32Array(): PackedFloat32Array
        
        /** Returns a copy of the data converted to a [PackedFloat64Array], where each block of 8 bytes has been converted to a 64-bit float (C++ `double`, Godot [float]).  
         *  The size of the input array must be a multiple of 8 (size of 64-bit double). The size of the new array will be `byte_array.size() / 8`.  
         *  If the original data can't be converted to 64-bit floats, the resulting data is undefined.  
         */
        toFloat64Array(): PackedFloat64Array
        
        /** Returns a copy of the data converted to a [PackedVector2Array], where each block of 8 bytes or 16 bytes (32-bit or 64-bit) has been converted to a [Vector2] variant.  
         *      
         *  **Note:** The size of the input array must be a multiple of 8 or 16 (depending on the build settings, see [Vector2] for more details). The size of the new array will be `byte_array.size() / (8 or 16)`. If the original data can't be converted to [Vector2] variants, the resulting data is undefined.  
         */
        toVector2Array(): PackedVector2Array
        
        /** Returns a copy of the data converted to a [PackedVector3Array], where each block of 12 or 24 bytes (32-bit or 64-bit) has been converted to a [Vector3] variant.  
         *      
         *  **Note:** The size of the input array must be a multiple of 12 or 24 (depending on the build settings, see [Vector3] for more details). The size of the new array will be `byte_array.size() / (12 or 24)`. If the original data can't be converted to [Vector3] variants, the resulting data is undefined.  
         */
        toVector3Array(): PackedVector3Array
        
        /** Returns a copy of the data converted to a [PackedVector4Array], where each block of 16 or 32 bytes (32-bit or 64-bit) has been converted to a [Vector4] variant.  
         *      
         *  **Note:** The size of the input array must be a multiple of 16 or 32 (depending on the build settings, see [Vector4] for more details). The size of the new array will be `byte_array.size() / (16 or 32)`. If the original data can't be converted to [Vector4] variants, the resulting data is undefined.  
         */
        toVector4Array(): PackedVector4Array
        
        /** Returns a copy of the data converted to a [PackedColorArray], where each block of 16 bytes has been converted to a [Color] variant.  
         *      
         *  **Note:** The size of the input array must be a multiple of 16 (size of four 32-bit float variables). The size of the new array will be `byte_array.size() / 16`. If the original data can't be converted to [Color] variants, the resulting data is undefined.  
         */
        toColorArray(): PackedColorArray
        
        /** Swaps the byte order of [param count] 16-bit segments of the array starting at [param offset]. Swap is done in-place. If [param count] is less than zero, all segments to the end of array are processed, if processed data size is not a multiple of 2, the byte after the last processed 16-bit segment is not modified. */
        bswap16(offset?: int64 /* = 0 */, count?: int64 /* = -1 */): void
        
        /** Swaps the byte order of [param count] 32-bit segments of the array starting at [param offset]. Swap is done in-place. If [param count] is less than zero, all segments to the end of array are processed, if processed data size is not a multiple of 4, bytes after the last processed 32-bit segment are not modified. */
        bswap32(offset?: int64 /* = 0 */, count?: int64 /* = -1 */): void
        
        /** Swaps the byte order of [param count] 64-bit segments of the array starting at [param offset]. Swap is done in-place. If [param count] is less than zero, all segments to the end of array are processed, if processed data size is not a multiple of 8, bytes after the last processed 64-bit segment are not modified. */
        bswap64(offset?: int64 /* = 0 */, count?: int64 /* = -1 */): void
        
        /** Encodes a 8-bit unsigned integer number (byte) at the index of [param byte_offset] bytes. The array must have at least 1 byte of space, starting at the offset. */
        encodeU8(byteOffset: int64, value: int64): void
        
        /** Encodes a 8-bit signed integer number (signed byte) at the index of [param byte_offset] bytes. The array must have at least 1 byte of space, starting at the offset. */
        encodeS8(byteOffset: int64, value: int64): void
        
        /** Encodes a 16-bit unsigned integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 2 bytes of space, starting at the offset. */
        encodeU16(byteOffset: int64, value: int64): void
        
        /** Encodes a 16-bit signed integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 2 bytes of space, starting at the offset. */
        encodeS16(byteOffset: int64, value: int64): void
        
        /** Encodes a 32-bit unsigned integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 4 bytes of space, starting at the offset. */
        encodeU32(byteOffset: int64, value: int64): void
        
        /** Encodes a 32-bit signed integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 4 bytes of space, starting at the offset. */
        encodeS32(byteOffset: int64, value: int64): void
        
        /** Encodes a 64-bit unsigned integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 8 bytes of space, starting at the offset. */
        encodeU64(byteOffset: int64, value: int64): void
        
        /** Encodes a 64-bit signed integer number as bytes at the index of [param byte_offset] bytes. The array must have at least 8 bytes of space, starting at the offset. */
        encodeS64(byteOffset: int64, value: int64): void
        
        /** Encodes a 16-bit floating-point number as bytes at the index of [param byte_offset] bytes. The array must have at least 2 bytes of space, starting at the offset. */
        encodeHalf(byteOffset: int64, value: float64): void
        
        /** Encodes a 32-bit floating-point number as bytes at the index of [param byte_offset] bytes. The array must have at least 4 bytes of space, starting at the offset. */
        encodeFloat(byteOffset: int64, value: float64): void
        
        /** Encodes a 64-bit floating-point number as bytes at the index of [param byte_offset] bytes. The array must have at least 8 bytes of allocated space, starting at the offset. */
        encodeDouble(byteOffset: int64, value: float64): void
        
        /** Encodes a [Variant] at the index of [param byte_offset] bytes. A sufficient space must be allocated, depending on the encoded variant's size. If [param allow_objects] is `false`, [Object]-derived values are not permitted and will instead be serialized as ID-only. Returns the length of the encoded data in bytes. */
        encodeVar(byteOffset: int64, value: any, allowObjects?: boolean /* = false */): int64
        static EQUAL(left: PackedByteArray | byte[] | ArrayBuffer, right: PackedByteArray | byte[] | ArrayBuffer): boolean
        static NOT_EQUAL(left: PackedByteArray | byte[] | ArrayBuffer, right: PackedByteArray | byte[] | ArrayBuffer): boolean
    }
    /** A packed array of 32-bit integers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedint32array.html  
     */
    class PackedInt32Array {
        constructor()
        constructor(from: PackedInt32Array | int32[])
        constructor(from: GArray)
        
        /** Returns the 32-bit integer at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `0`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): int64
        
        /** Changes the integer at the given index. */
        set(index: int64, value: int64): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends a value to the array. */
        pushBack(value: int64): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: int64): boolean
        
        /** Appends a [PackedInt32Array] at the end of this array. */
        appendArray(array: PackedInt32Array | int32[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new integer at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: int64): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: int64): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value]. */
        has(value: int64): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedInt32Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedInt32Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedInt32Array
        
        /** Returns a copy of the data converted to a [PackedByteArray], where each element has been encoded as 4 bytes.  
         *  The size of the new array will be `int32_array.size() * 4`.  
         */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order. */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         */
        bsearch(value: int64, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedInt32Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed. */
        find(value: int64, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array. */
        rfind(value: int64, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array. */
        count(value: int64): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead. */
        erase(value: int64): boolean
        static EQUAL(left: PackedInt32Array | int32[], right: PackedInt32Array | int32[]): boolean
        static NOT_EQUAL(left: PackedInt32Array | int32[], right: PackedInt32Array | int32[]): boolean
    }
    /** A packed array of 64-bit integers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedint64array.html  
     */
    class PackedInt64Array {
        constructor()
        constructor(from: PackedInt64Array | int64[])
        constructor(from: GArray)
        
        /** Returns the 64-bit integer at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `0`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): int64
        
        /** Changes the integer at the given index. */
        set(index: int64, value: int64): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends a value to the array. */
        pushBack(value: int64): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: int64): boolean
        
        /** Appends a [PackedInt64Array] at the end of this array. */
        appendArray(array: PackedInt64Array | int64[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new integer at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: int64): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: int64): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value]. */
        has(value: int64): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedInt64Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedInt64Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedInt64Array
        
        /** Returns a copy of the data converted to a [PackedByteArray], where each element has been encoded as 8 bytes.  
         *  The size of the new array will be `int64_array.size() * 8`.  
         */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order. */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         */
        bsearch(value: int64, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedInt64Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed. */
        find(value: int64, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array. */
        rfind(value: int64, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array. */
        count(value: int64): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead. */
        erase(value: int64): boolean
        static EQUAL(left: PackedInt64Array | int64[], right: PackedInt64Array | int64[]): boolean
        static NOT_EQUAL(left: PackedInt64Array | int64[], right: PackedInt64Array | int64[]): boolean
    }
    /** A packed array of 32-bit floating-point values.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedfloat32array.html  
     */
    class PackedFloat32Array {
        constructor()
        constructor(from: PackedFloat32Array | float32[])
        constructor(from: GArray)
        
        /** Returns the 32-bit float at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `0.0`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): float64
        
        /** Changes the float at the given index. */
        set(index: int64, value: float64): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends an element at the end of the array. */
        pushBack(value: float64): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: float64): boolean
        
        /** Appends a [PackedFloat32Array] at the end of this array. */
        appendArray(array: PackedFloat32Array | float32[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: float64): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: float64): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value].  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        has(value: float64): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedFloat32Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedFloat32Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedFloat32Array
        
        /** Returns a copy of the data converted to a [PackedByteArray], where each element has been encoded as 4 bytes.  
         *  The size of the new array will be `float32_array.size() * 4`.  
         */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        bsearch(value: float64, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedFloat32Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        find(value: float64, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        rfind(value: float64, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        count(value: float64): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        erase(value: float64): boolean
        static EQUAL(left: PackedFloat32Array | float32[], right: PackedFloat32Array | float32[]): boolean
        static NOT_EQUAL(left: PackedFloat32Array | float32[], right: PackedFloat32Array | float32[]): boolean
    }
    /** A packed array of 64-bit floating-point values.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedfloat64array.html  
     */
    class PackedFloat64Array {
        constructor()
        constructor(from: PackedFloat64Array | float64[])
        constructor(from: GArray)
        
        /** Returns the 64-bit float at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `0.0`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): float64
        
        /** Changes the float at the given index. */
        set(index: int64, value: float64): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends an element at the end of the array. */
        pushBack(value: float64): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: float64): boolean
        
        /** Appends a [PackedFloat64Array] at the end of this array. */
        appendArray(array: PackedFloat64Array | float64[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: float64): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: float64): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value].  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        has(value: float64): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedFloat64Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedFloat64Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedFloat64Array
        
        /** Returns a copy of the data converted to a [PackedByteArray], where each element has been encoded as 8 bytes.  
         *  The size of the new array will be `float64_array.size() * 8`.  
         */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        bsearch(value: float64, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedFloat64Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        find(value: float64, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        rfind(value: float64, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        count(value: float64): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead.  
         *      
         *  **Note:** [constant @GDScript.NAN] doesn't behave the same as other numbers. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        erase(value: float64): boolean
        static EQUAL(left: PackedFloat64Array | float64[], right: PackedFloat64Array | float64[]): boolean
        static NOT_EQUAL(left: PackedFloat64Array | float64[], right: PackedFloat64Array | float64[]): boolean
    }
    /** A packed array of [String]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedstringarray.html  
     */
    class PackedStringArray {
        constructor()
        constructor(from: PackedStringArray | string[])
        constructor(from: GArray)
        
        /** Returns the [String] at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns an empty string.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): string
        
        /** Changes the [String] at the given index. */
        set(index: int64, value: string): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends a string element at end of the array. */
        pushBack(value: string): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: string): boolean
        
        /** Appends a [PackedStringArray] at the end of this array. */
        appendArray(array: PackedStringArray | string[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: string): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: string): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value]. */
        has(value: string): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedStringArray], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedStringArray].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedStringArray
        
        /** Returns a [PackedByteArray] with each string encoded as UTF-8. Strings are `null` terminated. */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order. */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         */
        bsearch(value: string, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedStringArray
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed. */
        find(value: string, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array. */
        rfind(value: string, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array. */
        count(value: string): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead. */
        erase(value: string): boolean
        static EQUAL(left: PackedStringArray | string[], right: PackedStringArray | string[]): boolean
        static NOT_EQUAL(left: PackedStringArray | string[], right: PackedStringArray | string[]): boolean
    }
    /** A packed array of [Vector2]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedvector2array.html  
     */
    class PackedVector2Array {
        constructor()
        constructor(from: PackedVector2Array | Vector2[])
        constructor(from: GArray)
        
        /** Returns the [Vector2] at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `Vector2(0, 0)`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): Vector2
        
        /** Changes the [Vector2] at the given index. */
        set(index: int64, value: Vector2): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Inserts a [Vector2] at the end. */
        pushBack(value: Vector2): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: Vector2): boolean
        
        /** Appends a [PackedVector2Array] at the end of this array. */
        appendArray(array: PackedVector2Array | Vector2[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: Vector2): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: Vector2): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value].  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        has(value: Vector2): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedVector2Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedVector2Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedVector2Array
        
        /** Returns a [PackedByteArray] with each vector encoded as bytes. */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        bsearch(value: Vector2, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedVector2Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        find(value: Vector2, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        rfind(value: Vector2, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        count(value: Vector2): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        erase(value: Vector2): boolean
        static EQUAL(left: PackedVector2Array | Vector2[], right: PackedVector2Array | Vector2[]): boolean
        static NOT_EQUAL(left: PackedVector2Array | Vector2[], right: PackedVector2Array | Vector2[]): boolean
    }
    /** A packed array of [Vector3]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedvector3array.html  
     */
    class PackedVector3Array {
        constructor()
        constructor(from: PackedVector3Array | Vector3[])
        constructor(from: GArray)
        
        /** Returns the [Vector3] at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `Vector3(0, 0, 0)`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): Vector3
        
        /** Changes the [Vector3] at the given index. */
        set(index: int64, value: Vector3): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Inserts a [Vector3] at the end. */
        pushBack(value: Vector3): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: Vector3): boolean
        
        /** Appends a [PackedVector3Array] at the end of this array. */
        appendArray(array: PackedVector3Array | Vector3[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: Vector3): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: Vector3): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value].  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        has(value: Vector3): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedVector3Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedVector3Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedVector3Array
        
        /** Returns a [PackedByteArray] with each vector encoded as bytes. */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        bsearch(value: Vector3, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedVector3Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        find(value: Vector3, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        rfind(value: Vector3, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        count(value: Vector3): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        erase(value: Vector3): boolean
        static EQUAL(left: PackedVector3Array | Vector3[], right: PackedVector3Array | Vector3[]): boolean
        static NOT_EQUAL(left: PackedVector3Array | Vector3[], right: PackedVector3Array | Vector3[]): boolean
    }
    /** A packed array of [Vector4]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedvector4array.html  
     */
    class PackedVector4Array {
        constructor()
        constructor(from: PackedVector4Array)
        constructor(from: GArray)
        
        /** Returns the [Vector4] at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `Vector4(0, 0, 0, 0)`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): Vector4
        
        /** Changes the [Vector4] at the given index. */
        set(index: int64, value: Vector4): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Inserts a [Vector4] at the end. */
        pushBack(value: Vector4): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: Vector4): boolean
        
        /** Appends a [PackedVector4Array] at the end of this array. */
        appendArray(array: PackedVector4Array): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: Vector4): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: Vector4): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value].  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        has(value: Vector4): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedVector4Array], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedVector4Array].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedVector4Array
        
        /** Returns a [PackedByteArray] with each vector encoded as bytes. */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        bsearch(value: Vector4, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedVector4Array
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        find(value: Vector4, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        rfind(value: Vector4, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        count(value: Vector4): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead.  
         *      
         *  **Note:** Vectors with [constant @GDScript.NAN] elements don't behave the same as other vectors. Therefore, the results from this method may not be accurate if NaNs are included.  
         */
        erase(value: Vector4): boolean
        static EQUAL(left: PackedVector4Array, right: PackedVector4Array): boolean
        static NOT_EQUAL(left: PackedVector4Array, right: PackedVector4Array): boolean
    }
    /** A packed array of [Color]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_packedcolorarray.html  
     */
    class PackedColorArray {
        constructor()
        constructor(from: PackedColorArray | Color[])
        constructor(from: GArray)
        
        /** Returns the [Color] at the given [param index] in the array. If [param index] is out-of-bounds or negative, this method fails and returns `Color(0, 0, 0, 1)`.  
         *  This method is similar (but not identical) to the `[]` operator. Most notably, when this method fails, it doesn't pause project execution if run from the editor.  
         */
        get(index: int64): Color
        
        /** Changes the [Color] at the given index. */
        set(index: int64, value: Color): void
        
        /** Returns the number of elements in the array. */
        size(): int64
        
        /** Returns `true` if the array is empty. */
        isEmpty(): boolean
        
        /** Appends a value to the array. */
        pushBack(value: Color): boolean
        
        /** Appends an element at the end of the array (alias of [method push_back]). */
        append(value: Color): boolean
        
        /** Appends a [PackedColorArray] at the end of this array. */
        appendArray(array: PackedColorArray | Color[]): void
        
        /** Removes an element from the array by index. If [param index] is out-of-bounds or negative, this method fails. */
        removeAt(index: int64): void
        
        /** Inserts a new element at a given position in the array. The position must be valid, or at the end of the array (`idx == size()`). */
        insert(atIndex: int64, value: Color): int64
        
        /** Assigns the given value to all elements in the array. This can typically be used together with [method resize] to create an array with a given size and initialized elements. */
        fill(value: Color): void
        
        /** Sets the size of the array. If the array is grown, reserves elements at the end of the array. If the array is shrunk, truncates the array to the new size. Calling [method resize] once and assigning the new values is faster than adding new elements one by one.  
         *  Returns [constant OK] on success, or one of the following [enum Error] constants if this method fails: [constant ERR_INVALID_PARAMETER] if the size is negative, or [constant ERR_OUT_OF_MEMORY] if allocations fail. Use [method size] to find the actual size of the array after resize.  
         */
        resize(newSize: int64): int64
        
        /** Clears the array. This is equivalent to using [method resize] with a size of `0`. */
        clear(): void
        
        /** Returns `true` if the array contains [param value]. */
        has(value: Color): boolean
        
        /** Reverses the order of the elements in the array. */
        reverse(): void
        
        /** Returns the slice of the [PackedColorArray], from [param begin] (inclusive) to [param end] (exclusive), as a new [PackedColorArray].  
         *  The absolute value of [param begin] and [param end] will be clamped to the array size, so the default value for [param end] makes it slice to the size of the array by default (i.e. `arr.slice(1)` is a shorthand for `arr.slice(1, arr.size())`).  
         *  If either [param begin] or [param end] are negative, they will be relative to the end of the array (i.e. `arr.slice(0, -2)` is a shorthand for `arr.slice(0, arr.size() - 2)`).  
         */
        slice(begin: int64, end?: int64 /* = 2147483647 */): PackedColorArray
        
        /** Returns a [PackedByteArray] with each color encoded as bytes. */
        toByteArray(): PackedByteArray
        
        /** Sorts the elements of the array in ascending order. */
        sort(): void
        
        /** Finds the index of an existing value (or the insertion index that maintains sorting order, if the value is not yet present in the array) using binary search. Optionally, a [param before] specifier can be passed. If `false`, the returned index comes after all existing entries of the value in the array.  
         *      
         *  **Note:** Calling [method bsearch] on an unsorted array results in unexpected behavior.  
         */
        bsearch(value: Color, before?: boolean /* = true */): int64
        
        /** Creates a copy of the array, and returns it. */
        duplicate(): PackedColorArray
        
        /** Searches the array for a value and returns its index or `-1` if not found. Optionally, the initial search index can be passed. */
        find(value: Color, from?: int64 /* = 0 */): int64
        
        /** Searches the array in reverse order. Optionally, a start search index can be passed. If negative, the start index is considered relative to the end of the array. */
        rfind(value: Color, from?: int64 /* = -1 */): int64
        
        /** Returns the number of times an element is in the array. */
        count(value: Color): int64
        
        /** Removes the first occurrence of a value from the array and returns `true`. If the value does not exist in the array, nothing happens and `false` is returned. To remove an element by index, use [method remove_at] instead. */
        erase(value: Color): boolean
        static EQUAL(left: PackedColorArray | Color[], right: PackedColorArray | Color[]): boolean
        static NOT_EQUAL(left: PackedColorArray | Color[], right: PackedColorArray | Color[]): boolean
    }
    /** A built-in type for strings.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_string.html  
     */
    class String {
        /** Performs a case-sensitive comparison to another string. Returns `-1` if less than, `1` if greater than, or `0` if equal. "Less than" and "greater than" are determined by the [url=https://en.wikipedia.org/wiki/List_of_Unicode_characters]Unicode code points[/url] of each string, which roughly matches the alphabetical order.  
         *  If the character comparison reaches the end of one string, but the other string contains more characters, then it will use length as the deciding factor: `1` will be returned if this string is longer than the [param to] string, or `-1` if shorter. Note that the length of empty strings is always `0`.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method nocasecmp_to], [method filecasecmp_to], and [method naturalcasecmp_to].  
         */
        static casecmpTo(target: string, to: string): int64
        
        /** Performs a **case-insensitive** comparison to another string. Returns `-1` if less than, `1` if greater than, or `0` if equal. "Less than" or "greater than" are determined by the [url=https://en.wikipedia.org/wiki/List_of_Unicode_characters]Unicode code points[/url] of each string, which roughly matches the alphabetical order. Internally, lowercase characters are converted to uppercase for the comparison.  
         *  If the character comparison reaches the end of one string, but the other string contains more characters, then it will use length as the deciding factor: `1` will be returned if this string is longer than the [param to] string, or `-1` if shorter. Note that the length of empty strings is always `0`.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method casecmp_to], [method filenocasecmp_to], and [method naturalnocasecmp_to].  
         */
        static nocasecmpTo(target: string, to: string): int64
        
        /** Performs a **case-sensitive**,  *natural order*  comparison to another string. Returns `-1` if less than, `1` if greater than, or `0` if equal. "Less than" or "greater than" are determined by the [url=https://en.wikipedia.org/wiki/List_of_Unicode_characters]Unicode code points[/url] of each string, which roughly matches the alphabetical order.  
         *  When used for sorting, natural order comparison orders sequences of numbers by the combined value of each digit as is often expected, instead of the single digit's value. A sorted sequence of numbered strings will be `["1", "2", "3", ...]`, not `["1", "10", "2", "3", ...]`.  
         *  If the character comparison reaches the end of one string, but the other string contains more characters, then it will use length as the deciding factor: `1` will be returned if this string is longer than the [param to] string, or `-1` if shorter. Note that the length of empty strings is always `0`.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method naturalnocasecmp_to], [method filecasecmp_to], and [method nocasecmp_to].  
         */
        static naturalcasecmpTo(target: string, to: string): int64
        
        /** Performs a **case-insensitive**,  *natural order*  comparison to another string. Returns `-1` if less than, `1` if greater than, or `0` if equal. "Less than" or "greater than" are determined by the [url=https://en.wikipedia.org/wiki/List_of_Unicode_characters]Unicode code points[/url] of each string, which roughly matches the alphabetical order. Internally, lowercase characters are converted to uppercase for the comparison.  
         *  When used for sorting, natural order comparison orders sequences of numbers by the combined value of each digit as is often expected, instead of the single digit's value. A sorted sequence of numbered strings will be `["1", "2", "3", ...]`, not `["1", "10", "2", "3", ...]`.  
         *  If the character comparison reaches the end of one string, but the other string contains more characters, then it will use length as the deciding factor: `1` will be returned if this string is longer than the [param to] string, or `-1` if shorter. Note that the length of empty strings is always `0`.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method naturalcasecmp_to], [method filenocasecmp_to], and [method casecmp_to].  
         */
        static naturalnocasecmpTo(target: string, to: string): int64
        
        /** Like [method naturalcasecmp_to] but prioritizes strings that begin with periods (`.`) and underscores (`_`) before any other character. Useful when sorting folders or file names.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method filenocasecmp_to], [method naturalcasecmp_to], and [method casecmp_to].  
         */
        static filecasecmpTo(target: string, to: string): int64
        
        /** Like [method naturalnocasecmp_to] but prioritizes strings that begin with periods (`.`) and underscores (`_`) before any other character. Useful when sorting folders or file names.  
         *  To get a [bool] result from a string comparison, use the `==` operator instead. See also [method filecasecmp_to], [method naturalnocasecmp_to], and [method nocasecmp_to].  
         */
        static filenocasecmpTo(target: string, to: string): int64
        
        /** Returns the number of characters in the string. Empty strings (`""`) always return `0`. See also [method is_empty]. */
        static length(target: string): int64
        
        /** Returns part of the string from the position [param from] with length [param len]. If [param len] is `-1` (as by default), returns the rest of the string starting from the given position. */
        static substr(target: string, from: int64, len?: int64 /* = -1 */): string
        
        /** Splits the string using a [param delimiter] and returns the substring at index [param slice]. Returns the original string if [param delimiter] does not occur in the string. Returns an empty string if the [param slice] does not exist.  
         *  This is faster than [method split], if you only need one or two substrings.  
         *    
         */
        static getSlice(target: string, delimiter: string, slice: int64): string
        
        /** Splits the string using a Unicode character with code [param delimiter] and returns the substring at index [param slice]. Returns an empty string if the [param slice] does not exist.  
         *  This is faster than [method split], if you only need one or two substrings.  
         *  This is a Unicode version of [method get_slice].  
         */
        static getSlicec(target: string, delimiter: int64, slice: int64): string
        
        /** Returns the total number of slices when the string is split with the given [param delimiter] (see [method split]).  
         *  Use [method get_slice] to extract a specific slice.  
         *    
         */
        static getSliceCount(target: string, delimiter: string): int64
        
        /** Returns the index of the **first** occurrence of [param what] in this string, or `-1` if there are none. The search's start can be specified with [param from], continuing to the end of the string.  
         *    
         *      
         *  **Note:** If you just want to know whether the string contains [param what], use [method contains]. In GDScript, you may also use the `in` operator.  
         *      
         *  **Note:** A negative value of [param from] is converted to a starting index by counting back from the last possible index with enough space to find [param what].  
         */
        static find(target: string, what: string, from?: int64 /* = 0 */): int64
        
        /** Returns the index of the **first** **case-insensitive** occurrence of [param what] in this string, or `-1` if there are none. The starting search index can be specified with [param from], continuing to the end of the string. */
        static findn(target: string, what: string, from?: int64 /* = 0 */): int64
        
        /** Returns the number of occurrences of the substring [param what] between [param from] and [param to] positions. If [param to] is 0, the search continues until the end of the string. */
        static count(target: string, what: string, from?: int64 /* = 0 */, to?: int64 /* = 0 */): int64
        
        /** Returns the number of occurrences of the substring [param what] between [param from] and [param to] positions, **ignoring case**. If [param to] is 0, the search continues until the end of the string. */
        static countn(target: string, what: string, from?: int64 /* = 0 */, to?: int64 /* = 0 */): int64
        
        /** Returns the index of the **last** occurrence of [param what] in this string, or `-1` if there are none. The search's start can be specified with [param from], continuing to the beginning of the string. This method is the reverse of [method find].  
         *      
         *  **Note:** A negative value of [param from] is converted to a starting index by counting back from the last possible index with enough space to find [param what].  
         *      
         *  **Note:** A value of [param from] that is greater than the last possible index with enough space to find [param what] is considered out-of-bounds, and returns `-1`.  
         */
        static rfind(target: string, what: string, from?: int64 /* = -1 */): int64
        
        /** Returns the index of the **last** **case-insensitive** occurrence of [param what] in this string, or `-1` if there are none. The starting search index can be specified with [param from], continuing to the beginning of the string. This method is the reverse of [method findn]. */
        static rfindn(target: string, what: string, from?: int64 /* = -1 */): int64
        
        /** Does a simple expression match (also called "glob" or "globbing"), where `*` matches zero or more arbitrary characters and `?` matches any single character except a period (`.`). An empty string or empty expression always evaluates to `false`. */
        static match(target: string, expr: string): boolean
        
        /** Does a simple **case-insensitive** expression match, where `*` matches zero or more arbitrary characters and `?` matches any single character except a period (`.`). An empty string or empty expression always evaluates to `false`. */
        static matchn(target: string, expr: string): boolean
        
        /** Returns `true` if the string begins with the given [param text]. See also [method ends_with]. */
        static beginsWith(target: string, text: string): boolean
        
        /** Returns `true` if the string ends with the given [param text]. See also [method begins_with]. */
        static endsWith(target: string, text: string): boolean
        
        /** Returns `true` if all characters of this string can be found in [param text] in their original order. This is not the same as [method contains].  
         *    
         */
        static isSubsequenceOf(target: string, text: string): boolean
        
        /** Returns `true` if all characters of this string can be found in [param text] in their original order, **ignoring case**. This is not the same as [method containsn]. */
        static isSubsequenceOfn(target: string, text: string): boolean
        
        /** Returns an array containing the bigrams (pairs of consecutive characters) of this string.  
         *    
         */
        static bigrams(target: string): PackedStringArray
        
        /** Returns the similarity index ([url=https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient]Sørensen-Dice coefficient[/url]) of this string compared to another. A result of `1.0` means totally similar, while `0.0` means totally dissimilar.  
         *    
         */
        static similarity(target: string, text: string): float64
        
        /** Formats the string by replacing all occurrences of [param placeholder] with the elements of [param values].  
         *  [param values] can be a [Dictionary], an [Array], or an [Object]. Any underscores in [param placeholder] will be replaced with the corresponding keys in advance. Array elements use their index as keys.  
         *    
         *  Some additional handling is performed when [param values] is an [Array]. If [param placeholder] does not contain an underscore, the elements of the [param values] array will be used to replace one occurrence of the placeholder in order; If an element of [param values] is another 2-element array, it'll be interpreted as a key-value pair.  
         *    
         *  When passing an [Object], the property names from [method Object.get_property_list] are used as keys.  
         *    
         *  See also the [url=https://docs.godotengine.org/en/latest/tutorials/scripting/gdscript/gdscript_format_string.html]GDScript format string[/url] tutorial.  
         *      
         *  **Note:** Each replacement is done sequentially for each element of [param values], **not** all at once. This means that if any element is inserted and it contains another placeholder, it may be changed by the next replacement. While this can be very useful, it often causes unexpected results. If not necessary, make sure [param values]'s elements do not contain placeholders.  
         *    
         *      
         *  **Note:** In C#, it's recommended to [url=https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/tokens/interpolated]interpolate strings with "$"[/url], instead.  
         */
        static format(target: string, values: any, placeholder?: string /* = '{_}' */): string
        
        /** Replaces all occurrences of [param what] inside the string with the given [param forwhat]. */
        static replace(target: string, what: string, forwhat: string): string
        
        /** Replaces all **case-insensitive** occurrences of [param what] inside the string with the given [param forwhat]. */
        static replacen(target: string, what: string, forwhat: string): string
        
        /** Replaces all occurrences of the Unicode character with code [param key] with the Unicode character with code [param with]. Faster version of [method replace] when the key is only one character long. To get a single character use `"X".unicode_at(0)` (note that some strings, like compound letters and emoji, can be composed of multiple unicode codepoints, and will not work with this method, use [method length] to make sure). */
        static replaceChar(target: string, key: int64, with_: int64): string
        
        /** Replaces any occurrence of the characters in [param keys] with the Unicode character with code [param with]. See also [method replace_char]. */
        static replaceChars(target: string, keys: string, with_: int64): string
        
        /** Removes all occurrences of the Unicode character with code [param what]. Faster version of [method replace] when the key is only one character long and the replacement is `""`. */
        static removeChar(target: string, what: int64): string
        
        /** Removes all occurrences of the characters in [param chars]. See also [method remove_char]. */
        static removeChars(target: string, chars: string): string
        
        /** Repeats this string a number of times. [param count] needs to be greater than `0`. Otherwise, returns an empty string. */
        static repeat(target: string, count: int64): string
        
        /** Returns the copy of this string in reverse order. This operation works on unicode codepoints, rather than sequences of codepoints, and may break things like compound letters or emojis. */
        static reverse(target: string): string
        
        /** Inserts [param what] at the given [param position] in the string. */
        static insert(target: string, position: int64, what: string): string
        
        /** Returns a string with [param chars] characters erased starting from [param position]. If [param chars] goes beyond the string's length given the specified [param position], fewer characters will be erased from the returned string. Returns an empty string if either [param position] or [param chars] is negative. Returns the original string unmodified if [param chars] is `0`. */
        static erase(target: string, position: int64, chars?: int64 /* = 1 */): string
        
        /** Returns a copy of the string with changed appearance. Replaces underscores (`_`) and hyphens (`-`) with spaces, adds spaces before uppercase letters in the middle of a word, converts all letters to lowercase, then converts the first one and each one following a space to uppercase.  
         *    
         */
        static capitalize(target: string): string
        
        /** Returns the string converted to `camelCase`. */
        static toCamelCase(target: string): string
        
        /** Returns the string converted to `PascalCase`. */
        static toPascalCase(target: string): string
        
        /** Returns the string converted to `snake_case`.  
         *      
         *  **Note:** Numbers followed by a  *single*  letter are not separated in the conversion to keep some words (such as "2D") together.  
         *    
         */
        static toSnakeCase(target: string): string
        
        /** Returns the string converted to `kebab-case`.  
         *      
         *  **Note:** Numbers followed by a  *single*  letter are not separated in the conversion to keep some words (such as "2D") together.  
         *    
         */
        static toKebabCase(target: string): string
        
        /** Splits the string using a [param delimiter] and returns an array of the substrings. If [param delimiter] is an empty string, each substring will be a single character. This method is the opposite of [method join].  
         *  If [param allow_empty] is `false`, empty strings between adjacent delimiters are excluded from the array.  
         *  If [param maxsplit] is greater than `0`, the number of splits may not exceed [param maxsplit]. By default, the entire string is split.  
         *    
         *      
         *  **Note:** If you only need one substring from the array, consider using [method get_slice] which is faster. If you need to split strings with more complex rules, use the [RegEx] class instead.  
         */
        static split(target: string, delimiter?: string /* = '' */, allowEmpty?: boolean /* = true */, maxsplit?: int64 /* = 0 */): PackedStringArray
        
        /** Splits the string using a [param delimiter] and returns an array of the substrings, starting from the end of the string. The splits in the returned array appear in the same order as the original string. If [param delimiter] is an empty string, each substring will be a single character.  
         *  If [param allow_empty] is `false`, empty strings between adjacent delimiters are excluded from the array.  
         *  If [param maxsplit] is greater than `0`, the number of splits may not exceed [param maxsplit]. By default, the entire string is split, which is mostly identical to [method split].  
         *    
         */
        static rsplit(target: string, delimiter?: string /* = '' */, allowEmpty?: boolean /* = true */, maxsplit?: int64 /* = 0 */): PackedStringArray
        
        /** Splits the string into floats by using a [param delimiter] and returns a [PackedFloat64Array].  
         *  If [param allow_empty] is `false`, empty or invalid [float] conversions between adjacent delimiters are excluded.  
         *    
         */
        static splitFloats(target: string, delimiter: string, allowEmpty?: boolean /* = true */): PackedFloat64Array
        
        /** Returns the concatenation of [param parts]' elements, with each element separated by the string calling this method. This method is the opposite of [method split].  
         *    
         */
        static join(target: string, parts: PackedStringArray | string[]): string
        
        /** Returns the string converted to `UPPERCASE`. */
        static toUpper(target: string): string
        
        /** Returns the string converted to `lowercase`. */
        static toLower(target: string): string
        
        /** Returns the first [param length] characters from the beginning of the string. If [param length] is negative, strips the last [param length] characters from the string's end.  
         *    
         */
        static left(target: string, length: int64): string
        
        /** Returns the last [param length] characters from the end of the string. If [param length] is negative, strips the first [param length] characters from the string's beginning.  
         *    
         */
        static right(target: string, length: int64): string
        
        /** Strips all non-printable characters from the beginning and the end of the string. These include spaces, tabulations (`\t`), and newlines (`\n` `\r`).  
         *  If [param left] is `false`, ignores the string's beginning. Likewise, if [param right] is `false`, ignores the string's end.  
         */
        static stripEdges(target: string, left?: boolean /* = true */, right?: boolean /* = true */): string
        
        /** Strips all escape characters from the string. These include all non-printable control characters of the first page of the ASCII table (values from 0 to 31), such as tabulation (`\t`) and newline (`\n`, `\r`) characters, but  *not*  spaces. */
        static stripEscapes(target: string): string
        
        /** Removes a set of characters defined in [param chars] from the string's beginning. See also [method rstrip].  
         *      
         *  **Note:** [param chars] is not a prefix. Use [method trim_prefix] to remove a single prefix, rather than a set of characters.  
         */
        static lstrip(target: string, chars: string): string
        
        /** Removes a set of characters defined in [param chars] from the string's end. See also [method lstrip].  
         *      
         *  **Note:** [param chars] is not a suffix. Use [method trim_suffix] to remove a single suffix, rather than a set of characters.  
         */
        static rstrip(target: string, chars: string): string
        
        /** If the string is a valid file name or path, returns the file extension without the leading period (`.`). Otherwise, returns an empty string.  
         *    
         */
        static getExtension(target: string): string
        
        /** If the string is a valid file path, returns the full file path, without the extension.  
         *    
         */
        static getBasename(target: string): string
        
        /** Concatenates [param path] at the end of the string as a subpath, adding `/` if necessary.  
         *  **Example:** `"this/is".path_join("path") == "this/is/path"`.  
         */
        static pathJoin(target: string, path: string): string
        
        /** Returns the character code at position [param at].  
         *  See also [method chr], [method @GDScript.char], and [method @GDScript.ord].  
         */
        static unicodeAt(target: string, at: int64): int64
        
        /** Indents every line of the string with the given [param prefix]. Empty lines are not indented. See also [method dedent] to remove indentation.  
         *  For example, the string can be indented with two tabulations using `"\t\t"`, or four spaces using `"    "`.  
         */
        static indent(target: string, prefix: string): string
        
        /** Returns a copy of the string with indentation (leading tabs and spaces) removed. See also [method indent] to add indentation. */
        static dedent(target: string): string
        
        /** Returns the 32-bit hash value representing the string's contents.  
         *      
         *  **Note:** Strings with equal hash values are  *not*  guaranteed to be the same, as a result of hash collisions. On the contrary, strings with different hash values are guaranteed to be different.  
         */
        static hash(target: string): int64
        
        /** Returns the [url=https://en.wikipedia.org/wiki/MD5]MD5 hash[/url] of the string as another [String]. */
        static md5Text(target: string): string
        
        /** Returns the [url=https://en.wikipedia.org/wiki/SHA-1]SHA-1[/url] hash of the string as another [String]. */
        static sha1Text(target: string): string
        
        /** Returns the [url=https://en.wikipedia.org/wiki/SHA-2]SHA-256[/url] hash of the string as another [String]. */
        static sha256Text(target: string): string
        
        /** Returns the [url=https://en.wikipedia.org/wiki/MD5]MD5 hash[/url] of the string as a [PackedByteArray]. */
        static md5Buffer(target: string): PackedByteArray
        
        /** Returns the [url=https://en.wikipedia.org/wiki/SHA-1]SHA-1[/url] hash of the string as a [PackedByteArray]. */
        static sha1Buffer(target: string): PackedByteArray
        
        /** Returns the [url=https://en.wikipedia.org/wiki/SHA-2]SHA-256[/url] hash of the string as a [PackedByteArray]. */
        static sha256Buffer(target: string): PackedByteArray
        
        /** Returns `true` if the string's length is `0` (`""`). See also [method length]. */
        static isEmpty(target: string): boolean
        
        /** Returns `true` if the string contains [param what]. In GDScript, this corresponds to the `in` operator.  
         *    
         *  If you need to know where [param what] is within the string, use [method find]. See also [method containsn].  
         */
        static contains(target: string, what: string): boolean
        
        /** Returns `true` if the string contains [param what], **ignoring case**.  
         *  If you need to know where [param what] is within the string, use [method findn]. See also [method contains].  
         */
        static containsn(target: string, what: string): boolean
        
        /** Returns `true` if the string is a path to a file or directory, and its starting point is explicitly defined. This method is the opposite of [method is_relative_path].  
         *  This includes all paths starting with `"res://"`, `"user://"`, `"C:\"`, `"/"`, etc.  
         */
        static isAbsolutePath(target: string): boolean
        
        /** Returns `true` if the string is a path, and its starting point is dependent on context. The path could begin from the current directory, or the current [Node] (if the string is derived from a [NodePath]), and may sometimes be prefixed with `"./"`. This method is the opposite of [method is_absolute_path]. */
        static isRelativePath(target: string): boolean
        
        /** If the string is a valid file path, converts the string into a canonical path. This is the shortest possible path, without `"./"`, and all the unnecessary `".."` and `"/"`.  
         *    
         */
        static simplifyPath(target: string): string
        
        /** If the string is a valid file path, returns the base directory name.  
         *    
         */
        static getBaseDir(target: string): string
        
        /** If the string is a valid file path, returns the file name, including the extension.  
         *    
         */
        static getFile(target: string): string
        
        /** Returns a copy of the string with special characters escaped using the XML standard. If [param escape_quotes] is `true`, the single quote (`'`) and double quote (`"`) characters are also escaped. */
        static xmlEscape(target: string, escapeQuotes?: boolean /* = false */): string
        
        /** Returns a copy of the string with escaped characters replaced by their meanings according to the XML standard. */
        static xmlUnescape(target: string): string
        
        /** Encodes the string to URL-friendly format. This method is meant to properly encode the parameters in a URL when sending an HTTP request. See also [method uri_decode].  
         *    
         */
        static uriEncode(target: string): string
        
        /** Decodes the string from its URL-encoded format. This method is meant to properly decode the parameters in a URL when receiving an HTTP request. See also [method uri_encode].  
         *    
         *      
         *  **Note:** This method decodes `+` as space.  
         */
        static uriDecode(target: string): string
        
        /** Decodes the file path from its URL-encoded format. Unlike [method uri_decode] this method leaves `+` as is. */
        static uriFileDecode(target: string): string
        
        /** Returns a copy of the string with special characters escaped using the C language standard. */
        static cEscape(target: string): string
        
        /** Returns a copy of the string with escaped characters replaced by their meanings. Supported escape sequences are `\'`, `\"`, `\\`, `\a`, `\b`, `\f`, `\n`, `\r`, `\t`, `\v`.  
         *      
         *  **Note:** Unlike the GDScript parser, this method doesn't support the `\uXXXX` escape sequence.  
         */
        static cUnescape(target: string): string
        
        /** Returns a copy of the string with special characters escaped using the JSON standard. Because it closely matches the C standard, it is possible to use [method c_unescape] to unescape the string, if necessary. */
        static jsonEscape(target: string): string
        
        /** Returns a copy of the string with all characters that are not allowed in [member Node.name] (`.` `:` `@` `/` `"` `%`) replaced with underscores. */
        static validateNodeName(target: string): string
        
        /** Returns a copy of the string with all characters that are not allowed in [method is_valid_filename] replaced with underscores. */
        static validateFileName(target: string): string
        
        /** Returns `true` if this string is a valid ASCII identifier. A valid ASCII identifier may contain only letters, digits, and underscores (`_`), and the first character may not be a digit.  
         *    
         *  See also [method is_valid_unicode_identifier].  
         */
        static isValidAsciiIdentifier(target: string): boolean
        
        /** Returns `true` if this string is a valid Unicode identifier.  
         *  A valid Unicode identifier must begin with a Unicode character of class `XID_Start` or `"_"`, and may contain Unicode characters of class `XID_Continue` in the other positions.  
         *    
         *  See also [method is_valid_ascii_identifier].  
         *      
         *  **Note:** This method checks identifiers the same way as GDScript. See [method TextServer.is_valid_identifier] for more advanced checks.  
         */
        static isValidUnicodeIdentifier(target: string): boolean
        
        /** Returns `true` if this string is a valid identifier. A valid identifier may contain only letters, digits and underscores (`_`), and the first character may not be a digit.  
         *    
         */
        static isValidIdentifier(target: string): boolean
        
        /** Returns `true` if this string represents a valid integer. A valid integer only contains digits, and may be prefixed with a positive (`+`) or negative (`-`) sign. See also [method to_int].  
         *    
         */
        static isValidInt(target: string): boolean
        
        /** Returns `true` if this string represents a valid floating-point number. A valid float may contain only digits, one decimal point (`.`), and the exponent letter (`e`). It may also be prefixed with a positive (`+`) or negative (`-`) sign. Any valid integer is also a valid float (see [method is_valid_int]). See also [method to_float].  
         *    
         */
        static isValidFloat(target: string): boolean
        
        /** Returns `true` if this string is a valid hexadecimal number. A valid hexadecimal number only contains digits or letters `A` to `F` (either uppercase or lowercase), and may be prefixed with a positive (`+`) or negative (`-`) sign.  
         *  If [param with_prefix] is `true`, the hexadecimal number needs to prefixed by `"0x"` to be considered valid.  
         *    
         */
        static isValidHexNumber(target: string, withPrefix?: boolean /* = false */): boolean
        
        /** Returns `true` if this string is a valid color in hexadecimal HTML notation. The string must be a hexadecimal value (see [method is_valid_hex_number]) of either 3, 4, 6 or 8 digits, and may be prefixed by a hash sign (`#`). Other HTML notations for colors, such as names or `hsl()`, are not considered valid. See also [method Color.html]. */
        static isValidHtmlColor(target: string): boolean
        
        /** Returns `true` if this string represents a well-formatted IPv4 or IPv6 address. This method considers [url=https://en.wikipedia.org/wiki/Reserved_IP_addresses]reserved IP addresses[/url] such as `"0.0.0.0"` and `"ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"` as valid. */
        static isValidIPAddress(target: string): boolean
        
        /** Returns `true` if this string is a valid file name. A valid file name cannot be empty, begin or end with space characters, or contain characters that are not allowed (`:` `/` `\` `?` `*` `"` `|` `%` `<` `>`). */
        static isValidFileName(target: string): boolean
        
        /** Converts the string representing an integer number into an [int]. This method removes any non-number character and stops at the first decimal point (`.`). See also [method is_valid_int].  
         *    
         */
        static toInt(target: string): int64
        
        /** Converts the string representing a decimal number into a [float]. This method stops on the first non-number character, except the first decimal point (`.`) and the exponent letter (`e`). See also [method is_valid_float].  
         *    
         */
        static toFloat(target: string): float64
        
        /** Converts the string representing a hexadecimal number into an [int]. The string may be optionally prefixed with `"0x"`, and an additional `-` prefix for negative numbers.  
         *    
         */
        static hexToInt(target: string): int64
        
        /** Converts the string representing a binary number into an [int]. The string may optionally be prefixed with `"0b"`, and an additional `-` prefix for negative numbers.  
         *    
         */
        static binToInt(target: string): int64
        
        /** Formats the string to be at least [param min_length] long by adding [param character]s to the left of the string, if necessary. See also [method rpad]. */
        static lpad(target: string, minLength: int64, character?: string /* = ' ' */): string
        
        /** Formats the string to be at least [param min_length] long, by adding [param character]s to the right of the string, if necessary. See also [method lpad]. */
        static rpad(target: string, minLength: int64, character?: string /* = ' ' */): string
        
        /** Formats the string representing a number to have an exact number of [param digits]  *after*  the decimal point. */
        static padDecimals(target: string, digits: int64): string
        
        /** Formats the string representing a number to have an exact number of [param digits]  *before*  the decimal point. */
        static padZeros(target: string, digits: int64): string
        
        /** Removes the given [param prefix] from the start of the string, or returns the string unchanged. */
        static trimPrefix(target: string, prefix: string): string
        
        /** Removes the given [param suffix] from the end of the string, or returns the string unchanged. */
        static trimSuffix(target: string, suffix: string): string
        
        /** Converts the string to an [url=https://en.wikipedia.org/wiki/ASCII]ASCII[/url]/Latin-1 encoded [PackedByteArray]. This method is slightly faster than [method to_utf8_buffer], but replaces all unsupported characters with spaces. This is the inverse of [method PackedByteArray.get_string_from_ascii]. */
        static toAsciiBuffer(target: string): PackedByteArray
        
        /** Converts the string to a [url=https://en.wikipedia.org/wiki/UTF-8]UTF-8[/url] encoded [PackedByteArray]. This method is slightly slower than [method to_ascii_buffer], but supports all UTF-8 characters. For most cases, prefer using this method. This is the inverse of [method PackedByteArray.get_string_from_utf8]. */
        static toUtf8Buffer(target: string): PackedByteArray
        
        /** Converts the string to a [url=https://en.wikipedia.org/wiki/UTF-16]UTF-16[/url] encoded [PackedByteArray]. This is the inverse of [method PackedByteArray.get_string_from_utf16]. */
        static toUtf16Buffer(target: string): PackedByteArray
        
        /** Converts the string to a [url=https://en.wikipedia.org/wiki/UTF-32]UTF-32[/url] encoded [PackedByteArray]. This is the inverse of [method PackedByteArray.get_string_from_utf32]. */
        static toUtf32Buffer(target: string): PackedByteArray
        
        /** Converts the string to a [url=https://en.wikipedia.org/wiki/Wide_character]wide character[/url] (`wchar_t`, UTF-16 on Windows, UTF-32 on other platforms) encoded [PackedByteArray]. This is the inverse of [method PackedByteArray.get_string_from_wchar]. */
        static toWcharBuffer(target: string): PackedByteArray
        
        /** Converts the string to system multibyte code page encoded [PackedByteArray]. If conversion fails, empty array is returned.  
         *  The values permitted for [param encoding] are system dependent. If [param encoding] is empty string, system default encoding is used.  
         *  - For Windows, see [url=https://learn.microsoft.com/en-us/windows/win32/Intl/code-page-identifiers]Code Page Identifiers[/url] .NET names.  
         *  - For macOS and Linux/BSD, see `libiconv` library documentation and `iconv --list` for a list of supported encodings.  
         */
        static toMultibyteCharBuffer(target: string, encoding?: string /* = '' */): PackedByteArray
        
        /** Decodes a hexadecimal string as a [PackedByteArray].  
         *    
         */
        static hexDecode(target: string): PackedByteArray
        
        /** Converts the given [param number] to a string representation, in scientific notation.  
         *    
         *      
         *  **Note:** In C#, this method is not implemented. To achieve similar results, see C#'s [url=https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings]Standard numeric format strings[/url].  
         */
        static numScientific(number: float64): string
        
        /** Converts a [float] to a string representation of a decimal number, with the number of decimal places specified in [param decimals].  
         *  If [param decimals] is `-1` as by default, the string representation may only have up to 14 significant digits, with digits before the decimal point having priority over digits after.  
         *  Trailing zeros are not included in the string. The last digit is rounded, not truncated.  
         *    
         */
        static num(number: float64, decimals?: int64 /* = -1 */): string
        
        /** Converts the given [param number] to a string representation, with the given [param base].  
         *  By default, [param base] is set to decimal (`10`). Other common bases in programming include binary (`2`), [url=https://en.wikipedia.org/wiki/Octal]octal[/url] (`8`), hexadecimal (`16`).  
         *  If [param capitalize_hex] is `true`, digits higher than 9 are represented in uppercase.  
         */
        static numInt64(number: int64, base?: int64 /* = 10 */, capitalizeHex?: boolean /* = false */): string
        
        /** Converts the given unsigned [int] to a string representation, with the given [param base].  
         *  By default, [param base] is set to decimal (`10`). Other common bases in programming include binary (`2`), [url=https://en.wikipedia.org/wiki/Octal]octal[/url] (`8`), hexadecimal (`16`).  
         *  If [param capitalize_hex] is `true`, digits higher than 9 are represented in uppercase.  
         */
        static numUint64(number: int64, base?: int64 /* = 10 */, capitalizeHex?: boolean /* = false */): string
        
        /** Returns a single Unicode character from the integer [param code]. You may use [url=https://unicodelookup.com/]unicodelookup.com[/url] or [url=https://www.unicode.org/charts/]unicode.org[/url] as points of reference.  
         *    
         *  See also [method unicode_at], [method @GDScript.char], and [method @GDScript.ord].  
         */
        static chr(code: int64): string
        
        /** Converts [param size] which represents a number of bytes into a human-readable form.  
         *  The result is in [url=https://en.wikipedia.org/wiki/Binary_prefix#IEC_prefixes]IEC prefix format[/url], which may end in either `"B"`, `"KiB"`, `"MiB"`, `"GiB"`, `"TiB"`, `"PiB"`, or `"EiB"`.  
         */
        static humanizeSize(size: int64): string
    }
    enum Side {
        SideLeft = 0,
        SideTop = 1,
        SideRight = 2,
        SideBottom = 3,
    }
    enum Corner {
        CornerTopLeft = 0,
        CornerTopRight = 1,
        CornerBottomRight = 2,
        CornerBottomLeft = 3,
    }
    enum Orientation {
        Vertical = 1,
        Horizontal = 0,
    }
    enum ClockDirection {
        Clockwise = 0,
        Counterclockwise = 1,
    }
    enum HorizontalAlignment {
        HorizontalAlignmentLeft = 0,
        HorizontalAlignmentCenter = 1,
        HorizontalAlignmentRight = 2,
        HorizontalAlignmentFill = 3,
    }
    enum VerticalAlignment {
        VerticalAlignmentTop = 0,
        VerticalAlignmentCenter = 1,
        VerticalAlignmentBottom = 2,
        VerticalAlignmentFill = 3,
    }
    enum InlineAlignment {
        InlineAlignmentTopTo = 0,
        InlineAlignmentCenterTo = 1,
        InlineAlignmentBaselineTo = 3,
        InlineAlignmentBottomTo = 2,
        InlineAlignmentToTop = 0,
        InlineAlignmentToCenter = 4,
        InlineAlignmentToBaseline = 8,
        InlineAlignmentToBottom = 12,
        InlineAlignmentTop = 0,
        InlineAlignmentCenter = 5,
        InlineAlignmentBottom = 14,
        InlineAlignmentImageMask = 3,
        InlineAlignmentTextMask = 12,
    }
    enum EulerOrder {
        EulerOrderXyz = 0,
        EulerOrderXzy = 1,
        EulerOrderYxz = 2,
        EulerOrderYzx = 3,
        EulerOrderZxy = 4,
        EulerOrderZyx = 5,
    }
    enum Key {
        KeyNone = 0,
        KeySpecial = 4194304,
        KeyEscape = 4194305,
        KeyTab = 4194306,
        KeyBacktab = 4194307,
        KeyBackspace = 4194308,
        KeyEnter = 4194309,
        KeyKpEnter = 4194310,
        KeyInsert = 4194311,
        KeyDelete = 4194312,
        KeyPause = 4194313,
        KeyPrint = 4194314,
        KeySysreq = 4194315,
        KeyClear = 4194316,
        KeyHome = 4194317,
        KeyEnd = 4194318,
        KeyLeft = 4194319,
        KeyUp = 4194320,
        KeyRight = 4194321,
        KeyDown = 4194322,
        KeyPageup = 4194323,
        KeyPagedown = 4194324,
        KeyShift = 4194325,
        KeyCtrl = 4194326,
        KeyMeta = 4194327,
        KeyAlt = 4194328,
        KeyCapslock = 4194329,
        KeyNumlock = 4194330,
        KeyScrolllock = 4194331,
        KeyF1 = 4194332,
        KeyF2 = 4194333,
        KeyF3 = 4194334,
        KeyF4 = 4194335,
        KeyF5 = 4194336,
        KeyF6 = 4194337,
        KeyF7 = 4194338,
        KeyF8 = 4194339,
        KeyF9 = 4194340,
        KeyF10 = 4194341,
        KeyF11 = 4194342,
        KeyF12 = 4194343,
        KeyF13 = 4194344,
        KeyF14 = 4194345,
        KeyF15 = 4194346,
        KeyF16 = 4194347,
        KeyF17 = 4194348,
        KeyF18 = 4194349,
        KeyF19 = 4194350,
        KeyF20 = 4194351,
        KeyF21 = 4194352,
        KeyF22 = 4194353,
        KeyF23 = 4194354,
        KeyF24 = 4194355,
        KeyF25 = 4194356,
        KeyF26 = 4194357,
        KeyF27 = 4194358,
        KeyF28 = 4194359,
        KeyF29 = 4194360,
        KeyF30 = 4194361,
        KeyF31 = 4194362,
        KeyF32 = 4194363,
        KeyF33 = 4194364,
        KeyF34 = 4194365,
        KeyF35 = 4194366,
        KeyKpMultiply = 4194433,
        KeyKpDivide = 4194434,
        KeyKpSubtract = 4194435,
        KeyKpPeriod = 4194436,
        KeyKpAdd = 4194437,
        KeyKp0 = 4194438,
        KeyKp1 = 4194439,
        KeyKp2 = 4194440,
        KeyKp3 = 4194441,
        KeyKp4 = 4194442,
        KeyKp5 = 4194443,
        KeyKp6 = 4194444,
        KeyKp7 = 4194445,
        KeyKp8 = 4194446,
        KeyKp9 = 4194447,
        KeyMenu = 4194370,
        KeyHyper = 4194371,
        KeyHelp = 4194373,
        KeyBack = 4194376,
        KeyForward = 4194377,
        KeyStop = 4194378,
        KeyRefresh = 4194379,
        KeyVolumedown = 4194380,
        KeyVolumemute = 4194381,
        KeyVolumeup = 4194382,
        KeyMediaplay = 4194388,
        KeyMediastop = 4194389,
        KeyMediaprevious = 4194390,
        KeyMedianext = 4194391,
        KeyMediarecord = 4194392,
        KeyHomepage = 4194393,
        KeyFavorites = 4194394,
        KeySearch = 4194395,
        KeyStandby = 4194396,
        KeyOpenurl = 4194397,
        KeyLaunchmail = 4194398,
        KeyLaunchmedia = 4194399,
        KeyLaunch0 = 4194400,
        KeyLaunch1 = 4194401,
        KeyLaunch2 = 4194402,
        KeyLaunch3 = 4194403,
        KeyLaunch4 = 4194404,
        KeyLaunch5 = 4194405,
        KeyLaunch6 = 4194406,
        KeyLaunch7 = 4194407,
        KeyLaunch8 = 4194408,
        KeyLaunch9 = 4194409,
        KeyLauncha = 4194410,
        KeyLaunchb = 4194411,
        KeyLaunchc = 4194412,
        KeyLaunchd = 4194413,
        KeyLaunche = 4194414,
        KeyLaunchf = 4194415,
        KeyGlobe = 4194416,
        KeyKeyboard = 4194417,
        KeyJisEisu = 4194418,
        KeyJisKana = 4194419,
        KeyUnknown = 8388607,
        KeySpace = 32,
        KeyExclam = 33,
        KeyQuotedbl = 34,
        KeyNumbersign = 35,
        KeyDollar = 36,
        KeyPercent = 37,
        KeyAmpersand = 38,
        KeyApostrophe = 39,
        KeyParenleft = 40,
        KeyParenright = 41,
        KeyAsterisk = 42,
        KeyPlus = 43,
        KeyComma = 44,
        KeyMinus = 45,
        KeyPeriod = 46,
        KeySlash = 47,
        Key0 = 48,
        Key1 = 49,
        Key2 = 50,
        Key3 = 51,
        Key4 = 52,
        Key5 = 53,
        Key6 = 54,
        Key7 = 55,
        Key8 = 56,
        Key9 = 57,
        KeyColon = 58,
        KeySemicolon = 59,
        KeyLess = 60,
        KeyEqual = 61,
        KeyGreater = 62,
        KeyQuestion = 63,
        KeyAt = 64,
        KeyA = 65,
        KeyB = 66,
        KeyC = 67,
        KeyD = 68,
        KeyE = 69,
        KeyF = 70,
        KeyG = 71,
        KeyH = 72,
        KeyI = 73,
        KeyJ = 74,
        KeyK = 75,
        KeyL = 76,
        KeyM = 77,
        KeyN = 78,
        KeyO = 79,
        KeyP = 80,
        KeyQ = 81,
        KeyR = 82,
        KeyS = 83,
        KeyT = 84,
        KeyU = 85,
        KeyV = 86,
        KeyW = 87,
        KeyX = 88,
        KeyY = 89,
        KeyZ = 90,
        KeyBracketleft = 91,
        KeyBackslash = 92,
        KeyBracketright = 93,
        KeyAsciicircum = 94,
        KeyUnderscore = 95,
        KeyQuoteleft = 96,
        KeyBraceleft = 123,
        KeyBar = 124,
        KeyBraceright = 125,
        KeyAsciitilde = 126,
        KeyYen = 165,
        KeySection = 167,
    }
    enum KeyModifierMask {
        KeyCodeMask = 8388607,
        KeyModifierMask = 2130706432,
        KeyMaskCmdOrCtrl = 16777216,
        KeyMaskShift = 33554432,
        KeyMaskAlt = 67108864,
        KeyMaskMeta = 134217728,
        KeyMaskCtrl = 268435456,
        KeyMaskKpad = 536870912,
        KeyMaskGroupSwitch = 1073741824,
    }
    enum KeyLocation {
        KeyLocationUnspecified = 0,
        KeyLocationLeft = 1,
        KeyLocationRight = 2,
    }
    enum MouseButton {
        MouseButtonNone = 0,
        MouseButtonLeft = 1,
        MouseButtonRight = 2,
        MouseButtonMiddle = 3,
        MouseButtonWheelUp = 4,
        MouseButtonWheelDown = 5,
        MouseButtonWheelLeft = 6,
        MouseButtonWheelRight = 7,
        MouseButtonXbutton1 = 8,
        MouseButtonXbutton2 = 9,
    }
    enum MouseButtonMask {
        MouseButtonMaskLeft = 1,
        MouseButtonMaskRight = 2,
        MouseButtonMaskMiddle = 4,
        MouseButtonMaskMbXbutton1 = 128,
        MouseButtonMaskMbXbutton2 = 256,
    }
    enum JoyButton {
        JoyButtonInvalid = -1,
        JoyButtonA = 0,
        JoyButtonB = 1,
        JoyButtonX = 2,
        JoyButtonY = 3,
        JoyButtonBack = 4,
        JoyButtonGuide = 5,
        JoyButtonStart = 6,
        JoyButtonLeftStick = 7,
        JoyButtonRightStick = 8,
        JoyButtonLeftShoulder = 9,
        JoyButtonRightShoulder = 10,
        JoyButtonDpadUp = 11,
        JoyButtonDpadDown = 12,
        JoyButtonDpadLeft = 13,
        JoyButtonDpadRight = 14,
        JoyButtonMisc1 = 15,
        JoyButtonPaddle1 = 16,
        JoyButtonPaddle2 = 17,
        JoyButtonPaddle3 = 18,
        JoyButtonPaddle4 = 19,
        JoyButtonTouchpad = 20,
        JoyButtonMisc2 = 21,
        JoyButtonMisc3 = 22,
        JoyButtonMisc4 = 23,
        JoyButtonMisc5 = 24,
        JoyButtonMisc6 = 25,
        JoyButtonSdlMax = 26,
        JoyButtonMax = 128,
    }
    enum JoyAxis {
        JoyAxisInvalid = -1,
        JoyAxisLeftX = 0,
        JoyAxisLeftY = 1,
        JoyAxisRightX = 2,
        JoyAxisRightY = 3,
        JoyAxisTriggerLeft = 4,
        JoyAxisTriggerRight = 5,
        JoyAxisSdlMax = 6,
        JoyAxisMax = 10,
    }
    enum MidiMessage {
        MidiMessageNone = 0,
        MidiMessageNoteOff = 8,
        MidiMessageNoteOn = 9,
        MidiMessageAftertouch = 10,
        MidiMessageControlChange = 11,
        MidiMessageProgramChange = 12,
        MidiMessageChannelPressure = 13,
        MidiMessagePitchBend = 14,
        MidiMessageSystemExclusive = 240,
        MidiMessageQuarterFrame = 241,
        MidiMessageSongPositionPointer = 242,
        MidiMessageSongSelect = 243,
        MidiMessageTuneRequest = 246,
        MidiMessageTimingClock = 248,
        MidiMessageStart = 250,
        MidiMessageContinue = 251,
        MidiMessageStop = 252,
        MidiMessageActiveSensing = 254,
        MidiMessageSystemReset = 255,
    }
    enum GError {
        Ok = 0,
        Failed = 1,
        ErrUnavailable = 2,
        ErrUnconfigured = 3,
        ErrUnauthorized = 4,
        ErrParameterRangeError = 5,
        ErrOutOfMemory = 6,
        ErrFileNotFound = 7,
        ErrFileBadDrive = 8,
        ErrFileBadPath = 9,
        ErrFileNoPermission = 10,
        ErrFileAlreadyInUse = 11,
        ErrFileCantOpen = 12,
        ErrFileCantWrite = 13,
        ErrFileCantRead = 14,
        ErrFileUnrecognized = 15,
        ErrFileCorrupt = 16,
        ErrFileMissingDependencies = 17,
        ErrFileEof = 18,
        ErrCantOpen = 19,
        ErrCantCreate = 20,
        ErrQueryFailed = 21,
        ErrAlreadyInUse = 22,
        ErrLocked = 23,
        ErrTimeout = 24,
        ErrCantConnect = 25,
        ErrCantResolve = 26,
        ErrConnectionError = 27,
        ErrCantAcquireResource = 28,
        ErrCantFork = 29,
        ErrInvalidData = 30,
        ErrInvalidParameter = 31,
        ErrAlreadyExists = 32,
        ErrDoesNotExist = 33,
        ErrDatabaseCantRead = 34,
        ErrDatabaseCantWrite = 35,
        ErrCompilationFailed = 36,
        ErrMethodNotFound = 37,
        ErrLinkFailed = 38,
        ErrScriptFailed = 39,
        ErrCyclicLink = 40,
        ErrInvalidDeclaration = 41,
        ErrDuplicateSymbol = 42,
        ErrParseError = 43,
        ErrBusy = 44,
        ErrSkip = 45,
        ErrHelp = 46,
        ErrBug = 47,
        ErrPrinterOnFire = 48,
    }
    enum PropertyHint {
        PropertyHintNone = 0,
        PropertyHintRange = 1,
        PropertyHintEnum = 2,
        PropertyHintEnumSuggestion = 3,
        PropertyHintExpEasing = 4,
        PropertyHintLink = 5,
        PropertyHintFlags = 6,
        PropertyHintLayers2DRender = 7,
        PropertyHintLayers2DPhysics = 8,
        PropertyHintLayers2DNavigation = 9,
        PropertyHintLayers3DRender = 10,
        PropertyHintLayers3DPhysics = 11,
        PropertyHintLayers3DNavigation = 12,
        PropertyHintLayersAvoidance = 37,
        PropertyHintFile = 13,
        PropertyHintDir = 14,
        PropertyHintGlobalFile = 15,
        PropertyHintGlobalDir = 16,
        PropertyHintResourceType = 17,
        PropertyHintMultilineText = 18,
        PropertyHintExpression = 19,
        PropertyHintPlaceholderText = 20,
        PropertyHintColorNoAlpha = 21,
        PropertyHintObjectId = 22,
        PropertyHintTypeString = 23,
        PropertyHintNodePathToEditedNode = 24,
        PropertyHintObjectTooBig = 25,
        PropertyHintNodePathValidTypes = 26,
        PropertyHintSaveFile = 27,
        PropertyHintGlobalSaveFile = 28,
        PropertyHintIntIsObjectid = 29,
        PropertyHintIntIsPointer = 30,
        PropertyHintArrayType = 31,
        PropertyHintDictionaryType = 38,
        PropertyHintLocaleId = 32,
        PropertyHintLocalizableString = 33,
        PropertyHintNodeType = 34,
        PropertyHintHideQuaternionEdit = 35,
        PropertyHintPassword = 36,
        PropertyHintToolButton = 39,
        PropertyHintOneshot = 40,
        PropertyHintGroupEnable = 42,
        PropertyHintInputName = 43,
        PropertyHintFilePath = 44,
        PropertyHintAudioBus = 45,
        PropertyHintMax = 46,
    }
    enum PropertyUsageFlags {
        PropertyUsageNone = 0,
        PropertyUsageStorage = 2,
        PropertyUsageEditor = 4,
        PropertyUsageInternal = 8,
        PropertyUsageCheckable = 16,
        PropertyUsageChecked = 32,
        PropertyUsageGroup = 64,
        PropertyUsageCategory = 128,
        PropertyUsageSubgroup = 256,
        PropertyUsageClassIsBitfield = 512,
        PropertyUsageNoInstanceState = 1024,
        PropertyUsageRestartIfChanged = 2048,
        PropertyUsageScriptVariable = 4096,
        PropertyUsageStoreIfNull = 8192,
        PropertyUsageUpdateAllIfModified = 16384,
        PropertyUsageScriptDefaultValue = 32768,
        PropertyUsageClassIsEnum = 65536,
        PropertyUsageNilIsVariant = 131072,
        PropertyUsageArray = 262144,
        PropertyUsageAlwaysDuplicate = 524288,
        PropertyUsageNeverDuplicate = 1048576,
        PropertyUsageHighEndGfx = 2097152,
        PropertyUsageNodePathFromSceneRoot = 4194304,
        PropertyUsageResourceNotPersistent = 8388608,
        PropertyUsageKeyingIncrements = 16777216,
        PropertyUsageDeferredSetResource = 33554432,
        PropertyUsageEditorInstantiateObject = 67108864,
        PropertyUsageEditorBasicSetting = 134217728,
        PropertyUsageReadOnly = 268435456,
        PropertyUsageSecret = 536870912,
        PropertyUsageDefault = 6,
        PropertyUsageNoEditor = 2,
    }
    enum MethodFlags {
        MethodFlagNormal = 1,
        MethodFlagEditor = 2,
        MethodFlagConst = 4,
        MethodFlagVirtual = 8,
        MethodFlagVararg = 16,
        MethodFlagStatic = 32,
        MethodFlagObjectCore = 64,
        MethodFlagVirtualRequired = 128,
        MethodFlagsDefault = 1,
    }
    const Uint8Max = 255
    const Uint16Max = 65535
    const Uint32Max = 4294967295
    const Int8Min = -128
    const Int8Max = 127
    const Int16Min = -32768
    const Int16Max = 32767
    const Int32Min = -2147483648
    const Int32Max = 2147483647
    const Int64Min = -9223372036854776000
    const Int64Max = 9223372036854775807
    namespace Variant {
        enum Type {
            TypeNil = 0,
            TypeBool = 1,
            TypeInt = 2,
            TypeFloat = 3,
            TypeString = 4,
            TypeVector2 = 5,
            TypeVector2I = 6,
            TypeRect2 = 7,
            TypeRect2I = 8,
            TypeVector3 = 9,
            TypeVector3I = 10,
            TypeTransform2D = 11,
            TypeVector4 = 12,
            TypeVector4I = 13,
            TypePlane = 14,
            TypeQuaternion = 15,
            TypeAabb = 16,
            TypeBasis = 17,
            TypeTransform3D = 18,
            TypeProjection = 19,
            TypeColor = 20,
            TypeStringName = 21,
            TypeNodePath = 22,
            TypeRid = 23,
            TypeObject = 24,
            TypeCallable = 25,
            TypeSignal = 26,
            TypeDictionary = 27,
            TypeArray = 28,
            TypePackedByteArray = 29,
            TypePackedInt32Array = 30,
            TypePackedInt64Array = 31,
            TypePackedFloat32Array = 32,
            TypePackedFloat64Array = 33,
            TypePackedStringArray = 34,
            TypePackedVector2Array = 35,
            TypePackedVector3Array = 36,
            TypePackedColorArray = 37,
            TypePackedVector4Array = 38,
            TypeMax = 39,
        }
    }
    namespace Variant {
        enum Operator {
            OpEqual = 0,
            OpNotEqual = 1,
            OpLess = 2,
            OpLessEqual = 3,
            OpGreater = 4,
            OpGreaterEqual = 5,
            OpAdd = 6,
            OpSubtract = 7,
            OpMultiply = 8,
            OpDivide = 9,
            OpNegate = 10,
            OpPositive = 11,
            OpModule = 12,
            OpPower = 13,
            OpShiftLeft = 14,
            OpShiftRight = 15,
            OpBitAnd = 16,
            OpBitOr = 17,
            OpBitXor = 18,
            OpBitNegate = 19,
            OpAnd = 20,
            OpOr = 21,
            OpXor = 22,
            OpNot = 23,
            OpIn = 24,
            OpMax = 25,
        }
    }
    
    /** Returns the sine of angle [param angle_rad] in radians.  
     *    
     */
    function sin(angleRad: float64): float64
    
    /** Returns the cosine of angle [param angle_rad] in radians.  
     *    
     */
    function cos(angleRad: float64): float64
    
    /** Returns the tangent of angle [param angle_rad] in radians.  
     *    
     */
    function tan(angleRad: float64): float64
    
    /** Returns the hyperbolic sine of [param x].  
     *    
     */
    function sinh(x: float64): float64
    
    /** Returns the hyperbolic cosine of [param x] in radians.  
     *    
     */
    function cosh(x: float64): float64
    
    /** Returns the hyperbolic tangent of [param x].  
     *    
     */
    function tanh(x: float64): float64
    
    /** Returns the arc sine of [param x] in radians. Use to get the angle of sine [param x]. [param x] will be clamped between `-1.0` and `1.0` (inclusive), in order to prevent [method asin] from returning [constant @GDScript.NAN].  
     *    
     */
    function asin(x: float64): float64
    
    /** Returns the arc cosine of [param x] in radians. Use to get the angle of cosine [param x]. [param x] will be clamped between `-1.0` and `1.0` (inclusive), in order to prevent [method acos] from returning [constant @GDScript.NAN].  
     *    
     */
    function acos(x: float64): float64
    
    /** Returns the arc tangent of [param x] in radians. Use it to get the angle from an angle's tangent in trigonometry.  
     *  The method cannot know in which quadrant the angle should fall. See [method atan2] if you have both `y` and [code skip-lint]x`.  
     *    
     *  If [param x] is between `-PI / 2` and `PI / 2` (inclusive), `atan(tan(x))` is equal to [param x].  
     */
    function atan(x: float64): float64
    
    /** Returns the arc tangent of `y/x` in radians. Use to get the angle of tangent `y/x`. To compute the value, the method takes into account the sign of both arguments in order to determine the quadrant.  
     *  Important note: The Y coordinate comes first, by convention.  
     *    
     */
    function atan2(y: float64, x: float64): float64
    
    /** Returns the hyperbolic arc (also called inverse) sine of [param x], returning a value in radians. Use it to get the angle from an angle's sine in hyperbolic space.  
     *    
     */
    function asinh(x: float64): float64
    
    /** Returns the hyperbolic arc (also called inverse) cosine of [param x], returning a value in radians. Use it to get the angle from an angle's cosine in hyperbolic space if [param x] is larger or equal to 1. For values of [param x] lower than 1, it will return 0, in order to prevent [method acosh] from returning [constant @GDScript.NAN].  
     *    
     */
    function acosh(x: float64): float64
    
    /** Returns the hyperbolic arc (also called inverse) tangent of [param x], returning a value in radians. Use it to get the angle from an angle's tangent in hyperbolic space if [param x] is between -1 and 1 (non-inclusive).  
     *  In mathematics, the inverse hyperbolic tangent is only defined for -1 < [param x] < 1 in the real set, so values equal or lower to -1 for [param x] return negative [constant @GDScript.INF] and values equal or higher than 1 return positive [constant @GDScript.INF] in order to prevent [method atanh] from returning [constant @GDScript.NAN].  
     *    
     */
    function atanh(x: float64): float64
    
    /** Returns the square root of [param x], where [param x] is a non-negative number.  
     *    
     *      
     *  **Note:** Negative values of [param x] return NaN ("Not a Number"). In C#, if you need negative inputs, use `System.Numerics.Complex`.  
     */
    function sqrt(x: float64): float64
    
    /** Returns the floating-point remainder of [param x] divided by [param y], keeping the sign of [param x].  
     *    
     *  For the integer remainder operation, use the `%` operator.  
     */
    function fmod(x: float64, y: float64): float64
    
    /** Returns the floating-point modulus of [param x] divided by [param y], wrapping equally in positive and negative.  
     *    
     *  Prints:  
     *  [codeblock lang=text]  
     *   (x)  (fmod(x, 1.5))   (fposmod(x, 1.5))  
     *  -1.5           -0.0  |  0.0  
     *  -1.0           -1.0  |  0.5  
     *  -0.5           -0.5  |  1.0  
     *   0.0            0.0  |  0.0  
     *   0.5            0.5  |  0.5  
     *   1.0            1.0  |  1.0  
     *   1.5            0.0  |  0.0  
     *  [/codeblock]  
     */
    function fposmod(x: float64, y: float64): float64
    
    /** Returns the integer modulus of [param x] divided by [param y] that wraps equally in positive and negative.  
     *    
     *  Prints:  
     *  [codeblock lang=text]  
     *  (i)  (i % 3)   (posmod(i, 3))  
     *  -3        0  |  0  
     *  -2       -2  |  1  
     *  -1       -1  |  2  
     *   0        0  |  0  
     *   1        1  |  1  
     *   2        2  |  2  
     *   3        0  |  0  
     *  [/codeblock]  
     */
    function posmod(x: int64, y: int64): int64
    
    /** Rounds [param x] downward (towards negative infinity), returning the largest whole number that is not more than [param x]. Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *  See also [method ceil], [method round], and [method snapped].  
     *      
     *  **Note:** For better type safety, use [method floorf], [method floori], [method Vector2.floor], [method Vector3.floor], or [method Vector4.floor].  
     */
    function floor(x: any): any
    
    /** Rounds [param x] downward (towards negative infinity), returning the largest whole number that is not more than [param x].  
     *  A type-safe version of [method floor], returning a [float].  
     */
    function floorf(x: float64): float64
    
    /** Rounds [param x] downward (towards negative infinity), returning the largest whole number that is not more than [param x].  
     *  A type-safe version of [method floor], returning an [int].  
     *      
     *  **Note:** This function is  *not*  the same as `int(x)`, which rounds towards 0.  
     */
    function floori(x: float64): int64
    
    /** Rounds [param x] upward (towards positive infinity), returning the smallest whole number that is not less than [param x]. Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *  See also [method floor], [method round], and [method snapped].  
     *      
     *  **Note:** For better type safety, use [method ceilf], [method ceili], [method Vector2.ceil], [method Vector3.ceil], or [method Vector4.ceil].  
     */
    function ceil(x: any): any
    
    /** Rounds [param x] upward (towards positive infinity), returning the smallest whole number that is not less than [param x].  
     *  A type-safe version of [method ceil], returning a [float].  
     */
    function ceilf(x: float64): float64
    
    /** Rounds [param x] upward (towards positive infinity), returning the smallest whole number that is not less than [param x].  
     *  A type-safe version of [method ceil], returning an [int].  
     */
    function ceili(x: float64): int64
    
    /** Rounds [param x] to the nearest whole number, with halfway cases rounded away from 0. Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *  See also [method floor], [method ceil], and [method snapped].  
     *      
     *  **Note:** For better type safety, use [method roundf], [method roundi], [method Vector2.round], [method Vector3.round], or [method Vector4.round].  
     */
    function round(x: any): any
    
    /** Rounds [param x] to the nearest whole number, with halfway cases rounded away from 0.  
     *  A type-safe version of [method round], returning a [float].  
     */
    function roundf(x: float64): float64
    
    /** Rounds [param x] to the nearest whole number, with halfway cases rounded away from 0.  
     *  A type-safe version of [method round], returning an [int].  
     */
    function roundi(x: float64): int64
    
    /** Returns the absolute value of a [Variant] parameter [param x] (i.e. non-negative value). Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *      
     *  **Note:** For better type safety, use [method absf], [method absi], [method Vector2.abs], [method Vector2i.abs], [method Vector3.abs], [method Vector3i.abs], [method Vector4.abs], or [method Vector4i.abs].  
     */
    function abs(x: any): any
    
    /** Returns the absolute value of float parameter [param x] (i.e. positive value).  
     *    
     */
    function absf(x: float64): float64
    
    /** Returns the absolute value of int parameter [param x] (i.e. positive value).  
     *    
     */
    function absi(x: int64): int64
    
    /** Returns the same type of [Variant] as [param x], with `-1` for negative values, `1` for positive values, and `0` for zeros. For `nan` values it returns 0.  
     *  Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *      
     *  **Note:** For better type safety, use [method signf], [method signi], [method Vector2.sign], [method Vector2i.sign], [method Vector3.sign], [method Vector3i.sign], [method Vector4.sign], or [method Vector4i.sign].  
     */
    function sign(x: any): any
    
    /** Returns `-1.0` if [param x] is negative, `1.0` if [param x] is positive, and `0.0` if [param x] is zero. For `nan` values of [param x] it returns 0.0.  
     *    
     */
    function signf(x: float64): float64
    
    /** Returns `-1` if [param x] is negative, `1` if [param x] is positive, and `0` if [param x] is zero.  
     *    
     */
    function signi(x: int64): int64
    
    /** Returns the multiple of [param step] that is the closest to [param x]. This can also be used to round a floating-point number to an arbitrary number of decimals.  
     *  The returned value is the same type of [Variant] as [param step]. Supported types: [int], [float], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i].  
     *    
     *  See also [method ceil], [method floor], and [method round].  
     *      
     *  **Note:** For better type safety, use [method snappedf], [method snappedi], [method Vector2.snapped], [method Vector2i.snapped], [method Vector3.snapped], [method Vector3i.snapped], [method Vector4.snapped], or [method Vector4i.snapped].  
     */
    function snapped(x: any, step: any): any
    
    /** Returns the multiple of [param step] that is the closest to [param x]. This can also be used to round a floating-point number to an arbitrary number of decimals.  
     *  A type-safe version of [method snapped], returning a [float].  
     *    
     */
    function snappedf(x: float64, step: float64): float64
    
    /** Returns the multiple of [param step] that is the closest to [param x].  
     *  A type-safe version of [method snapped], returning an [int].  
     *    
     */
    function snappedi(x: float64, step: int64): int64
    
    /** Returns the result of [param base] raised to the power of [param exp].  
     *  In GDScript, this is the equivalent of the `**` operator.  
     *    
     */
    function pow(base: float64, exp: float64): float64
    
    /** Returns the [url=https://en.wikipedia.org/wiki/Natural_logarithm]natural logarithm[/url] of [param x] (base [url=https://en.wikipedia.org/wiki/E_(mathematical_constant)]e[/url], with  *e*  being approximately 2.71828). This is the amount of time needed to reach a certain level of continuous growth.  
     *      
     *  **Note:** This is not the same as the "log" function on most calculators, which uses a base 10 logarithm. To use base 10 logarithm, use `log(x) / log(10)`.  
     *    
     *      
     *  **Note:** The logarithm of `0` returns `-inf`, while negative values return `-nan`.  
     */
    function log(x: float64): float64
    
    /** The natural exponential function. It raises the mathematical constant  *e*  to the power of [param x] and returns it.  
     *   *e*  has an approximate value of 2.71828, and can be obtained with `exp(1)`.  
     *  For exponents to other bases use the method [method pow].  
     *    
     */
    function exp(x: float64): float64
    
    /** Returns `true` if [param x] is a NaN ("Not a Number" or invalid) value. This method is needed as [constant @GDScript.NAN] is not equal to itself, which means `x == NAN` can't be used to check whether a value is a NaN. */
    function isNan(x: float64): boolean
    
    /** Returns `true` if [param x] is either positive infinity or negative infinity. See also [method is_finite] and [method is_nan]. */
    function isInf(x: float64): boolean
    
    /** Returns `true` if [param a] and [param b] are approximately equal to each other.  
     *  Here, "approximately equal" means that [param a] and [param b] are within a small internal epsilon of each other, which scales with the magnitude of the numbers.  
     *  Infinity values of the same sign are considered equal.  
     */
    function isEqualApprox(a: float64, b: float64): boolean
    
    /** Returns `true` if [param x] is zero or almost zero. The comparison is done using a tolerance calculation with a small internal epsilon.  
     *  This function is faster than using [method is_equal_approx] with one value as zero.  
     */
    function isZeroApprox(x: float64): boolean
    
    /** Returns whether [param x] is a finite value, i.e. it is not [constant @GDScript.NAN], positive infinity, or negative infinity. See also [method is_inf] and [method is_nan]. */
    function isFinite(x: float64): boolean
    
    /** Returns an "eased" value of [param x] based on an easing function defined with [param curve]. This easing function is based on an exponent. The [param curve] can be any floating-point number, with specific values leading to the following behaviors:  
     *  [codeblock lang=text]  
     *  - Lower than -1.0 (exclusive): Ease in-out  
     *  - -1.0: Linear  
     *  - Between -1.0 and 0.0 (exclusive): Ease out-in  
     *  - 0.0: Constant  
     *  - Between 0.0 to 1.0 (exclusive): Ease out  
     *  - 1.0: Linear  
     *  - Greater than 1.0 (exclusive): Ease in  
     *  [/codeblock]  
     *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/ease_cheatsheet.png]ease() curve values cheatsheet[/url]  
     *  See also [method smoothstep]. If you need to perform more advanced transitions, use [method Tween.interpolate_value].  
     */
    function ease(x: float64, curve: float64): float64
    
    /** Returns the position of the first non-zero digit, after the decimal point. Note that the maximum return value is 10, which is a design decision in the implementation.  
     *    
     */
    function stepDecimals(x: float64): int64
    
    /** Linearly interpolates between two values by the factor defined in [param weight]. To perform interpolation, [param weight] should be between `0.0` and `1.0` (inclusive). However, values outside this range are allowed and can be used to perform  *extrapolation* . If this is not desired, use [method clampf] to limit [param weight].  
     *  Both [param from] and [param to] must be the same type. Supported types: [int], [float], [Vector2], [Vector3], [Vector4], [Color], [Quaternion], [Basis], [Transform2D], [Transform3D].  
     *    
     *  See also [method inverse_lerp] which performs the reverse of this operation. To perform eased interpolation with [method lerp], combine it with [method ease] or [method smoothstep]. See also [method remap] to map a continuous series of values to another.  
     *      
     *  **Note:** For better type safety, use [method lerpf], [method Vector2.lerp], [method Vector3.lerp], [method Vector4.lerp], [method Color.lerp], [method Quaternion.slerp], [method Basis.slerp], [method Transform2D.interpolate_with], or [method Transform3D.interpolate_with].  
     */
    function lerp(from: any, to: any, weight: any): any
    
    /** Linearly interpolates between two values by the factor defined in [param weight]. To perform interpolation, [param weight] should be between `0.0` and `1.0` (inclusive). However, values outside this range are allowed and can be used to perform  *extrapolation* . If this is not desired, use [method clampf] on the result of this function.  
     *    
     *  See also [method inverse_lerp] which performs the reverse of this operation. To perform eased interpolation with [method lerp], combine it with [method ease] or [method smoothstep].  
     */
    function lerpf(from: float64, to: float64, weight: float64): float64
    
    /** Cubic interpolates between two values by the factor defined in [param weight] with [param pre] and [param post] values. */
    function cubicInterpolate(from: float64, to: float64, pre: float64, post: float64, weight: float64): float64
    
    /** Cubic interpolates between two rotation values with shortest path by the factor defined in [param weight] with [param pre] and [param post] values. See also [method lerp_angle]. */
    function cubicInterpolateAngle(from: float64, to: float64, pre: float64, post: float64, weight: float64): float64
    
    /** Cubic interpolates between two values by the factor defined in [param weight] with [param pre] and [param post] values.  
     *  It can perform smoother interpolation than [method cubic_interpolate] by the time values.  
     */
    function cubicInterpolateInTime(from: float64, to: float64, pre: float64, post: float64, weight: float64, toT: float64, preT: float64, postT: float64): float64
    
    /** Cubic interpolates between two rotation values with shortest path by the factor defined in [param weight] with [param pre] and [param post] values. See also [method lerp_angle].  
     *  It can perform smoother interpolation than [method cubic_interpolate_angle] by the time values.  
     */
    function cubicInterpolateAngleInTime(from: float64, to: float64, pre: float64, post: float64, weight: float64, toT: float64, preT: float64, postT: float64): float64
    
    /** Returns the point at the given [param t] on a one-dimensional [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by the given [param control_1], [param control_2], and [param end] points. */
    function bezierInterpolate(start: float64, control1: float64, control2: float64, end: float64, t: float64): float64
    
    /** Returns the derivative at the given [param t] on a one-dimensional [url=https://en.wikipedia.org/wiki/B%C3%A9zier_curve]Bézier curve[/url] defined by the given [param control_1], [param control_2], and [param end] points. */
    function bezierDerivative(start: float64, control1: float64, control2: float64, end: float64, t: float64): float64
    
    /** Returns the difference between the two angles (in radians), in the range of `[-PI, +PI]`. When [param from] and [param to] are opposite, returns `-PI` if [param from] is smaller than [param to], or `PI` otherwise. */
    function angleDifference(from: float64, to: float64): float64
    
    /** Linearly interpolates between two angles (in radians) by a [param weight] value between 0.0 and 1.0.  
     *  Similar to [method lerp], but interpolates correctly when the angles wrap around [constant @GDScript.TAU]. To perform eased interpolation with [method lerp_angle], combine it with [method ease] or [method smoothstep].  
     *    
     *      
     *  **Note:** This function lerps through the shortest path between [param from] and [param to]. However, when these two angles are approximately `PI + k * TAU` apart for any integer `k`, it's not obvious which way they lerp due to floating-point precision errors. For example, `lerp_angle(0, PI, weight)` lerps counter-clockwise, while `lerp_angle(0, PI + 5 * TAU, weight)` lerps clockwise.  
     */
    function lerpAngle(from: float64, to: float64, weight: float64): float64
    
    /** Returns an interpolation or extrapolation factor considering the range specified in [param from] and [param to], and the interpolated value specified in [param weight]. The returned value will be between `0.0` and `1.0` if [param weight] is between [param from] and [param to] (inclusive). If [param weight] is located outside this range, then an extrapolation factor will be returned (return value lower than `0.0` or greater than `1.0`). Use [method clamp] on the result of [method inverse_lerp] if this is not desired.  
     *    
     *  See also [method lerp], which performs the reverse of this operation, and [method remap] to map a continuous series of values to another.  
     */
    function inverseLerp(from: float64, to: float64, weight: float64): float64
    
    /** Maps a [param value] from range `[istart, istop]` to `[ostart, ostop]`. See also [method lerp] and [method inverse_lerp]. If [param value] is outside `[istart, istop]`, then the resulting value will also be outside `[ostart, ostop]`. If this is not desired, use [method clamp] on the result of this function.  
     *    
     *  For complex use cases where multiple ranges are needed, consider using [Curve] or [Gradient] instead.  
     *      
     *  **Note:** If `istart == istop`, the return value is undefined (most likely NaN, INF, or -INF).  
     */
    function remap(value: float64, istart: float64, istop: float64, ostart: float64, ostop: float64): float64
    
    /** Returns a smooth cubic Hermite interpolation between `0` and `1`.  
     *  For positive ranges (when `from <= to`) the return value is `0` when `x <= from`, and `1` when `x >= to`. If [param x] lies between [param from] and [param to], the return value follows an S-shaped curve that smoothly transitions from `0` to `1`.  
     *  For negative ranges (when `from > to`) the function is mirrored and returns `1` when `x <= to` and `0` when `x >= from`.  
     *  This S-shaped curve is the cubic Hermite interpolator, given by `f(y) = 3*y^2 - 2*y^3` where `y = (x-from) / (to-from)`.  
     *    
     *  Compared to [method ease] with a curve value of `-1.6521`, [method smoothstep] returns the smoothest possible curve with no sudden changes in the derivative. If you need to perform more advanced transitions, use [Tween] or [AnimationPlayer].  
     *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/smoothstep_ease_comparison.png]Comparison between smoothstep() and ease(x, -1.6521) return values[/url]  
     *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/smoothstep_range.webp]Smoothstep() return values with positive, zero, and negative ranges[/url]  
     */
    function smoothstep(from: float64, to: float64, x: float64): float64
    
    /** Moves [param from] toward [param to] by the [param delta] amount. Will not go past [param to].  
     *  Use a negative [param delta] value to move away.  
     *    
     */
    function moveToward(from: float64, to: float64, delta: float64): float64
    
    /** Rotates [param from] toward [param to] by the [param delta] amount. Will not go past [param to].  
     *  Similar to [method move_toward], but interpolates correctly when the angles wrap around [constant @GDScript.TAU].  
     *  If [param delta] is negative, this function will rotate away from [param to], toward the opposite angle, and will not go past the opposite angle.  
     */
    function rotateToward(from: float64, to: float64, delta: float64): float64
    
    /** Converts an angle expressed in degrees to radians.  
     *    
     */
    function degToRad(deg: float64): float64
    
    /** Converts an angle expressed in radians to degrees.  
     *    
     */
    function radToDeg(rad: float64): float64
    
    /** Converts from linear energy to decibels (audio). Since volume is not normally linear, this can be used to implement volume sliders that behave as expected.  
     *  **Example:** Change the Master bus's volume through a [Slider] node, which ranges from `0.0` to `1.0`:  
     *    
     */
    function linearToDb(lin: float64): float64
    
    /** Converts from decibels to linear energy (audio). */
    function dbToLinear(db: float64): float64
    
    /** Wraps the [Variant] [param value] between [param min] and [param max]. [param min] is  *inclusive*  while [param max] is  *exclusive* . This can be used for creating loop-like behavior or infinite surfaces.  
     *  Variant types [int] and [float] are supported. If any of the arguments is [float], this function returns a [float], otherwise it returns an [int].  
     *    
     */
    function wrap(value: any, min: any, max: any): any
    
    /** Wraps the integer [param value] between [param min] and [param max]. [param min] is  *inclusive*  while [param max] is  *exclusive* . This can be used for creating loop-like behavior or infinite surfaces.  
     *    
     *    
     */
    function wrapi(value: int64, min: int64, max: int64): int64
    
    /** Wraps the float [param value] between [param min] and [param max]. [param min] is  *inclusive*  while [param max] is  *exclusive* . This can be used for creating loop-like behavior or infinite surfaces.  
     *    
     *    
     *    
     *      
     *  **Note:** If [param min] is `0`, this is equivalent to [method fposmod], so prefer using that instead. [method wrapf] is more flexible than using the [method fposmod] approach by giving the user control over the minimum value.  
     */
    function wrapf(value: float64, min: float64, max: float64): float64
    
    /** Returns the maximum of the given numeric values. This function can take any number of arguments.  
     *    
     *      
     *  **Note:** When using this on vectors it will  *not*  perform component-wise maximum, and will pick the largest value when compared using `x < y`. To perform component-wise maximum, use [method Vector2.max], [method Vector2i.max], [method Vector3.max], [method Vector3i.max], [method Vector4.max], and [method Vector4i.max].  
     */
    function max(...varargs: any[]): any
    
    /** Returns the maximum of two [int] values.  
     *    
     */
    function maxi(a: int64, b: int64): int64
    
    /** Returns the maximum of two [float] values.  
     *    
     */
    function maxf(a: float64, b: float64): float64
    
    /** Returns the minimum of the given numeric values. This function can take any number of arguments.  
     *    
     *      
     *  **Note:** When using this on vectors it will  *not*  perform component-wise minimum, and will pick the smallest value when compared using `x < y`. To perform component-wise minimum, use [method Vector2.min], [method Vector2i.min], [method Vector3.min], [method Vector3i.min], [method Vector4.min], and [method Vector4i.min].  
     */
    function min(...varargs: any[]): any
    
    /** Returns the minimum of two [int] values.  
     *    
     */
    function mini(a: int64, b: int64): int64
    
    /** Returns the minimum of two [float] values.  
     *    
     */
    function minf(a: float64, b: float64): float64
    
    /** Clamps the [param value], returning a [Variant] not less than [param min] and not more than [param max]. Any values that can be compared with the less than and greater than operators will work.  
     *    
     *      
     *  **Note:** For better type safety, use [method clampf], [method clampi], [method Vector2.clamp], [method Vector2i.clamp], [method Vector3.clamp], [method Vector3i.clamp], [method Vector4.clamp], [method Vector4i.clamp], or [method Color.clamp] (not currently supported by this method).  
     *      
     *  **Note:** When using this on vectors it will  *not*  perform component-wise clamping, and will pick [param min] if `value < min` or [param max] if `value > max`. To perform component-wise clamping use the methods listed above.  
     */
    function clamp(value: any, min: any, max: any): any
    
    /** Clamps the [param value], returning an [int] not less than [param min] and not more than [param max].  
     *    
     */
    function clampi(value: int64, min: int64, max: int64): int64
    
    /** Clamps the [param value], returning a [float] not less than [param min] and not more than [param max].  
     *    
     */
    function clampf(value: float64, min: float64, max: float64): float64
    
    /** Returns the smallest integer power of 2 that is greater than or equal to [param value].  
     *    
     *  **Warning:** Due to its implementation, this method returns `0` rather than `1` for values less than or equal to `0`, with an exception for [param value] being the smallest negative 64-bit integer (`-9223372036854775808`) in which case the [param value] is returned unchanged.  
     */
    function nearestPo2(value: int64): int64
    
    /** Wraps [param value] between `0` and the [param length]. If the limit is reached, the next value the function returns is decreased to the `0` side or increased to the [param length] side (like a triangle wave). If [param length] is less than zero, it becomes positive.  
     *    
     */
    function pingpong(value: float64, length: float64): float64
    
    /** Randomizes the seed (or the internal state) of the random number generator. The current implementation uses a number based on the device's time.  
     *      
     *  **Note:** This function is called automatically when the project is run. If you need to fix the seed to have consistent, reproducible results, use [method seed] to initialize the random number generator.  
     */
    function randomize(): void
    
    /** Returns a random unsigned 32-bit integer. Use remainder to obtain a random value in the interval `[0, N - 1]` (where N is smaller than 2^32).  
     *    
     */
    function randi(): int64
    
    /** Returns a random floating-point value between `0.0` and `1.0` (inclusive).  
     *    
     */
    function randf(): float64
    
    /** Returns a random signed 32-bit integer between [param from] and [param to] (inclusive). If [param to] is lesser than [param from], they are swapped.  
     *    
     */
    function randiRange(from: int64, to: int64): int64
    
    /** Returns a random floating-point value between [param from] and [param to] (inclusive).  
     *    
     */
    function randfRange(from: float64, to: float64): float64
    
    /** Returns a [url=https://en.wikipedia.org/wiki/Normal_distribution]normally-distributed[/url], pseudo-random floating-point value from the specified [param mean] and a standard [param deviation]. This is also known as a Gaussian distribution.  
     *      
     *  **Note:** This method uses the [url=https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform]Box-Muller transform[/url] algorithm.  
     */
    function randfn(mean: float64, deviation: float64): float64
    
    /** Sets the seed for the random number generator to [param base]. Setting the seed manually can ensure consistent, repeatable results for most random functions.  
     *    
     */
    function seed(base: int64): void
    
    /** Given a [param seed], returns a [PackedInt64Array] of size `2`, where its first element is the randomized [int] value, and the second element is the same as [param seed]. Passing the same [param seed] consistently returns the same array.  
     *      
     *  **Note:** "Seed" here refers to the internal state of the pseudo random number generator, currently implemented as a 64 bit integer.  
     *    
     */
    function randFromSeed(seed: int64): PackedInt64Array
    
    /** Returns a [WeakRef] instance holding a weak reference to [param obj]. Returns an empty [WeakRef] instance if [param obj] is `null`. Prints an error and returns `null` if [param obj] is neither [Object]-derived nor `null`.  
     *  A weak reference to an object is not enough to keep the object alive: when the only remaining references to a referent are weak references, garbage collection is free to destroy the referent and reuse its memory for something else. However, until the object is actually destroyed the weak reference may return the object even if there are no strong references to it.  
     */
    function weakref(obj: any): any
    
    /** Returns the internal type of the given [param variable], using the [enum Variant.Type] values.  
     *    
     *  See also [method type_string].  
     */
    function godotTypeof(variable: any): int64
    
    /** Converts the given [param variant] to the given [param type], using the [enum Variant.Type] values. This method is generous with how it handles types, it can automatically convert between array types, convert numeric [String]s to [int], and converting most things to [String].  
     *  If the type conversion cannot be done, this method will return the default value for that type, for example converting [Rect2] to [Vector2] will always return [constant Vector2.ZERO]. This method will never show error messages as long as [param type] is a valid Variant type.  
     *  The returned value is a [Variant], but the data inside and its type will be the same as the requested type.  
     *    
     */
    function typeConvert(variant: any, type: int64): any
    
    /** Converts one or more arguments of any [Variant] type to a [String] in the best way possible.  
     *    
     */
    function str(...varargs: any[]): string
    
    /** Returns a human-readable name for the given [enum Error] code.  
     *    
     */
    function errorString(error: int64): string
    
    /** Returns a human-readable name of the given [param type], using the [enum Variant.Type] values.  
     *    
     *  See also [method typeof].  
     */
    function typeString(type: int64): string
    
    /** Converts one or more arguments of any type to string in the best way possible and prints them to the console.  
     *    
     *      
     *  **Note:** Consider using [method push_error] and [method push_warning] to print error and warning messages instead of [method print] or [method print_rich]. This distinguishes them from print messages used for debugging purposes, while also displaying a stack trace when an error or warning is printed. See also [member Engine.print_to_stdout] and [member ProjectSettings.application/run/disable_stdout].  
     */
    function print(...varargs: any[]): void
    
    /** Converts one or more arguments of any type to string in the best way possible and prints them to the console.  
     *  The following BBCode tags are supported: `b`, `i`, `u`, `s`, `indent`, `code`, `url`, `center`, `right`, `color`, `bgcolor`, `fgcolor`.  
     *  URL tags support both URLs wrapped by a URL tag and URLs with a different title ([code skip-lint][url=address]text[/url]`). Support for URLs with a different title varies across terminal emulators. Most modern terminal emulators support them, but Terminal.app and conhost (the legacy Windows console) do not.  
     *  When printing to standard output, the supported subset of BBCode is converted to ANSI escape codes for the terminal emulator to display. Support for ANSI escape codes varies across terminal emulators, especially for italic and strikethrough. In standard output, `code` is represented with faint text but without any font change. Unsupported tags are left as-is in standard output.  
     *    
     *      
     *  **Note:** Consider using [method push_error] and [method push_warning] to print error and warning messages instead of [method print] or [method print_rich]. This distinguishes them from print messages used for debugging purposes, while also displaying a stack trace when an error or warning is printed.  
     *      
     *  **Note:** Output displayed in the editor supports clickable [code skip-lint][url=address]text[/url]` tags. The [code skip-lint][url]` tag's `address` value is handled by [method OS.shell_open] when clicked.  
     */
    function printRich(...varargs: any[]): void
    
    /** Prints one or more arguments to strings in the best way possible to standard error line.  
     *    
     */
    function printerr(...varargs: any[]): void
    
    /** Prints one or more arguments to the console with a tab between each argument.  
     *    
     */
    function printt(...varargs: any[]): void
    
    /** Prints one or more arguments to the console with a space between each argument.  
     *    
     */
    function prints(...varargs: any[]): void
    
    /** Prints one or more arguments to strings in the best way possible to the OS terminal. Unlike [method print], no newline is automatically added at the end.  
     *      
     *  **Note:** The OS terminal is  *not*  the same as the editor's Output dock. The output sent to the OS terminal can be seen when running Godot from a terminal. On Windows, this requires using the `console.exe` executable.  
     *    
     */
    function printraw(...varargs: any[]): void
    
    /** If verbose mode is enabled ([method OS.is_stdout_verbose] returning `true`), converts one or more arguments of any type to string in the best way possible and prints them to the console. */
    function printVerbose(...varargs: any[]): void
    
    /** Pushes an error message to Godot's built-in debugger and to the OS terminal.  
     *    
     *      
     *  **Note:** This function does not pause project execution. To print an error message and pause project execution in debug builds, use `assert(false, "test error")` instead.  
     */
    function pushError(...varargs: any[]): void
    
    /** Pushes a warning message to Godot's built-in debugger and to the OS terminal.  
     *    
     */
    function pushWarning(...varargs: any[]): void
    
    /** Converts a [Variant] [param variable] to a formatted [String] that can then be parsed using [method str_to_var].  
     *    
     *  Prints:  
     *  [codeblock lang=text]  
     *  {  
     *  	"a": 1,  
     *  	"b": 2  
     *  }  
     *  [/codeblock]  
     *      
     *  **Note:** Converting [Signal] or [Callable] is not supported and will result in an empty value for these types, regardless of their data.  
     */
    function varToStr(variable: any): string
    
    /** Converts a formatted [param string] that was returned by [method var_to_str] to the original [Variant].  
     *    
     */
    function strToVar(string_: string): any
    
    /** Encodes a [Variant] value to a byte array, without encoding objects. Deserialization can be done with [method bytes_to_var].  
     *      
     *  **Note:** If you need object serialization, see [method var_to_bytes_with_objects].  
     *      
     *  **Note:** Encoding [Callable] is not supported and will result in an empty value, regardless of the data.  
     */
    function varToBytes(variable: any): PackedByteArray
    
    /** Decodes a byte array back to a [Variant] value, without decoding objects.  
     *      
     *  **Note:** If you need object deserialization, see [method bytes_to_var_with_objects].  
     */
    function bytesToVar(bytes: PackedByteArray | byte[] | ArrayBuffer): any
    
    /** Encodes a [Variant] value to a byte array. Encoding objects is allowed (and can potentially include executable code). Deserialization can be done with [method bytes_to_var_with_objects].  
     *      
     *  **Note:** Encoding [Callable] is not supported and will result in an empty value, regardless of the data.  
     */
    function varToBytesWithObjects(variable: any): PackedByteArray
    
    /** Decodes a byte array back to a [Variant] value. Decoding objects is allowed.  
     *  **Warning:** Deserialized object can contain code which gets executed. Do not use this option if the serialized object comes from untrusted sources to avoid potential security threats (remote code execution).  
     */
    function bytesToVarWithObjects(bytes: PackedByteArray | byte[] | ArrayBuffer): any
    
    /** Returns the integer hash of the passed [param variable].  
     *    
     */
    function hash(variable: any): int64
    
    /** Returns the [Object] that corresponds to [param instance_id]. All Objects have a unique instance ID. See also [method Object.get_instance_id].  
     *    
     */
    function instanceFromId(instanceId: int64): null | GObject
    
    /** Returns `true` if the Object that corresponds to [param id] is a valid object (e.g. has not been deleted from memory). All Objects have a unique instance ID. */
    function isInstanceIdValid(id: int64): boolean
    
    /** Returns `true` if [param instance] is a valid Object (e.g. has not been deleted from memory). */
    function isInstanceValid(instance: any): boolean
    
    /** Allocates a unique ID which can be used by the implementation to construct an RID. This is used mainly from native extensions to implement servers. */
    function ridAllocateId(): int64
    
    /** Creates an RID from a [param base]. This is used mainly from native extensions to build servers. */
    function ridFromInt64(base: int64): Rid
    
    /** Returns `true`, for value types, if [param a] and [param b] share the same value. Returns `true`, for reference types, if the references of [param a] and [param b] are the same.  
     *    
     *  These are [Variant] value types: `null`, [bool], [int], [float], [String], [StringName], [Vector2], [Vector2i], [Vector3], [Vector3i], [Vector4], [Vector4i], [Rect2], [Rect2i], [Transform2D], [Transform3D], [Plane], [Quaternion], [AABB], [Basis], [Projection], [Color], [NodePath], [RID], [Callable] and [Signal].  
     *  These are [Variant] reference types: [Object], [Dictionary], [Array], [PackedByteArray], [PackedInt32Array], [PackedInt64Array], [PackedFloat32Array], [PackedFloat64Array], [PackedStringArray], [PackedVector2Array], [PackedVector3Array], [PackedVector4Array], and [PackedColorArray].  
     */
    function isSame(a: any, b: any): boolean
    
    /** shorthand for getting project settings */
    function GLOBAL_GET(entry_path: StringName): any
    
    /** shorthand for getting editor settings  
     *  NOTE: calling before EditorSettings created will cause null reference exception.  
     */
    function EDITOR_GET(entry_path: StringName): any
}
