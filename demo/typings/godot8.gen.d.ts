declare module "godot" {
    // AUTO-GENERATED
    namespace Sky {
        enum RadianceSize {
            RadianceSize32 = 0,
            RadianceSize64 = 1,
            RadianceSize128 = 2,
            RadianceSize256 = 3,
            RadianceSize512 = 4,
            RadianceSize1024 = 5,
            RadianceSize2048 = 6,
            RadianceSizeMax = 7,
        }
        enum ProcessMode {
            ProcessModeAutomatic = 0,
            ProcessModeQuality = 1,
            ProcessModeIncremental = 2,
            ProcessModeRealtime = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSky extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSky extends __NameMapResource {
        sky_material: "skyMaterial";
        process_mode: "processMode";
        radiance_size: "radianceSize";
    }
    /** Defines a 3D environment's background by using a [Material].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sky.html  
     */
    class Sky extends Resource {
        constructor(identifier?: any)
        /** [Material] used to draw the background. Can be [PanoramaSkyMaterial], [ProceduralSkyMaterial], [PhysicalSkyMaterial], or even a [ShaderMaterial] if you want to use your own custom shader. */
        get skyMaterial(): null | PanoramaSkyMaterial | ProceduralSkyMaterial | PhysicalSkyMaterial | ShaderMaterial
        set skyMaterial(value: null | PanoramaSkyMaterial | ProceduralSkyMaterial | PhysicalSkyMaterial | ShaderMaterial)
        
        /** The method for generating the radiance map from the sky. The radiance map is a cubemap with increasingly blurry versions of the sky corresponding to different levels of roughness. Radiance maps can be expensive to calculate. */
        get processMode(): int64
        set processMode(value: int64)
        
        /** The [Sky]'s radiance map size. The higher the radiance map size, the more detailed the lighting from the [Sky] will be.  
         *      
         *  **Note:** Some hardware will have trouble with higher radiance sizes, especially [constant RADIANCE_SIZE_512] and above. Only use such high values on high-end hardware.  
         */
        get radianceSize(): int64
        set radianceSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSky;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSky;
    }
    namespace Slider {
        enum TickPosition {
            TickPositionBottomRight = 0,
            TickPositionTopLeft = 1,
            TickPositionBoth = 2,
            TickPositionCenter = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSlider extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSlider extends __NameMapRange {
        tick_count: "tickCount";
        ticks_on_borders: "ticksOnBorders";
        ticks_position: "ticksPosition";
        drag_started: "dragStarted";
        drag_ended: "dragEnded";
    }
    /** Abstract base class for sliders.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_slider.html  
     */
    class Slider<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** If `true`, the slider can be interacted with. If `false`, the value can be changed only by code. */
        get editable(): boolean
        set editable(value: boolean)
        
        /** If `true`, the value can be changed using the mouse wheel. */
        get scrollable(): boolean
        set scrollable(value: boolean)
        
        /** Number of ticks displayed on the slider, including border ticks. Ticks are uniformly-distributed value markers. */
        get tickCount(): int64
        set tickCount(value: int64)
        
        /** If `true`, the slider will display ticks for minimum and maximum values. */
        get ticksOnBorders(): boolean
        set ticksOnBorders(value: boolean)
        
        /** Sets the position of the ticks. See [enum TickPosition] for details. */
        get ticksPosition(): int64
        set ticksPosition(value: int64)
        
        /** Emitted when the grabber starts being dragged. This is emitted before the corresponding [signal Range.value_changed] signal. */
        readonly dragStarted: Signal<() => void>
        
        /** Emitted when the grabber stops being dragged. If [param value_changed] is `true`, [member Range.value] is different from the value when the dragging was started. */
        readonly dragEnded: Signal<(valueChanged: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSlider;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSlider;
    }
    namespace SliderJoint3D {
        enum Param {
            ParamLinearLimitUpper = 0,
            ParamLinearLimitLower = 1,
            ParamLinearLimitSoftness = 2,
            ParamLinearLimitRestitution = 3,
            ParamLinearLimitDamping = 4,
            ParamLinearMotionSoftness = 5,
            ParamLinearMotionRestitution = 6,
            ParamLinearMotionDamping = 7,
            ParamLinearOrthogonalSoftness = 8,
            ParamLinearOrthogonalRestitution = 9,
            ParamLinearOrthogonalDamping = 10,
            ParamAngularLimitUpper = 11,
            ParamAngularLimitLower = 12,
            ParamAngularLimitSoftness = 13,
            ParamAngularLimitRestitution = 14,
            ParamAngularLimitDamping = 15,
            ParamAngularMotionSoftness = 16,
            ParamAngularMotionRestitution = 17,
            ParamAngularMotionDamping = 18,
            ParamAngularOrthogonalSoftness = 19,
            ParamAngularOrthogonalRestitution = 20,
            ParamAngularOrthogonalDamping = 21,
            ParamMax = 22,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSliderJoint3D extends __RPCMapJoint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSliderJoint3D extends __NameMapJoint3D {
        set_param: "setParam";
        get_param: "getParam";
        "linear_limit/upper_distance": "linearLimit/upperDistance";
        "linear_limit/lower_distance": "linearLimit/lowerDistance";
        "linear_limit/softness": "linearLimit/softness";
        "linear_limit/restitution": "linearLimit/restitution";
        "linear_limit/damping": "linearLimit/damping";
        "linear_motion/softness": "linearMotion/softness";
        "linear_motion/restitution": "linearMotion/restitution";
        "linear_motion/damping": "linearMotion/damping";
        "linear_ortho/softness": "linearOrtho/softness";
        "linear_ortho/restitution": "linearOrtho/restitution";
        "linear_ortho/damping": "linearOrtho/damping";
        "angular_limit/upper_angle": "angularLimit/upperAngle";
        "angular_limit/lower_angle": "angularLimit/lowerAngle";
        "angular_limit/softness": "angularLimit/softness";
        "angular_limit/restitution": "angularLimit/restitution";
        "angular_limit/damping": "angularLimit/damping";
        "angular_motion/softness": "angularMotion/softness";
        "angular_motion/restitution": "angularMotion/restitution";
        "angular_motion/damping": "angularMotion/damping";
        "angular_ortho/softness": "angularOrtho/softness";
        "angular_ortho/restitution": "angularOrtho/restitution";
        "angular_ortho/damping": "angularOrtho/damping";
    }
    /** A physics joint that restricts the movement of a 3D physics body along an axis relative to another physics body.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sliderjoint3d.html  
     */
    class SliderJoint3D<Map extends NodePathMap = any> extends Joint3D<Map> {
        constructor(identifier?: any)
        /** Assigns [param value] to the given parameter. */
        setParam(param: SliderJoint3D.Param, value: float64): void
        
        /** Returns the value of the given parameter. */
        getParam(param: SliderJoint3D.Param): float64
        
        /** The maximum difference between the pivot points on their X axis before damping happens. */
        get "linearLimit/upperDistance"(): float64
        set "linearLimit/upperDistance"(value: float64)
        
        /** The minimum difference between the pivot points on their X axis before damping happens. */
        get "linearLimit/lowerDistance"(): float64
        set "linearLimit/lowerDistance"(value: float64)
        
        /** A factor applied to the movement across the slider axis once the limits get surpassed. The lower, the slower the movement. */
        get "linearLimit/softness"(): float64
        set "linearLimit/softness"(value: float64)
        
        /** The amount of restitution once the limits are surpassed. The lower, the more velocity-energy gets lost. */
        get "linearLimit/restitution"(): float64
        set "linearLimit/restitution"(value: float64)
        
        /** The amount of damping that happens once the limit defined by [member linear_limit/lower_distance] and [member linear_limit/upper_distance] is surpassed. */
        get "linearLimit/damping"(): float64
        set "linearLimit/damping"(value: float64)
        
        /** A factor applied to the movement across the slider axis as long as the slider is in the limits. The lower, the slower the movement. */
        get "linearMotion/softness"(): float64
        set "linearMotion/softness"(value: float64)
        
        /** The amount of restitution inside the slider limits. */
        get "linearMotion/restitution"(): float64
        set "linearMotion/restitution"(value: float64)
        
        /** The amount of damping inside the slider limits. */
        get "linearMotion/damping"(): float64
        set "linearMotion/damping"(value: float64)
        
        /** A factor applied to the movement across axes orthogonal to the slider. */
        get "linearOrtho/softness"(): float64
        set "linearOrtho/softness"(value: float64)
        
        /** The amount of restitution when movement is across axes orthogonal to the slider. */
        get "linearOrtho/restitution"(): float64
        set "linearOrtho/restitution"(value: float64)
        
        /** The amount of damping when movement is across axes orthogonal to the slider. */
        get "linearOrtho/damping"(): float64
        set "linearOrtho/damping"(value: float64)
        
        /** The upper limit of rotation in the slider. */
        get "angularLimit/upperAngle"(): float64
        set "angularLimit/upperAngle"(value: float64)
        
        /** The lower limit of rotation in the slider. */
        get "angularLimit/lowerAngle"(): float64
        set "angularLimit/lowerAngle"(value: float64)
        
        /** A factor applied to the all rotation once the limit is surpassed.  
         *  Makes all rotation slower when between 0 and 1.  
         */
        get "angularLimit/softness"(): float64
        set "angularLimit/softness"(value: float64)
        
        /** The amount of restitution of the rotation when the limit is surpassed.  
         *  Does not affect damping.  
         */
        get "angularLimit/restitution"(): float64
        set "angularLimit/restitution"(value: float64)
        
        /** The amount of damping of the rotation when the limit is surpassed.  
         *  A lower damping value allows a rotation initiated by body A to travel to body B slower.  
         */
        get "angularLimit/damping"(): float64
        set "angularLimit/damping"(value: float64)
        
        /** A factor applied to the all rotation in the limits. */
        get "angularMotion/softness"(): float64
        set "angularMotion/softness"(value: float64)
        
        /** The amount of restitution of the rotation in the limits. */
        get "angularMotion/restitution"(): float64
        set "angularMotion/restitution"(value: float64)
        
        /** The amount of damping of the rotation in the limits. */
        get "angularMotion/damping"(): float64
        set "angularMotion/damping"(value: float64)
        
        /** A factor applied to the all rotation across axes orthogonal to the slider. */
        get "angularOrtho/softness"(): float64
        set "angularOrtho/softness"(value: float64)
        
        /** The amount of restitution of the rotation across axes orthogonal to the slider. */
        get "angularOrtho/restitution"(): float64
        set "angularOrtho/restitution"(value: float64)
        
        /** The amount of damping of the rotation across axes orthogonal to the slider. */
        get "angularOrtho/damping"(): float64
        set "angularOrtho/damping"(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSliderJoint3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSliderJoint3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSocketServer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSocketServer extends __NameMapRefCounted {
        is_connection_available: "isConnectionAvailable";
        is_listening: "isListening";
        take_socket_connection: "takeSocketConnection";
    }
    /** An abstract class for servers based on sockets.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_socketserver.html  
     */
    class SocketServer extends RefCounted {
        constructor(identifier?: any)
        /** Returns `true` if a connection is available for taking. */
        isConnectionAvailable(): boolean
        
        /** Returns `true` if the server is currently listening for connections. */
        isListening(): boolean
        
        /** Stops listening. */
        stop(): void
        
        /** If a connection is available, returns a StreamPeerSocket with the connection. */
        takeSocketConnection(): null | StreamPeerSocket
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSocketServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSocketServer;
    }
    namespace SoftBody3D {
        enum DisableMode {
            DisableModeRemove = 0,
            DisableModeKeepActive = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSoftBody3D extends __RPCMapMeshInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSoftBody3D extends __NameMapMeshInstance3D {
        get_physics_rid: "getPhysicsRid";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        set_collision_layer_value: "setCollisionLayerValue";
        get_collision_layer_value: "getCollisionLayerValue";
        get_collision_exceptions: "getCollisionExceptions";
        add_collision_exception_with: "addCollisionExceptionWith";
        remove_collision_exception_with: "removeCollisionExceptionWith";
        get_point_transform: "getPointTransform";
        apply_impulse: "applyImpulse";
        apply_force: "applyForce";
        apply_central_impulse: "applyCentralImpulse";
        apply_central_force: "applyCentralForce";
        set_point_pinned: "setPointPinned";
        is_point_pinned: "isPointPinned";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
        parent_collision_ignore: "parentCollisionIgnore";
        simulation_precision: "simulationPrecision";
        total_mass: "totalMass";
        linear_stiffness: "linearStiffness";
        shrinking_factor: "shrinkingFactor";
        pressure_coefficient: "pressureCoefficient";
        damping_coefficient: "dampingCoefficient";
        drag_coefficient: "dragCoefficient";
        ray_pickable: "rayPickable";
        point_count: "pointCount";
        disable_mode: "disableMode";
    }
    /** A deformable 3D physics mesh.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_softbody3d.html  
     */
    class SoftBody3D<Map extends NodePathMap = any> extends MeshInstance3D<Map> {
        constructor(identifier?: any)
        /** Returns the internal [RID] used by the [PhysicsServer3D] for this body. */
        getPhysicsRid(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_layer], given a [param layer_number] between 1 and 32. */
        setCollisionLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_layer] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionLayerValue(layerNumber: int64): boolean
        
        /** Returns an array of nodes that were added as collision exceptions for this body. */
        getCollisionExceptions(): GArray<PhysicsBody3D>
        
        /** Adds a body to the list of bodies that this body can't collide with. */
        addCollisionExceptionWith(body: Node): void
        
        /** Removes a body from the list of bodies that this body can't collide with. */
        removeCollisionExceptionWith(body: Node): void
        
        /** Returns local translation of a vertex in the surface array. */
        getPointTransform(pointIndex: int64): Vector3
        
        /** Applies an impulse to a point.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        applyImpulse(pointIndex: int64, impulse: Vector3): void
        
        /** Applies a force to a point. A force is time dependent and meant to be applied every physics update. */
        applyForce(pointIndex: int64, force: Vector3): void
        
        /** Distributes and applies an impulse to all points.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        applyCentralImpulse(impulse: Vector3): void
        
        /** Distributes and applies a force to all points. A force is time dependent and meant to be applied every physics update. */
        applyCentralForce(force: Vector3): void
        
        /** Sets the pinned state of a surface vertex. When set to `true`, the optional [param attachment_path] can define a [Node3D] the pinned vertex will be attached to. */
        setPointPinned(pointIndex: int64, pinned: boolean, attachmentPath?: NodePath | string /* = '' */, insertAt?: int64 /* = -1 */): void
        
        /** Returns `true` if vertex is set to pinned. */
        isPointPinned(pointIndex: int64): boolean
        
        /** The physics layers this SoftBody3D **is in**. Collision objects can exist in one or more of 32 different layers. See also [member collision_mask].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        
        /** The physics layers this SoftBody3D **scans**. Collision objects can scan one or more of 32 different layers. See also [member collision_layer].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** [NodePath] to a [CollisionObject3D] this SoftBody3D should avoid clipping. */
        get parentCollisionIgnore(): NodePath
        set parentCollisionIgnore(value: NodePath | string)
        
        /** Increasing this value will improve the resulting simulation, but can affect performance. Use with care. */
        get simulationPrecision(): int64
        set simulationPrecision(value: int64)
        
        /** The SoftBody3D's mass. */
        get totalMass(): float64
        set totalMass(value: float64)
        
        /** Higher values will result in a stiffer body, while lower values will increase the body's ability to bend. The value can be between `0.0` and `1.0` (inclusive). */
        get linearStiffness(): float64
        set linearStiffness(value: float64)
        
        /** Scales the rest lengths of [SoftBody3D]'s edge constraints. Positive values shrink the mesh, while negative values expand it. For example, a value of `0.1` shortens the edges of the mesh by 10%, while `-0.1` expands the edges by 10%.  
         *      
         *  **Note:** [member shrinking_factor] is best used on surface meshes with pinned points.  
         */
        get shrinkingFactor(): float64
        set shrinkingFactor(value: float64)
        
        /** The pressure coefficient of this soft body. Simulate pressure build-up from inside this body. Higher values increase the strength of this effect. */
        get pressureCoefficient(): float64
        set pressureCoefficient(value: float64)
        
        /** The body's damping coefficient. Higher values will slow down the body more noticeably when forces are applied. */
        get dampingCoefficient(): float64
        set dampingCoefficient(value: float64)
        
        /** The body's drag coefficient. Higher values increase this body's air resistance.  
         *      
         *  **Note:** This value is currently unused by Godot's default physics implementation.  
         */
        get dragCoefficient(): float64
        set dragCoefficient(value: float64)
        
        /** If `true`, the [SoftBody3D] will respond to [RayCast3D]s. */
        get rayPickable(): boolean
        set rayPickable(value: boolean)
        
        /** The number of vertices (points) on the soft body mesh. */
        get pointCount(): int64
        
        /** Defines the behavior in physics when [member Node.process_mode] is set to [constant Node.PROCESS_MODE_DISABLED]. */
        get disableMode(): int64
        set disableMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSoftBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSoftBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSphereMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSphereMesh extends __NameMapPrimitiveMesh {
        radial_segments: "radialSegments";
        is_hemisphere: "isHemisphere";
    }
    /** Class representing a spherical [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_spheremesh.html  
     */
    class SphereMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Radius of sphere. */
        get radius(): float64
        set radius(value: float64)
        
        /** Full height of the sphere. */
        get height(): float64
        set height(value: float64)
        
        /** Number of radial segments on the sphere. */
        get radialSegments(): int64
        set radialSegments(value: int64)
        
        /** Number of segments along the height of the sphere. */
        get rings(): int64
        set rings(value: int64)
        
        /** If `true`, a hemisphere is created rather than a full sphere.  
         *      
         *  **Note:** To get a regular hemisphere, the height and radius of the sphere must be equal.  
         */
        get isHemisphere(): boolean
        set isHemisphere(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSphereMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSphereMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSphereOccluder3D extends __RPCMapOccluder3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSphereOccluder3D extends __NameMapOccluder3D {
    }
    /** Spherical shape for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sphereoccluder3d.html  
     */
    class SphereOccluder3D extends Occluder3D {
        constructor(identifier?: any)
        /** The sphere's radius in 3D units. */
        get radius(): float64
        set radius(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSphereOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSphereOccluder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSphereShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSphereShape3D extends __NameMapShape3D {
    }
    /** A 3D sphere shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sphereshape3d.html  
     */
    class SphereShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The sphere's radius. The shape's diameter is double the radius. */
        get radius(): float64
        set radius(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSphereShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSphereShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpinBox extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpinBox extends __NameMapRange {
        get_line_edit: "getLineEdit";
        update_on_text_changed: "updateOnTextChanged";
        custom_arrow_step: "customArrowStep";
        custom_arrow_round: "customArrowRound";
        select_all_on_focus: "selectAllOnFocus";
        plural_format: "pluralFormat";
        format_auto_translate_mode: "formatAutoTranslateMode";
    }
    /** An input field for numbers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_spinbox.html  
     */
    class SpinBox<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** Applies the current value of this [SpinBox]. This is equivalent to pressing [kbd]Enter[/kbd] while editing the [LineEdit] used by the [SpinBox]. This will cause [signal LineEdit.text_submitted] to be emitted and its currently contained expression to be evaluated. */
        apply(): void
        
        /** Returns the [LineEdit] instance from this [SpinBox]. You can use it to access properties and methods of [LineEdit].  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getLineEdit(): null | LineEdit
        
        /** Changes the alignment of the underlying [LineEdit]. */
        get alignment(): int64
        set alignment(value: int64)
        
        /** If `true`, the [SpinBox] will be editable. Otherwise, it will be read only. */
        get editable(): boolean
        set editable(value: boolean)
        
        /** Sets the value of the [Range] for this [SpinBox] when the [LineEdit] text is  *changed*  instead of  *submitted* . See [signal LineEdit.text_changed] and [signal LineEdit.text_submitted].  
         *      
         *  **Note:** If set to `true`, this will interfere with entering mathematical expressions in the [SpinBox]. The [SpinBox] will try to evaluate the expression as you type, which means symbols like a trailing `+` are removed immediately by the expression being evaluated.  
         */
        get updateOnTextChanged(): boolean
        set updateOnTextChanged(value: boolean)
        
        /** If not `0`, sets the step when interacting with the arrow buttons of the [SpinBox].  
         *      
         *  **Note:** [member Range.value] will still be rounded to a multiple of [member Range.step].  
         */
        get customArrowStep(): float64
        set customArrowStep(value: float64)
        
        /** If `true`, the value will be rounded to a multiple of [member custom_arrow_step] when interacting with the arrow buttons. Otherwise, increments the value by [member custom_arrow_step] and then rounds it according to [member Range.step]. */
        get customArrowRound(): boolean
        set customArrowRound(value: boolean)
        
        /** If `true`, the [SpinBox] will select the whole text when the [LineEdit] gains focus. Clicking the up and down arrows won't trigger this behavior. */
        get selectAllOnFocus(): boolean
        set selectAllOnFocus(value: boolean)
        
        /** The formatting of the displayed numeric value, using the same rules as [String]'s `%` operator (see [url=https://docs.godotengine.org/en/latest/tutorials/scripting/gdscript/gdscript_format_string.html]GDScript format strings[/url]). If empty, the value is displayed with no special formatting. If the format string is invalid, the [SpinBox] will display `"ERROR"`, with the error message available as a configuration warning.  
         *  The following format strings can be used as examples:  
         *  - `"(%s)"` displays as a number in parentheses (e.g. `(6.9)`).  
         *  - `"%d ms"` displays as an integer with milliseconds unit (e.g. `420 ms`).  
         *  - `"%0.2f%%"` displays as a percentage, with 2 decimal places of precision (e.g. `21.37%`).  
         */
        get format(): string
        set format(value: string)
        
        /** Plural version of [member format]. Used only if [member format] is not empty and [member format_auto_translate_mode] is not disabled. See also [method Object.tr_n]. */
        get pluralFormat(): string
        set pluralFormat(value: string)
        
        /** Auto-translation mode for the [member format]. Useful when the format has a word that can be translated. */
        get formatAutoTranslateMode(): int64
        set formatAutoTranslateMode(value: int64)
        
        /** Adds the specified prefix string before the numerical value of the [SpinBox]. This is used only if [member format] is empty. */
        get prefix(): string
        set prefix(value: string)
        
        /** Adds the specified suffix string after the numerical value of the [SpinBox]. This is used only if [member format] is empty. */
        get suffix(): string
        set suffix(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpinBox;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpinBox;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSplineIK3D extends __RPCMapChainIK3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSplineIK3D extends __NameMapChainIK3D {
        set_path_3d: "setPath3D";
        get_path_3d: "getPath3D";
        set_tilt_enabled: "setTiltEnabled";
        is_tilt_enabled: "isTiltEnabled";
        set_tilt_fade_in: "setTiltFadeIn";
        get_tilt_fade_in: "getTiltFadeIn";
        set_tilt_fade_out: "setTiltFadeOut";
        get_tilt_fade_out: "getTiltFadeOut";
        setting_count: "settingCount";
    }
    /** A [SkeletonModifier3D] for aligning bones along a [Path3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_splineik3d.html  
     */
    class SplineIK3D<Map extends NodePathMap = any> extends ChainIK3D<Map> {
        constructor(identifier?: any)
        /** Sets the node path of the [Path3D] which is describing the path. */
        setPath3D(index: int64, path3D: NodePath | string): void
        
        /** Returns the node path of the [Path3D] which is describing the path. */
        getPath3D(index: int64): NodePath
        
        /** Sets if the tilt property of the [Curve3D] should affect the bone twist. */
        setTiltEnabled(index: int64, enabled: boolean): void
        
        /** Returns if the tilt property of the [Curve3D] affects the bone twist. */
        isTiltEnabled(index: int64): boolean
        
        /** If [param size] is greater than `0`, the tilt is interpolated between [param size] start bones from the start point of the [Curve3D] when they are apart.  
         *  If [param size] is equal `0`, the tilts between the root bone head and the start point of the [Curve3D] are unified with a tilt of the start point of the [Curve3D].  
         *  If [param size] is less than `0`, the tilts between the root bone and the start point of the [Curve3D] are `0.0`.  
         */
        setTiltFadeIn(index: int64, size: int64): void
        
        /** Returns the tilt interpolation method used between the root bone and the start point of the [Curve3D] when they are apart. See also [method set_tilt_fade_in]. */
        getTiltFadeIn(index: int64): int64
        
        /** If [param size] is greater than `0`, the tilt is interpolated between [param size] end bones from the end point of the [Curve3D] when they are apart.  
         *  If [param size] is equal `0`, the tilts between the end bone tail and the end point of the [Curve3D] are unified with a tilt of the end point of the [Curve3D].  
         *  If [param size] is less than `0`, the tilts between the end bone and the end point of the [Curve3D] are `0.0`.  
         */
        setTiltFadeOut(index: int64, size: int64): void
        
        /** Returns the tilt interpolation method used between the end bone and the end point of the [Curve3D] when they are apart. See also [method set_tilt_fade_out]. */
        getTiltFadeOut(index: int64): int64
        
        /** The number of settings. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSplineIK3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSplineIK3D;
    }
    namespace SplitContainer {
        enum DraggerVisibility {
            DraggerVisible = 0,
            DraggerHidden = 1,
            DraggerHiddenCollapsed = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSplitContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSplitContainer extends __NameMapContainer {
        clamp_split_offset: "clampSplitOffset";
        get_drag_area_controls: "getDragAreaControls";
        get_drag_area_control: "getDragAreaControl";
        split_offsets: "splitOffsets";
        dragging_enabled: "draggingEnabled";
        dragger_visibility: "draggerVisibility";
        touch_dragger_enabled: "touchDraggerEnabled";
        drag_nested_intersections: "dragNestedIntersections";
        drag_area_margin_begin: "dragAreaMarginBegin";
        drag_area_margin_end: "dragAreaMarginEnd";
        drag_area_offset: "dragAreaOffset";
        drag_area_highlight_in_editor: "dragAreaHighlightInEditor";
        split_offset: "splitOffset";
        drag_started: "dragStarted";
        drag_ended: "dragEnded";
    }
    /** A container that arranges child controls horizontally or vertically and provides grabbers for adjusting the split ratios between them.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_splitcontainer.html  
     */
    class SplitContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** Clamps the [member split_offsets] values to ensure they are within valid ranges and do not overlap with each other. When overlaps occur, this method prioritizes one split offset (at index [param priority_index]) by clamping any overlapping split offsets to it. */
        clampSplitOffset(priorityIndex?: int64 /* = 0 */): void
        
        /** Returns an [Array] of the drag area [Control]s. These are the interactable [Control] nodes between each child. For example, this can be used to add a pre-configured button to a drag area [Control] so that it rides along with the split bar. Try setting the [Button] anchors to `center` prior to the [method Node.reparent] call.  
         *    
         *      
         *  **Note:** The drag area [Control]s are drawn over the [SplitContainer]'s children, so [CanvasItem] draw objects called from a drag area and children added to it will also appear over the [SplitContainer]'s children. Try setting [member Control.mouse_filter] of custom children to [constant Control.MOUSE_FILTER_IGNORE] to prevent blocking the mouse from dragging if desired.  
         *  **Warning:** These are required internal nodes, removing or freeing them may cause a crash.  
         */
        getDragAreaControls(): GArray<Control>
        
        /** Returns the drag area [Control]. For example, you can move a pre-configured button into the drag area [Control] so that it rides along with the split bar. Try setting the [Button] anchors to `center` prior to the `reparent()` call.  
         *    
         *      
         *  **Note:** The drag area [Control] is drawn over the [SplitContainer]'s children, so [CanvasItem] draw objects called from the [Control] and children added to the [Control] will also appear over the [SplitContainer]'s children. Try setting [member Control.mouse_filter] of custom children to [constant Control.MOUSE_FILTER_IGNORE] to prevent blocking the mouse from dragging if desired.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash.  
         */
        getDragAreaControl(): null | Control
        
        /** Offsets for each dragger in pixels. Each one is the offset of the split between the [Control] nodes before and after the dragger, with `0` being the default position. The default position is based on the [Control] nodes expand flags and minimum sizes. See [member Control.size_flags_horizontal], [member Control.size_flags_vertical], and [member Control.size_flags_stretch_ratio].  
         *  If none of the [Control] nodes before the dragger are expanded, the default position will be at the start of the [SplitContainer]. If none of the [Control] nodes after the dragger are expanded, the default position will be at the end of the [SplitContainer]. If the dragger is in between expanded [Control] nodes, the default position will be in the middle, based on the [member Control.size_flags_stretch_ratio]s and minimum sizes.  
         *      
         *  **Note:** If the split offsets cause [Control] nodes to overlap, the first split will take priority when resolving the positions.  
         */
        get splitOffsets(): PackedInt32Array
        set splitOffsets(value: PackedInt32Array | int32[])
        
        /** If `true`, the draggers will be disabled and the children will be sized as if all [member split_offsets] were `0`. */
        get collapsed(): boolean
        set collapsed(value: boolean)
        
        /** Enables or disables split dragging. */
        get draggingEnabled(): boolean
        set draggingEnabled(value: boolean)
        
        /** Determines the dragger's visibility. This property does not determine whether dragging is enabled or not. Use [member dragging_enabled] for that. */
        get draggerVisibility(): int64
        set draggerVisibility(value: int64)
        
        /** If `true`, the [SplitContainer] will arrange its children vertically, rather than horizontally.  
         *  Can't be changed when using [HSplitContainer] and [VSplitContainer].  
         */
        get vertical(): boolean
        set vertical(value: boolean)
        
        /** If `true`, a touch-friendly drag handle will be enabled for better usability on smaller screens. Unlike the standard grabber, this drag handle overlaps the [SplitContainer]'s children and does not affect their minimum separation. The standard grabber will no longer be drawn when this option is enabled. */
        get touchDraggerEnabled(): boolean
        set touchDraggerEnabled(value: boolean)
        
        /** Adds extra draggers at the intersection of the draggers of two SplitContainers to allow dragging both at once. This must be set to `true` for both SplitContainers, and one needs to be a descendant of the other. They also must be orthogonal (their [member vertical] are different) and the descendant must be next to at least one of the ancestor's draggers (within [theme_item minimum_grab_thickness]). */
        get dragNestedIntersections(): boolean
        set dragNestedIntersections(value: boolean)
        
        /** Reduces the size of the drag area and split bar [theme_item split_bar_background] at the beginning of the container. */
        get dragAreaMarginBegin(): int64
        set dragAreaMarginBegin(value: int64)
        
        /** Reduces the size of the drag area and split bar [theme_item split_bar_background] at the end of the container. */
        get dragAreaMarginEnd(): int64
        set dragAreaMarginEnd(value: int64)
        
        /** Shifts the drag area in the axis of the container to prevent the drag area from overlapping the [ScrollBar] or other selectable [Control] of a child node. */
        get dragAreaOffset(): int64
        set dragAreaOffset(value: int64)
        
        /** Highlights the drag area [Rect2] so you can see where it is during development. The drag area is gold if [member dragging_enabled] is `true`, and red if `false`. */
        get dragAreaHighlightInEditor(): boolean
        set dragAreaHighlightInEditor(value: boolean)
        
        /** The first element of [member split_offsets]. */
        get splitOffset(): int64
        set splitOffset(value: int64)
        
        /** Emitted when any dragger is dragged by user. */
        readonly dragged: Signal<(offset: int64) => void>
        
        /** Emitted when the user starts dragging. */
        readonly dragStarted: Signal<() => void>
        
        /** Emitted when the user ends dragging. */
        readonly dragEnded: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSplitContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSplitContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpotLight3D extends __RPCMapLight3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpotLight3D extends __NameMapLight3D {
        spot_range: "spotRange";
        spot_attenuation: "spotAttenuation";
        spot_angle: "spotAngle";
        spot_angle_attenuation: "spotAngleAttenuation";
    }
    /** A spotlight, such as a reflector spotlight or a lantern.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_spotlight3d.html  
     */
    class SpotLight3D<Map extends NodePathMap = any> extends Light3D<Map> {
        constructor(identifier?: any)
        /** The maximal range that can be reached by the spotlight. Note that the effectively lit area may appear to be smaller depending on the [member spot_attenuation] in use. No matter the [member spot_attenuation] in use, the light will never reach anything outside this range.  
         *      
         *  **Note:** [member spot_range] is not affected by [member Node3D.scale] (the light's scale or its parent's scale).  
         */
        get spotRange(): float64
        set spotRange(value: float64)
        
        /** Controls the distance attenuation function for spotlights.  
         *  A value of `0.0` will maintain a constant brightness through most of the range, but smoothly attenuate the light at the edge of the range. Use a value of `2.0` for physically accurate lights as it results in the proper inverse square attenutation.  
         *      
         *  **Note:** Setting attenuation to `2.0` or higher may result in distant objects receiving minimal light, even within range. For example, with a range of `4096`, an object at `100` units is attenuated by a factor of `0.0001`. With a default brightness of `1`, the light would not be visible at that distance.  
         *      
         *  **Note:** Using negative or values higher than `10.0` may lead to unexpected results.  
         */
        get spotAttenuation(): float64
        set spotAttenuation(value: float64)
        
        /** The spotlight's angle in degrees. This is the angular radius, meaning the angle from the -Z axis, the cone's center, to the edge of the cone. The default angular radius of 45 degrees corresponds to a cone with an angular diameter of 90 degrees.  
         *      
         *  **Note:** [member spot_angle] is not affected by [member Node3D.scale] (the light's scale or its parent's scale).  
         */
        get spotAngle(): float64
        set spotAngle(value: float64)
        
        /** The spotlight's  *angular*  attenuation curve. See also [member spot_attenuation]. */
        get spotAngleAttenuation(): float64
        set spotAngleAttenuation(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpotLight3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpotLight3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringArm3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringArm3D extends __NameMapNode3D {
        get_hit_length: "getHitLength";
        add_excluded_object: "addExcludedObject";
        remove_excluded_object: "removeExcludedObject";
        clear_excluded_objects: "clearExcludedObjects";
        collision_mask: "collisionMask";
        spring_length: "springLength";
    }
    /** A 3D raycast that dynamically moves its children near the collision point.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springarm3d.html  
     */
    class SpringArm3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the spring arm's current length. */
        getHitLength(): float64
        
        /** Adds the [PhysicsBody3D] object with the given [RID] to the list of [PhysicsBody3D] objects excluded from the collision check. */
        addExcludedObject(RID: Rid): void
        
        /** Removes the given [RID] from the list of [PhysicsBody3D] objects excluded from the collision check. */
        removeExcludedObject(RID: Rid): boolean
        
        /** Clears the list of [PhysicsBody3D] objects excluded from the collision check. */
        clearExcludedObjects(): void
        
        /** The layers against which the collision check will be done. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The [Shape3D] to use for the SpringArm3D.  
         *  When the shape is set, the SpringArm3D will cast the [Shape3D] on its z axis instead of performing a ray cast.  
         */
        get shape(): null | Shape3D
        set shape(value: null | Shape3D)
        
        /** The maximum extent of the SpringArm3D. This is used as a length for both the ray and the shape cast used internally to calculate the desired position of the SpringArm3D's child nodes.  
         *  To know more about how to perform a shape cast or a ray cast, please consult the [PhysicsDirectSpaceState3D] documentation.  
         */
        get springLength(): float64
        set springLength(value: float64)
        
        /** When the collision check is made, a candidate length for the SpringArm3D is given.  
         *  The margin is then subtracted to this length and the translation is applied to the child objects of the SpringArm3D.  
         *  This margin is useful for when the SpringArm3D has a [Camera3D] as a child node: without the margin, the [Camera3D] would be placed on the exact point of collision, while with the margin the [Camera3D] would be placed close to the point of collision.  
         */
        get margin(): float64
        set margin(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringArm3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringArm3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringBoneCollision3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringBoneCollision3D extends __NameMapNode3D {
        get_skeleton: "getSkeleton";
        bone_name: "boneName";
        position_offset: "positionOffset";
        rotation_offset: "rotationOffset";
    }
    /** A base class of the collision that interacts with [SpringBoneSimulator3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springbonecollision3d.html  
     */
    class SpringBoneCollision3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Get parent [Skeleton3D] node of the parent [SpringBoneSimulator3D] if found. */
        getSkeleton(): null | Skeleton3D
        
        /** The name of the attached bone. */
        get boneName(): StringName
        set boneName(value: StringName)
        
        /** The index of the attached bone. */
        get bone(): int64
        set bone(value: int64)
        
        /** The offset of the position from [Skeleton3D]'s [member bone] pose position. */
        get positionOffset(): Vector3
        set positionOffset(value: Vector3)
        
        /** The offset of the rotation from [Skeleton3D]'s [member bone] pose rotation. */
        get rotationOffset(): Quaternion
        set rotationOffset(value: Quaternion)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringBoneCollision3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringBoneCollision3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringBoneCollisionCapsule3D extends __RPCMapSpringBoneCollision3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringBoneCollisionCapsule3D extends __NameMapSpringBoneCollision3D {
        mid_height: "midHeight";
    }
    /** A capsule shape collision that interacts with [SpringBoneSimulator3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springbonecollisioncapsule3d.html  
     */
    class SpringBoneCollisionCapsule3D<Map extends NodePathMap = any> extends SpringBoneCollision3D<Map> {
        constructor(identifier?: any)
        /** The capsule's radius.  
         *      
         *  **Note:** The [member radius] of a capsule cannot be greater than half of its [member height]. Otherwise, the capsule becomes a sphere. If the [member radius] is greater than half of the [member height], the properties adjust to a valid value.  
         */
        get radius(): float64
        set radius(value: float64)
        
        /** The capsule's full height, including the hemispheres.  
         *      
         *  **Note:** The [member height] of a capsule must be at least twice its [member radius]. Otherwise, the capsule becomes a sphere. If the [member height] is less than twice the [member radius], the properties adjust to a valid value.  
         */
        get height(): float64
        set height(value: float64)
        
        /** The capsule's height, excluding the hemispheres. This is the height of the central cylindrical part in the middle of the capsule, and is the distance between the centers of the two hemispheres. This is a wrapper for [member height]. */
        get midHeight(): float64
        set midHeight(value: float64)
        
        /** If `true`, the collision acts to trap the joint within the collision. */
        get inside(): boolean
        set inside(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringBoneCollisionCapsule3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringBoneCollisionCapsule3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringBoneCollisionPlane3D extends __RPCMapSpringBoneCollision3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringBoneCollisionPlane3D extends __NameMapSpringBoneCollision3D {
    }
    /** An infinite plane collision that interacts with [SpringBoneSimulator3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springbonecollisionplane3d.html  
     */
    class SpringBoneCollisionPlane3D<Map extends NodePathMap = any> extends SpringBoneCollision3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringBoneCollisionPlane3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringBoneCollisionPlane3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringBoneCollisionSphere3D extends __RPCMapSpringBoneCollision3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringBoneCollisionSphere3D extends __NameMapSpringBoneCollision3D {
    }
    /** A sphere shape collision that interacts with [SpringBoneSimulator3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springbonecollisionsphere3d.html  
     */
    class SpringBoneCollisionSphere3D<Map extends NodePathMap = any> extends SpringBoneCollision3D<Map> {
        constructor(identifier?: any)
        /** The sphere's radius. */
        get radius(): float64
        set radius(value: float64)
        
        /** If `true`, the collision acts to trap the joint within the collision. */
        get inside(): boolean
        set inside(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringBoneCollisionSphere3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringBoneCollisionSphere3D;
    }
    namespace SpringBoneSimulator3D {
        enum CenterFrom {
            CenterFromWorldOrigin = 0,
            CenterFromNode = 1,
            CenterFromBone = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpringBoneSimulator3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpringBoneSimulator3D extends __NameMapSkeletonModifier3D {
        set_root_bone_name: "setRootBoneName";
        get_root_bone_name: "getRootBoneName";
        set_root_bone: "setRootBone";
        get_root_bone: "getRootBone";
        set_end_bone_name: "setEndBoneName";
        get_end_bone_name: "getEndBoneName";
        set_end_bone: "setEndBone";
        get_end_bone: "getEndBone";
        set_extend_end_bone: "setExtendEndBone";
        is_end_bone_extended: "isEndBoneExtended";
        set_end_bone_direction: "setEndBoneDirection";
        get_end_bone_direction: "getEndBoneDirection";
        set_end_bone_length: "setEndBoneLength";
        get_end_bone_length: "getEndBoneLength";
        set_center_from: "setCenterFrom";
        get_center_from: "getCenterFrom";
        set_center_node: "setCenterNode";
        get_center_node: "getCenterNode";
        set_center_bone_name: "setCenterBoneName";
        get_center_bone_name: "getCenterBoneName";
        set_center_bone: "setCenterBone";
        get_center_bone: "getCenterBone";
        set_radius: "setRadius";
        get_radius: "getRadius";
        set_rotation_axis: "setRotationAxis";
        get_rotation_axis: "getRotationAxis";
        set_rotation_axis_vector: "setRotationAxisVector";
        get_rotation_axis_vector: "getRotationAxisVector";
        set_radius_damping_curve: "setRadiusDampingCurve";
        get_radius_damping_curve: "getRadiusDampingCurve";
        set_stiffness: "setStiffness";
        get_stiffness: "getStiffness";
        set_stiffness_damping_curve: "setStiffnessDampingCurve";
        get_stiffness_damping_curve: "getStiffnessDampingCurve";
        set_drag: "setDrag";
        get_drag: "getDrag";
        set_drag_damping_curve: "setDragDampingCurve";
        get_drag_damping_curve: "getDragDampingCurve";
        set_gravity: "setGravity";
        get_gravity: "getGravity";
        set_gravity_damping_curve: "setGravityDampingCurve";
        get_gravity_damping_curve: "getGravityDampingCurve";
        set_gravity_direction: "setGravityDirection";
        get_gravity_direction: "getGravityDirection";
        clear_settings: "clearSettings";
        set_individual_config: "setIndividualConfig";
        is_config_individual: "isConfigIndividual";
        get_joint_bone_name: "getJointBoneName";
        get_joint_bone: "getJointBone";
        set_joint_rotation_axis: "setJointRotationAxis";
        get_joint_rotation_axis: "getJointRotationAxis";
        set_joint_rotation_axis_vector: "setJointRotationAxisVector";
        get_joint_rotation_axis_vector: "getJointRotationAxisVector";
        set_joint_radius: "setJointRadius";
        get_joint_radius: "getJointRadius";
        set_joint_stiffness: "setJointStiffness";
        get_joint_stiffness: "getJointStiffness";
        set_joint_drag: "setJointDrag";
        get_joint_drag: "getJointDrag";
        set_joint_gravity: "setJointGravity";
        get_joint_gravity: "getJointGravity";
        set_joint_gravity_direction: "setJointGravityDirection";
        get_joint_gravity_direction: "getJointGravityDirection";
        get_joint_count: "getJointCount";
        set_enable_all_child_collisions: "setEnableAllChildCollisions";
        are_all_child_collisions_enabled: "areAllChildCollisionsEnabled";
        set_exclude_collision_path: "setExcludeCollisionPath";
        get_exclude_collision_path: "getExcludeCollisionPath";
        set_exclude_collision_count: "setExcludeCollisionCount";
        get_exclude_collision_count: "getExcludeCollisionCount";
        clear_exclude_collisions: "clearExcludeCollisions";
        set_collision_path: "setCollisionPath";
        get_collision_path: "getCollisionPath";
        set_collision_count: "setCollisionCount";
        get_collision_count: "getCollisionCount";
        clear_collisions: "clearCollisions";
        external_force: "externalForce";
        mutable_bone_axes: "mutableBoneAxes";
        setting_count: "settingCount";
    }
    /** A [SkeletonModifier3D] to apply inertial wavering to bone chains.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_springbonesimulator3d.html  
     */
    class SpringBoneSimulator3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Sets the root bone name of the bone chain. */
        setRootBoneName(index: int64, boneName: string): void
        
        /** Returns the root bone name of the bone chain. */
        getRootBoneName(index: int64): string
        
        /** Sets the root bone index of the bone chain. */
        setRootBone(index: int64, bone: int64): void
        
        /** Returns the root bone index of the bone chain. */
        getRootBone(index: int64): int64
        
        /** Sets the end bone name of the bone chain.  
         *      
         *  **Note:** End bone must be the root bone or a child of the root bone. If they are the same, the tail must be extended by [method set_extend_end_bone] to jiggle the bone.  
         */
        setEndBoneName(index: int64, boneName: string): void
        
        /** Returns the end bone name of the bone chain. */
        getEndBoneName(index: int64): string
        
        /** Sets the end bone index of the bone chain. */
        setEndBone(index: int64, bone: int64): void
        
        /** Returns the end bone index of the bone chain. */
        getEndBone(index: int64): int64
        
        /** If [param enabled] is `true`, the end bone is extended to have a tail.  
         *  The extended tail config is allocated to the last element in the joint list. In other words, if you set [param enabled] to `false`, the config of the last element in the joint list has no effect in the simulated result.  
         */
        setExtendEndBone(index: int64, enabled: boolean): void
        
        /** Returns `true` if the end bone is extended to have a tail. */
        isEndBoneExtended(index: int64): boolean
        
        /** Sets the end bone tail direction of the bone chain when [method is_end_bone_extended] is `true`. */
        setEndBoneDirection(index: int64, boneDirection: SkeletonModifier3D.BoneDirection): void
        
        /** Returns the tail direction of the end bone of the bone chain when [method is_end_bone_extended] is `true`. */
        getEndBoneDirection(index: int64): SkeletonModifier3D.BoneDirection
        
        /** Sets the end bone tail length of the bone chain when [method is_end_bone_extended] is `true`. */
        setEndBoneLength(index: int64, length: float64): void
        
        /** Returns the end bone tail length of the bone chain when [method is_end_bone_extended] is `true`. */
        getEndBoneLength(index: int64): float64
        
        /** Sets what the center originates from in the bone chain.  
         *  Bone movement is calculated based on the difference in relative distance between center and bone in the previous and next frames.  
         *  For example, if the parent [Skeleton3D] is used as the center, the bones are considered to have not moved if the [Skeleton3D] moves in the world.  
         *  In this case, only a change in the bone pose is considered to be a bone movement.  
         */
        setCenterFrom(index: int64, centerFrom: SpringBoneSimulator3D.CenterFrom): void
        
        /** Returns what the center originates from in the bone chain. */
        getCenterFrom(index: int64): SpringBoneSimulator3D.CenterFrom
        
        /** Sets the center node path of the bone chain. */
        setCenterNode(index: int64, nodePath: NodePath | string): void
        
        /** Returns the center node path of the bone chain. */
        getCenterNode(index: int64): NodePath
        
        /** Sets the center bone name of the bone chain. */
        setCenterBoneName(index: int64, boneName: string): void
        
        /** Returns the center bone name of the bone chain. */
        getCenterBoneName(index: int64): string
        
        /** Sets the center bone index of the bone chain. */
        setCenterBone(index: int64, bone: int64): void
        
        /** Returns the center bone index of the bone chain. */
        getCenterBone(index: int64): int64
        
        /** Sets the joint radius of the bone chain. It is used to move and slide with the [SpringBoneCollision3D] in the collision list.  
         *  The value is scaled by [method set_radius_damping_curve] and cached in each joint setting in the joint list.  
         */
        setRadius(index: int64, radius: float64): void
        
        /** Returns the joint radius of the bone chain. */
        getRadius(index: int64): float64
        
        /** Sets the rotation axis of the bone chain. If set to a specific axis, it acts like a hinge joint. The value is cached in each joint setting in the joint list.  
         *  The axes are based on the reference pose's space, if [param axis] is [constant SkeletonModifier3D.ROTATION_AXIS_CUSTOM], you can specify any axis.  
         *  In here, the reference pose is the bone pose immediately before the simulation.  
         *      
         *  **Note:** The rotation axis vector and the forward vector shouldn't be colinear to avoid unintended rotation since [SpringBoneSimulator3D] does not factor in twisting forces.  
         */
        setRotationAxis(index: int64, axis: SkeletonModifier3D.RotationAxis): void
        
        /** Returns the rotation axis of the bone chain. */
        getRotationAxis(index: int64): SkeletonModifier3D.RotationAxis
        
        /** Sets the rotation axis vector of the bone chain. The value is cached in each joint setting in the joint list.  
         *  This vector is normalized by an internal process and represents the axis around which the bone chain can rotate.  
         *  If the vector length is `0`, it is considered synonymous with [constant SkeletonModifier3D.ROTATION_AXIS_ALL].  
         */
        setRotationAxisVector(index: int64, vector: Vector3): void
        
        /** Returns the rotation axis vector of the bone chain. This vector represents the axis around which the bone chain can rotate. It is determined based on the rotation axis set for the bone chain.  
         *  If [method get_rotation_axis] is [constant SkeletonModifier3D.ROTATION_AXIS_ALL], this method returns `Vector3(0, 0, 0)`.  
         */
        getRotationAxisVector(index: int64): Vector3
        
        /** Sets the joint radius damping curve of the bone chain. */
        setRadiusDampingCurve(index: int64, curve: Curve): void
        
        /** Returns the joint radius damping curve of the bone chain. */
        getRadiusDampingCurve(index: int64): null | Curve
        
        /** Sets the stiffness force of the bone chain. The greater the value, the faster it recovers to its initial pose.  
         *  If [param stiffness] is `0`, the modified pose will not return to the original pose.  
         *  The value is scaled by [method set_stiffness_damping_curve] and cached in each joint setting in the joint list.  
         */
        setStiffness(index: int64, stiffness: float64): void
        
        /** Returns the stiffness force of the bone chain. */
        getStiffness(index: int64): float64
        
        /** Sets the stiffness force damping curve of the bone chain. */
        setStiffnessDampingCurve(index: int64, curve: Curve): void
        
        /** Returns the stiffness force damping curve of the bone chain. */
        getStiffnessDampingCurve(index: int64): null | Curve
        
        /** Sets the drag force of the bone chain. The greater the value, the more suppressed the wiggling.  
         *  The value is scaled by [method set_drag_damping_curve] and cached in each joint setting in the joint list.  
         */
        setDrag(index: int64, drag: float64): void
        
        /** Returns the drag force damping curve of the bone chain. */
        getDrag(index: int64): float64
        
        /** Sets the drag force damping curve of the bone chain. */
        setDragDampingCurve(index: int64, curve: Curve): void
        
        /** Returns the drag force damping curve of the bone chain. */
        getDragDampingCurve(index: int64): null | Curve
        
        /** Sets the gravity amount of the bone chain. This value is not an acceleration, but a constant velocity of movement in [method set_gravity_direction].  
         *  If [param gravity] is not `0`, the modified pose will not return to the original pose since it is always affected by gravity.  
         *  The value is scaled by [method set_gravity_damping_curve] and cached in each joint setting in the joint list.  
         */
        setGravity(index: int64, gravity: float64): void
        
        /** Returns the gravity amount of the bone chain. */
        getGravity(index: int64): float64
        
        /** Sets the gravity amount damping curve of the bone chain. */
        setGravityDampingCurve(index: int64, curve: Curve): void
        
        /** Returns the gravity amount damping curve of the bone chain. */
        getGravityDampingCurve(index: int64): null | Curve
        
        /** Sets the gravity direction of the bone chain. This value is internally normalized and then multiplied by [method set_gravity].  
         *  The value is cached in each joint setting in the joint list.  
         */
        setGravityDirection(index: int64, gravityDirection: Vector3): void
        
        /** Returns the gravity direction of the bone chain. */
        getGravityDirection(index: int64): Vector3
        
        /** Clears all settings. */
        clearSettings(): void
        
        /** If [param enabled] is `true`, the config can be edited individually for each joint. */
        setIndividualConfig(index: int64, enabled: boolean): void
        
        /** Returns `true` if the config can be edited individually for each joint. */
        isConfigIndividual(index: int64): boolean
        
        /** Returns the bone name at [param joint] in the bone chain's joint list. */
        getJointBoneName(index: int64, joint: int64): string
        
        /** Returns the bone index at [param joint] in the bone chain's joint list. */
        getJointBone(index: int64, joint: int64): int64
        
        /** Sets the rotation axis at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`.  
         *  The axes are based on the reference pose's space, if [param axis] is [constant SkeletonModifier3D.ROTATION_AXIS_CUSTOM], you can specify any axis.  
         *  In here, the reference pose is the bone pose immediately before the simulation.  
         *      
         *  **Note:** The rotation axis and the forward vector shouldn't be colinear to avoid unintended rotation since [SpringBoneSimulator3D] does not factor in twisting forces.  
         */
        setJointRotationAxis(index: int64, joint: int64, axis: SkeletonModifier3D.RotationAxis): void
        
        /** Returns the rotation axis at [param joint] in the bone chain's joint list. */
        getJointRotationAxis(index: int64, joint: int64): SkeletonModifier3D.RotationAxis
        
        /** Sets the rotation axis vector for the specified joint in the bone chain.  
         *  This vector is normalized by an internal process and represents the axis around which the bone chain can rotate.  
         *  If the vector length is `0`, it is considered synonymous with [constant SkeletonModifier3D.ROTATION_AXIS_ALL].  
         */
        setJointRotationAxisVector(index: int64, joint: int64, vector: Vector3): void
        
        /** Returns the rotation axis vector for the specified joint in the bone chain. This vector represents the axis around which the joint can rotate. It is determined based on the rotation axis set for the joint.  
         *  If [method get_joint_rotation_axis] is [constant SkeletonModifier3D.ROTATION_AXIS_ALL], this method returns `Vector3(0, 0, 0)`.  
         */
        getJointRotationAxisVector(index: int64, joint: int64): Vector3
        
        /** Sets the joint radius at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`. */
        setJointRadius(index: int64, joint: int64, radius: float64): void
        
        /** Returns the radius at [param joint] in the bone chain's joint list. */
        getJointRadius(index: int64, joint: int64): float64
        
        /** Sets the stiffness force at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`. */
        setJointStiffness(index: int64, joint: int64, stiffness: float64): void
        
        /** Returns the stiffness force at [param joint] in the bone chain's joint list. */
        getJointStiffness(index: int64, joint: int64): float64
        
        /** Sets the drag force at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`. */
        setJointDrag(index: int64, joint: int64, drag: float64): void
        
        /** Returns the drag force at [param joint] in the bone chain's joint list. */
        getJointDrag(index: int64, joint: int64): float64
        
        /** Sets the gravity amount at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`. */
        setJointGravity(index: int64, joint: int64, gravity: float64): void
        
        /** Returns the gravity amount at [param joint] in the bone chain's joint list. */
        getJointGravity(index: int64, joint: int64): float64
        
        /** Sets the gravity direction at [param joint] in the bone chain's joint list when [method is_config_individual] is `true`. */
        setJointGravityDirection(index: int64, joint: int64, gravityDirection: Vector3): void
        
        /** Returns the gravity direction at [param joint] in the bone chain's joint list. */
        getJointGravityDirection(index: int64, joint: int64): Vector3
        
        /** Returns the joint count of the bone chain's joint list. */
        getJointCount(index: int64): int64
        
        /** If [param enabled] is `true`, all child [SpringBoneCollision3D]s are colliding and [method set_exclude_collision_path] is enabled as an exclusion list at [param index] in the settings.  
         *  If [param enabled] is `false`, you need to manually register all valid collisions with [method set_collision_path].  
         */
        setEnableAllChildCollisions(index: int64, enabled: boolean): void
        
        /** Returns `true` if all child [SpringBoneCollision3D]s are contained in the collision list at [param index] in the settings. */
        areAllChildCollisionsEnabled(index: int64): boolean
        
        /** Sets the node path of the [SpringBoneCollision3D] at [param collision] in the bone chain's exclude collision list when [method are_all_child_collisions_enabled] is `true`. */
        setExcludeCollisionPath(index: int64, collision: int64, nodePath: NodePath | string): void
        
        /** Returns the node path of the [SpringBoneCollision3D] at [param collision] in the bone chain's exclude collision list when [method are_all_child_collisions_enabled] is `true`. */
        getExcludeCollisionPath(index: int64, collision: int64): NodePath
        
        /** Sets the number of exclude collisions in the exclude collision list at [param index] in the settings when [method are_all_child_collisions_enabled] is `true`. */
        setExcludeCollisionCount(index: int64, count: int64): void
        
        /** Returns the exclude collision count of the bone chain's exclude collision list when [method are_all_child_collisions_enabled] is `true`. */
        getExcludeCollisionCount(index: int64): int64
        
        /** Clears all exclude collisions from the collision list at [param index] in the settings when [method are_all_child_collisions_enabled] is `true`. */
        clearExcludeCollisions(index: int64): void
        
        /** Sets the node path of the [SpringBoneCollision3D] at [param collision] in the bone chain's collision list when [method are_all_child_collisions_enabled] is `false`. */
        setCollisionPath(index: int64, collision: int64, nodePath: NodePath | string): void
        
        /** Returns the node path of the [SpringBoneCollision3D] at [param collision] in the bone chain's collision list when [method are_all_child_collisions_enabled] is `false`. */
        getCollisionPath(index: int64, collision: int64): NodePath
        
        /** Sets the number of collisions in the collision list at [param index] in the settings when [method are_all_child_collisions_enabled] is `false`. */
        setCollisionCount(index: int64, count: int64): void
        
        /** Returns the collision count of the bone chain's collision list when [method are_all_child_collisions_enabled] is `false`. */
        getCollisionCount(index: int64): int64
        
        /** Clears all collisions from the collision list at [param index] in the settings when [method are_all_child_collisions_enabled] is `false`. */
        clearCollisions(index: int64): void
        
        /** Resets a simulating state with respect to the current bone pose.  
         *  It is useful to prevent the simulation result getting violent. For example, calling this immediately after a call to [method AnimationPlayer.play] without a fading, or within the previous [signal SkeletonModifier3D.modification_processed] signal if its condition changes significantly.  
         */
        reset(): void
        
        /** The constant force that always affected bones. It is equal to the result when the parent [Skeleton3D] moves at this speed in the opposite direction.  
         *  This is useful for effects such as wind and anti-gravity.  
         */
        get externalForce(): Vector3
        set externalForce(value: Vector3)
        
        /** If `true`, the solver retrieves the bone axis from the bone pose every frame.  
         *  If `false`, the solver retrieves the bone axis from the bone rest and caches it, which increases performance slightly, but position changes in the bone pose made before processing this [SpringBoneSimulator3D] are ignored.  
         */
        get mutableBoneAxes(): boolean
        set mutableBoneAxes(value: boolean)
        
        /** The number of settings. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpringBoneSimulator3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpringBoneSimulator3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSprite2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSprite2D extends __NameMapNode2D {
        is_pixel_opaque: "isPixelOpaque";
        get_rect: "getRect";
        flip_h: "flipH";
        flip_v: "flipV";
        frame_coords: "frameCoords";
        region_enabled: "regionEnabled";
        region_rect: "regionRect";
        region_filter_clip_enabled: "regionFilterClipEnabled";
        frame_changed: "frameChanged";
        texture_changed: "textureChanged";
    }
    /** General-purpose sprite node.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sprite2d.html  
     */
    class Sprite2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns `true` if the pixel at the given position is opaque, `false` otherwise. Also returns `false` if the given position is out of bounds or this sprite's [member texture] is `null`. [param pos] is in local coordinates. */
        isPixelOpaque(pos: Vector2): boolean
        
        /** Returns a [Rect2] representing the Sprite2D's boundary in local coordinates.  
         *  **Example:** Detect if the Sprite2D was clicked:  
         *    
         */
        getRect(): Rect2
        
        /** [Texture2D] object to draw. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** If `true`, texture is centered.  
         *      
         *  **Note:** For games with a pixel art aesthetic, textures may appear deformed when centered. This is caused by their position being between pixels. To prevent this, set this property to `false`, or consider enabling [member ProjectSettings.rendering/2d/snap/snap_2d_vertices_to_pixel] and [member ProjectSettings.rendering/2d/snap/snap_2d_transforms_to_pixel].  
         */
        get centered(): boolean
        set centered(value: boolean)
        
        /** The texture's drawing offset.  
         *      
         *  **Note:** When you increase [member offset].y in Sprite2D, the sprite moves downward on screen (i.e., +Y is down).  
         */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** If `true`, texture is flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, texture is flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        
        /** The number of columns in the sprite sheet. When this property is changed, [member frame] is adjusted so that the same visual frame is maintained (same row and column). If that's impossible, [member frame] is reset to `0`. */
        get hframes(): int64
        set hframes(value: int64)
        
        /** The number of rows in the sprite sheet. When this property is changed, [member frame] is adjusted so that the same visual frame is maintained (same row and column). If that's impossible, [member frame] is reset to `0`. */
        get vframes(): int64
        set vframes(value: int64)
        
        /** Current frame to display from sprite sheet. [member hframes] or [member vframes] must be greater than 1. This property is automatically adjusted when [member hframes] or [member vframes] are changed to keep pointing to the same visual frame (same column and row). If that's impossible, this value is reset to `0`. */
        get frame(): int64
        set frame(value: int64)
        
        /** Coordinates of the frame to display from sprite sheet. This is as an alias for the [member frame] property. [member hframes] or [member vframes] must be greater than 1. */
        get frameCoords(): Vector2I
        set frameCoords(value: Vector2I)
        
        /** If `true`, texture is cut from a larger atlas texture. See [member region_rect].  
         *      
         *  **Note:** When using a custom [Shader] on a [Sprite2D], the `UV` shader built-in will refer to the entire texture space. Use the `REGION_RECT` built-in to get the currently visible region defined in [member region_rect] instead. See [url=https://docs.godotengine.org/en/latest/tutorials/shaders/shader_reference/canvas_item_shader.html]CanvasItem shaders[/url] for details.  
         */
        get regionEnabled(): boolean
        set regionEnabled(value: boolean)
        
        /** The region of the atlas texture to display. [member region_enabled] must be `true`. */
        get regionRect(): Rect2
        set regionRect(value: Rect2)
        
        /** If `true`, the area outside of the [member region_rect] is clipped to avoid bleeding of the surrounding texture pixels. [member region_enabled] must be `true`. */
        get regionFilterClipEnabled(): boolean
        set regionFilterClipEnabled(value: boolean)
        
        /** Emitted when the [member frame] changes. */
        readonly frameChanged: Signal<() => void>
        
        /** Emitted when the [member texture] changes. */
        readonly textureChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSprite2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSprite2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSprite3D extends __RPCMapSpriteBase3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSprite3D extends __NameMapSpriteBase3D {
        frame_coords: "frameCoords";
        region_enabled: "regionEnabled";
        region_rect: "regionRect";
        frame_changed: "frameChanged";
        texture_changed: "textureChanged";
    }
    /** 2D sprite node in a 3D world.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_sprite3d.html  
     */
    class Sprite3D<Map extends NodePathMap = any> extends SpriteBase3D<Map> {
        constructor(identifier?: any)
        /** [Texture2D] object to draw. If [member GeometryInstance3D.material_override] is used, this will be overridden. The size information is still used. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** The number of columns in the sprite sheet. When this property is changed, [member frame] is adjusted so that the same visual frame is maintained (same row and column). If that's impossible, [member frame] is reset to `0`. */
        get hframes(): int64
        set hframes(value: int64)
        
        /** The number of rows in the sprite sheet. When this property is changed, [member frame] is adjusted so that the same visual frame is maintained (same row and column). If that's impossible, [member frame] is reset to `0`. */
        get vframes(): int64
        set vframes(value: int64)
        
        /** Current frame to display from sprite sheet. [member hframes] or [member vframes] must be greater than 1. This property is automatically adjusted when [member hframes] or [member vframes] are changed to keep pointing to the same visual frame (same column and row). If that's impossible, this value is reset to `0`. */
        get frame(): int64
        set frame(value: int64)
        
        /** Coordinates of the frame to display from sprite sheet. This is as an alias for the [member frame] property. [member hframes] or [member vframes] must be greater than 1. */
        get frameCoords(): Vector2I
        set frameCoords(value: Vector2I)
        
        /** If `true`, the sprite will use [member region_rect] and display only the specified part of its texture. */
        get regionEnabled(): boolean
        set regionEnabled(value: boolean)
        
        /** The region of the atlas texture to display. [member region_enabled] must be `true`. */
        get regionRect(): Rect2
        set regionRect(value: Rect2)
        
        /** Emitted when the [member frame] changes. */
        readonly frameChanged: Signal<() => void>
        
        /** Emitted when the [member texture] changes. */
        readonly textureChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSprite3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSprite3D;
    }
    namespace SpriteBase3D {
        enum DrawFlags {
            FlagTransparent = 0,
            FlagShaded = 1,
            FlagDoubleSided = 2,
            FlagDisableDepthTest = 3,
            FlagFixedSize = 4,
            FlagMax = 5,
        }
        enum AlphaCutMode {
            AlphaCutDisabled = 0,
            AlphaCutDiscard = 1,
            AlphaCutOpaquePrepass = 2,
            AlphaCutHash = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpriteBase3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpriteBase3D extends __NameMapGeometryInstance3D {
        set_draw_flag: "setDrawFlag";
        get_draw_flag: "getDrawFlag";
        get_item_rect: "getItemRect";
        generate_triangle_mesh: "generateTriangleMesh";
        flip_h: "flipH";
        flip_v: "flipV";
        pixel_size: "pixelSize";
        double_sided: "doubleSided";
        no_depth_test: "noDepthTest";
        fixed_size: "fixedSize";
        alpha_cut: "alphaCut";
        alpha_scissor_threshold: "alphaScissorThreshold";
        alpha_hash_scale: "alphaHashScale";
        alpha_antialiasing_mode: "alphaAntialiasingMode";
        alpha_antialiasing_edge: "alphaAntialiasingEdge";
        texture_filter: "textureFilter";
        render_priority: "renderPriority";
    }
    /** 2D sprite node in 3D environment.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_spritebase3d.html  
     */
    class SpriteBase3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        /** If `true`, the specified flag will be enabled. */
        setDrawFlag(flag: SpriteBase3D.DrawFlags, enabled: boolean): void
        
        /** Returns the value of the specified flag. */
        getDrawFlag(flag: SpriteBase3D.DrawFlags): boolean
        
        /** Returns the rectangle representing this sprite. */
        getItemRect(): Rect2
        
        /** Returns a [TriangleMesh] with the sprite's vertices following its current configuration (such as its [member axis] and [member pixel_size]). */
        generateTriangleMesh(): null | TriangleMesh
        
        /** If `true`, texture will be centered. */
        get centered(): boolean
        set centered(value: boolean)
        
        /** The texture's drawing offset.  
         *      
         *  **Note:** When you increase [member offset].y in Sprite3D, the sprite moves upward in world space (i.e., +Y is up).  
         */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** If `true`, texture is flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, texture is flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        
        /** A color value used to  *multiply*  the texture's colors. Can be used for mood-coloring or to simulate the color of ambient light.  
         *      
         *  **Note:** Unlike [member CanvasItem.modulate] for 2D, colors with values above `1.0` (overbright) are not supported.  
         *      
         *  **Note:** If a [member GeometryInstance3D.material_override] is defined on the [SpriteBase3D], the material override must be configured to take vertex colors into account for albedo. Otherwise, the color defined in [member modulate] will be ignored. For a [BaseMaterial3D], [member BaseMaterial3D.vertex_color_use_as_albedo] must be `true`. For a [ShaderMaterial], `ALBEDO *= COLOR.rgb;` must be inserted in the shader's `fragment()` function.  
         */
        get modulate(): Color
        set modulate(value: Color)
        
        /** The size of one pixel's width on the sprite to scale it in 3D. */
        get pixelSize(): float64
        set pixelSize(value: float64)
        
        /** The direction in which the front of the texture faces. */
        get axis(): int64
        set axis(value: int64)
        
        /** The billboard mode to use for the sprite.  
         *      
         *  **Note:** When billboarding is enabled and the material also casts shadows, billboards will face **the** camera in the scene when rendering shadows. In scenes with multiple cameras, the intended shadow cannot be determined and this will result in undefined behavior. See [url=https://github.com/godotengine/godot/pull/72638]GitHub Pull Request #72638[/url] for details.  
         */
        get billboard(): int64
        set billboard(value: int64)
        
        /** If `true`, the texture's transparency and the opacity are used to make those parts of the sprite invisible. */
        get transparent(): boolean
        set transparent(value: boolean)
        
        /** If `true`, the [Light3D] in the [Environment] has effects on the sprite. */
        get shaded(): boolean
        set shaded(value: boolean)
        
        /** If `true`, texture can be seen from the back as well, if `false`, it is invisible when looking at it from behind. */
        get doubleSided(): boolean
        set doubleSided(value: boolean)
        
        /** If `true`, depth testing is disabled and the object will be drawn in render order. */
        get noDepthTest(): boolean
        set noDepthTest(value: boolean)
        
        /** If `true`, the texture is rendered at the same size regardless of distance. The texture's size on screen is the same as if the camera was `1.0` units away from the texture's origin, regardless of the actual distance from the camera. The [Camera3D]'s field of view (or [member Camera3D.size] when in orthogonal/frustum mode) still affects the size the sprite is drawn at. */
        get fixedSize(): boolean
        set fixedSize(value: boolean)
        
        /** The alpha cutting mode to use for the sprite. */
        get alphaCut(): int64
        set alphaCut(value: int64)
        
        /** Threshold at which the alpha scissor will discard values. */
        get alphaScissorThreshold(): float64
        set alphaScissorThreshold(value: float64)
        
        /** The hashing scale for Alpha Hash. Recommended values between `0` and `2`. */
        get alphaHashScale(): float64
        set alphaHashScale(value: float64)
        
        /** The type of alpha antialiasing to apply. */
        get alphaAntialiasingMode(): int64
        set alphaAntialiasingMode(value: int64)
        
        /** Threshold at which antialiasing will be applied on the alpha channel. */
        get alphaAntialiasingEdge(): float64
        set alphaAntialiasingEdge(value: float64)
        
        /** Filter flags for the texture.  
         *      
         *  **Note:** Linear filtering may cause artifacts around the edges, which are especially noticeable on opaque textures. To prevent this, use textures with transparent or identical colors around the edges.  
         */
        get textureFilter(): int64
        set textureFilter(value: int64)
        
        /** Sets the render priority for the sprite. Higher priority objects will be sorted in front of lower priority objects.  
         *      
         *  **Note:** This only applies if [member alpha_cut] is set to [constant ALPHA_CUT_DISABLED] (default value).  
         *      
         *  **Note:** This only applies to sorting of transparent objects. This will not impact how transparent objects are sorted relative to opaque objects. This is because opaque objects are not sorted, while transparent objects are sorted from back to front (subject to priority).  
         */
        get renderPriority(): int64
        set renderPriority(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpriteBase3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpriteBase3D;
    }
    namespace SpriteFrames {
        enum LoopMode {
            LoopNone = 0,
            LoopLinear = 1,
            LoopPingpong = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSpriteFrames extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSpriteFrames extends __NameMapResource {
        add_animation: "addAnimation";
        has_animation: "hasAnimation";
        duplicate_animation: "duplicateAnimation";
        remove_animation: "removeAnimation";
        rename_animation: "renameAnimation";
        get_animation_names: "getAnimationNames";
        set_animation_speed: "setAnimationSpeed";
        get_animation_speed: "getAnimationSpeed";
        set_animation_loop: "setAnimationLoop";
        get_animation_loop: "getAnimationLoop";
        set_animation_loop_mode: "setAnimationLoopMode";
        get_animation_loop_mode: "getAnimationLoopMode";
        add_frame: "addFrame";
        set_frame: "setFrame";
        remove_frame: "removeFrame";
        get_frame_count: "getFrameCount";
        get_frame_texture: "getFrameTexture";
        get_frame_duration: "getFrameDuration";
        clear_all: "clearAll";
    }
    /** Sprite frame library for AnimatedSprite2D and AnimatedSprite3D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_spriteframes.html  
     */
    class SpriteFrames extends Resource {
        constructor(identifier?: any)
        /** Adds a new [param anim] animation to the library. */
        addAnimation(anim: StringName): void
        
        /** Returns `true` if the [param anim] animation exists. */
        hasAnimation(anim: StringName): boolean
        
        /** Duplicates the animation [param anim_from] to a new animation named [param anim_to]. Fails if [param anim_to] already exists, or if [param anim_from] does not exist. */
        duplicateAnimation(animFrom: StringName, animTo: StringName): void
        
        /** Removes the [param anim] animation. */
        removeAnimation(anim: StringName): void
        
        /** Changes the [param anim] animation's name to [param newname]. */
        renameAnimation(anim: StringName, newname: StringName): void
        
        /** Returns an array containing the names associated to each animation. Values are placed in alphabetical order. */
        getAnimationNames(): PackedStringArray
        
        /** Sets the speed for the [param anim] animation in frames per second. */
        setAnimationSpeed(anim: StringName, fps: float64): void
        
        /** Returns the speed in frames per second for the [param anim] animation. */
        getAnimationSpeed(anim: StringName): float64
        
        /** If [param loop] is `false` equivalent to `set_animation_loop_mode(LOOP_NONE)`.  
         *  If [param loop] is `true` equivalent to `set_animation_loop_mode(LOOP_LINEAR)`.  
         */
        setAnimationLoop(anim: StringName, loop: boolean): void
        
        /** Returns `true` if `get_animation_loop_mode(anim) == LOOP_LINEAR`. Otherwise, returns `false`. */
        getAnimationLoop(anim: StringName): boolean
        
        /** Sets the [param loop_mode] for the [param anim] animation. */
        setAnimationLoopMode(anim: StringName, loopMode: SpriteFrames.LoopMode): void
        
        /** Returns the loop mode for the [param anim] animation. */
        getAnimationLoopMode(anim: StringName): SpriteFrames.LoopMode
        
        /** Adds a frame to the [param anim] animation. If [param at_position] is `-1`, the frame will be added to the end of the animation. [param duration] specifies the relative duration, see [method get_frame_duration] for details. */
        addFrame(anim: StringName, texture: Texture2D, duration?: float64 /* = 1 */, atPosition?: int64 /* = -1 */): void
        
        /** Sets the [param texture] and the [param duration] of the frame [param idx] in the [param anim] animation. [param duration] specifies the relative duration, see [method get_frame_duration] for details. */
        setFrame(anim: StringName, idx: int64, texture: Texture2D, duration?: float64 /* = 1 */): void
        
        /** Removes the [param anim] animation's frame [param idx]. */
        removeFrame(anim: StringName, idx: int64): void
        
        /** Returns the number of frames for the [param anim] animation. */
        getFrameCount(anim: StringName): int64
        
        /** Returns the texture of the frame [param idx] in the [param anim] animation. */
        getFrameTexture(anim: StringName, idx: int64): null | Texture2D
        
        /** Returns a relative duration of the frame [param idx] in the [param anim] animation (defaults to `1.0`). For example, a frame with a duration of `2.0` is displayed twice as long as a frame with a duration of `1.0`. You can calculate the absolute duration (in seconds) of a frame using the following formula:  
         *    
         *  In this example, `playing_speed` refers to either [method AnimatedSprite2D.get_playing_speed] or [method AnimatedSprite3D.get_playing_speed].  
         */
        getFrameDuration(anim: StringName, idx: int64): float64
        
        /** Removes all frames from the [param anim] animation. */
        clear(anim: StringName): void
        
        /** Removes all animations. An empty `default` animation will be created. */
        clearAll(): void
        get animations(): GArray
        set animations(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSpriteFrames;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSpriteFrames;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStandardMaterial3D extends __RPCMapBaseMaterial3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStandardMaterial3D extends __NameMapBaseMaterial3D {
    }
    /** A PBR (Physically Based Rendering) material to be used on 3D objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_standardmaterial3d.html  
     */
    class StandardMaterial3D extends BaseMaterial3D {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStandardMaterial3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStandardMaterial3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStaticBody2D extends __RPCMapPhysicsBody2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStaticBody2D extends __NameMapPhysicsBody2D {
        physics_material_override: "physicsMaterialOverride";
        constant_linear_velocity: "constantLinearVelocity";
        constant_angular_velocity: "constantAngularVelocity";
    }
    /** A 2D physics body that can't be moved by external forces. When moved manually, it doesn't affect other bodies in its path.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_staticbody2d.html  
     */
    class StaticBody2D<Map extends NodePathMap = any> extends PhysicsBody2D<Map> {
        constructor(identifier?: any)
        /** The physics material override for the body.  
         *  If a material is assigned to this property, it will be used instead of any other physics material, such as an inherited one.  
         */
        get physicsMaterialOverride(): null | PhysicsMaterial
        set physicsMaterialOverride(value: null | PhysicsMaterial)
        
        /** The body's constant linear velocity. This does not move the body, but affects touching bodies, as if it were moving. */
        get constantLinearVelocity(): Vector2
        set constantLinearVelocity(value: Vector2)
        
        /** The body's constant angular velocity. This does not rotate the body, but affects touching bodies, as if it were rotating. */
        get constantAngularVelocity(): float64
        set constantAngularVelocity(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStaticBody2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStaticBody2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStaticBody3D extends __RPCMapPhysicsBody3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStaticBody3D extends __NameMapPhysicsBody3D {
        physics_material_override: "physicsMaterialOverride";
        constant_linear_velocity: "constantLinearVelocity";
        constant_angular_velocity: "constantAngularVelocity";
    }
    /** A 3D physics body that can't be moved by external forces. When moved manually, it doesn't affect other bodies in its path.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_staticbody3d.html  
     */
    class StaticBody3D<Map extends NodePathMap = any> extends PhysicsBody3D<Map> {
        constructor(identifier?: any)
        /** The physics material override for the body.  
         *  If a material is assigned to this property, it will be used instead of any other physics material, such as an inherited one.  
         */
        get physicsMaterialOverride(): null | PhysicsMaterial
        set physicsMaterialOverride(value: null | PhysicsMaterial)
        
        /** The body's constant linear velocity. This does not move the body, but affects touching bodies, as if it were moving. */
        get constantLinearVelocity(): Vector3
        set constantLinearVelocity(value: Vector3)
        
        /** The body's constant angular velocity. This does not rotate the body, but affects touching bodies, as if it were rotating. */
        get constantAngularVelocity(): Vector3
        set constantAngularVelocity(value: Vector3)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStaticBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStaticBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStatusIndicator extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStatusIndicator extends __NameMapNode {
        get_rect: "getRect";
    }
    /** Application status indicator (aka notification area icon).  
     *      
     *  **Note:** Status indicator is implemented on macOS and Windows.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_statusindicator.html  
     */
    class StatusIndicator<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Returns the status indicator rectangle in screen coordinates. If this status indicator is not visible, returns an empty [Rect2]. */
        getRect(): Rect2
        
        /** Status indicator tooltip. */
        get tooltip(): string
        set tooltip(value: string)
        
        /** Status indicator icon. */
        get icon(): null | Texture2D
        set icon(value: null | Texture2D)
        
        /** Status indicator native popup menu. If this is set, the [signal pressed] signal is not emitted.  
         *      
         *  **Note:** Native popup is only supported if [NativeMenu] supports [constant NativeMenu.FEATURE_POPUP_MENU] feature.  
         */
        get menu(): NodePath
        set menu(value: NodePath | string)
        
        /** If `true`, the status indicator is visible. */
        get visible(): boolean
        set visible(value: boolean)
        
        /** Emitted when the status indicator is pressed. */
        readonly pressed: Signal<(mouseButton: int64, mousePosition: Vector2I) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStatusIndicator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStatusIndicator;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeer extends __NameMapRefCounted {
        put_data: "putData";
        put_partial_data: "putPartialData";
        get_data: "getData";
        get_partial_data: "getPartialData";
        get_available_bytes: "getAvailableBytes";
        put_8: "put8";
        put_u8: "putU8";
        put_16: "put16";
        put_u16: "putU16";
        put_32: "put32";
        put_u32: "putU32";
        put_64: "put64";
        put_u64: "putU64";
        put_half: "putHalf";
        put_float: "putFloat";
        put_double: "putDouble";
        put_string: "putString";
        put_utf8_string: "putUtf8String";
        put_var: "putVar";
        get_8: "get8";
        get_u8: "getU8";
        get_16: "get16";
        get_u16: "getU16";
        get_32: "get32";
        get_u32: "getU32";
        get_64: "get64";
        get_u64: "getU64";
        get_half: "getHalf";
        get_float: "getFloat";
        get_double: "getDouble";
        get_string: "getString";
        get_utf8_string: "getUtf8String";
        get_var: "getVar";
        big_endian: "bigEndian";
    }
    /** Abstract base class for interacting with streams.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_streampeer.html  
     */
    class StreamPeer extends RefCounted {
        constructor(identifier?: any)
        /** Sends a chunk of data through the connection, blocking if necessary until the data is done sending. This function returns an [enum Error] code. */
        putData(data: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Sends a chunk of data through the connection. If all the data could not be sent at once, only part of it will. This function returns two values, an [enum Error] code and an integer, describing how much data was actually sent. */
        putPartialData(data: PackedByteArray | byte[] | ArrayBuffer): GArray
        
        /** Returns a chunk data with the received bytes, as an [Array] containing two elements: an [enum Error] constant and a [PackedByteArray]. [param bytes] is the number of bytes to be received. If not enough bytes are available, the function will block until the desired amount is received. */
        getData(bytes: int64): GArray
        
        /** Returns a chunk data with the received bytes, as an [Array] containing two elements: an [enum Error] constant and a [PackedByteArray]. [param bytes] is the number of bytes to be received. If not enough bytes are available, the function will return how many were actually received. */
        getPartialData(bytes: int64): GArray
        
        /** Returns the number of bytes this [StreamPeer] has available. */
        getAvailableBytes(): int64
        
        /** Puts a signed byte into the stream. */
        put8(value: int64): void
        
        /** Puts an unsigned byte into the stream. */
        putU8(value: int64): void
        
        /** Puts a signed 16-bit value into the stream. */
        put16(value: int64): void
        
        /** Puts an unsigned 16-bit value into the stream. */
        putU16(value: int64): void
        
        /** Puts a signed 32-bit value into the stream. */
        put32(value: int64): void
        
        /** Puts an unsigned 32-bit value into the stream. */
        putU32(value: int64): void
        
        /** Puts a signed 64-bit value into the stream. */
        put64(value: int64): void
        
        /** Puts an unsigned 64-bit value into the stream. */
        putU64(value: int64): void
        
        /** Puts a half-precision float into the stream. */
        putHalf(value: float64): void
        
        /** Puts a single-precision float into the stream. */
        putFloat(value: float64): void
        
        /** Puts a double-precision float into the stream. */
        putDouble(value: float64): void
        
        /** Puts a zero-terminated ASCII string into the stream prepended by a 32-bit unsigned integer representing its size.  
         *      
         *  **Note:** To put an ASCII string without prepending its size, you can use [method put_data]:  
         *    
         */
        putString(value: string): void
        
        /** Puts a zero-terminated UTF-8 string into the stream prepended by a 32 bits unsigned integer representing its size.  
         *      
         *  **Note:** To put a UTF-8 string without prepending its size, you can use [method put_data]:  
         *    
         */
        putUtf8String(value: string): void
        
        /** Puts a Variant into the stream. If [param full_objects] is `true` encoding objects is allowed (and can potentially include code).  
         *  Internally, this uses the same encoding mechanism as the [method @GlobalScope.var_to_bytes] method.  
         */
        putVar(value: any, fullObjects?: boolean /* = false */): void
        
        /** Gets a signed byte from the stream. */
        get8(): int64
        
        /** Gets an unsigned byte from the stream. */
        getU8(): int64
        
        /** Gets a signed 16-bit value from the stream. */
        get16(): int64
        
        /** Gets an unsigned 16-bit value from the stream. */
        getU16(): int64
        
        /** Gets a signed 32-bit value from the stream. */
        get32(): int64
        
        /** Gets an unsigned 32-bit value from the stream. */
        getU32(): int64
        
        /** Gets a signed 64-bit value from the stream. */
        get64(): int64
        
        /** Gets an unsigned 64-bit value from the stream. */
        getU64(): int64
        
        /** Gets a half-precision float from the stream. */
        getHalf(): float64
        
        /** Gets a single-precision float from the stream. */
        getFloat(): float64
        
        /** Gets a double-precision float from the stream. */
        getDouble(): float64
        
        /** Gets an ASCII string with byte-length [param bytes] from the stream. If [param bytes] is negative (default) the length will be read from the stream using the reverse process of [method put_string]. */
        getString(bytes?: int64 /* = -1 */): string
        
        /** Gets a UTF-8 string with byte-length [param bytes] from the stream (this decodes the string sent as UTF-8). If [param bytes] is negative (default) the length will be read from the stream using the reverse process of [method put_utf8_string]. */
        getUtf8String(bytes?: int64 /* = -1 */): string
        
        /** Gets a Variant from the stream. If [param allow_objects] is `true`, decoding objects is allowed.  
         *  Internally, this uses the same decoding mechanism as the [method @GlobalScope.bytes_to_var] method.  
         *  **Warning:** Deserialized objects can contain code which gets executed. Do not use this option if the serialized object comes from untrusted sources to avoid potential security threats such as remote code execution.  
         */
        getVar(allowObjects?: boolean /* = false */): any
        
        /** If `true`, this [StreamPeer] will using big-endian format for encoding and decoding. */
        get bigEndian(): boolean
        set bigEndian(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerBuffer extends __RPCMapStreamPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerBuffer extends __NameMapStreamPeer {
        get_size: "getSize";
        get_position: "getPosition";
        data_array: "dataArray";
    }
    /** A stream peer used to handle binary data streams.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_streampeerbuffer.html  
     */
    class StreamPeerBuffer extends StreamPeer {
        constructor(identifier?: any)
        /** Moves the cursor to the specified position. [param position] must be a valid index of [member data_array]. */
        seek(position: int64): void
        
        /** Returns the size of [member data_array]. */
        getSize(): int64
        
        /** Returns the current cursor position. */
        getPosition(): int64
        
        /** Resizes the [member data_array]. This  *doesn't*  update the cursor. */
        resize(size: int64): void
        
        /** Clears the [member data_array] and resets the cursor. */
        clear(): void
        
        /** Returns a new [StreamPeerBuffer] with the same [member data_array] content. */
        duplicate(): null | StreamPeerBuffer
        
        /** The underlying data buffer. Setting this value resets the cursor. */
        get dataArray(): PackedByteArray
        set dataArray(value: PackedByteArray | byte[] | ArrayBuffer)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerBuffer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerBuffer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerExtension extends __RPCMapStreamPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerExtension extends __NameMapStreamPeer {
        _get_data: "_getData";
        _get_partial_data: "_getPartialData";
        _put_data: "_putData";
        _put_partial_data: "_putPartialData";
        _get_available_bytes: "_getAvailableBytes";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_streampeerextension.html */
    class StreamPeerExtension extends StreamPeer {
        constructor(identifier?: any)
        /* gdvirtual */ _getData(rBuffer: int64, rBytes: int64, rReceived: int64): GError
        /* gdvirtual */ _getPartialData(rBuffer: int64, rBytes: int64, rReceived: int64): GError
        /* gdvirtual */ _putData(data: int64, bytes: int64, rSent: int64): GError
        /* gdvirtual */ _putPartialData(data: int64, bytes: int64, rSent: int64): GError
        /* gdvirtual */ _getAvailableBytes(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerGZip extends __RPCMapStreamPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerGZip extends __NameMapStreamPeer {
        start_compression: "startCompression";
        start_decompression: "startDecompression";
    }
    class StreamPeerGZip extends StreamPeer {
        constructor(identifier?: any)
        startCompression(useDeflate?: boolean /* = false */, bufferSize?: int64 /* = 65535 */): GError
        startDecompression(useDeflate?: boolean /* = false */, bufferSize?: int64 /* = 65535 */): GError
        finish(): GError
        clear(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerGZip;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerGZip;
    }
    namespace StreamPeerSocket {
        enum Status {
            StatusNone = 0,
            StatusConnecting = 1,
            StatusConnected = 2,
            StatusError = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerSocket extends __RPCMapStreamPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerSocket extends __NameMapStreamPeer {
        get_status: "getStatus";
        disconnect_from_host: "disconnectFromHost";
    }
    /** Abstract base class for interacting with socket streams.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_streampeersocket.html  
     */
    class StreamPeerSocket extends StreamPeer {
        constructor(identifier?: any)
        /** Polls the socket, updating its state. See [method get_status]. */
        poll(): GError
        
        /** Returns the status of the connection. */
        getStatus(): StreamPeerSocket.Status
        
        /** Disconnects from host. */
        disconnectFromHost(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerSocket;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerSocket;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerTcp extends __RPCMapStreamPeerSocket {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerTcp extends __NameMapStreamPeerSocket {
        connect_to_host: "connectToHost";
        get_connected_host: "getConnectedHost";
        get_connected_port: "getConnectedPort";
        get_local_port: "getLocalPort";
        set_no_delay: "setNoDelay";
    }
    class StreamPeerTcp extends StreamPeerSocket {
        constructor(identifier?: any)
        bind(port: int64, host?: string /* = '*' */): GError
        connectToHost(host: string, port: int64): GError
        getConnectedHost(): string
        getConnectedPort(): int64
        getLocalPort(): int64
        setNoDelay(enabled: boolean): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerTcp;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerTcp;
    }
    namespace StreamPeerTls {
        enum Status {
            StatusDisconnected = 0,
            StatusHandshaking = 1,
            StatusConnected = 2,
            StatusError = 3,
            StatusErrorHostnameMismatch = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerTls extends __RPCMapStreamPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerTls extends __NameMapStreamPeer {
        accept_stream: "acceptStream";
        connect_to_stream: "connectToStream";
        get_status: "getStatus";
        get_stream: "getStream";
        disconnect_from_stream: "disconnectFromStream";
    }
    class StreamPeerTls extends StreamPeer {
        constructor(identifier?: any)
        poll(): void
        acceptStream(stream: StreamPeer, serverOptions: TlsOptions): GError
        connectToStream(stream: StreamPeer, commonName: string, clientOptions?: TlsOptions): GError
        getStatus(): StreamPeerTls.Status
        getStream(): null | StreamPeer
        disconnectFromStream(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerTls;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerTls;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamPeerUds extends __RPCMapStreamPeerSocket {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamPeerUds extends __NameMapStreamPeerSocket {
        connect_to_host: "connectToHost";
        get_connected_path: "getConnectedPath";
    }
    class StreamPeerUds extends StreamPeerSocket {
        constructor(identifier?: any)
        bind(path: string): GError
        connectToHost(path: string): GError
        getConnectedPath(): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamPeerUds;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamPeerUds;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStreamedTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStreamedTexture2D extends __NameMapTexture2D {
        load_path: "loadPath";
        max_lod_override: "maxLodOverride";
        min_lod_override: "minLodOverride";
    }
    /** A texture that supports dynamic mipmap streaming for optimized VRAM usage.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_streamedtexture2d.html  
     */
    class StreamedTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** The [StreamedTexture2D]'s file path to a `.stex` file. */
        get loadPath(): string
        set loadPath(value: string)
        
        /** Overrides the maximum LOD (mipmap level) that can be loaded for this specific texture. Lower values allow higher resolution. A value of `0` uses the global setting from [member ProjectSettings.rendering/textures/streaming/max_lod]. Values `1` to `14` correspond to LOD levels `0` to `13`. */
        get maxLodOverride(): int64
        set maxLodOverride(value: int64)
        
        /** Overrides the minimum LOD (mipmap level) this texture starts at when loaded. Higher values result in lower initial resolution. A value of `0` uses the global setting from [member ProjectSettings.rendering/textures/streaming/min_lod]. Values `1` to `14` correspond to LOD levels `0` to `13`. */
        get minLodOverride(): int64
        set minLodOverride(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStreamedTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStreamedTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStyleBox extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStyleBox extends __NameMapResource {
        _get_draw_rect: "_getDrawRect";
        _get_minimum_size: "_getMinimumSize";
        _test_mask: "_testMask";
        get_minimum_size: "getMinimumSize";
        set_content_margin: "setContentMargin";
        set_content_margin_all: "setContentMarginAll";
        get_content_margin: "getContentMargin";
        get_margin: "getMargin";
        get_offset: "getOffset";
        get_current_item_drawn: "getCurrentItemDrawn";
        test_mask: "testMask";
        content_margin_left: "contentMarginLeft";
        content_margin_top: "contentMarginTop";
        content_margin_right: "contentMarginRight";
        content_margin_bottom: "contentMarginBottom";
    }
    /** Abstract base class for defining stylized boxes for UI elements.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_stylebox.html  
     */
    class StyleBox extends Resource {
        constructor(identifier?: any)
        /* gdvirtual */ _draw(toCanvasItem: Rid, rect: Rect2): void
        /* gdvirtual */ _getDrawRect(rect: Rect2): Rect2
        
        /** Virtual method to be implemented by the user. Returns a custom minimum size that the stylebox must respect when drawing. By default [method get_minimum_size] only takes content margins into account. This method can be overridden to add another size restriction. A combination of the default behavior and the output of this method will be used, to account for both sizes. */
        /* gdvirtual */ _getMinimumSize(): Vector2
        /* gdvirtual */ _testMask(point: Vector2, rect: Rect2): boolean
        
        /** Returns the minimum size that this stylebox can be shrunk to. */
        getMinimumSize(): Vector2
        
        /** Sets the default value of the specified [enum Side] to [param offset] pixels. */
        setContentMargin(margin: Side, offset: float64): void
        
        /** Sets the default margin to [param offset] pixels for all sides. */
        setContentMarginAll(offset: float64): void
        
        /** Returns the default margin of the specified [enum Side]. */
        getContentMargin(margin: Side): float64
        
        /** Returns the content margin offset for the specified [enum Side].  
         *  Positive values reduce size inwards, unlike [Control]'s margin values.  
         */
        getMargin(margin: Side): float64
        
        /** Returns the "offset" of a stylebox. This helper function returns a value equivalent to `Vector2(style.get_margin(MARGIN_LEFT), style.get_margin(MARGIN_TOP))`. */
        getOffset(): Vector2
        
        /** Draws this stylebox using a canvas item identified by the given [RID].  
         *  The [RID] value can either be the result of [method CanvasItem.get_canvas_item] called on an existing [CanvasItem]-derived node, or directly from creating a canvas item in the [RenderingServer] with [method RenderingServer.canvas_item_create].  
         */
        draw(canvasItem: Rid, rect: Rect2): void
        
        /** Returns the [CanvasItem] that handles its [constant CanvasItem.NOTIFICATION_DRAW] or [method CanvasItem._draw] callback at this moment. */
        getCurrentItemDrawn(): null | CanvasItem
        
        /** Test a position in a rectangle, return whether it passes the mask test. */
        testMask(point: Vector2, rect: Rect2): boolean
        
        /** The left margin for the contents of this style box. Increasing this value reduces the space available to the contents from the left.  
         *  Refer to [member content_margin_bottom] for extra considerations.  
         */
        get contentMarginLeft(): float64
        set contentMarginLeft(value: float64)
        
        /** The top margin for the contents of this style box. Increasing this value reduces the space available to the contents from the top.  
         *  Refer to [member content_margin_bottom] for extra considerations.  
         */
        get contentMarginTop(): float64
        set contentMarginTop(value: float64)
        
        /** The right margin for the contents of this style box. Increasing this value reduces the space available to the contents from the right.  
         *  Refer to [member content_margin_bottom] for extra considerations.  
         */
        get contentMarginRight(): float64
        set contentMarginRight(value: float64)
        
        /** The bottom margin for the contents of this style box. Increasing this value reduces the space available to the contents from the bottom.  
         *  If this value is negative, it is ignored and a child-specific margin is used instead. For example, for [StyleBoxFlat], the border thickness (if any) is used instead.  
         *  It is up to the code using this style box to decide what these contents are: for example, a [Button] respects this content margin for the textual contents of the button.  
         *  [method get_margin] should be used to fetch this value as consumer instead of reading these properties directly. This is because it correctly respects negative values and the fallback mentioned above.  
         */
        get contentMarginBottom(): float64
        set contentMarginBottom(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStyleBox;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStyleBox;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStyleBoxEmpty extends __RPCMapStyleBox {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStyleBoxEmpty extends __NameMapStyleBox {
    }
    /** An empty [StyleBox] (does not display anything).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_styleboxempty.html  
     */
    class StyleBoxEmpty extends StyleBox {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStyleBoxEmpty;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStyleBoxEmpty;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStyleBoxFlat extends __RPCMapStyleBox {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStyleBoxFlat extends __NameMapStyleBox {
        set_border_width_all: "setBorderWidthAll";
        get_border_width_min: "getBorderWidthMin";
        set_border_width: "setBorderWidth";
        get_border_width: "getBorderWidth";
        set_corner_radius_all: "setCornerRadiusAll";
        set_corner_radius: "setCornerRadius";
        get_corner_radius: "getCornerRadius";
        set_expand_margin: "setExpandMargin";
        set_expand_margin_all: "setExpandMarginAll";
        get_expand_margin: "getExpandMargin";
        bg_color: "bgColor";
        draw_center: "drawCenter";
        border_width_left: "borderWidthLeft";
        border_width_top: "borderWidthTop";
        border_width_right: "borderWidthRight";
        border_width_bottom: "borderWidthBottom";
        border_color: "borderColor";
        border_blend: "borderBlend";
        corner_radius_top_left: "cornerRadiusTopLeft";
        corner_radius_top_right: "cornerRadiusTopRight";
        corner_radius_bottom_right: "cornerRadiusBottomRight";
        corner_radius_bottom_left: "cornerRadiusBottomLeft";
        corner_detail: "cornerDetail";
        expand_margin_left: "expandMarginLeft";
        expand_margin_top: "expandMarginTop";
        expand_margin_right: "expandMarginRight";
        expand_margin_bottom: "expandMarginBottom";
        shadow_color: "shadowColor";
        shadow_size: "shadowSize";
        shadow_offset: "shadowOffset";
        anti_aliasing: "antiAliasing";
        anti_aliasing_size: "antiAliasingSize";
    }
    /** A customizable [StyleBox] that doesn't use a texture.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_styleboxflat.html  
     */
    class StyleBoxFlat extends StyleBox {
        constructor(identifier?: any)
        /** Sets the border width to [param width] pixels for all sides. */
        setBorderWidthAll(width: int64): void
        
        /** Returns the smallest border width out of all four borders. */
        getBorderWidthMin(): int64
        
        /** Sets the specified [enum Side]'s border width to [param width] pixels. */
        setBorderWidth(margin: Side, width: int64): void
        
        /** Returns the specified [enum Side]'s border width. */
        getBorderWidth(margin: Side): int64
        
        /** Sets the corner radius to [param radius] pixels for all corners. */
        setCornerRadiusAll(radius: int64): void
        
        /** Sets the corner radius to [param radius] pixels for the given [param corner]. */
        setCornerRadius(corner: Corner, radius: int64): void
        
        /** Returns the given [param corner]'s radius. */
        getCornerRadius(corner: Corner): int64
        
        /** Sets the expand margin to [param size] pixels for the specified [enum Side]. */
        setExpandMargin(margin: Side, size: float64): void
        
        /** Sets the expand margin to [param size] pixels for all sides. */
        setExpandMarginAll(size: float64): void
        
        /** Returns the size of the specified [enum Side]'s expand margin. */
        getExpandMargin(margin: Side): float64
        
        /** The background color of the stylebox. */
        get bgColor(): Color
        set bgColor(value: Color)
        
        /** Toggles drawing of the inner part of the stylebox. */
        get drawCenter(): boolean
        set drawCenter(value: boolean)
        
        /** If set to a non-zero value on either axis, [member skew] distorts the StyleBox horizontally and/or vertically. This can be used for "futuristic"-style UIs. Positive values skew the StyleBox towards the right (X axis) and upwards (Y axis), while negative values skew the StyleBox towards the left (X axis) and downwards (Y axis).  
         *      
         *  **Note:** To ensure text does not touch the StyleBox's edges, consider increasing the [StyleBox]'s content margin (see [member StyleBox.content_margin_bottom]). It is preferable to increase the content margin instead of the expand margin (see [member expand_margin_bottom]), as increasing the expand margin does not increase the size of the clickable area for [Control]s.  
         */
        get skew(): Vector2
        set skew(value: Vector2)
        
        /** Border width for the left border. */
        get borderWidthLeft(): int64
        set borderWidthLeft(value: int64)
        
        /** Border width for the top border. */
        get borderWidthTop(): int64
        set borderWidthTop(value: int64)
        
        /** Border width for the right border. */
        get borderWidthRight(): int64
        set borderWidthRight(value: int64)
        
        /** Border width for the bottom border. */
        get borderWidthBottom(): int64
        set borderWidthBottom(value: int64)
        
        /** Sets the color of the border. */
        get borderColor(): Color
        set borderColor(value: Color)
        
        /** If `true`, the border will fade into the background color. */
        get borderBlend(): boolean
        set borderBlend(value: boolean)
        
        /** The top-left corner's radius. If `0`, the corner is not rounded. */
        get cornerRadiusTopLeft(): int64
        set cornerRadiusTopLeft(value: int64)
        
        /** The top-right corner's radius. If `0`, the corner is not rounded. */
        get cornerRadiusTopRight(): int64
        set cornerRadiusTopRight(value: int64)
        
        /** The bottom-right corner's radius. If `0`, the corner is not rounded. */
        get cornerRadiusBottomRight(): int64
        set cornerRadiusBottomRight(value: int64)
        
        /** The bottom-left corner's radius. If `0`, the corner is not rounded. */
        get cornerRadiusBottomLeft(): int64
        set cornerRadiusBottomLeft(value: int64)
        
        /** This sets the number of vertices used for each corner. Higher values result in rounder corners but take more processing power to compute. When choosing a value, you should take the corner radius ([method set_corner_radius_all]) into account.  
         *  For corner radii less than 10, `4` or `5` should be enough. For corner radii less than 30, values between `8` and `12` should be enough.  
         *  A corner detail of `1` will result in chamfered corners instead of rounded corners, which is useful for some artistic effects.  
         */
        get cornerDetail(): int64
        set cornerDetail(value: int64)
        
        /** Expands the stylebox outside of the control rect on the left edge. Useful in combination with [member border_width_left] to draw a border outside the control rect.  
         *      
         *  **Note:** Unlike [member StyleBox.content_margin_left], [member expand_margin_left] does  *not*  affect the size of the clickable area for [Control]s. This can negatively impact usability if used wrong, as the user may try to click an area of the StyleBox that cannot actually receive clicks.  
         */
        get expandMarginLeft(): float64
        set expandMarginLeft(value: float64)
        
        /** Expands the stylebox outside of the control rect on the top edge. Useful in combination with [member border_width_top] to draw a border outside the control rect.  
         *      
         *  **Note:** Unlike [member StyleBox.content_margin_top], [member expand_margin_top] does  *not*  affect the size of the clickable area for [Control]s. This can negatively impact usability if used wrong, as the user may try to click an area of the StyleBox that cannot actually receive clicks.  
         */
        get expandMarginTop(): float64
        set expandMarginTop(value: float64)
        
        /** Expands the stylebox outside of the control rect on the right edge. Useful in combination with [member border_width_right] to draw a border outside the control rect.  
         *      
         *  **Note:** Unlike [member StyleBox.content_margin_right], [member expand_margin_right] does  *not*  affect the size of the clickable area for [Control]s. This can negatively impact usability if used wrong, as the user may try to click an area of the StyleBox that cannot actually receive clicks.  
         */
        get expandMarginRight(): float64
        set expandMarginRight(value: float64)
        
        /** Expands the stylebox outside of the control rect on the bottom edge. Useful in combination with [member border_width_bottom] to draw a border outside the control rect.  
         *      
         *  **Note:** Unlike [member StyleBox.content_margin_bottom], [member expand_margin_bottom] does  *not*  affect the size of the clickable area for [Control]s. This can negatively impact usability if used wrong, as the user may try to click an area of the StyleBox that cannot actually receive clicks.  
         */
        get expandMarginBottom(): float64
        set expandMarginBottom(value: float64)
        
        /** The color of the shadow. This has no effect if [member shadow_size] is lower than 1. */
        get shadowColor(): Color
        set shadowColor(value: Color)
        
        /** The shadow size in pixels. */
        get shadowSize(): int64
        set shadowSize(value: int64)
        
        /** The shadow offset in pixels. Adjusts the position of the shadow relatively to the stylebox. */
        get shadowOffset(): Vector2
        set shadowOffset(value: Vector2)
        
        /** Antialiasing draws a small ring around the edges, which fades to transparency. As a result, edges look much smoother. This is only noticeable when using rounded corners or [member skew].  
         *      
         *  **Note:** When using beveled corners with 45-degree angles ([member corner_detail] = 1), it is recommended to set [member anti_aliasing] to `false` to ensure crisp visuals and avoid possible visual glitches.  
         */
        get antiAliasing(): boolean
        set antiAliasing(value: boolean)
        
        /** This changes the size of the antialiasing effect. `1.0` is recommended for an optimal result at 100% scale, identical to how rounded rectangles are rendered in web browsers and most vector drawing software.  
         *      
         *  **Note:** Higher values may produce a blur effect but can also create undesired artifacts on small boxes with large-radius corners.  
         */
        get antiAliasingSize(): float64
        set antiAliasingSize(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStyleBoxFlat;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStyleBoxFlat;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStyleBoxLine extends __RPCMapStyleBox {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStyleBoxLine extends __NameMapStyleBox {
        grow_begin: "growBegin";
        grow_end: "growEnd";
    }
    /** A [StyleBox] that displays a single line of a given color and thickness.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_styleboxline.html  
     */
    class StyleBoxLine extends StyleBox {
        constructor(identifier?: any)
        /** The line's color. */
        get color(): Color
        set color(value: Color)
        
        /** The number of pixels the line will extend before the [StyleBoxLine]'s bounds. If set to a negative value, the line will begin inside the [StyleBoxLine]'s bounds. */
        get growBegin(): float64
        set growBegin(value: float64)
        
        /** The number of pixels the line will extend past the [StyleBoxLine]'s bounds. If set to a negative value, the line will end inside the [StyleBoxLine]'s bounds. */
        get growEnd(): float64
        set growEnd(value: float64)
        
        /** The line's thickness in pixels. */
        get thickness(): int64
        set thickness(value: int64)
        
        /** If `true`, the line will be vertical. If `false`, the line will be horizontal. */
        get vertical(): boolean
        set vertical(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStyleBoxLine;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStyleBoxLine;
    }
    namespace StyleBoxTexture {
        enum AxisStretchMode {
            AxisStretchModeStretch = 0,
            AxisStretchModeTile = 1,
            AxisStretchModeTileFit = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapStyleBoxTexture extends __RPCMapStyleBox {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapStyleBoxTexture extends __NameMapStyleBox {
        set_texture_margin: "setTextureMargin";
        set_texture_margin_all: "setTextureMarginAll";
        get_texture_margin: "getTextureMargin";
        set_expand_margin: "setExpandMargin";
        set_expand_margin_all: "setExpandMarginAll";
        get_expand_margin: "getExpandMargin";
        texture_margin_left: "textureMarginLeft";
        texture_margin_top: "textureMarginTop";
        texture_margin_right: "textureMarginRight";
        texture_margin_bottom: "textureMarginBottom";
        expand_margin_left: "expandMarginLeft";
        expand_margin_top: "expandMarginTop";
        expand_margin_right: "expandMarginRight";
        expand_margin_bottom: "expandMarginBottom";
        axis_stretch_horizontal: "axisStretchHorizontal";
        axis_stretch_vertical: "axisStretchVertical";
        region_rect: "regionRect";
        modulate_color: "modulateColor";
        draw_center: "drawCenter";
    }
    /** A texture-based nine-patch [StyleBox].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_styleboxtexture.html  
     */
    class StyleBoxTexture extends StyleBox {
        constructor(identifier?: any)
        /** Sets the margin to [param size] pixels for the specified [enum Side]. */
        setTextureMargin(margin: Side, size: float64): void
        
        /** Sets the margin to [param size] pixels for all sides. */
        setTextureMarginAll(size: float64): void
        
        /** Returns the margin size of the specified [enum Side]. */
        getTextureMargin(margin: Side): float64
        
        /** Sets the expand margin to [param size] pixels for the specified [enum Side]. */
        setExpandMargin(margin: Side, size: float64): void
        
        /** Sets the expand margin to [param size] pixels for all sides. */
        setExpandMarginAll(size: float64): void
        
        /** Returns the expand margin size of the specified [enum Side]. */
        getExpandMargin(margin: Side): float64
        
        /** The texture to use when drawing this style box. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** Increases the left margin of the 3×3 texture box.  
         *  A higher value means more of the source texture is considered to be part of the left border of the 3×3 box.  
         *  This is also the value used as fallback for [member StyleBox.content_margin_left] if it is negative.  
         */
        get textureMarginLeft(): float64
        set textureMarginLeft(value: float64)
        
        /** Increases the top margin of the 3×3 texture box.  
         *  A higher value means more of the source texture is considered to be part of the top border of the 3×3 box.  
         *  This is also the value used as fallback for [member StyleBox.content_margin_top] if it is negative.  
         */
        get textureMarginTop(): float64
        set textureMarginTop(value: float64)
        
        /** Increases the right margin of the 3×3 texture box.  
         *  A higher value means more of the source texture is considered to be part of the right border of the 3×3 box.  
         *  This is also the value used as fallback for [member StyleBox.content_margin_right] if it is negative.  
         */
        get textureMarginRight(): float64
        set textureMarginRight(value: float64)
        
        /** Increases the bottom margin of the 3×3 texture box.  
         *  A higher value means more of the source texture is considered to be part of the bottom border of the 3×3 box.  
         *  This is also the value used as fallback for [member StyleBox.content_margin_bottom] if it is negative.  
         */
        get textureMarginBottom(): float64
        set textureMarginBottom(value: float64)
        
        /** Expands the left margin of this style box when drawing, causing it to be drawn larger than requested. */
        get expandMarginLeft(): float64
        set expandMarginLeft(value: float64)
        
        /** Expands the top margin of this style box when drawing, causing it to be drawn larger than requested. */
        get expandMarginTop(): float64
        set expandMarginTop(value: float64)
        
        /** Expands the right margin of this style box when drawing, causing it to be drawn larger than requested. */
        get expandMarginRight(): float64
        set expandMarginRight(value: float64)
        
        /** Expands the bottom margin of this style box when drawing, causing it to be drawn larger than requested. */
        get expandMarginBottom(): float64
        set expandMarginBottom(value: float64)
        
        /** Controls how the stylebox's texture will be stretched or tiled horizontally. */
        get axisStretchHorizontal(): int64
        set axisStretchHorizontal(value: int64)
        
        /** Controls how the stylebox's texture will be stretched or tiled vertically. */
        get axisStretchVertical(): int64
        set axisStretchVertical(value: int64)
        
        /** The region to use from the [member texture].  
         *  This is equivalent to first wrapping the [member texture] in an [AtlasTexture] with the same region.  
         *  If empty (`Rect2(0, 0, 0, 0)`), the whole [member texture] is used.  
         */
        get regionRect(): Rect2
        set regionRect(value: Rect2)
        
        /** Modulates the color of the texture when this style box is drawn. */
        get modulateColor(): Color
        set modulateColor(value: Color)
        
        /** If `true`, the nine-patch texture's center tile will be drawn. */
        get drawCenter(): boolean
        set drawCenter(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapStyleBoxTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapStyleBoxTexture;
    }
    namespace SubViewport {
        enum ClearMode {
            ClearModeAlways = 0,
            ClearModeNever = 1,
            ClearModeOnce = 2,
        }
        enum UpdateMode {
            UpdateDisabled = 0,
            UpdateOnce = 1,
            UpdateWhenVisible = 2,
            UpdateWhenParentVisible = 3,
            UpdateAlways = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSubViewport extends __RPCMapViewport {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSubViewport extends __NameMapViewport {
        size_2d_override: "size2DOverride";
        size_2d_override_stretch: "size2DOverrideStretch";
        view_count: "viewCount";
        render_target_clear_mode: "renderTargetClearMode";
        render_target_update_mode: "renderTargetUpdateMode";
    }
    /** An interface to a game world that doesn't create a window or draw to the screen directly.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_subviewport.html  
     */
    class SubViewport<Map extends NodePathMap = any> extends Viewport<Map> {
        constructor(identifier?: any)
        /** The width and height of the sub-viewport. Must be set to a value greater than or equal to 2 pixels on both dimensions. Otherwise, nothing will be displayed.  
         *      
         *  **Note:** If the parent node is a [SubViewportContainer] and its [member SubViewportContainer.stretch] is `true`, the viewport size cannot be changed manually.  
         */
        get size(): Vector2I
        set size(value: Vector2I)
        
        /** The 2D size override of the sub-viewport. If either the width or height is `0`, the override is disabled. */
        get size2DOverride(): Vector2I
        set size2DOverride(value: Vector2I)
        
        /** If `true`, the 2D size override affects stretch as well. */
        get size2DOverrideStretch(): boolean
        set size2DOverrideStretch(value: boolean)
        
        /** The number of view layers we are rendering to. Set this to `2` to enable stereo rendering. */
        get viewCount(): int64
        set viewCount(value: int64)
        
        /** The clear mode when the sub-viewport is used as a render target.  
         *      
         *  **Note:** This property is intended for 2D usage.  
         */
        get renderTargetClearMode(): int64
        set renderTargetClearMode(value: int64)
        
        /** The update mode when the sub-viewport is used as a render target. */
        get renderTargetUpdateMode(): int64
        set renderTargetUpdateMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSubViewport;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSubViewport;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSubViewportContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSubViewportContainer extends __NameMapContainer {
        _propagate_input_event: "_propagateInputEvent";
        stretch_shrink: "stretchShrink";
        mouse_target: "mouseTarget";
    }
    /** A container used for displaying the contents of a [SubViewport].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_subviewportcontainer.html  
     */
    class SubViewportContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** Virtual method to be implemented by the user. If it returns `true`, the [param event] is propagated to [SubViewport] children. Propagation doesn't happen if it returns `false`. If the function is not implemented, all events are propagated to SubViewports. */
        /* gdvirtual */ _propagateInputEvent(event: InputEvent): boolean
        
        /** If `true`, the sub-viewport will be automatically resized to the control's size.  
         *      
         *  **Note:** If `true`, this will prohibit changing [member SubViewport.size] of its children manually.  
         */
        get stretch(): boolean
        set stretch(value: boolean)
        
        /** Divides the sub-viewport's effective resolution by this value while preserving its scale. This can be used to speed up rendering.  
         *  For example, a 1280×720 sub-viewport with [member stretch_shrink] set to `2` will be rendered at 640×360 while occupying the same size in the container.  
         *      
         *  **Note:** [member stretch] must be `true` for this property to work.  
         */
        get stretchShrink(): int64
        set stretchShrink(value: int64)
        
        /** Configure, if either the [SubViewportContainer] or alternatively the [Control] nodes of its [SubViewport] children should be available as targets of mouse-related functionalities, like identifying the drop target in drag-and-drop operations or cursor shape of hovered [Control] node.  
         *  If `false`, the [Control] nodes inside its [SubViewport] children are considered as targets.  
         *  If `true`, the [SubViewportContainer] itself will be considered as a target.  
         */
        get mouseTarget(): boolean
        set mouseTarget(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSubViewportContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSubViewportContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSubtweenTweener extends __RPCMapTweener {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSubtweenTweener extends __NameMapTweener {
        set_delay: "setDelay";
    }
    /** Runs a [Tween] nested within another [Tween].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_subtweentweener.html  
     */
    class SubtweenTweener extends Tweener {
        constructor(identifier?: any)
        /** Sets the time in seconds after which the [SubtweenTweener] will start running the subtween. By default there's no delay. */
        setDelay(delay: float64): null | SubtweenTweener
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSubtweenTweener;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSubtweenTweener;
    }
    namespace SurfaceTool {
        enum CustomFormat {
            CustomRgba8Unorm = 0,
            CustomRgba8Snorm = 1,
            CustomRgHalf = 2,
            CustomRgbaHalf = 3,
            CustomRFloat = 4,
            CustomRgFloat = 5,
            CustomRgbFloat = 6,
            CustomRgbaFloat = 7,
            CustomMax = 8,
        }
        enum SkinWeightCount {
            Skin4Weights = 0,
            Skin8Weights = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSurfaceTool extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSurfaceTool extends __NameMapRefCounted {
        set_skin_weight_count: "setSkinWeightCount";
        get_skin_weight_count: "getSkinWeightCount";
        set_custom_format: "setCustomFormat";
        get_custom_format: "getCustomFormat";
        add_vertex: "addVertex";
        set_color: "setColor";
        set_normal: "setNormal";
        set_tangent: "setTangent";
        set_uv: "setUV";
        set_uv2: "setUV2";
        set_bones: "setBones";
        set_weights: "setWeights";
        set_custom: "setCustom";
        set_smooth_group: "setSmoothGroup";
        add_triangle_fan: "addTriangleFan";
        add_index: "addIndex";
        generate_normals: "generateNormals";
        generate_tangents: "generateTangents";
        optimize_indices_for_cache: "optimizeIndicesForCache";
        get_aabb: "getAabb";
        generate_lod: "generateLod";
        set_material: "setMaterial";
        get_primitive_type: "getPrimitiveType";
        create_from: "createFrom";
        create_from_arrays: "createFromArrays";
        create_from_blend_shape: "createFromBlendShape";
        append_from: "appendFrom";
        commit_to_arrays: "commitToArrays";
    }
    /** Helper tool to create geometry.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_surfacetool.html  
     */
    class SurfaceTool extends RefCounted {
        constructor(identifier?: any)
        /** Set to [constant SKIN_8_WEIGHTS] to indicate that up to 8 bone influences per vertex may be used.  
         *  By default, only 4 bone influences are used ([constant SKIN_4_WEIGHTS]).  
         *      
         *  **Note:** This function takes an enum, not the exact number of weights.  
         */
        setSkinWeightCount(count: SurfaceTool.SkinWeightCount): void
        
        /** By default, returns [constant SKIN_4_WEIGHTS] to indicate only 4 bone influences per vertex are used.  
         *  Returns [constant SKIN_8_WEIGHTS] if up to 8 influences are used.  
         *      
         *  **Note:** This function returns an enum, not the exact number of weights.  
         */
        getSkinWeightCount(): SurfaceTool.SkinWeightCount
        
        /** Sets the color format for this custom [param channel_index]. Use [constant CUSTOM_MAX] to disable.  
         *  Must be invoked after [method begin] and should be set before [method commit] or [method commit_to_arrays].  
         */
        setCustomFormat(channelIndex: int64, format: SurfaceTool.CustomFormat): void
        
        /** Returns the format for custom [param channel_index] (currently up to 4). Returns [constant CUSTOM_MAX] if this custom channel is unused. */
        getCustomFormat(channelIndex: int64): SurfaceTool.CustomFormat
        
        /** Called before adding any vertices. Takes the primitive type as an argument (e.g. [constant Mesh.PRIMITIVE_TRIANGLES]). */
        begin(primitive: Mesh.PrimitiveType): void
        
        /** Specifies the position of current vertex. Should be called after specifying other vertex properties (e.g. Color, UV). */
        addVertex(vertex: Vector3): void
        
        /** Specifies a [Color] to use for the  *next*  vertex. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all.  
         *      
         *  **Note:** The material must have [member BaseMaterial3D.vertex_color_use_as_albedo] enabled for the vertex color to be visible.  
         */
        setColor(color: Color): void
        
        /** Specifies a normal to use for the  *next*  vertex. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all. */
        setNormal(normal: Vector3): void
        
        /** Specifies a tangent to use for the  *next*  vertex. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all.  
         *      
         *  **Note:** Even though [param tangent] is a [Plane], it does not directly represent the tangent plane. Its [member Plane.x], [member Plane.y], and [member Plane.z] represent the tangent vector and [member Plane.d] should be either `-1` or `1`. See also [constant Mesh.ARRAY_TANGENT].  
         */
        setTangent(tangent: Plane): void
        
        /** Specifies a set of UV coordinates to use for the  *next*  vertex. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all. */
        setUV(uv: Vector2): void
        
        /** Specifies an optional second set of UV coordinates to use for the  *next*  vertex. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all. */
        setUV2(uv2: Vector2): void
        
        /** Specifies an array of bones to use for the  *next*  vertex. [param bones] must contain 4 integers. */
        setBones(bones: PackedInt32Array | int32[]): void
        
        /** Specifies weight values to use for the  *next*  vertex. [param weights] must contain 4 values. If every vertex needs to have this information set and you fail to submit it for the first vertex, this information may not be used at all. */
        setWeights(weights: PackedFloat32Array | float32[]): void
        
        /** Sets the custom value on this vertex for [param channel_index].  
         *  [method set_custom_format] must be called first for this [param channel_index]. Formats which are not RGBA will ignore other color channels.  
         */
        setCustom(channelIndex: int64, customColor: Color): void
        
        /** Specifies the smooth group to use for the  *next*  vertex. If this is never called, all vertices will have the default smooth group of `0` and will be smoothed with adjacent vertices of the same group. To produce a mesh with flat normals, set the smooth group to `-1`.  
         *      
         *  **Note:** This function actually takes a `uint32_t`, so C# users should use `uint32.MaxValue` instead of `-1` to produce a mesh with flat normals.  
         */
        setSmoothGroup(index: int64): void
        
        /** Inserts a triangle fan made of array data into [Mesh] being constructed.  
         *  Requires the primitive type be set to [constant Mesh.PRIMITIVE_TRIANGLES].  
         */
        addTriangleFan(vertices: PackedVector3Array | Vector3[], uvs?: PackedVector2Array | Vector2[] /* = [] */, colors?: PackedColorArray | Color[] /* = [] */, uv2s?: PackedVector2Array | Vector2[] /* = [] */, normals?: PackedVector3Array | Vector3[] /* = [] */, tangents?: GArray<Plane>): void
        
        /** Adds a vertex to index array if you are using indexed vertices. Does not need to be called before adding vertices. */
        addIndex(index: int64): void
        
        /** Shrinks the vertex array by creating an index array. This can improve performance by avoiding vertex reuse. */
        index(): void
        
        /** Removes the index array by expanding the vertex array. */
        deindex(): void
        
        /** Generates normals from vertices so you do not have to do it manually. If [param flip] is `true`, the resulting normals will be inverted. [method generate_normals] should be called  *after*  generating geometry and  *before*  committing the mesh using [method commit] or [method commit_to_arrays]. For correct display of normal-mapped surfaces, you will also have to generate tangents using [method generate_tangents].  
         *      
         *  **Note:** [method generate_normals] only works if the primitive type is set to [constant Mesh.PRIMITIVE_TRIANGLES].  
         *      
         *  **Note:** [method generate_normals] takes smooth groups into account. To generate smooth normals, set the smooth group to a value greater than or equal to `0` using [method set_smooth_group] or leave the smooth group at the default of `0`. To generate flat normals, set the smooth group to `-1` using [method set_smooth_group] prior to adding vertices.  
         */
        generateNormals(flip?: boolean /* = false */): void
        
        /** Generates a tangent vector for each vertex. Requires that each vertex already has UVs and normals set (see [method generate_normals]). */
        generateTangents(): void
        
        /** Optimizes triangle sorting for performance. Requires that [method get_primitive_type] is [constant Mesh.PRIMITIVE_TRIANGLES]. */
        optimizeIndicesForCache(): void
        
        /** Returns the axis-aligned bounding box of the vertex positions. */
        getAabb(): Aabb
        
        /** Generates an LOD for a given [param nd_threshold] in linear units (square root of quadric error metric), using at most [param target_index_count] indices. */
        generateLod(ndThreshold: float64, targetIndexCount?: int64 /* = 3 */): PackedInt32Array
        
        /** Sets [Material] to be used by the [Mesh] you are constructing. */
        setMaterial(material: Material): void
        
        /** Returns the type of mesh geometry, such as [constant Mesh.PRIMITIVE_TRIANGLES]. */
        getPrimitiveType(): Mesh.PrimitiveType
        
        /** Clear all information passed into the surface tool so far. */
        clear(): void
        
        /** Creates a vertex array from an existing [Mesh]. */
        createFrom(existing: Mesh, surface: int64): void
        
        /** Creates this SurfaceTool from existing vertex arrays such as returned by [method commit_to_arrays], [method Mesh.surface_get_arrays], [method Mesh.surface_get_blend_shape_arrays], [method ImporterMesh.get_surface_arrays], and [method ImporterMesh.get_surface_blend_shape_arrays]. [param primitive_type] controls the type of mesh data, defaulting to [constant Mesh.PRIMITIVE_TRIANGLES]. */
        createFromArrays(arrays: GArray, primitiveType?: Mesh.PrimitiveType /* = 3 */): void
        
        /** Creates a vertex array from the specified blend shape of an existing [Mesh]. This can be used to extract a specific pose from a blend shape. */
        createFromBlendShape(existing: Mesh, surface: int64, blendShape: string): void
        
        /** Append vertices from a given [Mesh] surface onto the current vertex array with specified [Transform3D]. */
        appendFrom(existing: Mesh, surface: int64, transform: Transform3D): void
        
        /** Returns a constructed [ArrayMesh] from current information passed in. If an existing [ArrayMesh] is passed in as an argument, will add an extra surface to the existing [ArrayMesh].  
         *  The [param flags] argument can be the bitwise OR of [constant Mesh.ARRAY_FLAG_USE_DYNAMIC_UPDATE], [constant Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS], or [constant Mesh.ARRAY_FLAG_USES_EMPTY_VERTEX_ARRAY].  
         */
        commit(existing?: ArrayMesh, flags?: int64 /* = 0 */): null | ArrayMesh
        
        /** Commits the data to the same format used by [method ArrayMesh.add_surface_from_arrays], [method ImporterMesh.add_surface], and [method create_from_arrays]. This way you can further process the mesh data using the [ArrayMesh] or [ImporterMesh] APIs. */
        commitToArrays(): GArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSurfaceTool;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSurfaceTool;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSyntaxHighlighter extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSyntaxHighlighter extends __NameMapResource {
        _get_line_syntax_highlighting: "_getLineSyntaxHighlighting";
        _clear_highlighting_cache: "_clearHighlightingCache";
        _update_cache: "_updateCache";
        get_line_syntax_highlighting: "getLineSyntaxHighlighting";
        update_cache: "updateCache";
        clear_highlighting_cache: "clearHighlightingCache";
        get_text_edit: "getTextEdit";
    }
    /** Base class for syntax highlighters. Provides syntax highlighting data to a [TextEdit].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_syntaxhighlighter.html  
     */
    class SyntaxHighlighter extends Resource {
        constructor(identifier?: any)
        /** Virtual method which can be overridden to return syntax highlighting data.  
         *  See [method get_line_syntax_highlighting] for more details.  
         */
        /* gdvirtual */ _getLineSyntaxHighlighting(line: int64): GDictionary
        
        /** Virtual method which can be overridden to clear any local caches. */
        /* gdvirtual */ _clearHighlightingCache(): void
        
        /** Virtual method which can be overridden to update any local caches. */
        /* gdvirtual */ _updateCache(): void
        
        /** Returns the syntax highlighting data for the line at index [param line]. If the line is not cached, calls [method _get_line_syntax_highlighting] first to calculate the data.  
         *  Each entry is a column number containing a nested [Dictionary]. The column number denotes the start of a region, the region will end if another region is found, or at the end of the line. The nested [Dictionary] contains the data for that region. Currently only the key `"color"` is supported.  
         *  **Example:** Possible return value. This means columns `0` to `4` should be red, and columns `5` to the end of the line should be green:  
         *    
         *  **Example:** Sample implementation. Colors the word `Godot` blue.  
         *    
         */
        getLineSyntaxHighlighting(line: int64): GDictionary
        
        /** Clears then updates the [SyntaxHighlighter] caches. Override [method _update_cache] for a callback.  
         *      
         *  **Note:** This is called automatically when the associated [TextEdit] node, updates its own cache.  
         */
        updateCache(): void
        
        /** Clears all cached syntax highlighting data.  
         *  Then calls overridable method [method _clear_highlighting_cache].  
         */
        clearHighlightingCache(): void
        
        /** Returns the associated [TextEdit] node. */
        getTextEdit(): null | TextEdit
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSyntaxHighlighter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSyntaxHighlighter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSystemFont extends __RPCMapFont {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSystemFont extends __NameMapFont {
        font_names: "fontNames";
        font_italic: "fontItalic";
        font_weight: "fontWeight";
        font_stretch: "fontStretch";
        generate_mipmaps: "generateMipmaps";
        disable_embedded_bitmaps: "disableEmbeddedBitmaps";
        allow_system_fallback: "allowSystemFallback";
        force_autohinter: "forceAutohinter";
        modulate_color_glyphs: "modulateColorGlyphs";
        subpixel_positioning: "subpixelPositioning";
        keep_rounding_remainders: "keepRoundingRemainders";
        multichannel_signed_distance_field: "multichannelSignedDistanceField";
        msdf_pixel_range: "msdfPixelRange";
        msdf_size: "msdfSize";
    }
    /** A font loaded from a system font. Falls back to a default theme font if not implemented on the host OS.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_systemfont.html  
     */
    class SystemFont extends Font {
        constructor(identifier?: any)
        /** Array of font family names to search, first matching font found is used. */
        get fontNames(): PackedStringArray
        set fontNames(value: PackedStringArray | string[])
        
        /** If set to `true`, italic or oblique font is preferred. */
        get fontItalic(): boolean
        set fontItalic(value: boolean)
        
        /** Preferred weight (boldness) of the font. A value in the `100...999` range, normal font weight is `400`, bold font weight is `700`. */
        get fontWeight(): int64
        set fontWeight(value: int64)
        
        /** Preferred font stretch amount, compared to a normal width. A percentage value between `50%` and `200%`. */
        get fontStretch(): int64
        set fontStretch(value: int64)
        
        /** Font anti-aliasing mode. */
        get antialiasing(): int64
        set antialiasing(value: int64)
        
        /** If set to `true`, generate mipmaps for the font textures. */
        get generateMipmaps(): boolean
        set generateMipmaps(value: boolean)
        
        /** If set to `true`, embedded font bitmap loading is disabled (bitmap-only and color fonts ignore this property). */
        get disableEmbeddedBitmaps(): boolean
        set disableEmbeddedBitmaps(value: boolean)
        
        /** If set to `true`, system fonts can be automatically used as fallbacks. */
        get allowSystemFallback(): boolean
        set allowSystemFallback(value: boolean)
        
        /** If set to `true`, auto-hinting is supported and preferred over font built-in hinting. */
        get forceAutohinter(): boolean
        set forceAutohinter(value: boolean)
        
        /** If set to `true`, color modulation is applied when drawing colored glyphs, otherwise it's applied to the monochrome glyphs only. */
        get modulateColorGlyphs(): boolean
        set modulateColorGlyphs(value: boolean)
        
        /** Font hinting mode. */
        get hinting(): int64
        set hinting(value: int64)
        
        /** Font glyph subpixel positioning mode. Subpixel positioning provides shaper text and better kerning for smaller font sizes, at the cost of memory usage and font rasterization speed. Use [constant TextServer.SUBPIXEL_POSITIONING_AUTO] to automatically enable it based on the font size. */
        get subpixelPositioning(): int64
        set subpixelPositioning(value: int64)
        
        /** If set to `true`, when aligning glyphs to the pixel boundaries rounding remainders are accumulated to ensure more uniform glyph distribution. This setting has no effect if subpixel positioning is enabled. */
        get keepRoundingRemainders(): boolean
        set keepRoundingRemainders(value: boolean)
        
        /** If set to `true`, glyphs of all sizes are rendered using single multichannel signed distance field generated from the dynamic font vector data. */
        get multichannelSignedDistanceField(): boolean
        set multichannelSignedDistanceField(value: boolean)
        
        /** The width of the range around the shape between the minimum and maximum representable signed distance. If using font outlines, [member msdf_pixel_range] must be set to at least  *twice*  the size of the largest font outline. The default [member msdf_pixel_range] value of `16` allows outline sizes up to `8` to look correct. */
        get msdfPixelRange(): int64
        set msdfPixelRange(value: int64)
        
        /** Source font size used to generate MSDF textures. Higher values allow for more precision, but are slower to render and require more memory. Only increase this value if you notice a visible lack of precision in glyph rendering. */
        get msdfSize(): int64
        set msdfSize(value: int64)
        
        /** If set to a positive value, overrides the oversampling factor of the viewport this font is used in. See [member Viewport.oversampling]. This value doesn't override the [code skip-lint]oversampling` parameter of [code skip-lint]draw_*` methods. */
        get oversampling(): float64
        set oversampling(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSystemFont;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSystemFont;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTcpServer extends __RPCMapSocketServer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTcpServer extends __NameMapSocketServer {
        get_local_port: "getLocalPort";
        take_connection: "takeConnection";
    }
    class TcpServer extends SocketServer {
        constructor(identifier?: any)
        listen(port: int64, bindAddress?: string /* = '*' */): GError
        getLocalPort(): int64
        takeConnection(): null | StreamPeerTcp
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTcpServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTcpServer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTlsOptions extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTlsOptions extends __NameMapRefCounted {
        client_unsafe: "clientUnsafe";
        is_server: "isServer";
        is_unsafe_client: "isUnsafeClient";
        get_common_name_override: "getCommonNameOverride";
        get_trusted_ca_chain: "getTrustedCaChain";
        get_private_key: "getPrivateKey";
        get_own_certificate: "getOwnCertificate";
    }
    class TlsOptions extends RefCounted {
        constructor(identifier?: any)
        static client(trustedChain?: X509Certificate, commonNameOverride?: string /* = '' */): null | TlsOptions
        static clientUnsafe(trustedChain?: X509Certificate): null | TlsOptions
        static server(key: CryptoKey, certificate: X509Certificate): null | TlsOptions
        isServer(): boolean
        isUnsafeClient(): boolean
        getCommonNameOverride(): string
        getTrustedCaChain(): null | X509Certificate
        getPrivateKey(): null | CryptoKey
        getOwnCertificate(): null | X509Certificate
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTlsOptions;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTlsOptions;
    }
    namespace TabBar {
        enum AlignmentMode {
            AlignmentLeft = 0,
            AlignmentCenter = 1,
            AlignmentRight = 2,
            AlignmentMax = 3,
        }
        enum SizingMode {
            TabSizingFitContent = 0,
            TabSizingUniform = 1,
            TabSizingJustify = 2,
            TabSizingExpand = 3,
            TabSizingMax = 4,
        }
        enum CloseButtonDisplayPolicy {
            CloseButtonShowNever = 0,
            CloseButtonShowActiveOnly = 1,
            CloseButtonShowAlways = 2,
            CloseButtonMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTabBar extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTabBar extends __NameMapControl {
        get_previous_tab: "getPreviousTab";
        select_previous_available: "selectPreviousAvailable";
        select_next_available: "selectNextAvailable";
        set_tab_title: "setTabTitle";
        get_tab_title: "getTabTitle";
        set_tab_tooltip: "setTabTooltip";
        get_tab_tooltip: "getTabTooltip";
        set_tab_text_direction: "setTabTextDirection";
        get_tab_text_direction: "getTabTextDirection";
        set_tab_language: "setTabLanguage";
        get_tab_language: "getTabLanguage";
        set_tab_icon: "setTabIcon";
        get_tab_icon: "getTabIcon";
        set_tab_icon_max_width: "setTabIconMaxWidth";
        get_tab_icon_max_width: "getTabIconMaxWidth";
        set_tab_button_icon: "setTabButtonIcon";
        get_tab_button_icon: "getTabButtonIcon";
        set_tab_disabled: "setTabDisabled";
        is_tab_disabled: "isTabDisabled";
        set_tab_hidden: "setTabHidden";
        is_tab_hidden: "isTabHidden";
        set_tab_metadata: "setTabMetadata";
        get_tab_metadata: "getTabMetadata";
        remove_tab: "removeTab";
        add_tab: "addTab";
        get_tab_idx_at_point: "getTabIdxAtPoint";
        get_tab_offset: "getTabOffset";
        get_offset_buttons_visible: "getOffsetButtonsVisible";
        ensure_tab_visible: "ensureTabVisible";
        get_tab_rect: "getTabRect";
        move_tab: "moveTab";
        clear_tabs: "clearTabs";
        current_tab: "currentTab";
        tab_alignment: "tabAlignment";
        tab_sizing: "tabSizing";
        clip_tabs: "clipTabs";
        close_with_middle_mouse: "closeWithMiddleMouse";
        tab_close_display_policy: "tabCloseDisplayPolicy";
        max_tab_width: "maxTabWidth";
        scrolling_enabled: "scrollingEnabled";
        drag_to_rearrange_enabled: "dragToRearrangeEnabled";
        switch_on_drag_hover: "switchOnDragHover";
        tabs_rearrange_group: "tabsRearrangeGroup";
        scroll_to_selected: "scrollToSelected";
        select_with_rmb: "selectWithRmb";
        deselect_enabled: "deselectEnabled";
        tab_count: "tabCount";
        tab_selected: "tabSelected";
        tab_changed: "tabChanged";
        tab_clicked: "tabClicked";
        tab_rmb_clicked: "tabRmbClicked";
        tab_close_pressed: "tabClosePressed";
        tab_button_pressed: "tabButtonPressed";
        tab_hovered: "tabHovered";
        active_tab_rearranged: "activeTabRearranged";
    }
    /** A control that provides a horizontal bar with tabs.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_tabbar.html  
     */
    class TabBar<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Returns the previously active tab index. */
        getPreviousTab(): int64
        
        /** Selects the first available tab with lower index than the currently selected. Returns `true` if tab selection changed. */
        selectPreviousAvailable(): boolean
        
        /** Selects the first available tab with greater index than the currently selected. Returns `true` if tab selection changed. */
        selectNextAvailable(): boolean
        
        /** Sets a [param title] for the tab at index [param tab_idx]. */
        setTabTitle(tabIdx: int64, title: string): void
        
        /** Returns the title of the tab at index [param tab_idx]. */
        getTabTitle(tabIdx: int64): string
        
        /** Sets a [param tooltip] for tab at index [param tab_idx].  
         *      
         *  **Note:** By default, if the [param tooltip] is empty and the tab text is truncated (not all characters fit into the tab), the title will be displayed as a tooltip. To hide the tooltip, assign `" "` as the [param tooltip] text.  
         */
        setTabTooltip(tabIdx: int64, tooltip: string): void
        
        /** Returns the tooltip text of the tab at index [param tab_idx]. */
        getTabTooltip(tabIdx: int64): string
        
        /** Sets tab title base writing direction. */
        setTabTextDirection(tabIdx: int64, direction: Control.TextDirection): void
        
        /** Returns tab title text base writing direction. */
        getTabTextDirection(tabIdx: int64): Control.TextDirection
        
        /** Sets the language code of the title for the tab at index [param tab_idx] to [param language]. This is used for line-breaking and text shaping algorithms. If [param language] is empty, the current locale is used. */
        setTabLanguage(tabIdx: int64, language: string): void
        
        /** Returns tab title language code. */
        getTabLanguage(tabIdx: int64): string
        
        /** Sets an [param icon] for the tab at index [param tab_idx]. */
        setTabIcon(tabIdx: int64, icon: Texture2D): void
        
        /** Returns the icon for the tab at index [param tab_idx] or `null` if the tab has no icon. */
        getTabIcon(tabIdx: int64): null | Texture2D
        
        /** Sets the maximum allowed width of the icon for the tab at index [param tab_idx]. This limit is applied on top of the default size of the icon and on top of [theme_item icon_max_width]. The height is adjusted according to the icon's ratio. */
        setTabIconMaxWidth(tabIdx: int64, width: int64): void
        
        /** Returns the maximum allowed width of the icon for the tab at index [param tab_idx]. */
        getTabIconMaxWidth(tabIdx: int64): int64
        
        /** Sets an [param icon] for the button of the tab at index [param tab_idx] (located to the right, before the close button), making it visible and clickable (See [signal tab_button_pressed]). Giving it a `null` value will hide the button. */
        setTabButtonIcon(tabIdx: int64, icon: Texture2D): void
        
        /** Returns the icon for the right button of the tab at index [param tab_idx] or `null` if the right button has no icon. */
        getTabButtonIcon(tabIdx: int64): null | Texture2D
        
        /** If [param disabled] is `true`, disables the tab at index [param tab_idx], making it non-interactable. */
        setTabDisabled(tabIdx: int64, disabled: boolean): void
        
        /** Returns `true` if the tab at index [param tab_idx] is disabled. */
        isTabDisabled(tabIdx: int64): boolean
        
        /** If [param hidden] is `true`, hides the tab at index [param tab_idx], making it disappear from the tab area. */
        setTabHidden(tabIdx: int64, hidden: boolean): void
        
        /** Returns `true` if the tab at index [param tab_idx] is hidden. */
        isTabHidden(tabIdx: int64): boolean
        
        /** Sets the metadata value for the tab at index [param tab_idx], which can be retrieved later using [method get_tab_metadata]. */
        setTabMetadata(tabIdx: int64, metadata: any): void
        
        /** Returns the metadata value set to the tab at index [param tab_idx] using [method set_tab_metadata]. If no metadata was previously set, returns `null` by default. */
        getTabMetadata(tabIdx: int64): any
        
        /** Removes the tab at index [param tab_idx]. */
        removeTab(tabIdx: int64): void
        
        /** Adds a new tab. */
        addTab(title?: string /* = '' */, icon?: Texture2D): void
        
        /** Returns the index of the tab at local coordinates [param point]. Returns `-1` if the point is outside the control boundaries or if there's no tab at the queried position. */
        getTabIdxAtPoint(point: Vector2): int64
        
        /** Returns the number of hidden tabs offsetted to the left. */
        getTabOffset(): int64
        
        /** Returns `true` if the offset buttons (the ones that appear when there's not enough space for all tabs) are visible. */
        getOffsetButtonsVisible(): boolean
        
        /** Moves the scroll view to make the tab visible. */
        ensureTabVisible(idx: int64): void
        
        /** Returns tab [Rect2] with local position and size. */
        getTabRect(tabIdx: int64): Rect2
        
        /** Moves a tab from [param from] to [param to]. */
        moveTab(from: int64, to: int64): void
        
        /** Clears all tabs. */
        clearTabs(): void
        
        /** The index of the current selected tab. A value of `-1` means that no tab is selected and can only be set when [member deselect_enabled] is `true` or if all tabs are hidden or disabled. */
        get currentTab(): int64
        set currentTab(value: int64)
        
        /** The horizontal alignment of the tabs. */
        get tabAlignment(): int64
        set tabAlignment(value: int64)
        
        /** The sizing strategy used to determine tab widths. */
        get tabSizing(): int64
        set tabSizing(value: int64)
        
        /** If `true`, tabs overflowing this node's width will be hidden, displaying two navigation buttons instead. Otherwise, this node's minimum size is updated so that all tabs are visible. */
        get clipTabs(): boolean
        set clipTabs(value: boolean)
        
        /** If `true`, middle-clicking on a tab will emit the [signal tab_close_pressed] signal. */
        get closeWithMiddleMouse(): boolean
        set closeWithMiddleMouse(value: boolean)
        
        /** When the close button will appear on the tabs. */
        get tabCloseDisplayPolicy(): int64
        set tabCloseDisplayPolicy(value: int64)
        
        /** Sets the maximum width which all tabs should be limited to. Unlimited if set to `0`. */
        get maxTabWidth(): int64
        set maxTabWidth(value: int64)
        
        /** if `true`, the mouse's scroll wheel can be used to navigate the scroll view. */
        get scrollingEnabled(): boolean
        set scrollingEnabled(value: boolean)
        
        /** If `true`, tabs can be rearranged with mouse drag. */
        get dragToRearrangeEnabled(): boolean
        set dragToRearrangeEnabled(value: boolean)
        
        /** If `true`, hovering over a tab while dragging something will switch to that tab. Does not have effect when hovering another tab to rearrange. The delay for when this happens is dictated by [theme_item hover_switch_wait_msec]. */
        get switchOnDragHover(): boolean
        set switchOnDragHover(value: boolean)
        
        /** [TabBar]s with the same rearrange group ID will allow dragging the tabs between them. Enable drag with [member drag_to_rearrange_enabled].  
         *  Setting this to `-1` will disable rearranging between [TabBar]s.  
         */
        get tabsRearrangeGroup(): int64
        set tabsRearrangeGroup(value: int64)
        
        /** If `true`, the tab offset will be changed to keep the currently selected tab visible. */
        get scrollToSelected(): boolean
        set scrollToSelected(value: boolean)
        
        /** If `true`, enables selecting a tab with the right mouse button. */
        get selectWithRmb(): boolean
        set selectWithRmb(value: boolean)
        
        /** If `true`, all tabs can be deselected so that no tab is selected. Click on the current tab to deselect it. */
        get deselectEnabled(): boolean
        set deselectEnabled(value: boolean)
        
        /** The number of tabs currently in the bar. */
        get tabCount(): int64
        set tabCount(value: int64)
        
        /** Emitted when a tab is selected via click, directional input, or script, even if it is the current tab. */
        readonly tabSelected: Signal<(tab: int64) => void>
        
        /** Emitted when switching to another tab. */
        readonly tabChanged: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is clicked, even if it is the current tab. */
        readonly tabClicked: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is right-clicked. */
        readonly tabRmbClicked: Signal<(tab: int64) => void>
        
        /** Emitted when a tab's close button is pressed or, if [member close_with_middle_mouse] is `true`, when middle-clicking on a tab.  
         *      
         *  **Note:** Tabs are not removed automatically; this behavior needs to be coded manually. For example:  
         *    
         */
        readonly tabClosePressed: Signal<(tab: int64) => void>
        
        /** Emitted when a tab's right button is pressed. See [method set_tab_button_icon]. */
        readonly tabButtonPressed: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is hovered by the mouse. */
        readonly tabHovered: Signal<(tab: int64) => void>
        
        /** Emitted when the active tab is rearranged via mouse drag. See [member drag_to_rearrange_enabled]. */
        readonly activeTabRearranged: Signal<(idxTo: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTabBar;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTabBar;
    }
    namespace TabContainer {
        enum TabPosition {
            PositionTop = 0,
            PositionBottom = 1,
            PositionMax = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTabContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTabContainer extends __NameMapContainer {
        get_tab_count: "getTabCount";
        get_previous_tab: "getPreviousTab";
        select_previous_available: "selectPreviousAvailable";
        select_next_available: "selectNextAvailable";
        get_current_tab_control: "getCurrentTabControl";
        get_tab_bar: "getTabBar";
        get_tab_control: "getTabControl";
        set_tab_title: "setTabTitle";
        get_tab_title: "getTabTitle";
        set_tab_tooltip: "setTabTooltip";
        get_tab_tooltip: "getTabTooltip";
        set_tab_icon: "setTabIcon";
        get_tab_icon: "getTabIcon";
        set_tab_icon_max_width: "setTabIconMaxWidth";
        get_tab_icon_max_width: "getTabIconMaxWidth";
        set_tab_disabled: "setTabDisabled";
        is_tab_disabled: "isTabDisabled";
        set_tab_hidden: "setTabHidden";
        is_tab_hidden: "isTabHidden";
        set_tab_metadata: "setTabMetadata";
        get_tab_metadata: "getTabMetadata";
        set_tab_button_icon: "setTabButtonIcon";
        get_tab_button_icon: "getTabButtonIcon";
        get_tab_idx_at_point: "getTabIdxAtPoint";
        get_tab_idx_from_control: "getTabIdxFromControl";
        set_popup: "setPopup";
        get_popup: "getPopup";
        tab_alignment: "tabAlignment";
        tab_sizing: "tabSizing";
        current_tab: "currentTab";
        tabs_position: "tabsPosition";
        clip_tabs: "clipTabs";
        tabs_visible: "tabsVisible";
        all_tabs_in_front: "allTabsInFront";
        switch_on_drag_hover: "switchOnDragHover";
        drag_to_rearrange_enabled: "dragToRearrangeEnabled";
        tabs_rearrange_group: "tabsRearrangeGroup";
        use_hidden_tabs_for_min_size: "useHiddenTabsForMinSize";
        tab_focus_mode: "tabFocusMode";
        deselect_enabled: "deselectEnabled";
        active_tab_rearranged: "activeTabRearranged";
        tab_changed: "tabChanged";
        tab_clicked: "tabClicked";
        tab_hovered: "tabHovered";
        tab_selected: "tabSelected";
        tab_button_pressed: "tabButtonPressed";
        pre_popup_pressed: "prePopupPressed";
    }
    /** A container that creates a tab for each child control, displaying only the active tab's control.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_tabcontainer.html  
     */
    class TabContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** Returns the number of tabs. */
        getTabCount(): int64
        
        /** Returns the previously active tab index. */
        getPreviousTab(): int64
        
        /** Selects the first available tab with lower index than the currently selected. Returns `true` if tab selection changed. */
        selectPreviousAvailable(): boolean
        
        /** Selects the first available tab with greater index than the currently selected. Returns `true` if tab selection changed. */
        selectNextAvailable(): boolean
        
        /** Returns the child [Control] node located at the active tab index. */
        getCurrentTabControl(): null | Control
        
        /** Returns the [TabBar] contained in this container.  
         *  **Warning:** This is a required internal node, removing and freeing it or editing its tabs may cause a crash. If you wish to edit the tabs, use the methods provided in [TabContainer].  
         */
        getTabBar(): null | TabBar
        
        /** Returns the [Control] node from the tab at index [param tab_idx]. */
        getTabControl(tabIdx: int64): null | Control
        
        /** Sets a custom title for the tab at index [param tab_idx] (tab titles default to the name of the indexed child node). Set it back to the child's name to make the tab default to it again. */
        setTabTitle(tabIdx: int64, title: string): void
        
        /** Returns the title of the tab at index [param tab_idx]. Tab titles default to the name of the indexed child node, but this can be overridden with [method set_tab_title]. */
        getTabTitle(tabIdx: int64): string
        
        /** Sets a custom tooltip text for tab at index [param tab_idx].  
         *      
         *  **Note:** By default, if the [param tooltip] is empty and the tab text is truncated (not all characters fit into the tab), the title will be displayed as a tooltip. To hide the tooltip, assign `" "` as the [param tooltip] text.  
         */
        setTabTooltip(tabIdx: int64, tooltip: string): void
        
        /** Returns the tooltip text of the tab at index [param tab_idx]. */
        getTabTooltip(tabIdx: int64): string
        
        /** Sets an icon for the tab at index [param tab_idx]. */
        setTabIcon(tabIdx: int64, icon: Texture2D): void
        
        /** Returns the [Texture2D] for the tab at index [param tab_idx] or `null` if the tab has no [Texture2D]. */
        getTabIcon(tabIdx: int64): null | Texture2D
        
        /** Sets the maximum allowed width of the icon for the tab at index [param tab_idx]. This limit is applied on top of the default size of the icon and on top of [theme_item icon_max_width]. The height is adjusted according to the icon's ratio. */
        setTabIconMaxWidth(tabIdx: int64, width: int64): void
        
        /** Returns the maximum allowed width of the icon for the tab at index [param tab_idx]. */
        getTabIconMaxWidth(tabIdx: int64): int64
        
        /** If [param disabled] is `true`, disables the tab at index [param tab_idx], making it non-interactable. */
        setTabDisabled(tabIdx: int64, disabled: boolean): void
        
        /** Returns `true` if the tab at index [param tab_idx] is disabled. */
        isTabDisabled(tabIdx: int64): boolean
        
        /** If [param hidden] is `true`, hides the tab at index [param tab_idx], making it disappear from the tab area. */
        setTabHidden(tabIdx: int64, hidden: boolean): void
        
        /** Returns `true` if the tab at index [param tab_idx] is hidden. */
        isTabHidden(tabIdx: int64): boolean
        
        /** Sets the metadata value for the tab at index [param tab_idx], which can be retrieved later using [method get_tab_metadata]. */
        setTabMetadata(tabIdx: int64, metadata: any): void
        
        /** Returns the metadata value set to the tab at index [param tab_idx] using [method set_tab_metadata]. If no metadata was previously set, returns `null` by default. */
        getTabMetadata(tabIdx: int64): any
        
        /** Sets the button icon from the tab at index [param tab_idx]. */
        setTabButtonIcon(tabIdx: int64, icon: Texture2D): void
        
        /** Returns the button icon from the tab at index [param tab_idx]. */
        getTabButtonIcon(tabIdx: int64): null | Texture2D
        
        /** Returns the index of the tab at local coordinates [param point]. Returns `-1` if the point is outside the control boundaries or if there's no tab at the queried position. */
        getTabIdxAtPoint(point: Vector2): int64
        
        /** Returns the index of the tab tied to the given [param control]. The control must be a child of the [TabContainer]. */
        getTabIdxFromControl(control: Control): int64
        
        /** If set on a [Popup] node instance, a popup menu icon appears in the top-right corner of the [TabContainer] (setting it to `null` will make it go away). Clicking it will expand the [Popup] node. */
        setPopup(popup: Node): void
        
        /** Returns the [Popup] node instance if one has been set already with [method set_popup].  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getPopup(): null | Popup
        
        /** The position at which tabs will be placed. */
        get tabAlignment(): int64
        set tabAlignment(value: int64)
        
        /** The sizing strategy used to determine tab widths. */
        get tabSizing(): int64
        set tabSizing(value: int64)
        
        /** The current tab index. When set, this index's [Control] node's `visible` property is set to `true` and all others are set to `false`.  
         *  A value of `-1` means that no tab is selected.  
         */
        get currentTab(): int64
        set currentTab(value: int64)
        
        /** The horizontal alignment of the tabs. */
        get tabsPosition(): int64
        set tabsPosition(value: int64)
        
        /** If `true`, tabs overflowing this node's width will be hidden, displaying two navigation buttons instead. Otherwise, this node's minimum size is updated so that all tabs are visible. */
        get clipTabs(): boolean
        set clipTabs(value: boolean)
        
        /** If `true`, tabs are visible. If `false`, tabs' content and titles are hidden. */
        get tabsVisible(): boolean
        set tabsVisible(value: boolean)
        
        /** This doesn't do anything. */
        get allTabsInFront(): boolean
        set allTabsInFront(value: boolean)
        
        /** If `true`, hovering over a tab while dragging something will switch to that tab. Does not have effect when hovering another tab to rearrange. */
        get switchOnDragHover(): boolean
        set switchOnDragHover(value: boolean)
        
        /** If `true`, tabs can be rearranged with mouse drag. */
        get dragToRearrangeEnabled(): boolean
        set dragToRearrangeEnabled(value: boolean)
        
        /** [TabContainer]s with the same rearrange group ID will allow dragging the tabs between them. Enable drag with [member drag_to_rearrange_enabled].  
         *  Setting this to `-1` will disable rearranging between [TabContainer]s.  
         */
        get tabsRearrangeGroup(): int64
        set tabsRearrangeGroup(value: int64)
        
        /** If `true`, child [Control] nodes that are hidden have their minimum size take into account in the total, instead of only the currently visible one. */
        get useHiddenTabsForMinSize(): boolean
        set useHiddenTabsForMinSize(value: boolean)
        
        /** The focus access mode for the internal [TabBar] node. */
        get tabFocusMode(): int64
        set tabFocusMode(value: int64)
        
        /** If `true`, all tabs can be deselected so that no tab is selected. Click on the [member current_tab] to deselect it.  
         *  Only the tab header will be shown if no tabs are selected.  
         */
        get deselectEnabled(): boolean
        set deselectEnabled(value: boolean)
        
        /** Emitted when the active tab is rearranged via mouse drag. See [member drag_to_rearrange_enabled]. */
        readonly activeTabRearranged: Signal<(idxTo: int64) => void>
        
        /** Emitted when switching to another tab. */
        readonly tabChanged: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is clicked, even if it is the current tab. */
        readonly tabClicked: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is hovered by the mouse. */
        readonly tabHovered: Signal<(tab: int64) => void>
        
        /** Emitted when a tab is selected via click, directional input, or script, even if it is the current tab. */
        readonly tabSelected: Signal<(tab: int64) => void>
        
        /** Emitted when the user clicks on the button icon on this tab. */
        readonly tabButtonPressed: Signal<(tab: int64) => void>
        
        /** Emitted when the [TabContainer]'s [Popup] button is clicked. See [method set_popup] for details. */
        readonly prePopupPressed: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTabContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTabContainer;
    }
    namespace TextEdit {
        enum MenuItems {
            MenuCut = 0,
            MenuCopy = 1,
            MenuPaste = 2,
            MenuClear = 3,
            MenuSelectAll = 4,
            MenuUndo = 5,
            MenuRedo = 6,
            MenuSubmenuTextDir = 7,
            MenuDirInherited = 8,
            MenuDirAuto = 9,
            MenuDirLtr = 10,
            MenuDirRtl = 11,
            MenuDisplayUcc = 12,
            MenuSubmenuInsertUcc = 13,
            MenuInsertLrm = 14,
            MenuInsertRlm = 15,
            MenuInsertLre = 16,
            MenuInsertRle = 17,
            MenuInsertLro = 18,
            MenuInsertRlo = 19,
            MenuInsertPdf = 20,
            MenuInsertAlm = 21,
            MenuInsertLri = 22,
            MenuInsertRli = 23,
            MenuInsertFsi = 24,
            MenuInsertPdi = 25,
            MenuInsertZwj = 26,
            MenuInsertZwnj = 27,
            MenuInsertWj = 28,
            MenuInsertShy = 29,
            MenuEmojiAndSymbol = 30,
            MenuMax = 31,
        }
        enum EditAction {
            ActionNone = 0,
            ActionTyping = 1,
            ActionBackspace = 2,
            ActionDelete = 3,
        }
        enum SearchFlags {
            SearchMatchCase = 1,
            SearchWholeWords = 2,
            SearchBackwards = 4,
        }
        enum CaretType {
            CaretTypeLine = 0,
            CaretTypeBlock = 1,
        }
        enum SelectionMode {
            SelectionModeNone = 0,
            SelectionModeShift = 1,
            SelectionModePointer = 2,
            SelectionModeWord = 3,
            SelectionModeLine = 4,
        }
        enum LineWrappingMode {
            LineWrappingNone = 0,
            LineWrappingBoundary = 1,
        }
        enum GutterType {
            GutterTypeString = 0,
            GutterTypeIcon = 1,
            GutterTypeCustom = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextEdit extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextEdit extends __NameMapControl {
        _handle_unicode_input: "_handleUnicodeInput";
        _paste_primary_clipboard: "_pastePrimaryClipboard";
        _set_text: "_setText";
        has_ime_text: "hasImeText";
        cancel_ime: "cancelIme";
        apply_ime: "applyIme";
        set_tab_size: "setTabSize";
        get_tab_size: "getTabSize";
        set_overtype_mode_enabled: "setOvertypeModeEnabled";
        is_overtype_mode_enabled: "isOvertypeModeEnabled";
        get_line_count: "getLineCount";
        set_line: "setLine";
        get_line: "getLine";
        get_line_with_ime: "getLineWithIme";
        get_line_width: "getLineWidth";
        get_line_height: "getLineHeight";
        get_indent_level: "getIndentLevel";
        get_first_non_whitespace_column: "getFirstNonWhiteSpaceColumn";
        swap_lines: "swapLines";
        insert_line_at: "insertLineAt";
        remove_line_at: "removeLineAt";
        insert_text_at_caret: "insertTextAtCaret";
        insert_text: "insertText";
        remove_text: "removeText";
        get_last_unhidden_line: "getLastUnhiddenLine";
        get_next_visible_line_offset_from: "getNextVisibleLineOffsetFrom";
        get_next_visible_line_index_offset_from: "getNextVisibleLineIndexOffsetFrom";
        paste_primary_clipboard: "pastePrimaryClipboard";
        start_action: "startAction";
        end_action: "endAction";
        begin_complex_operation: "beginComplexOperation";
        end_complex_operation: "endComplexOperation";
        has_undo: "hasUndo";
        has_redo: "hasRedo";
        clear_undo_history: "clearUndoHistory";
        tag_saved_version: "tagSavedVersion";
        get_version: "getVersion";
        get_saved_version: "getSavedVersion";
        set_search_text: "setSearchText";
        set_search_flags: "setSearchFlags";
        set_tooltip_request_func: "setTooltipRequestFunc";
        get_local_mouse_pos: "getLocalMousePos";
        get_word_at_pos: "getWordAtPos";
        get_line_column_at_pos: "getLineColumnAtPos";
        get_pos_at_line_column: "getPosAtLineColumn";
        get_rect_at_line_column: "getRectAtLineColumn";
        get_minimap_line_at_pos: "getMinimapLineAtPos";
        is_dragging_cursor: "isDraggingCursor";
        is_mouse_over_selection: "isMouseOverSelection";
        add_caret: "addCaret";
        remove_caret: "removeCaret";
        remove_secondary_carets: "removeSecondaryCarets";
        get_caret_count: "getCaretCount";
        add_caret_at_carets: "addCaretAtCarets";
        get_sorted_carets: "getSortedCarets";
        collapse_carets: "collapseCarets";
        merge_overlapping_carets: "mergeOverlappingCarets";
        begin_multicaret_edit: "beginMulticaretEdit";
        end_multicaret_edit: "endMulticaretEdit";
        is_in_mulitcaret_edit: "isInMulitcaretEdit";
        multicaret_edit_ignore_caret: "multicaretEditIgnoreCaret";
        is_caret_visible: "isCaretVisible";
        get_caret_draw_pos: "getCaretDrawPos";
        set_caret_line: "setCaretLine";
        get_caret_line: "getCaretLine";
        set_caret_column: "setCaretColumn";
        get_caret_column: "getCaretColumn";
        get_next_composite_character_column: "getNextCompositeCharacterColumn";
        get_previous_composite_character_column: "getPreviousCompositeCharacterColumn";
        get_caret_wrap_index: "getCaretWrapIndex";
        get_word_under_caret: "getWordUnderCaret";
        set_selection_mode: "setSelectionMode";
        get_selection_mode: "getSelectionMode";
        select_all: "selectAll";
        select_word_under_caret: "selectWordUnderCaret";
        add_selection_for_next_occurrence: "addSelectionForNextOccurrence";
        skip_selection_for_next_occurrence: "skipSelectionForNextOccurrence";
        has_selection: "hasSelection";
        get_selected_text: "getSelectedText";
        get_selection_at_line_column: "getSelectionAtLineColumn";
        get_line_ranges_from_carets: "getLineRangesFromCarets";
        get_selection_origin_line: "getSelectionOriginLine";
        get_selection_origin_column: "getSelectionOriginColumn";
        set_selection_origin_line: "setSelectionOriginLine";
        set_selection_origin_column: "setSelectionOriginColumn";
        get_selection_from_line: "getSelectionFromLine";
        get_selection_from_column: "getSelectionFromColumn";
        get_selection_to_line: "getSelectionToLine";
        get_selection_to_column: "getSelectionToColumn";
        is_caret_after_selection_origin: "isCaretAfterSelectionOrigin";
        delete_selection: "deleteSelection";
        is_line_wrapped: "isLineWrapped";
        get_line_wrap_count: "getLineWrapCount";
        get_line_wrap_index_at_column: "getLineWrapIndexAtColumn";
        get_line_wrapped_text: "getLineWrappedText";
        get_v_scroll_bar: "getVScrollBar";
        get_h_scroll_bar: "getHScrollBar";
        get_scroll_pos_for_line: "getScrollPosForLine";
        set_line_as_first_visible: "setLineAsFirstVisible";
        get_first_visible_line: "getFirstVisibleLine";
        is_line_in_viewport: "isLineInViewport";
        set_line_as_center_visible: "setLineAsCenterVisible";
        set_line_as_last_visible: "setLineAsLastVisible";
        get_last_full_visible_line: "getLastFullVisibleLine";
        get_last_full_visible_line_wrap_index: "getLastFullVisibleLineWrapIndex";
        get_visible_line_count: "getVisibleLineCount";
        get_visible_line_count_in_range: "getVisibleLineCountInRange";
        get_total_visible_line_count: "getTotalVisibleLineCount";
        adjust_viewport_to_caret: "adjustViewportToCaret";
        center_viewport_to_caret: "centerViewportToCaret";
        get_minimap_visible_lines: "getMinimapVisibleLines";
        add_gutter: "addGutter";
        remove_gutter: "removeGutter";
        get_gutter_count: "getGutterCount";
        set_gutter_name: "setGutterName";
        get_gutter_name: "getGutterName";
        set_gutter_type: "setGutterType";
        get_gutter_type: "getGutterType";
        set_gutter_width: "setGutterWidth";
        get_gutter_width: "getGutterWidth";
        set_gutter_draw: "setGutterDraw";
        is_gutter_drawn: "isGutterDrawn";
        set_gutter_clickable: "setGutterClickable";
        is_gutter_clickable: "isGutterClickable";
        set_gutter_overwritable: "setGutterOverwritable";
        is_gutter_overwritable: "isGutterOverwritable";
        merge_gutters: "mergeGutters";
        set_gutter_custom_draw: "setGutterCustomDraw";
        get_total_gutter_width: "getTotalGutterWidth";
        set_line_gutter_metadata: "setLineGutterMetadata";
        get_line_gutter_metadata: "getLineGutterMetadata";
        set_line_gutter_text: "setLineGutterText";
        get_line_gutter_text: "getLineGutterText";
        set_line_gutter_icon: "setLineGutterIcon";
        get_line_gutter_icon: "getLineGutterIcon";
        set_line_gutter_item_color: "setLineGutterItemColor";
        get_line_gutter_item_color: "getLineGutterItemColor";
        set_line_gutter_clickable: "setLineGutterClickable";
        is_line_gutter_clickable: "isLineGutterClickable";
        set_line_background_color: "setLineBackgroundColor";
        get_line_background_color: "getLineBackgroundColor";
        get_menu: "getMenu";
        is_menu_visible: "isMenuVisible";
        menu_option: "menuOption";
        adjust_carets_after_edit: "adjustCaretsAfterEdit";
        get_caret_index_edit_order: "getCaretIndexEditOrder";
        get_selection_line: "getSelectionLine";
        get_selection_column: "getSelectionColumn";
        placeholder_text: "placeholderText";
        context_menu_enabled: "contextMenuEnabled";
        emoji_menu_enabled: "emojiMenuEnabled";
        backspace_deletes_composite_character_enabled: "backspaceDeletesCompositeCharacterEnabled";
        shortcut_keys_enabled: "shortcutKeysEnabled";
        selecting_enabled: "selectingEnabled";
        deselect_on_focus_loss_enabled: "deselectOnFocusLossEnabled";
        drag_and_drop_selection_enabled: "dragAndDropSelectionEnabled";
        middle_mouse_paste_enabled: "middleMousePasteEnabled";
        empty_selection_clipboard_enabled: "emptySelectionClipboardEnabled";
        wrap_mode: "wrapMode";
        autowrap_mode: "autowrapMode";
        indent_wrapped_lines: "indentWrappedLines";
        tab_input_mode: "tabInputMode";
        selection_handle_enabled: "selectionHandleEnabled";
        virtual_keyboard_enabled: "virtualKeyboardEnabled";
        virtual_keyboard_show_on_focus: "virtualKeyboardShowOnFocus";
        scroll_smooth: "scrollSmooth";
        scroll_v_scroll_speed: "scrollVScrollSpeed";
        scroll_past_end_of_file: "scrollPastEndOfFile";
        scroll_vertical: "scrollVertical";
        scroll_horizontal: "scrollHorizontal";
        scroll_fit_content_height: "scrollFitContentHeight";
        scroll_fit_content_width: "scrollFitContentWidth";
        minimap_draw: "minimapDraw";
        minimap_width: "minimapWidth";
        caret_type: "caretType";
        caret_blink: "caretBlink";
        caret_blink_interval: "caretBlinkInterval";
        caret_draw_when_editable_disabled: "caretDrawWhenEditableDisabled";
        caret_move_on_right_click: "caretMoveOnRightClick";
        caret_mid_grapheme: "caretMidGrapheme";
        caret_multiple: "caretMultiple";
        use_default_word_separators: "useDefaultWordSeparators";
        use_custom_word_separators: "useCustomWordSeparators";
        custom_word_separators: "customWordSeparators";
        syntax_highlighter: "syntaxHighlighter";
        highlight_all_occurrences: "highlightAllOccurrences";
        highlight_current_line: "highlightCurrentLine";
        draw_control_chars: "drawControlChars";
        draw_tabs: "drawTabs";
        draw_spaces: "drawSpaces";
        text_direction: "textDirection";
        structured_text_bidi_override: "structuredTextBidiOverride";
        structured_text_bidi_override_options: "structuredTextBidiOverrideOptions";
        text_set: "textSet";
        text_changed: "textChanged";
        lines_edited_from: "linesEditedFrom";
        caret_changed: "caretChanged";
        gutter_clicked: "gutterClicked";
        gutter_added: "gutterAdded";
        gutter_removed: "gutterRemoved";
    }
    /** A multiline text editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textedit.html  
     */
    class TextEdit<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Override this method to define what happens when the user types in the provided key [param unicode_char]. */
        /* gdvirtual */ _handleUnicodeInput(unicodeChar: int64, caretIndex: int64): void
        
        /** Override this method to define what happens when the user presses the backspace key. */
        /* gdvirtual */ _backspace(caretIndex: int64): void
        
        /** Override this method to define what happens when the user performs a cut operation. */
        /* gdvirtual */ _cut(caretIndex: int64): void
        
        /** Override this method to define what happens when the user performs a copy operation. */
        /* gdvirtual */ _copy(caretIndex: int64): void
        
        /** Override this method to define what happens when the user performs a paste operation. */
        /* gdvirtual */ _paste(caretIndex: int64): void
        
        /** Override this method to define what happens when the user performs a paste operation with middle mouse button.  
         *      
         *  **Note:** This method is only implemented on Linux.  
         */
        /* gdvirtual */ _pastePrimaryClipboard(caretIndex: int64): void
        _setText(text: string, emitSignal?: boolean /* = false */): void
        
        /** Returns `true` if the user has text in the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME). */
        hasImeText(): boolean
        
        /** Closes the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME) if it is open. Any text in the IME will be lost. */
        cancelIme(): void
        
        /** Applies text from the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME) to each caret and closes the IME if it is open. */
        applyIme(): void
        
        /** Sets the tab size for the [TextEdit] to use. */
        setTabSize(size: int64): void
        
        /** Returns the [TextEdit]'s tab size. */
        getTabSize(): int64
        
        /** If `true`, enables overtype mode. In this mode, typing overrides existing text instead of inserting text. The [member ProjectSettings.input/ui_text_toggle_insert_mode] action toggles overtype mode. See [method is_overtype_mode_enabled]. */
        setOvertypeModeEnabled(enabled: boolean): void
        
        /** Returns `true` if overtype mode is enabled. See [method set_overtype_mode_enabled]. */
        isOvertypeModeEnabled(): boolean
        
        /** Clears all text and related state. This clears the text content, selections, carets, and gutter line data. If [member editable] is `false`, clears the undo history, otherwise preserves it. Does **not** reset other values (such as [member placeholder_text], font, colors) to their defaults. */
        clear(): void
        
        /** Returns the number of lines in the text. */
        getLineCount(): int64
        
        /** Sets the text for a specific [param line].  
         *  Carets on the line will attempt to keep their visual x position.  
         */
        setLine(line: int64, newText: string): void
        
        /** Returns the text of a specific line. */
        getLine(line: int64): string
        
        /** Returns line text as it is currently displayed, including IME composition string. */
        getLineWithIme(line: int64): string
        
        /** Returns the width in pixels of the [param wrap_index] on [param line]. */
        getLineWidth(line: int64, wrapIndex?: int64 /* = -1 */): int64
        
        /** Returns the maximum value of the line height among all lines.  
         *      
         *  **Note:** The return value is influenced by [theme_item line_spacing] and [theme_item font_size]. And it will not be less than `1`.  
         */
        getLineHeight(): int64
        
        /** Returns the indent level of the given line. This is the number of spaces and tabs at the beginning of the line, with the tabs taking the tab size into account (see [method get_tab_size]). */
        getIndentLevel(line: int64): int64
        
        /** Returns the first column containing a non-whitespace character on the given line. If there is only whitespace, returns the number of characters. */
        getFirstNonWhiteSpaceColumn(line: int64): int64
        
        /** Swaps the two lines. Carets will be swapped with the lines. */
        swapLines(fromLine: int64, toLine: int64): void
        
        /** Inserts a new line with [param text] at [param line]. */
        insertLineAt(line: int64, text: string): void
        
        /** Removes the line of text at [param line]. Carets on this line will attempt to match their previous visual x position.  
         *  If [param move_carets_down] is `true` carets will move to the next line down, otherwise carets will move up.  
         */
        removeLineAt(line: int64, moveCaretsDown?: boolean /* = true */): void
        
        /** Insert the specified text at the caret position. */
        insertTextAtCaret(text: string, caretIndex?: int64 /* = -1 */): void
        
        /** Inserts the [param text] at [param line] and [param column].  
         *  If [param before_selection_begin] is `true`, carets and selections that begin at [param line] and [param column] will moved to the end of the inserted text, along with all carets after it.  
         *  If [param before_selection_end] is `true`, selections that end at [param line] and [param column] will be extended to the end of the inserted text. These parameters can be used to insert text inside of or outside of selections.  
         */
        insertText(text: string, line: int64, column: int64, beforeSelectionBegin?: boolean /* = true */, beforeSelectionEnd?: boolean /* = false */): void
        
        /** Removes text between the given positions. */
        removeText(fromLine: int64, fromColumn: int64, toLine: int64, toColumn: int64): void
        
        /** Returns the last unhidden line in the entire [TextEdit]. */
        getLastUnhiddenLine(): int64
        
        /** Returns the count to the next visible line from [param line] to `line + visible_amount`. Can also count backwards. For example if a [TextEdit] has 5 lines with lines 2 and 3 hidden, calling this with `line = 1, visible_amount = 1` would return 3. */
        getNextVisibleLineOffsetFrom(line: int64, visibleAmount: int64): int64
        
        /** Similar to [method get_next_visible_line_offset_from], but takes into account the line wrap indexes. In the returned vector, `x` is the line, `y` is the wrap index. */
        getNextVisibleLineIndexOffsetFrom(line: int64, wrapIndex: int64, visibleAmount: int64): Vector2I
        
        /** Called when the user presses the backspace key. Can be overridden with [method _backspace]. */
        backspace(caretIndex?: int64 /* = -1 */): void
        
        /** Cuts the current selection. Can be overridden with [method _cut]. */
        cut(caretIndex?: int64 /* = -1 */): void
        
        /** Copies the current text selection. Can be overridden with [method _copy]. */
        copy(caretIndex?: int64 /* = -1 */): void
        
        /** Paste at the current location. Can be overridden with [method _paste]. */
        paste(caretIndex?: int64 /* = -1 */): void
        
        /** Pastes the primary clipboard. */
        pastePrimaryClipboard(caretIndex?: int64 /* = -1 */): void
        
        /** Starts an action, will end the current action if [param action] is different.  
         *  An action will also end after a call to [method end_action], after [member ProjectSettings.gui/timers/text_edit_idle_detect_sec] is triggered or a new undoable step outside the [method start_action] and [method end_action] calls.  
         */
        startAction(action: TextEdit.EditAction): void
        
        /** Marks the end of steps in the current action started with [method start_action]. */
        endAction(): void
        
        /** Starts a multipart edit. All edits will be treated as one action until [method end_complex_operation] is called. */
        beginComplexOperation(): void
        
        /** Ends a multipart edit, started with [method begin_complex_operation]. If called outside a complex operation, the current operation is pushed onto the undo/redo stack. */
        endComplexOperation(): void
        
        /** Returns `true` if an "undo" action is available. */
        hasUndo(): boolean
        
        /** Returns `true` if a "redo" action is available. */
        hasRedo(): boolean
        
        /** Perform undo operation. */
        undo(): void
        
        /** Perform redo operation. */
        redo(): void
        
        /** Clears the undo history. */
        clearUndoHistory(): void
        
        /** Tag the current version as saved. */
        tagSavedVersion(): void
        
        /** Returns the current version of the [TextEdit]. The version is a count of recorded operations by the undo/redo history. */
        getVersion(): int64
        
        /** Returns the last tagged saved version from [method tag_saved_version]. */
        getSavedVersion(): int64
        
        /** Sets the search text. See [method set_search_flags]. */
        setSearchText(searchText: string): void
        
        /** Sets the search [param flags]. This is used with [method set_search_text] to highlight occurrences of the searched text. Search flags can be specified from the [enum SearchFlags] enum. */
        setSearchFlags(flags: int64): void
        
        /** Perform a search inside the text. Search flags can be specified in the [enum SearchFlags] enum.  
         *  In the returned vector, `x` is the column, `y` is the line. If no results are found, both are equal to `-1`.  
         *    
         */
        search(text: string, flags: int64, fromLine: int64, fromColumn: int64): Vector2I
        
        /** Provide custom tooltip text. The callback method must take the following args: `hovered_word: String`. */
        setTooltipRequestFunc(callback: Callable): void
        
        /** Returns the local mouse position adjusted for the text direction. */
        getLocalMousePos(): Vector2
        
        /** Returns the word at [param position] (in pixels). */
        getWordAtPos(position: Vector2): string
        
        /** Returns the line and column at the given position. In the returned vector, `x` is the column and `y` is the line.  
         *  If [param clamp_line] is `false` and [param position] is below the last line, `Vector2i(-1, -1)` is returned.  
         *  If [param clamp_column] is `false` and [param position] is outside the column range of the line, `Vector2i(-1, -1)` is returned.  
         */
        getLineColumnAtPos(position: Vector2I, clampLine?: boolean /* = true */, clampColumn?: boolean /* = true */): Vector2I
        
        /** Returns the local position for the given [param line] and [param column]. If `x` or `y` of the returned vector equal `-1`, the position is outside of the viewable area of the control.  
         *      
         *  **Note:** The Y position corresponds to the bottom side of the line. Use [method get_rect_at_line_column] to get the top side position.  
         */
        getPosAtLineColumn(line: int64, column: int64): Vector2I
        
        /** Returns the local position and size for the grapheme at the given [param line] and [param column]. If `x` or `y` position of the returned rect equal `-1`, the position is outside of the viewable area of the control.  
         *      
         *  **Note:** The Y position of the returned rect corresponds to the top side of the line, unlike [method get_pos_at_line_column] which returns the bottom side.  
         */
        getRectAtLineColumn(line: int64, column: int64): Rect2I
        
        /** Returns the equivalent minimap line at [param position]. */
        getMinimapLineAtPos(position: Vector2I): int64
        
        /** Returns `true` if the user is dragging their mouse for scrolling, selecting, or text dragging. */
        isDraggingCursor(): boolean
        
        /** Returns `true` if the mouse is over a selection. If [param edges] is `true`, the edges are considered part of the selection. */
        isMouseOverSelection(edges: boolean, caretIndex?: int64 /* = -1 */): boolean
        
        /** Adds a new caret at the given location. Returns the index of the new caret, or `-1` if the location is invalid. */
        addCaret(line: int64, column: int64): int64
        
        /** Removes the given caret index.  
         *      
         *  **Note:** This can result in adjustment of all other caret indices.  
         */
        removeCaret(caret: int64): void
        
        /** Removes all additional carets. */
        removeSecondaryCarets(): void
        
        /** Returns the number of carets in this [TextEdit]. */
        getCaretCount(): int64
        
        /** Adds an additional caret above or below every caret. If [param below] is `true` the new caret will be added below and above otherwise. */
        addCaretAtCarets(below: boolean): void
        
        /** Returns the carets sorted by selection beginning from lowest line and column to highest (from top to bottom of text).  
         *  If [param include_ignored_carets] is `false`, carets from [method multicaret_edit_ignore_caret] will be ignored.  
         */
        getSortedCarets(includeIgnoredCarets?: boolean /* = false */): PackedInt32Array
        
        /** Collapse all carets in the given range to the [param from_line] and [param from_column] position.  
         *  [param inclusive] applies to both ends.  
         *  If [method is_in_mulitcaret_edit] is `true`, carets that are collapsed will be `true` for [method multicaret_edit_ignore_caret].  
         *  [method merge_overlapping_carets] will be called if any carets were collapsed.  
         */
        collapseCarets(fromLine: int64, fromColumn: int64, toLine: int64, toColumn: int64, inclusive?: boolean /* = false */): void
        
        /** Merges any overlapping carets. Will favor the newest caret, or the caret with a selection.  
         *  If [method is_in_mulitcaret_edit] is `true`, the merge will be queued to happen at the end of the multicaret edit. See [method begin_multicaret_edit] and [method end_multicaret_edit].  
         *      
         *  **Note:** This is not called when a caret changes position but after certain actions, so it is possible to get into a state where carets overlap.  
         */
        mergeOverlappingCarets(): void
        
        /** Starts an edit for multiple carets. The edit must be ended with [method end_multicaret_edit]. Multicaret edits can be used to edit text at multiple carets and delay merging the carets until the end, so the caret indexes aren't affected immediately. [method begin_multicaret_edit] and [method end_multicaret_edit] can be nested, and the merge will happen at the last [method end_multicaret_edit].  
         *    
         */
        beginMulticaretEdit(): void
        
        /** Ends an edit for multiple carets, that was started with [method begin_multicaret_edit]. If this was the last [method end_multicaret_edit] and [method merge_overlapping_carets] was called, carets will be merged. */
        endMulticaretEdit(): void
        
        /** Returns `true` if a [method begin_multicaret_edit] has been called and [method end_multicaret_edit] has not yet been called. */
        isInMulitcaretEdit(): boolean
        
        /** Returns `true` if the given [param caret_index] should be ignored as part of a multicaret edit. See [method begin_multicaret_edit] and [method end_multicaret_edit]. Carets that should be ignored are ones that were part of removed text and will likely be merged at the end of the edit, or carets that were added during the edit.  
         *  It is recommended to `continue` within a loop iterating on multiple carets if a caret should be ignored.  
         */
        multicaretEditIgnoreCaret(caretIndex: int64): boolean
        
        /** Returns `true` if the caret is visible, `false` otherwise. A caret will be considered hidden if it is outside the scrollable area when scrolling is enabled.  
         *      
         *  **Note:** [method is_caret_visible] does not account for a caret being off-screen if it is still within the scrollable area. It will return `true` even if the caret is off-screen as long as it meets [TextEdit]'s own conditions for being visible. This includes uses of [member scroll_fit_content_width] and [member scroll_fit_content_height] that cause the [TextEdit] to expand beyond the viewport's bounds.  
         *      
         *  **Note:** This method does  *not*  guarantee an accurate visibility check immediately after setting the caret position. The correct value may only be available in the next frame after the [TextEdit] has finished drawing. This also applies to any operation that causes the [TextEdit] to change in size.  
         */
        isCaretVisible(caretIndex?: int64 /* = 0 */): boolean
        
        /** Returns the caret pixel draw position. */
        getCaretDrawPos(caretIndex?: int64 /* = 0 */): Vector2
        
        /** Moves the caret to the specified [param line] index. The caret column will be moved to the same visual position it was at the last time [method set_caret_column] was called, or clamped to the end of the line.  
         *  If [param adjust_viewport] is `true`, the viewport will center at the caret position after the move occurs.  
         *  If [param can_be_hidden] is `true`, the specified [param line] can be hidden.  
         *  If [param wrap_index] is `-1`, the caret column will be clamped to the [param line]'s length. If [param wrap_index] is greater than `-1`, the column will be moved to attempt to match the visual x position on the line's [param wrap_index] to the position from the last time [method set_caret_column] was called.  
         *      
         *  **Note:** If supporting multiple carets this will not check for any overlap. See [method merge_overlapping_carets].  
         */
        setCaretLine(line: int64, adjustViewport?: boolean /* = true */, canBeHidden?: boolean /* = true */, wrapIndex?: int64 /* = 0 */, caretIndex?: int64 /* = 0 */): void
        
        /** Returns the line the editing caret is on. */
        getCaretLine(caretIndex?: int64 /* = 0 */): int64
        
        /** Moves the caret to the specified [param column] index.  
         *  If [param adjust_viewport] is `true`, the viewport will center at the caret position after the move occurs.  
         *      
         *  **Note:** If supporting multiple carets this will not check for any overlap. See [method merge_overlapping_carets].  
         */
        setCaretColumn(column: int64, adjustViewport?: boolean /* = true */, caretIndex?: int64 /* = 0 */): void
        
        /** Returns the column the editing caret is at. */
        getCaretColumn(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the correct column at the end of a composite character like ❤️‍🩹 (mending heart; Unicode: `U+2764 U+FE0F U+200D U+1FA79`) which is comprised of more than one Unicode code point, if the caret is at the start of the composite character. Also returns the correct column with the caret at mid grapheme and for non-composite characters.  
         *      
         *  **Note:** To check at caret location use `get_next_composite_character_column(get_caret_line(), get_caret_column())`  
         */
        getNextCompositeCharacterColumn(line: int64, column: int64): int64
        
        /** Returns the correct column at the start of a composite character like ❤️‍🩹 (mending heart; Unicode: `U+2764 U+FE0F U+200D U+1FA79`) which is comprised of more than one Unicode code point, if the caret is at the end of the composite character. Also returns the correct column with the caret at mid grapheme and for non-composite characters.  
         *      
         *  **Note:** To check at caret location use `get_previous_composite_character_column(get_caret_line(), get_caret_column())`  
         */
        getPreviousCompositeCharacterColumn(line: int64, column: int64): int64
        
        /** Returns the wrap index the editing caret is on. */
        getCaretWrapIndex(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns a [String] text with the word under the caret's location. */
        getWordUnderCaret(caretIndex?: int64 /* = -1 */): string
        
        /** Sets the current selection mode. */
        setSelectionMode(mode: TextEdit.SelectionMode): void
        
        /** Returns the current selection mode. */
        getSelectionMode(): TextEdit.SelectionMode
        
        /** Select all the text.  
         *  If [member selecting_enabled] is `false`, no selection will occur.  
         */
        selectAll(): void
        
        /** Selects the word under the caret. */
        selectWordUnderCaret(caretIndex?: int64 /* = -1 */): void
        
        /** Adds a selection and a caret for the next occurrence of the current selection. If there is no active selection, selects word under caret. */
        addSelectionForNextOccurrence(): void
        
        /** Moves a selection and a caret for the next occurrence of the current selection. If there is no active selection, moves to the next occurrence of the word under caret. */
        skipSelectionForNextOccurrence(): void
        
        /** Selects text from [param origin_line] and [param origin_column] to [param caret_line] and [param caret_column] for the given [param caret_index]. This moves the selection origin and the caret. If the positions are the same, the selection will be deselected.  
         *  If [member selecting_enabled] is `false`, no selection will occur.  
         *      
         *  **Note:** If supporting multiple carets this will not check for any overlap. See [method merge_overlapping_carets].  
         */
        select(originLine: int64, originColumn: int64, caretLine: int64, caretColumn: int64, caretIndex?: int64 /* = 0 */): void
        
        /** Returns `true` if the user has selected text. */
        hasSelection(caretIndex?: int64 /* = -1 */): boolean
        
        /** Returns the text inside the selection of a caret, or all the carets if [param caret_index] is its default value `-1`. */
        getSelectedText(caretIndex?: int64 /* = -1 */): string
        
        /** Returns the caret index of the selection at the given [param line] and [param column], or `-1` if there is none.  
         *  If [param include_edges] is `false`, the position must be inside the selection and not at either end. If [param only_selections] is `false`, carets without a selection will also be considered.  
         */
        getSelectionAtLineColumn(line: int64, column: int64, includeEdges?: boolean /* = true */, onlySelections?: boolean /* = true */): int64
        
        /** Returns an [Array] of line ranges where `x` is the first line and `y` is the last line. All lines within these ranges will have a caret on them or be part of a selection. Each line will only be part of one line range, even if it has multiple carets on it.  
         *  If a selection's end column ([method get_selection_to_column]) is at column `0`, that line will not be included. If a selection begins on the line after another selection ends and [param merge_adjacent] is `true`, or they begin and end on the same line, one line range will include both selections.  
         */
        getLineRangesFromCarets(onlySelections?: boolean /* = false */, mergeAdjacent?: boolean /* = true */): GArray<Vector2I>
        
        /** Returns the origin line of the selection. This is the opposite end from the caret. */
        getSelectionOriginLine(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the origin column of the selection. This is the opposite end from the caret. */
        getSelectionOriginColumn(caretIndex?: int64 /* = 0 */): int64
        
        /** Sets the selection origin line to the [param line] for the given [param caret_index]. If the selection origin is moved to the caret position, the selection will deselect.  
         *  If [param can_be_hidden] is `false`, The line will be set to the nearest unhidden line below or above.  
         *  If [param wrap_index] is `-1`, the selection origin column will be clamped to the [param line]'s length. If [param wrap_index] is greater than `-1`, the column will be moved to attempt to match the visual x position on the line's [param wrap_index] to the position from the last time [method set_selection_origin_column] or [method select] was called.  
         */
        setSelectionOriginLine(line: int64, canBeHidden?: boolean /* = true */, wrapIndex?: int64 /* = -1 */, caretIndex?: int64 /* = 0 */): void
        
        /** Sets the selection origin column to the [param column] for the given [param caret_index]. If the selection origin is moved to the caret position, the selection will deselect. */
        setSelectionOriginColumn(column: int64, caretIndex?: int64 /* = 0 */): void
        
        /** Returns the selection begin line. Returns the caret line if there is no selection. */
        getSelectionFromLine(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the selection begin column. Returns the caret column if there is no selection. */
        getSelectionFromColumn(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the selection end line. Returns the caret line if there is no selection. */
        getSelectionToLine(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the selection end column. Returns the caret column if there is no selection. */
        getSelectionToColumn(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns `true` if the caret of the selection is after the selection origin. This can be used to determine the direction of the selection. */
        isCaretAfterSelectionOrigin(caretIndex?: int64 /* = 0 */): boolean
        
        /** Deselects the current selection. */
        deselect(caretIndex?: int64 /* = -1 */): void
        
        /** Deletes the selected text. */
        deleteSelection(caretIndex?: int64 /* = -1 */): void
        
        /** Returns if the given line is wrapped. */
        isLineWrapped(line: int64): boolean
        
        /** Returns the number of times the given line is wrapped. */
        getLineWrapCount(line: int64): int64
        
        /** Returns the wrap index of the given column on the given line. This ranges from `0` to [method get_line_wrap_count]. */
        getLineWrapIndexAtColumn(line: int64, column: int64): int64
        
        /** Returns an array of [String]s representing each wrapped index. */
        getLineWrappedText(line: int64): PackedStringArray
        
        /** Returns the [VScrollBar] of the [TextEdit]. */
        getVScrollBar(): null | VScrollBar
        
        /** Returns the [HScrollBar] used by [TextEdit]. */
        getHScrollBar(): null | HScrollBar
        
        /** Returns the scroll position for [param wrap_index] of [param line]. */
        getScrollPosForLine(line: int64, wrapIndex?: int64 /* = 0 */): float64
        
        /** Positions the [param wrap_index] of [param line] at the top of the viewport. */
        setLineAsFirstVisible(line: int64, wrapIndex?: int64 /* = 0 */): void
        
        /** Returns the first visible line. */
        getFirstVisibleLine(): int64
        
        /** Returns `true` if the given line is within the scope of the scrollable area of the viewport. */
        isLineInViewport(line: int64): boolean
        
        /** Positions the [param wrap_index] of [param line] at the center of the viewport. */
        setLineAsCenterVisible(line: int64, wrapIndex?: int64 /* = 0 */): void
        
        /** Positions the [param wrap_index] of [param line] at the bottom of the viewport. */
        setLineAsLastVisible(line: int64, wrapIndex?: int64 /* = 0 */): void
        
        /** Returns the last visible line. Use [method get_last_full_visible_line_wrap_index] for the wrap index. */
        getLastFullVisibleLine(): int64
        
        /** Returns the last visible wrap index of the last visible line. */
        getLastFullVisibleLineWrapIndex(): int64
        
        /** Returns the number of lines that can visually fit, rounded down, based on this control's height. */
        getVisibleLineCount(): int64
        
        /** Returns the total number of lines between [param from_line] and [param to_line] (inclusive) in the text. This includes wrapped lines and excludes folded lines. If the range covers all lines it is equivalent to [method get_total_visible_line_count]. */
        getVisibleLineCountInRange(fromLine: int64, toLine: int64): int64
        
        /** Returns the total number of lines in the text. This includes wrapped lines and excludes folded lines. If [member wrap_mode] is set to [constant LINE_WRAPPING_NONE] and no lines are folded (see [method CodeEdit.is_line_folded]) then this is equivalent to [method get_line_count]. See [method get_visible_line_count_in_range] for a limited range of lines. */
        getTotalVisibleLineCount(): int64
        
        /** Adjust the viewport so the caret is visible. */
        adjustViewportToCaret(caretIndex?: int64 /* = 0 */): void
        
        /** Centers the viewport on the line the editing caret is at. This also resets the [member scroll_horizontal] value to `0`. */
        centerViewportToCaret(caretIndex?: int64 /* = 0 */): void
        
        /** Returns the number of lines that may be drawn on the minimap. */
        getMinimapVisibleLines(): int64
        
        /** Register a new gutter to this [TextEdit]. Use [param at] to have a specific gutter order. A value of `-1` appends the gutter to the right. */
        addGutter(at?: int64 /* = -1 */): void
        
        /** Removes the gutter at the given index. */
        removeGutter(gutter: int64): void
        
        /** Returns the number of gutters registered. */
        getGutterCount(): int64
        
        /** Sets the name of the gutter at the given index. */
        setGutterName(gutter: int64, name: string): void
        
        /** Returns the name of the gutter at the given index. */
        getGutterName(gutter: int64): string
        
        /** Sets the type of gutter at the given index. Gutters can contain icons, text, or custom visuals. */
        setGutterType(gutter: int64, type: TextEdit.GutterType): void
        
        /** Returns the type of the gutter at the given index. Gutters can contain icons, text, or custom visuals. */
        getGutterType(gutter: int64): TextEdit.GutterType
        
        /** Set the width of the gutter at the given index. */
        setGutterWidth(gutter: int64, width: int64): void
        
        /** Returns the width of the gutter at the given index. */
        getGutterWidth(gutter: int64): int64
        
        /** If `true`, the gutter at the given index is drawn. The gutter type ([method set_gutter_type]) determines how it is drawn. See [method is_gutter_drawn]. */
        setGutterDraw(gutter: int64, draw: boolean): void
        
        /** Returns `true` if the gutter at the given index is currently drawn. See [method set_gutter_draw]. */
        isGutterDrawn(gutter: int64): boolean
        
        /** If `true`, the mouse cursor will change to a pointing hand ([constant Control.CURSOR_POINTING_HAND]) when hovering over the gutter at the given index. See [method is_gutter_clickable] and [method set_line_gutter_clickable]. */
        setGutterClickable(gutter: int64, clickable: boolean): void
        
        /** Returns `true` if the gutter at the given index is clickable. See [method set_gutter_clickable]. */
        isGutterClickable(gutter: int64): boolean
        
        /** If `true`, the line data of the gutter at the given index can be overridden when using [method merge_gutters]. See [method is_gutter_overwritable]. */
        setGutterOverwritable(gutter: int64, overwritable: boolean): void
        
        /** Returns `true` if the gutter at the given index is overwritable. See [method set_gutter_overwritable]. */
        isGutterOverwritable(gutter: int64): boolean
        
        /** Merge the gutters from [param from_line] into [param to_line]. Only overwritable gutters will be copied. See [method set_gutter_overwritable]. */
        mergeGutters(fromLine: int64, toLine: int64): void
        
        /** Set a custom draw callback for the gutter at the given index. [param draw_callback] must take the following arguments: A line index [int], a gutter index [int], and an area [Rect2]. This callback only works when the gutter type is [constant GUTTER_TYPE_CUSTOM] (see [method set_gutter_type]). */
        setGutterCustomDraw(column: int64, drawCallback: Callable): void
        
        /** Returns the total width of all gutters and internal padding. */
        getTotalGutterWidth(): int64
        
        /** Sets the metadata for [param gutter] on [param line] to [param metadata]. */
        setLineGutterMetadata(line: int64, gutter: int64, metadata: any): void
        
        /** Returns the metadata currently in [param gutter] at [param line]. */
        getLineGutterMetadata(line: int64, gutter: int64): any
        
        /** Sets the text for [param gutter] on [param line] to [param text]. This only works when the gutter type is [constant GUTTER_TYPE_STRING] (see [method set_gutter_type]). */
        setLineGutterText(line: int64, gutter: int64, text: string): void
        
        /** Returns the text currently in [param gutter] at [param line]. This only works when the gutter type is [constant GUTTER_TYPE_STRING] (see [method set_gutter_type]). */
        getLineGutterText(line: int64, gutter: int64): string
        
        /** Sets the icon for [param gutter] on [param line] to [param icon]. This only works when the gutter type is [constant GUTTER_TYPE_ICON] (see [method set_gutter_type]). */
        setLineGutterIcon(line: int64, gutter: int64, icon: Texture2D): void
        
        /** Returns the icon currently in [param gutter] at [param line]. This only works when the gutter type is [constant GUTTER_TYPE_ICON] (see [method set_gutter_type]). */
        getLineGutterIcon(line: int64, gutter: int64): null | Texture2D
        
        /** Sets the color for [param gutter] on [param line] to [param color]. */
        setLineGutterItemColor(line: int64, gutter: int64, color: Color): void
        
        /** Returns the color currently in [param gutter] at [param line]. */
        getLineGutterItemColor(line: int64, gutter: int64): Color
        
        /** If [param clickable] is `true`, makes the [param gutter] on the given [param line] clickable. This is like [method set_gutter_clickable], but for a single line. If [method is_gutter_clickable] is `true`, this will not have any effect. See [method is_line_gutter_clickable] and [signal gutter_clicked]. */
        setLineGutterClickable(line: int64, gutter: int64, clickable: boolean): void
        
        /** Returns `true` if the gutter at the given index on the given line is clickable. See [method set_line_gutter_clickable]. */
        isLineGutterClickable(line: int64, gutter: int64): boolean
        
        /** Sets the custom background color of the given line. If transparent, this color is applied on top of the default background color (See [theme_item background_color]). If set to `Color(0, 0, 0, 0)`, no additional color is applied. */
        setLineBackgroundColor(line: int64, color: Color): void
        
        /** Returns the custom background color of the given line. If no color is set, returns `Color(0, 0, 0, 0)`. */
        getLineBackgroundColor(line: int64): Color
        
        /** Returns the [PopupMenu] of this [TextEdit]. By default, this menu is displayed when right-clicking on the [TextEdit].  
         *  You can add custom menu items or remove standard ones. Make sure your IDs don't conflict with the standard ones (see [enum MenuItems]). For example:  
         *    
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getMenu(): null | PopupMenu
        
        /** Returns `true` if the menu is visible. Use this instead of `get_menu().visible` to improve performance (so the creation of the menu is avoided). See [method get_menu]. */
        isMenuVisible(): boolean
        
        /** Executes a given action as defined in the [enum MenuItems] enum. */
        menuOption(option: int64): void
        
        /** This method does nothing. */
        adjustCaretsAfterEdit(caret: int64, fromLine: int64, fromCol: int64, toLine: int64, toCol: int64): void
        
        /** Returns a list of caret indexes in their edit order, this done from bottom to top. Edit order refers to the way actions such as [method insert_text_at_caret] are applied. */
        getCaretIndexEditOrder(): PackedInt32Array
        
        /** Returns the original start line of the selection. */
        getSelectionLine(caretIndex?: int64 /* = 0 */): int64
        
        /** Returns the original start column of the selection. */
        getSelectionColumn(caretIndex?: int64 /* = 0 */): int64
        
        /** String value of the [TextEdit]. */
        get text(): string
        set text(value: string)
        
        /** Text shown when the [TextEdit] is empty. It is **not** the [TextEdit]'s default value (see [member text]). */
        get placeholderText(): string
        set placeholderText(value: string)
        
        /** If `false`, existing text cannot be modified and new text cannot be added. */
        get editable(): boolean
        set editable(value: boolean)
        
        /** If `true`, a right-click displays the context menu. */
        get contextMenuEnabled(): boolean
        set contextMenuEnabled(value: boolean)
        
        /** If `true`, "Emoji and Symbols" menu is enabled. */
        get emojiMenuEnabled(): boolean
        set emojiMenuEnabled(value: boolean)
        
        /** If `true` and [member caret_mid_grapheme] is `false`, backspace deletes an entire composite character such as ❤️‍🩹, instead of deleting part of the composite character. */
        get backspaceDeletesCompositeCharacterEnabled(): boolean
        set backspaceDeletesCompositeCharacterEnabled(value: boolean)
        
        /** If `true`, shortcut keys for context menu items are enabled, even if the context menu is disabled. */
        get shortcutKeysEnabled(): boolean
        set shortcutKeysEnabled(value: boolean)
        
        /** If `true`, text can be selected.  
         *  If `false`, text can not be selected by the user or by the [method select] or [method select_all] methods.  
         */
        get selectingEnabled(): boolean
        set selectingEnabled(value: boolean)
        
        /** If `true`, the selected text will be deselected when focus is lost. */
        get deselectOnFocusLossEnabled(): boolean
        set deselectOnFocusLossEnabled(value: boolean)
        
        /** If `true`, allow drag and drop of selected text. Text can still be dropped from other sources. */
        get dragAndDropSelectionEnabled(): boolean
        set dragAndDropSelectionEnabled(value: boolean)
        
        /** If `false`, using middle mouse button to paste clipboard will be disabled.  
         *      
         *  **Note:** This method is only implemented on Linux.  
         */
        get middleMousePasteEnabled(): boolean
        set middleMousePasteEnabled(value: boolean)
        
        /** If `true`, copying or cutting without a selection is performed on all lines with a caret. Otherwise, copy and cut require a selection. */
        get emptySelectionClipboardEnabled(): boolean
        set emptySelectionClipboardEnabled(value: boolean)
        
        /** Sets the line wrapping mode to use. */
        get wrapMode(): int64
        set wrapMode(value: int64)
        
        /** If [member wrap_mode] is set to [constant LINE_WRAPPING_BOUNDARY], sets text wrapping mode. */
        get autowrapMode(): int64
        set autowrapMode(value: int64)
        
        /** If `true`, all wrapped lines are indented to the same amount as the unwrapped line. */
        get indentWrappedLines(): boolean
        set indentWrappedLines(value: boolean)
        
        /** If `true`, [member ProjectSettings.input/ui_text_indent] input `Tab` character, otherwise it moves keyboard focus to the next [Control] in the scene. */
        get tabInputMode(): boolean
        set tabInputMode(value: boolean)
        
        /** If `true`, enables the handles used for text selection. These handles are only visible on touchscreen and can be dragged to adjust the selected text range. */
        get selectionHandleEnabled(): boolean
        set selectionHandleEnabled(value: boolean)
        
        /** If `true`, the native virtual keyboard is enabled on platforms that support it. */
        get virtualKeyboardEnabled(): boolean
        set virtualKeyboardEnabled(value: boolean)
        
        /** If `true`, the native virtual keyboard is shown on focus events on platforms that support it. */
        get virtualKeyboardShowOnFocus(): boolean
        set virtualKeyboardShowOnFocus(value: boolean)
        
        /** Scroll smoothly over the text rather than jumping to the next location. */
        get scrollSmooth(): boolean
        set scrollSmooth(value: boolean)
        
        /** Sets the scroll speed with the minimap or when [member scroll_smooth] is enabled. */
        get scrollVScrollSpeed(): float64
        set scrollVScrollSpeed(value: float64)
        
        /** Allow scrolling past the last line into "virtual" space. */
        get scrollPastEndOfFile(): boolean
        set scrollPastEndOfFile(value: boolean)
        
        /** If there is a vertical scrollbar, this determines the current vertical scroll value in line numbers, starting at 0 for the top line. */
        get scrollVertical(): float64
        set scrollVertical(value: float64)
        
        /** If there is a horizontal scrollbar, this determines the current horizontal scroll value in pixels. */
        get scrollHorizontal(): int64
        set scrollHorizontal(value: int64)
        
        /** If `true`, [TextEdit] fits its minimum height to the number of visible lines instead of scrolling vertically. If a maximum height is set (for example via [member Control.custom_maximum_size]) and content exceeds it, a vertical scrollbar is shown. */
        get scrollFitContentHeight(): boolean
        set scrollFitContentHeight(value: boolean)
        
        /** If `true`, [TextEdit] fits its minimum width to the widest line instead of scrolling horizontally. If a maximum width is set (for example via [member Control.custom_maximum_size]) and content exceeds it, a horizontal scrollbar is shown. */
        get scrollFitContentWidth(): boolean
        set scrollFitContentWidth(value: boolean)
        
        /** If `true`, a minimap is shown, providing an outline of your source code. The minimap uses a fixed-width text size. */
        get minimapDraw(): boolean
        set minimapDraw(value: boolean)
        
        /** The width, in pixels, of the minimap. */
        get minimapWidth(): int64
        set minimapWidth(value: int64)
        
        /** Set the type of caret to draw. */
        get caretType(): int64
        set caretType(value: int64)
        
        /** If `true`, makes the caret blink. */
        get caretBlink(): boolean
        set caretBlink(value: boolean)
        
        /** The interval at which the caret blinks (in seconds). */
        get caretBlinkInterval(): float64
        set caretBlinkInterval(value: float64)
        
        /** If `true`, caret will be visible when [member editable] is disabled. */
        get caretDrawWhenEditableDisabled(): boolean
        set caretDrawWhenEditableDisabled(value: boolean)
        
        /** If `true`, a right-click moves the caret at the mouse position before displaying the context menu.  
         *  If `false`, the context menu ignores mouse location.  
         */
        get caretMoveOnRightClick(): boolean
        set caretMoveOnRightClick(value: boolean)
        
        /** Allow moving caret, selecting and removing the individual composite character components.  
         *      
         *  **Note:** [kbd]Backspace[/kbd] is always removing individual composite character components.  
         */
        get caretMidGrapheme(): boolean
        set caretMidGrapheme(value: boolean)
        
        /** If `true`, multiple carets are allowed. Left-clicking with [kbd]Alt[/kbd] adds a new caret. See [method add_caret] and [method get_caret_count]. */
        get caretMultiple(): boolean
        set caretMultiple(value: boolean)
        
        /** If `false`, using [kbd]Ctrl + Left[/kbd] or [kbd]Ctrl + Right[/kbd] ([kbd]Cmd + Left[/kbd] or [kbd]Cmd + Right[/kbd] on macOS) bindings will stop moving caret only if a space or punctuation is detected. If `true`, it will also stop the caret if a character is part of `!"#$%&'()*+,-./:;<=>?@[\]^`{|}~`, the Unicode General Punctuation table, or the Unicode CJK Punctuation table. Useful for subword moving. This behavior also will be applied to the behavior of text selection. */
        get useDefaultWordSeparators(): boolean
        set useDefaultWordSeparators(value: boolean)
        
        /** If `false`, using [kbd]Ctrl + Left[/kbd] or [kbd]Ctrl + Right[/kbd] ([kbd]Cmd + Left[/kbd] or [kbd]Cmd + Right[/kbd] on macOS) bindings will use the behavior of [member use_default_word_separators]. If `true`, it will also stop the caret if a character within [member custom_word_separators] is detected. Useful for subword moving. This behavior also will be applied to the behavior of text selection. */
        get useCustomWordSeparators(): boolean
        set useCustomWordSeparators(value: boolean)
        
        /** The characters to consider as word delimiters if [member use_custom_word_separators] is `true`. The characters should be defined without separation, for example `#_!`. */
        get customWordSeparators(): string
        set customWordSeparators(value: string)
        
        /** The syntax highlighter to use.  
         *      
         *  **Note:** A [SyntaxHighlighter] instance should not be used across multiple [TextEdit] nodes.  
         */
        get syntaxHighlighter(): null | SyntaxHighlighter
        set syntaxHighlighter(value: null | SyntaxHighlighter)
        
        /** If `true`, all occurrences of the selected text will be highlighted. */
        get highlightAllOccurrences(): boolean
        set highlightAllOccurrences(value: boolean)
        
        /** If `true`, the line containing the cursor is highlighted. */
        get highlightCurrentLine(): boolean
        set highlightCurrentLine(value: boolean)
        
        /** If `true`, control characters are displayed. */
        get drawControlChars(): boolean
        set drawControlChars(value: boolean)
        
        /** If `true`, the "tab" character will have a visible representation. */
        get drawTabs(): boolean
        set drawTabs(value: boolean)
        
        /** If `true`, the "space" character will have a visible representation. */
        get drawSpaces(): boolean
        set drawSpaces(value: boolean)
        
        /** Base text writing direction. */
        get textDirection(): int64
        set textDirection(value: int64)
        
        /** Language code used for line-breaking and text shaping algorithms. If left empty, the current locale is used instead. */
        get language(): string
        set language(value: string)
        
        /** Set BiDi algorithm override for the structured text. */
        get structuredTextBidiOverride(): int64
        set structuredTextBidiOverride(value: int64)
        
        /** Set additional options for BiDi override. */
        get structuredTextBidiOverrideOptions(): GArray
        set structuredTextBidiOverrideOptions(value: GArray)
        
        /** Emitted when [method clear] is called or [member text] is set. */
        readonly textSet: Signal<() => void>
        
        /** Emitted when the text changes. */
        readonly textChanged: Signal<() => void>
        
        /** Emitted immediately when the text changes.  
         *  When text is added [param from_line] will be less than [param to_line]. On a remove [param to_line] will be less than [param from_line].  
         */
        readonly linesEditedFrom: Signal<(fromLine: int64, toLine: int64) => void>
        
        /** Emitted when any caret changes position. */
        readonly caretChanged: Signal<() => void>
        
        /** Emitted when a gutter is clicked. */
        readonly gutterClicked: Signal<(line: int64, gutter: int64) => void>
        
        /** Emitted when a gutter is added. */
        readonly gutterAdded: Signal<() => void>
        
        /** Emitted when a gutter is removed. */
        readonly gutterRemoved: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextEdit;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextEdit;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextLine extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextLine extends __NameMapRefCounted {
        get_inferred_direction: "getInferredDirection";
        set_bidi_override: "setBidiOverride";
        add_string: "addString";
        add_object: "addObject";
        resize_object: "resizeObject";
        has_object: "hasObject";
        tab_align: "tabAlign";
        get_objects: "getObjects";
        get_object_rect: "getObjectRect";
        get_size: "getSize";
        get_rid: "getRid";
        get_line_ascent: "getLineAscent";
        get_line_descent: "getLineDescent";
        get_line_width: "getLineWidth";
        get_line_underline_position: "getLineUnderlinePosition";
        get_line_underline_thickness: "getLineUnderlineThickness";
        draw_outline: "drawOutline";
        hit_test: "hitTest";
        preserve_invalid: "preserveInvalid";
        preserve_control: "preserveControl";
        text_overrun_behavior: "textOverrunBehavior";
        ellipsis_char: "ellipsisChar";
    }
    /** Holds a line of text.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textline.html  
     */
    class TextLine extends RefCounted {
        constructor(identifier?: any)
        /** Clears text line (removes text and inline objects). */
        clear(): void
        
        /** Duplicates this [TextLine]. */
        duplicate(): null | TextLine
        
        /** Returns the text writing direction inferred by the BiDi algorithm. */
        getInferredDirection(): TextServer.Direction
        
        /** Overrides BiDi for the structured text.  
         *  Override ranges should cover full source text without overlaps. BiDi algorithm will be used on each range separately.  
         */
        setBidiOverride(override: GArray): void
        
        /** Adds text span and font to draw it. */
        addString(text: string, font: Font, fontSize: int64, language?: string /* = '' */, meta?: any /* = {} */): boolean
        
        /** Adds inline object to the text buffer, [param key] must be unique. In the text, object is represented as [param length] object replacement characters. */
        addObject(key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, length?: int64 /* = 1 */, baseline?: float64 /* = 0 */): boolean
        
        /** Sets new size and alignment of embedded object. */
        resizeObject(key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, baseline?: float64 /* = 0 */): boolean
        
        /** Returns `true` if an object with [param key] is embedded in this line. */
        hasObject(key: any): boolean
        
        /** Aligns text to the given tab-stops. */
        tabAlign(tabStops: PackedFloat32Array | float32[]): void
        
        /** Returns array of inline objects. */
        getObjects(): GArray
        
        /** Returns bounding rectangle of the inline object. */
        getObjectRect(key: any): Rect2
        
        /** Returns size of the bounding box of the text. */
        getSize(): Vector2
        
        /** Returns TextServer buffer RID. */
        getRid(): Rid
        
        /** Returns the text ascent (number of pixels above the baseline for horizontal layout or to the left of baseline for vertical). */
        getLineAscent(): float64
        
        /** Returns the text descent (number of pixels below the baseline for horizontal layout or to the right of baseline for vertical). */
        getLineDescent(): float64
        
        /** Returns width (for horizontal layout) or height (for vertical) of the text. */
        getLineWidth(): float64
        
        /** Returns pixel offset of the underline below the baseline. */
        getLineUnderlinePosition(): float64
        
        /** Returns thickness of the underline. */
        getLineUnderlineThickness(): float64
        
        /** Draw text into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        draw(canvas: Rid, pos: Vector2, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw text into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawOutline(canvas: Rid, pos: Vector2, outlineSize?: int64 /* = 1 */, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Returns caret character offset at the specified pixel offset at the baseline. This function always returns a valid position. */
        hitTest(coords: float64): int64
        
        /** Text writing direction. */
        get direction(): int64
        set direction(value: int64)
        
        /** Text orientation. */
        get orientation(): int64
        set orientation(value: int64)
        
        /** If set to `true` text will display invalid characters. */
        get preserveInvalid(): boolean
        set preserveInvalid(value: boolean)
        
        /** If set to `true` text will display control characters. */
        get preserveControl(): boolean
        set preserveControl(value: boolean)
        
        /** Text line width. */
        get width(): float64
        set width(value: float64)
        
        /** Sets text alignment within the line as if the line was horizontal. */
        get alignment(): int64
        set alignment(value: int64)
        
        /** Line alignment rules. For more info see [TextServer]. */
        get flags(): int64
        set flags(value: int64)
        
        /** The clipping behavior when the text exceeds the text line's set width. */
        get textOverrunBehavior(): int64
        set textOverrunBehavior(value: int64)
        
        /** Ellipsis character used for text clipping. */
        get ellipsisChar(): string
        set ellipsisChar(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextLine;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextLine;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextMesh extends __NameMapPrimitiveMesh {
        font_size: "fontSize";
        horizontal_alignment: "horizontalAlignment";
        vertical_alignment: "verticalAlignment";
        line_spacing: "lineSpacing";
        autowrap_mode: "autowrapMode";
        justification_flags: "justificationFlags";
        pixel_size: "pixelSize";
        curve_step: "curveStep";
        text_direction: "textDirection";
        structured_text_bidi_override: "structuredTextBidiOverride";
        structured_text_bidi_override_options: "structuredTextBidiOverrideOptions";
    }
    /** Generate a [PrimitiveMesh] from the text.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textmesh.html  
     */
    class TextMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** The text to generate mesh from.  
         *      
         *  **Note:** Due to being a [Resource], it doesn't follow the rules of [member Node.auto_translate_mode]. If disabling translation is desired, it should be done manually with [method Object.set_message_translation].  
         */
        get text(): string
        set text(value: string)
        
        /** Font configuration used to display text. */
        get font(): null | Font
        set font(value: null | Font)
        
        /** Font size of the [TextMesh]'s text. This property works in tandem with [member pixel_size]. Higher values will result in a more detailed font, regardless of [member curve_step] and [member pixel_size]. Consider keeping this value below 63 (inclusive) for good performance, and adjust [member pixel_size] as needed to enlarge text.  
         *      
         *  **Note:** Changing this property will regenerate the mesh, which is a slow operation, especially with large font sizes and long texts. To change the text's size in real-time efficiently, change the node's [member Node3D.scale] instead.  
         */
        get fontSize(): int64
        set fontSize(value: int64)
        
        /** Controls the text's horizontal alignment. Supports left, center, right, and fill (also known as justify). */
        get horizontalAlignment(): int64
        set horizontalAlignment(value: int64)
        
        /** Controls the text's vertical alignment. Supports top, center, and bottom. */
        get verticalAlignment(): int64
        set verticalAlignment(value: int64)
        
        /** If `true`, all the text displays as UPPERCASE. */
        get uppercase(): boolean
        set uppercase(value: boolean)
        
        /** Additional vertical spacing between lines (in pixels), spacing is added to line descent. This value can be negative. */
        get lineSpacing(): float64
        set lineSpacing(value: float64)
        
        /** If set to something other than [constant TextServer.AUTOWRAP_OFF], the text gets wrapped inside the node's bounding rectangle. If you resize the node, it will change its height automatically to show all the text. */
        get autowrapMode(): int64
        set autowrapMode(value: int64)
        
        /** Line fill alignment rules. */
        get justificationFlags(): int64
        set justificationFlags(value: int64)
        
        /** The size of one pixel's width on the text to scale it in 3D. This property works in tandem with [member font_size].  
         *      
         *  **Note:** Changing this property will regenerate the mesh, which is a slow operation, especially with large font sizes and long texts. To change the text's size in real-time efficiently, change the node's [member Node3D.scale] instead.  
         */
        get pixelSize(): float64
        set pixelSize(value: float64)
        
        /** Step (in pixels) used to approximate Bézier curves. Lower values result in smoother curves, but is slower to generate and render. Consider adjusting this according to the font size and the typical viewing distance.  
         *      
         *  **Note:** Changing this property will regenerate the mesh, which is a slow operation, especially with large font sizes and long texts.  
         */
        get curveStep(): float64
        set curveStep(value: float64)
        
        /** Depths of the mesh, if set to `0.0` only front surface, is generated, and UV layout is changed to use full texture for the front face only. */
        get depth(): float64
        set depth(value: float64)
        
        /** Text width (in pixels), used for fill alignment. */
        get width(): float64
        set width(value: float64)
        
        /** The text drawing offset (in pixels).  
         *      
         *  **Note:** Changing this property will regenerate the mesh, which is a slow operation. To change the text's position in real-time efficiently, change the node's [member Node3D.position] instead.  
         */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** Base text writing direction. */
        get textDirection(): int64
        set textDirection(value: int64)
        
        /** Language code used for line-breaking and text shaping algorithms. If left empty, the current locale is used instead. */
        get language(): string
        set language(value: string)
        
        /** Set BiDi algorithm override for the structured text. */
        get structuredTextBidiOverride(): int64
        set structuredTextBidiOverride(value: int64)
        
        /** Set additional options for BiDi override. */
        get structuredTextBidiOverrideOptions(): GArray
        set structuredTextBidiOverrideOptions(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextParagraph extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextParagraph extends __NameMapRefCounted {
        get_inferred_direction: "getInferredDirection";
        set_bidi_override: "setBidiOverride";
        set_dropcap: "setDropcap";
        clear_dropcap: "clearDropcap";
        add_string: "addString";
        add_object: "addObject";
        resize_object: "resizeObject";
        has_object: "hasObject";
        tab_align: "tabAlign";
        get_non_wrapped_size: "getNonWrappedSize";
        get_size: "getSize";
        get_rid: "getRid";
        get_line_rid: "getLineRid";
        get_dropcap_rid: "getDropcapRid";
        get_range: "getRange";
        get_line_count: "getLineCount";
        get_line_objects: "getLineObjects";
        get_line_object_rect: "getLineObjectRect";
        get_line_size: "getLineSize";
        get_line_range: "getLineRange";
        get_line_ascent: "getLineAscent";
        get_line_descent: "getLineDescent";
        get_line_width: "getLineWidth";
        get_line_underline_position: "getLineUnderlinePosition";
        get_line_underline_thickness: "getLineUnderlineThickness";
        get_dropcap_size: "getDropcapSize";
        get_dropcap_lines: "getDropcapLines";
        draw_outline: "drawOutline";
        draw_line: "drawLine";
        draw_line_outline: "drawLineOutline";
        draw_dropcap: "drawDropcap";
        draw_dropcap_outline: "drawDropcapOutline";
        hit_test: "hitTest";
        custom_punctuation: "customPunctuation";
        preserve_invalid: "preserveInvalid";
        preserve_control: "preserveControl";
        break_flags: "breakFlags";
        justification_flags: "justificationFlags";
        text_overrun_behavior: "textOverrunBehavior";
        ellipsis_char: "ellipsisChar";
        max_lines_visible: "maxLinesVisible";
        line_spacing: "lineSpacing";
    }
    /** Holds a paragraph of text.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textparagraph.html  
     */
    class TextParagraph extends RefCounted {
        constructor(identifier?: any)
        /** Clears text paragraph (removes text and inline objects). */
        clear(): void
        
        /** Duplicates this [TextParagraph]. */
        duplicate(): null | TextParagraph
        
        /** Returns the text writing direction inferred by the BiDi algorithm. */
        getInferredDirection(): TextServer.Direction
        
        /** Overrides BiDi for the structured text.  
         *  Override ranges should cover full source text without overlaps. BiDi algorithm will be used on each range separately.  
         */
        setBidiOverride(override: GArray): void
        
        /** Sets drop cap, overrides previously set drop cap. Drop cap (dropped capital) is a decorative element at the beginning of a paragraph that is larger than the rest of the text. */
        setDropcap(text: string, font: Font, fontSize: int64, dropcapMargins?: Rect2 /* = new Rect2(0, 0, 0, 0) */, language?: string /* = '' */): boolean
        
        /** Removes dropcap. */
        clearDropcap(): void
        
        /** Adds text span and font to draw it. */
        addString(text: string, font: Font, fontSize: int64, language?: string /* = '' */, meta?: any /* = {} */): boolean
        
        /** Adds inline object to the text buffer, [param key] must be unique. In the text, object is represented as [param length] object replacement characters. */
        addObject(key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, length?: int64 /* = 1 */, baseline?: float64 /* = 0 */): boolean
        
        /** Sets new size and alignment of embedded object. */
        resizeObject(key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, baseline?: float64 /* = 0 */): boolean
        
        /** Returns `true` if an object with [param key] is embedded in this shaped text buffer. */
        hasObject(key: any): boolean
        
        /** Aligns paragraph to the given tab-stops. */
        tabAlign(tabStops: PackedFloat32Array | float32[]): void
        
        /** Returns the size of the bounding box of the paragraph, without line breaks. */
        getNonWrappedSize(): Vector2
        
        /** Returns the size of the bounding box of the paragraph. */
        getSize(): Vector2
        
        /** Returns TextServer full string buffer RID. */
        getRid(): Rid
        
        /** Returns TextServer line buffer RID. */
        getLineRid(line: int64): Rid
        
        /** Returns drop cap text buffer RID. */
        getDropcapRid(): Rid
        
        /** Returns the character range of the paragraph. */
        getRange(): Vector2I
        
        /** Returns number of lines in the paragraph. */
        getLineCount(): int64
        
        /** Returns array of inline objects in the line. */
        getLineObjects(line: int64): GArray
        
        /** Returns bounding rectangle of the inline object. */
        getLineObjectRect(line: int64, key: any): Rect2
        
        /** Returns size of the bounding box of the line of text. Returned size is rounded up. */
        getLineSize(line: int64): Vector2
        
        /** Returns character range of the line. */
        getLineRange(line: int64): Vector2I
        
        /** Returns the text line ascent (number of pixels above the baseline for horizontal layout or to the left of baseline for vertical). */
        getLineAscent(line: int64): float64
        
        /** Returns the text line descent (number of pixels below the baseline for horizontal layout or to the right of baseline for vertical). */
        getLineDescent(line: int64): float64
        
        /** Returns width (for horizontal layout) or height (for vertical) of the line of text. */
        getLineWidth(line: int64): float64
        
        /** Returns pixel offset of the underline below the baseline. */
        getLineUnderlinePosition(line: int64): float64
        
        /** Returns thickness of the underline. */
        getLineUnderlineThickness(line: int64): float64
        
        /** Returns drop cap bounding box size. */
        getDropcapSize(): Vector2
        
        /** Returns number of lines used by dropcap. */
        getDropcapLines(): int64
        
        /** Draw all lines of the text and drop cap into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        draw(canvas: Rid, pos: Vector2, color?: Color /* = new Color(1, 1, 1, 1) */, dcColor?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw outlines of all lines of the text and drop cap into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawOutline(canvas: Rid, pos: Vector2, outlineSize?: int64 /* = 1 */, color?: Color /* = new Color(1, 1, 1, 1) */, dcColor?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw single line of text into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawLine(canvas: Rid, pos: Vector2, line: int64, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw outline of the single line of text into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawLineOutline(canvas: Rid, pos: Vector2, line: int64, outlineSize?: int64 /* = 1 */, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw drop cap into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawDropcap(canvas: Rid, pos: Vector2, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw drop cap outline into a canvas item at a given position, with [param color]. [param pos] specifies the top left corner of the bounding box. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawDropcapOutline(canvas: Rid, pos: Vector2, outlineSize?: int64 /* = 1 */, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Returns caret character offset at the specified coordinates. This function always returns a valid position. */
        hitTest(coords: Vector2): int64
        
        /** Text writing direction. */
        get direction(): int64
        set direction(value: int64)
        
        /** Custom punctuation character list, used for word breaking. If set to empty string, server defaults are used. */
        get customPunctuation(): string
        set customPunctuation(value: string)
        
        /** Text orientation. */
        get orientation(): int64
        set orientation(value: int64)
        
        /** If set to `true` text will display invalid characters. */
        get preserveInvalid(): boolean
        set preserveInvalid(value: boolean)
        
        /** If set to `true` text will display control characters. */
        get preserveControl(): boolean
        set preserveControl(value: boolean)
        
        /** Paragraph horizontal alignment. */
        get alignment(): int64
        set alignment(value: int64)
        
        /** Line breaking rules. For more info see [TextServer]. */
        get breakFlags(): int64
        set breakFlags(value: int64)
        
        /** Line fill alignment rules. */
        get justificationFlags(): int64
        set justificationFlags(value: int64)
        
        /** The clipping behavior when the text exceeds the paragraph's set width. */
        get textOverrunBehavior(): int64
        set textOverrunBehavior(value: int64)
        
        /** Ellipsis character used for text clipping. */
        get ellipsisChar(): string
        set ellipsisChar(value: string)
        
        /** Paragraph width. */
        get width(): float64
        set width(value: float64)
        
        /** Limits the lines of text shown. */
        get maxLinesVisible(): int64
        set maxLinesVisible(value: int64)
        
        /** Additional vertical spacing between lines (in pixels), spacing is added to line descent. This value can be negative. */
        get lineSpacing(): float64
        set lineSpacing(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextParagraph;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextParagraph;
    }
    namespace TextServer {
        enum FontAntialiasing {
            FontAntialiasingNone = 0,
            FontAntialiasingGray = 1,
            FontAntialiasingLcd = 2,
        }
        enum FontLcdSubpixelLayout {
            FontLcdSubpixelLayoutNone = 0,
            FontLcdSubpixelLayoutHrgb = 1,
            FontLcdSubpixelLayoutHbgr = 2,
            FontLcdSubpixelLayoutVrgb = 3,
            FontLcdSubpixelLayoutVbgr = 4,
            FontLcdSubpixelLayoutMax = 5,
        }
        enum Direction {
            DirectionAuto = 0,
            DirectionLtr = 1,
            DirectionRtl = 2,
            DirectionInherited = 3,
        }
        enum Orientation {
            OrientationHorizontal = 0,
            OrientationVertical = 1,
        }
        enum JustificationFlag {
            JustificationNone = 0,
            JustificationKashida = 1,
            JustificationWordBound = 2,
            JustificationTrimEdgeSpaces = 4,
            JustificationAfterLastTab = 8,
            JustificationConstrainEllipsis = 16,
            JustificationSkipLastLine = 32,
            JustificationSkipLastLineWithVisibleChars = 64,
            JustificationDoNotSkipSingleLine = 128,
        }
        enum AutowrapMode {
            AutowrapOff = 0,
            AutowrapArbitrary = 1,
            AutowrapWord = 2,
            AutowrapWordSmart = 3,
        }
        enum LineBreakFlag {
            BreakNone = 0,
            BreakMandatory = 1,
            BreakWordBound = 2,
            BreakGraphemeBound = 4,
            BreakAdaptive = 8,
            BreakTrimEdgeSpaces = 16,
            BreakTrimIndent = 32,
            BreakTrimStartEdgeSpaces = 64,
            BreakTrimEndEdgeSpaces = 128,
        }
        enum VisibleCharactersBehavior {
            VcCharsBeforeShaping = 0,
            VcCharsAfterShaping = 1,
            VcGlyphsAuto = 2,
            VcGlyphsLtr = 3,
            VcGlyphsRtl = 4,
        }
        enum OverrunBehavior {
            OverrunNoTrimming = 0,
            OverrunTrimChar = 1,
            OverrunTrimWord = 2,
            OverrunTrimEllipsis = 3,
            OverrunTrimWordEllipsis = 4,
            OverrunTrimEllipsisForce = 5,
            OverrunTrimWordEllipsisForce = 6,
        }
        enum TextOverrunFlag {
            OverrunNoTrim = 0,
            OverrunTrim = 1,
            OverrunTrimWordOnly = 2,
            OverrunAddEllipsis = 4,
            OverrunEnforceEllipsis = 8,
            OverrunJustificationAware = 16,
            OverrunShortStringEllipsis = 32,
        }
        enum GraphemeFlag {
            GraphemeIsValid = 1,
            GraphemeIsRtl = 2,
            GraphemeIsVirtual = 4,
            GraphemeIsSpace = 8,
            GraphemeIsBreakHard = 16,
            GraphemeIsBreakSoft = 32,
            GraphemeIsTab = 64,
            GraphemeIsElongation = 128,
            GraphemeIsPunctuation = 256,
            GraphemeIsUnderscore = 512,
            GraphemeIsConnected = 1024,
            GraphemeIsSafeToInsertTatweel = 2048,
            GraphemeIsEmbeddedObject = 4096,
            GraphemeIsSoftHyphen = 8192,
        }
        enum Hinting {
            HintingNone = 0,
            HintingLight = 1,
            HintingNormal = 2,
        }
        enum SubpixelPositioning {
            SubpixelPositioningDisabled = 0,
            SubpixelPositioningAuto = 1,
            SubpixelPositioningOneHalf = 2,
            SubpixelPositioningOneQuarter = 3,
            SubpixelPositioningOneHalfMaxSize = 20,
            SubpixelPositioningOneQuarterMaxSize = 16,
        }
        enum Feature {
            FeatureSimpleLayout = 1,
            FeatureBidiLayout = 2,
            FeatureVerticalLayout = 4,
            FeatureShaping = 8,
            FeatureKashidaJustification = 16,
            FeatureBreakIterators = 32,
            FeatureFontBitmap = 64,
            FeatureFontDynamic = 128,
            FeatureFontMsdf = 256,
            FeatureFontSystem = 512,
            FeatureFontVariable = 1024,
            FeatureContextSensitiveCaseConversion = 2048,
            FeatureUseSupportData = 4096,
            FeatureUnicodeIdentifiers = 8192,
            FeatureUnicodeSecurity = 16384,
        }
        enum ContourPointTag {
            ContourCurveTagOn = 1,
            ContourCurveTagOffConic = 0,
            ContourCurveTagOffCubic = 2,
        }
        enum SpacingType {
            SpacingGlyph = 0,
            SpacingSpace = 1,
            SpacingTop = 2,
            SpacingBottom = 3,
            SpacingMax = 4,
        }
        enum FontStyle {
            FontBold = 1,
            FontItalic = 2,
            FontFixedWidth = 4,
        }
        enum StructuredTextParser {
            StructuredTextDefault = 0,
            StructuredTextUri = 1,
            StructuredTextFile = 2,
            StructuredTextEmail = 3,
            StructuredTextList = 4,
            StructuredTextGdscript = 5,
            StructuredTextCustom = 6,
        }
        enum FixedSizeScaleMode {
            FixedSizeScaleDisable = 0,
            FixedSizeScaleIntegerOnly = 1,
            FixedSizeScaleEnabled = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextServer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextServer extends __NameMapRefCounted {
        has_feature: "hasFeature";
        get_name: "getName";
        get_short_name: "getShortName";
        get_features: "getFeatures";
        load_support_data: "loadSupportData";
        get_support_data_filename: "getSupportDataFileName";
        get_support_data_info: "getSupportDataInfo";
        save_support_data: "saveSupportData";
        get_support_data: "getSupportData";
        is_locale_using_support_data: "isLocaleUsingSupportData";
        is_locale_right_to_left: "isLocaleRightToLeft";
        name_to_tag: "nameToTag";
        tag_to_name: "tagToName";
        free_rid: "freeRid";
        create_font: "createFont";
        create_font_linked_variation: "createFontLinkedVariation";
        font_set_data: "fontSetData";
        font_set_face_index: "fontSetFaceIndex";
        font_get_face_index: "fontGetFaceIndex";
        font_get_face_count: "fontGetFaceCount";
        font_set_style: "fontSetStyle";
        font_get_style: "fontGetStyle";
        font_set_name: "fontSetName";
        font_get_name: "fontGetName";
        font_get_ot_name_strings: "fontGetOtNameStrings";
        font_set_style_name: "fontSetStyleName";
        font_get_style_name: "fontGetStyleName";
        font_set_weight: "fontSetWeight";
        font_get_weight: "fontGetWeight";
        font_set_stretch: "fontSetStretch";
        font_get_stretch: "fontGetStretch";
        font_set_antialiasing: "fontSetAntialiasing";
        font_get_antialiasing: "fontGetAntialiasing";
        font_set_disable_embedded_bitmaps: "fontSetDisableEmbeddedBitmaps";
        font_get_disable_embedded_bitmaps: "fontGetDisableEmbeddedBitmaps";
        font_set_generate_mipmaps: "fontSetGenerateMipmaps";
        font_get_generate_mipmaps: "fontGetGenerateMipmaps";
        font_set_multichannel_signed_distance_field: "fontSetMultichannelSignedDistanceField";
        font_is_multichannel_signed_distance_field: "fontIsMultichannelSignedDistanceField";
        font_set_msdf_pixel_range: "fontSetMsdfPixelRange";
        font_get_msdf_pixel_range: "fontGetMsdfPixelRange";
        font_set_msdf_size: "fontSetMsdfSize";
        font_get_msdf_size: "fontGetMsdfSize";
        font_set_fixed_size: "fontSetFixedSize";
        font_get_fixed_size: "fontGetFixedSize";
        font_set_fixed_size_scale_mode: "fontSetFixedSizeScaleMode";
        font_get_fixed_size_scale_mode: "fontGetFixedSizeScaleMode";
        font_set_allow_system_fallback: "fontSetAllowSystemFallback";
        font_is_allow_system_fallback: "fontIsAllowSystemFallback";
        font_clear_system_fallback_cache: "fontClearSystemFallbackCache";
        font_set_force_autohinter: "fontSetForceAutohinter";
        font_is_force_autohinter: "fontIsForceAutohinter";
        font_set_modulate_color_glyphs: "fontSetModulateColorGlyphs";
        font_is_modulate_color_glyphs: "fontIsModulateColorGlyphs";
        font_get_palette_count: "fontGetPaletteCount";
        font_get_palette_name: "fontGetPaletteName";
        font_get_palette_colors: "fontGetPaletteColors";
        font_set_palette_custom_colors: "fontSetPaletteCustomColors";
        font_get_palette_custom_colors: "fontGetPaletteCustomColors";
        font_get_used_palette: "fontGetUsedPalette";
        font_set_used_palette: "fontSetUsedPalette";
        font_set_hinting: "fontSetHinting";
        font_get_hinting: "fontGetHinting";
        font_set_subpixel_positioning: "fontSetSubpixelPositioning";
        font_get_subpixel_positioning: "fontGetSubpixelPositioning";
        font_set_keep_rounding_remainders: "fontSetKeepRoundingRemainders";
        font_get_keep_rounding_remainders: "fontGetKeepRoundingRemainders";
        font_set_embolden: "fontSetEmbolden";
        font_get_embolden: "fontGetEmbolden";
        font_set_spacing: "fontSetSpacing";
        font_get_spacing: "fontGetSpacing";
        font_set_baseline_offset: "fontSetBaselineOffset";
        font_get_baseline_offset: "fontGetBaselineOffset";
        font_set_transform: "fontSetTransform";
        font_get_transform: "fontGetTransform";
        font_set_variation_coordinates: "fontSetVariationCoordinates";
        font_get_variation_coordinates: "fontGetVariationCoordinates";
        font_set_oversampling: "fontSetOversampling";
        font_get_oversampling: "fontGetOversampling";
        font_get_size_cache_list: "fontGetSizeCacheList";
        font_clear_size_cache: "fontClearSizeCache";
        font_remove_size_cache: "fontRemoveSizeCache";
        font_get_size_cache_info: "fontGetSizeCacheInfo";
        font_set_ascent: "fontSetAscent";
        font_get_ascent: "fontGetAscent";
        font_set_descent: "fontSetDescent";
        font_get_descent: "fontGetDescent";
        font_set_underline_position: "fontSetUnderlinePosition";
        font_get_underline_position: "fontGetUnderlinePosition";
        font_set_underline_thickness: "fontSetUnderlineThickness";
        font_get_underline_thickness: "fontGetUnderlineThickness";
        font_set_scale: "fontSetScale";
        font_get_scale: "fontGetScale";
        font_get_texture_count: "fontGetTextureCount";
        font_clear_textures: "fontClearTextures";
        font_remove_texture: "fontRemoveTexture";
        font_set_texture_image: "fontSetTextureImage";
        font_get_texture_image: "fontGetTextureImage";
        font_set_texture_offsets: "fontSetTextureOffsets";
        font_get_texture_offsets: "fontGetTextureOffsets";
        font_get_glyph_list: "fontGetGlyphList";
        font_clear_glyphs: "fontClearGlyphs";
        font_remove_glyph: "fontRemoveGlyph";
        font_get_glyph_advance: "fontGetGlyphAdvance";
        font_set_glyph_advance: "fontSetGlyphAdvance";
        font_get_glyph_offset: "fontGetGlyphOffset";
        font_set_glyph_offset: "fontSetGlyphOffset";
        font_get_glyph_size: "fontGetGlyphSize";
        font_set_glyph_size: "fontSetGlyphSize";
        font_get_glyph_uv_rect: "fontGetGlyphUVRect";
        font_set_glyph_uv_rect: "fontSetGlyphUVRect";
        font_get_glyph_texture_idx: "fontGetGlyphTextureIdx";
        font_set_glyph_texture_idx: "fontSetGlyphTextureIdx";
        font_get_glyph_texture_rid: "fontGetGlyphTextureRid";
        font_get_glyph_texture_size: "fontGetGlyphTextureSize";
        font_get_glyph_contours: "fontGetGlyphContours";
        font_get_kerning_list: "fontGetKerningList";
        font_clear_kerning_map: "fontClearKerningMap";
        font_remove_kerning: "fontRemoveKerning";
        font_set_kerning: "fontSetKerning";
        font_get_kerning: "fontGetKerning";
        font_get_glyph_index: "fontGetGlyphIndex";
        font_get_char_from_glyph_index: "fontGetCharFromGlyphIndex";
        font_has_char: "fontHasChar";
        font_get_supported_chars: "fontGetSupportedChars";
        font_get_supported_glyphs: "fontGetSupportedGlyphs";
        font_render_range: "fontRenderRange";
        font_render_glyph: "fontRenderGlyph";
        font_draw_glyph: "fontDrawGlyph";
        font_draw_glyph_outline: "fontDrawGlyphOutline";
        font_is_language_supported: "fontIsLanguageSupported";
        font_set_language_support_override: "fontSetLanguageSupportOverride";
        font_get_language_support_override: "fontGetLanguageSupportOverride";
        font_remove_language_support_override: "fontRemoveLanguageSupportOverride";
        font_get_language_support_overrides: "fontGetLanguageSupportOverrides";
        font_is_script_supported: "fontIsScriptSupported";
        font_set_script_support_override: "fontSetScriptSupportOverride";
        font_get_script_support_override: "fontGetScriptSupportOverride";
        font_remove_script_support_override: "fontRemoveScriptSupportOverride";
        font_get_script_support_overrides: "fontGetScriptSupportOverrides";
        font_set_opentype_feature_overrides: "fontSetOpentypeFeatureOverrides";
        font_get_opentype_feature_overrides: "fontGetOpentypeFeatureOverrides";
        font_supported_feature_list: "fontSupportedFeatureList";
        font_supported_variation_list: "fontSupportedVariationList";
        font_get_global_oversampling: "fontGetGlobalOversampling";
        font_set_global_oversampling: "fontSetGlobalOversampling";
        get_hex_code_box_size: "getHexCodeBoxSize";
        draw_hex_code_box: "drawHexCodeBox";
        create_shaped_text: "createShapedText";
        shaped_text_clear: "shapedTextClear";
        shaped_text_duplicate: "shapedTextDuplicate";
        shaped_text_set_direction: "shapedTextSetDirection";
        shaped_text_get_direction: "shapedTextGetDirection";
        shaped_text_get_inferred_direction: "shapedTextGetInferredDirection";
        shaped_text_set_bidi_override: "shapedTextSetBidiOverride";
        shaped_text_set_custom_punctuation: "shapedTextSetCustomPunctuation";
        shaped_text_get_custom_punctuation: "shapedTextGetCustomPunctuation";
        shaped_text_set_custom_ellipsis: "shapedTextSetCustomEllipsis";
        shaped_text_get_custom_ellipsis: "shapedTextGetCustomEllipsis";
        shaped_text_set_orientation: "shapedTextSetOrientation";
        shaped_text_get_orientation: "shapedTextGetOrientation";
        shaped_text_set_preserve_invalid: "shapedTextSetPreserveInvalid";
        shaped_text_get_preserve_invalid: "shapedTextGetPreserveInvalid";
        shaped_text_set_preserve_control: "shapedTextSetPreserveControl";
        shaped_text_get_preserve_control: "shapedTextGetPreserveControl";
        shaped_text_set_spacing: "shapedTextSetSpacing";
        shaped_text_get_spacing: "shapedTextGetSpacing";
        shaped_text_add_string: "shapedTextAddString";
        shaped_text_add_object: "shapedTextAddObject";
        shaped_text_resize_object: "shapedTextResizeObject";
        shaped_text_has_object: "shapedTextHasObject";
        shaped_get_text: "shapedGetText";
        shaped_get_span_count: "shapedGetSpanCount";
        shaped_get_span_meta: "shapedGetSpanMeta";
        shaped_get_span_embedded_object: "shapedGetSpanEmbeddedObject";
        shaped_get_span_text: "shapedGetSpanText";
        shaped_get_span_object: "shapedGetSpanObject";
        shaped_set_span_update_font: "shapedSetSpanUpdateFont";
        shaped_get_run_count: "shapedGetRunCount";
        shaped_get_run_text: "shapedGetRunText";
        shaped_get_run_range: "shapedGetRunRange";
        shaped_get_run_glyph_range: "shapedGetRunGlyphRange";
        shaped_get_run_font_rid: "shapedGetRunFontRid";
        shaped_get_run_font_size: "shapedGetRunFontSize";
        shaped_get_run_language: "shapedGetRunLanguage";
        shaped_get_run_direction: "shapedGetRunDirection";
        shaped_get_run_object: "shapedGetRunObject";
        shaped_text_substr: "shapedTextSubstr";
        shaped_text_get_parent: "shapedTextGetParent";
        shaped_text_fit_to_width: "shapedTextFitToWidth";
        shaped_text_tab_align: "shapedTextTabAlign";
        shaped_text_shape: "shapedTextShape";
        shaped_text_is_ready: "shapedTextIsReady";
        shaped_text_has_visible_chars: "shapedTextHasVisibleChars";
        shaped_text_get_glyphs: "shapedTextGetGlyphs";
        shaped_text_sort_logical: "shapedTextSortLogical";
        shaped_text_get_glyph_count: "shapedTextGetGlyphCount";
        shaped_text_get_range: "shapedTextGetRange";
        shaped_text_get_line_breaks_adv: "shapedTextGetLineBreaksAdv";
        shaped_text_get_line_breaks: "shapedTextGetLineBreaks";
        shaped_text_get_word_breaks: "shapedTextGetWordBreaks";
        shaped_text_get_trim_pos: "shapedTextGetTrimPos";
        shaped_text_get_ellipsis_pos: "shapedTextGetEllipsisPos";
        shaped_text_get_ellipsis_glyphs: "shapedTextGetEllipsisGlyphs";
        shaped_text_get_ellipsis_glyph_count: "shapedTextGetEllipsisGlyphCount";
        shaped_text_overrun_trim_to_width: "shapedTextOverrunTrimToWidth";
        shaped_text_get_objects: "shapedTextGetObjects";
        shaped_text_get_object_rect: "shapedTextGetObjectRect";
        shaped_text_get_object_range: "shapedTextGetObjectRange";
        shaped_text_get_object_glyph: "shapedTextGetObjectGlyph";
        shaped_text_get_size: "shapedTextGetSize";
        shaped_text_get_ascent: "shapedTextGetAscent";
        shaped_text_get_descent: "shapedTextGetDescent";
        shaped_text_get_width: "shapedTextGetWidth";
        shaped_text_get_underline_position: "shapedTextGetUnderlinePosition";
        shaped_text_get_underline_thickness: "shapedTextGetUnderlineThickness";
        shaped_text_get_carets: "shapedTextGetCarets";
        shaped_text_get_selection: "shapedTextGetSelection";
        shaped_text_hit_test_grapheme: "shapedTextHitTestGrapheme";
        shaped_text_hit_test_position: "shapedTextHitTestPosition";
        shaped_text_get_grapheme_bounds: "shapedTextGetGraphemeBounds";
        shaped_text_next_grapheme_pos: "shapedTextNextGraphemePos";
        shaped_text_prev_grapheme_pos: "shapedTextPrevGraphemePos";
        shaped_text_get_character_breaks: "shapedTextGetCharacterBreaks";
        shaped_text_next_character_pos: "shapedTextNextCharacterPos";
        shaped_text_prev_character_pos: "shapedTextPrevCharacterPos";
        shaped_text_closest_character_pos: "shapedTextClosestCharacterPos";
        shaped_text_draw: "shapedTextDraw";
        shaped_text_draw_outline: "shapedTextDrawOutline";
        shaped_text_get_dominant_direction_in_range: "shapedTextGetDominantDirectionInRange";
        format_number: "formatNumber";
        parse_number: "parseNumber";
        percent_sign: "percentSign";
        string_get_word_breaks: "stringGetWordBreaks";
        string_get_character_breaks: "stringGetCharacterBreaks";
        is_confusable: "isConfusable";
        spoof_check: "spoofCheck";
        strip_diacritics: "stripDiacritics";
        is_valid_identifier: "isValidIdentifier";
        is_valid_letter: "isValidLetter";
        string_to_upper: "stringToUpper";
        string_to_lower: "stringToLower";
        string_to_title: "stringToTitle";
        parse_structured_text: "parseStructuredText";
    }
    /** A server interface for font management and text rendering.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textserver.html  
     */
    class TextServer extends RefCounted {
        constructor(identifier?: any)
        /** Returns `true` if the server supports a feature. */
        hasFeature(feature: TextServer.Feature): boolean
        
        /** Returns the name of the server interface. */
        getName(): string
        
        /** Returns the short name of the server interface. This short name can be used as a value for the `--text-driver` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url] (the full name is also supported for compatibility, but it must be quoted if it contains spaces). */
        getShortName(): string
        
        /** Returns text server features, see [enum Feature]. */
        getFeatures(): int64
        
        /** Loads optional TextServer database (e.g. ICU break iterators and dictionaries).  
         *      
         *  **Note:** This function should be called before any other TextServer functions used, otherwise it won't have any effect.  
         */
        loadSupportData(filename: string): boolean
        
        /** Returns default TextServer database (e.g. ICU break iterators and dictionaries) filename. */
        getSupportDataFileName(): string
        
        /** Returns TextServer database (e.g. ICU break iterators and dictionaries) description. */
        getSupportDataInfo(): string
        
        /** Saves optional TextServer database (e.g. ICU break iterators and dictionaries) to the file.  
         *      
         *  **Note:** This function is used by during project export, to include TextServer database.  
         */
        saveSupportData(filename: string): boolean
        
        /** Returns default TextServer database (e.g. ICU break iterators and dictionaries). */
        getSupportData(): PackedByteArray
        
        /** Returns `true` if the locale requires text server support data for line/word breaking. */
        isLocaleUsingSupportData(locale: string): boolean
        
        /** Returns `true` if locale is right-to-left. */
        isLocaleRightToLeft(locale: string): boolean
        
        /** Converts the given readable name of a feature, variation, script, or language to an OpenType tag. */
        nameToTag(name: string): int64
        
        /** Converts the given OpenType tag to the readable name of a feature, variation, script, or language. */
        tagToName(tag: int64): string
        
        /** Returns `true` if [param rid] is valid resource owned by this text server. */
        has(rid: Rid): boolean
        
        /** Frees an object created by this [TextServer]. */
        freeRid(rid: Rid): void
        
        /** Creates a new, empty font cache entry resource. To free the resulting resource, use the [method free_rid] method. */
        createFont(): Rid
        
        /** Creates a new variation existing font which is reusing the same glyph cache and font data. To free the resulting resource, use the [method free_rid] method. */
        createFontLinkedVariation(fontRid: Rid): Rid
        
        /** Sets font source data, e.g contents of the dynamic font source file. */
        fontSetData(fontRid: Rid, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Sets an active face index in the TrueType / OpenType collection. */
        fontSetFaceIndex(fontRid: Rid, faceIndex: int64): void
        
        /** Returns an active face index in the TrueType / OpenType collection. */
        fontGetFaceIndex(fontRid: Rid): int64
        
        /** Returns number of faces in the TrueType / OpenType collection. */
        fontGetFaceCount(fontRid: Rid): int64
        
        /** Sets the font style flags.  
         *      
         *  **Note:** This value is used for font matching only and will not affect font rendering. Use [method font_set_face_index], [method font_set_variation_coordinates], [method font_set_embolden], or [method font_set_transform] instead.  
         */
        fontSetStyle(fontRid: Rid, style: TextServer.FontStyle): void
        
        /** Returns font style flags. */
        fontGetStyle(fontRid: Rid): TextServer.FontStyle
        
        /** Sets the font family name. */
        fontSetName(fontRid: Rid, name: string): void
        
        /** Returns font family name. */
        fontGetName(fontRid: Rid): string
        
        /** Returns [Dictionary] with OpenType font name strings (localized font names, version, description, license information, sample text, etc.). */
        fontGetOtNameStrings(fontRid: Rid): GDictionary
        
        /** Sets the font style name. */
        fontSetStyleName(fontRid: Rid, name: string): void
        
        /** Returns font style name. */
        fontGetStyleName(fontRid: Rid): string
        
        /** Sets weight (boldness) of the font. A value in the `100...999` range, normal font weight is `400`, bold font weight is `700`.  
         *      
         *  **Note:** This value is used for font matching only and will not affect font rendering. Use [method font_set_face_index], [method font_set_variation_coordinates], or [method font_set_embolden] instead.  
         */
        fontSetWeight(fontRid: Rid, weight: int64): void
        
        /** Returns weight (boldness) of the font. A value in the `100...999` range, normal font weight is `400`, bold font weight is `700`. */
        fontGetWeight(fontRid: Rid): int64
        
        /** Sets font stretch amount, compared to a normal width. A percentage value between `50%` and `200%`.  
         *      
         *  **Note:** This value is used for font matching only and will not affect font rendering. Use [method font_set_face_index], [method font_set_variation_coordinates], or [method font_set_transform] instead.  
         */
        fontSetStretch(fontRid: Rid, weight: int64): void
        
        /** Returns font stretch amount, compared to a normal width. A percentage value between `50%` and `200%`. */
        fontGetStretch(fontRid: Rid): int64
        
        /** Sets font anti-aliasing mode. */
        fontSetAntialiasing(fontRid: Rid, antialiasing: TextServer.FontAntialiasing): void
        
        /** Returns font anti-aliasing mode. */
        fontGetAntialiasing(fontRid: Rid): TextServer.FontAntialiasing
        
        /** If set to `true`, embedded font bitmap loading is disabled (bitmap-only and color fonts ignore this property). */
        fontSetDisableEmbeddedBitmaps(fontRid: Rid, disableEmbeddedBitmaps: boolean): void
        
        /** Returns whether the font's embedded bitmap loading is disabled. */
        fontGetDisableEmbeddedBitmaps(fontRid: Rid): boolean
        
        /** If set to `true` font texture mipmap generation is enabled. */
        fontSetGenerateMipmaps(fontRid: Rid, generateMipmaps: boolean): void
        
        /** Returns `true` if font texture mipmap generation is enabled. */
        fontGetGenerateMipmaps(fontRid: Rid): boolean
        
        /** If set to `true`, glyphs of all sizes are rendered using single multichannel signed distance field generated from the dynamic font vector data. MSDF rendering allows displaying the font at any scaling factor without blurriness, and without incurring a CPU cost when the font size changes (since the font no longer needs to be rasterized on the CPU). As a downside, font hinting is not available with MSDF. The lack of font hinting may result in less crisp and less readable fonts at small sizes.  
         *      
         *  **Note:** MSDF font rendering does not render glyphs with overlapping shapes correctly. Overlapping shapes are not valid per the OpenType standard, but are still commonly found in many font files, especially those converted by Google Fonts. To avoid issues with overlapping glyphs, consider downloading the font file directly from the type foundry instead of relying on Google Fonts.  
         */
        fontSetMultichannelSignedDistanceField(fontRid: Rid, msdf: boolean): void
        
        /** Returns `true` if glyphs of all sizes are rendered using single multichannel signed distance field generated from the dynamic font vector data. */
        fontIsMultichannelSignedDistanceField(fontRid: Rid): boolean
        
        /** Sets the width of the range around the shape between the minimum and maximum representable signed distance. */
        fontSetMsdfPixelRange(fontRid: Rid, msdfPixelRange: int64): void
        
        /** Returns the width of the range around the shape between the minimum and maximum representable signed distance. */
        fontGetMsdfPixelRange(fontRid: Rid): int64
        
        /** Sets source font size used to generate MSDF textures. */
        fontSetMsdfSize(fontRid: Rid, msdfSize: int64): void
        
        /** Returns source font size used to generate MSDF textures. */
        fontGetMsdfSize(fontRid: Rid): int64
        
        /** Sets bitmap font fixed size. If set to value greater than zero, same cache entry will be used for all font sizes. */
        fontSetFixedSize(fontRid: Rid, fixedSize: int64): void
        
        /** Returns bitmap font fixed size. */
        fontGetFixedSize(fontRid: Rid): int64
        
        /** Sets bitmap font scaling mode. This property is used only if `fixed_size` is greater than zero. */
        fontSetFixedSizeScaleMode(fontRid: Rid, fixedSizeScaleMode: TextServer.FixedSizeScaleMode): void
        
        /** Returns bitmap font scaling mode. */
        fontGetFixedSizeScaleMode(fontRid: Rid): TextServer.FixedSizeScaleMode
        
        /** If set to `true`, system fonts can be automatically used as fallbacks. */
        fontSetAllowSystemFallback(fontRid: Rid, allowSystemFallback: boolean): void
        
        /** Returns `true` if system fonts can be automatically used as fallbacks. */
        fontIsAllowSystemFallback(fontRid: Rid): boolean
        
        /** Frees all automatically loaded system fonts. */
        fontClearSystemFallbackCache(): void
        
        /** If set to `true` auto-hinting is preferred over font built-in hinting. */
        fontSetForceAutohinter(fontRid: Rid, forceAutohinter: boolean): void
        
        /** Returns `true` if auto-hinting is supported and preferred over font built-in hinting. Used by dynamic fonts only. */
        fontIsForceAutohinter(fontRid: Rid): boolean
        
        /** If set to `true`, color modulation is applied when drawing colored glyphs, otherwise it's applied to the monochrome glyphs only. */
        fontSetModulateColorGlyphs(fontRid: Rid, modulate: boolean): void
        
        /** Returns `true` if color modulation is applied when drawing the font's colored glyphs. */
        fontIsModulateColorGlyphs(fontRid: Rid): boolean
        
        /** Returns the number of predefined color palettes. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. */
        fontGetPaletteCount(fontRid: Rid): int64
        
        /** Returns the name of the predefined color palette at [param index]. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. */
        fontGetPaletteName(fontRid: Rid, index: int64): string
        
        /** Returns the array in the predefined color palette at [param index]. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. Colors can be overridden using [method font_set_palette_custom_colors]. */
        fontGetPaletteColors(fontRid: Rid, index: int64): PackedColorArray
        
        /** Sets array of custom colors to override predefined palette. Set to empty array to reset overrides. Use `Color(0, 0, 0, 0)`, to keep predefined palette color at specific position. */
        fontSetPaletteCustomColors(fontRid: Rid, colors: PackedColorArray | Color[]): void
        
        /** Returns array of custom colors to override predefined palette. */
        fontGetPaletteCustomColors(fontRid: Rid): PackedColorArray
        
        /** Returns used palette index. */
        fontGetUsedPalette(fontRid: Rid): int64
        
        /** Sets used palette index. */
        fontSetUsedPalette(fontRid: Rid, index: int64): void
        
        /** Sets font hinting mode. Used by dynamic fonts only. */
        fontSetHinting(fontRid: Rid, hinting: TextServer.Hinting): void
        
        /** Returns the font hinting mode. Used by dynamic fonts only. */
        fontGetHinting(fontRid: Rid): TextServer.Hinting
        
        /** Sets font subpixel glyph positioning mode. */
        fontSetSubpixelPositioning(fontRid: Rid, subpixelPositioning: TextServer.SubpixelPositioning): void
        
        /** Returns font subpixel glyph positioning mode. */
        fontGetSubpixelPositioning(fontRid: Rid): TextServer.SubpixelPositioning
        
        /** Sets glyph position rounding behavior. If set to `true`, when aligning glyphs to the pixel boundaries rounding remainders are accumulated to ensure more uniform glyph distribution. This setting has no effect if subpixel positioning is enabled. */
        fontSetKeepRoundingRemainders(fontRid: Rid, keepRoundingRemainders: boolean): void
        
        /** Returns glyph position rounding behavior. If set to `true`, when aligning glyphs to the pixel boundaries rounding remainders are accumulated to ensure more uniform glyph distribution. This setting has no effect if subpixel positioning is enabled. */
        fontGetKeepRoundingRemainders(fontRid: Rid): boolean
        
        /** Sets font embolden strength. If [param strength] is not equal to zero, emboldens the font outlines. Negative values reduce the outline thickness. */
        fontSetEmbolden(fontRid: Rid, strength: float64): void
        
        /** Returns font embolden strength. */
        fontGetEmbolden(fontRid: Rid): float64
        
        /** Sets the spacing for [param spacing] to [param value] in pixels (not relative to the font size). */
        fontSetSpacing(fontRid: Rid, spacing: TextServer.SpacingType, value: int64): void
        
        /** Returns the spacing for [param spacing] in pixels (not relative to the font size). */
        fontGetSpacing(fontRid: Rid, spacing: TextServer.SpacingType): int64
        
        /** Sets extra baseline offset (as a fraction of font height). */
        fontSetBaselineOffset(fontRid: Rid, baselineOffset: float64): void
        
        /** Returns extra baseline offset (as a fraction of font height). */
        fontGetBaselineOffset(fontRid: Rid): float64
        
        /** Sets 2D transform, applied to the font outlines, can be used for slanting, flipping, and rotating glyphs.  
         *  For example, to simulate italic typeface by slanting, apply the following transform `Transform2D(1.0, slant, 0.0, 1.0, 0.0, 0.0)`.  
         */
        fontSetTransform(fontRid: Rid, transform: Transform2D): void
        
        /** Returns 2D transform applied to the font outlines. */
        fontGetTransform(fontRid: Rid): Transform2D
        
        /** Sets variation coordinates for the specified font cache entry. See [method font_supported_variation_list] for more info. */
        fontSetVariationCoordinates(fontRid: Rid, variationCoordinates: GDictionary): void
        
        /** Returns variation coordinates for the specified font cache entry. See [method font_supported_variation_list] for more info. */
        fontGetVariationCoordinates(fontRid: Rid): GDictionary
        
        /** If set to a positive value, overrides the oversampling factor of the viewport this font is used in. See [member Viewport.oversampling]. This value doesn't override the [code skip-lint]oversampling` parameter of [code skip-lint]draw_*` methods. Used by dynamic fonts only. */
        fontSetOversampling(fontRid: Rid, oversampling: float64): void
        
        /** Returns oversampling factor override. If set to a positive value, overrides the oversampling factor of the viewport this font is used in. See [member Viewport.oversampling]. This value doesn't override the [code skip-lint]oversampling` parameter of [code skip-lint]draw_*` methods. Used by dynamic fonts only. */
        fontGetOversampling(fontRid: Rid): float64
        
        /** Returns list of the font sizes in the cache. Each size is [Vector2i] with font size and outline size. */
        fontGetSizeCacheList(fontRid: Rid): GArray<Vector2I>
        
        /** Removes all font sizes from the cache entry. */
        fontClearSizeCache(fontRid: Rid): void
        
        /** Removes specified font size from the cache entry. */
        fontRemoveSizeCache(fontRid: Rid, size: Vector2I): void
        
        /** Returns font cache information, each entry contains the following fields: `Vector2i size_px` - font size in pixels, `float viewport_oversampling` - viewport oversampling factor, `int glyphs` - number of rendered glyphs, `int textures` - number of used textures, `int textures_size` - size of texture data in bytes. */
        fontGetSizeCacheInfo(fontRid: Rid): GArray<GDictionary>
        
        /** Sets the font ascent (number of pixels above the baseline). */
        fontSetAscent(fontRid: Rid, size: int64, ascent: float64): void
        
        /** Returns the font ascent (number of pixels above the baseline). */
        fontGetAscent(fontRid: Rid, size: int64): float64
        
        /** Sets the font descent (number of pixels below the baseline). */
        fontSetDescent(fontRid: Rid, size: int64, descent: float64): void
        
        /** Returns the font descent (number of pixels below the baseline). */
        fontGetDescent(fontRid: Rid, size: int64): float64
        
        /** Sets pixel offset of the underline below the baseline. */
        fontSetUnderlinePosition(fontRid: Rid, size: int64, underlinePosition: float64): void
        
        /** Returns pixel offset of the underline below the baseline. */
        fontGetUnderlinePosition(fontRid: Rid, size: int64): float64
        
        /** Sets thickness of the underline in pixels. */
        fontSetUnderlineThickness(fontRid: Rid, size: int64, underlineThickness: float64): void
        
        /** Returns thickness of the underline in pixels. */
        fontGetUnderlineThickness(fontRid: Rid, size: int64): float64
        
        /** Sets scaling factor of the color bitmap font. */
        fontSetScale(fontRid: Rid, size: int64, scale: float64): void
        
        /** Returns scaling factor of the color bitmap font. */
        fontGetScale(fontRid: Rid, size: int64): float64
        
        /** Returns number of textures used by font cache entry. */
        fontGetTextureCount(fontRid: Rid, size: Vector2I): int64
        
        /** Removes all textures from font cache entry.  
         *      
         *  **Note:** This function will not remove glyphs associated with the texture, use [method font_remove_glyph] to remove them manually.  
         */
        fontClearTextures(fontRid: Rid, size: Vector2I): void
        
        /** Removes specified texture from the cache entry.  
         *      
         *  **Note:** This function will not remove glyphs associated with the texture, remove them manually, using [method font_remove_glyph].  
         */
        fontRemoveTexture(fontRid: Rid, size: Vector2I, textureIndex: int64): void
        
        /** Sets font cache texture image data. */
        fontSetTextureImage(fontRid: Rid, size: Vector2I, textureIndex: int64, image: Image): void
        
        /** Returns font cache texture image data. */
        fontGetTextureImage(fontRid: Rid, size: Vector2I, textureIndex: int64): null | Image
        
        /** Sets array containing glyph packing data. */
        fontSetTextureOffsets(fontRid: Rid, size: Vector2I, textureIndex: int64, offset: PackedInt32Array | int32[]): void
        
        /** Returns array containing glyph packing data. */
        fontGetTextureOffsets(fontRid: Rid, size: Vector2I, textureIndex: int64): PackedInt32Array
        
        /** Returns list of rendered glyphs in the cache entry. */
        fontGetGlyphList(fontRid: Rid, size: Vector2I): PackedInt32Array
        
        /** Removes all rendered glyph information from the cache entry.  
         *      
         *  **Note:** This function will not remove textures associated with the glyphs, use [method font_remove_texture] to remove them manually.  
         */
        fontClearGlyphs(fontRid: Rid, size: Vector2I): void
        
        /** Removes specified rendered glyph information from the cache entry.  
         *      
         *  **Note:** This function will not remove textures associated with the glyphs, use [method font_remove_texture] to remove them manually.  
         */
        fontRemoveGlyph(fontRid: Rid, size: Vector2I, glyph: int64): void
        
        /** Returns glyph advance (offset of the next glyph).  
         *      
         *  **Note:** Advance for glyphs outlines is the same as the base glyph advance and is not saved.  
         */
        fontGetGlyphAdvance(fontRid: Rid, size: int64, glyph: int64): Vector2
        
        /** Sets glyph advance (offset of the next glyph).  
         *      
         *  **Note:** Advance for glyphs outlines is the same as the base glyph advance and is not saved.  
         */
        fontSetGlyphAdvance(fontRid: Rid, size: int64, glyph: int64, advance: Vector2): void
        
        /** Returns glyph offset from the baseline. */
        fontGetGlyphOffset(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Sets glyph offset from the baseline. */
        fontSetGlyphOffset(fontRid: Rid, size: Vector2I, glyph: int64, offset: Vector2): void
        
        /** Returns size of the glyph. */
        fontGetGlyphSize(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Sets size of the glyph. */
        fontSetGlyphSize(fontRid: Rid, size: Vector2I, glyph: int64, glSize: Vector2): void
        
        /** Returns rectangle in the cache texture containing the glyph. */
        fontGetGlyphUVRect(fontRid: Rid, size: Vector2I, glyph: int64): Rect2
        
        /** Sets rectangle in the cache texture containing the glyph. */
        fontSetGlyphUVRect(fontRid: Rid, size: Vector2I, glyph: int64, uVRect: Rect2): void
        
        /** Returns index of the cache texture containing the glyph. */
        fontGetGlyphTextureIdx(fontRid: Rid, size: Vector2I, glyph: int64): int64
        
        /** Sets index of the cache texture containing the glyph. */
        fontSetGlyphTextureIdx(fontRid: Rid, size: Vector2I, glyph: int64, textureIdx: int64): void
        
        /** Returns resource ID of the cache texture containing the glyph.  
         *      
         *  **Note:** If there are pending glyphs to render, calling this function might trigger the texture cache update.  
         */
        fontGetGlyphTextureRid(fontRid: Rid, size: Vector2I, glyph: int64): Rid
        
        /** Returns size of the cache texture containing the glyph.  
         *      
         *  **Note:** If there are pending glyphs to render, calling this function might trigger the texture cache update.  
         */
        fontGetGlyphTextureSize(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Returns outline contours of the glyph as a [Dictionary] with the following contents:  
         *  `points`         - [PackedVector3Array], containing outline points. `x` and `y` are point coordinates. `z` is the type of the point, using the [enum ContourPointTag] values.  
         *  `contours`       - [PackedInt32Array], containing indices the end points of each contour.  
         *  `orientation`    - [bool], contour orientation. If `true`, clockwise contours must be filled.  
         *  - Two successive [constant CONTOUR_CURVE_TAG_ON] points indicate a line segment.  
         *  - One [constant CONTOUR_CURVE_TAG_OFF_CONIC] point between two [constant CONTOUR_CURVE_TAG_ON] points indicates a single conic (quadratic) Bézier arc.  
         *  - Two [constant CONTOUR_CURVE_TAG_OFF_CUBIC] points between two [constant CONTOUR_CURVE_TAG_ON] points indicate a single cubic Bézier arc.  
         *  - Two successive [constant CONTOUR_CURVE_TAG_OFF_CONIC] points indicate two successive conic (quadratic) Bézier arcs with a virtual [constant CONTOUR_CURVE_TAG_ON] point at their middle.  
         *  - Each contour is closed. The last point of a contour uses the first point of a contour as its next point, and vice versa. The first point can be [constant CONTOUR_CURVE_TAG_OFF_CONIC] point.  
         */
        fontGetGlyphContours(font: Rid, size: int64, index: int64): GDictionary
        
        /** Returns list of the kerning overrides. */
        fontGetKerningList(fontRid: Rid, size: int64): GArray<Vector2I>
        
        /** Removes all kerning overrides. */
        fontClearKerningMap(fontRid: Rid, size: int64): void
        
        /** Removes kerning override for the pair of glyphs. */
        fontRemoveKerning(fontRid: Rid, size: int64, glyphPair: Vector2I): void
        
        /** Sets kerning for the pair of glyphs. */
        fontSetKerning(fontRid: Rid, size: int64, glyphPair: Vector2I, kerning: Vector2): void
        
        /** Returns kerning for the pair of glyphs. */
        fontGetKerning(fontRid: Rid, size: int64, glyphPair: Vector2I): Vector2
        
        /** Returns the glyph index of a [param char], optionally modified by the [param variation_selector]. See [method font_get_char_from_glyph_index]. */
        fontGetGlyphIndex(fontRid: Rid, size: int64, char: int64, variationSelector: int64): int64
        
        /** Returns character code associated with [param glyph_index], or `0` if [param glyph_index] is invalid. See [method font_get_glyph_index]. */
        fontGetCharFromGlyphIndex(fontRid: Rid, size: int64, glyphIndex: int64): int64
        
        /** Returns `true` if a Unicode [param char] is available in the font. */
        fontHasChar(fontRid: Rid, char: int64): boolean
        
        /** Returns a string containing all the characters available in the font. */
        fontGetSupportedChars(fontRid: Rid): string
        
        /** Returns an array containing all glyph indices in the font. */
        fontGetSupportedGlyphs(fontRid: Rid): PackedInt32Array
        
        /** Renders the range of characters to the font cache texture. */
        fontRenderRange(fontRid: Rid, size: Vector2I, start: int64, end: int64): void
        
        /** Renders specified glyph to the font cache texture. */
        fontRenderGlyph(fontRid: Rid, size: Vector2I, index: int64): void
        
        /** Draws single glyph into a canvas item at the position, using [param font_rid] at the size [param size]. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used.  
         *      
         *  **Note:** Glyph index is specific to the font, use glyphs indices returned by [method shaped_text_get_glyphs] or [method font_get_glyph_index].  
         *      
         *  **Note:** If there are pending glyphs to render, calling this function might trigger the texture cache update.  
         */
        fontDrawGlyph(fontRid: Rid, canvas: Rid, size: int64, pos: Vector2, index: int64, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draws single glyph outline of size [param outline_size] into a canvas item at the position, using [param font_rid] at the size [param size]. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used.  
         *      
         *  **Note:** Glyph index is specific to the font, use glyphs indices returned by [method shaped_text_get_glyphs] or [method font_get_glyph_index].  
         *      
         *  **Note:** If there are pending glyphs to render, calling this function might trigger the texture cache update.  
         */
        fontDrawGlyphOutline(fontRid: Rid, canvas: Rid, size: int64, outlineSize: int64, pos: Vector2, index: int64, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Returns `true` if the font supports the given language (as a [url=https://en.wikipedia.org/wiki/ISO_639-1]ISO 639[/url] code). */
        fontIsLanguageSupported(fontRid: Rid, language: string): boolean
        
        /** Adds override for [method font_is_language_supported]. */
        fontSetLanguageSupportOverride(fontRid: Rid, language: string, supported: boolean): void
        
        /** Returns `true` if support override is enabled for the [param language]. */
        fontGetLanguageSupportOverride(fontRid: Rid, language: string): boolean
        
        /** Remove language support override. */
        fontRemoveLanguageSupportOverride(fontRid: Rid, language: string): void
        
        /** Returns list of language support overrides. */
        fontGetLanguageSupportOverrides(fontRid: Rid): PackedStringArray
        
        /** Returns `true` if the font supports the given script (as a [url=https://en.wikipedia.org/wiki/ISO_15924]ISO 15924[/url] code). */
        fontIsScriptSupported(fontRid: Rid, script: string): boolean
        
        /** Adds override for [method font_is_script_supported]. */
        fontSetScriptSupportOverride(fontRid: Rid, script: string, supported: boolean): void
        
        /** Returns `true` if support override is enabled for the [param script]. */
        fontGetScriptSupportOverride(fontRid: Rid, script: string): boolean
        
        /** Removes script support override. */
        fontRemoveScriptSupportOverride(fontRid: Rid, script: string): void
        
        /** Returns list of script support overrides. */
        fontGetScriptSupportOverrides(fontRid: Rid): PackedStringArray
        
        /** Sets font OpenType feature set override. */
        fontSetOpentypeFeatureOverrides(fontRid: Rid, overrides: GDictionary): void
        
        /** Returns font OpenType feature set override. */
        fontGetOpentypeFeatureOverrides(fontRid: Rid): GDictionary
        
        /** Returns the dictionary of the supported OpenType features. */
        fontSupportedFeatureList(fontRid: Rid): GDictionary
        
        /** Returns the dictionary of the supported OpenType variation coordinates. */
        fontSupportedVariationList(fontRid: Rid): GDictionary
        
        /** This method does nothing and always returns `1.0`. */
        fontGetGlobalOversampling(): float64
        
        /** This method does nothing. */
        fontSetGlobalOversampling(oversampling: float64): void
        
        /** Returns size of the replacement character (box with character hexadecimal code that is drawn in place of invalid characters). */
        getHexCodeBoxSize(size: int64, index: int64): Vector2
        
        /** Draws box displaying character hexadecimal code. Used for replacing missing characters. */
        drawHexCodeBox(canvas: Rid, size: int64, pos: Vector2, index: int64, color: Color): void
        
        /** Creates a new buffer for complex text layout, with the given [param direction] and [param orientation]. To free the resulting buffer, use [method free_rid] method.  
         *      
         *  **Note:** Direction is ignored if server does not support [constant FEATURE_BIDI_LAYOUT] feature (supported by [TextServerAdvanced]).  
         *      
         *  **Note:** Orientation is ignored if server does not support [constant FEATURE_VERTICAL_LAYOUT] feature (supported by [TextServerAdvanced]).  
         */
        createShapedText(direction?: TextServer.Direction /* = 0 */, orientation?: TextServer.Orientation /* = 0 */): Rid
        
        /** Clears text buffer (removes text and inline objects). */
        shapedTextClear(rid: Rid): void
        
        /** Duplicates shaped text buffer. */
        shapedTextDuplicate(rid: Rid): Rid
        
        /** Sets desired text direction. If set to [constant DIRECTION_AUTO], direction will be detected based on the buffer contents and current locale.  
         *      
         *  **Note:** Direction is ignored if server does not support [constant FEATURE_BIDI_LAYOUT] feature (supported by [TextServerAdvanced]).  
         */
        shapedTextSetDirection(shaped: Rid, direction?: TextServer.Direction /* = 0 */): void
        
        /** Returns direction of the text. */
        shapedTextGetDirection(shaped: Rid): TextServer.Direction
        
        /** Returns direction of the text, inferred by the BiDi algorithm. */
        shapedTextGetInferredDirection(shaped: Rid): TextServer.Direction
        
        /** Overrides BiDi for the structured text.  
         *  Override ranges should cover full source text without overlaps. BiDi algorithm will be used on each range separately.  
         */
        shapedTextSetBidiOverride(shaped: Rid, override: GArray): void
        
        /** Sets custom punctuation character list, used for word breaking. If set to empty string, server defaults are used. */
        shapedTextSetCustomPunctuation(shaped: Rid, punct: string): void
        
        /** Returns custom punctuation character list, used for word breaking. If set to empty string, server defaults are used. */
        shapedTextGetCustomPunctuation(shaped: Rid): string
        
        /** Sets ellipsis character used for text clipping. */
        shapedTextSetCustomEllipsis(shaped: Rid, char: int64): void
        
        /** Returns ellipsis character used for text clipping. */
        shapedTextGetCustomEllipsis(shaped: Rid): int64
        
        /** Sets desired text orientation.  
         *      
         *  **Note:** Orientation is ignored if server does not support [constant FEATURE_VERTICAL_LAYOUT] feature (supported by [TextServerAdvanced]).  
         */
        shapedTextSetOrientation(shaped: Rid, orientation?: TextServer.Orientation /* = 0 */): void
        
        /** Returns text orientation. */
        shapedTextGetOrientation(shaped: Rid): TextServer.Orientation
        
        /** If set to `true` text buffer will display invalid characters as hexadecimal codes, otherwise nothing is displayed. */
        shapedTextSetPreserveInvalid(shaped: Rid, enabled: boolean): void
        
        /** Returns `true` if text buffer is configured to display hexadecimal codes in place of invalid characters.  
         *      
         *  **Note:** If set to `false`, nothing is displayed in place of invalid characters.  
         */
        shapedTextGetPreserveInvalid(shaped: Rid): boolean
        
        /** If set to `true` text buffer will display control characters. */
        shapedTextSetPreserveControl(shaped: Rid, enabled: boolean): void
        
        /** Returns `true` if text buffer is configured to display control characters. */
        shapedTextGetPreserveControl(shaped: Rid): boolean
        
        /** Sets extra spacing added between glyphs or lines in pixels. */
        shapedTextSetSpacing(shaped: Rid, spacing: TextServer.SpacingType, value: int64): void
        
        /** Returns extra spacing added between glyphs or lines in pixels. */
        shapedTextGetSpacing(shaped: Rid, spacing: TextServer.SpacingType): int64
        
        /** Adds text span and font to draw it to the text buffer. */
        shapedTextAddString(shaped: Rid, text: string, fonts: GArray<Rid>, size: int64, opentypeFeatures?: GDictionary /* = new GDictionary() */, language?: string /* = '' */, meta?: any /* = {} */): boolean
        
        /** Adds inline object to the text buffer, [param key] must be unique. In the text, object is represented as [param length] object replacement characters. */
        shapedTextAddObject(shaped: Rid, key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, length?: int64 /* = 1 */, baseline?: float64 /* = 0 */): boolean
        
        /** Sets new size and alignment of embedded object. */
        shapedTextResizeObject(shaped: Rid, key: any, size: Vector2, inlineAlign?: InlineAlignment /* = 5 */, baseline?: float64 /* = 0 */): boolean
        
        /** Returns `true` if an object with [param key] is embedded in this shaped text buffer. */
        shapedTextHasObject(shaped: Rid, key: any): boolean
        
        /** Returns the text buffer source text, including object replacement characters. */
        shapedGetText(shaped: Rid): string
        
        /** Returns number of text spans added using [method shaped_text_add_string] or [method shaped_text_add_object]. */
        shapedGetSpanCount(shaped: Rid): int64
        
        /** Returns text span metadata. */
        shapedGetSpanMeta(shaped: Rid, index: int64): any
        
        /** Returns text embedded object key. */
        shapedGetSpanEmbeddedObject(shaped: Rid, index: int64): any
        
        /** Returns the text span source text. */
        shapedGetSpanText(shaped: Rid, index: int64): string
        
        /** Returns the text span embedded object key. */
        shapedGetSpanObject(shaped: Rid, index: int64): any
        
        /** Changes text span font, font size, and OpenType features, without changing the text. */
        shapedSetSpanUpdateFont(shaped: Rid, index: int64, fonts: GArray<Rid>, size: int64, opentypeFeatures?: GDictionary /* = new GDictionary() */): void
        
        /** Returns the number of uniform text runs in the buffer. */
        shapedGetRunCount(shaped: Rid): int64
        
        /** Returns the source text of the [param index] text run (in visual order). */
        shapedGetRunText(shaped: Rid, index: int64): string
        
        /** Returns the source text range of the [param index] text run (in visual order). */
        shapedGetRunRange(shaped: Rid, index: int64): Vector2I
        
        /** Returns the glyph range of the [param index] text run (in visual order). */
        shapedGetRunGlyphRange(shaped: Rid, index: int64): Vector2I
        
        /** Returns the font RID of the [param index] text run (in visual order). */
        shapedGetRunFontRid(shaped: Rid, index: int64): Rid
        
        /** Returns the font size of the [param index] text run (in visual order). */
        shapedGetRunFontSize(shaped: Rid, index: int64): int64
        
        /** Returns the language of the [param index] text run (in visual order). */
        shapedGetRunLanguage(shaped: Rid, index: int64): string
        
        /** Returns the direction of the [param index] text run (in visual order). */
        shapedGetRunDirection(shaped: Rid, index: int64): TextServer.Direction
        
        /** Returns the embedded object of the [param index] text run (in visual order). */
        shapedGetRunObject(shaped: Rid, index: int64): any
        
        /** Returns text buffer for the substring of the text in the [param shaped] text buffer (including inline objects). */
        shapedTextSubstr(shaped: Rid, start: int64, length: int64): Rid
        
        /** Returns the parent buffer from which the substring originates. */
        shapedTextGetParent(shaped: Rid): Rid
        
        /** Adjusts text width to fit to specified width, returns new text width. */
        shapedTextFitToWidth(shaped: Rid, width: float64, justificationFlags?: TextServer.JustificationFlag /* = 3 */): float64
        
        /** Aligns shaped text to the given tab-stops. */
        shapedTextTabAlign(shaped: Rid, tabStops: PackedFloat32Array | float32[]): float64
        
        /** Shapes buffer if it's not shaped. Returns `true` if the string is shaped successfully.  
         *      
         *  **Note:** It is not necessary to call this function manually, buffer will be shaped automatically as soon as any of its output data is requested.  
         */
        shapedTextShape(shaped: Rid): boolean
        
        /** Returns `true` if buffer is successfully shaped. */
        shapedTextIsReady(shaped: Rid): boolean
        
        /** Returns `true` if text buffer contains any visible characters. */
        shapedTextHasVisibleChars(shaped: Rid): boolean
        
        /** Returns an array of glyphs in the visual order. */
        shapedTextGetGlyphs(shaped: Rid): GArray<GDictionary>
        
        /** Returns text glyphs in the logical order. */
        shapedTextSortLogical(shaped: Rid): GArray<GDictionary>
        
        /** Returns number of glyphs in the buffer. */
        shapedTextGetGlyphCount(shaped: Rid): int64
        
        /** Returns substring buffer character range in the parent buffer. */
        shapedTextGetRange(shaped: Rid): Vector2I
        
        /** Breaks text to the lines and columns. Returns character ranges for each segment. */
        shapedTextGetLineBreaksAdv(shaped: Rid, width: PackedFloat32Array | float32[], start?: int64 /* = 0 */, once?: boolean /* = true */, breakFlags?: TextServer.LineBreakFlag /* = 3 */): PackedInt32Array
        
        /** Breaks text to the lines and returns character ranges for each line. */
        shapedTextGetLineBreaks(shaped: Rid, width: float64, start?: int64 /* = 0 */, breakFlags?: TextServer.LineBreakFlag /* = 3 */): PackedInt32Array
        
        /** Breaks text into words and returns array of character ranges. Use [param grapheme_flags] to set what characters are used for breaking. */
        shapedTextGetWordBreaks(shaped: Rid, graphemeFlags?: TextServer.GraphemeFlag /* = 264 */, skipGraphemeFlags?: TextServer.GraphemeFlag /* = 4 */): PackedInt32Array
        
        /** Returns the position of the overrun trim. */
        shapedTextGetTrimPos(shaped: Rid): int64
        
        /** Returns position of the ellipsis. */
        shapedTextGetEllipsisPos(shaped: Rid): int64
        
        /** Returns array of the glyphs in the ellipsis. */
        shapedTextGetEllipsisGlyphs(shaped: Rid): GArray<GDictionary>
        
        /** Returns number of glyphs in the ellipsis. */
        shapedTextGetEllipsisGlyphCount(shaped: Rid): int64
        
        /** Trims text if it exceeds the given width. */
        shapedTextOverrunTrimToWidth(shaped: Rid, width?: float64 /* = 0 */, overrunTrimFlags?: TextServer.TextOverrunFlag /* = 0 */): void
        
        /** Returns array of inline objects. */
        shapedTextGetObjects(shaped: Rid): GArray
        
        /** Returns bounding rectangle of the inline object. */
        shapedTextGetObjectRect(shaped: Rid, key: any): Rect2
        
        /** Returns the character range of the inline object. */
        shapedTextGetObjectRange(shaped: Rid, key: any): Vector2I
        
        /** Returns the glyph index of the inline object. */
        shapedTextGetObjectGlyph(shaped: Rid, key: any): int64
        
        /** Returns size of the text. */
        shapedTextGetSize(shaped: Rid): Vector2
        
        /** Returns the text ascent (number of pixels above the baseline for horizontal layout or to the left of baseline for vertical).  
         *      
         *  **Note:** Overall ascent can be higher than font ascent, if some glyphs are displaced from the baseline.  
         */
        shapedTextGetAscent(shaped: Rid): float64
        
        /** Returns the text descent (number of pixels below the baseline for horizontal layout or to the right of baseline for vertical).  
         *      
         *  **Note:** Overall descent can be higher than font descent, if some glyphs are displaced from the baseline.  
         */
        shapedTextGetDescent(shaped: Rid): float64
        
        /** Returns width (for horizontal layout) or height (for vertical) of the text. */
        shapedTextGetWidth(shaped: Rid): float64
        
        /** Returns pixel offset of the underline below the baseline. */
        shapedTextGetUnderlinePosition(shaped: Rid): float64
        
        /** Returns thickness of the underline. */
        shapedTextGetUnderlineThickness(shaped: Rid): float64
        
        /** Returns shapes of the carets corresponding to the character offset [param position] in the text. Returned caret shape is 1 pixel wide rectangle. */
        shapedTextGetCarets(shaped: Rid, position: int64): GDictionary
        
        /** Returns selection rectangles for the specified character range. */
        shapedTextGetSelection(shaped: Rid, start: int64, end: int64): PackedVector2Array
        
        /** Returns grapheme index at the specified pixel offset at the baseline, or `-1` if none is found. */
        shapedTextHitTestGrapheme(shaped: Rid, coords: float64): int64
        
        /** Returns caret character offset at the specified pixel offset at the baseline. This function always returns a valid position. */
        shapedTextHitTestPosition(shaped: Rid, coords: float64): int64
        
        /** Returns composite character's bounds as offsets from the start of the line. */
        shapedTextGetGraphemeBounds(shaped: Rid, pos: int64): Vector2
        
        /** Returns grapheme end position closest to the [param pos]. */
        shapedTextNextGraphemePos(shaped: Rid, pos: int64): int64
        
        /** Returns grapheme start position closest to the [param pos]. */
        shapedTextPrevGraphemePos(shaped: Rid, pos: int64): int64
        
        /** Returns array of the composite character boundaries. */
        shapedTextGetCharacterBreaks(shaped: Rid): PackedInt32Array
        
        /** Returns composite character end position closest to the [param pos]. */
        shapedTextNextCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Returns composite character start position closest to the [param pos]. */
        shapedTextPrevCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Returns composite character position closest to the [param pos]. */
        shapedTextClosestCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Draw shaped text into a canvas item at a given position, with [param color]. [param pos] specifies the leftmost point of the baseline (for horizontal layout) or topmost point of the baseline (for vertical layout). If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used.  
         *  [param clip_l] and [param clip_r] are offsets relative to [param pos], going to the right in horizontal layout and downward in vertical layout. If [param clip_l] is not negative, glyphs starting before the offset are clipped. If [param clip_r] is not negative, glyphs ending after the offset are clipped.  
         */
        shapedTextDraw(shaped: Rid, canvas: Rid, pos: Vector2, clipL?: float64 /* = -1 */, clipR?: float64 /* = -1 */, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draw the outline of the shaped text into a canvas item at a given position, with [param color]. [param pos] specifies the leftmost point of the baseline (for horizontal layout) or topmost point of the baseline (for vertical layout). If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used.  
         *  [param clip_l] and [param clip_r] are offsets relative to [param pos], going to the right in horizontal layout and downward in vertical layout. If [param clip_l] is not negative, glyphs starting before the offset are clipped. If [param clip_r] is not negative, glyphs ending after the offset are clipped.  
         */
        shapedTextDrawOutline(shaped: Rid, canvas: Rid, pos: Vector2, clipL?: float64 /* = -1 */, clipR?: float64 /* = -1 */, outlineSize?: int64 /* = 1 */, color?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Returns dominant direction of in the range of text. */
        shapedTextGetDominantDirectionInRange(shaped: Rid, start: int64, end: int64): TextServer.Direction
        
        /** Converts a number from Western Arabic (0..9) to the numeral system used in the given [param language].  
         *  If [param language] is an empty string, the active locale will be used.  
         */
        formatNumber(number: string, language?: string /* = '' */): string
        
        /** Converts [param number] from the numeral system used in the given [param language] to Western Arabic (0..9).  
         *  If [param language] is an empty string, the active locale will be used.  
         */
        parseNumber(number: string, language?: string /* = '' */): string
        
        /** Returns the percent sign used in the given [param language].  
         *  If [param language] is an empty string, the active locale will be used.  
         */
        percentSign(language?: string /* = '' */): string
        
        /** Returns an array of the word break boundaries. Elements in the returned array are the offsets of the start and end of words. Therefore the length of the array is always even.  
         *  When [param chars_per_line] is greater than zero, line break boundaries are returned instead.  
         *    
         */
        stringGetWordBreaks(string_: string, language?: string /* = '' */, charsPerLine?: int64 /* = 0 */): PackedInt32Array
        
        /** Returns array of the composite character boundaries.  
         *    
         */
        stringGetCharacterBreaks(string_: string, language?: string /* = '' */): PackedInt32Array
        
        /** Returns index of the first string in [param dict] which is visually confusable with the [param string], or `-1` if none is found.  
         *      
         *  **Note:** This method doesn't detect invisible characters, for spoof detection use it in combination with [method spoof_check].  
         *      
         *  **Note:** Always returns `-1` if the server does not support the [constant FEATURE_UNICODE_SECURITY] feature.  
         */
        isConfusable(string_: string, dict: PackedStringArray | string[]): int64
        
        /** Returns `true` if [param string] is likely to be an attempt at confusing the reader.  
         *      
         *  **Note:** Always returns `false` if the server does not support the [constant FEATURE_UNICODE_SECURITY] feature.  
         */
        spoofCheck(string_: string): boolean
        
        /** Strips diacritics from the string.  
         *      
         *  **Note:** The result may be longer or shorter than the original.  
         */
        stripDiacritics(string_: string): string
        
        /** Returns `true` if [param string] is a valid identifier.  
         *  If the text server supports the [constant FEATURE_UNICODE_IDENTIFIERS] feature, a valid identifier must:  
         *  - Conform to normalization form C.  
         *  - Begin with a Unicode character of class XID_Start or `"_"`.  
         *  - May contain Unicode characters of class XID_Continue in the other positions.  
         *  - Use UAX #31 recommended scripts only (mixed scripts are allowed).  
         *  If the [constant FEATURE_UNICODE_IDENTIFIERS] feature is not supported, a valid identifier must:  
         *  - Begin with a Unicode character of class XID_Start or `"_"`.  
         *  - May contain Unicode characters of class XID_Continue in the other positions.  
         */
        isValidIdentifier(string_: string): boolean
        
        /** Returns `true` if the given code point is a valid letter, i.e. it belongs to the Unicode category "L". */
        isValidLetter(unicode: int64): boolean
        
        /** Returns the string converted to `UPPERCASE`.  
         *      
         *  **Note:** Casing is locale dependent and context sensitive if server support [constant FEATURE_CONTEXT_SENSITIVE_CASE_CONVERSION] feature (supported by [TextServerAdvanced]).  
         *      
         *  **Note:** The result may be longer or shorter than the original.  
         */
        stringToUpper(string_: string, language?: string /* = '' */): string
        
        /** Returns the string converted to `lowercase`.  
         *      
         *  **Note:** Casing is locale dependent and context sensitive if server support [constant FEATURE_CONTEXT_SENSITIVE_CASE_CONVERSION] feature (supported by [TextServerAdvanced]).  
         *      
         *  **Note:** The result may be longer or shorter than the original.  
         */
        stringToLower(string_: string, language?: string /* = '' */): string
        
        /** Returns the string converted to `Title Case`.  
         *      
         *  **Note:** Casing is locale dependent and context sensitive if server support [constant FEATURE_CONTEXT_SENSITIVE_CASE_CONVERSION] feature (supported by [TextServerAdvanced]).  
         *      
         *  **Note:** The result may be longer or shorter than the original.  
         */
        stringToTitle(string_: string, language?: string /* = '' */): string
        
        /** Default implementation of the BiDi algorithm override function. */
        parseStructuredText(parserType: TextServer.StructuredTextParser, args: GArray, text: string): GArray<Vector3I>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextServer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextServerAdvanced extends __RPCMapTextServerExtension {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextServerAdvanced extends __NameMapTextServerExtension {
    }
    /** An advanced text server with support for BiDi, complex text layout, and contextual OpenType features. Used in Godot by default.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textserveradvanced.html  
     */
    class TextServerAdvanced extends TextServerExtension {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextServerAdvanced;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextServerAdvanced;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextServerDummy extends __RPCMapTextServerExtension {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextServerDummy extends __NameMapTextServerExtension {
    }
    /** A dummy text server that can't render text or manage fonts.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textserverdummy.html  
     */
    class TextServerDummy extends TextServerExtension {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextServerDummy;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextServerDummy;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextServerExtension extends __RPCMapTextServer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextServerExtension extends __NameMapTextServer {
        _has_feature: "_hasFeature";
        _get_name: "_getName";
        _get_short_name: "_getShortName";
        _get_features: "_getFeatures";
        _free_rid: "_freeRid";
        _load_support_data: "_loadSupportData";
        _get_support_data_filename: "_getSupportDataFileName";
        _get_support_data_info: "_getSupportDataInfo";
        _save_support_data: "_saveSupportData";
        _get_support_data: "_getSupportData";
        _is_locale_using_support_data: "_isLocaleUsingSupportData";
        _is_locale_right_to_left: "_isLocaleRightToLeft";
        _name_to_tag: "_nameToTag";
        _tag_to_name: "_tagToName";
        _create_font: "_createFont";
        _create_font_linked_variation: "_createFontLinkedVariation";
        _font_set_data: "_fontSetData";
        _font_set_data_ptr: "_fontSetDataPtr";
        _font_set_face_index: "_fontSetFaceIndex";
        _font_get_face_index: "_fontGetFaceIndex";
        _font_get_face_count: "_fontGetFaceCount";
        _font_set_style: "_fontSetStyle";
        _font_get_style: "_fontGetStyle";
        _font_set_name: "_fontSetName";
        _font_get_name: "_fontGetName";
        _font_get_ot_name_strings: "_fontGetOtNameStrings";
        _font_set_style_name: "_fontSetStyleName";
        _font_get_style_name: "_fontGetStyleName";
        _font_set_weight: "_fontSetWeight";
        _font_get_weight: "_fontGetWeight";
        _font_set_stretch: "_fontSetStretch";
        _font_get_stretch: "_fontGetStretch";
        _font_set_antialiasing: "_fontSetAntialiasing";
        _font_get_antialiasing: "_fontGetAntialiasing";
        _font_set_disable_embedded_bitmaps: "_fontSetDisableEmbeddedBitmaps";
        _font_get_disable_embedded_bitmaps: "_fontGetDisableEmbeddedBitmaps";
        _font_set_generate_mipmaps: "_fontSetGenerateMipmaps";
        _font_get_generate_mipmaps: "_fontGetGenerateMipmaps";
        _font_set_multichannel_signed_distance_field: "_fontSetMultichannelSignedDistanceField";
        _font_is_multichannel_signed_distance_field: "_fontIsMultichannelSignedDistanceField";
        _font_set_msdf_pixel_range: "_fontSetMsdfPixelRange";
        _font_get_msdf_pixel_range: "_fontGetMsdfPixelRange";
        _font_set_msdf_size: "_fontSetMsdfSize";
        _font_get_msdf_size: "_fontGetMsdfSize";
        _font_set_fixed_size: "_fontSetFixedSize";
        _font_get_fixed_size: "_fontGetFixedSize";
        _font_set_fixed_size_scale_mode: "_fontSetFixedSizeScaleMode";
        _font_get_fixed_size_scale_mode: "_fontGetFixedSizeScaleMode";
        _font_set_allow_system_fallback: "_fontSetAllowSystemFallback";
        _font_is_allow_system_fallback: "_fontIsAllowSystemFallback";
        _font_clear_system_fallback_cache: "_fontClearSystemFallbackCache";
        _font_set_force_autohinter: "_fontSetForceAutohinter";
        _font_is_force_autohinter: "_fontIsForceAutohinter";
        _font_set_modulate_color_glyphs: "_fontSetModulateColorGlyphs";
        _font_is_modulate_color_glyphs: "_fontIsModulateColorGlyphs";
        _font_get_palette_count: "_fontGetPaletteCount";
        _font_get_palette_name: "_fontGetPaletteName";
        _font_get_palette_colors: "_fontGetPaletteColors";
        _font_set_palette_custom_colors: "_fontSetPaletteCustomColors";
        _font_get_palette_custom_colors: "_fontGetPaletteCustomColors";
        _font_get_used_palette: "_fontGetUsedPalette";
        _font_set_used_palette: "_fontSetUsedPalette";
        _font_set_hinting: "_fontSetHinting";
        _font_get_hinting: "_fontGetHinting";
        _font_set_subpixel_positioning: "_fontSetSubpixelPositioning";
        _font_get_subpixel_positioning: "_fontGetSubpixelPositioning";
        _font_set_keep_rounding_remainders: "_fontSetKeepRoundingRemainders";
        _font_get_keep_rounding_remainders: "_fontGetKeepRoundingRemainders";
        _font_set_embolden: "_fontSetEmbolden";
        _font_get_embolden: "_fontGetEmbolden";
        _font_set_spacing: "_fontSetSpacing";
        _font_get_spacing: "_fontGetSpacing";
        _font_set_baseline_offset: "_fontSetBaselineOffset";
        _font_get_baseline_offset: "_fontGetBaselineOffset";
        _font_set_transform: "_fontSetTransform";
        _font_get_transform: "_fontGetTransform";
        _font_set_variation_coordinates: "_fontSetVariationCoordinates";
        _font_get_variation_coordinates: "_fontGetVariationCoordinates";
        _font_set_oversampling: "_fontSetOversampling";
        _font_get_oversampling: "_fontGetOversampling";
        _font_get_size_cache_list: "_fontGetSizeCacheList";
        _font_clear_size_cache: "_fontClearSizeCache";
        _font_remove_size_cache: "_fontRemoveSizeCache";
        _font_get_size_cache_info: "_fontGetSizeCacheInfo";
        _font_set_ascent: "_fontSetAscent";
        _font_get_ascent: "_fontGetAscent";
        _font_set_descent: "_fontSetDescent";
        _font_get_descent: "_fontGetDescent";
        _font_set_underline_position: "_fontSetUnderlinePosition";
        _font_get_underline_position: "_fontGetUnderlinePosition";
        _font_set_underline_thickness: "_fontSetUnderlineThickness";
        _font_get_underline_thickness: "_fontGetUnderlineThickness";
        _font_set_scale: "_fontSetScale";
        _font_get_scale: "_fontGetScale";
        _font_get_texture_count: "_fontGetTextureCount";
        _font_clear_textures: "_fontClearTextures";
        _font_remove_texture: "_fontRemoveTexture";
        _font_set_texture_image: "_fontSetTextureImage";
        _font_get_texture_image: "_fontGetTextureImage";
        _font_set_texture_offsets: "_fontSetTextureOffsets";
        _font_get_texture_offsets: "_fontGetTextureOffsets";
        _font_get_glyph_list: "_fontGetGlyphList";
        _font_clear_glyphs: "_fontClearGlyphs";
        _font_remove_glyph: "_fontRemoveGlyph";
        _font_get_glyph_advance: "_fontGetGlyphAdvance";
        _font_set_glyph_advance: "_fontSetGlyphAdvance";
        _font_get_glyph_offset: "_fontGetGlyphOffset";
        _font_set_glyph_offset: "_fontSetGlyphOffset";
        _font_get_glyph_size: "_fontGetGlyphSize";
        _font_set_glyph_size: "_fontSetGlyphSize";
        _font_get_glyph_uv_rect: "_fontGetGlyphUVRect";
        _font_set_glyph_uv_rect: "_fontSetGlyphUVRect";
        _font_get_glyph_texture_idx: "_fontGetGlyphTextureIdx";
        _font_set_glyph_texture_idx: "_fontSetGlyphTextureIdx";
        _font_get_glyph_texture_rid: "_fontGetGlyphTextureRid";
        _font_get_glyph_texture_size: "_fontGetGlyphTextureSize";
        _font_get_glyph_contours: "_fontGetGlyphContours";
        _font_get_kerning_list: "_fontGetKerningList";
        _font_clear_kerning_map: "_fontClearKerningMap";
        _font_remove_kerning: "_fontRemoveKerning";
        _font_set_kerning: "_fontSetKerning";
        _font_get_kerning: "_fontGetKerning";
        _font_get_glyph_index: "_fontGetGlyphIndex";
        _font_get_char_from_glyph_index: "_fontGetCharFromGlyphIndex";
        _font_has_char: "_fontHasChar";
        _font_get_supported_chars: "_fontGetSupportedChars";
        _font_get_supported_glyphs: "_fontGetSupportedGlyphs";
        _font_render_range: "_fontRenderRange";
        _font_render_glyph: "_fontRenderGlyph";
        _font_draw_glyph: "_fontDrawGlyph";
        _font_draw_glyph_outline: "_fontDrawGlyphOutline";
        _font_is_language_supported: "_fontIsLanguageSupported";
        _font_set_language_support_override: "_fontSetLanguageSupportOverride";
        _font_get_language_support_override: "_fontGetLanguageSupportOverride";
        _font_remove_language_support_override: "_fontRemoveLanguageSupportOverride";
        _font_get_language_support_overrides: "_fontGetLanguageSupportOverrides";
        _font_is_script_supported: "_fontIsScriptSupported";
        _font_set_script_support_override: "_fontSetScriptSupportOverride";
        _font_get_script_support_override: "_fontGetScriptSupportOverride";
        _font_remove_script_support_override: "_fontRemoveScriptSupportOverride";
        _font_get_script_support_overrides: "_fontGetScriptSupportOverrides";
        _font_set_opentype_feature_overrides: "_fontSetOpentypeFeatureOverrides";
        _font_get_opentype_feature_overrides: "_fontGetOpentypeFeatureOverrides";
        _font_supported_feature_list: "_fontSupportedFeatureList";
        _font_supported_variation_list: "_fontSupportedVariationList";
        _font_get_global_oversampling: "_fontGetGlobalOversampling";
        _font_set_global_oversampling: "_fontSetGlobalOversampling";
        _reference_oversampling_level: "_referenceOversamplingLevel";
        _unreference_oversampling_level: "_unreferenceOversamplingLevel";
        _get_hex_code_box_size: "_getHexCodeBoxSize";
        _draw_hex_code_box: "_drawHexCodeBox";
        _create_shaped_text: "_createShapedText";
        _shaped_text_clear: "_shapedTextClear";
        _shaped_text_duplicate: "_shapedTextDuplicate";
        _shaped_text_set_direction: "_shapedTextSetDirection";
        _shaped_text_get_direction: "_shapedTextGetDirection";
        _shaped_text_get_inferred_direction: "_shapedTextGetInferredDirection";
        _shaped_text_set_bidi_override: "_shapedTextSetBidiOverride";
        _shaped_text_set_custom_punctuation: "_shapedTextSetCustomPunctuation";
        _shaped_text_get_custom_punctuation: "_shapedTextGetCustomPunctuation";
        _shaped_text_set_custom_ellipsis: "_shapedTextSetCustomEllipsis";
        _shaped_text_get_custom_ellipsis: "_shapedTextGetCustomEllipsis";
        _shaped_text_set_orientation: "_shapedTextSetOrientation";
        _shaped_text_get_orientation: "_shapedTextGetOrientation";
        _shaped_text_set_preserve_invalid: "_shapedTextSetPreserveInvalid";
        _shaped_text_get_preserve_invalid: "_shapedTextGetPreserveInvalid";
        _shaped_text_set_preserve_control: "_shapedTextSetPreserveControl";
        _shaped_text_get_preserve_control: "_shapedTextGetPreserveControl";
        _shaped_text_set_spacing: "_shapedTextSetSpacing";
        _shaped_text_get_spacing: "_shapedTextGetSpacing";
        _shaped_text_add_string: "_shapedTextAddString";
        _shaped_text_add_object: "_shapedTextAddObject";
        _shaped_text_resize_object: "_shapedTextResizeObject";
        _shaped_text_has_object: "_shapedTextHasObject";
        _shaped_get_text: "_shapedGetText";
        _shaped_get_span_count: "_shapedGetSpanCount";
        _shaped_get_span_meta: "_shapedGetSpanMeta";
        _shaped_get_span_embedded_object: "_shapedGetSpanEmbeddedObject";
        _shaped_get_span_text: "_shapedGetSpanText";
        _shaped_get_span_object: "_shapedGetSpanObject";
        _shaped_set_span_update_font: "_shapedSetSpanUpdateFont";
        _shaped_get_run_count: "_shapedGetRunCount";
        _shaped_get_run_text: "_shapedGetRunText";
        _shaped_get_run_range: "_shapedGetRunRange";
        _shaped_get_run_glyph_range: "_shapedGetRunGlyphRange";
        _shaped_get_run_font_rid: "_shapedGetRunFontRid";
        _shaped_get_run_font_size: "_shapedGetRunFontSize";
        _shaped_get_run_language: "_shapedGetRunLanguage";
        _shaped_get_run_direction: "_shapedGetRunDirection";
        _shaped_get_run_object: "_shapedGetRunObject";
        _shaped_text_substr: "_shapedTextSubstr";
        _shaped_text_get_parent: "_shapedTextGetParent";
        _shaped_text_fit_to_width: "_shapedTextFitToWidth";
        _shaped_text_tab_align: "_shapedTextTabAlign";
        _shaped_text_shape: "_shapedTextShape";
        _shaped_text_update_breaks: "_shapedTextUpdateBreaks";
        _shaped_text_update_justification_ops: "_shapedTextUpdateJustificationOps";
        _shaped_text_is_ready: "_shapedTextIsReady";
        _shaped_text_get_glyphs: "_shapedTextGetGlyphs";
        _shaped_text_sort_logical: "_shapedTextSortLogical";
        _shaped_text_get_glyph_count: "_shapedTextGetGlyphCount";
        _shaped_text_get_range: "_shapedTextGetRange";
        _shaped_text_get_line_breaks_adv: "_shapedTextGetLineBreaksAdv";
        _shaped_text_get_line_breaks: "_shapedTextGetLineBreaks";
        _shaped_text_get_word_breaks: "_shapedTextGetWordBreaks";
        _shaped_text_get_trim_pos: "_shapedTextGetTrimPos";
        _shaped_text_get_ellipsis_pos: "_shapedTextGetEllipsisPos";
        _shaped_text_get_ellipsis_glyph_count: "_shapedTextGetEllipsisGlyphCount";
        _shaped_text_get_ellipsis_glyphs: "_shapedTextGetEllipsisGlyphs";
        _shaped_text_overrun_trim_to_width: "_shapedTextOverrunTrimToWidth";
        _shaped_text_get_objects: "_shapedTextGetObjects";
        _shaped_text_get_object_rect: "_shapedTextGetObjectRect";
        _shaped_text_get_object_range: "_shapedTextGetObjectRange";
        _shaped_text_get_object_glyph: "_shapedTextGetObjectGlyph";
        _shaped_text_get_size: "_shapedTextGetSize";
        _shaped_text_get_ascent: "_shapedTextGetAscent";
        _shaped_text_get_descent: "_shapedTextGetDescent";
        _shaped_text_get_width: "_shapedTextGetWidth";
        _shaped_text_get_underline_position: "_shapedTextGetUnderlinePosition";
        _shaped_text_get_underline_thickness: "_shapedTextGetUnderlineThickness";
        _shaped_text_get_dominant_direction_in_range: "_shapedTextGetDominantDirectionInRange";
        _shaped_text_get_carets: "_shapedTextGetCarets";
        _shaped_text_get_selection: "_shapedTextGetSelection";
        _shaped_text_hit_test_grapheme: "_shapedTextHitTestGrapheme";
        _shaped_text_hit_test_position: "_shapedTextHitTestPosition";
        _shaped_text_draw: "_shapedTextDraw";
        _shaped_text_draw_outline: "_shapedTextDrawOutline";
        _shaped_text_get_grapheme_bounds: "_shapedTextGetGraphemeBounds";
        _shaped_text_next_grapheme_pos: "_shapedTextNextGraphemePos";
        _shaped_text_prev_grapheme_pos: "_shapedTextPrevGraphemePos";
        _shaped_text_get_character_breaks: "_shapedTextGetCharacterBreaks";
        _shaped_text_next_character_pos: "_shapedTextNextCharacterPos";
        _shaped_text_prev_character_pos: "_shapedTextPrevCharacterPos";
        _shaped_text_closest_character_pos: "_shapedTextClosestCharacterPos";
        _format_number: "_formatNumber";
        _parse_number: "_parseNumber";
        _percent_sign: "_percentSign";
        _strip_diacritics: "_stripDiacritics";
        _is_valid_identifier: "_isValidIdentifier";
        _is_valid_letter: "_isValidLetter";
        _string_get_word_breaks: "_stringGetWordBreaks";
        _string_get_character_breaks: "_stringGetCharacterBreaks";
        _is_confusable: "_isConfusable";
        _spoof_check: "_spoofCheck";
        _string_to_upper: "_stringToUpper";
        _string_to_lower: "_stringToLower";
        _string_to_title: "_stringToTitle";
        _parse_structured_text: "_parseStructuredText";
    }
    /** Base class for custom [TextServer] implementations (plugins).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textserverextension.html  
     */
    class TextServerExtension extends TextServer {
        constructor(identifier?: any)
        /** Returns `true` if the server supports a feature. */
        /* gdvirtual */ _hasFeature(feature: TextServer.Feature): boolean
        
        /** Returns the name of the server interface. */
        /* gdvirtual */ _getName(): string
        
        /** Returns the short name of the server interface. By convention, this should return a lowercase string that follows the `snake_case` naming scheme. */
        /* gdvirtual */ _getShortName(): string
        
        /** Returns text server features, see [enum TextServer.Feature]. */
        /* gdvirtual */ _getFeatures(): int64
        
        /** Frees an object created by this [TextServer]. */
        /* gdvirtual */ _freeRid(rid: Rid): void
        
        /** Returns `true` if [param rid] is valid resource owned by this text server. */
        /* gdvirtual */ _has(rid: Rid): boolean
        
        /** Loads optional TextServer database (e.g. ICU break iterators and dictionaries). */
        /* gdvirtual */ _loadSupportData(filename: string): boolean
        
        /** Returns default TextServer database (e.g. ICU break iterators and dictionaries) filename. */
        /* gdvirtual */ _getSupportDataFileName(): string
        
        /** Returns TextServer database (e.g. ICU break iterators and dictionaries) description. */
        /* gdvirtual */ _getSupportDataInfo(): string
        
        /** Saves optional TextServer database (e.g. ICU break iterators and dictionaries) to the file. */
        /* gdvirtual */ _saveSupportData(filename: string): boolean
        
        /** Returns default TextServer database (e.g. ICU break iterators and dictionaries). */
        /* gdvirtual */ _getSupportData(): PackedByteArray
        
        /** Returns `true` if the locale requires text server support data for line/word breaking. */
        /* gdvirtual */ _isLocaleUsingSupportData(locale: string): boolean
        
        /** Returns `true` if locale is right-to-left. */
        /* gdvirtual */ _isLocaleRightToLeft(locale: string): boolean
        
        /** Converts the given readable name of a feature, variation, script, or language to an OpenType tag. */
        /* gdvirtual */ _nameToTag(name: string): int64
        
        /** Converts the given OpenType tag to the readable name of a feature, variation, script, or language. */
        /* gdvirtual */ _tagToName(tag: int64): string
        
        /** Creates a new, empty font cache entry resource. */
        /* gdvirtual */ _createFont(): Rid
        
        /** Optional, implement if font supports extra spacing or baseline offset.  
         *  Creates a new variation existing font which is reusing the same glyph cache and font data.  
         */
        /* gdvirtual */ _createFontLinkedVariation(fontRid: Rid): Rid
        
        /** Sets font source data, e.g contents of the dynamic font source file. */
        /* gdvirtual */ _fontSetData(fontRid: Rid, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Sets pointer to the font source data, e.g contents of the dynamic font source file. */
        /* gdvirtual */ _fontSetDataPtr(fontRid: Rid, dataPtr: int64, dataSize: int64): void
        
        /** Sets an active face index in the TrueType / OpenType collection. */
        /* gdvirtual */ _fontSetFaceIndex(fontRid: Rid, faceIndex: int64): void
        
        /** Returns an active face index in the TrueType / OpenType collection. */
        /* gdvirtual */ _fontGetFaceIndex(fontRid: Rid): int64
        
        /** Returns number of faces in the TrueType / OpenType collection. */
        /* gdvirtual */ _fontGetFaceCount(fontRid: Rid): int64
        
        /** Sets the font style flags. */
        /* gdvirtual */ _fontSetStyle(fontRid: Rid, style: TextServer.FontStyle): void
        
        /** Returns font style flags. */
        /* gdvirtual */ _fontGetStyle(fontRid: Rid): TextServer.FontStyle
        
        /** Sets the font family name. */
        /* gdvirtual */ _fontSetName(fontRid: Rid, name: string): void
        
        /** Returns font family name. */
        /* gdvirtual */ _fontGetName(fontRid: Rid): string
        
        /** Returns [Dictionary] with OpenType font name strings (localized font names, version, description, license information, sample text, etc.). */
        /* gdvirtual */ _fontGetOtNameStrings(fontRid: Rid): GDictionary
        
        /** Sets the font style name. */
        /* gdvirtual */ _fontSetStyleName(fontRid: Rid, nameStyle: string): void
        
        /** Returns font style name. */
        /* gdvirtual */ _fontGetStyleName(fontRid: Rid): string
        
        /** Sets weight (boldness) of the font. A value in the `100...999` range, normal font weight is `400`, bold font weight is `700`. */
        /* gdvirtual */ _fontSetWeight(fontRid: Rid, weight: int64): void
        
        /** Returns weight (boldness) of the font. A value in the `100...999` range, normal font weight is `400`, bold font weight is `700`. */
        /* gdvirtual */ _fontGetWeight(fontRid: Rid): int64
        
        /** Sets font stretch amount, compared to a normal width. A percentage value between `50%` and `200%`. */
        /* gdvirtual */ _fontSetStretch(fontRid: Rid, stretch: int64): void
        
        /** Returns font stretch amount, compared to a normal width. A percentage value between `50%` and `200%`. */
        /* gdvirtual */ _fontGetStretch(fontRid: Rid): int64
        
        /** Sets font anti-aliasing mode. */
        /* gdvirtual */ _fontSetAntialiasing(fontRid: Rid, antialiasing: TextServer.FontAntialiasing): void
        
        /** Returns font anti-aliasing mode. */
        /* gdvirtual */ _fontGetAntialiasing(fontRid: Rid): TextServer.FontAntialiasing
        
        /** If set to `true`, embedded font bitmap loading is disabled. */
        /* gdvirtual */ _fontSetDisableEmbeddedBitmaps(fontRid: Rid, disableEmbeddedBitmaps: boolean): void
        
        /** Returns whether the font's embedded bitmap loading is disabled. */
        /* gdvirtual */ _fontGetDisableEmbeddedBitmaps(fontRid: Rid): boolean
        
        /** If set to `true` font texture mipmap generation is enabled. */
        /* gdvirtual */ _fontSetGenerateMipmaps(fontRid: Rid, generateMipmaps: boolean): void
        
        /** Returns `true` if font texture mipmap generation is enabled. */
        /* gdvirtual */ _fontGetGenerateMipmaps(fontRid: Rid): boolean
        
        /** If set to `true`, glyphs of all sizes are rendered using single multichannel signed distance field generated from the dynamic font vector data. MSDF rendering allows displaying the font at any scaling factor without blurriness, and without incurring a CPU cost when the font size changes (since the font no longer needs to be rasterized on the CPU). As a downside, font hinting is not available with MSDF. The lack of font hinting may result in less crisp and less readable fonts at small sizes. */
        /* gdvirtual */ _fontSetMultichannelSignedDistanceField(fontRid: Rid, msdf: boolean): void
        
        /** Returns `true` if glyphs of all sizes are rendered using single multichannel signed distance field generated from the dynamic font vector data. */
        /* gdvirtual */ _fontIsMultichannelSignedDistanceField(fontRid: Rid): boolean
        
        /** Sets the width of the range around the shape between the minimum and maximum representable signed distance. */
        /* gdvirtual */ _fontSetMsdfPixelRange(fontRid: Rid, msdfPixelRange: int64): void
        
        /** Returns the width of the range around the shape between the minimum and maximum representable signed distance. */
        /* gdvirtual */ _fontGetMsdfPixelRange(fontRid: Rid): int64
        
        /** Sets source font size used to generate MSDF textures. */
        /* gdvirtual */ _fontSetMsdfSize(fontRid: Rid, msdfSize: int64): void
        
        /** Returns source font size used to generate MSDF textures. */
        /* gdvirtual */ _fontGetMsdfSize(fontRid: Rid): int64
        
        /** Sets bitmap font fixed size. If set to value greater than zero, same cache entry will be used for all font sizes. */
        /* gdvirtual */ _fontSetFixedSize(fontRid: Rid, fixedSize: int64): void
        
        /** Returns bitmap font fixed size. */
        /* gdvirtual */ _fontGetFixedSize(fontRid: Rid): int64
        
        /** Sets bitmap font scaling mode. This property is used only if `fixed_size` is greater than zero. */
        /* gdvirtual */ _fontSetFixedSizeScaleMode(fontRid: Rid, fixedSizeScaleMode: TextServer.FixedSizeScaleMode): void
        
        /** Returns bitmap font scaling mode. */
        /* gdvirtual */ _fontGetFixedSizeScaleMode(fontRid: Rid): TextServer.FixedSizeScaleMode
        
        /** If set to `true`, system fonts can be automatically used as fallbacks. */
        /* gdvirtual */ _fontSetAllowSystemFallback(fontRid: Rid, allowSystemFallback: boolean): void
        
        /** Returns `true` if system fonts can be automatically used as fallbacks. */
        /* gdvirtual */ _fontIsAllowSystemFallback(fontRid: Rid): boolean
        
        /** Frees all automatically loaded system fonts. */
        /* gdvirtual */ _fontClearSystemFallbackCache(): void
        
        /** If set to `true` auto-hinting is preferred over font built-in hinting. */
        /* gdvirtual */ _fontSetForceAutohinter(fontRid: Rid, forceAutohinter: boolean): void
        
        /** Returns `true` if auto-hinting is supported and preferred over font built-in hinting. */
        /* gdvirtual */ _fontIsForceAutohinter(fontRid: Rid): boolean
        
        /** If set to `true`, color modulation is applied when drawing colored glyphs, otherwise it's applied to the monochrome glyphs only. */
        /* gdvirtual */ _fontSetModulateColorGlyphs(fontRid: Rid, modulate: boolean): void
        
        /** Returns `true` if color modulation is applied when drawing the font's colored glyphs. */
        /* gdvirtual */ _fontIsModulateColorGlyphs(fontRid: Rid): boolean
        
        /** Returns the number of predefined color palettes. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. */
        /* gdvirtual */ _fontGetPaletteCount(fontRid: Rid): int64
        
        /** Returns the name of the predefined color palette at [param index]. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. */
        /* gdvirtual */ _fontGetPaletteName(fontRid: Rid, index: int64): string
        
        /** Returns the array in the predefined color palette at [param index]. Palette contains all colors used to render font glyphs. Each palette has the same number of colors. Colors can be overridden using [method _font_set_palette_custom_colors]. */
        /* gdvirtual */ _fontGetPaletteColors(fontRid: Rid, index: int64): PackedColorArray
        
        /** Sets array of custom colors to override predefined palette. Set to empty array to reset overrides. Use `Color(0, 0, 0, 0)`, to keep predefined palette color at specific position. */
        /* gdvirtual */ _fontSetPaletteCustomColors(fontRid: Rid, colors: PackedColorArray | Color[]): void
        
        /** Returns array of custom colors to override predefined palette. */
        /* gdvirtual */ _fontGetPaletteCustomColors(fontRid: Rid): PackedColorArray
        
        /** Returns used palette index. */
        /* gdvirtual */ _fontGetUsedPalette(fontRid: Rid): int64
        
        /** Sets used palette index. */
        /* gdvirtual */ _fontSetUsedPalette(fontRid: Rid, index: int64): void
        
        /** Sets font hinting mode. Used by dynamic fonts only. */
        /* gdvirtual */ _fontSetHinting(fontRid: Rid, hinting: TextServer.Hinting): void
        
        /** Returns the font hinting mode. Used by dynamic fonts only. */
        /* gdvirtual */ _fontGetHinting(fontRid: Rid): TextServer.Hinting
        
        /** Sets font subpixel glyph positioning mode. */
        /* gdvirtual */ _fontSetSubpixelPositioning(fontRid: Rid, subpixelPositioning: TextServer.SubpixelPositioning): void
        
        /** Returns font subpixel glyph positioning mode. */
        /* gdvirtual */ _fontGetSubpixelPositioning(fontRid: Rid): TextServer.SubpixelPositioning
        
        /** Sets glyph position rounding behavior. If set to `true`, when aligning glyphs to the pixel boundaries rounding remainders are accumulated to ensure more uniform glyph distribution. This setting has no effect if subpixel positioning is enabled. */
        /* gdvirtual */ _fontSetKeepRoundingRemainders(fontRid: Rid, keepRoundingRemainders: boolean): void
        
        /** Returns glyph position rounding behavior. If set to `true`, when aligning glyphs to the pixel boundaries rounding remainders are accumulated to ensure more uniform glyph distribution. This setting has no effect if subpixel positioning is enabled. */
        /* gdvirtual */ _fontGetKeepRoundingRemainders(fontRid: Rid): boolean
        
        /** Sets font embolden strength. If [param strength] is not equal to zero, emboldens the font outlines. Negative values reduce the outline thickness. */
        /* gdvirtual */ _fontSetEmbolden(fontRid: Rid, strength: float64): void
        
        /** Returns font embolden strength. */
        /* gdvirtual */ _fontGetEmbolden(fontRid: Rid): float64
        
        /** Sets the spacing for [param spacing] to [param value] in pixels (not relative to the font size). */
        /* gdvirtual */ _fontSetSpacing(fontRid: Rid, spacing: TextServer.SpacingType, value: int64): void
        
        /** Returns the spacing for [param spacing] in pixels (not relative to the font size). */
        /* gdvirtual */ _fontGetSpacing(fontRid: Rid, spacing: TextServer.SpacingType): int64
        
        /** Sets extra baseline offset (as a fraction of font height). */
        /* gdvirtual */ _fontSetBaselineOffset(fontRid: Rid, baselineOffset: float64): void
        
        /** Returns extra baseline offset (as a fraction of font height). */
        /* gdvirtual */ _fontGetBaselineOffset(fontRid: Rid): float64
        
        /** Sets 2D transform, applied to the font outlines, can be used for slanting, flipping, and rotating glyphs. */
        /* gdvirtual */ _fontSetTransform(fontRid: Rid, transform: Transform2D): void
        
        /** Returns 2D transform applied to the font outlines. */
        /* gdvirtual */ _fontGetTransform(fontRid: Rid): Transform2D
        
        /** Sets variation coordinates for the specified font cache entry. */
        /* gdvirtual */ _fontSetVariationCoordinates(fontRid: Rid, variationCoordinates: GDictionary): void
        
        /** Returns variation coordinates for the specified font cache entry. */
        /* gdvirtual */ _fontGetVariationCoordinates(fontRid: Rid): GDictionary
        
        /** If set to a positive value, overrides the oversampling factor of the viewport this font is used in. See [member Viewport.oversampling]. This value doesn't override the [code skip-lint]oversampling` parameter of [code skip-lint]draw_*` methods. Used by dynamic fonts only. */
        /* gdvirtual */ _fontSetOversampling(fontRid: Rid, oversampling: float64): void
        
        /** Returns oversampling factor override. If set to a positive value, overrides the oversampling factor of the viewport this font is used in. See [member Viewport.oversampling]. This value doesn't override the [code skip-lint]oversampling` parameter of [code skip-lint]draw_*` methods. Used by dynamic fonts only. */
        /* gdvirtual */ _fontGetOversampling(fontRid: Rid): float64
        
        /** Returns list of the font sizes in the cache. Each size is [Vector2i] with font size and outline size. */
        /* gdvirtual */ _fontGetSizeCacheList(fontRid: Rid): GArray<Vector2I>
        
        /** Removes all font sizes from the cache entry. */
        /* gdvirtual */ _fontClearSizeCache(fontRid: Rid): void
        
        /** Removes specified font size from the cache entry. */
        /* gdvirtual */ _fontRemoveSizeCache(fontRid: Rid, size: Vector2I): void
        
        /** Returns font cache information, each entry contains the following fields: `Vector2i size_px` - font size in pixels, `float viewport_oversampling` - viewport oversampling factor, `int glyphs` - number of rendered glyphs, `int textures` - number of used textures, `int textures_size` - size of texture data in bytes. */
        /* gdvirtual */ _fontGetSizeCacheInfo(fontRid: Rid): GArray<GDictionary>
        
        /** Sets the font ascent (number of pixels above the baseline). */
        /* gdvirtual */ _fontSetAscent(fontRid: Rid, size: int64, ascent: float64): void
        
        /** Returns the font ascent (number of pixels above the baseline). */
        /* gdvirtual */ _fontGetAscent(fontRid: Rid, size: int64): float64
        
        /** Sets the font descent (number of pixels below the baseline). */
        /* gdvirtual */ _fontSetDescent(fontRid: Rid, size: int64, descent: float64): void
        
        /** Returns the font descent (number of pixels below the baseline). */
        /* gdvirtual */ _fontGetDescent(fontRid: Rid, size: int64): float64
        
        /** Sets pixel offset of the underline below the baseline. */
        /* gdvirtual */ _fontSetUnderlinePosition(fontRid: Rid, size: int64, underlinePosition: float64): void
        
        /** Returns pixel offset of the underline below the baseline. */
        /* gdvirtual */ _fontGetUnderlinePosition(fontRid: Rid, size: int64): float64
        
        /** Sets thickness of the underline in pixels. */
        /* gdvirtual */ _fontSetUnderlineThickness(fontRid: Rid, size: int64, underlineThickness: float64): void
        
        /** Returns thickness of the underline in pixels. */
        /* gdvirtual */ _fontGetUnderlineThickness(fontRid: Rid, size: int64): float64
        
        /** Sets scaling factor of the color bitmap font. */
        /* gdvirtual */ _fontSetScale(fontRid: Rid, size: int64, scale: float64): void
        
        /** Returns scaling factor of the color bitmap font. */
        /* gdvirtual */ _fontGetScale(fontRid: Rid, size: int64): float64
        
        /** Returns number of textures used by font cache entry. */
        /* gdvirtual */ _fontGetTextureCount(fontRid: Rid, size: Vector2I): int64
        
        /** Removes all textures from font cache entry. */
        /* gdvirtual */ _fontClearTextures(fontRid: Rid, size: Vector2I): void
        
        /** Removes specified texture from the cache entry. */
        /* gdvirtual */ _fontRemoveTexture(fontRid: Rid, size: Vector2I, textureIndex: int64): void
        
        /** Sets font cache texture image data. */
        /* gdvirtual */ _fontSetTextureImage(fontRid: Rid, size: Vector2I, textureIndex: int64, image: Image): void
        
        /** Returns font cache texture image data. */
        /* gdvirtual */ _fontGetTextureImage(fontRid: Rid, size: Vector2I, textureIndex: int64): null | Image
        
        /** Sets array containing glyph packing data. */
        /* gdvirtual */ _fontSetTextureOffsets(fontRid: Rid, size: Vector2I, textureIndex: int64, offset: PackedInt32Array | int32[]): void
        
        /** Returns array containing glyph packing data. */
        /* gdvirtual */ _fontGetTextureOffsets(fontRid: Rid, size: Vector2I, textureIndex: int64): PackedInt32Array
        
        /** Returns list of rendered glyphs in the cache entry. */
        /* gdvirtual */ _fontGetGlyphList(fontRid: Rid, size: Vector2I): PackedInt32Array
        
        /** Removes all rendered glyph information from the cache entry. */
        /* gdvirtual */ _fontClearGlyphs(fontRid: Rid, size: Vector2I): void
        
        /** Removes specified rendered glyph information from the cache entry. */
        /* gdvirtual */ _fontRemoveGlyph(fontRid: Rid, size: Vector2I, glyph: int64): void
        
        /** Returns glyph advance (offset of the next glyph). */
        /* gdvirtual */ _fontGetGlyphAdvance(fontRid: Rid, size: int64, glyph: int64): Vector2
        
        /** Sets glyph advance (offset of the next glyph). */
        /* gdvirtual */ _fontSetGlyphAdvance(fontRid: Rid, size: int64, glyph: int64, advance: Vector2): void
        
        /** Returns glyph offset from the baseline. */
        /* gdvirtual */ _fontGetGlyphOffset(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Sets glyph offset from the baseline. */
        /* gdvirtual */ _fontSetGlyphOffset(fontRid: Rid, size: Vector2I, glyph: int64, offset: Vector2): void
        
        /** Returns size of the glyph. */
        /* gdvirtual */ _fontGetGlyphSize(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Sets size of the glyph. */
        /* gdvirtual */ _fontSetGlyphSize(fontRid: Rid, size: Vector2I, glyph: int64, glSize: Vector2): void
        
        /** Returns rectangle in the cache texture containing the glyph. */
        /* gdvirtual */ _fontGetGlyphUVRect(fontRid: Rid, size: Vector2I, glyph: int64): Rect2
        
        /** Sets rectangle in the cache texture containing the glyph. */
        /* gdvirtual */ _fontSetGlyphUVRect(fontRid: Rid, size: Vector2I, glyph: int64, uVRect: Rect2): void
        
        /** Returns index of the cache texture containing the glyph. */
        /* gdvirtual */ _fontGetGlyphTextureIdx(fontRid: Rid, size: Vector2I, glyph: int64): int64
        
        /** Sets index of the cache texture containing the glyph. */
        /* gdvirtual */ _fontSetGlyphTextureIdx(fontRid: Rid, size: Vector2I, glyph: int64, textureIdx: int64): void
        
        /** Returns resource ID of the cache texture containing the glyph. */
        /* gdvirtual */ _fontGetGlyphTextureRid(fontRid: Rid, size: Vector2I, glyph: int64): Rid
        
        /** Returns size of the cache texture containing the glyph. */
        /* gdvirtual */ _fontGetGlyphTextureSize(fontRid: Rid, size: Vector2I, glyph: int64): Vector2
        
        /** Returns outline contours of the glyph. */
        /* gdvirtual */ _fontGetGlyphContours(fontRid: Rid, size: int64, index: int64): GDictionary
        
        /** Returns list of the kerning overrides. */
        /* gdvirtual */ _fontGetKerningList(fontRid: Rid, size: int64): GArray<Vector2I>
        
        /** Removes all kerning overrides. */
        /* gdvirtual */ _fontClearKerningMap(fontRid: Rid, size: int64): void
        
        /** Removes kerning override for the pair of glyphs. */
        /* gdvirtual */ _fontRemoveKerning(fontRid: Rid, size: int64, glyphPair: Vector2I): void
        
        /** Sets kerning for the pair of glyphs. */
        /* gdvirtual */ _fontSetKerning(fontRid: Rid, size: int64, glyphPair: Vector2I, kerning: Vector2): void
        
        /** Returns kerning for the pair of glyphs. */
        /* gdvirtual */ _fontGetKerning(fontRid: Rid, size: int64, glyphPair: Vector2I): Vector2
        
        /** Returns the glyph index of a [param char], optionally modified by the [param variation_selector]. */
        /* gdvirtual */ _fontGetGlyphIndex(fontRid: Rid, size: int64, char: int64, variationSelector: int64): int64
        
        /** Returns character code associated with [param glyph_index], or `0` if [param glyph_index] is invalid. */
        /* gdvirtual */ _fontGetCharFromGlyphIndex(fontRid: Rid, size: int64, glyphIndex: int64): int64
        
        /** Returns `true` if a Unicode [param char] is available in the font. */
        /* gdvirtual */ _fontHasChar(fontRid: Rid, char: int64): boolean
        
        /** Returns a string containing all the characters available in the font. */
        /* gdvirtual */ _fontGetSupportedChars(fontRid: Rid): string
        
        /** Returns an array containing all glyph indices in the font. */
        /* gdvirtual */ _fontGetSupportedGlyphs(fontRid: Rid): PackedInt32Array
        
        /** Renders the range of characters to the font cache texture. */
        /* gdvirtual */ _fontRenderRange(fontRid: Rid, size: Vector2I, start: int64, end: int64): void
        
        /** Renders specified glyph to the font cache texture. */
        /* gdvirtual */ _fontRenderGlyph(fontRid: Rid, size: Vector2I, index: int64): void
        
        /** Draws single glyph into a canvas item at the position, using [param font_rid] at the size [param size]. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        /* gdvirtual */ _fontDrawGlyph(fontRid: Rid, canvas: Rid, size: int64, pos: Vector2, index: int64, color: Color, oversampling: float64): void
        
        /** Draws single glyph outline of size [param outline_size] into a canvas item at the position, using [param font_rid] at the size [param size]. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        /* gdvirtual */ _fontDrawGlyphOutline(fontRid: Rid, canvas: Rid, size: int64, outlineSize: int64, pos: Vector2, index: int64, color: Color, oversampling: float64): void
        
        /** Returns `true` if the font supports the given language (as a [url=https://en.wikipedia.org/wiki/ISO_639-1]ISO 639[/url] code). */
        /* gdvirtual */ _fontIsLanguageSupported(fontRid: Rid, language: string): boolean
        
        /** Adds override for [method _font_is_language_supported]. */
        /* gdvirtual */ _fontSetLanguageSupportOverride(fontRid: Rid, language: string, supported: boolean): void
        
        /** Returns `true` if support override is enabled for the [param language]. */
        /* gdvirtual */ _fontGetLanguageSupportOverride(fontRid: Rid, language: string): boolean
        
        /** Remove language support override. */
        /* gdvirtual */ _fontRemoveLanguageSupportOverride(fontRid: Rid, language: string): void
        
        /** Returns list of language support overrides. */
        /* gdvirtual */ _fontGetLanguageSupportOverrides(fontRid: Rid): PackedStringArray
        
        /** Returns `true` if the font supports the given script (as a [url=https://en.wikipedia.org/wiki/ISO_15924]ISO 15924[/url] code). */
        /* gdvirtual */ _fontIsScriptSupported(fontRid: Rid, script: string): boolean
        
        /** Adds override for [method _font_is_script_supported]. */
        /* gdvirtual */ _fontSetScriptSupportOverride(fontRid: Rid, script: string, supported: boolean): void
        
        /** Returns `true` if support override is enabled for the [param script]. */
        /* gdvirtual */ _fontGetScriptSupportOverride(fontRid: Rid, script: string): boolean
        
        /** Removes script support override. */
        /* gdvirtual */ _fontRemoveScriptSupportOverride(fontRid: Rid, script: string): void
        
        /** Returns list of script support overrides. */
        /* gdvirtual */ _fontGetScriptSupportOverrides(fontRid: Rid): PackedStringArray
        
        /** Sets font OpenType feature set override. */
        /* gdvirtual */ _fontSetOpentypeFeatureOverrides(fontRid: Rid, overrides: GDictionary): void
        
        /** Returns font OpenType feature set override. */
        /* gdvirtual */ _fontGetOpentypeFeatureOverrides(fontRid: Rid): GDictionary
        
        /** Returns the dictionary of the supported OpenType features. */
        /* gdvirtual */ _fontSupportedFeatureList(fontRid: Rid): GDictionary
        
        /** Returns the dictionary of the supported OpenType variation coordinates. */
        /* gdvirtual */ _fontSupportedVariationList(fontRid: Rid): GDictionary
        
        /** Returns the font oversampling factor, shared by all fonts in the TextServer. */
        /* gdvirtual */ _fontGetGlobalOversampling(): float64
        
        /** Sets oversampling factor, shared by all font in the TextServer. */
        /* gdvirtual */ _fontSetGlobalOversampling(oversampling: float64): void
        
        /** Increases the reference count of the specified oversampling level. This method is called by [Viewport], and should not be used directly. */
        /* gdvirtual */ _referenceOversamplingLevel(oversampling: float64): void
        
        /** Decreases the reference count of the specified oversampling level, and frees the font cache for oversampling level when the reference count reaches zero. This method is called by [Viewport], and should not be used directly. */
        /* gdvirtual */ _unreferenceOversamplingLevel(oversampling: float64): void
        
        /** Returns size of the replacement character (box with character hexadecimal code that is drawn in place of invalid characters). */
        /* gdvirtual */ _getHexCodeBoxSize(size: int64, index: int64): Vector2
        
        /** Draws box displaying character hexadecimal code. */
        /* gdvirtual */ _drawHexCodeBox(canvas: Rid, size: int64, pos: Vector2, index: int64, color: Color): void
        
        /** Creates a new buffer for complex text layout, with the given [param direction] and [param orientation]. */
        /* gdvirtual */ _createShapedText(direction: TextServer.Direction, orientation: TextServer.Orientation): Rid
        
        /** Clears text buffer (removes text and inline objects). */
        /* gdvirtual */ _shapedTextClear(shaped: Rid): void
        
        /** Duplicates shaped text buffer. */
        /* gdvirtual */ _shapedTextDuplicate(shaped: Rid): Rid
        
        /** Sets desired text direction. If set to [constant TextServer.DIRECTION_AUTO], direction will be detected based on the buffer contents and current locale. */
        /* gdvirtual */ _shapedTextSetDirection(shaped: Rid, direction: TextServer.Direction): void
        
        /** Returns direction of the text. */
        /* gdvirtual */ _shapedTextGetDirection(shaped: Rid): TextServer.Direction
        
        /** Returns direction of the text, inferred by the BiDi algorithm. */
        /* gdvirtual */ _shapedTextGetInferredDirection(shaped: Rid): TextServer.Direction
        
        /** Overrides BiDi for the structured text. */
        /* gdvirtual */ _shapedTextSetBidiOverride(shaped: Rid, override: GArray): void
        
        /** Sets custom punctuation character list, used for word breaking. If set to empty string, server defaults are used. */
        /* gdvirtual */ _shapedTextSetCustomPunctuation(shaped: Rid, punct: string): void
        
        /** Returns custom punctuation character list, used for word breaking. If set to empty string, server defaults are used. */
        /* gdvirtual */ _shapedTextGetCustomPunctuation(shaped: Rid): string
        
        /** Sets ellipsis character used for text clipping. */
        /* gdvirtual */ _shapedTextSetCustomEllipsis(shaped: Rid, char: int64): void
        
        /** Returns ellipsis character used for text clipping. */
        /* gdvirtual */ _shapedTextGetCustomEllipsis(shaped: Rid): int64
        
        /** Sets desired text orientation. */
        /* gdvirtual */ _shapedTextSetOrientation(shaped: Rid, orientation: TextServer.Orientation): void
        
        /** Returns text orientation. */
        /* gdvirtual */ _shapedTextGetOrientation(shaped: Rid): TextServer.Orientation
        
        /** If set to `true` text buffer will display invalid characters as hexadecimal codes, otherwise nothing is displayed. */
        /* gdvirtual */ _shapedTextSetPreserveInvalid(shaped: Rid, enabled: boolean): void
        
        /** Returns `true` if text buffer is configured to display hexadecimal codes in place of invalid characters. */
        /* gdvirtual */ _shapedTextGetPreserveInvalid(shaped: Rid): boolean
        
        /** If set to `true` text buffer will display control characters. */
        /* gdvirtual */ _shapedTextSetPreserveControl(shaped: Rid, enabled: boolean): void
        
        /** Returns `true` if text buffer is configured to display control characters. */
        /* gdvirtual */ _shapedTextGetPreserveControl(shaped: Rid): boolean
        
        /** Sets extra spacing added between glyphs or lines in pixels. */
        /* gdvirtual */ _shapedTextSetSpacing(shaped: Rid, spacing: TextServer.SpacingType, value: int64): void
        
        /** Returns extra spacing added between glyphs or lines in pixels. */
        /* gdvirtual */ _shapedTextGetSpacing(shaped: Rid, spacing: TextServer.SpacingType): int64
        
        /** Adds text span and font to draw it to the text buffer. */
        /* gdvirtual */ _shapedTextAddString(shaped: Rid, text: string, fonts: GArray<Rid>, size: int64, opentypeFeatures: GDictionary, language: string, meta: any): boolean
        
        /** Adds inline object to the text buffer, [param key] must be unique. In the text, object is represented as [param length] object replacement characters. */
        /* gdvirtual */ _shapedTextAddObject(shaped: Rid, key: any, size: Vector2, inlineAlign: InlineAlignment, length: int64, baseline: float64): boolean
        
        /** Sets new size and alignment of embedded object. */
        /* gdvirtual */ _shapedTextResizeObject(shaped: Rid, key: any, size: Vector2, inlineAlign: InlineAlignment, baseline: float64): boolean
        
        /** Returns `true` if an object with [param key] is embedded in this shaped text buffer. */
        /* gdvirtual */ _shapedTextHasObject(shaped: Rid, key: any): boolean
        
        /** Returns the text buffer source text, including object replacement characters. */
        /* gdvirtual */ _shapedGetText(shaped: Rid): string
        
        /** Returns number of text spans added using [method _shaped_text_add_string] or [method _shaped_text_add_object]. */
        /* gdvirtual */ _shapedGetSpanCount(shaped: Rid): int64
        
        /** Returns text span metadata. */
        /* gdvirtual */ _shapedGetSpanMeta(shaped: Rid, index: int64): any
        
        /** Returns text embedded object key. */
        /* gdvirtual */ _shapedGetSpanEmbeddedObject(shaped: Rid, index: int64): any
        
        /** Returns the text span source text. */
        /* gdvirtual */ _shapedGetSpanText(shaped: Rid, index: int64): string
        
        /** Returns the text span embedded object key. */
        /* gdvirtual */ _shapedGetSpanObject(shaped: Rid, index: int64): any
        
        /** Changes text span font, font size, and OpenType features, without changing the text. */
        /* gdvirtual */ _shapedSetSpanUpdateFont(shaped: Rid, index: int64, fonts: GArray<Rid>, size: int64, opentypeFeatures: GDictionary): void
        
        /** Returns the number of uniform text runs in the buffer. */
        /* gdvirtual */ _shapedGetRunCount(shaped: Rid): int64
        
        /** Returns the source text of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunText(shaped: Rid, index: int64): string
        
        /** Returns the source text range of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunRange(shaped: Rid, index: int64): Vector2I
        
        /** Returns the glyph range of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunGlyphRange(shaped: Rid, index: int64): Vector2I
        
        /** Returns the font RID of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunFontRid(shaped: Rid, index: int64): Rid
        
        /** Returns the font size of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunFontSize(shaped: Rid, index: int64): int64
        
        /** Returns the language of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunLanguage(shaped: Rid, index: int64): string
        
        /** Returns the direction of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunDirection(shaped: Rid, index: int64): TextServer.Direction
        
        /** Returns the embedded object of the [param index] text run (in visual order). */
        /* gdvirtual */ _shapedGetRunObject(shaped: Rid, index: int64): any
        
        /** Returns text buffer for the substring of the text in the [param shaped] text buffer (including inline objects). */
        /* gdvirtual */ _shapedTextSubstr(shaped: Rid, start: int64, length: int64): Rid
        
        /** Returns the parent buffer from which the substring originates. */
        /* gdvirtual */ _shapedTextGetParent(shaped: Rid): Rid
        
        /** Adjusts text width to fit to specified width, returns new text width. */
        /* gdvirtual */ _shapedTextFitToWidth(shaped: Rid, width: float64, justificationFlags: TextServer.JustificationFlag): float64
        
        /** Aligns shaped text to the given tab-stops. */
        /* gdvirtual */ _shapedTextTabAlign(shaped: Rid, tabStops: PackedFloat32Array | float32[]): float64
        
        /** Shapes buffer if it's not shaped. Returns `true` if the string is shaped successfully. */
        /* gdvirtual */ _shapedTextShape(shaped: Rid): boolean
        
        /** Updates break points in the shaped text. This method is called by default implementation of text breaking functions. */
        /* gdvirtual */ _shapedTextUpdateBreaks(shaped: Rid): boolean
        
        /** Updates justification points in the shaped text. This method is called by default implementation of text justification functions. */
        /* gdvirtual */ _shapedTextUpdateJustificationOps(shaped: Rid): boolean
        
        /** Returns `true` if buffer is successfully shaped. */
        /* gdvirtual */ _shapedTextIsReady(shaped: Rid): boolean
        
        /** Returns an array of glyphs in the visual order. */
        /* gdvirtual */ _shapedTextGetGlyphs(shaped: Rid): int64
        
        /** Returns text glyphs in the logical order. */
        /* gdvirtual */ _shapedTextSortLogical(shaped: Rid): int64
        
        /** Returns number of glyphs in the buffer. */
        /* gdvirtual */ _shapedTextGetGlyphCount(shaped: Rid): int64
        
        /** Returns substring buffer character range in the parent buffer. */
        /* gdvirtual */ _shapedTextGetRange(shaped: Rid): Vector2I
        
        /** Breaks text to the lines and columns. Returns character ranges for each segment. */
        /* gdvirtual */ _shapedTextGetLineBreaksAdv(shaped: Rid, width: PackedFloat32Array | float32[], start: int64, once: boolean, breakFlags: TextServer.LineBreakFlag): PackedInt32Array
        
        /** Breaks text to the lines and returns character ranges for each line. */
        /* gdvirtual */ _shapedTextGetLineBreaks(shaped: Rid, width: float64, start: int64, breakFlags: TextServer.LineBreakFlag): PackedInt32Array
        
        /** Breaks text into words and returns array of character ranges. Use [param grapheme_flags] to set what characters are used for breaking. */
        /* gdvirtual */ _shapedTextGetWordBreaks(shaped: Rid, graphemeFlags: TextServer.GraphemeFlag, skipGraphemeFlags: TextServer.GraphemeFlag): PackedInt32Array
        
        /** Returns the position of the overrun trim. */
        /* gdvirtual */ _shapedTextGetTrimPos(shaped: Rid): int64
        
        /** Returns position of the ellipsis. */
        /* gdvirtual */ _shapedTextGetEllipsisPos(shaped: Rid): int64
        
        /** Returns number of glyphs in the ellipsis. */
        /* gdvirtual */ _shapedTextGetEllipsisGlyphCount(shaped: Rid): int64
        
        /** Returns array of the glyphs in the ellipsis. */
        /* gdvirtual */ _shapedTextGetEllipsisGlyphs(shaped: Rid): int64
        
        /** Trims text if it exceeds the given width. */
        /* gdvirtual */ _shapedTextOverrunTrimToWidth(shaped: Rid, width: float64, trimFlags: TextServer.TextOverrunFlag): void
        
        /** Returns array of inline objects. */
        /* gdvirtual */ _shapedTextGetObjects(shaped: Rid): GArray
        
        /** Returns bounding rectangle of the inline object. */
        /* gdvirtual */ _shapedTextGetObjectRect(shaped: Rid, key: any): Rect2
        
        /** Returns the character range of the inline object. */
        /* gdvirtual */ _shapedTextGetObjectRange(shaped: Rid, key: any): Vector2I
        
        /** Returns the glyph index of the inline object. */
        /* gdvirtual */ _shapedTextGetObjectGlyph(shaped: Rid, key: any): int64
        
        /** Returns size of the text. */
        /* gdvirtual */ _shapedTextGetSize(shaped: Rid): Vector2
        
        /** Returns the text ascent (number of pixels above the baseline for horizontal layout or to the left of baseline for vertical). */
        /* gdvirtual */ _shapedTextGetAscent(shaped: Rid): float64
        
        /** Returns the text descent (number of pixels below the baseline for horizontal layout or to the right of baseline for vertical). */
        /* gdvirtual */ _shapedTextGetDescent(shaped: Rid): float64
        
        /** Returns width (for horizontal layout) or height (for vertical) of the text. */
        /* gdvirtual */ _shapedTextGetWidth(shaped: Rid): float64
        
        /** Returns pixel offset of the underline below the baseline. */
        /* gdvirtual */ _shapedTextGetUnderlinePosition(shaped: Rid): float64
        
        /** Returns thickness of the underline. */
        /* gdvirtual */ _shapedTextGetUnderlineThickness(shaped: Rid): float64
        
        /** Returns dominant direction of in the range of text. */
        /* gdvirtual */ _shapedTextGetDominantDirectionInRange(shaped: Rid, start: int64, end: int64): int64
        
        /** Returns shapes of the carets corresponding to the character offset [param position] in the text. Returned caret shape is 1 pixel wide rectangle. */
        /* gdvirtual */ _shapedTextGetCarets(shaped: Rid, position: int64, rCaret: int64): void
        
        /** Returns selection rectangles for the specified character range. */
        /* gdvirtual */ _shapedTextGetSelection(shaped: Rid, start: int64, end: int64): PackedVector2Array
        
        /** Returns grapheme index at the specified pixel offset at the baseline, or `-1` if none is found. */
        /* gdvirtual */ _shapedTextHitTestGrapheme(shaped: Rid, coord: float64): int64
        
        /** Returns caret character offset at the specified pixel offset at the baseline. This function always returns a valid position. */
        /* gdvirtual */ _shapedTextHitTestPosition(shaped: Rid, coord: float64): int64
        
        /** Draw shaped text into a canvas item at a given position, with [param color]. [param pos] specifies the leftmost point of the baseline (for horizontal layout) or topmost point of the baseline (for vertical layout). If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        /* gdvirtual */ _shapedTextDraw(shaped: Rid, canvas: Rid, pos: Vector2, clipL: float64, clipR: float64, color: Color, oversampling: float64): void
        
        /** Draw the outline of the shaped text into a canvas item at a given position, with [param color]. [param pos] specifies the leftmost point of the baseline (for horizontal layout) or topmost point of the baseline (for vertical layout). If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        /* gdvirtual */ _shapedTextDrawOutline(shaped: Rid, canvas: Rid, pos: Vector2, clipL: float64, clipR: float64, outlineSize: int64, color: Color, oversampling: float64): void
        
        /** Returns composite character's bounds as offsets from the start of the line. */
        /* gdvirtual */ _shapedTextGetGraphemeBounds(shaped: Rid, pos: int64): Vector2
        
        /** Returns grapheme end position closest to the [param pos]. */
        /* gdvirtual */ _shapedTextNextGraphemePos(shaped: Rid, pos: int64): int64
        
        /** Returns grapheme start position closest to the [param pos]. */
        /* gdvirtual */ _shapedTextPrevGraphemePos(shaped: Rid, pos: int64): int64
        
        /** Returns array of the composite character boundaries. */
        /* gdvirtual */ _shapedTextGetCharacterBreaks(shaped: Rid): PackedInt32Array
        
        /** Returns composite character end position closest to the [param pos]. */
        /* gdvirtual */ _shapedTextNextCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Returns composite character start position closest to the [param pos]. */
        /* gdvirtual */ _shapedTextPrevCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Returns composite character position closest to the [param pos]. */
        /* gdvirtual */ _shapedTextClosestCharacterPos(shaped: Rid, pos: int64): int64
        
        /** Converts a number from Western Arabic (0..9) to the numeral system used in the given [param language].  
         *  If [param language] is an empty string, the active locale will be used.  
         */
        /* gdvirtual */ _formatNumber(number: string, language: string): string
        
        /** Converts [param number] from the numeral system used in the given [param language] to Western Arabic (0..9).  
         *  If [param language] is an empty string, the active locale will be used.  
         */
        /* gdvirtual */ _parseNumber(number: string, language: string): string
        
        /** Returns percent sign used in the given [param language]. */
        /* gdvirtual */ _percentSign(language: string): string
        
        /** Strips diacritics from the string. */
        /* gdvirtual */ _stripDiacritics(string_: string): string
        
        /** Returns `true` if [param string] is a valid identifier. */
        /* gdvirtual */ _isValidIdentifier(string_: string): boolean
        /* gdvirtual */ _isValidLetter(unicode: int64): boolean
        
        /** Returns an array of the word break boundaries. Elements in the returned array are the offsets of the start and end of words. Therefore the length of the array is always even. */
        /* gdvirtual */ _stringGetWordBreaks(string_: string, language: string, charsPerLine: int64): PackedInt32Array
        
        /** Returns array of the composite character boundaries. */
        /* gdvirtual */ _stringGetCharacterBreaks(string_: string, language: string): PackedInt32Array
        
        /** Returns index of the first string in [param dict] which is visually confusable with the [param string], or `-1` if none is found. */
        /* gdvirtual */ _isConfusable(string_: string, dict: PackedStringArray | string[]): int64
        
        /** Returns `true` if [param string] is likely to be an attempt at confusing the reader. */
        /* gdvirtual */ _spoofCheck(string_: string): boolean
        
        /** Returns the string converted to `UPPERCASE`. */
        /* gdvirtual */ _stringToUpper(string_: string, language: string): string
        
        /** Returns the string converted to `lowercase`. */
        /* gdvirtual */ _stringToLower(string_: string, language: string): string
        
        /** Returns the string converted to `Title Case`. */
        /* gdvirtual */ _stringToTitle(string_: string, language: string): string
        
        /** Default implementation of the BiDi algorithm override function. */
        /* gdvirtual */ _parseStructuredText(parserType: TextServer.StructuredTextParser, args: GArray, text: string): GArray<Vector3I>
        
        /** This method is called before text server is unregistered. */
        /* gdvirtual */ _cleanup(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextServerExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextServerExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture extends __NameMapResource {
    }
    /** Base class for all texture types.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texture.html  
     */
    class Texture extends Resource {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture2D extends __RPCMapTexture {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture2D extends __NameMapTexture {
        _get_image: "_getImage";
        _get_format: "_getFormat";
        _get_mipmap_count: "_getMipmapCount";
        _get_width: "_getWidth";
        _get_height: "_getHeight";
        _is_pixel_opaque: "_isPixelOpaque";
        _has_alpha: "_hasAlpha";
        _has_mipmaps: "_hasMipmaps";
        _draw_rect: "_drawRect";
        _draw_rect_region: "_drawRectRegion";
        get_format: "getFormat";
        get_mipmap_count: "getMipmapCount";
        get_width: "getWidth";
        get_height: "getHeight";
        get_size: "getSize";
        has_alpha: "hasAlpha";
        has_mipmaps: "hasMipmaps";
        draw_rect: "drawRect";
        draw_rect_region: "drawRectRegion";
        get_image: "getImage";
        create_placeholder: "createPlaceholder";
    }
    /** Texture for 2D and 3D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texture2d.html  
     */
    class Texture2D extends Texture {
        constructor(identifier?: any)
        /** Called when [method get_image] is called. */
        /* gdvirtual */ _getImage(): null | Image
        
        /** Called when [method get_format] is called. */
        /* gdvirtual */ _getFormat(): Image.Format
        
        /** Called when [method get_mipmap_count] is called. */
        /* gdvirtual */ _getMipmapCount(): int64
        
        /** Called when the [Texture2D]'s width is queried. */
        /* gdvirtual */ _getWidth(): int64
        
        /** Called when the [Texture2D]'s height is queried. */
        /* gdvirtual */ _getHeight(): int64
        
        /** Called when a pixel's opaque state in the [Texture2D] is queried at the specified `(x, y)` position. */
        /* gdvirtual */ _isPixelOpaque(x: int64, y: int64): boolean
        
        /** Called when the presence of an alpha channel in the [Texture2D] is queried. */
        /* gdvirtual */ _hasAlpha(): boolean
        
        /** Called when [method has_mipmaps] is called. */
        /* gdvirtual */ _hasMipmaps(): boolean
        
        /** Called when the entire [Texture2D] is requested to be drawn over a [CanvasItem], with the top-left offset specified in [param pos]. [param modulate] specifies a multiplier for the colors being drawn, while [param transpose] specifies whether drawing should be performed in column-major order instead of row-major order (resulting in 90-degree clockwise rotation).  
         *      
         *  **Note:** This is only used in 2D rendering, not 3D.  
         */
        /* gdvirtual */ _draw(toCanvasItem: Rid, pos: Vector2, modulate: Color, transpose: boolean): void
        
        /** Called when the [Texture2D] is requested to be drawn onto [CanvasItem]'s specified [param rect]. [param modulate] specifies a multiplier for the colors being drawn, while [param transpose] specifies whether drawing should be performed in column-major order instead of row-major order (resulting in 90-degree clockwise rotation).  
         *      
         *  **Note:** This is only used in 2D rendering, not 3D.  
         */
        /* gdvirtual */ _drawRect(toCanvasItem: Rid, rect: Rect2, tile: boolean, modulate: Color, transpose: boolean): void
        
        /** Called when a part of the [Texture2D] specified by [param src_rect]'s coordinates is requested to be drawn onto [CanvasItem]'s specified [param rect]. [param modulate] specifies a multiplier for the colors being drawn, while [param transpose] specifies whether drawing should be performed in column-major order instead of row-major order (resulting in 90-degree clockwise rotation).  
         *      
         *  **Note:** This is only used in 2D rendering, not 3D.  
         */
        /* gdvirtual */ _drawRectRegion(toCanvasItem: Rid, rect: Rect2, srcRect: Rect2, modulate: Color, transpose: boolean, clipUV: boolean): void
        
        /** Returns the image format of the texture. */
        getFormat(): Image.Format
        
        /** Returns the number of mipmaps of the texture. */
        getMipmapCount(): int64
        
        /** Returns the texture width in pixels. */
        getWidth(): int64
        
        /** Returns the texture height in pixels. */
        getHeight(): int64
        
        /** Returns the texture size in pixels. */
        getSize(): Vector2
        
        /** Returns `true` if this [Texture2D] has an alpha channel. */
        hasAlpha(): boolean
        
        /** Returns `true` if the texture has mipmaps. */
        hasMipmaps(): boolean
        
        /** Draws the texture using a [CanvasItem] with the [RenderingServer] API at the specified [param position]. */
        draw(canvasItem: Rid, position: Vector2, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */): void
        
        /** Draws the texture using a [CanvasItem] with the [RenderingServer] API. */
        drawRect(canvasItem: Rid, rect: Rect2, tile: boolean, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */): void
        
        /** Draws a part of the texture using a [CanvasItem] with the [RenderingServer] API. */
        drawRectRegion(canvasItem: Rid, rect: Rect2, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */, clipUV?: boolean /* = true */): void
        
        /** Returns an [Image] that is a copy of data from this [Texture2D] (a new [Image] is created each time). [Image]s can be accessed and manipulated directly.  
         *      
         *  **Note:** This will return `null` if this [Texture2D] is invalid.  
         *      
         *  **Note:** This will fetch the texture data from the GPU, which might cause performance problems when overused. Avoid calling [method get_image] every frame, especially on large textures.  
         */
        getImage(): null | Image
        
        /** Creates a placeholder version of this resource ([PlaceholderTexture2D]). */
        createPlaceholder(): Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture2DArray extends __RPCMapImageTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture2DArray extends __NameMapImageTextureLayered {
        create_placeholder: "createPlaceholder";
    }
    /** A single texture resource which consists of multiple, separate images. Each image has the same dimensions and number of mipmap levels.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texture2darray.html  
     */
    class Texture2DArray extends ImageTextureLayered {
        constructor(identifier?: any)
        /** Creates a placeholder version of this resource ([PlaceholderTexture2DArray]). */
        createPlaceholder(): Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture2DArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture2DArray;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture2DArrayRD extends __RPCMapTextureLayeredRD {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture2DArrayRD extends __NameMapTextureLayeredRD {
    }
    /** Texture Array for 2D that is bound to a texture created on the [RenderingDevice].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texture2darrayrd.html  
     */
    class Texture2DArrayRD extends TextureLayeredRD {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture2DArrayRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture2DArrayRD;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture2Drd extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture2Drd extends __NameMapTexture2D {
        texture_rd_rid: "textureRdRid";
    }
    class Texture2Drd extends Texture2D {
        constructor(identifier?: any)
        get textureRdRid(): Rid
        set textureRdRid(value: Rid)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture2Drd;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture2Drd;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture3D extends __RPCMapTexture {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture3D extends __NameMapTexture {
        _get_format: "_getFormat";
        _get_width: "_getWidth";
        _get_height: "_getHeight";
        _get_depth: "_getDepth";
        _has_mipmaps: "_hasMipmaps";
        _get_data: "_getData";
        get_format: "getFormat";
        get_width: "getWidth";
        get_height: "getHeight";
        get_depth: "getDepth";
        has_mipmaps: "hasMipmaps";
        get_data: "getData";
        create_placeholder: "createPlaceholder";
    }
    /** Base class for 3-dimensional textures.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texture3d.html  
     */
    class Texture3D extends Texture {
        constructor(identifier?: any)
        /** Called when the [Texture3D]'s format is queried. */
        /* gdvirtual */ _getFormat(): Image.Format
        
        /** Called when the [Texture3D]'s width is queried. */
        /* gdvirtual */ _getWidth(): int64
        
        /** Called when the [Texture3D]'s height is queried. */
        /* gdvirtual */ _getHeight(): int64
        
        /** Called when the [Texture3D]'s depth is queried. */
        /* gdvirtual */ _getDepth(): int64
        
        /** Called when the presence of mipmaps in the [Texture3D] is queried. */
        /* gdvirtual */ _hasMipmaps(): boolean
        
        /** Called when the [Texture3D]'s data is queried. */
        /* gdvirtual */ _getData(): GArray<Image>
        
        /** Returns the current format being used by this texture. */
        getFormat(): Image.Format
        
        /** Returns the [Texture3D]'s width in pixels. Width is typically represented by the X axis. */
        getWidth(): int64
        
        /** Returns the [Texture3D]'s height in pixels. Width is typically represented by the Y axis. */
        getHeight(): int64
        
        /** Returns the [Texture3D]'s depth in pixels. Depth is typically represented by the Z axis (a dimension not present in [Texture2D]). */
        getDepth(): int64
        
        /** Returns `true` if the [Texture3D] has generated mipmaps. */
        hasMipmaps(): boolean
        
        /** Returns the [Texture3D]'s data as an array of [Image]s. Each [Image] represents a  *slice*  of the [Texture3D], with different slices mapping to different depth (Z axis) levels. */
        getData(): GArray<Image>
        
        /** Creates a placeholder version of this resource ([PlaceholderTexture3D]). */
        createPlaceholder(): Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTexture3Drd extends __RPCMapTexture3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTexture3Drd extends __NameMapTexture3D {
        texture_rd_rid: "textureRdRid";
    }
    class Texture3Drd extends Texture3D {
        constructor(identifier?: any)
        get textureRdRid(): Rid
        set textureRdRid(value: Rid)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTexture3Drd;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTexture3Drd;
    }
    namespace TextureButton {
        enum StretchMode {
            StretchScale = 0,
            StretchTile = 1,
            StretchKeep = 2,
            StretchKeepCentered = 3,
            StretchKeepAspect = 4,
            StretchKeepAspectCentered = 5,
            StretchKeepAspectCovered = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureButton extends __RPCMapBaseButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureButton extends __NameMapBaseButton {
        texture_normal: "textureNormal";
        texture_pressed: "texturePressed";
        texture_hover: "textureHover";
        texture_disabled: "textureDisabled";
        texture_focused: "textureFocused";
        texture_click_mask: "textureClickMask";
        ignore_texture_size: "ignoreTextureSize";
        stretch_mode: "stretchMode";
        flip_h: "flipH";
        flip_v: "flipV";
    }
    /** Texture-based button. Supports Pressed, Hover, Disabled and Focused states.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturebutton.html  
     */
    class TextureButton<Map extends NodePathMap = any> extends BaseButton<Map> {
        constructor(identifier?: any)
        /** Texture to display by default, when the node is **not** in the disabled, hover or pressed state. This texture is still displayed in the focused state, with [member texture_focused] drawn on top. */
        get textureNormal(): null | Texture2D
        set textureNormal(value: null | Texture2D)
        
        /** Texture to display on mouse down over the node, if the node has keyboard focus and the player presses the Enter key or if the player presses the [member BaseButton.shortcut] key. If not assigned, the [TextureButton] displays [member texture_hover] instead when pressed. */
        get texturePressed(): null | Texture2D
        set texturePressed(value: null | Texture2D)
        
        /** Texture to display when the mouse hovers over the node. If not assigned, the [TextureButton] displays [member texture_normal] instead when hovered over. */
        get textureHover(): null | Texture2D
        set textureHover(value: null | Texture2D)
        
        /** Texture to display when the node is disabled. See [member BaseButton.disabled]. If not assigned, the [TextureButton] displays [member texture_normal] instead. */
        get textureDisabled(): null | Texture2D
        set textureDisabled(value: null | Texture2D)
        
        /** Texture to  *overlay on the base texture*  when the node has mouse or keyboard focus. Because [member texture_focused] is displayed on top of the base texture, a partially transparent texture should be used to ensure the base texture remains visible. A texture that represents an outline or an underline works well for this purpose. To disable the focus visual effect, assign a fully transparent texture of any size. Note that disabling the focus visual effect will harm keyboard/controller navigation usability, so this is not recommended for accessibility reasons. */
        get textureFocused(): null | Texture2D
        set textureFocused(value: null | Texture2D)
        
        /** Pure black and white [BitMap] image to use for click detection. On the mask, white pixels represent the button's clickable area. Use it to create buttons with curved shapes. */
        get textureClickMask(): null | Bitmap
        set textureClickMask(value: null | Bitmap)
        
        /** If `true`, the size of the texture won't be considered for minimum size calculation, so the [TextureButton] can be shrunk down past the texture size. */
        get ignoreTextureSize(): boolean
        set ignoreTextureSize(value: boolean)
        
        /** Controls the texture's behavior when you resize the node's bounding rectangle. See the [enum StretchMode] constants for available options. */
        get stretchMode(): int64
        set stretchMode(value: int64)
        
        /** If `true`, texture is flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, texture is flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureButton;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureCubemapArrayRD extends __RPCMapTextureLayeredRD {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureCubemapArrayRD extends __NameMapTextureLayeredRD {
    }
    /** Texture Array for Cubemaps that is bound to a texture created on the [RenderingDevice].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturecubemaparrayrd.html  
     */
    class TextureCubemapArrayRD extends TextureLayeredRD {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureCubemapArrayRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureCubemapArrayRD;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureCubemapRD extends __RPCMapTextureLayeredRD {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureCubemapRD extends __NameMapTextureLayeredRD {
    }
    /** Texture for Cubemap that is bound to a texture created on the [RenderingDevice].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturecubemaprd.html  
     */
    class TextureCubemapRD extends TextureLayeredRD {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureCubemapRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureCubemapRD;
    }
    namespace TextureLayered {
        enum LayeredType {
            LayeredType2DArray = 0,
            LayeredTypeCubemap = 1,
            LayeredTypeCubemapArray = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureLayered extends __RPCMapTexture {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureLayered extends __NameMapTexture {
        _get_format: "_getFormat";
        _get_layered_type: "_getLayeredType";
        _get_width: "_getWidth";
        _get_height: "_getHeight";
        _get_layers: "_getLayers";
        _has_mipmaps: "_hasMipmaps";
        _get_layer_data: "_getLayerData";
        get_format: "getFormat";
        get_layered_type: "getLayeredType";
        get_width: "getWidth";
        get_height: "getHeight";
        get_layers: "getLayers";
        has_mipmaps: "hasMipmaps";
        get_layer_data: "getLayerData";
    }
    /** Base class for texture types which contain the data of multiple [Image]s. Each image is of the same size and format.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturelayered.html  
     */
    class TextureLayered extends Texture {
        constructor(identifier?: any)
        /** Called when the [TextureLayered]'s format is queried. */
        /* gdvirtual */ _getFormat(): Image.Format
        
        /** Called when the layers' type in the [TextureLayered] is queried. */
        /* gdvirtual */ _getLayeredType(): int64
        
        /** Called when the [TextureLayered]'s width queried. */
        /* gdvirtual */ _getWidth(): int64
        
        /** Called when the [TextureLayered]'s height is queried. */
        /* gdvirtual */ _getHeight(): int64
        
        /** Called when the number of layers in the [TextureLayered] is queried. */
        /* gdvirtual */ _getLayers(): int64
        
        /** Called when the presence of mipmaps in the [TextureLayered] is queried. */
        /* gdvirtual */ _hasMipmaps(): boolean
        
        /** Called when the data for a layer in the [TextureLayered] is queried. */
        /* gdvirtual */ _getLayerData(layerIndex: int64): null | Image
        
        /** Returns the current format being used by this texture. */
        getFormat(): Image.Format
        
        /** Returns the [TextureLayered]'s type. The type determines how the data is accessed, with cubemaps having special types. */
        getLayeredType(): TextureLayered.LayeredType
        
        /** Returns the width of the texture in pixels. Width is typically represented by the X axis. */
        getWidth(): int64
        
        /** Returns the height of the texture in pixels. Height is typically represented by the Y axis. */
        getHeight(): int64
        
        /** Returns the number of referenced [Image]s. */
        getLayers(): int64
        
        /** Returns `true` if the layers have generated mipmaps. */
        hasMipmaps(): boolean
        
        /** Returns an [Image] resource with the data from specified [param layer]. */
        getLayerData(layer: int64): null | Image
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureLayered;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureLayered;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureLayeredRD extends __RPCMapTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureLayeredRD extends __NameMapTextureLayered {
        texture_rd_rid: "textureRdRid";
    }
    /** Abstract base class for layered texture RD types.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturelayeredrd.html  
     */
    class TextureLayeredRD extends TextureLayered {
        constructor(identifier?: any)
        /** The RID of the texture object created on the [RenderingDevice]. */
        get textureRdRid(): Rid
        set textureRdRid(value: Rid)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureLayeredRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureLayeredRD;
    }
    namespace TextureProgressBar {
        enum FillMode {
            FillLeftToRight = 0,
            FillRightToLeft = 1,
            FillTopToBottom = 2,
            FillBottomToTop = 3,
            FillClockwise = 4,
            FillCounterClockwise = 5,
            FillBilinearLeftAndRight = 6,
            FillBilinearTopAndBottom = 7,
            FillClockwiseAndCounterClockwise = 8,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureProgressBar extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureProgressBar extends __NameMapRange {
        set_stretch_margin: "setStretchMargin";
        get_stretch_margin: "getStretchMargin";
        fill_mode: "fillMode";
        radial_initial_angle: "radialInitialAngle";
        radial_fill_degrees: "radialFillDegrees";
        radial_center_offset: "radialCenterOffset";
        nine_patch_stretch: "ninePatchStretch";
        stretch_margin_left: "stretchMarginLeft";
        stretch_margin_top: "stretchMarginTop";
        stretch_margin_right: "stretchMarginRight";
        stretch_margin_bottom: "stretchMarginBottom";
        texture_under: "textureUnder";
        texture_over: "textureOver";
        texture_progress: "textureProgress";
        texture_progress_offset: "textureProgressOffset";
        tint_under: "tintUnder";
        tint_over: "tintOver";
        tint_progress: "tintProgress";
    }
    /** Texture-based progress bar. Useful for loading screens and life or stamina bars.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_textureprogressbar.html  
     */
    class TextureProgressBar<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** Sets the stretch margin with the specified index. See [member stretch_margin_bottom] and related properties. */
        setStretchMargin(margin: Side, value: int64): void
        
        /** Returns the stretch margin with the specified index. See [member stretch_margin_bottom] and related properties. */
        getStretchMargin(margin: Side): int64
        
        /** The fill direction. See [enum FillMode] for possible values. */
        get fillMode(): int64
        set fillMode(value: int64)
        
        /** Starting angle for the fill of [member texture_progress] if [member fill_mode] is [constant FILL_CLOCKWISE], [constant FILL_COUNTER_CLOCKWISE], or [constant FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE]. When the node's `value` is equal to its `min_value`, the texture doesn't show up at all. When the `value` increases, the texture fills and tends towards [member radial_fill_degrees].  
         *      
         *  **Note:** [member radial_initial_angle] is wrapped between `0` and `360` degrees (inclusive).  
         */
        get radialInitialAngle(): float64
        set radialInitialAngle(value: float64)
        
        /** Upper limit for the fill of [member texture_progress] if [member fill_mode] is [constant FILL_CLOCKWISE], [constant FILL_COUNTER_CLOCKWISE], or [constant FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE]. When the node's `value` is equal to its `max_value`, the texture fills up to this angle.  
         *  See [member Range.value], [member Range.max_value].  
         */
        get radialFillDegrees(): float64
        set radialFillDegrees(value: float64)
        
        /** Offsets [member texture_progress] if [member fill_mode] is [constant FILL_CLOCKWISE], [constant FILL_COUNTER_CLOCKWISE], or [constant FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE].  
         *      
         *  **Note:** The effective radial center always stays within the [member texture_progress] bounds. If you need to move it outside the texture's bounds, modify the [member texture_progress] to contain additional empty space where needed.  
         */
        get radialCenterOffset(): Vector2
        set radialCenterOffset(value: Vector2)
        
        /** If `true`, Godot treats the bar's textures like in [NinePatchRect]. Use the `stretch_margin_*` properties like [member stretch_margin_bottom] to set up the nine patch's 3×3 grid. When using a radial [member fill_mode], this setting will only enable stretching for [member texture_progress], while [member texture_under] and [member texture_over] will be treated like in [NinePatchRect]. */
        get ninePatchStretch(): boolean
        set ninePatchStretch(value: boolean)
        
        /** The width of the 9-patch's left column. Only effective if [member nine_patch_stretch] is `true`. */
        get stretchMarginLeft(): int64
        set stretchMarginLeft(value: int64)
        
        /** The height of the 9-patch's top row. Only effective if [member nine_patch_stretch] is `true`. */
        get stretchMarginTop(): int64
        set stretchMarginTop(value: int64)
        
        /** The width of the 9-patch's right column. Only effective if [member nine_patch_stretch] is `true`. */
        get stretchMarginRight(): int64
        set stretchMarginRight(value: int64)
        
        /** The height of the 9-patch's bottom row. A margin of 16 means the 9-slice's bottom corners and side will have a height of 16 pixels. You can set all 4 margin values individually to create panels with non-uniform borders. Only effective if [member nine_patch_stretch] is `true`. */
        get stretchMarginBottom(): int64
        set stretchMarginBottom(value: int64)
        
        /** [Texture2D] that draws under the progress bar. The bar's background. */
        get textureUnder(): null | Texture2D
        set textureUnder(value: null | Texture2D)
        
        /** [Texture2D] that draws over the progress bar. Use it to add highlights or an upper-frame that hides part of [member texture_progress]. */
        get textureOver(): null | Texture2D
        set textureOver(value: null | Texture2D)
        
        /** [Texture2D] that clips based on the node's `value` and [member fill_mode]. As `value` increased, the texture fills up. It shows entirely when `value` reaches `max_value`. It doesn't show at all if `value` is equal to `min_value`.  
         *  The `value` property comes from [Range]. See [member Range.value], [member Range.min_value], [member Range.max_value].  
         */
        get textureProgress(): null | Texture2D
        set textureProgress(value: null | Texture2D)
        
        /** The offset of [member texture_progress]. Useful for [member texture_over] and [member texture_under] with fancy borders, to avoid transparent margins in your progress texture. */
        get textureProgressOffset(): Vector2
        set textureProgressOffset(value: Vector2)
        
        /** Multiplies the color of the bar's [member texture_under] texture. */
        get tintUnder(): Color
        set tintUnder(value: Color)
        
        /** Multiplies the color of the bar's [member texture_over] texture. The effect is similar to [member CanvasItem.modulate], except it only affects this specific texture instead of the entire node. */
        get tintOver(): Color
        set tintOver(value: Color)
        
        /** Multiplies the color of the bar's [member texture_progress] texture. */
        get tintProgress(): Color
        set tintProgress(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureProgressBar;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureProgressBar;
    }
    namespace TextureRect {
        enum ExpandMode {
            ExpandKeepSize = 0,
            ExpandIgnoreSize = 1,
            ExpandFitWidth = 2,
            ExpandFitWidthProportional = 3,
            ExpandFitHeight = 4,
            ExpandFitHeightProportional = 5,
        }
        enum StretchMode {
            StretchScale = 0,
            StretchTile = 1,
            StretchKeep = 2,
            StretchKeepCentered = 3,
            StretchKeepAspect = 4,
            StretchKeepAspectCentered = 5,
            StretchKeepAspectCovered = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTextureRect extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTextureRect extends __NameMapControl {
        expand_mode: "expandMode";
        stretch_mode: "stretchMode";
        flip_h: "flipH";
        flip_v: "flipV";
    }
    /** A control that displays a texture.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_texturerect.html  
     */
    class TextureRect<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** The node's [Texture2D] resource. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** Defines how minimum size is determined based on the texture's size. */
        get expandMode(): int64
        set expandMode(value: int64)
        
        /** Controls the texture's behavior when resizing the node's bounding rectangle. */
        get stretchMode(): int64
        set stretchMode(value: int64)
        
        /** If `true`, texture is flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, texture is flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTextureRect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTextureRect;
    }
    namespace Theme {
        enum DataType {
            DataTypeColor = 0,
            DataTypeConstant = 1,
            DataTypeFont = 2,
            DataTypeFontSize = 3,
            DataTypeIcon = 4,
            DataTypeStylebox = 5,
            DataTypeSound = 6,
            DataTypeMax = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTheme extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTheme extends __NameMapResource {
        set_icon: "setIcon";
        get_icon: "getIcon";
        has_icon: "hasIcon";
        rename_icon: "renameIcon";
        clear_icon: "clearIcon";
        get_icon_list: "getIconList";
        get_icon_type_list: "getIconTypeList";
        set_stylebox: "setStylebox";
        get_stylebox: "getStylebox";
        has_stylebox: "hasStylebox";
        rename_stylebox: "renameStylebox";
        clear_stylebox: "clearStylebox";
        get_stylebox_list: "getStyleboxList";
        get_stylebox_type_list: "getStyleboxTypeList";
        set_font: "setFont";
        get_font: "getFont";
        has_font: "hasFont";
        rename_font: "renameFont";
        clear_font: "clearFont";
        get_font_list: "getFontList";
        get_font_type_list: "getFontTypeList";
        set_font_size: "setFontSize";
        get_font_size: "getFontSize";
        has_font_size: "hasFontSize";
        rename_font_size: "renameFontSize";
        clear_font_size: "clearFontSize";
        get_font_size_list: "getFontSizeList";
        get_font_size_type_list: "getFontSizeTypeList";
        set_color: "setColor";
        get_color: "getColor";
        has_color: "hasColor";
        rename_color: "renameColor";
        clear_color: "clearColor";
        get_color_list: "getColorList";
        get_color_type_list: "getColorTypeList";
        set_constant: "setConstant";
        get_constant: "getConstant";
        has_constant: "hasConstant";
        rename_constant: "renameConstant";
        clear_constant: "clearConstant";
        get_constant_list: "getConstantList";
        get_constant_type_list: "getConstantTypeList";
        set_sound: "setSound";
        get_sound: "getSound";
        has_sound: "hasSound";
        rename_sound: "renameSound";
        clear_sound: "clearSound";
        get_sound_list: "getSoundList";
        get_sound_type_list: "getSoundTypeList";
        has_default_base_scale: "hasDefaultBaseScale";
        has_default_font: "hasDefaultFont";
        has_default_font_size: "hasDefaultFontSize";
        set_theme_item: "setThemeItem";
        get_theme_item: "getThemeItem";
        has_theme_item: "hasThemeItem";
        rename_theme_item: "renameThemeItem";
        clear_theme_item: "clearThemeItem";
        get_theme_item_list: "getThemeItemList";
        get_theme_item_type_list: "getThemeItemTypeList";
        set_type_variation: "setTypeVariation";
        is_type_variation: "isTypeVariation";
        clear_type_variation: "clearTypeVariation";
        get_type_variation_base: "getTypeVariationBase";
        get_type_variation_list: "getTypeVariationList";
        add_type: "addType";
        remove_type: "removeType";
        rename_type: "renameType";
        get_type_list: "getTypeList";
        merge_with: "mergeWith";
        default_base_scale: "defaultBaseScale";
        default_font: "defaultFont";
        default_font_size: "defaultFontSize";
    }
    /** A resource used for styling/skinning [Control]s and [Window]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_theme.html  
     */
    class Theme extends Resource {
        constructor(identifier?: any)
        /** Creates or changes the value of the icon property defined by [param name] and [param theme_type]. Use [method clear_icon] to remove the property. */
        setIcon(name: StringName, themeType: StringName, texture: Texture2D): void
        
        /** Returns the icon property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the engine fallback icon value if the property doesn't exist (see [member ThemeDB.fallback_icon]). Use [method has_icon] to check for existence.  
         */
        getIcon(name: StringName, themeType: StringName): null | Texture2D
        
        /** Returns `true` if the icon property defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_icon] to define it.  
         */
        hasIcon(name: StringName, themeType: StringName): boolean
        
        /** Renames the icon property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_icon] to check for existence, and [method clear_icon] to remove the existing property.  
         */
        renameIcon(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the icon property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_icon] to check for existence.  
         */
        clearIcon(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for icon properties defined with [param theme_type]. Use [method get_icon_type_list] to get a list of possible theme type names. */
        getIconList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for icon properties. Use [method get_type_list] to get a list of all unique theme types. */
        getIconTypeList(): PackedStringArray
        
        /** Creates or changes the value of the [StyleBox] property defined by [param name] and [param theme_type]. Use [method clear_stylebox] to remove the property. */
        setStylebox(name: StringName, themeType: StringName, texture: StyleBox): void
        
        /** Returns the [StyleBox] property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the engine fallback stylebox value if the property doesn't exist (see [member ThemeDB.fallback_stylebox]). Use [method has_stylebox] to check for existence.  
         */
        getStylebox(name: StringName, themeType: StringName): null | StyleBox
        
        /** Returns `true` if the [StyleBox] property defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_stylebox] to define it.  
         */
        hasStylebox(name: StringName, themeType: StringName): boolean
        
        /** Renames the [StyleBox] property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_stylebox] to check for existence, and [method clear_stylebox] to remove the existing property.  
         */
        renameStylebox(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the [StyleBox] property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_stylebox] to check for existence.  
         */
        clearStylebox(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for [StyleBox] properties defined with [param theme_type]. Use [method get_stylebox_type_list] to get a list of possible theme type names. */
        getStyleboxList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for [StyleBox] properties. Use [method get_type_list] to get a list of all unique theme types. */
        getStyleboxTypeList(): PackedStringArray
        
        /** Creates or changes the value of the [Font] property defined by [param name] and [param theme_type]. Use [method clear_font] to remove the property. */
        setFont(name: StringName, themeType: StringName, font: Font): void
        
        /** Returns the [Font] property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the default theme font if the property doesn't exist and the default theme font is set up (see [member default_font]). Use [method has_font] to check for existence of the property and [method has_default_font] to check for existence of the default theme font.  
         *  Returns the engine fallback font value, if neither exist (see [member ThemeDB.fallback_font]).  
         */
        getFont(name: StringName, themeType: StringName): null | Font
        
        /** Returns `true` if the [Font] property defined by [param name] and [param theme_type] exists, or if the default theme font is set up (see [method has_default_font]).  
         *  Returns `false` if neither exist. Use [method set_font] to define the property.  
         */
        hasFont(name: StringName, themeType: StringName): boolean
        
        /** Renames the [Font] property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_font] to check for existence, and [method clear_font] to remove the existing property.  
         */
        renameFont(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the [Font] property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_font] to check for existence.  
         */
        clearFont(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for [Font] properties defined with [param theme_type]. Use [method get_font_type_list] to get a list of possible theme type names. */
        getFontList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for [Font] properties. Use [method get_type_list] to get a list of all unique theme types. */
        getFontTypeList(): PackedStringArray
        
        /** Creates or changes the value of the font size property defined by [param name] and [param theme_type]. Use [method clear_font_size] to remove the property. */
        setFontSize(name: StringName, themeType: StringName, fontSize: int64): void
        
        /** Returns the font size property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the default theme font size if the property doesn't exist and the default theme font size is set up (see [member default_font_size]). Use [method has_font_size] to check for existence of the property and [method has_default_font_size] to check for existence of the default theme font.  
         *  Returns the engine fallback font size value, if neither exist (see [member ThemeDB.fallback_font_size]).  
         */
        getFontSize(name: StringName, themeType: StringName): int64
        
        /** Returns `true` if the font size property defined by [param name] and [param theme_type] exists, or if the default theme font size is set up (see [method has_default_font_size]).  
         *  Returns `false` if neither exist. Use [method set_font_size] to define the property.  
         */
        hasFontSize(name: StringName, themeType: StringName): boolean
        
        /** Renames the font size property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_font_size] to check for existence, and [method clear_font_size] to remove the existing property.  
         */
        renameFontSize(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the font size property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_font_size] to check for existence.  
         */
        clearFontSize(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for font size properties defined with [param theme_type]. Use [method get_font_size_type_list] to get a list of possible theme type names. */
        getFontSizeList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for font size properties. Use [method get_type_list] to get a list of all unique theme types. */
        getFontSizeTypeList(): PackedStringArray
        
        /** Creates or changes the value of the [Color] property defined by [param name] and [param theme_type]. Use [method clear_color] to remove the property. */
        setColor(name: StringName, themeType: StringName, color: Color): void
        
        /** Returns the [Color] property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the default color value if the property doesn't exist. Use [method has_color] to check for existence.  
         */
        getColor(name: StringName, themeType: StringName): Color
        
        /** Returns `true` if the [Color] property defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_color] to define it.  
         */
        hasColor(name: StringName, themeType: StringName): boolean
        
        /** Renames the [Color] property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_color] to check for existence, and [method clear_color] to remove the existing property.  
         */
        renameColor(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the [Color] property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_color] to check for existence.  
         */
        clearColor(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for [Color] properties defined with [param theme_type]. Use [method get_color_type_list] to get a list of possible theme type names. */
        getColorList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for [Color] properties. Use [method get_type_list] to get a list of all unique theme types. */
        getColorTypeList(): PackedStringArray
        
        /** Creates or changes the value of the constant property defined by [param name] and [param theme_type]. Use [method clear_constant] to remove the property. */
        setConstant(name: StringName, themeType: StringName, constant: int64): void
        
        /** Returns the constant property defined by [param name] and [param theme_type], if it exists.  
         *  Returns `0` if the property doesn't exist. Use [method has_constant] to check for existence.  
         */
        getConstant(name: StringName, themeType: StringName): int64
        
        /** Returns `true` if the constant property defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_constant] to define it.  
         */
        hasConstant(name: StringName, themeType: StringName): boolean
        
        /** Renames the constant property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_constant] to check for existence, and [method clear_constant] to remove the existing property.  
         */
        renameConstant(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the constant property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_constant] to check for existence.  
         */
        clearConstant(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for constant properties defined with [param theme_type]. Use [method get_constant_type_list] to get a list of possible theme type names. */
        getConstantList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for constant properties. Use [method get_type_list] to get a list of all unique theme types. */
        getConstantTypeList(): PackedStringArray
        
        /** Creates or changes the value of the sound property defined by [param name] and [param theme_type]. Use [method clear_sound] to remove the property. */
        setSound(name: StringName, themeType: StringName, sound: AudioStream): void
        
        /** Returns the sound property defined by [param name] and [param theme_type], if it exists.  
         *  Returns the engine fallback sound value if the property doesn't exist (see [member ThemeDB.fallback_sound]). Use [method has_sound] to check for existence.  
         */
        getSound(name: StringName, themeType: StringName): null | AudioStream
        
        /** Returns `true` if the sound property defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_sound] to define it.  
         */
        hasSound(name: StringName, themeType: StringName): boolean
        
        /** Renames the sound property defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_sound] to check for existence, and [method clear_sound] to remove the existing property.  
         */
        renameSound(oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the sound property defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_sound] to check for existence.  
         */
        clearSound(name: StringName, themeType: StringName): void
        
        /** Returns a list of names for sound properties defined with [param theme_type]. Use [method get_sound_type_list] to get a list of possible theme type names. */
        getSoundList(themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for sound properties. Use [method get_type_list] to get a list of all unique theme types. */
        getSoundTypeList(): PackedStringArray
        
        /** Returns `true` if [member default_base_scale] has a valid value.  
         *  Returns `false` if it doesn't. The value must be greater than `0.0` to be considered valid.  
         */
        hasDefaultBaseScale(): boolean
        
        /** Returns `true` if [member default_font] has a valid value.  
         *  Returns `false` if it doesn't.  
         */
        hasDefaultFont(): boolean
        
        /** Returns `true` if [member default_font_size] has a valid value.  
         *  Returns `false` if it doesn't. The value must be greater than `0` to be considered valid.  
         */
        hasDefaultFontSize(): boolean
        
        /** Creates or changes the value of the theme property of [param data_type] defined by [param name] and [param theme_type]. Use [method clear_theme_item] to remove the property.  
         *  Fails if the [param value] type is not accepted by [param data_type].  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        setThemeItem(dataType: Theme.DataType, name: StringName, themeType: StringName, value: any): void
        
        /** Returns the theme property of [param data_type] defined by [param name] and [param theme_type], if it exists.  
         *  Returns the engine fallback value if the property doesn't exist (see [ThemeDB]). Use [method has_theme_item] to check for existence.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        getThemeItem(dataType: Theme.DataType, name: StringName, themeType: StringName): any
        
        /** Returns `true` if the theme property of [param data_type] defined by [param name] and [param theme_type] exists.  
         *  Returns `false` if it doesn't exist. Use [method set_theme_item] to define it.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        hasThemeItem(dataType: Theme.DataType, name: StringName, themeType: StringName): boolean
        
        /** Renames the theme property of [param data_type] defined by [param old_name] and [param theme_type] to [param name], if it exists.  
         *  Fails if it doesn't exist, or if a similar property with the new name already exists. Use [method has_theme_item] to check for existence, and [method clear_theme_item] to remove the existing property.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        renameThemeItem(dataType: Theme.DataType, oldName: StringName, name: StringName, themeType: StringName): void
        
        /** Removes the theme property of [param data_type] defined by [param name] and [param theme_type], if it exists.  
         *  Fails if it doesn't exist. Use [method has_theme_item] to check for existence.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        clearThemeItem(dataType: Theme.DataType, name: StringName, themeType: StringName): void
        
        /** Returns a list of names for properties of [param data_type] defined with [param theme_type]. Use [method get_theme_item_type_list] to get a list of possible theme type names.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        getThemeItemList(dataType: Theme.DataType, themeType: string): PackedStringArray
        
        /** Returns a list of all unique theme type names for [param data_type] properties. Use [method get_type_list] to get a list of all unique theme types.  
         *      
         *  **Note:** This method is analogous to calling the corresponding data type specific method, but can be used for more generalized logic.  
         */
        getThemeItemTypeList(dataType: Theme.DataType): PackedStringArray
        
        /** Marks [param theme_type] as a variation of [param base_type].  
         *  This adds [param theme_type] as a suggested option for [member Control.theme_type_variation] on a [Control] that is of the [param base_type] class.  
         *  Variations can also be nested, i.e. [param base_type] can be another variation. If a chain of variations ends with a [param base_type] matching the class of the [Control], the whole chain is going to be suggested as options.  
         *      
         *  **Note:** Suggestions only show up if this theme resource is set as the project default theme. See [member ProjectSettings.gui/theme/custom].  
         */
        setTypeVariation(themeType: StringName, baseType: StringName): void
        
        /** Returns `true` if [param theme_type] is marked as a variation of [param base_type]. */
        isTypeVariation(themeType: StringName, baseType: StringName): boolean
        
        /** Unmarks [param theme_type] as being a variation of another theme type. See [method set_type_variation]. */
        clearTypeVariation(themeType: StringName): void
        
        /** Returns the name of the base theme type if [param theme_type] is a valid variation type. Returns an empty string otherwise. */
        getTypeVariationBase(themeType: StringName): StringName
        
        /** Returns a list of all type variations for the given [param base_type]. */
        getTypeVariationList(baseType: StringName): PackedStringArray
        
        /** Adds an empty theme type for every valid data type.  
         *      
         *  **Note:** Empty types are not saved with the theme. This method only exists to perform in-memory changes to the resource. Use available `set_*` methods to add theme items.  
         */
        addType(themeType: StringName): void
        
        /** Removes the theme type, gracefully discarding defined theme items. If the type is a variation, this information is also erased. If the type is a base for type variations, those variations lose their base. */
        removeType(themeType: StringName): void
        
        /** Renames the theme type [param old_theme_type] to [param theme_type], if the old type exists and the new one doesn't exist.  
         *      
         *  **Note:** Renaming a theme type to an empty name or a variation to a type associated with a built-in class removes type variation connections in a way that cannot be undone by reversing the rename alone.  
         */
        renameType(oldThemeType: StringName, themeType: StringName): void
        
        /** Returns a list of all unique theme type names. Use the appropriate `get_*_type_list` method to get a list of unique theme types for a single data type. */
        getTypeList(): PackedStringArray
        
        /** Adds missing and overrides existing definitions with values from the [param other] theme resource.  
         *      
         *  **Note:** This modifies the current theme. If you want to merge two themes together without modifying either one, create a new empty theme and merge the other two into it one after another.  
         */
        mergeWith(other: Theme): void
        
        /** Removes all the theme properties defined on the theme resource. */
        clear(): void
        
        /** The default base scale factor of this theme resource. Used by some controls to scale their visual properties based on the global scale factor. If this value is set to `0.0`, the global scale factor is used (see [member ThemeDB.fallback_base_scale]).  
         *  Use [method has_default_base_scale] to check if this value is valid.  
         */
        get defaultBaseScale(): float64
        set defaultBaseScale(value: float64)
        
        /** The default font of this theme resource. Used as the default value when trying to fetch a font resource that doesn't exist in this theme or is in invalid state. If the default font is also missing or invalid, the engine fallback value is used (see [member ThemeDB.fallback_font]).  
         *  Use [method has_default_font] to check if this value is valid.  
         */
        get defaultFont(): null | Font
        set defaultFont(value: null | Font)
        
        /** The default font size of this theme resource. Used as the default value when trying to fetch a font size value that doesn't exist in this theme or is in invalid state. If the default font size is also missing or invalid, the engine fallback value is used (see [member ThemeDB.fallback_font_size]).  
         *  Values below `1` are invalid and can be used to unset the property. Use [method has_default_font_size] to check if this value is valid.  
         */
        get defaultFontSize(): int64
        set defaultFontSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTheme;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTheme;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTileData extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTileData extends __NameMapGObject {
        set_occluder_polygons_count: "setOccluderPolygonsCount";
        get_occluder_polygons_count: "getOccluderPolygonsCount";
        add_occluder_polygon: "addOccluderPolygon";
        remove_occluder_polygon: "removeOccluderPolygon";
        set_occluder_polygon: "setOccluderPolygon";
        get_occluder_polygon: "getOccluderPolygon";
        set_occluder: "setOccluder";
        get_occluder: "getOccluder";
        set_constant_linear_velocity: "setConstantLinearVelocity";
        get_constant_linear_velocity: "getConstantLinearVelocity";
        set_constant_angular_velocity: "setConstantAngularVelocity";
        get_constant_angular_velocity: "getConstantAngularVelocity";
        set_collision_polygons_count: "setCollisionPolygonsCount";
        get_collision_polygons_count: "getCollisionPolygonsCount";
        add_collision_polygon: "addCollisionPolygon";
        remove_collision_polygon: "removeCollisionPolygon";
        set_collision_polygon_points: "setCollisionPolygonPoints";
        get_collision_polygon_points: "getCollisionPolygonPoints";
        set_collision_polygon_one_way: "setCollisionPolygonOneWay";
        is_collision_polygon_one_way: "isCollisionPolygonOneWay";
        set_collision_polygon_one_way_margin: "setCollisionPolygonOneWayMargin";
        get_collision_polygon_one_way_margin: "getCollisionPolygonOneWayMargin";
        set_terrain_peering_bit: "setTerrainPeeringBit";
        get_terrain_peering_bit: "getTerrainPeeringBit";
        is_valid_terrain_peering_bit: "isValidTerrainPeeringBit";
        set_navigation_polygon: "setNavigationPolygon";
        get_navigation_polygon: "getNavigationPolygon";
        set_custom_data: "setCustomData";
        get_custom_data: "getCustomData";
        has_custom_data: "hasCustomData";
        set_custom_data_by_layer_id: "setCustomDataByLayerId";
        get_custom_data_by_layer_id: "getCustomDataByLayerId";
        flip_h: "flipH";
        flip_v: "flipV";
        texture_origin: "textureOrigin";
        z_index: "zIndex";
        y_sort_origin: "ySortOrigin";
        terrain_set: "terrainSet";
    }
    /** Settings for a single tile in a [TileSet].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_tiledata.html  
     */
    class TileData extends GObject {
        constructor(identifier?: any)
        /** Sets the occluder polygon count in the TileSet occlusion layer with index [param layer_id]. */
        setOccluderPolygonsCount(layerId: int64, polygonsCount: int64): void
        
        /** Returns the number of occluder polygons of the tile in the TileSet occlusion layer with index [param layer_id]. */
        getOccluderPolygonsCount(layerId: int64): int64
        
        /** Adds an occlusion polygon to the tile on the TileSet occlusion layer with index [param layer_id]. */
        addOccluderPolygon(layerId: int64): void
        
        /** Removes the polygon at index [param polygon_index] for TileSet occlusion layer with index [param layer_id]. */
        removeOccluderPolygon(layerId: int64, polygonIndex: int64): void
        
        /** Sets the occluder for polygon with index [param polygon_index] in the TileSet occlusion layer with index [param layer_id]. */
        setOccluderPolygon(layerId: int64, polygonIndex: int64, polygon: OccluderPolygon2D): void
        
        /** Returns the occluder polygon at index [param polygon_index] from the TileSet occlusion layer with index [param layer_id].  
         *  The [param flip_h], [param flip_v], and [param transpose] parameters can be `true` to transform the returned polygon.  
         */
        getOccluderPolygon(layerId: int64, polygonIndex: int64, flipH?: boolean /* = false */, flipV?: boolean /* = false */, transpose?: boolean /* = false */): null | OccluderPolygon2D
        
        /** Sets the occluder for the TileSet occlusion layer with index [param layer_id]. */
        setOccluder(layerId: int64, occluderPolygon: OccluderPolygon2D): void
        
        /** Returns the occluder polygon of the tile for the TileSet occlusion layer with index [param layer_id].  
         *  [param flip_h], [param flip_v], and [param transpose] allow transforming the returned polygon.  
         */
        getOccluder(layerId: int64, flipH?: boolean /* = false */, flipV?: boolean /* = false */, transpose?: boolean /* = false */): null | OccluderPolygon2D
        
        /** Sets the constant linear velocity. This does not move the tile. This linear velocity is applied to objects colliding with this tile. This is useful to create conveyor belts. */
        setConstantLinearVelocity(layerId: int64, velocity: Vector2): void
        
        /** Returns the constant linear velocity applied to objects colliding with this tile. */
        getConstantLinearVelocity(layerId: int64): Vector2
        
        /** Sets the constant angular velocity. This does not rotate the tile. This angular velocity is applied to objects colliding with this tile. */
        setConstantAngularVelocity(layerId: int64, velocity: float64): void
        
        /** Returns the constant angular velocity applied to objects colliding with this tile. */
        getConstantAngularVelocity(layerId: int64): float64
        
        /** Sets the polygons count for TileSet physics layer with index [param layer_id]. */
        setCollisionPolygonsCount(layerId: int64, polygonsCount: int64): void
        
        /** Returns how many polygons the tile has for TileSet physics layer with index [param layer_id]. */
        getCollisionPolygonsCount(layerId: int64): int64
        
        /** Adds a collision polygon to the tile on the given TileSet physics layer. */
        addCollisionPolygon(layerId: int64): void
        
        /** Removes the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        removeCollisionPolygon(layerId: int64, polygonIndex: int64): void
        
        /** Sets the points of the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        setCollisionPolygonPoints(layerId: int64, polygonIndex: int64, polygon: PackedVector2Array | Vector2[]): void
        
        /** Returns the points of the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        getCollisionPolygonPoints(layerId: int64, polygonIndex: int64): PackedVector2Array
        
        /** Enables/disables one-way collisions on the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        setCollisionPolygonOneWay(layerId: int64, polygonIndex: int64, oneWay: boolean): void
        
        /** Returns whether one-way collisions are enabled for the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        isCollisionPolygonOneWay(layerId: int64, polygonIndex: int64): boolean
        
        /** Sets the one-way margin (for one-way platforms) of the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        setCollisionPolygonOneWayMargin(layerId: int64, polygonIndex: int64, oneWayMargin: float64): void
        
        /** Returns the one-way margin (for one-way platforms) of the polygon at index [param polygon_index] for TileSet physics layer with index [param layer_id]. */
        getCollisionPolygonOneWayMargin(layerId: int64, polygonIndex: int64): float64
        
        /** Sets the tile's terrain bit for the given [param peering_bit] direction. To check that a direction is valid, use [method is_valid_terrain_peering_bit]. */
        setTerrainPeeringBit(peeringBit: TileSet.CellNeighbor, terrain: int64): void
        
        /** Returns the tile's terrain bit for the given [param peering_bit] direction. To check that a direction is valid, use [method is_valid_terrain_peering_bit]. */
        getTerrainPeeringBit(peeringBit: TileSet.CellNeighbor): int64
        
        /** Returns whether the given [param peering_bit] direction is valid for this tile. */
        isValidTerrainPeeringBit(peeringBit: TileSet.CellNeighbor): boolean
        
        /** Sets the navigation polygon for the TileSet navigation layer with index [param layer_id]. */
        setNavigationPolygon(layerId: int64, navigationPolygon: NavigationPolygon): void
        
        /** Returns the navigation polygon of the tile for the TileSet navigation layer with index [param layer_id].  
         *  [param flip_h], [param flip_v], and [param transpose] allow transforming the returned polygon.  
         */
        getNavigationPolygon(layerId: int64, flipH?: boolean /* = false */, flipV?: boolean /* = false */, transpose?: boolean /* = false */): null | NavigationPolygon
        
        /** Sets the tile's custom data value for the TileSet custom data layer with name [param layer_name]. */
        setCustomData(layerName: string, value: any): void
        
        /** Returns the custom data value for custom data layer named [param layer_name]. To check if a custom data layer exists, use [method has_custom_data]. */
        getCustomData(layerName: string): any
        
        /** Returns whether there exists a custom data layer named [param layer_name]. */
        hasCustomData(layerName: string): boolean
        
        /** Sets the tile's custom data value for the TileSet custom data layer with index [param layer_id]. */
        setCustomDataByLayerId(layerId: int64, value: any): void
        
        /** Returns the custom data value for custom data layer with index [param layer_id]. */
        getCustomDataByLayerId(layerId: int64): any
        
        /** If `true`, the tile will have its texture flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, the tile will have its texture flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        
        /** If `true`, the tile will display transposed, i.e. with horizontal and vertical texture UVs swapped. */
        get transpose(): boolean
        set transpose(value: boolean)
        
        /** Offsets the position of where the tile is drawn. */
        get textureOrigin(): Vector2I
        set textureOrigin(value: Vector2I)
        
        /** Color modulation of the tile. */
        get modulate(): Color
        set modulate(value: Color)
        
        /** The [Material] to use for this [TileData]. This can be a [CanvasItemMaterial] to use the default shader, or a [ShaderMaterial] to use a custom shader. */
        get material(): null | CanvasItemMaterial | ShaderMaterial
        set material(value: null | CanvasItemMaterial | ShaderMaterial)
        
        /** Ordering index of this tile, relative to [TileMapLayer]. */
        get zIndex(): int64
        set zIndex(value: int64)
        
        /** Vertical point of the tile used for determining y-sorted order. */
        get ySortOrigin(): int64
        set ySortOrigin(value: int64)
        
        /** ID of the terrain set that the tile uses. */
        get terrainSet(): int64
        set terrainSet(value: int64)
        
        /** ID of the terrain from the terrain set that the tile uses. */
        get terrain(): int64
        set terrain(value: int64)
        
        /** Relative probability of this tile being selected when drawing a pattern of random tiles. */
        get probability(): float64
        set probability(value: float64)
        
        /** Emitted when any of the properties are changed. */
        readonly changed: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTileData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTileData;
    }
    namespace TileMap {
        enum VisibilityMode {
            VisibilityModeDefault = 0,
            VisibilityModeForceHide = 2,
            VisibilityModeForceShow = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapTileMap extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapTileMap extends __NameMapNode2D {
        _use_tile_data_runtime_update: "_useTileDataRuntimeUpdate";
        _tile_data_runtime_update: "_tileDataRuntimeUpdate";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        force_update: "forceUpdate";
        get_layers_count: "getLayersCount";
        add_layer: "addLayer";
        move_layer: "moveLayer";
        remove_layer: "removeLayer";
        set_layer_name: "setLayerName";
        get_layer_name: "getLayerName";
        set_layer_enabled: "setLayerEnabled";
        is_layer_enabled: "isLayerEnabled";
        set_layer_modulate: "setLayerModulate";
        get_layer_modulate: "getLayerModulate";
        set_layer_y_sort_enabled: "setLayerYSortEnabled";
        is_layer_y_sort_enabled: "isLayerYSortEnabled";
        set_layer_y_sort_origin: "setLayerYSortOrigin";
        get_layer_y_sort_origin: "getLayerYSortOrigin";
        set_layer_z_index: "setLayerZIndex";
        get_layer_z_index: "getLayerZIndex";
        set_layer_navigation_enabled: "setLayerNavigationEnabled";
        is_layer_navigation_enabled: "isLayerNavigationEnabled";
        set_layer_navigation_map: "setLayerNavigationMap";
        get_layer_navigation_map: "getLayerNavigationMap";
        set_cell: "setCell";
        erase_cell: "eraseCell";
        get_cell_source_id: "getCellSourceId";
        get_cell_atlas_coords: "getCellAtlasCoords";
        get_cell_alternative_tile: "getCellAlternativeTile";
        get_cell_tile_data: "getCellTileData";
        is_cell_flipped_h: "isCellFlippedH";
        is_cell_flipped_v: "isCellFlippedV";
        is_cell_transposed: "isCellTransposed";
        get_coords_for_body_rid: "getCoordsForBodyRid";
        get_layer_for_body_rid: "getLayerForBodyRid";
        get_pattern: "getPattern";
        map_pattern: "mapPattern";
        set_pattern: "setPattern";
        set_cells_terrain_connect: "setCellsTerrainConnect";
        set_cells_terrain_path: "setCellsTerrainPath";
        fix_invalid_tiles: "fixInvalidTiles";
        clear_layer: "clearLayer";
        update_internals: "updateInternals";
        notify_runtime_tile_data_update: "notifyRuntimeTileDataUpdate";
        get_surrounding_cells: "getSurroundingCells";
        get_used_cells: "getUsedCells";
        get_used_cells_by_id: "getUsedCellsById";
        get_used_rect: "getUsedRect";
        map_to_local: "mapToLocal";
        local_to_map: "localToMap";
        get_neighbor_cell: "getNeighborCell";
        tile_set: "tileSet";
        rendering_quadrant_size: "renderingQuadrantSize";
        collision_animatable: "collisionAnimatable";
        collision_visibility_mode: "collisionVisibilityMode";
        navigation_visibility_mode: "navigationVisibilityMode";
    }
    /** Node for 2D tile-based maps.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_tilemap.html  
     */
    class TileMap<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Should return `true` if the tile at coordinates [param coords] on layer [param layer] requires a runtime update.  
         *  **Warning:** Make sure this function only return `true` when needed. Any tile processed at runtime without a need for it will imply a significant performance penalty.  
         *      
         *  **Note:** If the result of this function should changed, use [method notify_runtime_tile_data_update] to notify the TileMap it needs an update.  
         */
        /* gdvirtual */ _useTileDataRuntimeUpdate(layer: int64, coords: Vector2I): boolean
        
        /** Called with a TileData object about to be used internally by the TileMap, allowing its modification at runtime.  
         *  This method is only called if [method _use_tile_data_runtime_update] is implemented and returns `true` for the given tile [param coords] and [param layer].  
         *  **Warning:** The [param tile_data] object's sub-resources are the same as the one in the TileSet. Modifying them might impact the whole TileSet. Instead, make sure to duplicate those resources.  
         *      
         *  **Note:** If the properties of [param tile_data] object should change over time, use [method notify_runtime_tile_data_update] to notify the TileMap it needs an update.  
         */
        /* gdvirtual */ _tileDataRuntimeUpdate(layer: int64, coords: Vector2I, tileData: TileData): void
        
        /** Assigns [param map] as a [NavigationServer2D] navigation map for the specified TileMap layer [param layer]. */
        setNavigationMap(layer: int64, map: Rid): void
        
        /** Returns the [RID] of the [NavigationServer2D] navigation map assigned to the specified TileMap layer [param layer]. */
        getNavigationMap(layer: int64): Rid
        
        /** Forces the TileMap and the layer [param layer] to update. */
        forceUpdate(layer?: int64 /* = -1 */): void
        
        /** Returns the number of layers in the TileMap. */
        getLayersCount(): int64
        
        /** Adds a layer at the given position [param to_position] in the array. If [param to_position] is negative, the position is counted from the end, with `-1` adding the layer at the end of the array. */
        addLayer(toPosition: int64): void
        
        /** Moves the layer at index [param layer] to the given position [param to_position] in the array. */
        moveLayer(layer: int64, toPosition: int64): void
        
        /** Removes the layer at index [param layer]. */
        removeLayer(layer: int64): void
        
        /** Sets a layer's name. This is mostly useful in the editor.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerName(layer: int64, name: string): void
        
        /** Returns a TileMap layer's name.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getLayerName(layer: int64): string
        
        /** Enables or disables the layer [param layer]. A disabled layer is not processed at all (no rendering, no physics, etc.).  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerEnabled(layer: int64, enabled: boolean): void
        
        /** Returns if a layer is enabled.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        isLayerEnabled(layer: int64): boolean
        
        /** Sets a layer's color. It will be multiplied by tile's color and TileMap's modulate.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerModulate(layer: int64, modulate: Color): void
        
        /** Returns a TileMap layer's modulate.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getLayerModulate(layer: int64): Color
        
        /** Enables or disables a layer's Y-sorting. If a layer is Y-sorted, the layer will behave as a CanvasItem node where each of its tile gets Y-sorted.  
         *  Y-sorted layers should usually be on different Z-index values than not Y-sorted layers, otherwise, each of those layer will be Y-sorted as whole with the Y-sorted one. This is usually an undesired behavior.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerYSortEnabled(layer: int64, ySortEnabled: boolean): void
        
        /** Returns if a layer Y-sorts its tiles.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        isLayerYSortEnabled(layer: int64): boolean
        
        /** Sets a layer's Y-sort origin value. This Y-sort origin value is added to each tile's Y-sort origin value.  
         *  This allows, for example, to fake a different height level on each layer. This can be useful for top-down view games.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerYSortOrigin(layer: int64, ySortOrigin: int64): void
        
        /** Returns a TileMap layer's Y sort origin.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getLayerYSortOrigin(layer: int64): int64
        
        /** Sets a layers Z-index value. This Z-index is added to each tile's Z-index value.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerZIndex(layer: int64, zIndex: int64): void
        
        /** Returns a TileMap layer's Z-index value.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getLayerZIndex(layer: int64): int64
        
        /** Enables or disables a layer's built-in navigation regions generation. Disable this if you need to bake navigation regions from a TileMap using a [NavigationRegion2D] node. */
        setLayerNavigationEnabled(layer: int64, enabled: boolean): void
        
        /** Returns if a layer's built-in navigation regions generation is enabled. */
        isLayerNavigationEnabled(layer: int64): boolean
        
        /** Assigns [param map] as a [NavigationServer2D] navigation map for the specified TileMap layer [param layer].  
         *  By default the TileMap uses the default [World2D] navigation map for the first TileMap layer. For each additional TileMap layer a new navigation map is created for the additional layer.  
         *  In order to make [NavigationAgent2D] switch between TileMap layer navigation maps use [method NavigationAgent2D.set_navigation_map] with the navigation map received from [method get_layer_navigation_map].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setLayerNavigationMap(layer: int64, map: Rid): void
        
        /** Returns the [RID] of the [NavigationServer2D] navigation map assigned to the specified TileMap layer [param layer].  
         *  By default the TileMap uses the default [World2D] navigation map for the first TileMap layer. For each additional TileMap layer a new navigation map is created for the additional layer.  
         *  In order to make [NavigationAgent2D] switch between TileMap layer navigation maps use [method NavigationAgent2D.set_navigation_map] with the navigation map received from [method get_layer_navigation_map].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getLayerNavigationMap(layer: int64): Rid
        
        /** Sets the tile identifiers for the cell on layer [param layer] at coordinates [param coords]. Each tile of the [TileSet] is identified using three parts:  
         *  - The source identifier [param source_id] identifies a [TileSetSource] identifier. See [method TileSet.set_source_id],  
         *  - The atlas coordinates identifier [param atlas_coords] identifies a tile coordinates in the atlas (if the source is a [TileSetAtlasSource]). For [TileSetScenesCollectionSource] it should always be `Vector2i(0, 0)`),  
         *  - The alternative tile identifier [param alternative_tile] identifies a tile alternative in the atlas (if the source is a [TileSetAtlasSource]), and the scene for a [TileSetScenesCollectionSource].  
         *  If [param source_id] is set to `-1`, [param atlas_coords] to `Vector2i(-1, -1)` or [param alternative_tile] to `-1`, the cell will be erased. An erased cell gets **all** its identifiers automatically set to their respective invalid values, namely `-1`, `Vector2i(-1, -1)` and `-1`.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setCell(layer: int64, coords: Vector2I, sourceId?: int64 /* = -1 */, atlasCoords?: Vector2I /* = new Vector2I(-1, -1) */, alternativeTile?: int64 /* = 0 */): void
        
        /** Erases the cell on layer [param layer] at coordinates [param coords].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        eraseCell(layer: int64, coords: Vector2I): void
        
        /** Returns the tile source ID of the cell on layer [param layer] at coordinates [param coords]. Returns `-1` if the cell does not exist.  
         *  If [param use_proxies] is `false`, ignores the [TileSet]'s tile proxies, returning the raw source identifier. See [method TileSet.map_tile_proxy].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getCellSourceId(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): int64
        
        /** Returns the tile atlas coordinates ID of the cell on layer [param layer] at coordinates [param coords]. Returns `Vector2i(-1, -1)` if the cell does not exist.  
         *  If [param use_proxies] is `false`, ignores the [TileSet]'s tile proxies, returning the raw atlas coordinate identifier. See [method TileSet.map_tile_proxy].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getCellAtlasCoords(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): Vector2I
        
        /** Returns the tile alternative ID of the cell on layer [param layer] at [param coords].  
         *  If [param use_proxies] is `false`, ignores the [TileSet]'s tile proxies, returning the raw alternative identifier. See [method TileSet.map_tile_proxy].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getCellAlternativeTile(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): int64
        
        /** Returns the [TileData] object associated with the given cell, or `null` if the cell does not exist or is not a [TileSetAtlasSource].  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         *    
         *  If [param use_proxies] is `false`, ignores the [TileSet]'s tile proxies. See [method TileSet.map_tile_proxy].  
         */
        getCellTileData(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): null | TileData
        
        /** Returns `true` if the cell on layer [param layer] at coordinates [param coords] is flipped horizontally. The result is valid only for atlas sources. */
        isCellFlippedH(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): boolean
        
        /** Returns `true` if the cell on layer [param layer] at coordinates [param coords] is flipped vertically. The result is valid only for atlas sources. */
        isCellFlippedV(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): boolean
        
        /** Returns `true` if the cell on layer [param layer] at coordinates [param coords] is transposed. The result is valid only for atlas sources. */
        isCellTransposed(layer: int64, coords: Vector2I, useProxies?: boolean /* = false */): boolean
        
        /** Returns the coordinates of the tile for given physics body RID. Such RID can be retrieved from [method KinematicCollision2D.get_collider_rid], when colliding with a tile. */
        getCoordsForBodyRid(body: Rid): Vector2I
        
        /** Returns the tilemap layer of the tile for given physics body RID. Such RID can be retrieved from [method KinematicCollision2D.get_collider_rid], when colliding with a tile. */
        getLayerForBodyRid(body: Rid): int64
        
        /** Creates a new [TileMapPattern] from the given layer and set of cells.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getPattern(layer: int64, coordsArray: GArray<Vector2I>): null | TileMapPattern
        
        /** Returns for the given coordinate [param coords_in_pattern] in a [TileMapPattern] the corresponding cell coordinates if the pattern was pasted at the [param position_in_tilemap] coordinates (see [method set_pattern]). This mapping is required as in half-offset tile shapes, the mapping might not work by calculating `position_in_tile_map + coords_in_pattern`. */
        mapPattern(positionInTilemap: Vector2I, coordsInPattern: Vector2I, pattern: TileMapPattern): Vector2I
        
        /** Paste the given [TileMapPattern] at the given [param position] and [param layer] in the tile map.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        setPattern(layer: int64, position: Vector2I, pattern: TileMapPattern): void
        
        /** Update all the cells in the [param cells] coordinates array so that they use the given [param terrain] for the given [param terrain_set]. If an updated cell has the same terrain as one of its neighboring cells, this function tries to join the two. This function might update neighboring tiles if needed to create correct terrain transitions.  
         *  If [param ignore_empty_terrains] is `true`, empty terrains will be ignored when trying to find the best fitting tile for the given terrain constraints.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         *      
         *  **Note:** To work correctly, this method requires the TileMap's TileSet to have terrains set up with all required terrain combinations. Otherwise, it may produce unexpected results.  
         */
        setCellsTerrainConnect(layer: int64, cells: GArray<Vector2I>, terrainSet: int64, terrain: int64, ignoreEmptyTerrains?: boolean /* = true */): void
        
        /** Update all the cells in the [param path] coordinates array so that they use the given [param terrain] for the given [param terrain_set]. The function will also connect two successive cell in the path with the same terrain. This function might update neighboring tiles if needed to create correct terrain transitions.  
         *  If [param ignore_empty_terrains] is `true`, empty terrains will be ignored when trying to find the best fitting tile for the given terrain constraints.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         *      
         *  **Note:** To work correctly, this method requires the TileMap's TileSet to have terrains set up with all required terrain combinations. Otherwise, it may produce unexpected results.  
         */
        setCellsTerrainPath(layer: int64, path: GArray<Vector2I>, terrainSet: int64, terrain: int64, ignoreEmptyTerrains?: boolean /* = true */): void
        
        /** Clears cells that do not exist in the tileset. */
        fixInvalidTiles(): void
        
        /** Clears all cells on the given layer.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        clearLayer(layer: int64): void
        
        /** Clears all cells. */
        clear(): void
        
        /** Triggers a direct update of the TileMap. Usually, calling this function is not needed, as TileMap node updates automatically when one of its properties or cells is modified.  
         *  However, for performance reasons, those updates are batched and delayed to the end of the frame. Calling this function will force the TileMap to update right away instead.  
         *  **Warning:** Updating the TileMap is computationally expensive and may impact performance. Try to limit the number of updates and how many tiles they impact.  
         */
        updateInternals(): void
        
        /** Notifies the TileMap node that calls to [method _use_tile_data_runtime_update] or [method _tile_data_runtime_update] will lead to different results. This will thus trigger a TileMap update.  
         *  If [param layer] is provided, only notifies changes for the given layer. Providing the [param layer] argument (when applicable) is usually preferred for performance reasons.  
         *  **Warning:** Updating the TileMap is computationally expensive and may impact performance. Try to limit the number of calls to this function to avoid unnecessary update.  
         *      
         *  **Note:** This does not trigger a direct update of the TileMap, the update will be done at the end of the frame as usual (unless you call [method update_internals]).  
         */
        notifyRuntimeTileDataUpdate(layer?: int64 /* = -1 */): void
        
        /** Returns the list of all neighbourings cells to the one at [param coords]. */
        getSurroundingCells(coords: Vector2I): GArray<Vector2I>
        
        /** Returns a [Vector2i] array with the positions of all cells containing a tile in the given layer. A cell is considered empty if its source identifier equals -1, its atlas coordinates identifiers is `Vector2(-1, -1)` and its alternative identifier is -1.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getUsedCells(layer: int64): GArray<Vector2I>
        
        /** Returns a [Vector2i] array with the positions of all cells containing a tile in the given layer. Tiles may be filtered according to their source ([param source_id]), their atlas coordinates ([param atlas_coords]) or alternative id ([param alternative_tile]).  
         *  If a parameter has its value set to the default one, this parameter is not used to filter a cell. Thus, if all parameters have their respective default value, this method returns the same result as [method get_used_cells].  
         *  A cell is considered empty if its source identifier equals -1, its atlas coordinates identifiers is `Vector2(-1, -1)` and its alternative identifier is -1.  
         *  If [param layer] is negative, the layers are accessed from the last one.  
         */
        getUsedCellsById(layer: int64, sourceId?: int64 /* = -1 */, atlasCoords?: Vector2I /* = new Vector2I(-1, -1) */, alternativeTile?: int64 /* = -1 */): GArray<Vector2I>
        
        /** Returns a rectangle enclosing the used (non-empty) tiles of the map, including all layers. */
        getUsedRect(): Rect2I
        
        /** Returns the centered position of a cell in the TileMap's local coordinate space. To convert the returned value into global coordinates, use [method Node2D.to_global]. See also [method local_to_map].  
         *      
         *  **Note:** This may not correspond to the visual position of the tile, i.e. it ignores the [member TileData.texture_origin] property of individual tiles.  
         */
        mapToLocal(mapPosition: Vector2I): Vector2
        
        /** Returns the map coordinates of the cell containing the given [param local_position]. If [param local_position] is in global coordinates, consider using [method Node2D.to_local] before passing it to this method. See also [method map_to_local]. */
        localToMap(localPosition: Vector2): Vector2I
        
        /** Returns the neighboring cell to the one at coordinates [param coords], identified by the [param neighbor] direction. This method takes into account the different layouts a TileMap can take. */
        getNeighborCell(coords: Vector2I, neighbor: TileSet.CellNeighbor): Vector2I
        
        /** The [TileSet] used by this [TileMap]. The textures, collisions, and additional behavior of all available tiles are stored here. */
        get tileSet(): null | TileSet
        set tileSet(value: null | TileSet)
        
        /** The TileMap's quadrant size. A quadrant is a group of tiles to be drawn together on a single canvas item, for optimization purposes. [member rendering_quadrant_size] defines the length of a square's side, in the map's coordinate system, that forms the quadrant. Thus, the default quadrant size groups together `16 * 16 = 256` tiles.  
         *  The quadrant size does not apply on Y-sorted layers, as tiles are grouped by Y position instead in that case.  
         *      
         *  **Note:** As quadrants are created according to the map's coordinate system, the quadrant's "square shape" might not look like square in the TileMap's local coordinate system.  
         */
        get renderingQuadrantSize(): int64
        set renderingQuadrantSize(value: int64)
        
        /** If enabled, the TileMap will see its collisions synced to the physics tick and change its collision type from static to kinematic. This is required to create TileMap-based moving platform.  
         *      
         *  **Note:** Enabling [member collision_animatable] may have a small performance impact, only do it if the TileMap is moving and has colliding tiles.  
         */
        get collisionAnimatable(): boolean
        set collisionAnimatable(value: boolean)
        
        /** Show or hide the TileMap's collision shapes. If set to [constant VISIBILITY_MODE_DEFAULT], this depends on the show collision debug settings. */
        get collisionVisibilityMode(): int64
        set collisionVisibilityMode(value: int64)
        
        /** Show or hide the TileMap's navigation meshes. If set to [constant VISIBILITY_MODE_DEFAULT], this depends on the show navigation debug settings. */
        get navigationVisibilityMode(): int64
        set navigationVisibilityMode(value: int64)
        
        /** Emitted when the [TileSet] of this TileMap changes. */
        readonly changed: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapTileMap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapTileMap;
    }
}
