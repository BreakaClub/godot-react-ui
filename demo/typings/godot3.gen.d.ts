declare module "godot" {
    // AUTO-GENERATED
    namespace CollisionObject2D {
        enum DisableMode {
            DisableModeRemove = 0,
            DisableModeMakeStatic = 1,
            DisableModeKeepActive = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionObject2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionObject2D extends __NameMapNode2D {
        _input_event: "_inputEvent";
        _mouse_enter: "_mouseEnter";
        _mouse_exit: "_mouseExit";
        _mouse_shape_enter: "_mouseShapeEnter";
        _mouse_shape_exit: "_mouseShapeExit";
        get_rid: "getRid";
        set_collision_layer_value: "setCollisionLayerValue";
        get_collision_layer_value: "getCollisionLayerValue";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        create_shape_owner: "createShapeOwner";
        remove_shape_owner: "removeShapeOwner";
        get_shape_owners: "getShapeOwners";
        shape_owner_set_transform: "shapeOwnerSetTransform";
        shape_owner_get_transform: "shapeOwnerGetTransform";
        shape_owner_get_owner: "shapeOwnerGetOwner";
        shape_owner_set_disabled: "shapeOwnerSetDisabled";
        is_shape_owner_disabled: "isShapeOwnerDisabled";
        shape_owner_set_one_way_collision: "shapeOwnerSetOneWayCollision";
        is_shape_owner_one_way_collision_enabled: "isShapeOwnerOneWayCollisionEnabled";
        shape_owner_set_one_way_collision_margin: "shapeOwnerSetOneWayCollisionMargin";
        get_shape_owner_one_way_collision_margin: "getShapeOwnerOneWayCollisionMargin";
        get_shape_owner_one_way_collision_direction: "getShapeOwnerOneWayCollisionDirection";
        shape_owner_set_one_way_collision_direction: "shapeOwnerSetOneWayCollisionDirection";
        shape_owner_add_shape: "shapeOwnerAddShape";
        shape_owner_get_shape_count: "shapeOwnerGetShapeCount";
        shape_owner_get_shape: "shapeOwnerGetShape";
        shape_owner_get_shape_index: "shapeOwnerGetShapeIndex";
        shape_owner_remove_shape: "shapeOwnerRemoveShape";
        shape_owner_clear_shapes: "shapeOwnerClearShapes";
        shape_find_owner: "shapeFindOwner";
        disable_mode: "disableMode";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
        collision_priority: "collisionPriority";
        input_pickable: "inputPickable";
        input_event: "inputEvent";
        mouse_entered: "mouseEntered";
        mouse_exited: "mouseExited";
        mouse_shape_entered: "mouseShapeEntered";
        mouse_shape_exited: "mouseShapeExited";
    }
    /** Abstract base class for 2D physics objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionobject2d.html  
     */
    class CollisionObject2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Detects unhandled mouse and touch [InputEvent]s through [param event] when they happen while hovering over the object. Gesture events are not detected. [param viewport] is the [Viewport] that the event originated in (for viewports other than the main one to be detected, [member Viewport.physics_object_picking] needs to be set to `true`). [param shape_idx] is the index of the detected shape from [PhysicsServer2D].  
         *  See also [method Node._unhandled_input], [method shape_find_owner], and [method shape_owner_get_owner].  
         *      
         *  **Note:** [InputEventScreenDrag] events are triggered if the drag events started while hovering the object, or when the object is in the path of the drag event.  
         *      
         *  **Note:** [method _input_event] requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set.  
         */
        /* gdvirtual */ _inputEvent(viewport: Viewport, event: InputEvent, shapeIdx: int64): void
        
        /** Called when the mouse pointer enters any of this object's shapes. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject2D] won't cause this function to be called. */
        /* gdvirtual */ _mouseEnter(): void
        
        /** Called when the mouse pointer exits all this object's shapes. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject2D] won't cause this function to be called. */
        /* gdvirtual */ _mouseExit(): void
        
        /** Called when the mouse pointer enters any of this object's shapes or moves from one shape to another. [param shape_idx] is the child index of the newly entered [Shape2D]. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be called. */
        /* gdvirtual */ _mouseShapeEnter(shapeIdx: int64): void
        
        /** Called when the mouse pointer exits any of this object's shapes. [param shape_idx] is the child index of the exited [Shape2D]. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be called. */
        /* gdvirtual */ _mouseShapeExit(shapeIdx: int64): void
        
        /** Returns the object's [RID]. */
        getRid(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_layer], given a [param layer_number] between 1 and 32. */
        setCollisionLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_layer] is enabled, given a [param layer_number] between 1 and 32. This simplifies editing this [CollisionObject2D]'s collision layer compared to assigning the [member collision_layer] property directly. */
        getCollisionLayerValue(layerNumber: int64): boolean
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. This simplifies editing this [CollisionObject2D]'s collision mask compared to assigning the [member collision_mask] property directly. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** Creates a new shape owner for the given object. Returns `owner_id` of the new owner for future reference. */
        createShapeOwner(owner: GObject): int64
        
        /** Removes the given shape owner. */
        removeShapeOwner(ownerId: int64): void
        
        /** Returns an [Array] of `owner_id` identifiers. You can use these ids in other methods that take `owner_id` as an argument. */
        getShapeOwners(): PackedInt32Array
        
        /** Sets the [Transform2D] of the given shape owner. */
        shapeOwnerSetTransform(ownerId: int64, transform: Transform2D): void
        
        /** Returns the shape owner's [Transform2D]. */
        shapeOwnerGetTransform(ownerId: int64): Transform2D
        
        /** Returns the parent object of the given shape owner. */
        shapeOwnerGetOwner(ownerId: int64): null | GObject
        
        /** If `true`, disables the given shape owner. */
        shapeOwnerSetDisabled(ownerId: int64, disabled: boolean): void
        
        /** If `true`, the shape owner and its shapes are disabled. */
        isShapeOwnerDisabled(ownerId: int64): boolean
        
        /** If [param enable] is `true`, collisions for the shape owner originating from this [CollisionObject2D] will not be reported to collided with [CollisionObject2D]s. */
        shapeOwnerSetOneWayCollision(ownerId: int64, enable: boolean): void
        
        /** Returns `true` if collisions for the shape owner originating from this [CollisionObject2D] will not be reported to collided with [CollisionObject2D]s. */
        isShapeOwnerOneWayCollisionEnabled(ownerId: int64): boolean
        
        /** Sets the `one_way_collision_margin` of the shape owner identified by given [param owner_id] to [param margin] pixels. */
        shapeOwnerSetOneWayCollisionMargin(ownerId: int64, margin: float64): void
        
        /** Returns the `one_way_collision_margin` of the shape owner identified by given [param owner_id]. */
        getShapeOwnerOneWayCollisionMargin(ownerId: int64): float64
        
        /** Returns the `one_way_collision_direction` of the shape owner identified by the given [param owner_id]. */
        getShapeOwnerOneWayCollisionDirection(ownerId: int64): Vector2
        
        /** Sets the `one_way_collision_direction` of the shape owner identified by the given [param owner_id] to [param direction]. */
        shapeOwnerSetOneWayCollisionDirection(ownerId: int64, direction: Vector2): void
        
        /** Adds a [Shape2D] to the shape owner. */
        shapeOwnerAddShape(ownerId: int64, shape: Shape2D): void
        
        /** Returns the number of shapes the given shape owner contains. */
        shapeOwnerGetShapeCount(ownerId: int64): int64
        
        /** Returns the [Shape2D] with the given ID from the given shape owner. */
        shapeOwnerGetShape(ownerId: int64, shapeId: int64): null | Shape2D
        
        /** Returns the child index of the [Shape2D] with the given ID from the given shape owner. */
        shapeOwnerGetShapeIndex(ownerId: int64, shapeId: int64): int64
        
        /** Removes a shape from the given shape owner. */
        shapeOwnerRemoveShape(ownerId: int64, shapeId: int64): void
        
        /** Removes all shapes from the shape owner. */
        shapeOwnerClearShapes(ownerId: int64): void
        
        /** Returns the `owner_id` of the given shape. */
        shapeFindOwner(shapeIndex: int64): int64
        
        /** Defines the behavior in physics when [member Node.process_mode] is set to [constant Node.PROCESS_MODE_DISABLED]. */
        get disableMode(): int64
        set disableMode(value: int64)
        
        /** The physics layers this CollisionObject2D is in. Collision objects can exist in one or more of 32 different layers. See also [member collision_mask]. For an easier way to change this value from a script, see [method set_collision_layer_value].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        
        /** The physics layers this CollisionObject2D scans. Collision objects can scan one or more of 32 different layers. See also [member collision_layer]. For an easier way to change this value from a script, see [method set_collision_mask_value].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The priority used to solve colliding when occurring penetration. The higher the priority is, the lower the penetration into the object will be. This can for example be used to prevent the player from breaking through the boundaries of a level. */
        get collisionPriority(): float64
        set collisionPriority(value: float64)
        
        /** If `true`, this object is pickable. A pickable object can detect the mouse pointer entering/leaving, and if the mouse is inside it, report input events. Requires at least one [member collision_layer] bit to be set. */
        get inputPickable(): boolean
        set inputPickable(value: boolean)
        
        /** Emitted when an unhandled input event occurs. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. See [method _input_event] for details. */
        readonly inputEvent: Signal<(viewport: Node, event: InputEvent, shapeIdx: int64) => void>
        
        /** Emitted when the mouse pointer enters any of this object's shapes. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject2D] won't cause this signal to be emitted.  
         *      
         *  **Note:** Due to the lack of continuous collision detection, this signal may not be emitted in the expected order if the mouse moves fast enough and the [CollisionObject2D]'s area is small. This signal may also not be emitted if another [CollisionObject2D] is overlapping the [CollisionObject2D] in question.  
         */
        readonly mouseEntered: Signal<() => void>
        
        /** Emitted when the mouse pointer exits all this object's shapes. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject2D] won't cause this signal to be emitted.  
         *      
         *  **Note:** Due to the lack of continuous collision detection, this signal may not be emitted in the expected order if the mouse moves fast enough and the [CollisionObject2D]'s area is small. This signal may also not be emitted if another [CollisionObject2D] is overlapping the [CollisionObject2D] in question.  
         */
        readonly mouseExited: Signal<() => void>
        
        /** Emitted when the mouse pointer enters any of this object's shapes or moves from one shape to another. [param shape_idx] is the child index of the newly entered [Shape2D]. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. */
        readonly mouseShapeEntered: Signal<(shapeIdx: int64) => void>
        
        /** Emitted when the mouse pointer exits any of this object's shapes. [param shape_idx] is the child index of the exited [Shape2D]. Requires [member input_pickable] to be `true` and at least one [member collision_layer] bit to be set. */
        readonly mouseShapeExited: Signal<(shapeIdx: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionObject2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionObject2D;
    }
    namespace CollisionObject3D {
        enum DisableMode {
            DisableModeRemove = 0,
            DisableModeMakeStatic = 1,
            DisableModeKeepActive = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionObject3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionObject3D extends __NameMapNode3D {
        _input_event: "_inputEvent";
        _mouse_enter: "_mouseEnter";
        _mouse_exit: "_mouseExit";
        set_collision_layer_value: "setCollisionLayerValue";
        get_collision_layer_value: "getCollisionLayerValue";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        get_rid: "getRid";
        create_shape_owner: "createShapeOwner";
        remove_shape_owner: "removeShapeOwner";
        get_shape_owners: "getShapeOwners";
        shape_owner_set_transform: "shapeOwnerSetTransform";
        shape_owner_get_transform: "shapeOwnerGetTransform";
        shape_owner_get_owner: "shapeOwnerGetOwner";
        shape_owner_set_disabled: "shapeOwnerSetDisabled";
        is_shape_owner_disabled: "isShapeOwnerDisabled";
        shape_owner_add_shape: "shapeOwnerAddShape";
        shape_owner_get_shape_count: "shapeOwnerGetShapeCount";
        shape_owner_get_shape: "shapeOwnerGetShape";
        shape_owner_get_shape_index: "shapeOwnerGetShapeIndex";
        shape_owner_remove_shape: "shapeOwnerRemoveShape";
        shape_owner_clear_shapes: "shapeOwnerClearShapes";
        shape_find_owner: "shapeFindOwner";
        disable_mode: "disableMode";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
        collision_priority: "collisionPriority";
        input_ray_pickable: "inputRayPickable";
        input_capture_on_drag: "inputCaptureOnDrag";
        input_event: "inputEvent";
        mouse_entered: "mouseEntered";
        mouse_exited: "mouseExited";
    }
    /** Abstract base class for 3D physics objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionobject3d.html  
     */
    class CollisionObject3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Detects unhandled mouse and touch [InputEvent]s through [param event] when they happen while hovering over the object. Gesture events are not detected. [param camera] is the [Camera3D] that the event originated in (for cameras inside viewports other than the main one to be detected, the parent [member Viewport.physics_object_picking] needs to be set to `true`). [param event_position] is the position hit by a raycast from the camera to the mouse, in global space. [param normal] is the normal vector of the surface at that point in world space. [param shape_idx] is the index of the detected shape from [PhysicsServer3D].  
         *  See also [method Node._unhandled_input], [method shape_find_owner], and [method shape_owner_get_owner].  
         *      
         *  **Note:** [InputEventScreenDrag] events are triggered if the drag events started while hovering the object, or when the object is in the path of the drag event.  
         *      
         *  **Note:** [method _input_event] requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set.  
         */
        /* gdvirtual */ _inputEvent(camera: Camera3D, event: InputEvent, eventPosition: Vector3, normal: Vector3, shapeIdx: int64): void
        
        /** Called when the mouse pointer enters any of this object's shapes. Requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject3D] won't cause this function to be called. */
        /* gdvirtual */ _mouseEnter(): void
        
        /** Called when the mouse pointer exits all this object's shapes. Requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set. Note that moving between different shapes within a single [CollisionObject3D] won't cause this function to be called. */
        /* gdvirtual */ _mouseExit(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_layer], given a [param layer_number] between 1 and 32. This simplifies editing this [CollisionObject3D]'s collision layer compared to assigning the [member collision_layer] property directly. */
        setCollisionLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_layer] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionLayerValue(layerNumber: int64): boolean
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. This simplifies editing this [CollisionObject3D]'s collision mask compared to assigning the [member collision_mask] property directly. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** Returns the object's [RID]. */
        getRid(): Rid
        
        /** Creates a new shape owner for the given object. Returns `owner_id` of the new owner for future reference. */
        createShapeOwner(owner: GObject): int64
        
        /** Removes the given shape owner. */
        removeShapeOwner(ownerId: int64): void
        
        /** Returns an [Array] of `owner_id` identifiers. You can use these ids in other methods that take `owner_id` as an argument. */
        getShapeOwners(): PackedInt32Array
        
        /** Sets the [Transform3D] of the given shape owner. */
        shapeOwnerSetTransform(ownerId: int64, transform: Transform3D): void
        
        /** Returns the shape owner's [Transform3D]. */
        shapeOwnerGetTransform(ownerId: int64): Transform3D
        
        /** Returns the parent object of the given shape owner. */
        shapeOwnerGetOwner(ownerId: int64): null | GObject
        
        /** If `true`, disables the given shape owner. */
        shapeOwnerSetDisabled(ownerId: int64, disabled: boolean): void
        
        /** If `true`, the shape owner and its shapes are disabled. */
        isShapeOwnerDisabled(ownerId: int64): boolean
        
        /** Adds a [Shape3D] to the shape owner. */
        shapeOwnerAddShape(ownerId: int64, shape: Shape3D): void
        
        /** Returns the number of shapes the given shape owner contains. */
        shapeOwnerGetShapeCount(ownerId: int64): int64
        
        /** Returns the [Shape3D] with the given ID from the given shape owner. */
        shapeOwnerGetShape(ownerId: int64, shapeId: int64): null | Shape3D
        
        /** Returns the child index of the [Shape3D] with the given ID from the given shape owner. */
        shapeOwnerGetShapeIndex(ownerId: int64, shapeId: int64): int64
        
        /** Removes a shape from the given shape owner. */
        shapeOwnerRemoveShape(ownerId: int64, shapeId: int64): void
        
        /** Removes all shapes from the shape owner. */
        shapeOwnerClearShapes(ownerId: int64): void
        
        /** Returns the `owner_id` of the given shape. */
        shapeFindOwner(shapeIndex: int64): int64
        
        /** Defines the behavior in physics when [member Node.process_mode] is set to [constant Node.PROCESS_MODE_DISABLED]. */
        get disableMode(): int64
        set disableMode(value: int64)
        
        /** The physics layers this CollisionObject3D **is in**. Collision objects can exist in one or more of 32 different layers. See also [member collision_mask]. For an easier way to change this value from a script, see [method set_collision_layer_value].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        
        /** The physics layers this CollisionObject3D **scans**. Collision objects can scan one or more of 32 different layers. See also [member collision_layer]. For an easier way to change this value from a script, see [method set_collision_mask_value].  
         *      
         *  **Note:** Object A can detect a contact with object B only if object B is in any of the layers that object A scans. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information.  
         */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** The priority used to solve colliding when occurring penetration. The higher the priority is, the lower the penetration into the object will be. This can for example be used to prevent the player from breaking through the boundaries of a level. */
        get collisionPriority(): float64
        set collisionPriority(value: float64)
        
        /** If `true`, this object is pickable. A pickable object can detect the mouse pointer entering/leaving, and if the mouse is inside it, report input events. Requires at least one [member collision_layer] bit to be set. */
        get inputRayPickable(): boolean
        set inputRayPickable(value: boolean)
        
        /** If `true`, the [CollisionObject3D] will continue to receive input events as the mouse is dragged across its shapes. */
        get inputCaptureOnDrag(): boolean
        set inputCaptureOnDrag(value: boolean)
        
        /** Emitted when an unhandled input event occurs. Requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set. See [method _input_event] for details. */
        readonly inputEvent: Signal<(camera: Node, event: InputEvent, eventPosition: Vector3, normal: Vector3, shapeIdx: int64) => void>
        
        /** Emitted when the mouse pointer enters any of this object's shapes. Requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set.  
         *      
         *  **Note:** Due to the lack of continuous collision detection, this signal may not be emitted in the expected order if the mouse moves fast enough and the [CollisionObject3D]'s area is small. This signal may also not be emitted if another [CollisionObject3D] is overlapping the [CollisionObject3D] in question.  
         */
        readonly mouseEntered: Signal<() => void>
        
        /** Emitted when the mouse pointer exits all this object's shapes. Requires [member input_ray_pickable] to be `true` and at least one [member collision_layer] bit to be set.  
         *      
         *  **Note:** Due to the lack of continuous collision detection, this signal may not be emitted in the expected order if the mouse moves fast enough and the [CollisionObject3D]'s area is small. This signal may also not be emitted if another [CollisionObject3D] is overlapping the [CollisionObject3D] in question.  
         */
        readonly mouseExited: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionObject3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionObject3D;
    }
    namespace CollisionPolygon2D {
        enum BuildMode {
            BuildSolids = 0,
            BuildSegments = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionPolygon2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionPolygon2D extends __NameMapNode2D {
        build_mode: "buildMode";
        one_way_collision: "oneWayCollision";
        one_way_collision_margin: "oneWayCollisionMargin";
        one_way_collision_direction: "oneWayCollisionDirection";
    }
    /** A node that provides a polygon shape to a [CollisionObject2D] parent.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionpolygon2d.html  
     */
    class CollisionPolygon2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Collision build mode. */
        get buildMode(): int64
        set buildMode(value: int64)
        
        /** The polygon's list of vertices. Each point will be connected to the next, and the final point will be connected to the first.  
         *      
         *  **Note:** The returned vertices are in the local coordinate space of the given [CollisionPolygon2D].  
         */
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        
        /** If `true`, no collisions will be detected. This property should be changed with [method Object.set_deferred]. */
        get disabled(): boolean
        set disabled(value: boolean)
        
        /** If `true`, only edges that face up, relative to [CollisionPolygon2D]'s rotation, will collide with other objects.  
         *      
         *  **Note:** This property has no effect if this [CollisionPolygon2D] is a child of an [Area2D] node.  
         *      
         *  **Note:** The one way collision direction can be configured by setting [member one_way_collision_direction].  
         */
        get oneWayCollision(): boolean
        set oneWayCollision(value: boolean)
        
        /** The margin used for one-way collision (in pixels). Higher values will make the shape thicker, and work better for colliders that enter the polygon at a high velocity. */
        get oneWayCollisionMargin(): float64
        set oneWayCollisionMargin(value: float64)
        
        /** The direction used for one-way collision. */
        get oneWayCollisionDirection(): Vector2
        set oneWayCollisionDirection(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionPolygon2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionPolygon2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionPolygon3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionPolygon3D extends __NameMapNode3D {
        _is_editable_3d_polygon: "_isEditable3DPolygon";
        debug_color: "debugColor";
        debug_fill: "debugFill";
    }
    /** A node that provides a thickened polygon shape (a prism) to a [CollisionObject3D] parent.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionpolygon3d.html  
     */
    class CollisionPolygon3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        _isEditable3DPolygon(): boolean
        
        /** Length that the resulting collision extends in either direction perpendicular to its 2D polygon. */
        get depth(): float64
        set depth(value: float64)
        
        /** If `true`, no collision will be produced. This property should be changed with [method Object.set_deferred]. */
        get disabled(): boolean
        set disabled(value: boolean)
        
        /** Array of vertices which define the 2D polygon in the local XY plane. */
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        
        /** The collision margin for the generated [Shape3D]. See [member Shape3D.margin] for more details. */
        get margin(): float64
        set margin(value: float64)
        
        /** The collision shape color that is displayed in the editor, or in the running project if **Debug > Visible Collision Shapes** is checked at the top of the editor.  
         *      
         *  **Note:** The default value is [member ProjectSettings.debug/shapes/collision/shape_color]. The `Color(0, 0, 0, 0)` value documented here is a placeholder, and not the actual default debug color.  
         */
        get debugColor(): Color
        set debugColor(value: Color)
        
        /** If `true`, when the shape is displayed, it will show a solid fill color in addition to its wireframe. */
        get debugFill(): boolean
        set debugFill(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionPolygon3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionPolygon3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionShape2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionShape2D extends __NameMapNode2D {
        one_way_collision: "oneWayCollision";
        one_way_collision_margin: "oneWayCollisionMargin";
        one_way_collision_direction: "oneWayCollisionDirection";
        debug_color: "debugColor";
    }
    /** A node that provides a [Shape2D] to a [CollisionObject2D] parent.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionshape2d.html  
     */
    class CollisionShape2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The actual shape owned by this collision shape. */
        get shape(): null | RectangleShape2D | CircleShape2D | CapsuleShape2D | SegmentShape2D | SeparationRayShape2D | WorldBoundaryShape2D | ConvexPolygonShape2D | ConcavePolygonShape2D | Shape2D
        set shape(value: null | RectangleShape2D | CircleShape2D | CapsuleShape2D | SegmentShape2D | SeparationRayShape2D | WorldBoundaryShape2D | ConvexPolygonShape2D | ConcavePolygonShape2D | Shape2D)
        
        /** A disabled collision shape has no effect in the world. This property should be changed with [method Object.set_deferred]. */
        get disabled(): boolean
        set disabled(value: boolean)
        
        /** Sets whether this collision shape should only detect collision on one side (top or bottom).  
         *      
         *  **Note:** This property has no effect if this [CollisionShape2D] is a child of an [Area2D] node.  
         *      
         *  **Note:** The one way collision direction can be configured by setting [member one_way_collision_direction].  
         */
        get oneWayCollision(): boolean
        set oneWayCollision(value: boolean)
        
        /** The margin used for one-way collision (in pixels). Higher values will make the shape thicker, and work better for colliders that enter the shape at a high velocity. */
        get oneWayCollisionMargin(): float64
        set oneWayCollisionMargin(value: float64)
        
        /** The direction used for one-way collision. */
        get oneWayCollisionDirection(): Vector2
        set oneWayCollisionDirection(value: Vector2)
        
        /** The collision shape color that is displayed in the editor, or in the running project if **Debug > Visible Collision Shapes** is checked at the top of the editor.  
         *      
         *  **Note:** The default value is [member ProjectSettings.debug/shapes/collision/shape_color]. The `Color(0, 0, 0, 0)` value documented here is a placeholder, and not the actual default debug color.  
         */
        get debugColor(): Color
        set debugColor(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCollisionShape3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCollisionShape3D extends __NameMapNode3D {
        resource_changed: "resourceChanged";
        make_convex_from_siblings: "makeConvexFromSiblings";
        debug_color: "debugColor";
        debug_fill: "debugFill";
    }
    /** A node that provides a [Shape3D] to a [CollisionObject3D] parent.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_collisionshape3d.html  
     */
    class CollisionShape3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** This method does nothing. */
        resourceChanged(resource: Resource): void
        
        /** Sets the collision shape's shape to the addition of all its convexed [MeshInstance3D] siblings geometry. */
        makeConvexFromSiblings(): void
        
        /** The actual shape owned by this collision shape. */
        get shape(): null | BoxShape3D | SphereShape3D | CapsuleShape3D | CylinderShape3D | SeparationRayShape3D | HeightMapShape3D | WorldBoundaryShape3D | ConvexPolygonShape3D | ConcavePolygonShape3D | Shape3D
        set shape(value: null | BoxShape3D | SphereShape3D | CapsuleShape3D | CylinderShape3D | SeparationRayShape3D | HeightMapShape3D | WorldBoundaryShape3D | ConvexPolygonShape3D | ConcavePolygonShape3D | Shape3D)
        
        /** A disabled collision shape has no effect in the world. This property should be changed with [method Object.set_deferred]. */
        get disabled(): boolean
        set disabled(value: boolean)
        
        /** The collision shape color that is displayed in the editor, or in the running project if **Debug > Visible Collision Shapes** is checked at the top of the editor.  
         *      
         *  **Note:** The default value is [member ProjectSettings.debug/shapes/collision/shape_color]. The `Color(0, 0, 0, 0)` value documented here is a placeholder, and not the actual default debug color.  
         */
        get debugColor(): Color
        set debugColor(value: Color)
        
        /** If `true`, when the shape is displayed, it will show a solid fill color in addition to its wireframe. */
        get debugFill(): boolean
        set debugFill(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCollisionShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCollisionShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapColorPalette extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapColorPalette extends __NameMapResource {
    }
    /** A resource class for managing a palette of colors, which can be loaded and saved using [ColorPicker].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_colorpalette.html  
     */
    class ColorPalette extends Resource {
        constructor(identifier?: any)
        /** A [PackedColorArray] containing the colors in the palette. */
        get colors(): PackedColorArray
        set colors(value: PackedColorArray | Color[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapColorPalette;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapColorPalette;
    }
    namespace ColorPicker {
        enum ColorModeType {
            ModeRgb = 0,
            ModeHsv = 1,
            ModeRaw = 2,
            ModeLinear = 2,
            ModeOkhsl = 3,
        }
        enum PickerShapeType {
            ShapeHsvRectangle = 0,
            ShapeHsvWheel = 1,
            ShapeVhsCircle = 2,
            ShapeOkhslCircle = 3,
            ShapeNone = 4,
            ShapeOkHsRectangle = 5,
            ShapeOkHlRectangle = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapColorPicker extends __RPCMapVBoxContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapColorPicker extends __NameMapVBoxContainer {
        add_preset: "addPreset";
        erase_preset: "erasePreset";
        get_presets: "getPresets";
        add_recent_preset: "addRecentPreset";
        erase_recent_preset: "eraseRecentPreset";
        get_recent_presets: "getRecentPresets";
        edit_alpha: "editAlpha";
        edit_intensity: "editIntensity";
        color_mode: "colorMode";
        deferred_mode: "deferredMode";
        picker_shape: "pickerShape";
        can_add_swatches: "canAddSwatches";
        sampler_visible: "samplerVisible";
        color_modes_visible: "colorModesVisible";
        sliders_visible: "slidersVisible";
        hex_visible: "hexVisible";
        presets_visible: "presetsVisible";
        color_changed: "colorChanged";
        preset_added: "presetAdded";
        preset_removed: "presetRemoved";
    }
    /** A widget that provides an interface for selecting or modifying a color.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_colorpicker.html  
     */
    class ColorPicker<Map extends NodePathMap = any> extends VBoxContainer<Map> {
        constructor(identifier?: any)
        /** Adds the given color to a list of color presets. The presets are displayed in the color picker and the user will be able to select them.  
         *      
         *  **Note:** The presets list is only for  *this*  color picker.  
         */
        addPreset(color: Color): void
        
        /** Removes the given color from the list of color presets of this color picker. */
        erasePreset(color: Color): void
        
        /** Returns the list of colors in the presets of the color picker. */
        getPresets(): PackedColorArray
        
        /** Adds the given color to a list of color recent presets so that it can be picked later. Recent presets are the colors that were picked recently, a new preset is automatically created and added to recent presets when you pick a new color.  
         *      
         *  **Note:** The recent presets list is only for  *this*  color picker.  
         */
        addRecentPreset(color: Color): void
        
        /** Removes the given color from the list of color recent presets of this color picker. */
        eraseRecentPreset(color: Color): void
        
        /** Returns the list of colors in the recent presets of the color picker. */
        getRecentPresets(): PackedColorArray
        
        /** The currently selected color. */
        get color(): Color
        set color(value: Color)
        
        /** If `true`, shows an alpha channel slider (opacity). */
        get editAlpha(): boolean
        set editAlpha(value: boolean)
        
        /** If `true`, shows an intensity slider. The intensity is applied as follows: convert the color to linear encoding, multiply it by `2 ** intensity`, and then convert it back to nonlinear sRGB encoding. */
        get editIntensity(): boolean
        set editIntensity(value: boolean)
        
        /** The currently selected color mode. */
        get colorMode(): int64
        set colorMode(value: int64)
        
        /** If `true`, the color will apply only after the user releases the mouse button, otherwise it will apply immediately even in mouse motion event (which can cause performance issues). */
        get deferredMode(): boolean
        set deferredMode(value: boolean)
        
        /** The shape of the color space view. */
        get pickerShape(): int64
        set pickerShape(value: int64)
        
        /** If `true`, it's possible to add presets under Swatches. If `false`, the button to add presets is disabled. */
        get canAddSwatches(): boolean
        set canAddSwatches(value: boolean)
        
        /** If `true`, the color sampler and color preview are visible. */
        get samplerVisible(): boolean
        set samplerVisible(value: boolean)
        
        /** If `true`, the color mode buttons are visible. */
        get colorModesVisible(): boolean
        set colorModesVisible(value: boolean)
        
        /** If `true`, the color sliders are visible. */
        get slidersVisible(): boolean
        set slidersVisible(value: boolean)
        
        /** If `true`, the hex color code input field is visible. */
        get hexVisible(): boolean
        set hexVisible(value: boolean)
        
        /** If `true`, the Swatches and Recent Colors presets are visible. */
        get presetsVisible(): boolean
        set presetsVisible(value: boolean)
        
        /** Emitted when the color is changed. */
        readonly colorChanged: Signal<(color: Color) => void>
        
        /** Emitted when a preset is added. */
        readonly presetAdded: Signal<(color: Color) => void>
        
        /** Emitted when a preset is removed. */
        readonly presetRemoved: Signal<(color: Color) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapColorPicker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapColorPicker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapColorPickerButton extends __RPCMapButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapColorPickerButton extends __NameMapButton {
        get_picker: "getPicker";
        get_popup: "getPopup";
        _about_to_popup: "_aboutToPopup";
        edit_alpha: "editAlpha";
        edit_intensity: "editIntensity";
        color_changed: "colorChanged";
        popup_closed: "popupClosed";
        picker_created: "pickerCreated";
    }
    /** A button that brings up a [ColorPicker] when pressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_colorpickerbutton.html  
     */
    class ColorPickerButton<Map extends NodePathMap = any> extends Button<Map> {
        constructor(identifier?: any)
        /** Returns the [ColorPicker] that this node toggles.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getPicker(): null | ColorPicker
        
        /** Returns the control's [PopupPanel] which allows you to connect to popup signals. This allows you to handle events when the ColorPicker is shown or hidden.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getPopup(): null | PopupPanel
        _aboutToPopup(): void
        
        /** The currently selected color. */
        get color(): Color
        set color(value: Color)
        
        /** If `true`, the alpha channel in the displayed [ColorPicker] will be visible. */
        get editAlpha(): boolean
        set editAlpha(value: boolean)
        
        /** If `true`, the intensity slider in the displayed [ColorPicker] will be visible. */
        get editIntensity(): boolean
        set editIntensity(value: boolean)
        
        /** Emitted when the color changes. */
        readonly colorChanged: Signal<(color: Color) => void>
        
        /** Emitted when the [ColorPicker] is closed. */
        readonly popupClosed: Signal<() => void>
        
        /** Emitted when the [ColorPicker] is created (the button is pressed for the first time). */
        readonly pickerCreated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapColorPickerButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapColorPickerButton;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapColorRect extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapColorRect extends __NameMapControl {
    }
    /** A control that displays a solid color rectangle.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_colorrect.html  
     */
    class ColorRect<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** The fill color of the rectangle. */
        get color(): Color
        set color(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapColorRect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapColorRect;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompositor extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompositor extends __NameMapResource {
        compositor_effects: "compositorEffects";
    }
    /** Stores attributes used to customize how a Viewport is rendered.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compositor.html  
     */
    class Compositor extends Resource {
        constructor(identifier?: any)
        /** The custom [CompositorEffect]s that are applied during rendering of viewports using this compositor. */
        get compositorEffects(): GArray<CompositorEffect>
        set compositorEffects(value: GArray<CompositorEffect>)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompositor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompositor;
    }
    namespace CompositorEffect {
        enum EffectCallbackType {
            EffectCallbackTypePreOpaque = 0,
            EffectCallbackTypePostOpaque = 1,
            EffectCallbackTypePostSky = 2,
            EffectCallbackTypePreTransparent = 3,
            EffectCallbackTypePostTransparent = 4,
            EffectCallbackTypeMax = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompositorEffect extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompositorEffect extends __NameMapResource {
        _render_callback: "_renderCallback";
        effect_callback_type: "effectCallbackType";
        access_resolved_color: "accessResolvedColor";
        access_resolved_depth: "accessResolvedDepth";
        needs_motion_vectors: "needsMotionVectors";
        needs_normal_roughness: "needsNormalRoughness";
        needs_separate_specular: "needsSeparateSpecular";
    }
    /** This resource allows for creating a custom rendering effect.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compositoreffect.html  
     */
    class CompositorEffect extends Resource {
        constructor(identifier?: any)
        /** Implement this function with your custom rendering code. [param effect_callback_type] should always match the effect callback type you've specified in [member effect_callback_type]. [param render_data] provides access to the rendering state, it is only valid during rendering and should not be stored. */
        /* gdvirtual */ _renderCallback(effectCallbackType: int64, renderData: RenderData): void
        
        /** If `true` this rendering effect is applied to any viewport it is added to. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The type of effect that is implemented, determines at what stage of rendering the callback is called. */
        get effectCallbackType(): int64
        set effectCallbackType(value: int64)
        
        /** If `true` and MSAA is enabled, this will trigger a color buffer resolve before the effect is run.  
         *      
         *  **Note:** In [method _render_callback], to access the resolved buffer use:  
         *    
         */
        get accessResolvedColor(): boolean
        set accessResolvedColor(value: boolean)
        
        /** If `true` and MSAA is enabled, this will trigger a depth buffer resolve before the effect is run.  
         *      
         *  **Note:** In [method _render_callback], to access the resolved buffer use:  
         *    
         */
        get accessResolvedDepth(): boolean
        set accessResolvedDepth(value: boolean)
        
        /** If `true` this triggers motion vectors being calculated during the opaque render state.  
         *      
         *  **Note:** In [method _render_callback], to access the motion vector buffer use:  
         *    
         */
        get needsMotionVectors(): boolean
        set needsMotionVectors(value: boolean)
        
        /** If `true` this triggers normal and roughness data to be output during our depth pre-pass, only applicable for the Forward+ renderer.  
         *      
         *  **Note:** In [method _render_callback], to access the roughness buffer use:  
         *    
         *  The raw normal and roughness buffer is stored in an optimized format, different than the one available in Spatial shaders. When sampling the buffer, a conversion function must be applied. Use this function, copied from [url=https://github.com/godotengine/godot/blob/da5f39889f155658cef7f7ec3cc1abb94e17d815/servers/rendering/renderer_rd/shaders/forward_clustered/scene_forward_clustered_inc.glsl#L334-L341]here[/url]:  
         *    
         */
        get needsNormalRoughness(): boolean
        set needsNormalRoughness(value: boolean)
        
        /** If `true` this triggers specular data being rendered to a separate buffer and combined after effects have been applied, only applicable for the Forward+ renderer. */
        get needsSeparateSpecular(): boolean
        set needsSeparateSpecular(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompositorEffect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompositorEffect;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedCubemap extends __RPCMapCompressedTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedCubemap extends __NameMapCompressedTextureLayered {
    }
    /** An optionally compressed [Cubemap].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedcubemap.html  
     */
    class CompressedCubemap extends CompressedTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedCubemap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedCubemap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedCubemapArray extends __RPCMapCompressedTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedCubemapArray extends __NameMapCompressedTextureLayered {
    }
    /** An optionally compressed [CubemapArray].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedcubemaparray.html  
     */
    class CompressedCubemapArray extends CompressedTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedCubemapArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedCubemapArray;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedTexture2D extends __NameMapTexture2D {
        load_path: "loadPath";
    }
    /** Texture with 2 dimensions, optionally compressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedtexture2d.html  
     */
    class CompressedTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** The [CompressedTexture2D]'s file path to a `.ctex` file. */
        get loadPath(): string
        set loadPath(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedTexture2DArray extends __RPCMapCompressedTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedTexture2DArray extends __NameMapCompressedTextureLayered {
    }
    /** Array of 2-dimensional textures, optionally compressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedtexture2darray.html  
     */
    class CompressedTexture2DArray extends CompressedTextureLayered {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedTexture2DArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedTexture2DArray;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedTexture3D extends __RPCMapTexture3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedTexture3D extends __NameMapTexture3D {
        load_path: "loadPath";
    }
    /** Texture with 3 dimensions, optionally compressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedtexture3d.html  
     */
    class CompressedTexture3D extends Texture3D {
        constructor(identifier?: any)
        /** The [CompressedTexture3D]'s file path to a `.ctex3d` file. */
        get loadPath(): string
        set loadPath(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedTexture3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedTexture3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCompressedTextureLayered extends __RPCMapTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCompressedTextureLayered extends __NameMapTextureLayered {
        load_path: "loadPath";
    }
    /** Base class for texture arrays that can optionally be compressed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_compressedtexturelayered.html  
     */
    class CompressedTextureLayered extends TextureLayered {
        constructor(identifier?: any)
        /** The path the texture should be loaded from. */
        get loadPath(): string
        set loadPath(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCompressedTextureLayered;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCompressedTextureLayered;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConcavePolygonShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConcavePolygonShape2D extends __NameMapShape2D {
    }
    /** A 2D polyline shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_concavepolygonshape2d.html  
     */
    class ConcavePolygonShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The array of points that make up the [ConcavePolygonShape2D]'s line segments. The array (of length divisible by two) is naturally divided into pairs (one pair for each segment); each pair consists of the starting point of a segment and the endpoint of a segment. */
        get segments(): PackedVector2Array
        set segments(value: PackedVector2Array | Vector2[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConcavePolygonShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConcavePolygonShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConcavePolygonShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConcavePolygonShape3D extends __NameMapShape3D {
        backface_collision: "backfaceCollision";
    }
    /** A 3D trimesh shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_concavepolygonshape3d.html  
     */
    class ConcavePolygonShape3D extends Shape3D {
        constructor(identifier?: any)
        get data(): PackedVector3Array
        set data(value: PackedVector3Array | Vector3[])
        
        /** If set to `true`, collisions occur on both sides of the concave shape faces. Otherwise they occur only along the face normals. */
        get backfaceCollision(): boolean
        set backfaceCollision(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConcavePolygonShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConcavePolygonShape3D;
    }
    namespace ConeTwistJoint3D {
        enum Param {
            ParamSwingSpan = 0,
            ParamTwistSpan = 1,
            ParamBias = 2,
            ParamSoftness = 3,
            ParamRelaxation = 4,
            ParamMax = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConeTwistJoint3D extends __RPCMapJoint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConeTwistJoint3D extends __NameMapJoint3D {
        set_param: "setParam";
        get_param: "getParam";
        swing_span: "swingSpan";
        twist_span: "twistSpan";
    }
    /** A physics joint that connects two 3D physics bodies in a way that simulates a ball-and-socket joint.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_conetwistjoint3d.html  
     */
    class ConeTwistJoint3D<Map extends NodePathMap = any> extends Joint3D<Map> {
        constructor(identifier?: any)
        /** Sets the value of the specified parameter. */
        setParam(param: ConeTwistJoint3D.Param, value: float64): void
        
        /** Returns the value of the specified parameter. */
        getParam(param: ConeTwistJoint3D.Param): float64
        
        /** Swing is rotation from side to side, around the axis perpendicular to the twist axis.  
         *  The swing span defines, how much rotation will not get corrected along the swing axis.  
         *  Could be defined as looseness in the [ConeTwistJoint3D].  
         *  If below 0.05, this behavior is locked.  
         */
        get swingSpan(): float64
        set swingSpan(value: float64)
        
        /** Twist is the rotation around the twist axis, this value defined how far the joint can twist.  
         *  Twist is locked if below 0.05.  
         */
        get twistSpan(): float64
        set twistSpan(value: float64)
        
        /** The speed with which the swing or twist will take place.  
         *  The higher, the faster.  
         */
        get bias(): float64
        set bias(value: float64)
        
        /** The ease with which the joint starts to twist. If it's too low, it takes more force to start twisting the joint. */
        get softness(): float64
        set softness(value: float64)
        
        /** Defines, how fast the swing- and twist-speed-difference on both sides gets synced. */
        get relaxation(): float64
        set relaxation(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConeTwistJoint3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConeTwistJoint3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConfigFile extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConfigFile extends __NameMapRefCounted {
        set_value: "setValue";
        get_value: "getValue";
        has_section: "hasSection";
        has_section_key: "hasSectionKey";
        get_sections: "getSections";
        get_section_keys: "getSectionKeys";
        erase_section: "eraseSection";
        erase_section_key: "eraseSectionKey";
        encode_to_text: "encodeToText";
        load_encrypted: "loadEncrypted";
        load_encrypted_pass: "loadEncryptedPass";
        save_encrypted: "saveEncrypted";
        save_encrypted_pass: "saveEncryptedPass";
    }
    /** Helper class to handle INI-style files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_configfile.html  
     */
    class ConfigFile extends RefCounted {
        constructor(identifier?: any)
        /** Assigns a value to the specified key of the specified section. If either the section or the key do not exist, they are created. Passing a `null` value deletes the specified key if it exists, and deletes the section if it ends up empty once the key has been removed. */
        setValue(section: string, key: string, value: any): void
        
        /** Returns the current value for the specified section and key. If either the section or the key do not exist, the method returns the fallback [param default] value. If [param default] is not specified or set to `null`, an error is also raised. */
        getValue(section: string, key: string, default_?: any /* = {} */): any
        
        /** Returns `true` if the specified section exists. */
        hasSection(section: string): boolean
        
        /** Returns `true` if the specified section-key pair exists. */
        hasSectionKey(section: string, key: string): boolean
        
        /** Returns an array of all defined section identifiers. */
        getSections(): PackedStringArray
        
        /** Returns an array of all defined key identifiers in the specified section. Raises an error and returns an empty array if the section does not exist. */
        getSectionKeys(section: string): PackedStringArray
        
        /** Deletes the specified section along with all the key-value pairs inside. Raises an error if the section does not exist. */
        eraseSection(section: string): void
        
        /** Deletes the specified key in a section. Raises an error if either the section or the key do not exist. */
        eraseSectionKey(section: string, key: string): void
        
        /** Loads the config file specified as a parameter. The file's contents are parsed and loaded in the [ConfigFile] object which the method was called on.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        load(path: string): GError
        
        /** Parses the passed string as the contents of a config file. The string is parsed and loaded in the ConfigFile object which the method was called on.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        parse(data: string): GError
        
        /** Saves the contents of the [ConfigFile] object to the file specified as a parameter. The output file uses an INI-style structure.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        save(path: string): GError
        
        /** Obtain the text version of this config file (the same text that would be written to a file). */
        encodeToText(): string
        
        /** Loads the encrypted config file specified as a parameter, using the provided [param key] to decrypt it. The file's contents are parsed and loaded in the [ConfigFile] object which the method was called on.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        loadEncrypted(path: string, key: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Loads the encrypted config file specified as a parameter, using the provided [param password] to decrypt it. The file's contents are parsed and loaded in the [ConfigFile] object which the method was called on.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        loadEncryptedPass(path: string, password: string): GError
        
        /** Saves the contents of the [ConfigFile] object to the AES-256 encrypted file specified as a parameter, using the provided [param key] to encrypt it. The output file uses an INI-style structure.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        saveEncrypted(path: string, key: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Saves the contents of the [ConfigFile] object to the AES-256 encrypted file specified as a parameter, using the provided [param password] to encrypt it. The output file uses an INI-style structure.  
         *  Returns [constant OK] on success, or one of the other [enum Error] values if the operation failed.  
         */
        saveEncryptedPass(path: string, password: string): GError
        
        /** Removes the entire contents of the config. */
        clear(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConfigFile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConfigFile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConfirmationDialog extends __RPCMapAcceptDialog {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConfirmationDialog extends __NameMapAcceptDialog {
        get_cancel_button: "getCancelButton";
        cancel_button_text: "cancelButtonText";
    }
    /** A dialog used for confirmation of actions.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_confirmationdialog.html  
     */
    class ConfirmationDialog<Map extends NodePathMap = any> extends AcceptDialog<Map> {
        constructor(identifier?: any)
        /** Returns the cancel button.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getCancelButton(): null | Button
        
        /** The text displayed by the cancel button (see [method get_cancel_button]). */
        get cancelButtonText(): string
        set cancelButtonText(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConfirmationDialog;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConfirmationDialog;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapContainer extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapContainer extends __NameMapControl {
        _get_allowed_size_flags_horizontal: "_getAllowedSizeFlagsHorizontal";
        _get_allowed_size_flags_vertical: "_getAllowedSizeFlagsVertical";
        queue_sort: "queueSort";
        fit_child_in_rect: "fitChildInRect";
        accessibility_region: "accessibilityRegion";
        pre_sort_children: "preSortChildren";
        sort_children: "sortChildren";
    }
    /** Base class for all GUI containers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_container.html  
     */
    class Container<Map extends NodePathMap = any> extends Control<Map> {
        /** Notification just before children are going to be sorted, in case there's something to process beforehand. */
        static readonly NOTIFICATION_PRE_SORT_CHILDREN = 50
        
        /** Notification for when sorting the children, it must be obeyed immediately. */
        static readonly NOTIFICATION_SORT_CHILDREN = 51
        constructor(identifier?: any)
        
        /** Implement to return a list of allowed horizontal [enum Control.SizeFlags] for child nodes. This doesn't technically prevent the usages of any other size flags, if your implementation requires that. This only limits the options available to the user in the Inspector dock.  
         *      
         *  **Note:** Having no size flags is equal to having [constant Control.SIZE_SHRINK_BEGIN]. As such, this value is always implicitly allowed.  
         */
        /* gdvirtual */ _getAllowedSizeFlagsHorizontal(): PackedInt32Array
        
        /** Implement to return a list of allowed vertical [enum Control.SizeFlags] for child nodes. This doesn't technically prevent the usages of any other size flags, if your implementation requires that. This only limits the options available to the user in the Inspector dock.  
         *      
         *  **Note:** Having no size flags is equal to having [constant Control.SIZE_SHRINK_BEGIN]. As such, this value is always implicitly allowed.  
         */
        /* gdvirtual */ _getAllowedSizeFlagsVertical(): PackedInt32Array
        
        /** Queue resort of the contained children. This is called automatically anyway, but can be called upon request. */
        queueSort(): void
        
        /** Fit a child control in a given rect. This is mainly a helper for creating custom container classes. */
        fitChildInRect(child: Control, rect: Rect2): void
        
        /** If `true`, this container is marked as a region for accessibility. Use [member Control.accessibility_name] to give the region a descriptive name. Screen readers can navigate between regions using landmark navigation. */
        get accessibilityRegion(): boolean
        set accessibilityRegion(value: boolean)
        
        /** Emitted when children are going to be sorted. */
        readonly preSortChildren: Signal<() => void>
        
        /** Emitted when sorting the children is needed. */
        readonly sortChildren: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapContainer;
    }
    namespace Control {
        enum FocusMode {
            FocusNone = 0,
            FocusClick = 1,
            FocusAll = 2,
            FocusAccessibility = 3,
        }
        enum FocusBehaviorRecursive {
            FocusBehaviorInherited = 0,
            FocusBehaviorDisabled = 1,
            FocusBehaviorEnabled = 2,
        }
        enum MouseBehaviorRecursive {
            MouseBehaviorInherited = 0,
            MouseBehaviorDisabled = 1,
            MouseBehaviorEnabled = 2,
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
        enum LayoutPreset {
            PresetTopLeft = 0,
            PresetTopRight = 1,
            PresetBottomLeft = 2,
            PresetBottomRight = 3,
            PresetCenterLeft = 4,
            PresetCenterTop = 5,
            PresetCenterRight = 6,
            PresetCenterBottom = 7,
            PresetCenter = 8,
            PresetLeftWide = 9,
            PresetTopWide = 10,
            PresetRightWide = 11,
            PresetBottomWide = 12,
            PresetVcenterWide = 13,
            PresetHcenterWide = 14,
            PresetFullRect = 15,
        }
        enum LayoutPresetMode {
            PresetModeMinsize = 0,
            PresetModeKeepWidth = 1,
            PresetModeKeepHeight = 2,
            PresetModeKeepSize = 3,
        }
        enum SizeFlags {
            SizeShrinkBegin = 0,
            SizeFill = 1,
            SizeExpand = 2,
            SizeExpandFill = 3,
            SizeShrinkCenter = 4,
            SizeShrinkEnd = 8,
            SizeMaximize = 16,
        }
        enum MouseFilter {
            MouseFilterStop = 0,
            MouseFilterPass = 1,
            MouseFilterIgnore = 2,
        }
        enum GrowDirection {
            GrowDirectionBegin = 0,
            GrowDirectionEnd = 1,
            GrowDirectionBoth = 2,
        }
        enum Anchor {
            AnchorBegin = 0,
            AnchorEnd = 1,
        }
        enum LayoutDirection {
            LayoutDirectionInherited = 0,
            LayoutDirectionApplicationLocale = 1,
            LayoutDirectionLtr = 2,
            LayoutDirectionRtl = 3,
            LayoutDirectionSystemLocale = 4,
            LayoutDirectionMax = 5,
            LayoutDirectionLocale = 1,
        }
        enum TextDirection {
            TextDirectionInherited = 3,
            TextDirectionAuto = 0,
            TextDirectionLtr = 1,
            TextDirectionRtl = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapControl extends __RPCMapCanvasItem {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapControl extends __NameMapCanvasItem {
        _has_point: "_hasPoint";
        _structured_text_parser: "_structuredTextParser";
        _get_maximum_size: "_getMaximumSize";
        _get_minimum_size: "_getMinimumSize";
        _get_tooltip: "_getTooltip";
        _get_tooltip_auto_translate_mode_at: "_getTooltipAutoTranslateModeAt";
        _get_drag_data: "_getDragData";
        _can_drop_data: "_canDropData";
        _drop_data: "_dropData";
        _make_custom_tooltip: "_makeCustomTooltip";
        _get_cursor_shape: "_getCursorShape";
        _accessibility_get_contextual_info: "_accessibilityGetContextualInfo";
        _get_accessibility_container_name: "_getAccessibilityContainerName";
        _gui_input: "_guiInput";
        accept_event: "acceptEvent";
        get_maximum_size: "getMaximumSize";
        get_combined_maximum_size: "getCombinedMaximumSize";
        get_minimum_size: "getMinimumSize";
        get_combined_minimum_size: "getCombinedMinimumSize";
        get_bound_minimum_size: "getBoundMinimumSize";
        set_anchors_preset: "setAnchorsPreset";
        set_offsets_preset: "setOffsetsPreset";
        set_anchors_and_offsets_preset: "setAnchorsAndOffsetsPreset";
        _set_anchor: "_setAnchor";
        set_anchor: "setAnchor";
        get_anchor: "getAnchor";
        set_offset: "setOffset";
        get_offset: "getOffset";
        set_anchor_and_offset: "setAnchorAndOffset";
        set_begin: "setBegin";
        set_end: "setEnd";
        set_position: "setPosition";
        set_size: "setSize";
        reset_size: "resetSize";
        set_global_position: "setGlobalPosition";
        get_begin: "getBegin";
        get_end: "getEnd";
        get_combined_pivot_offset: "getCombinedPivotOffset";
        get_parent_area_size: "getParentAreaSize";
        get_screen_position: "getScreenPosition";
        get_rect: "getRect";
        get_global_rect: "getGlobalRect";
        get_focus_mode_with_override: "getFocusModeWithOverride";
        has_focus: "hasFocus";
        grab_focus: "grabFocus";
        release_focus: "releaseFocus";
        find_prev_valid_focus: "findPrevValidFocus";
        find_next_valid_focus: "findNextValidFocus";
        find_valid_focus_neighbor: "findValidFocusNeighbor";
        play_theme_sound: "playThemeSound";
        begin_bulk_theme_override: "beginBulkThemeOverride";
        end_bulk_theme_override: "endBulkThemeOverride";
        add_theme_icon_override: "addThemeIconOverride";
        add_theme_stylebox_override: "addThemeStyleboxOverride";
        add_theme_font_override: "addThemeFontOverride";
        add_theme_font_size_override: "addThemeFontSizeOverride";
        add_theme_color_override: "addThemeColorOverride";
        add_theme_constant_override: "addThemeConstantOverride";
        add_theme_sound_override: "addThemeSoundOverride";
        remove_theme_icon_override: "removeThemeIconOverride";
        remove_theme_stylebox_override: "removeThemeStyleboxOverride";
        remove_theme_font_override: "removeThemeFontOverride";
        remove_theme_font_size_override: "removeThemeFontSizeOverride";
        remove_theme_color_override: "removeThemeColorOverride";
        remove_theme_constant_override: "removeThemeConstantOverride";
        remove_theme_sound_override: "removeThemeSoundOverride";
        get_theme_icon: "getThemeIcon";
        get_theme_stylebox: "getThemeStylebox";
        get_theme_font: "getThemeFont";
        get_theme_font_size: "getThemeFontSize";
        get_theme_color: "getThemeColor";
        get_theme_constant: "getThemeConstant";
        get_theme_sound: "getThemeSound";
        has_theme_icon_override: "hasThemeIconOverride";
        has_theme_stylebox_override: "hasThemeStyleboxOverride";
        has_theme_font_override: "hasThemeFontOverride";
        has_theme_font_size_override: "hasThemeFontSizeOverride";
        has_theme_color_override: "hasThemeColorOverride";
        has_theme_constant_override: "hasThemeConstantOverride";
        has_theme_sound_override: "hasThemeSoundOverride";
        has_theme_icon: "hasThemeIcon";
        has_theme_stylebox: "hasThemeStylebox";
        has_theme_font: "hasThemeFont";
        has_theme_font_size: "hasThemeFontSize";
        has_theme_color: "hasThemeColor";
        has_theme_constant: "hasThemeConstant";
        has_theme_sound: "hasThemeSound";
        get_theme_default_base_scale: "getThemeDefaultBaseScale";
        get_theme_default_font: "getThemeDefaultFont";
        get_theme_default_font_size: "getThemeDefaultFontSize";
        get_parent_control: "getParentControl";
        get_tooltip: "getTooltip";
        get_cursor_shape: "getCursorShape";
        set_focus_neighbor: "setFocusNeighbor";
        get_focus_neighbor: "getFocusNeighbor";
        force_drag: "forceDrag";
        accessibility_drag: "accessibilityDrag";
        accessibility_drop: "accessibilityDrop";
        get_mouse_filter_with_override: "getMouseFilterWithOverride";
        grab_click_focus: "grabClickFocus";
        set_drag_forwarding: "setDragForwarding";
        set_drag_preview: "setDragPreview";
        is_drag_successful: "isDragSuccessful";
        warp_mouse: "warpMouse";
        update_maximum_size: "updateMaximumSize";
        update_minimum_size: "updateMinimumSize";
        is_layout_rtl: "isLayoutRtl";
        custom_minimum_size: "customMinimumSize";
        custom_maximum_size: "customMaximumSize";
        propagate_maximum_size: "propagateMaximumSize";
        clip_contents: "clipContents";
        layout_mode: "layoutMode";
        anchors_preset: "anchorsPreset";
        anchor_left: "anchorLeft";
        anchor_top: "anchorTop";
        anchor_right: "anchorRight";
        anchor_bottom: "anchorBottom";
        offset_left: "offsetLeft";
        offset_top: "offsetTop";
        offset_right: "offsetRight";
        offset_bottom: "offsetBottom";
        grow_horizontal: "growHorizontal";
        grow_vertical: "growVertical";
        global_position: "globalPosition";
        rotation_degrees: "rotationDegrees";
        pivot_offset: "pivotOffset";
        pivot_offset_ratio: "pivotOffsetRatio";
        size_flags_horizontal: "sizeFlagsHorizontal";
        size_flags_vertical: "sizeFlagsVertical";
        size_flags_stretch_ratio: "sizeFlagsStretchRatio";
        offset_transform_enabled: "offsetTransformEnabled";
        offset_transform_position: "offsetTransformPosition";
        offset_transform_position_ratio: "offsetTransformPositionRatio";
        offset_transform_scale: "offsetTransformScale";
        offset_transform_rotation: "offsetTransformRotation";
        offset_transform_pivot: "offsetTransformPivot";
        offset_transform_pivot_ratio: "offsetTransformPivotRatio";
        offset_transform_visual_only: "offsetTransformVisualOnly";
        localize_numeral_system: "localizeNumeralSystem";
        layout_direction: "layoutDirection";
        translation_context: "translationContext";
        auto_translate: "autoTranslate";
        tooltip_text: "tooltipText";
        tooltip_auto_translate_mode: "tooltipAutoTranslateMode";
        focus_neighbor_left: "focusNeighborLeft";
        focus_neighbor_top: "focusNeighborTop";
        focus_neighbor_right: "focusNeighborRight";
        focus_neighbor_bottom: "focusNeighborBottom";
        focus_next: "focusNext";
        focus_previous: "focusPrevious";
        focus_mode: "focusMode";
        focus_behavior_recursive: "focusBehaviorRecursive";
        mouse_filter: "mouseFilter";
        mouse_behavior_recursive: "mouseBehaviorRecursive";
        mouse_force_pass_scroll_events: "mouseForcePassScrollEvents";
        mouse_default_cursor_shape: "mouseDefaultCursorShape";
        shortcut_context: "shortcutContext";
        accessibility_name: "accessibilityName";
        accessibility_description: "accessibilityDescription";
        accessibility_live: "accessibilityLive";
        accessibility_controls_nodes: "accessibilityControlsNodes";
        accessibility_described_by_nodes: "accessibilityDescribedByNodes";
        accessibility_labeled_by_nodes: "accessibilityLabeledByNodes";
        accessibility_flow_to_nodes: "accessibilityFlowToNodes";
        theme_type_variation: "themeTypeVariation";
        _layout_pending_finished: "_layoutPendingFinished";
        gui_input: "guiInput";
        mouse_entered: "mouseEntered";
        mouse_exited: "mouseExited";
        focus_entered: "focusEntered";
        focus_exited: "focusExited";
        size_flags_changed: "sizeFlagsChanged";
        maximum_size_changed: "maximumSizeChanged";
        minimum_size_changed: "minimumSizeChanged";
        _desired_size_changed: "_desiredSizeChanged";
        theme_changed: "themeChanged";
    }
    /** Base class for all GUI controls. Adapts its position and size based on its parent control.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_control.html  
     */
    class Control<Map extends NodePathMap = any> extends CanvasItem<Map> {
        /** Sent when the node changes size. Use [member size] to get the new size. */
        static readonly NOTIFICATION_RESIZED = 40
        
        /** Sent when the mouse cursor enters the control's (or any child control's) visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect which Control receives the notification.  
         *  See also [constant NOTIFICATION_MOUSE_ENTER_SELF].  
         */
        static readonly NOTIFICATION_MOUSE_ENTER = 41
        
        /** Sent when the mouse cursor leaves the control's (and all child control's) visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect which Control receives the notification.  
         *  See also [constant NOTIFICATION_MOUSE_EXIT_SELF].  
         */
        static readonly NOTIFICATION_MOUSE_EXIT = 42
        
        /** Sent when the mouse cursor enters the control's visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect which Control receives the notification.  
         *  See also [constant NOTIFICATION_MOUSE_ENTER].  
         */
        static readonly NOTIFICATION_MOUSE_ENTER_SELF = 60
        
        /** Sent when the mouse cursor leaves the control's visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect which Control receives the notification.  
         *  See also [constant NOTIFICATION_MOUSE_EXIT].  
         */
        static readonly NOTIFICATION_MOUSE_EXIT_SELF = 61
        
        /** Sent when the node grabs focus. */
        static readonly NOTIFICATION_FOCUS_ENTER = 43
        
        /** Sent when the node loses focus.  
         *  This notification is sent in reversed order.  
         */
        static readonly NOTIFICATION_FOCUS_EXIT = 44
        
        /** Sent when the node needs to refresh its theme items. This happens in one of the following cases:  
         *  - The [member theme] property is changed on this node or any of its ancestors.  
         *  - The [member theme_type_variation] property is changed on this node.  
         *  - One of the node's theme property overrides is changed.  
         *  - The node enters the scene tree.  
         *      
         *  **Note:** As an optimization, this notification won't be sent from changes that occur while this node is outside of the scene tree. Instead, all of the theme item updates can be applied at once when the node enters the scene tree.  
         *      
         *  **Note:** This notification is received alongside [constant Node.NOTIFICATION_ENTER_TREE], so if you are instantiating a scene, the child nodes will not be initialized yet. You can use it to setup theming for this node, child nodes created from script, or if you want to access child nodes added in the editor, make sure the node is ready using [method Node.is_node_ready].  
         *    
         */
        static readonly NOTIFICATION_THEME_CHANGED = 45
        
        /** Sent when this node is inside a [ScrollContainer] which has begun being scrolled when dragging the scrollable area  *with a touch event* . This notification is  *not*  sent when scrolling by dragging the scrollbar, scrolling with the mouse wheel or scrolling with keyboard/gamepad events.  
         *      
         *  **Note:** This signal is only emitted on Android or iOS, or on desktop/web platforms when [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse] is enabled.  
         */
        static readonly NOTIFICATION_SCROLL_BEGIN = 47
        
        /** Sent when this node is inside a [ScrollContainer] which has stopped being scrolled when dragging the scrollable area  *with a touch event* . This notification is  *not*  sent when scrolling by dragging the scrollbar, scrolling with the mouse wheel or scrolling with keyboard/gamepad events.  
         *      
         *  **Note:** This signal is only emitted on Android or iOS, or on desktop/web platforms when [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse] is enabled.  
         */
        static readonly NOTIFICATION_SCROLL_END = 48
        
        /** Sent when the control layout direction is changed from LTR or RTL or vice versa. This notification is propagated to child Control nodes as result of a change to [member layout_direction]. */
        static readonly NOTIFICATION_LAYOUT_DIRECTION_CHANGED = 49
        constructor(identifier?: any)
        
        /** Virtual method to be implemented by the user. Returns whether the given [param point] is inside this control.  
         *  If not overridden, default behavior is checking if the point is within the control's Rect.  
         *      
         *  **Note:** If you want to check if a point is inside the control, you can use `Rect2(Vector2.ZERO, size).has_point(point)`.  
         */
        /* gdvirtual */ _hasPoint(point: Vector2): boolean
        
        /** User defined BiDi algorithm override function.  
         *  Returns an [Array] of [Vector3i] text ranges and text base directions, in the left-to-right order. Ranges should cover full source [param text] without overlaps. BiDi algorithm will be used on each range separately.  
         */
        /* gdvirtual */ _structuredTextParser(args: GArray, text: string): GArray<Vector3I>
        
        /** Virtual method to be implemented by the user. Returns the maximum size for this control. Alternative to [member custom_maximum_size] for controlling maximum size via code. The actual maximum size will be the max value of these two (in each axis separately).  
         *  If not overridden, defaults to [constant Vector2.ZERO].  
         *      
         *  **Note:** This method will not be called when the script is attached to a [Control] node that already overrides its maximum size (e.g. [ScrollContainer]).  
         *      
         *  **Note:** It is recommended to use [method get_bound_minimum_size] instead of [method get_combined_minimum_size] when implementing this method, as the former respects maximum size limits when calculating the minimum size, while the latter does not.  
         */
        /* gdvirtual */ _getMaximumSize(): Vector2
        
        /** Virtual method to be implemented by the user. Returns the minimum size for this control. Alternative to [member custom_minimum_size] for controlling minimum size via code. The actual minimum size will be the max value of these two (in each axis separately).  
         *  If not overridden, defaults to [constant Vector2.ZERO].  
         *      
         *  **Note:** This method will not be called when the script is attached to a [Control] node that already overrides its minimum size (e.g. [Label], [Button], [PanelContainer] etc.). It can only be used with most basic GUI nodes, like [Control], [Container], [Panel] etc.  
         */
        /* gdvirtual */ _getMinimumSize(): Vector2
        
        /** Virtual method to be implemented by the user. Returns the tooltip text for the position [param at_position] in the control's local coordinates, which will typically appear when the cursor is resting over this control. See [method get_tooltip].  
         *      
         *  **Note:** If this method returns an empty [String] and [method _make_custom_tooltip] is not overridden, no tooltip is displayed.  
         */
        /* gdvirtual */ _getTooltip(atPosition: Vector2): string
        
        /** Return the auto-translation mode at the given [param at_position]. If not implemented, the [member tooltip_auto_translate_mode] property will be used instead. */
        /* gdvirtual */ _getTooltipAutoTranslateModeAt(atPosition: Vector2): Node.AutoTranslateMode
        
        /** Godot calls this method to get data that can be dragged and dropped onto controls that expect drop data. Returns `null` if there is no data to drag. Controls that want to receive drop data should implement [method _can_drop_data] and [method _drop_data]. [param at_position] is local to this control. Drag may be forced with [method force_drag].  
         *  A preview that will follow the mouse that should represent the data can be set with [method set_drag_preview]. A good time to set the preview is in this method.  
         *      
         *  **Note:** If the drag was initiated by a keyboard shortcut or [method accessibility_drag], [param at_position] is set to [constant Vector2.INF], and the currently selected item/text position should be used as the drag position.  
         *    
         */
        /* gdvirtual */ _getDragData(atPosition: Vector2): any
        
        /** Godot calls this method to test if [param data] from a control's [method _get_drag_data] can be dropped at [param at_position]. [param at_position] is local to this control.  
         *  This method should only be used to test the data. Process the data in [method _drop_data].  
         *      
         *  **Note:** If the drag was initiated by a keyboard shortcut or [method accessibility_drag], [param at_position] is set to [constant Vector2.INF], and the currently selected item/text position should be used as the drop position.  
         *    
         */
        /* gdvirtual */ _canDropData(atPosition: Vector2, data: any): boolean
        
        /** Godot calls this method to pass you the [param data] from a control's [method _get_drag_data] result. Godot first calls [method _can_drop_data] to test if [param data] is allowed to drop at [param at_position] where [param at_position] is local to this control.  
         *      
         *  **Note:** If the drag was initiated by a keyboard shortcut or [method accessibility_drag], [param at_position] is set to [constant Vector2.INF], and the currently selected item/text position should be used as the drop position.  
         *    
         */
        /* gdvirtual */ _dropData(atPosition: Vector2, data: any): void
        
        /** Virtual method to be implemented by the user. Returns a [Control] node that should be used as a tooltip instead of the default one. [param for_text] is the return value of [method get_tooltip].  
         *  The returned node must be of type [Control] or Control-derived. It can have child nodes of any type. It is freed when the tooltip disappears, so make sure you always provide a new instance (if you want to use a pre-existing node from your scene tree, you can duplicate it and pass the duplicated instance). When `null` or a non-Control node is returned, the default tooltip will be used instead.  
         *  The returned node will be added as child to a [PopupPanel], so you should only provide the contents of that panel. That [PopupPanel] can be themed using [method Theme.set_stylebox] for the type `"TooltipPanel"` (see [member tooltip_text] for an example).  
         *      
         *  **Note:** The tooltip is shrunk to minimal size. If you want to ensure it's fully visible, you might want to set its [member custom_minimum_size] to some non-zero value.  
         *      
         *  **Note:** The node (and any relevant children) should have their [member CanvasItem.visible] set to `true` when returned, otherwise, the viewport that instantiates it will not be able to calculate its minimum size reliably.  
         *      
         *  **Note:** If overridden, this method is called even if [method get_tooltip] returns an empty string. When this happens with the default tooltip, it is not displayed. To copy this behavior, return `null` in this method when [param for_text] is empty.  
         *  **Example:** Use a constructed node as a tooltip:  
         *    
         *  **Example:** Use a scene instance as a tooltip:  
         *    
         */
        /* gdvirtual */ _makeCustomTooltip(forText: string): null | GObject
        
        /** Virtual method to be implemented by the user. Returns the cursor shape for the position [param at_position] in the control's local coordinates, which will typically be used while hovering over this control. See [method get_cursor_shape].  
         *  If not overridden, defaults to [member mouse_default_cursor_shape].  
         */
        /* gdvirtual */ _getCursorShape(atPosition: Vector2): int64
        
        /** Return the description of the keyboard shortcuts and other contextual help for this control. */
        /* gdvirtual */ _accessibilityGetContextualInfo(): string
        
        /** Override this method to return a human-readable description of the position of the child [param node] in the custom container, added to the [member accessibility_name]. */
        /* gdvirtual */ _getAccessibilityContainerName(node: Node): string
        
        /** Virtual method to be implemented by the user. Override this method to handle and accept inputs on UI elements. See also [method accept_event].  
         *  **Example:** Click on the control to print a message:  
         *    
         *  If the [param event] inherits [InputEventMouse], this method will **not** be called when:  
         *  - the control's [member mouse_filter] is set to [constant MOUSE_FILTER_IGNORE];  
         *  - the control is obstructed by another control on top, that doesn't have [member mouse_filter] set to [constant MOUSE_FILTER_IGNORE];  
         *  - the control's parent has [member mouse_filter] set to [constant MOUSE_FILTER_STOP] or has accepted the event;  
         *  - the control's parent has [member clip_contents] enabled and the [param event]'s position is outside the parent's rectangle;  
         *  - the [param event]'s position is outside the control (see [method _has_point]).  
         *      
         *  **Note:** The [param event]'s position is relative to this control's origin.  
         */
        /* gdvirtual */ _guiInput(event: InputEvent): void
        
        /** Marks an input event as handled. Once you accept an input event, it stops propagating, even to nodes listening to [method Node._unhandled_input] or [method Node._unhandled_key_input].  
         *      
         *  **Note:** This does not affect the methods in [Input], only the way events are propagated.  
         */
        acceptEvent(): void
        
        /** Returns the maximum size for this control. See [member custom_maximum_size]. */
        getMaximumSize(): Vector2
        
        /** Returns the combined maximum size from [member custom_maximum_size] and [method get_maximum_size], as well as the [member custom_maximum_size] of this node's parent if it is a Control node with [member propagate_maximum_size] set to `true`. */
        getCombinedMaximumSize(): Vector2
        
        /** Returns the minimum size for this control. See [member custom_minimum_size]. */
        getMinimumSize(): Vector2
        
        /** Returns the combined minimum size from [member custom_minimum_size] and [method get_minimum_size]. */
        getCombinedMinimumSize(): Vector2
        
        /** Returns the bound value of [method get_combined_minimum_size] by [method get_combined_maximum_size].  
         *  This value is the true minimum size of the container, as the maximum size has priority over the minimum size.  
         *  For example, if the combined minimum size is (100, 100) and the combined maximum size is (50, 150), the bound minimum size will be (50, 100).  
         */
        getBoundMinimumSize(): Vector2
        
        /** Sets the anchors to a [param preset] from [enum Control.LayoutPreset] enum. This is the code equivalent to using the Layout menu in the 2D editor.  
         *  If [param keep_offsets] is `true`, control's position will also be updated.  
         */
        setAnchorsPreset(preset: Control.LayoutPreset, keepOffsets?: boolean /* = false */): void
        
        /** Sets the offsets to a [param preset] from [enum Control.LayoutPreset] enum. This is the code equivalent to using the Layout menu in the 2D editor.  
         *  Use parameter [param resize_mode] with constants from [enum Control.LayoutPresetMode] to better determine the resulting size of the [Control]. Constant size will be ignored if used with presets that change size, e.g. [constant PRESET_LEFT_WIDE].  
         *  Use parameter [param margin] to determine the gap between the [Control] and the edges.  
         */
        setOffsetsPreset(preset: Control.LayoutPreset, resizeMode?: Control.LayoutPresetMode /* = 0 */, margin?: int64 /* = 0 */): void
        
        /** Sets both anchor preset and offset preset. See [method set_anchors_preset] and [method set_offsets_preset]. */
        setAnchorsAndOffsetsPreset(preset: Control.LayoutPreset, resizeMode?: Control.LayoutPresetMode /* = 0 */, margin?: int64 /* = 0 */): void
        _setAnchor(side: Side, anchor: float64): void
        
        /** Sets the anchor for the specified [enum Side] to [param anchor]. A setter method for [member anchor_bottom], [member anchor_left], [member anchor_right] and [member anchor_top].  
         *  If [param keep_offset] is `true`, offsets aren't updated after this operation.  
         *  If [param push_opposite_anchor] is `true` and the opposite anchor overlaps this anchor, the opposite one will have its value overridden. For example, when setting left anchor to 1 and the right anchor has value of 0.5, the right anchor will also get value of 1. If [param push_opposite_anchor] was `false`, the left anchor would get value 0.5.  
         */
        setAnchor(side: Side, anchor: float64, keepOffset?: boolean /* = false */, pushOppositeAnchor?: boolean /* = true */): void
        
        /** Returns the anchor for the specified [enum Side]. A getter method for [member anchor_bottom], [member anchor_left], [member anchor_right] and [member anchor_top]. */
        getAnchor(side: Side): float64
        
        /** Sets the offset for the specified [enum Side] to [param offset]. A setter method for [member offset_bottom], [member offset_left], [member offset_right] and [member offset_top]. */
        setOffset(side: Side, offset: float64): void
        
        /** Returns the offset for the specified [enum Side]. A getter method for [member offset_bottom], [member offset_left], [member offset_right] and [member offset_top]. */
        getOffset(offset: Side): float64
        
        /** Works the same as [method set_anchor], but instead of `keep_offset` argument and automatic update of offset, it allows to set the offset yourself (see [method set_offset]). */
        setAnchorAndOffset(side: Side, anchor: float64, offset: float64, pushOppositeAnchor?: boolean /* = false */): void
        
        /** Sets [member offset_left] and [member offset_top] at the same time. Equivalent of changing [member position]. */
        setBegin(position: Vector2): void
        
        /** Sets [member offset_right] and [member offset_bottom] at the same time. */
        setEnd(position: Vector2): void
        
        /** Sets the [member position] to given [param position].  
         *  If [param keep_offsets] is `true`, control's anchors will be updated instead of offsets.  
         */
        setPosition(position: Vector2, keepOffsets?: boolean /* = false */): void
        
        /** Sets the size (see [member size]).  
         *  If [param keep_offsets] is `true`, control's anchors will be updated instead of offsets.  
         */
        setSize(size: Vector2, keepOffsets?: boolean /* = false */): void
        
        /** Resets the size to [method get_combined_minimum_size]. This is equivalent to calling `set_size(Vector2())` (or any size below the minimum). */
        resetSize(): void
        
        /** Sets the [member global_position] to given [param position].  
         *  If [param keep_offsets] is `true`, control's anchors will be updated instead of offsets.  
         */
        setGlobalPosition(position: Vector2, keepOffsets?: boolean /* = false */): void
        
        /** Returns [member offset_left] and [member offset_top]. See also [member position]. */
        getBegin(): Vector2
        
        /** Returns [member offset_right] and [member offset_bottom]. */
        getEnd(): Vector2
        
        /** Returns the combined value of [member pivot_offset] and [member pivot_offset_ratio], in pixels. The ratio is multiplied by the control's size. */
        getCombinedPivotOffset(): Vector2
        
        /** Returns the width/height occupied in the parent control. */
        getParentAreaSize(): Vector2
        
        /** Returns the position of this [Control] in global screen coordinates (i.e. taking window position into account). Mostly useful for editor plugins.  
         *  Equivalent to `get_screen_transform().origin` (see [method CanvasItem.get_screen_transform]).  
         *  **Example:** Show a popup at the mouse position:  
         *    
         */
        getScreenPosition(): Vector2
        
        /** Returns the position and size of the control in the coordinate system of the containing node. See [member position], [member scale] and [member size].  
         *      
         *  **Note:** If [member rotation] is not the default rotation, the resulting size is not meaningful.  
         *      
         *  **Note:** Setting [member Viewport.gui_snap_controls_to_pixels] to `true` can lead to rounding inaccuracies between the displayed control and the returned [Rect2].  
         */
        getRect(): Rect2
        
        /** Returns the position and size of the control relative to the containing canvas. See [member global_position] and [member size].  
         *      
         *  **Note:** If the node itself or any parent [CanvasItem] between the node and the canvas have a non default rotation or skew, the resulting size is likely not meaningful.  
         *      
         *  **Note:** Setting [member Viewport.gui_snap_controls_to_pixels] to `true` can lead to rounding inaccuracies between the displayed control and the returned [Rect2].  
         */
        getGlobalRect(): Rect2
        
        /** Returns the [member focus_mode], but takes the [member focus_behavior_recursive] into account. If [member focus_behavior_recursive] is set to [constant FOCUS_BEHAVIOR_DISABLED], or it is set to [constant FOCUS_BEHAVIOR_INHERITED] and its ancestor is set to [constant FOCUS_BEHAVIOR_DISABLED], then this returns [constant FOCUS_NONE]. */
        getFocusModeWithOverride(): Control.FocusMode
        
        /** Returns `true` if this is the current focused control. See [member focus_mode].  
         *  If [param ignore_hidden_focus] is `true`, controls that have their focus hidden will always return `false`. Hidden focus happens automatically when controls gain focus via mouse input, or manually using [method grab_focus] with `hide_focus` set to `true`.  
         */
        hasFocus(ignoreHiddenFocus?: boolean /* = false */): boolean
        
        /** Steal the focus from another control and become the focused control (see [member focus_mode]).  
         *  If [param hide_focus] is `true`, the control will not visually show its focused state. Has no effect for [LineEdit] and [TextEdit] when [member ProjectSettings.gui/common/show_focus_state_on_pointer_event] is set to `Text Input Controls`, or for any control when it is set to `Always`.  
         *      
         *  **Note:** Using this method together with [method Callable.call_deferred] makes it more reliable, especially when called inside [method Node._ready].  
         */
        grabFocus(hideFocus?: boolean /* = false */): void
        
        /** Give up the focus. No other control will be able to receive input. */
        releaseFocus(): void
        
        /** Finds the previous (above in the tree) [Control] that can receive the focus. */
        findPrevValidFocus(): null | Control
        
        /** Finds the next (below in the tree) [Control] that can receive the focus. */
        findNextValidFocus(): null | Control
        
        /** Finds the next [Control] that can receive the focus on the specified [enum Side].  
         *      
         *  **Note:** This is different from [method get_focus_neighbor], which returns the path of a specified focus neighbor.  
         */
        findValidFocusNeighbor(side: Side): null | Control
        
        /** Plays the sound from the [param stream] resource non-positionally in the bus specified by the [member ProjectSettings.audio/buses/gui_theme_bus] project setting. Typically, the [param stream] resource is obtained using [method get_theme_sound].  
         *      
         *  **Note:** This method should only be used to play UI-related sounds. It should not be used to play general game sounds, as it offers very limited control. Use the [AudioStreamPlayer], [AudioStreamPlayer2D], and [AudioStreamPlayer3D] nodes for general game audio instead.  
         */
        playThemeSound(stream: AudioStream): void
        
        /** Prevents `*_theme_*_override` methods from emitting [constant NOTIFICATION_THEME_CHANGED] until [method end_bulk_theme_override] is called. */
        beginBulkThemeOverride(): void
        
        /** Ends a bulk theme override update. See [method begin_bulk_theme_override]. */
        endBulkThemeOverride(): void
        
        /** Creates a local override for a theme icon with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_icon_override].  
         *  See also [method get_theme_icon].  
         */
        addThemeIconOverride(name: StringName, texture: Texture2D): void
        
        /** Creates a local override for a theme [StyleBox] with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_stylebox_override].  
         *  See also [method get_theme_stylebox].  
         *  **Example:** Modify a property in a [StyleBox] by duplicating it:  
         *    
         */
        addThemeStyleboxOverride(name: StringName, stylebox: StyleBox): void
        
        /** Creates a local override for a theme [Font] with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_font_override].  
         *  See also [method get_theme_font].  
         */
        addThemeFontOverride(name: StringName, font: Font): void
        
        /** Creates a local override for a theme font size with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_font_size_override].  
         *  See also [method get_theme_font_size].  
         */
        addThemeFontSizeOverride(name: StringName, fontSize: int64): void
        
        /** Creates a local override for a theme [Color] with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_color_override].  
         *  See also [method get_theme_color].  
         *  **Example:** Override a [Label]'s color and reset it later:  
         *    
         */
        addThemeColorOverride(name: StringName, color: Color): void
        
        /** Creates a local override for a theme constant with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_constant_override].  
         *  See also [method get_theme_constant].  
         */
        addThemeConstantOverride(name: StringName, constant: int64): void
        
        /** Creates a local override for a theme sound with the specified [param name]. Local overrides always take precedence when fetching theme items for the control. An override can be removed with [method remove_theme_sound_override].  
         *  See also [method get_theme_sound].  
         */
        addThemeSoundOverride(name: StringName, audio: AudioStream): void
        
        /** Removes a local override for a theme icon with the specified [param name] previously added by [method add_theme_icon_override] or via the Inspector dock. */
        removeThemeIconOverride(name: StringName): void
        
        /** Removes a local override for a theme [StyleBox] with the specified [param name] previously added by [method add_theme_stylebox_override] or via the Inspector dock. */
        removeThemeStyleboxOverride(name: StringName): void
        
        /** Removes a local override for a theme [Font] with the specified [param name] previously added by [method add_theme_font_override] or via the Inspector dock. */
        removeThemeFontOverride(name: StringName): void
        
        /** Removes a local override for a theme font size with the specified [param name] previously added by [method add_theme_font_size_override] or via the Inspector dock. */
        removeThemeFontSizeOverride(name: StringName): void
        
        /** Removes a local override for a theme [Color] with the specified [param name] previously added by [method add_theme_color_override] or via the Inspector dock. */
        removeThemeColorOverride(name: StringName): void
        
        /** Removes a local override for a theme constant with the specified [param name] previously added by [method add_theme_constant_override] or via the Inspector dock. */
        removeThemeConstantOverride(name: StringName): void
        
        /** Removes a local override for a theme sound with the specified [param name] previously added by [method add_theme_sound_override] or via the Inspector dock. */
        removeThemeSoundOverride(name: StringName): void
        
        /** Returns an icon from the first matching [Theme] in the tree if that [Theme] has an icon item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeIcon(name: StringName, themeType?: StringName /* = '' */): null | Texture2D
        
        /** Returns a [StyleBox] from the first matching [Theme] in the tree if that [Theme] has a stylebox item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeStylebox(name: StringName, themeType?: StringName /* = '' */): null | StyleBox
        
        /** Returns a [Font] from the first matching [Theme] in the tree if that [Theme] has a font item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeFont(name: StringName, themeType?: StringName /* = '' */): null | Font
        
        /** Returns a font size from the first matching [Theme] in the tree if that [Theme] has a font size item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeFontSize(name: StringName, themeType?: StringName /* = '' */): int64
        
        /** Returns a [Color] from the first matching [Theme] in the tree if that [Theme] has a color item with the specified [param name] and [param theme_type]. If [param theme_type] is omitted the class name of the current control is used as the type, or [member theme_type_variation] if it is defined. If the type is a class name its parent classes are also checked, in order of inheritance. If the type is a variation its base types are checked, in order of dependency, then the control's class name and its parent classes are checked.  
         *  For the current control its local overrides are considered first (see [method add_theme_color_override]), then its assigned [member theme]. After the current control, each parent control and its assigned [member theme] are considered; controls without a [member theme] assigned are skipped. If no matching [Theme] is found in the tree, the custom project [Theme] (see [member ProjectSettings.gui/theme/custom]) and the default [Theme] are used (see [ThemeDB]).  
         *    
         */
        getThemeColor(name: StringName, themeType?: StringName /* = '' */): Color
        
        /** Returns a constant from the first matching [Theme] in the tree if that [Theme] has a constant item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeConstant(name: StringName, themeType?: StringName /* = '' */): int64
        
        /** Returns a sound from the first matching [Theme] in the tree if that [Theme] has a sound item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        getThemeSound(name: StringName, themeType?: StringName /* = '' */): null | AudioStream
        
        /** Returns `true` if there is a local override for a theme icon with the specified [param name] in this [Control] node.  
         *  See [method add_theme_icon_override].  
         */
        hasThemeIconOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme [StyleBox] with the specified [param name] in this [Control] node.  
         *  See [method add_theme_stylebox_override].  
         */
        hasThemeStyleboxOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme [Font] with the specified [param name] in this [Control] node.  
         *  See [method add_theme_font_override].  
         */
        hasThemeFontOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme font size with the specified [param name] in this [Control] node.  
         *  See [method add_theme_font_size_override].  
         */
        hasThemeFontSizeOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme [Color] with the specified [param name] in this [Control] node.  
         *  See [method add_theme_color_override].  
         */
        hasThemeColorOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme constant with the specified [param name] in this [Control] node.  
         *  See [method add_theme_constant_override].  
         */
        hasThemeConstantOverride(name: StringName): boolean
        
        /** Returns `true` if there is a local override for a theme sound with the specified [param name] in this [Control] node.  
         *  See [method add_theme_sound_override].  
         */
        hasThemeSoundOverride(name: StringName): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has an icon item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeIcon(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a stylebox item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeStylebox(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a font item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeFont(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a font size item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeFontSize(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a color item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeColor(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a constant item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeConstant(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns `true` if there is a matching [Theme] in the tree that has a sound item with the specified [param name] and [param theme_type].  
         *  See [method get_theme_color] for details.  
         */
        hasThemeSound(name: StringName, themeType?: StringName /* = '' */): boolean
        
        /** Returns the default base scale value from the first matching [Theme] in the tree if that [Theme] has a valid [member Theme.default_base_scale] value.  
         *  See [method get_theme_color] for details.  
         */
        getThemeDefaultBaseScale(): float64
        
        /** Returns the default font from the first matching [Theme] in the tree if that [Theme] has a valid [member Theme.default_font] value.  
         *  See [method get_theme_color] for details.  
         */
        getThemeDefaultFont(): null | Font
        
        /** Returns the default font size value from the first matching [Theme] in the tree if that [Theme] has a valid [member Theme.default_font_size] value.  
         *  See [method get_theme_color] for details.  
         */
        getThemeDefaultFontSize(): int64
        
        /** Returns the parent control node. */
        getParentControl(): null | Control
        
        /** Returns the tooltip text for the position [param at_position] in the control's local coordinates, which will typically appear when the cursor is resting over this control. By default, it returns [member tooltip_text].  
         *  You can override [method _get_tooltip] to implement custom behavior for this method.  
         *      
         *  **Note:** If this method returns an empty [String] and [method _make_custom_tooltip] is not overridden, no tooltip is displayed.  
         */
        getTooltip(atPosition?: Vector2 /* = Vector2.ZERO */): string
        
        /** Returns the mouse cursor shape for this control when hovered over [param at_position] in local coordinates. For most controls, this is the same as [member mouse_default_cursor_shape], but some built-in controls implement more complex logic.  
         *  You can override [method _get_cursor_shape] to implement custom behavior for this method.  
         */
        getCursorShape(atPosition?: Vector2 /* = Vector2.ZERO */): Control.CursorShape
        
        /** Sets the focus neighbor for the specified [enum Side] to the [Control] at [param neighbor] node path. A setter method for [member focus_neighbor_bottom], [member focus_neighbor_left], [member focus_neighbor_right] and [member focus_neighbor_top]. */
        setFocusNeighbor(side: Side, neighbor: NodePath | string): void
        
        /** Returns the focus neighbor for the specified [enum Side]. A getter method for [member focus_neighbor_bottom], [member focus_neighbor_left], [member focus_neighbor_right] and [member focus_neighbor_top].  
         *      
         *  **Note:** To find the next [Control] on the specific [enum Side], even if a neighbor is not assigned, use [method find_valid_focus_neighbor].  
         */
        getFocusNeighbor(side: Side): NodePath
        
        /** Forces drag and bypasses [method _get_drag_data] and [method set_drag_preview] by passing [param data] and [param preview]. Drag will start even if the mouse is neither over nor pressed on this control.  
         *  The methods [method _can_drop_data] and [method _drop_data] must be implemented on controls that want to receive drop data.  
         */
        forceDrag(data: any, preview: Control): void
        
        /** Starts drag-and-drop operation without using a mouse. */
        accessibilityDrag(): void
        
        /** Ends drag-and-drop operation without using a mouse. */
        accessibilityDrop(): void
        
        /** Returns the [member mouse_filter], but takes the [member mouse_behavior_recursive] into account. If [member mouse_behavior_recursive] is set to [constant MOUSE_BEHAVIOR_DISABLED], or it is set to [constant MOUSE_BEHAVIOR_INHERITED] and its ancestor is set to [constant MOUSE_BEHAVIOR_DISABLED], then this returns [constant MOUSE_FILTER_IGNORE]. */
        getMouseFilterWithOverride(): Control.MouseFilter
        
        /** Creates an [InputEventMouseButton] that attempts to click the control. If the event is received, the control gains focus.  
         *    
         */
        grabClickFocus(): void
        
        /** Sets the given callables to be used instead of the control's own drag-and-drop virtual methods. If a callable is empty, its respective virtual method is used as normal.  
         *  The arguments for each callable should be exactly the same as their respective virtual methods, which would be:  
         *  - [param drag_func] corresponds to [method _get_drag_data] and requires a [Vector2];  
         *  - [param can_drop_func] corresponds to [method _can_drop_data] and requires both a [Vector2] and a [Variant];  
         *  - [param drop_func] corresponds to [method _drop_data] and requires both a [Vector2] and a [Variant].  
         */
        setDragForwarding(dragFunc: Callable, canDropFunc: Callable, dropFunc: Callable): void
        
        /** Shows the given control at the mouse pointer. A good time to call this method is in [method _get_drag_data]. The control must not be in the scene tree. You should not free the control, and you should not keep a reference to the control beyond the duration of the drag. It will be deleted automatically after the drag has ended.  
         *    
         */
        setDragPreview(control: Control): void
        
        /** Returns `true` if a drag operation is successful. Alternative to [method Viewport.gui_is_drag_successful].  
         *  Best used with [constant Node.NOTIFICATION_DRAG_END].  
         */
        isDragSuccessful(): boolean
        
        /** Moves the mouse cursor to [param position], relative to [member position] of this [Control].  
         *      
         *  **Note:** [method warp_mouse] is only supported on Windows, macOS and Linux. It has no effect on Android, iOS and Web.  
         */
        warpMouse(position: Vector2): void
        
        /** Invalidates the maximum size cache in this node and in child nodes with [member CanvasItem.top_level] set to `false`. Intended to be used with [method get_maximum_size] when the return value is changed. Setting [member custom_maximum_size] directly calls this method automatically.  
         *      
         *  **Note:** Calling this method also calls [method update_minimum_size] since the combined minimum size may be affected by the maximum size change.  
         */
        updateMaximumSize(): void
        
        /** Invalidates the minimum size cache in this node and in parent nodes up to top level. Intended to be used with [method get_minimum_size] when the return value is changed. Setting [member custom_minimum_size] directly calls this method automatically. */
        updateMinimumSize(): void
        
        /** Returns `true` if the layout is right-to-left. See also [member layout_direction]. */
        isLayoutRtl(): boolean
        
        /** The minimum size of the node's bounding rectangle. If you set it to a value greater than `(0, 0)`, the node's bounding rectangle will always have at least this size. Note that [Control] nodes have their internal minimum size returned by [method get_minimum_size]. It depends on the control's contents, like text, textures, or style boxes. The actual minimum size is the maximum value of this property and the internal minimum size (see [method get_combined_minimum_size]).  
         *      
         *  **Note:** [member custom_maximum_size] has priority over this property. For example, if you set [member custom_minimum_size] to `(200, 200)` and [member custom_maximum_size] to `(100, 100)`, the resulting size will be `(100, 100)`.  
         */
        get customMinimumSize(): Vector2
        set customMinimumSize(value: Vector2)
        
        /** The maximum size of the node's bounding rectangle. If set to a value greater than or equal to `(0, 0)`, the node's bounding rectangle will never exceed this size. A value below `(0, 0)` means there is no maximum size. This value has priority over [member custom_minimum_size] if the two conflict.  
         *      
         *  **Note:** The final effective maximum size may be subject to the parent's maximum size (via [member propagate_maximum_size]), so it is recommended to use [method get_combined_maximum_size] instead of [method get_maximum_size]. Likewise, use [method get_bound_minimum_size] instead of [method get_combined_minimum_size] to account for the maximum size.  
         *      
         *  **Note:** Not all [Control] subtypes handle this gracefully, and their contents may extend beyond the bounding rectangle. Set [member clip_contents] to `true` to prevent child controls from rendering outside of this size, especially when this node is a [Container].  
         */
        get customMaximumSize(): Vector2
        set customMaximumSize(value: Vector2)
        
        /** If `true`, this Control's children will use the value returned by [method get_combined_maximum_size] in their own size calculations. */
        get propagateMaximumSize(): boolean
        set propagateMaximumSize(value: boolean)
        
        /** Enables whether rendering of [CanvasItem] based children should be clipped to this control's rectangle. If `true`, parts of a child which would be visibly outside of this control's rectangle will not be rendered and won't receive input. */
        get clipContents(): boolean
        set clipContents(value: boolean)
        get layoutMode(): int64
        set layoutMode(value: int64)
        get anchorsPreset(): int64
        set anchorsPreset(value: int64)
        
        /** Anchors the left edge of the node to the origin, the center or the end of its parent control. It changes how the left offset updates when the node moves or changes size. You can use one of the [enum Anchor] constants for convenience. */
        get anchorLeft(): float64
        set anchorLeft(value: float64)
        
        /** Anchors the top edge of the node to the origin, the center or the end of its parent control. It changes how the top offset updates when the node moves or changes size. You can use one of the [enum Anchor] constants for convenience. */
        get anchorTop(): float64
        set anchorTop(value: float64)
        
        /** Anchors the right edge of the node to the origin, the center or the end of its parent control. It changes how the right offset updates when the node moves or changes size. You can use one of the [enum Anchor] constants for convenience. */
        get anchorRight(): float64
        set anchorRight(value: float64)
        
        /** Anchors the bottom edge of the node to the origin, the center, or the end of its parent control. It changes how the bottom offset updates when the node moves or changes size. You can use one of the [enum Anchor] constants for convenience. */
        get anchorBottom(): float64
        set anchorBottom(value: float64)
        
        /** Distance between the node's left edge and its parent control, based on [member anchor_left].  
         *  Offsets are often controlled by one or multiple parent [Container] nodes, so you should not modify them manually if your node is a direct child of a [Container]. Offsets update automatically when you move or resize the node.  
         */
        get offsetLeft(): float64
        set offsetLeft(value: float64)
        
        /** Distance between the node's top edge and its parent control, based on [member anchor_top].  
         *  Offsets are often controlled by one or multiple parent [Container] nodes, so you should not modify them manually if your node is a direct child of a [Container]. Offsets update automatically when you move or resize the node.  
         */
        get offsetTop(): float64
        set offsetTop(value: float64)
        
        /** Distance between the node's right edge and its parent control, based on [member anchor_right].  
         *  Offsets are often controlled by one or multiple parent [Container] nodes, so you should not modify them manually if your node is a direct child of a [Container]. Offsets update automatically when you move or resize the node.  
         */
        get offsetRight(): float64
        set offsetRight(value: float64)
        
        /** Distance between the node's bottom edge and its parent control, based on [member anchor_bottom].  
         *  Offsets are often controlled by one or multiple parent [Container] nodes, so you should not modify them manually if your node is a direct child of a [Container]. Offsets update automatically when you move or resize the node.  
         */
        get offsetBottom(): float64
        set offsetBottom(value: float64)
        
        /** Controls the direction on the horizontal axis in which the control should grow or shrink if its horizontal size is changed. */
        get growHorizontal(): int64
        set growHorizontal(value: int64)
        
        /** Controls the direction on the vertical axis in which the control should grow or shrink if its vertical size is changed. */
        get growVertical(): int64
        set growVertical(value: int64)
        
        /** The size of the node's bounding rectangle, in the node's coordinate system. [Container] nodes update this property automatically. */
        get size(): Vector2
        set size(value: Vector2)
        
        /** The node's position, relative to its containing node. It corresponds to the rectangle's top-left corner. The property is not affected by [member pivot_offset]. */
        get position(): Vector2
        set position(value: Vector2)
        
        /** The node's global position, relative to the world (usually to the [CanvasLayer]). */
        get globalPosition(): Vector2
        set globalPosition(value: Vector2)
        
        /** The node's rotation around its pivot, in radians. See [member pivot_offset] to change the pivot's position.  
         *      
         *  **Note:** This property is edited in the inspector in degrees. If you want to use degrees in a script, use [member rotation_degrees].  
         */
        get rotation(): float64
        set rotation(value: float64)
        
        /** Helper property to access [member rotation] in degrees instead of radians. */
        get rotationDegrees(): float64
        set rotationDegrees(value: float64)
        
        /** The node's scale, relative to its [member size]. Change this property to scale the node around its [member pivot_offset]. The Control's tooltip will also scale according to this value.  
         *      
         *  **Note:** This property is mainly intended to be used for animation purposes. To support multiple resolutions in your project, use an appropriate viewport stretch mode as described in the [url=https://docs.godotengine.org/en/latest/tutorials/rendering/multiple_resolutions.html]documentation[/url] instead of scaling Controls individually.  
         *      
         *  **Note:** [member FontFile.oversampling] does  *not*  take [Control] [member scale] into account. This means that scaling up/down will cause bitmap fonts and rasterized (non-MSDF) dynamic fonts to appear blurry or pixelated. To ensure text remains crisp regardless of scale, you can enable MSDF font rendering by enabling [member ProjectSettings.gui/theme/default_font_multichannel_signed_distance_field] (applies to the default project font only), or enabling **Multichannel Signed Distance Field** in the import options of a DynamicFont for custom fonts. On system fonts, [member SystemFont.multichannel_signed_distance_field] can be enabled in the inspector.  
         *      
         *  **Note:** If the Control node is a child of a [Container] node, the scale will be reset to `Vector2(1, 1)` when the scene is instantiated. To set the Control's scale when it's instantiated, wait for one frame using `await get_tree().process_frame` then set its [member scale] property.  
         */
        get scale(): Vector2
        set scale(value: Vector2)
        
        /** By default, the node's pivot is its top-left corner. When you change its [member rotation] or [member scale], it will rotate or scale around this pivot.  
         *  The actual offset is the combined value of this property and [member pivot_offset_ratio].  
         */
        get pivotOffset(): Vector2
        set pivotOffset(value: Vector2)
        
        /** Same as [member pivot_offset], but expressed as uniform vector, where `Vector2(0, 0)` is the top-left corner of this control, and `Vector2(1, 1)` is its bottom-right corner. Set this property to `Vector2(0.5, 0.5)` to pivot around this control's center.  
         *  The actual offset is the combined value of this property and [member pivot_offset].  
         */
        get pivotOffsetRatio(): Vector2
        set pivotOffsetRatio(value: Vector2)
        
        /** Tells the parent [Container] nodes how they should resize and place the node on the X axis. Use a combination of the [enum SizeFlags] constants to change the flags. See the constants to learn what each does. */
        get sizeFlagsHorizontal(): int64
        set sizeFlagsHorizontal(value: int64)
        
        /** Tells the parent [Container] nodes how they should resize and place the node on the Y axis. Use a combination of the [enum SizeFlags] constants to change the flags. See the constants to learn what each does. */
        get sizeFlagsVertical(): int64
        set sizeFlagsVertical(value: int64)
        
        /** If the node and at least one of its neighbors uses the [constant SIZE_EXPAND] size flag, the parent [Container] will let it take more or less space depending on this property. If this node has a stretch ratio of 2 and its neighbor a ratio of 1, this node will take two thirds of the available space. */
        get sizeFlagsStretchRatio(): float64
        set sizeFlagsStretchRatio(value: float64)
        
        /** If `true`, applies all offset transform properties. Otherwise, no offset transform is applied and the properties have no effect. */
        get offsetTransformEnabled(): boolean
        set offsetTransformEnabled(value: boolean)
        
        /** Position offset in absolute units. The final offset is the combined value of this property and [member offset_transform_position_ratio].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformPosition(): Vector2
        set offsetTransformPosition(value: Vector2)
        
        /** Same as [member offset_transform_position] but expressed in units relative to the [Control] [member size] where `Vector2(0, 0)` is the top-left corner of this control, and `Vector2(1, 1)` is its bottom-right corner.  
         *  The final offset is the combined value of this property and [member offset_transform_position].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformPositionRatio(): Vector2
        set offsetTransformPositionRatio(value: Vector2)
        
        /** Scale offset. The scale pivot is defined by [member offset_transform_pivot] and [member offset_transform_pivot_ratio].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformScale(): Vector2
        set offsetTransformScale(value: Vector2)
        
        /** Rotation offset. The rotation pivot is defined by [member offset_transform_pivot] and [member offset_transform_pivot_ratio].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformRotation(): float64
        set offsetTransformRotation(value: float64)
        
        /** Pivot used by [member offset_transform_rotation] and [member offset_transform_scale] in absolute units.  
         *  The final pivot position is the combined value of this property and [member offset_transform_pivot_ratio].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformPivot(): Vector2
        set offsetTransformPivot(value: Vector2)
        
        /** Same as [member offset_transform_pivot] but expressed in units relative to the [Control] [member size] where `Vector2(0, 0)` is the top-left corner of this control, and `Vector2(1, 1)` is its bottom-right corner.  
         *  The final pivot position is the combined value of this property and [member offset_transform_pivot].  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformPivotRatio(): Vector2
        set offsetTransformPivotRatio(value: Vector2)
        
        /** If `true`, the offset transforms is only applied visually and does not affect input. In other words, this Control will still receive input events at its original location before the offset transform is applied.  
         *  If `false`, the entire transform of this Control is affected and input events will register where the Control is visually.  
         *  Has no effect unless [member offset_transform_enabled] is `true`.  
         */
        get offsetTransformVisualOnly(): boolean
        set offsetTransformVisualOnly(value: boolean)
        
        /** If `true`, automatically converts code line numbers, list indices, [SpinBox] and [ProgressBar] values from the Western Arabic (0..9) to the numeral systems used in current locale.  
         *      
         *  **Note:** Numbers within the text are not automatically converted, it can be done manually, using [method TextServer.format_number].  
         */
        get localizeNumeralSystem(): boolean
        set localizeNumeralSystem(value: boolean)
        
        /** Controls layout direction and text writing direction. Right-to-left layouts are necessary for certain languages (e.g. Arabic and Hebrew). See also [method is_layout_rtl]. */
        get layoutDirection(): int64
        set layoutDirection(value: int64)
        
        /** The translation context used when translating this control's displayed text, if it has any. Also used when generating translation templates. */
        get translationContext(): StringName
        set translationContext(value: StringName)
        
        /** Toggles if any text should automatically change to its translated version depending on the current locale. */
        get autoTranslate(): boolean
        set autoTranslate(value: boolean)
        
        /** The default tooltip text. The tooltip appears when the user's mouse cursor stays idle over this control for a few moments, provided that the [member mouse_filter] property is not [constant MOUSE_FILTER_IGNORE]. The time required for the tooltip to appear can be changed with the [member ProjectSettings.gui/timers/tooltip_delay_sec] setting.  
         *  This string is the default return value of [method get_tooltip]. Override [method _get_tooltip] to generate tooltip text dynamically. Override [method _make_custom_tooltip] to customize the tooltip interface and behavior.  
         *  The tooltip popup will use either a default implementation, or a custom one that you can provide by overriding [method _make_custom_tooltip]. The default tooltip includes a [PopupPanel] and [Label] whose theme properties can be customized using [Theme] methods with the `"TooltipPanel"` and `"TooltipLabel"` respectively. For example:  
         *    
         */
        get tooltipText(): string
        set tooltipText(value: string)
        
        /** Defines if tooltip text should automatically change to its translated version depending on the current locale. Uses the same auto translate mode as this control when set to [constant Node.AUTO_TRANSLATE_MODE_INHERIT].  
         *      
         *  **Note:** Tooltips customized using [method _make_custom_tooltip] do not use this auto translate mode automatically.  
         */
        get tooltipAutoTranslateMode(): int64
        set tooltipAutoTranslateMode(value: int64)
        
        /** Tells Godot which node it should give focus to if the user presses the left arrow on the keyboard or left on a gamepad by default. You can change the key by editing the [member ProjectSettings.input/ui_left] input action. The node must be a [Control]. If this property is not set, Godot will give focus to the closest [Control] to the left of this one. */
        get focusNeighborLeft(): NodePath
        set focusNeighborLeft(value: NodePath | string)
        
        /** Tells Godot which node it should give focus to if the user presses the top arrow on the keyboard or top on a gamepad by default. You can change the key by editing the [member ProjectSettings.input/ui_up] input action. The node must be a [Control]. If this property is not set, Godot will give focus to the closest [Control] to the top of this one. */
        get focusNeighborTop(): NodePath
        set focusNeighborTop(value: NodePath | string)
        
        /** Tells Godot which node it should give focus to if the user presses the right arrow on the keyboard or right on a gamepad by default. You can change the key by editing the [member ProjectSettings.input/ui_right] input action. The node must be a [Control]. If this property is not set, Godot will give focus to the closest [Control] to the right of this one. */
        get focusNeighborRight(): NodePath
        set focusNeighborRight(value: NodePath | string)
        
        /** Tells Godot which node it should give focus to if the user presses the down arrow on the keyboard or down on a gamepad by default. You can change the key by editing the [member ProjectSettings.input/ui_down] input action. The node must be a [Control]. If this property is not set, Godot will give focus to the closest [Control] to the bottom of this one. */
        get focusNeighborBottom(): NodePath
        set focusNeighborBottom(value: NodePath | string)
        
        /** Tells Godot which node it should give focus to if the user presses [kbd]Tab[/kbd] on a keyboard by default. You can change the key by editing the [member ProjectSettings.input/ui_focus_next] input action.  
         *  If this property is not set, Godot will select a "best guess" based on surrounding nodes in the scene tree.  
         */
        get focusNext(): NodePath
        set focusNext(value: NodePath | string)
        
        /** Tells Godot which node it should give focus to if the user presses [kbd]Shift + Tab[/kbd] on a keyboard by default. You can change the key by editing the [member ProjectSettings.input/ui_focus_prev] input action.  
         *  If this property is not set, Godot will select a "best guess" based on surrounding nodes in the scene tree.  
         */
        get focusPrevious(): NodePath
        set focusPrevious(value: NodePath | string)
        
        /** Determines which controls can be focused. Only one control can be focused at a time, and the focused control will receive keyboard, gamepad, and mouse events in [method _gui_input]. Use [method get_focus_mode_with_override] to determine if a control can grab focus, since [member focus_behavior_recursive] also affects it. See also [method grab_focus]. */
        get focusMode(): int64
        set focusMode(value: int64)
        
        /** Determines which controls can be focused together with [member focus_mode]. See [method get_focus_mode_with_override]. Since the default behavior is [constant FOCUS_BEHAVIOR_INHERITED], this can be used to prevent all children controls from getting focused. */
        get focusBehaviorRecursive(): int64
        set focusBehaviorRecursive(value: int64)
        
        /** Determines which controls will be able to receive mouse button input events through [method _gui_input] and the [signal mouse_entered], and [signal mouse_exited] signals. Also determines how these events should be propagated. See the constants to learn what each does. Use [method get_mouse_filter_with_override] to determine if a control can receive mouse input, since [member mouse_behavior_recursive] also affects it. */
        get mouseFilter(): int64
        set mouseFilter(value: int64)
        
        /** Determines which controls can receive mouse input together with [member mouse_filter]. See [method get_mouse_filter_with_override]. Since the default behavior is [constant MOUSE_BEHAVIOR_INHERITED], this can be used to prevent all children controls from receiving mouse input. */
        get mouseBehaviorRecursive(): int64
        set mouseBehaviorRecursive(value: int64)
        
        /** When enabled, scroll wheel events processed by [method _gui_input] will be passed to the parent control even if [member mouse_filter] is set to [constant MOUSE_FILTER_STOP].  
         *  You should disable it on the root of your UI if you do not want scroll events to go to the [method Node._unhandled_input] processing.  
         *      
         *  **Note:** Because this property defaults to `true`, this allows nested scrollable containers to work out of the box.  
         */
        get mouseForcePassScrollEvents(): boolean
        set mouseForcePassScrollEvents(value: boolean)
        
        /** The default cursor shape for this control. Useful for Godot plugins and applications or games that use the system's mouse cursors.  
         *      
         *  **Note:** On Linux, shapes may vary depending on the cursor theme of the system.  
         */
        get mouseDefaultCursorShape(): int64
        set mouseDefaultCursorShape(value: int64)
        
        /** The [Node] which must be a parent of the focused [Control] for the shortcut to be activated. If `null`, the shortcut can be activated when any control is focused (a global shortcut). This allows shortcuts to be accepted only when the user has a certain area of the GUI focused. */
        get shortcutContext(): null | GObject
        set shortcutContext(value: null | GObject)
        
        /** The human-readable node name that is reported to assistive apps. */
        get accessibilityName(): string
        set accessibilityName(value: string)
        
        /** The human-readable node description that is reported to assistive apps. */
        get accessibilityDescription(): string
        set accessibilityDescription(value: string)
        
        /** The mode with which a live region updates. A live region is a [Node] that is updated as a result of an external event when the user's focus may be elsewhere. */
        get accessibilityLive(): int64
        set accessibilityLive(value: int64)
        
        /** The paths to the nodes which are controlled by this node. */
        get accessibilityControlsNodes(): GArray<NodePath>
        set accessibilityControlsNodes(value: GArray<NodePath>)
        
        /** The paths to the nodes which are describing this node. */
        get accessibilityDescribedByNodes(): GArray<NodePath>
        set accessibilityDescribedByNodes(value: GArray<NodePath>)
        
        /** The paths to the nodes which label this node. */
        get accessibilityLabeledByNodes(): GArray<NodePath>
        set accessibilityLabeledByNodes(value: GArray<NodePath>)
        
        /** The paths to the nodes which this node flows into. */
        get accessibilityFlowToNodes(): GArray<NodePath>
        set accessibilityFlowToNodes(value: GArray<NodePath>)
        
        /** The [Theme] resource this node and all its [Control] and [Window] children use. If a child node has its own [Theme] resource set, theme items are merged with child's definitions having higher priority.  
         *      
         *  **Note:** [Window] styles will have no effect unless the window is embedded.  
         */
        get theme(): null | Theme
        set theme(value: null | Theme)
        
        /** The name of a theme type variation used by this [Control] to look up its own theme items. When empty, the class name of the node is used (e.g. [code skip-lint]Button` for the [Button] control), as well as the class names of all parent classes (in order of inheritance).  
         *  When set, this property gives the highest priority to the type of the specified name. This type can in turn extend another type, forming a dependency chain. See [method Theme.set_type_variation]. If the theme item cannot be found using this type or its base types, lookup falls back on the class names.  
         *      
         *  **Note:** To look up [Control]'s own items use various `get_theme_*` methods without specifying `theme_type`.  
         *      
         *  **Note:** Theme items are looked for in the tree order, from branch to root, where each [Control] node is checked for its [member theme] property. The earliest match against any type/class name is returned. The project-level Theme and the default Theme are checked last.  
         */
        get themeTypeVariation(): string
        set themeTypeVariation(value: string)
        
        /** Emitted when the control changes size. */
        readonly resized: Signal<() => void>
        readonly _layoutPendingFinished: Signal<() => void>
        
        /** Emitted when the node receives an [InputEvent]. */
        readonly guiInput: Signal<(event: InputEvent) => void>
        
        /** Emitted when the mouse cursor enters the control's (or any child control's) visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect, which Control receives the signal.  
         */
        readonly mouseEntered: Signal<() => void>
        
        /** Emitted when the mouse cursor leaves the control's (and all child control's) visible area, that is not occluded behind other Controls or Windows, provided its [member mouse_filter] lets the event reach it and regardless if it's currently focused or not.  
         *      
         *  **Note:** [member CanvasItem.z_index] doesn't affect, which Control receives the signal.  
         *      
         *  **Note:** If you want to check whether the mouse truly left the area, ignoring any top nodes, you can use code like this:  
         *    
         */
        readonly mouseExited: Signal<() => void>
        
        /** Emitted when the node gains focus. */
        readonly focusEntered: Signal<() => void>
        
        /** Emitted when the node loses focus. */
        readonly focusExited: Signal<() => void>
        
        /** Emitted when one of the size flags changes. See [member size_flags_horizontal] and [member size_flags_vertical]. */
        readonly sizeFlagsChanged: Signal<() => void>
        
        /** Emitted when the node's maximum size changes. */
        readonly maximumSizeChanged: Signal<() => void>
        
        /** Emitted when the node's minimum size changes. */
        readonly minimumSizeChanged: Signal<() => void>
        readonly _desiredSizeChanged: Signal<() => void>
        
        /** Emitted when the [constant NOTIFICATION_THEME_CHANGED] notification is sent. */
        readonly themeChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapControl;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapControl;
    }
    namespace ConvertTransformModifier3D {
        enum TransformMode {
            TransformModePosition = 0,
            TransformModeRotation = 1,
            TransformModeScale = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConvertTransformModifier3D extends __RPCMapBoneConstraint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConvertTransformModifier3D extends __NameMapBoneConstraint3D {
        set_apply_transform_mode: "setApplyTransformMode";
        get_apply_transform_mode: "getApplyTransformMode";
        set_apply_axis: "setApplyAxis";
        get_apply_axis: "getApplyAxis";
        set_apply_range_min: "setApplyRangeMin";
        get_apply_range_min: "getApplyRangeMin";
        set_apply_range_max: "setApplyRangeMax";
        get_apply_range_max: "getApplyRangeMax";
        set_reference_transform_mode: "setReferenceTransformMode";
        get_reference_transform_mode: "getReferenceTransformMode";
        set_reference_axis: "setReferenceAxis";
        get_reference_axis: "getReferenceAxis";
        set_reference_range_min: "setReferenceRangeMin";
        get_reference_range_min: "getReferenceRangeMin";
        set_reference_range_max: "setReferenceRangeMax";
        get_reference_range_max: "getReferenceRangeMax";
        set_global: "setGlobal";
        is_global: "isGlobal";
        set_relative: "setRelative";
        is_relative: "isRelative";
        set_additive: "setAdditive";
        is_additive: "isAdditive";
        setting_count: "settingCount";
    }
    /** A [SkeletonModifier3D] that apply transform to the bone which converted from reference.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_converttransformmodifier3d.html  
     */
    class ConvertTransformModifier3D<Map extends NodePathMap = any> extends BoneConstraint3D<Map> {
        constructor(identifier?: any)
        /** Sets the operation of the remapping destination transform. */
        setApplyTransformMode(index: int64, transformMode: ConvertTransformModifier3D.TransformMode): void
        
        /** Returns the operation of the remapping destination transform. */
        getApplyTransformMode(index: int64): ConvertTransformModifier3D.TransformMode
        
        /** Sets the axis of the remapping destination transform. */
        setApplyAxis(index: int64, axis: Vector3.Axis): void
        
        /** Returns the axis of the remapping destination transform. */
        getApplyAxis(index: int64): Vector3.Axis
        
        /** Sets the minimum value of the remapping destination range. */
        setApplyRangeMin(index: int64, rangeMin: float64): void
        
        /** Returns the minimum value of the remapping destination range. */
        getApplyRangeMin(index: int64): float64
        
        /** Sets the maximum value of the remapping destination range. */
        setApplyRangeMax(index: int64, rangeMax: float64): void
        
        /** Returns the maximum value of the remapping destination range. */
        getApplyRangeMax(index: int64): float64
        
        /** Sets the operation of the remapping source transform. */
        setReferenceTransformMode(index: int64, transformMode: ConvertTransformModifier3D.TransformMode): void
        
        /** Returns the operation of the remapping source transform. */
        getReferenceTransformMode(index: int64): ConvertTransformModifier3D.TransformMode
        
        /** Sets the axis of the remapping source transform. */
        setReferenceAxis(index: int64, axis: Vector3.Axis): void
        
        /** Returns the axis of the remapping source transform. */
        getReferenceAxis(index: int64): Vector3.Axis
        
        /** Sets the minimum value of the remapping source range. */
        setReferenceRangeMin(index: int64, rangeMin: float64): void
        
        /** Returns the minimum value of the remapping source range. */
        getReferenceRangeMin(index: int64): float64
        
        /** Sets the maximum value of the remapping source range. */
        setReferenceRangeMax(index: int64, rangeMax: float64): void
        
        /** Returns the maximum value of the remapping source range. */
        getReferenceRangeMax(index: int64): float64
        
        /** Sets the global option in the setting at [param index] to [param enabled].  
         *  If [param enabled] is `true`, the global pose of the reference bone is used as the remapping source.  
         *  If [param enabled] is `false`, the local pose of the reference bone is used as the remapping source.  
         *      
         *  **Note:** If the parent of the reference bone has a non-uniform scale, the reference bone is sheared as seen from global space. Since the local pose cannot bring in the shear, the scale may not be applied as intended.  
         */
        setGlobal(index: int64, enabled: boolean): void
        
        /** Returns `true` if the global option is enabled in the setting at [param index]. */
        isGlobal(index: int64): boolean
        
        /** Sets relative option in the setting at [param index] to [param enabled].  
         *  If [param enabled] is `true`, the extracted and applying transform is relative to the rest.  
         *  If [param enabled] is `false`, the extracted transform is absolute.  
         */
        setRelative(index: int64, enabled: boolean): void
        
        /** Returns `true` if the relative option is enabled in the setting at [param index]. */
        isRelative(index: int64): boolean
        
        /** Sets additive option in the setting at [param index] to [param enabled]. This mainly affects the process of applying transform to the [method BoneConstraint3D.set_apply_bone].  
         *  If [param enabled] is `true`, the processed transform is added to the pose of the current apply bone.  
         *  If [param enabled] is `false`, the pose of the current apply bone is replaced with the processed transform. However, if set [method set_relative] to `true`, the transform is relative to rest.  
         */
        setAdditive(index: int64, enabled: boolean): void
        
        /** Returns `true` if the additive option is enabled in the setting at [param index]. */
        isAdditive(index: int64): boolean
        
        /** The number of settings in the modifier. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConvertTransformModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConvertTransformModifier3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConvexPolygonShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConvexPolygonShape2D extends __NameMapShape2D {
        set_point_cloud: "setPointCloud";
    }
    /** A 2D convex polygon shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_convexpolygonshape2d.html  
     */
    class ConvexPolygonShape2D extends Shape2D {
        constructor(identifier?: any)
        /** Based on the set of points provided, this assigns the [member points] property using the convex hull algorithm, removing all unneeded points. See [method Geometry2D.convex_hull] for details. */
        setPointCloud(pointCloud: PackedVector2Array | Vector2[]): void
        
        /** The polygon's list of vertices that form a convex hull. Can be in either clockwise or counterclockwise order.  
         *  **Warning:** Only set this property to a list of points that actually form a convex hull. Use [method set_point_cloud] to generate the convex hull of an arbitrary set of points.  
         */
        get points(): PackedVector2Array
        set points(value: PackedVector2Array | Vector2[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConvexPolygonShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConvexPolygonShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapConvexPolygonShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapConvexPolygonShape3D extends __NameMapShape3D {
    }
    /** A 3D convex polyhedron shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_convexpolygonshape3d.html  
     */
    class ConvexPolygonShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The list of 3D points forming the convex polygon shape. */
        get points(): GArray
        set points(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapConvexPolygonShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapConvexPolygonShape3D;
    }
    namespace CopyTransformModifier3D {
        enum TransformFlag {
            TransformFlagPosition = 1,
            TransformFlagRotation = 2,
            TransformFlagScale = 4,
            TransformFlagAll = 7,
        }
        enum AxisFlag {
            AxisFlagX = 1,
            AxisFlagY = 2,
            AxisFlagZ = 4,
            AxisFlagAll = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCopyTransformModifier3D extends __RPCMapBoneConstraint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCopyTransformModifier3D extends __NameMapBoneConstraint3D {
        set_copy_flags: "setCopyFlags";
        get_copy_flags: "getCopyFlags";
        set_axis_flags: "setAxisFlags";
        get_axis_flags: "getAxisFlags";
        set_invert_flags: "setInvertFlags";
        get_invert_flags: "getInvertFlags";
        set_copy_position: "setCopyPosition";
        is_position_copying: "isPositionCopying";
        set_copy_rotation: "setCopyRotation";
        is_rotation_copying: "isRotationCopying";
        set_copy_scale: "setCopyScale";
        is_scale_copying: "isScaleCopying";
        set_axis_x_enabled: "setAxisXEnabled";
        is_axis_x_enabled: "isAxisXEnabled";
        set_axis_y_enabled: "setAxisYEnabled";
        is_axis_y_enabled: "isAxisYEnabled";
        set_axis_z_enabled: "setAxisZEnabled";
        is_axis_z_enabled: "isAxisZEnabled";
        set_axis_x_inverted: "setAxisXInverted";
        is_axis_x_inverted: "isAxisXInverted";
        set_axis_y_inverted: "setAxisYInverted";
        is_axis_y_inverted: "isAxisYInverted";
        set_axis_z_inverted: "setAxisZInverted";
        is_axis_z_inverted: "isAxisZInverted";
        set_global: "setGlobal";
        is_global: "isGlobal";
        set_relative: "setRelative";
        is_relative: "isRelative";
        set_additive: "setAdditive";
        is_additive: "isAdditive";
        setting_count: "settingCount";
    }
    /** A [SkeletonModifier3D] that apply transform to the bone which copied from reference.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_copytransformmodifier3d.html  
     */
    class CopyTransformModifier3D<Map extends NodePathMap = any> extends BoneConstraint3D<Map> {
        constructor(identifier?: any)
        /** Sets the flags to process the transform operations. If the flag is valid, the transform operation is processed.  
         *      
         *  **Note:** If the rotation is valid for only one axis, it respects the roll of the valid axis. If the rotation is valid for two axes, it discards the roll of the invalid axis.  
         */
        setCopyFlags(index: int64, copyFlags: CopyTransformModifier3D.TransformFlag): void
        
        /** Returns the copy flags of the setting at [param index]. */
        getCopyFlags(index: int64): CopyTransformModifier3D.TransformFlag
        
        /** Sets the flags to copy axes. If the flag is valid, the axis is copied. */
        setAxisFlags(index: int64, axisFlags: CopyTransformModifier3D.AxisFlag): void
        
        /** Returns the axis flags of the setting at [param index]. */
        getAxisFlags(index: int64): CopyTransformModifier3D.AxisFlag
        
        /** Sets the flags to inverte axes. If the flag is valid, the axis is copied.  
         *      
         *  **Note:** An inverted scale means an inverse number, not a negative scale. For example, inverting `2.0` means `0.5`.  
         *      
         *  **Note:** An inverted rotation flips the elements of the quaternion. For example, a two-axis inversion will flip the roll of each axis, and a three-axis inversion will flip the final orientation. However, be aware that flipping only one axis may cause unintended rotation by the unflipped axes, due to the characteristics of the quaternion.  
         */
        setInvertFlags(index: int64, axisFlags: CopyTransformModifier3D.AxisFlag): void
        
        /** Returns the invert flags of the setting at [param index]. */
        getInvertFlags(index: int64): CopyTransformModifier3D.AxisFlag
        
        /** If [param enabled] is `true`, the position will be copied. */
        setCopyPosition(index: int64, enabled: boolean): void
        
        /** Returns `true` if the copy flags has the flag for the position in the setting at [param index]. See also [method set_copy_flags]. */
        isPositionCopying(index: int64): boolean
        
        /** If [param enabled] is `true`, the rotation will be copied. */
        setCopyRotation(index: int64, enabled: boolean): void
        
        /** Returns `true` if the copy flags has the flag for the rotation in the setting at [param index]. See also [method set_copy_flags]. */
        isRotationCopying(index: int64): boolean
        
        /** If [param enabled] is `true`, the scale will be copied. */
        setCopyScale(index: int64, enabled: boolean): void
        
        /** Returns `true` if the copy flags has the flag for the scale in the setting at [param index]. See also [method set_copy_flags]. */
        isScaleCopying(index: int64): boolean
        
        /** If [param enabled] is `true`, the X-axis will be copied. */
        setAxisXEnabled(index: int64, enabled: boolean): void
        
        /** Returns `true` if the enable flags has the flag for the X-axis in the setting at [param index]. See also [method set_axis_flags]. */
        isAxisXEnabled(index: int64): boolean
        
        /** If [param enabled] is `true`, the Y-axis will be copied. */
        setAxisYEnabled(index: int64, enabled: boolean): void
        
        /** Returns `true` if the enable flags has the flag for the Y-axis in the setting at [param index]. See also [method set_axis_flags]. */
        isAxisYEnabled(index: int64): boolean
        
        /** If [param enabled] is `true`, the Z-axis will be copied. */
        setAxisZEnabled(index: int64, enabled: boolean): void
        
        /** Returns `true` if the enable flags has the flag for the Z-axis in the setting at [param index]. See also [method set_axis_flags]. */
        isAxisZEnabled(index: int64): boolean
        
        /** If [param enabled] is `true`, the X-axis will be inverted. */
        setAxisXInverted(index: int64, enabled: boolean): void
        
        /** Returns `true` if the invert flags has the flag for the X-axis in the setting at [param index]. See also [method set_invert_flags]. */
        isAxisXInverted(index: int64): boolean
        
        /** If [param enabled] is `true`, the Y-axis will be inverted. */
        setAxisYInverted(index: int64, enabled: boolean): void
        
        /** Returns `true` if the invert flags has the flag for the Y-axis in the setting at [param index]. See also [method set_invert_flags]. */
        isAxisYInverted(index: int64): boolean
        
        /** If [param enabled] is `true`, the Z-axis will be inverted. */
        setAxisZInverted(index: int64, enabled: boolean): void
        
        /** Returns `true` if the invert flags has the flag for the Z-axis in the setting at [param index]. See also [method set_invert_flags]. */
        isAxisZInverted(index: int64): boolean
        
        /** Sets the global option in the setting at [param index] to [param enabled].  
         *  If [param enabled] is `true`, the global pose of the reference bone is extracted and applied so that the global pose of the apply bone coincides with it.  
         *  If [param enabled] is `false`, the local pose of the reference bone is extracted and applied to the local pose of the apply bone.  
         *      
         *  **Note:** If the parent of the reference bone has a non-uniform scale, the reference bone is sheared as seen from global space. Since the local pose cannot bring in the shear, the scale may not be applied as intended.  
         */
        setGlobal(index: int64, enabled: boolean): void
        
        /** Returns `true` if the global option is enabled in the setting at [param index]. */
        isGlobal(index: int64): boolean
        
        /** Sets relative option in the setting at [param index] to [param enabled].  
         *  If [param enabled] is `true`, the extracted and applying transform is relative to the rest.  
         *  If [param enabled] is `false`, the extracted transform is absolute.  
         */
        setRelative(index: int64, enabled: boolean): void
        
        /** Returns `true` if the relative option is enabled in the setting at [param index]. */
        isRelative(index: int64): boolean
        
        /** Sets additive option in the setting at [param index] to [param enabled]. This mainly affects the process of applying transform to the [method BoneConstraint3D.set_apply_bone].  
         *  If [param enabled] is `true`, the processed transform is added to the pose of the current apply bone.  
         *  If [param enabled] is `false`, the pose of the current apply bone is replaced with the processed transform. However, if set [method set_relative] to `true`, the transform is relative to rest.  
         */
        setAdditive(index: int64, enabled: boolean): void
        
        /** Returns `true` if the additive option is enabled in the setting at [param index]. */
        isAdditive(index: int64): boolean
        
        /** The number of settings in the modifier. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCopyTransformModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCopyTransformModifier3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCrypto extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCrypto extends __NameMapRefCounted {
        generate_random_bytes: "generateRandomBytes";
        generate_rsa: "generateRsa";
        generate_self_signed_certificate: "generateSelfSignedCertificate";
        hmac_digest: "hmacDigest";
        constant_time_compare: "constantTimeCompare";
    }
    /** Provides access to advanced cryptographic functionalities.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_crypto.html  
     */
    class Crypto extends RefCounted {
        constructor(identifier?: any)
        /** Generates a [PackedByteArray] of cryptographically secure random bytes with given [param size]. */
        generateRandomBytes(size: int64): PackedByteArray
        
        /** Generates an RSA [CryptoKey] that can be used for creating self-signed certificates and passed to [method StreamPeerTLS.accept_stream]. */
        generateRsa(size: int64): null | CryptoKey
        
        /** Generates a self-signed [X509Certificate] from the given [CryptoKey] and [param issuer_name]. The certificate validity will be defined by [param not_before] and [param not_after] (first valid date and last valid date). The [param issuer_name] must contain at least "CN=" (common name, i.e. the domain name), "O=" (organization, i.e. your company name), "C=" (country, i.e. 2 lettered ISO-3166 code of the country the organization is based in).  
         *  A small example to generate an RSA key and an X509 self-signed certificate.  
         *    
         */
        generateSelfSignedCertificate(key: CryptoKey, issuerName?: string /* = 'CN=myserver,O=myorganisation,C=IT' */, notBefore?: string /* = '20140101000000' */, notAfter?: string /* = '20340101000000' */): null | X509Certificate
        
        /** Sign a given [param hash] of type [param hash_type] with the provided private [param key]. */
        sign(hashType: HashingContext.HashType, hash: PackedByteArray | byte[] | ArrayBuffer, key: CryptoKey): PackedByteArray
        
        /** Verify that a given [param signature] for [param hash] of type [param hash_type] against the provided public [param key]. */
        verify(hashType: HashingContext.HashType, hash: PackedByteArray | byte[] | ArrayBuffer, signature: PackedByteArray | byte[] | ArrayBuffer, key: CryptoKey): boolean
        
        /** Encrypt the given [param plaintext] with the provided public [param key].  
         *      
         *  **Note:** The maximum size of accepted plaintext is limited by the key size.  
         */
        encrypt(key: CryptoKey, plaintext: PackedByteArray | byte[] | ArrayBuffer): PackedByteArray
        
        /** Decrypt the given [param ciphertext] with the provided private [param key].  
         *      
         *  **Note:** The maximum size of accepted ciphertext is limited by the key size.  
         */
        decrypt(key: CryptoKey, ciphertext: PackedByteArray | byte[] | ArrayBuffer): PackedByteArray
        
        /** Generates an [url=https://en.wikipedia.org/wiki/HMAC]HMAC[/url] digest of [param msg] using [param key]. The [param hash_type] parameter is the hashing algorithm that is used for the inner and outer hashes.  
         *  Currently, only [constant HashingContext.HASH_SHA256] and [constant HashingContext.HASH_SHA1] are supported.  
         */
        hmacDigest(hashType: HashingContext.HashType, key: PackedByteArray | byte[] | ArrayBuffer, msg: PackedByteArray | byte[] | ArrayBuffer): PackedByteArray
        
        /** Compares two [PackedByteArray]s for equality without leaking timing information in order to prevent timing attacks.  
         *  See [url=https://paragonie.com/blog/2015/11/preventing-timing-attacks-on-string-comparison-with-double-hmac-strategy]this blog post[/url] for more information.  
         */
        constantTimeCompare(trusted: PackedByteArray | byte[] | ArrayBuffer, received: PackedByteArray | byte[] | ArrayBuffer): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCrypto;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCrypto;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCryptoKey extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCryptoKey extends __NameMapResource {
        is_public_only: "isPublicOnly";
        save_to_string: "saveToString";
        load_from_string: "loadFromString";
    }
    /** A cryptographic key (RSA or elliptic-curve).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cryptokey.html  
     */
    class CryptoKey extends Resource {
        constructor(identifier?: any)
        /** Saves a key to the given [param path]. If [param public_only] is `true`, only the public key will be saved.  
         *      
         *  **Note:** [param path] should be a "*.pub" file if [param public_only] is `true`, a "*.key" file otherwise.  
         */
        save(path: string, publicOnly?: boolean /* = false */): GError
        
        /** Loads a key from [param path]. If [param public_only] is `true`, only the public key will be loaded.  
         *      
         *  **Note:** [param path] should be a "*.pub" file if [param public_only] is `true`, a "*.key" file otherwise.  
         */
        load(path: string, publicOnly?: boolean /* = false */): GError
        
        /** Returns `true` if this CryptoKey only has the public part, and not the private one. */
        isPublicOnly(): boolean
        
        /** Returns a string containing the key in PEM format. If [param public_only] is `true`, only the public key will be included. */
        saveToString(publicOnly?: boolean /* = false */): string
        
        /** Loads a key from the given [param string_key]. If [param public_only] is `true`, only the public key will be loaded. */
        loadFromString(stringKey: string, publicOnly?: boolean /* = false */): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCryptoKey;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCryptoKey;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCubemap extends __RPCMapImageTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCubemap extends __NameMapImageTextureLayered {
        create_placeholder: "createPlaceholder";
    }
    /** Six square textures representing the faces of a cube. Commonly used as a skybox.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cubemap.html  
     */
    class Cubemap extends ImageTextureLayered {
        constructor(identifier?: any)
        /** Creates a placeholder version of this resource ([PlaceholderCubemap]). */
        createPlaceholder(): Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCubemap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCubemap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCubemapArray extends __RPCMapImageTextureLayered {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCubemapArray extends __NameMapImageTextureLayered {
        create_placeholder: "createPlaceholder";
    }
    /** An array of [Cubemap]s, stored together and with a single reference.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cubemaparray.html  
     */
    class CubemapArray extends ImageTextureLayered {
        constructor(identifier?: any)
        /** Creates a placeholder version of this resource ([PlaceholderCubemapArray]). */
        createPlaceholder(): Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCubemapArray;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCubemapArray;
    }
    namespace Curve {
        enum TangentMode {
            TangentFree = 0,
            TangentLinear = 1,
            TangentModeCount = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCurve extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCurve extends __NameMapResource {
        add_point: "addPoint";
        remove_point: "removePoint";
        clear_points: "clearPoints";
        get_point_position: "getPointPosition";
        set_point_value: "setPointValue";
        set_point_offset: "setPointOffset";
        sample_baked: "sampleBaked";
        get_point_left_tangent: "getPointLeftTangent";
        get_point_right_tangent: "getPointRightTangent";
        get_point_left_mode: "getPointLeftMode";
        get_point_right_mode: "getPointRightMode";
        set_point_left_tangent: "setPointLeftTangent";
        set_point_right_tangent: "setPointRightTangent";
        set_point_left_mode: "setPointLeftMode";
        set_point_right_mode: "setPointRightMode";
        get_value_range: "getValueRange";
        get_domain_range: "getDomainRange";
        clean_dupes: "cleanDupes";
        min_domain: "minDomain";
        max_domain: "maxDomain";
        min_value: "minValue";
        max_value: "maxValue";
        bake_resolution: "bakeResolution";
        point_count: "pointCount";
        range_changed: "rangeChanged";
        domain_changed: "domainChanged";
    }
    /** A mathematical curve.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_curve.html  
     */
    class Curve extends Resource {
        constructor(identifier?: any)
        /** Adds a point to the curve. For each side, if the `*_mode` is [constant TANGENT_LINEAR], the `*_tangent` angle (in degrees) uses the slope of the curve halfway to the adjacent point. Allows custom assignments to the `*_tangent` angle if `*_mode` is set to [constant TANGENT_FREE]. */
        addPoint(position: Vector2, leftTangent?: float64 /* = 0 */, rightTangent?: float64 /* = 0 */, leftMode?: Curve.TangentMode /* = 0 */, rightMode?: Curve.TangentMode /* = 0 */): int64
        
        /** Removes the point at [param index] from the curve. */
        removePoint(index: int64): void
        
        /** Removes all points from the curve. */
        clearPoints(): void
        
        /** Returns the curve coordinates for the point at [param index]. */
        getPointPosition(index: int64): Vector2
        
        /** Assigns the vertical position [param y] to the point at [param index]. */
        setPointValue(index: int64, y: float64): void
        
        /** Assigns the horizontal position [param offset] to the point at [param index]. */
        setPointOffset(index: int64, offset: float64): int64
        
        /** Returns the Y value for the point that would exist at the X position [param offset] along the curve. */
        sample(offset: float64): float64
        
        /** Returns the Y value for the point that would exist at the X position [param offset] along the curve using the baked cache. Bakes the curve's points if not already baked. */
        sampleBaked(offset: float64): float64
        
        /** Returns the left tangent angle (in degrees) for the point at [param index]. */
        getPointLeftTangent(index: int64): float64
        
        /** Returns the right tangent angle (in degrees) for the point at [param index]. */
        getPointRightTangent(index: int64): float64
        
        /** Returns the left [enum TangentMode] for the point at [param index]. */
        getPointLeftMode(index: int64): Curve.TangentMode
        
        /** Returns the right [enum TangentMode] for the point at [param index]. */
        getPointRightMode(index: int64): Curve.TangentMode
        
        /** Sets the left tangent angle for the point at [param index] to [param tangent]. */
        setPointLeftTangent(index: int64, tangent: float64): void
        
        /** Sets the right tangent angle for the point at [param index] to [param tangent]. */
        setPointRightTangent(index: int64, tangent: float64): void
        
        /** Sets the left [enum TangentMode] for the point at [param index] to [param mode]. */
        setPointLeftMode(index: int64, mode: Curve.TangentMode): void
        
        /** Sets the right [enum TangentMode] for the point at [param index] to [param mode]. */
        setPointRightMode(index: int64, mode: Curve.TangentMode): void
        
        /** Returns the difference between [member min_value] and [member max_value]. */
        getValueRange(): float64
        
        /** Returns the difference between [member min_domain] and [member max_domain]. */
        getDomainRange(): float64
        
        /** Removes duplicate points, i.e. points that are less than 0.00001 units (engine epsilon value) away from their neighbor on the curve. */
        cleanDupes(): void
        
        /** Recomputes the baked cache of points for the curve. */
        bake(): void
        
        /** The minimum domain (x-coordinate) that points can have. */
        get minDomain(): float64
        set minDomain(value: float64)
        
        /** The maximum domain (x-coordinate) that points can have. */
        get maxDomain(): float64
        set maxDomain(value: float64)
        
        /** The minimum value (y-coordinate) that points can have. Tangents can cause lower values between points. */
        get minValue(): float64
        set minValue(value: float64)
        
        /** The maximum value (y-coordinate) that points can have. Tangents can cause higher values between points. */
        get maxValue(): float64
        set maxValue(value: float64)
        get _limits(): any
        set _limits(value: any)
        
        /** The number of points to include in the baked (i.e. cached) curve data. */
        get bakeResolution(): int64
        set bakeResolution(value: int64)
        get _data(): int64
        set _data(value: int64)
        
        /** The number of points describing the curve. */
        get pointCount(): int64
        set pointCount(value: int64)
        
        /** Emitted when [member max_value] or [member min_value] is changed. */
        readonly rangeChanged: Signal<() => void>
        
        /** Emitted when [member max_domain] or [member min_domain] is changed. */
        readonly domainChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCurve;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCurve;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCurve2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCurve2D extends __NameMapResource {
        add_point: "addPoint";
        set_point_position: "setPointPosition";
        get_point_position: "getPointPosition";
        set_point_in: "setPointIn";
        get_point_in: "getPointIn";
        set_point_out: "setPointOut";
        get_point_out: "getPointOut";
        remove_point: "removePoint";
        clear_points: "clearPoints";
        get_baked_length: "getBakedLength";
        sample_baked: "sampleBaked";
        sample_baked_with_rotation: "sampleBakedWithRotation";
        get_baked_points: "getBakedPoints";
        get_closest_point: "getClosestPoint";
        get_closest_offset: "getClosestOffset";
        tessellate_even_length: "tessellateEvenLength";
        bake_interval: "bakeInterval";
        point_count: "pointCount";
    }
    /** Describes a Bézier curve in 2D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_curve2d.html  
     */
    class Curve2D extends Resource {
        constructor(identifier?: any)
        /** Adds a point with the specified [param position] relative to the curve's own position, with control points [param in] and [param out]. Appends the new point at the end of the point list.  
         *  If [param index] is given, the new point is inserted before the existing point identified by index [param index]. Every existing point starting from [param index] is shifted further down the list of points. The index must be greater than or equal to `0` and must not exceed the number of existing points in the line. See [member point_count].  
         */
        addPoint(position: Vector2, in_?: Vector2 /* = Vector2.ZERO */, out_?: Vector2 /* = Vector2.ZERO */, index?: int64 /* = -1 */): void
        
        /** Sets the position for the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. */
        setPointPosition(idx: int64, position: Vector2): void
        
        /** Returns the position of the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0)`. */
        getPointPosition(idx: int64): Vector2
        
        /** Sets the position of the control point leading to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. The position is relative to the vertex. */
        setPointIn(idx: int64, position: Vector2): void
        
        /** Returns the position of the control point leading to the vertex [param idx]. The returned position is relative to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0)`. */
        getPointIn(idx: int64): Vector2
        
        /** Sets the position of the control point leading out of the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. The position is relative to the vertex. */
        setPointOut(idx: int64, position: Vector2): void
        
        /** Returns the position of the control point leading out of the vertex [param idx]. The returned position is relative to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0)`. */
        getPointOut(idx: int64): Vector2
        
        /** Deletes the point [param idx] from the curve. Sends an error to the console if [param idx] is out of bounds. */
        removePoint(idx: int64): void
        
        /** Removes all points from the curve. */
        clearPoints(): void
        
        /** Returns the position between the vertex [param idx] and the vertex `idx + 1`, where [param t] controls if the point is the first vertex (`t = 0.0`), the last vertex (`t = 1.0`), or in between. Values of [param t] outside the range (`0.0 <= t <= 1.0`) give strange, but predictable results.  
         *  If [param idx] is out of bounds it is truncated to the first or last vertex, and [param t] is ignored. If the curve has no points, the function sends an error to the console, and returns `(0, 0)`.  
         */
        sample(idx: int64, t: float64): Vector2
        
        /** Returns the position at the vertex [param fofs]. It calls [method sample] using the integer part of [param fofs] as `idx`, and its fractional part as `t`. */
        samplef(fofs: float64): Vector2
        
        /** Returns the total length of the curve, based on the cached points. Given enough density (see [member bake_interval]), it should be approximate enough. */
        getBakedLength(): float64
        
        /** Returns a point within the curve at position [param offset], where [param offset] is measured as a pixel distance along the curve.  
         *  To do that, it finds the two cached points where the [param offset] lies between, then interpolates the values. This interpolation is cubic if [param cubic] is set to `true`, or linear if set to `false`.  
         *  Cubic interpolation tends to follow the curves better, but linear is faster (and often, precise enough).  
         */
        sampleBaked(offset?: float64 /* = 0 */, cubic?: boolean /* = false */): Vector2
        
        /** Similar to [method sample_baked], but returns [Transform2D] that includes a rotation along the curve, with [member Transform2D.origin] as the point position and the [member Transform2D.x] vector pointing in the direction of the path at that point. Returns an empty transform if the length of the curve is `0`.  
         *    
         */
        sampleBakedWithRotation(offset?: float64 /* = 0 */, cubic?: boolean /* = false */): Transform2D
        
        /** Returns the cache of points as a [PackedVector2Array]. */
        getBakedPoints(): PackedVector2Array
        
        /** Returns the closest point on baked segments (in curve's local space) to [param to_point].  
         *  [param to_point] must be in this curve's local space.  
         */
        getClosestPoint(toPoint: Vector2): Vector2
        
        /** Returns the closest offset to [param to_point]. This offset is meant to be used in [method sample_baked].  
         *  [param to_point] must be in this curve's local space.  
         */
        getClosestOffset(toPoint: Vector2): float64
        
        /** Returns a list of points along the curve, with a curvature controlled point density. That is, the curvier parts will have more points than the straighter parts.  
         *  This approximation makes straight segments between each point, then subdivides those segments until the resulting shape is similar enough.  
         *  [param max_stages] controls how many subdivisions a curve segment may face before it is considered approximate enough. Each subdivision splits the segment in half, so the default 5 stages may mean up to 32 subdivisions per curve segment. Increase with care!  
         *  [param tolerance_degrees] controls how many degrees the midpoint of a segment may deviate from the real curve, before the segment has to be subdivided.  
         */
        tessellate(maxStages?: int64 /* = 5 */, toleranceDegrees?: float64 /* = 4 */): PackedVector2Array
        
        /** Returns a list of points along the curve, with almost uniform density. [param max_stages] controls how many subdivisions a curve segment may face before it is considered approximate enough. Each subdivision splits the segment in half, so the default 5 stages may mean up to 32 subdivisions per curve segment. Increase with care!  
         *  [param tolerance_length] controls the maximal distance between two neighboring points, before the segment has to be subdivided.  
         */
        tessellateEvenLength(maxStages?: int64 /* = 5 */, toleranceLength?: float64 /* = 20 */): PackedVector2Array
        
        /** The distance in pixels between two adjacent cached points. Changing it forces the cache to be recomputed the next time the [method get_baked_points] or [method get_baked_length] function is called. The smaller the distance, the more points in the cache and the more memory it will consume, so use with care. */
        get bakeInterval(): float64
        set bakeInterval(value: float64)
        get _data(): int64
        set _data(value: int64)
        
        /** The number of points describing the curve. */
        get pointCount(): int64
        set pointCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCurve2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCurve2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCurve3D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCurve3D extends __NameMapResource {
        add_point: "addPoint";
        set_point_position: "setPointPosition";
        get_point_position: "getPointPosition";
        set_point_tilt: "setPointTilt";
        get_point_tilt: "getPointTilt";
        set_point_in: "setPointIn";
        get_point_in: "getPointIn";
        set_point_out: "setPointOut";
        get_point_out: "getPointOut";
        remove_point: "removePoint";
        clear_points: "clearPoints";
        get_baked_length: "getBakedLength";
        sample_baked: "sampleBaked";
        sample_baked_with_rotation: "sampleBakedWithRotation";
        sample_baked_up_vector: "sampleBakedUpVector";
        get_baked_points: "getBakedPoints";
        get_baked_tilts: "getBakedTilts";
        get_baked_up_vectors: "getBakedUpVectors";
        get_closest_point: "getClosestPoint";
        get_closest_offset: "getClosestOffset";
        tessellate_even_length: "tessellateEvenLength";
        bake_interval: "bakeInterval";
        point_count: "pointCount";
        up_vector_enabled: "upVectorEnabled";
    }
    /** Describes a Bézier curve in 3D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_curve3d.html  
     */
    class Curve3D extends Resource {
        constructor(identifier?: any)
        /** Adds a point with the specified [param position] relative to the curve's own position, with control points [param in] and [param out]. Appends the new point at the end of the point list.  
         *  If [param index] is given, the new point is inserted before the existing point identified by index [param index]. Every existing point starting from [param index] is shifted further down the list of points. The index must be greater than or equal to `0` and must not exceed the number of existing points in the line. See [member point_count].  
         */
        addPoint(position: Vector3, in_?: Vector3 /* = new Vector3(0, 0, 0) */, out_?: Vector3 /* = new Vector3(0, 0, 0) */, index?: int64 /* = -1 */): void
        
        /** Sets the position for the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. */
        setPointPosition(idx: int64, position: Vector3): void
        
        /** Returns the position of the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0, 0)`. */
        getPointPosition(idx: int64): Vector3
        
        /** Sets the tilt angle in radians for the point [param idx]. If the index is out of bounds, the function sends an error to the console.  
         *  The tilt controls the rotation along the look-at axis an object traveling the path would have. In the case of a curve controlling a [PathFollow3D], this tilt is an offset over the natural tilt the [PathFollow3D] calculates.  
         */
        setPointTilt(idx: int64, tilt: float64): void
        
        /** Returns the tilt angle in radians for the point [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `0`. */
        getPointTilt(idx: int64): float64
        
        /** Sets the position of the control point leading to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. The position is relative to the vertex. */
        setPointIn(idx: int64, position: Vector3): void
        
        /** Returns the position of the control point leading to the vertex [param idx]. The returned position is relative to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0, 0)`. */
        getPointIn(idx: int64): Vector3
        
        /** Sets the position of the control point leading out of the vertex [param idx]. If the index is out of bounds, the function sends an error to the console. The position is relative to the vertex. */
        setPointOut(idx: int64, position: Vector3): void
        
        /** Returns the position of the control point leading out of the vertex [param idx]. The returned position is relative to the vertex [param idx]. If the index is out of bounds, the function sends an error to the console, and returns `(0, 0, 0)`. */
        getPointOut(idx: int64): Vector3
        
        /** Deletes the point [param idx] from the curve. Sends an error to the console if [param idx] is out of bounds. */
        removePoint(idx: int64): void
        
        /** Removes all points from the curve. */
        clearPoints(): void
        
        /** Returns the position between the vertex [param idx] and the vertex `idx + 1`, where [param t] controls if the point is the first vertex (`t = 0.0`), the last vertex (`t = 1.0`), or in between. Values of [param t] outside the range (`0.0 >= t <=1`) give strange, but predictable results.  
         *  If [param idx] is out of bounds it is truncated to the first or last vertex, and [param t] is ignored. If the curve has no points, the function sends an error to the console, and returns `(0, 0, 0)`.  
         */
        sample(idx: int64, t: float64): Vector3
        
        /** Returns the position at the vertex [param fofs]. It calls [method sample] using the integer part of [param fofs] as `idx`, and its fractional part as `t`. */
        samplef(fofs: float64): Vector3
        
        /** Returns the total length of the curve, based on the cached points. Given enough density (see [member bake_interval]), it should be approximate enough. */
        getBakedLength(): float64
        
        /** Returns a point within the curve at position [param offset], where [param offset] is measured as a distance in 3D units along the curve. To do that, it finds the two cached points where the [param offset] lies between, then interpolates the values. This interpolation is cubic if [param cubic] is set to `true`, or linear if set to `false`.  
         *  Cubic interpolation tends to follow the curves better, but linear is faster (and often, precise enough).  
         */
        sampleBaked(offset?: float64 /* = 0 */, cubic?: boolean /* = false */): Vector3
        
        /** Returns a [Transform3D] with `origin` as point position, `basis.x` as sideway vector, `basis.y` as up vector, `basis.z` as forward vector. When the curve length is 0, there is no reasonable way to calculate the rotation, all vectors aligned with global space axes. See also [method sample_baked]. */
        sampleBakedWithRotation(offset?: float64 /* = 0 */, cubic?: boolean /* = false */, applyTilt?: boolean /* = false */): Transform3D
        
        /** Returns an up vector within the curve at position [param offset], where [param offset] is measured as a distance in 3D units along the curve. To do that, it finds the two cached up vectors where the [param offset] lies between, then interpolates the values. If [param apply_tilt] is `true`, an interpolated tilt is applied to the interpolated up vector.  
         *  If the curve has no up vectors, the function sends an error to the console, and returns `(0, 1, 0)`.  
         */
        sampleBakedUpVector(offset: float64, applyTilt?: boolean /* = false */): Vector3
        
        /** Returns the cache of points as a [PackedVector3Array]. */
        getBakedPoints(): PackedVector3Array
        
        /** Returns the cache of tilts as a [PackedFloat32Array]. */
        getBakedTilts(): PackedFloat32Array
        
        /** Returns the cache of up vectors as a [PackedVector3Array].  
         *  If [member up_vector_enabled] is `false`, the cache will be empty.  
         */
        getBakedUpVectors(): PackedVector3Array
        
        /** Returns the closest point on baked segments (in curve's local space) to [param to_point].  
         *  [param to_point] must be in this curve's local space.  
         */
        getClosestPoint(toPoint: Vector3): Vector3
        
        /** Returns the closest offset to [param to_point]. This offset is meant to be used in [method sample_baked] or [method sample_baked_up_vector].  
         *  [param to_point] must be in this curve's local space.  
         */
        getClosestOffset(toPoint: Vector3): float64
        
        /** Returns a list of points along the curve, with a curvature controlled point density. That is, the curvier parts will have more points than the straighter parts.  
         *  This approximation makes straight segments between each point, then subdivides those segments until the resulting shape is similar enough.  
         *  [param max_stages] controls how many subdivisions a curve segment may face before it is considered approximate enough. Each subdivision splits the segment in half, so the default 5 stages may mean up to 32 subdivisions per curve segment. Increase with care!  
         *  [param tolerance_degrees] controls how many degrees the midpoint of a segment may deviate from the real curve, before the segment has to be subdivided.  
         */
        tessellate(maxStages?: int64 /* = 5 */, toleranceDegrees?: float64 /* = 4 */): PackedVector3Array
        
        /** Returns a list of points along the curve, with almost uniform density. [param max_stages] controls how many subdivisions a curve segment may face before it is considered approximate enough. Each subdivision splits the segment in half, so the default 5 stages may mean up to 32 subdivisions per curve segment. Increase with care!  
         *  [param tolerance_length] controls the maximal distance between two neighboring points, before the segment has to be subdivided.  
         */
        tessellateEvenLength(maxStages?: int64 /* = 5 */, toleranceLength?: float64 /* = 0.2 */): PackedVector3Array
        
        /** If `true`, and the curve has more than 2 control points, the last point and the first one will be connected in a loop. */
        get closed(): boolean
        set closed(value: boolean)
        
        /** The distance in meters between two adjacent cached points. Changing it forces the cache to be recomputed the next time the [method get_baked_points] or [method get_baked_length] function is called. The smaller the distance, the more points in the cache and the more memory it will consume, so use with care. */
        get bakeInterval(): float64
        set bakeInterval(value: float64)
        get _data(): int64
        set _data(value: int64)
        
        /** The number of points describing the curve. */
        get pointCount(): int64
        set pointCount(value: int64)
        
        /** If `true`, the curve will bake up vectors used for orientation. This is used when [member PathFollow3D.rotation_mode] is set to [constant PathFollow3D.ROTATION_ORIENTED]. Changing it forces the cache to be recomputed. */
        get upVectorEnabled(): boolean
        set upVectorEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCurve3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCurve3D;
    }
    namespace CurveTexture {
        enum TextureMode {
            TextureModeRgb = 0,
            TextureModeRed = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCurveTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCurveTexture extends __NameMapTexture2D {
        texture_mode: "textureMode";
    }
    /** A 1D texture where pixel brightness corresponds to points on a curve.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_curvetexture.html  
     */
    class CurveTexture extends Texture2D {
        constructor(identifier?: any)
        /** The width of the texture (in pixels). Higher values make it possible to represent high-frequency data better (such as sudden direction changes), at the cost of increased generation time and memory usage. */
        get width(): int64
        set width(value: int64)
        
        /** The format the texture should be generated with. When passing a CurveTexture as an input to a [Shader], this may need to be adjusted. */
        get textureMode(): int64
        set textureMode(value: int64)
        
        /** The [Curve] that is rendered onto the texture. Should be a unit [Curve]. */
        get curve(): null | Curve
        set curve(value: null | Curve)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCurveTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCurveTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCurveXyzTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCurveXyzTexture extends __NameMapTexture2D {
        curve_x: "curveX";
        curve_y: "curveY";
        curve_z: "curveZ";
    }
    class CurveXyzTexture extends Texture2D {
        constructor(identifier?: any)
        get width(): int64
        set width(value: int64)
        get curveX(): null | Curve
        set curveX(value: null | Curve)
        get curveY(): null | Curve
        set curveY(value: null | Curve)
        get curveZ(): null | Curve
        set curveZ(value: null | Curve)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCurveXyzTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCurveXyzTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCylinderMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCylinderMesh extends __NameMapPrimitiveMesh {
        top_radius: "topRadius";
        bottom_radius: "bottomRadius";
        radial_segments: "radialSegments";
        cap_top: "capTop";
        cap_bottom: "capBottom";
    }
    /** Class representing a cylindrical [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cylindermesh.html  
     */
    class CylinderMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Top radius of the cylinder. If set to `0.0`, the top faces will not be generated, resulting in a conic shape. See also [member cap_top]. */
        get topRadius(): float64
        set topRadius(value: float64)
        
        /** Bottom radius of the cylinder. If set to `0.0`, the bottom faces will not be generated, resulting in a conic shape. See also [member cap_bottom]. */
        get bottomRadius(): float64
        set bottomRadius(value: float64)
        
        /** Full height of the cylinder. */
        get height(): float64
        set height(value: float64)
        
        /** Number of radial segments on the cylinder. Higher values result in a more detailed cylinder/cone at the cost of performance. */
        get radialSegments(): int64
        set radialSegments(value: int64)
        
        /** Number of edge rings along the height of the cylinder. Changing [member rings] does not have any visual impact unless a shader or procedural mesh tool is used to alter the vertex data. Higher values result in more subdivisions, which can be used to create smoother-looking effects with shaders or procedural mesh tools (at the cost of performance). When not altering the vertex data using a shader or procedural mesh tool, [member rings] should be kept to its default value. */
        get rings(): int64
        set rings(value: int64)
        
        /** If `true`, generates a cap at the top of the cylinder. This can be set to `false` to speed up generation and rendering when the cap is never seen by the camera. See also [member top_radius].  
         *      
         *  **Note:** If [member top_radius] is `0.0`, cap generation is always skipped even if [member cap_top] is `true`.  
         */
        get capTop(): boolean
        set capTop(value: boolean)
        
        /** If `true`, generates a cap at the bottom of the cylinder. This can be set to `false` to speed up generation and rendering when the cap is never seen by the camera. See also [member bottom_radius].  
         *      
         *  **Note:** If [member bottom_radius] is `0.0`, cap generation is always skipped even if [member cap_bottom] is `true`.  
         */
        get capBottom(): boolean
        set capBottom(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCylinderMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCylinderMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCylinderShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCylinderShape3D extends __NameMapShape3D {
    }
    /** A 3D cylinder shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cylindershape3d.html  
     */
    class CylinderShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The cylinder's height. */
        get height(): float64
        set height(value: float64)
        
        /** The cylinder's radius. */
        get radius(): float64
        set radius(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCylinderShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCylinderShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDpiTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDpiTexture extends __NameMapTexture2D {
        create_from_string: "createFromString";
        set_size_override: "setSizeOverride";
        get_scaled_rid: "getScaledRid";
        fix_alpha_border: "fixAlphaBorder";
        premult_alpha: "premultAlpha";
        base_scale: "baseScale";
        color_map: "colorMap";
    }
    class DpiTexture extends Texture2D {
        constructor(identifier?: any)
        static createFromString(source: string, scale?: float64 /* = 1 */, saturation?: float64 /* = 1 */, colorMap?: GDictionary /* = new GDictionary() */): DpiTexture
        setSizeOverride(size: Vector2I): void
        getScaledRid(): Rid
        get _source(): string
        set _source(value: string)
        get fixAlphaBorder(): boolean
        set fixAlphaBorder(value: boolean)
        get premultAlpha(): boolean
        set premultAlpha(value: boolean)
        get baseScale(): float64
        set baseScale(value: float64)
        get saturation(): float64
        set saturation(value: float64)
        get colorMap(): GDictionary
        set colorMap(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDpiTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDpiTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDtlsServer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDtlsServer extends __NameMapRefCounted {
        take_connection: "takeConnection";
    }
    class DtlsServer extends RefCounted {
        constructor(identifier?: any)
        setup(serverOptions: TlsOptions): GError
        takeConnection(udpPeer: PacketPeerUdp): null | PacketPeerDtls
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDtlsServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDtlsServer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDampedSpringJoint2D extends __RPCMapJoint2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDampedSpringJoint2D extends __NameMapJoint2D {
        rest_length: "restLength";
    }
    /** A physics joint that connects two 2D physics bodies with a spring-like force.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_dampedspringjoint2d.html  
     */
    class DampedSpringJoint2D<Map extends NodePathMap = any> extends Joint2D<Map> {
        constructor(identifier?: any)
        /** The spring joint's maximum length. The two attached bodies cannot stretch it past this value. */
        get length(): float64
        set length(value: float64)
        
        /** When the bodies attached to the spring joint move they stretch or squash it. The joint always tries to resize towards this length. */
        get restLength(): float64
        set restLength(value: float64)
        
        /** The higher the value, the less the bodies attached to the joint will deform it. The joint applies an opposing force to the bodies, the product of the stiffness multiplied by the size difference from its resting length. */
        get stiffness(): float64
        set stiffness(value: float64)
        
        /** The spring joint's damping ratio. A value between `0` and `1`. When the two bodies move into different directions the system tries to align them to the spring axis again. A high [member damping] value forces the attached bodies to align faster. */
        get damping(): float64
        set damping(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDampedSpringJoint2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDampedSpringJoint2D;
    }
    namespace Decal {
        enum DecalTexture {
            TextureAlbedo = 0,
            TextureNormal = 1,
            TextureOrm = 2,
            TextureEmission = 3,
            TextureMax = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDecal extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDecal extends __NameMapVisualInstance3D {
        set_texture: "setTexture";
        get_texture: "getTexture";
        texture_albedo: "textureAlbedo";
        texture_normal: "textureNormal";
        texture_orm: "textureOrm";
        texture_emission: "textureEmission";
        emission_energy: "emissionEnergy";
        albedo_mix: "albedoMix";
        normal_fade: "normalFade";
        upper_fade: "upperFade";
        lower_fade: "lowerFade";
        distance_fade_enabled: "distanceFadeEnabled";
        distance_fade_begin: "distanceFadeBegin";
        distance_fade_length: "distanceFadeLength";
        cull_mask: "cullMask";
    }
    /** Node that projects a texture onto a [MeshInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_decal.html  
     */
    class Decal<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** Sets the [Texture2D] associated with the specified [enum DecalTexture]. This is a convenience method, in most cases you should access the texture directly.  
         *  For example, instead of `$Decal.set_texture(Decal.TEXTURE_ALBEDO, albedo_tex)`, use `$Decal.texture_albedo = albedo_tex`.  
         *  One case where this is better than accessing the texture directly is when you want to copy one Decal's textures to another. For example:  
         *    
         */
        setTexture(type: Decal.DecalTexture, texture: Texture2D): void
        
        /** Returns the [Texture2D] associated with the specified [enum DecalTexture]. This is a convenience method, in most cases you should access the texture directly.  
         *  For example, instead of `albedo_tex = $Decal.get_texture(Decal.TEXTURE_ALBEDO)`, use `albedo_tex = $Decal.texture_albedo`.  
         *  One case where this is better than accessing the texture directly is when you want to copy one Decal's textures to another. For example:  
         *    
         */
        getTexture(type: Decal.DecalTexture): null | Texture2D
        
        /** Sets the size of the [AABB] used by the decal. All dimensions must be set to a value greater than zero (they will be clamped to `0.001` if this is not the case). The AABB goes from `-size/2` to `size/2`.  
         *      
         *  **Note:** To improve culling efficiency of "hard surface" decals, set their [member upper_fade] and [member lower_fade] to `0.0` and set the Y component of the [member size] as low as possible. This will reduce the decals' AABB size without affecting their appearance.  
         */
        get size(): Vector3
        set size(value: Vector3)
        
        /** [Texture2D] with the base [Color] of the Decal. Either this or the [member texture_emission] must be set for the Decal to be visible. Use the alpha channel like a mask to smoothly blend the edges of the decal with the underlying object.  
         *      
         *  **Note:** Unlike [BaseMaterial3D] whose filter mode can be adjusted on a per-material basis, the filter mode for [Decal] textures is set globally with [member ProjectSettings.rendering/textures/decals/filter].  
         */
        get textureAlbedo(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D
        set textureAlbedo(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D)
        
        /** [Texture2D] with the per-pixel normal map for the decal. Use this to add extra detail to decals.  
         *      
         *  **Note:** Unlike [BaseMaterial3D] whose filter mode can be adjusted on a per-material basis, the filter mode for [Decal] textures is set globally with [member ProjectSettings.rendering/textures/decals/filter].  
         *      
         *  **Note:** Setting this texture alone will not result in a visible decal, as [member texture_albedo] must also be set. To create a normal-only decal, load an albedo texture into [member texture_albedo] and set [member albedo_mix] to `0.0`. The albedo texture's alpha channel will be used to determine where the underlying surface's normal map should be overridden (and its intensity).  
         */
        get textureNormal(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D
        set textureNormal(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D)
        
        /** [Texture2D] storing ambient occlusion, roughness, and metallic for the decal. Use this to add extra detail to decals.  
         *      
         *  **Note:** Unlike [BaseMaterial3D] whose filter mode can be adjusted on a per-material basis, the filter mode for [Decal] textures is set globally with [member ProjectSettings.rendering/textures/decals/filter].  
         *      
         *  **Note:** Setting this texture alone will not result in a visible decal, as [member texture_albedo] must also be set. To create an ORM-only decal, load an albedo texture into [member texture_albedo] and set [member albedo_mix] to `0.0`. The albedo texture's alpha channel will be used to determine where the underlying surface's ORM map should be overridden (and its intensity).  
         *      
         *  **Note:** Due to technical limitations, modifying the underlying surface's roughness using [member texture_orm] does  *not*  affect screen-space reflections ([member Environment.ssr_enabled]), reflections from [VoxelGI], and reflections from SDFGI ([member Environment.sdfgi_enabled]). Only reflections from [ReflectionProbe]s are affected.  
         */
        get textureOrm(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D
        set textureOrm(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D)
        
        /** [Texture2D] with the emission [Color] of the Decal. Either this or the [member texture_albedo] must be set for the Decal to be visible. Use the alpha channel like a mask to smoothly blend the edges of the decal with the underlying object.  
         *      
         *  **Note:** Unlike [BaseMaterial3D] whose filter mode can be adjusted on a per-material basis, the filter mode for [Decal] textures is set globally with [member ProjectSettings.rendering/textures/decals/filter].  
         */
        get textureEmission(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D
        set textureEmission(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture | StreamedTexture2D)
        
        /** Energy multiplier for the emission texture. This will make the decal emit light at a higher or lower intensity, independently of the albedo color. See also [member modulate]. */
        get emissionEnergy(): float64
        set emissionEnergy(value: float64)
        
        /** Changes the [Color] of the Decal by multiplying the albedo and emission colors with this value. The alpha component is only taken into account when multiplying the albedo color, not the emission color. See also [member emission_energy] and [member albedo_mix] to change the emission and albedo intensity independently of each other. */
        get modulate(): Color
        set modulate(value: Color)
        
        /** Blends the albedo [Color] of the decal with albedo [Color] of the underlying mesh. This can be set to `0.0` to create a decal that only affects normal or ORM. In this case, an albedo texture is still required as its alpha channel will determine where the normal and ORM will be overridden. See also [member modulate]. */
        get albedoMix(): float64
        set albedoMix(value: float64)
        
        /** Fades the Decal if the angle between the Decal's [AABB] and the target surface becomes too large. A value of `0` projects the Decal regardless of angle, a value of `1` limits the Decal to surfaces that are nearly perpendicular.  
         *      
         *  **Note:** Setting [member normal_fade] to a value greater than `0.0` has a small performance cost due to the added normal angle computations.  
         */
        get normalFade(): float64
        set normalFade(value: float64)
        
        /** Sets the curve over which the decal will fade as the surface gets further from the center of the [AABB]. Only positive values are valid (negative values will be clamped to `0.0`). See also [member lower_fade]. */
        get upperFade(): float64
        set upperFade(value: float64)
        
        /** Sets the curve over which the decal will fade as the surface gets further from the center of the [AABB]. Only positive values are valid (negative values will be clamped to `0.0`). See also [member upper_fade]. */
        get lowerFade(): float64
        set lowerFade(value: float64)
        
        /** If `true`, decals will smoothly fade away when far from the active [Camera3D] starting at [member distance_fade_begin]. The Decal will fade out over [member distance_fade_begin] + [member distance_fade_length], after which it will be culled and not sent to the shader at all. Use this to reduce the number of active Decals in a scene and thus improve performance. */
        get distanceFadeEnabled(): boolean
        set distanceFadeEnabled(value: boolean)
        
        /** The distance from the camera at which the Decal begins to fade away (in 3D units). */
        get distanceFadeBegin(): float64
        set distanceFadeBegin(value: float64)
        
        /** The distance over which the Decal fades (in 3D units). The Decal becomes slowly more transparent over this distance and is completely invisible at the end. Higher values result in a smoother fade-out transition, which is more suited when the camera moves fast. */
        get distanceFadeLength(): float64
        set distanceFadeLength(value: float64)
        
        /** Specifies which [member VisualInstance3D.layers] this decal will project on. By default, Decals affect all layers. This is used so you can specify which types of objects receive the Decal and which do not. This is especially useful so you can ensure that dynamic objects don't accidentally receive a Decal intended for the terrain under them. */
        get cullMask(): int64
        set cullMask(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDecal;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDecal;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDirAccess extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDirAccess extends __NameMapRefCounted {
        get_open_error: "getOpenError";
        create_temp: "createTemp";
        list_dir_begin: "listDirBegin";
        get_next: "getNext";
        current_is_dir: "currentIsDir";
        list_dir_end: "listDirEnd";
        get_files: "getFiles";
        get_files_at: "getFilesAt";
        get_directories: "getDirectories";
        get_directories_at: "getDirectoriesAt";
        get_drive_count: "getDriveCount";
        get_drive_name: "getDriveName";
        get_drive_label: "getDriveLabel";
        get_current_drive: "getCurrentDrive";
        change_dir: "changeDir";
        get_current_dir: "getCurrentDir";
        make_dir: "makeDir";
        make_dir_absolute: "makeDirAbsolute";
        make_dir_recursive: "makeDirRecursive";
        make_dir_recursive_absolute: "makeDirRecursiveAbsolute";
        file_exists: "fileExists";
        dir_exists: "dirExists";
        dir_exists_absolute: "dirExistsAbsolute";
        get_space_left: "getSpaceLeft";
        copy_absolute: "copyAbsolute";
        rename_absolute: "renameAbsolute";
        remove_absolute: "removeAbsolute";
        is_link: "isLink";
        read_link: "readLink";
        create_link: "createLink";
        is_bundle: "isBundle";
        get_filesystem_type: "getFilesystemType";
        is_case_sensitive: "isCaseSensitive";
        is_equivalent: "isEquivalent";
        include_navigational: "includeNavigational";
        include_hidden: "includeHidden";
    }
    /** Provides methods for managing directories and their content.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_diraccess.html  
     */
    class DirAccess extends RefCounted {
        constructor(identifier?: any)
        /** Creates a new [DirAccess] object and opens an existing directory of the filesystem. The [param path] argument can be within the project tree (`res://folder`), the user directory (`user://folder`) or an absolute path of the user filesystem (e.g. `/tmp/folder` or `C:\tmp\folder`).  
         *  Returns `null` if opening the directory failed. You can use [method get_open_error] to check the error that occurred.  
         */
        static open(path: string): null | DirAccess
        
        /** Returns the result of the last [method open] call in the current thread. */
        static getOpenError(): GError
        
        /** Creates a temporary directory. This directory will be freed when the returned [DirAccess] is freed.  
         *  If [param prefix] is not empty, it will be prefixed to the directory name, separated by a `-`.  
         *  If [param keep] is `true`, the directory is not deleted when the returned [DirAccess] is freed.  
         *  Returns `null` if opening the directory failed. You can use [method get_open_error] to check the error that occurred.  
         */
        static createTemp(prefix?: string /* = '' */, keep?: boolean /* = false */): DirAccess
        
        /** Initializes the stream used to list all files and directories using the [method get_next] function, closing the currently opened stream if needed. Once the stream has been processed, it should typically be closed with [method list_dir_end].  
         *  Affected by [member include_hidden] and [member include_navigational].  
         *      
         *  **Note:** The order of files and directories returned by this method is not deterministic, and can vary between operating systems. If you want a list of all files or folders sorted alphabetically, use [method get_files] or [method get_directories].  
         */
        listDirBegin(): GError
        
        /** Returns the next element (file or directory) in the current directory.  
         *  The name of the file or directory is returned (and not its full path). Once the stream has been fully processed, the method returns an empty [String] and closes the stream automatically (i.e. [method list_dir_end] would not be mandatory in such a case).  
         */
        getNext(): string
        
        /** Returns whether the current item processed with the last [method get_next] call is a directory (`.` and `..` are considered directories). */
        currentIsDir(): boolean
        
        /** Closes the current stream opened with [method list_dir_begin] (whether it has been fully processed with [method get_next] does not matter). */
        listDirEnd(): void
        
        /** Returns a [PackedStringArray] containing filenames of the directory contents, excluding directories. The array is sorted alphabetically.  
         *  Affected by [member include_hidden].  
         *      
         *  **Note:** When used on a `res://` path in an exported project, only the files actually included in the PCK at the given folder level are returned. In practice, this means that since imported resources are stored in a top-level `.godot/` folder, only paths to `*.gd` and `*.import` files are returned (plus a few files such as `project.godot` or `project.binary` and the project icon). In an exported project, the list of returned files will also vary depending on whether [member ProjectSettings.editor/export/convert_text_resources_to_binary] is `true`.  
         */
        getFiles(): PackedStringArray
        
        /** Returns a [PackedStringArray] containing filenames of the directory contents, excluding directories, at the given [param path]. The array is sorted alphabetically.  
         *  Use [method get_files] if you want more control of what gets included.  
         *      
         *  **Note:** When used on a `res://` path in an exported project, only the files included in the PCK at the given folder level are returned. In practice, this means that since imported resources are stored in a top-level `.godot/` folder, only paths to `.gd` and `.import` files are returned (plus a few other files, such as `project.godot` or `project.binary` and the project icon). In an exported project, the list of returned files will also vary depending on [member ProjectSettings.editor/export/convert_text_resources_to_binary].  
         */
        static getFilesAt(path: string): PackedStringArray
        
        /** Returns a [PackedStringArray] containing filenames of the directory contents, excluding files. The array is sorted alphabetically.  
         *  Affected by [member include_hidden] and [member include_navigational].  
         *      
         *  **Note:** The returned directories in the editor and after exporting in the `res://` directory may differ as some files are converted to engine-specific formats when exported.  
         */
        getDirectories(): PackedStringArray
        
        /** Returns a [PackedStringArray] containing filenames of the directory contents, excluding files, at the given [param path]. The array is sorted alphabetically.  
         *  Use [method get_directories] if you want more control of what gets included.  
         *      
         *  **Note:** The returned directories in the editor and after exporting in the `res://` directory may differ as some files are converted to engine-specific formats when exported.  
         */
        static getDirectoriesAt(path: string): PackedStringArray
        
        /** On Windows, returns the number of drives (partitions) mounted on the current filesystem.  
         *  On macOS and Android, returns the number of mounted volumes.  
         *  On Linux, returns the number of mounted volumes and GTK 3 bookmarks.  
         *  On other platforms, the method returns 0.  
         */
        static getDriveCount(): int64
        
        /** On Windows, returns the name of the drive (partition) passed as an argument (e.g. `C:`).  
         *  On macOS, returns the path to the mounted volume passed as an argument.  
         *  On Linux, returns the path to the mounted volume or GTK 3 bookmark passed as an argument.  
         *  On Android (API level 30+), returns the path to the mounted volume as an argument.  
         *  On other platforms, or if the requested drive does not exist, returns an empty String.  
         */
        static getDriveName(idx: int64): string
        
        /** On Windows, returns the label of the drive (partition) passed as an argument.  
         *  On other platforms, or if the requested drive does not exist, returns an empty String.  
         */
        static getDriveLabel(idx: int64): string
        
        /** Returns the currently opened directory's drive index. See [method get_drive_name] to convert returned index to the name of the drive. */
        getCurrentDrive(): int64
        
        /** Changes the currently opened directory to the one passed as an argument. The argument can be relative to the current directory (e.g. `newdir` or `../newdir`), or an absolute path (e.g. `/tmp/newdir` or `res://somedir/newdir`).  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         *      
         *  **Note:** The new directory must be within the same scope, e.g. when you had opened a directory inside `res://`, you can't change it to `user://` directory. If you need to open a directory in another access scope, use [method open] to create a new instance instead.  
         */
        changeDir(toDir: string): GError
        
        /** Returns the absolute path to the currently opened directory (e.g. `res://folder` or `C:\tmp\folder`). */
        getCurrentDir(includeDrive?: boolean /* = true */): string
        
        /** Creates a directory. The argument can be relative to the current directory, or an absolute path. The target directory should be placed in an already existing directory (to create the full path recursively, see [method make_dir_recursive]).  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         */
        makeDir(path: string): GError
        
        /** Static version of [method make_dir]. Supports only absolute paths. */
        static makeDirAbsolute(path: string): GError
        
        /** Creates a target directory and all necessary intermediate directories in its path, by calling [method make_dir] recursively. The argument can be relative to the current directory, or an absolute path.  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         */
        makeDirRecursive(path: string): GError
        
        /** Static version of [method make_dir_recursive]. Supports only absolute paths. */
        static makeDirRecursiveAbsolute(path: string): GError
        
        /** Returns whether the target file exists. The argument can be relative to the current directory, or an absolute path.  
         *  For a static equivalent, use [method FileAccess.file_exists].  
         *      
         *  **Note:** Many resources types are imported (e.g. textures or sound files), and their source asset will not be included in the exported game, as only the imported version is used. See [method ResourceLoader.exists] for an alternative approach that takes resource remapping into account.  
         */
        fileExists(path: string): boolean
        
        /** Returns whether the target directory exists. The argument can be relative to the current directory, or an absolute path.  
         *      
         *  **Note:** The returned [bool] in the editor and after exporting when used on a path in the `res://` directory may be different. Some files are converted to engine-specific formats when exported, potentially changing the directory structure.  
         */
        dirExists(path: string): boolean
        
        /** Static version of [method dir_exists]. Supports only absolute paths.  
         *      
         *  **Note:** The returned [bool] in the editor and after exporting when used on a path in the `res://` directory may be different. Some files are converted to engine-specific formats when exported, potentially changing the directory structure.  
         */
        static dirExistsAbsolute(path: string): boolean
        
        /** Returns the available space on the current directory's disk, in bytes. Returns `0` if the platform-specific method to query the available space fails. */
        getSpaceLeft(): int64
        
        /** Copies the [param from] file to the [param to] destination. Both arguments should be paths to files, either relative or absolute. If the destination file exists and is not access-protected, it will be overwritten.  
         *  If [param chmod_flags] is different than `-1`, the Unix permissions for the destination path will be set to the provided value, if available on the current operating system.  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         */
        copy(from: string, to: string, chmodFlags?: int64 /* = -1 */): GError
        
        /** Static version of [method copy]. Supports only absolute paths. */
        static copyAbsolute(from: string, to: string, chmodFlags?: int64 /* = -1 */): GError
        
        /** Renames (move) the [param from] file or directory to the [param to] destination. Both arguments should be paths to files or directories, either relative or absolute. If the destination file or directory exists and is not access-protected, it will be overwritten.  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         */
        rename(from: string, to: string): GError
        
        /** Static version of [method rename]. Supports only absolute paths. */
        static renameAbsolute(from: string, to: string): GError
        
        /** Permanently deletes the target file or an empty directory. The argument can be relative to the current directory, or an absolute path. If the target directory is not empty, the operation will fail.  
         *  If you don't want to delete the file/directory permanently, use [method OS.move_to_trash] instead.  
         *  Returns one of the [enum Error] code constants ([constant OK] on success).  
         */
        remove(path: string): GError
        
        /** Static version of [method remove]. Supports only absolute paths. */
        static removeAbsolute(path: string): GError
        
        /** Returns `true` if the file or directory is a symbolic link, directory junction, or other reparse point.  
         *      
         *  **Note:** This method is implemented on macOS, Linux, and Windows.  
         */
        isLink(path: string): boolean
        
        /** Returns target of the symbolic link.  
         *      
         *  **Note:** This method is implemented on macOS, Linux, and Windows.  
         */
        readLink(path: string): string
        
        /** Creates symbolic link between files or folders.  
         *      
         *  **Note:** On Windows, this method works only if the application is running with elevated privileges or Developer Mode is enabled.  
         *      
         *  **Note:** This method is implemented on macOS, Linux, and Windows.  
         */
        createLink(source: string, target: string): GError
        
        /** Returns `true` if the directory is a macOS bundle.  
         *      
         *  **Note:** This method is implemented on macOS.  
         */
        isBundle(path: string): boolean
        
        /** Returns file system type name of the current directory's disk. Returned values are uppercase strings like `NTFS`, `FAT32`, `EXFAT`, `APFS`, `EXT4`, `BTRFS`, and so on.  
         *      
         *  **Note:** This method is implemented on macOS, Linux, Windows and for PCK virtual file system.  
         */
        getFilesystemType(): string
        
        /** Returns `true` if the file system or directory use case sensitive file names.  
         *      
         *  **Note:** This method is implemented on macOS, Linux (for EXT4 and F2FS filesystems only) and Windows. On other platforms, it always returns `true`.  
         */
        isCaseSensitive(path: string): boolean
        
        /** Returns `true` if paths [param path_a] and [param path_b] resolve to the same file system object. Returns `false` otherwise, even if the files are bit-for-bit identical (e.g., identical copies of the file that are not symbolic links). */
        isEquivalent(pathA: string, pathB: string): boolean
        
        /** If `true`, `.` and `..` are included when navigating the directory.  
         *  Affects [method list_dir_begin] and [method get_directories].  
         */
        get includeNavigational(): boolean
        set includeNavigational(value: boolean)
        
        /** If `true`, hidden files are included when navigating the directory.  
         *  Affects [method list_dir_begin], [method get_directories] and [method get_files].  
         */
        get includeHidden(): boolean
        set includeHidden(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDirAccess;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDirAccess;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDirectionalLight2D extends __RPCMapLight2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDirectionalLight2D extends __NameMapLight2D {
        max_distance: "maxDistance";
    }
    /** Directional 2D light from a distance.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_directionallight2d.html  
     */
    class DirectionalLight2D<Map extends NodePathMap = any> extends Light2D<Map> {
        constructor(identifier?: any)
        /** The height of the light. Used with 2D normal mapping. Ranges from 0 (parallel to the plane) to 1 (perpendicular to the plane). */
        get height(): float64
        set height(value: float64)
        
        /** The maximum distance from the camera center objects can be before their shadows are culled (in pixels). Decreasing this value can prevent objects located outside the camera from casting shadows (while also improving performance). [member Camera2D.zoom] is not taken into account by [member max_distance], which means that at higher zoom values, shadows will appear to fade out sooner when zooming onto a given point. */
        get maxDistance(): float64
        set maxDistance(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDirectionalLight2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDirectionalLight2D;
    }
    namespace DirectionalLight3D {
        enum ShadowMode {
            ShadowOrthogonal = 0,
            ShadowParallel2Splits = 1,
            ShadowParallel4Splits = 2,
        }
        enum SkyMode {
            SkyModeLightAndSky = 0,
            SkyModeLightOnly = 1,
            SkyModeSkyOnly = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDirectionalLight3D extends __RPCMapLight3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDirectionalLight3D extends __NameMapLight3D {
        sky_mode: "skyMode";
        directional_shadow_mode: "directionalShadowMode";
        directional_shadow_split_1: "directionalShadowSplit1";
        directional_shadow_split_2: "directionalShadowSplit2";
        directional_shadow_split_3: "directionalShadowSplit3";
        directional_shadow_blend_splits: "directionalShadowBlendSplits";
        directional_shadow_fade_start: "directionalShadowFadeStart";
        directional_shadow_max_distance: "directionalShadowMaxDistance";
        directional_shadow_pancake_size: "directionalShadowPancakeSize";
    }
    /** Directional light from a distance, as from the Sun.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_directionallight3d.html  
     */
    class DirectionalLight3D<Map extends NodePathMap = any> extends Light3D<Map> {
        constructor(identifier?: any)
        /** Whether this [DirectionalLight3D] is visible in the sky, in the scene, or both in the sky and in the scene. */
        get skyMode(): int64
        set skyMode(value: int64)
        
        /** The light's shadow rendering algorithm. */
        get directionalShadowMode(): int64
        set directionalShadowMode(value: int64)
        
        /** The distance from camera to shadow split 1. Relative to [member directional_shadow_max_distance]. Only used when [member directional_shadow_mode] is [constant SHADOW_PARALLEL_2_SPLITS] or [constant SHADOW_PARALLEL_4_SPLITS]. */
        get directionalShadowSplit1(): float64
        set directionalShadowSplit1(value: float64)
        
        /** The distance from shadow split 1 to split 2. Relative to [member directional_shadow_max_distance]. Only used when [member directional_shadow_mode] is [constant SHADOW_PARALLEL_4_SPLITS]. */
        get directionalShadowSplit2(): float64
        set directionalShadowSplit2(value: float64)
        
        /** The distance from shadow split 2 to split 3. Relative to [member directional_shadow_max_distance]. Only used when [member directional_shadow_mode] is [constant SHADOW_PARALLEL_4_SPLITS]. */
        get directionalShadowSplit3(): float64
        set directionalShadowSplit3(value: float64)
        
        /** If `true`, shadow detail is sacrificed in exchange for smoother transitions between splits. Enabling shadow blend splitting also has a moderate performance cost. This is ignored when [member directional_shadow_mode] is [constant SHADOW_ORTHOGONAL]. */
        get directionalShadowBlendSplits(): boolean
        set directionalShadowBlendSplits(value: boolean)
        
        /** Proportion of [member directional_shadow_max_distance] at which point the shadow starts to fade. At [member directional_shadow_max_distance], the shadow will disappear. The default value is a balance between smooth fading and distant shadow visibility. If the camera moves fast and the [member directional_shadow_max_distance] is low, consider lowering [member directional_shadow_fade_start] below `0.8` to make shadow transitions less noticeable. On the other hand, if you tuned [member directional_shadow_max_distance] to cover the entire scene, you can set [member directional_shadow_fade_start] to `1.0` to prevent the shadow from fading in the distance (it will suddenly cut off instead). */
        get directionalShadowFadeStart(): float64
        set directionalShadowFadeStart(value: float64)
        
        /** The maximum distance for shadow splits. Increasing this value will make directional shadows visible from further away, at the cost of lower overall shadow detail and performance (since more objects need to be included in the directional shadow rendering). */
        get directionalShadowMaxDistance(): float64
        set directionalShadowMaxDistance(value: float64)
        
        /** Sets the size of the directional shadow pancake. The pancake offsets the start of the shadow's camera frustum to provide a higher effective depth resolution for the shadow. However, a high pancake size can cause artifacts in the shadows of large objects that are close to the edge of the frustum. Reducing the pancake size can help. Setting the size to `0` turns off the pancaking effect. */
        get directionalShadowPancakeSize(): float64
        set directionalShadowPancakeSize(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDirectionalLight3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDirectionalLight3D;
    }
    namespace DrawableTexture2D {
        enum DrawableFormat {
            DrawableFormatRgba8 = 0,
            DrawableFormatRgba8Srgb = 1,
            DrawableFormatRgbah = 2,
            DrawableFormatRgbaf = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapDrawableTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapDrawableTexture2D extends __NameMapTexture2D {
        set_format: "setFormat";
        set_use_mipmaps: "setUseMipmaps";
        get_use_mipmaps: "getUseMipmaps";
        blit_rect: "blitRect";
        blit_rect_multi: "blitRectMulti";
        generate_mipmaps: "generateMipmaps";
    }
    /** A 2D texture that supports drawing to itself via Blit calls.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_drawabletexture2d.html  
     */
    class DrawableTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** Sets the format of this DrawableTexture. */
        setFormat(format: DrawableTexture2D.DrawableFormat): void
        
        /** Sets if mipmaps should be used on this DrawableTexture. */
        setUseMipmaps(mipmaps: boolean): void
        
        /** Returns `true` if mipmaps are set to be used on this DrawableTexture. */
        getUseMipmaps(): boolean
        
        /** Initializes the DrawableTexture to a White texture of the given [param width], [param height], and [param format]. */
        setup(width: int64, height: int64, format: DrawableTexture2D.DrawableFormat, color?: Color /* = new Color(1, 1, 1, 1) */, useMipmaps?: boolean /* = false */): void
        
        /** Draws to given [param rect] on this texture by copying from the given [param source]. A [param modulate] color can be passed in for the shader to use, but defaults to White. The [param mipmap] value can specify a draw to a lower mipmap level. The [param material] parameter can take a ShaderMaterial with a TextureBlit Shader for custom drawing behavior. */
        blitRect(rect: Rect2I, source: Texture2D, modulate?: Color /* = new Color(1, 1, 1, 1) */, mipmap?: int64 /* = 0 */, material?: Material): void
        
        /** Draws to the given [param rect] on this texture, as well as on up to 3 DrawableTexture [param extra_targets]. All [param extra_targets] must be the same size and DrawableFormat as the original target, otherwise the Shader may fail. Expects up to 4 Texture [param sources], but will replace missing [param sources] with default Black Textures. */
        blitRectMulti(rect: Rect2I, sources: GArray<Texture2D>, extraTargets: GArray<DrawableTexture2D>, modulate?: Color /* = new Color(1, 1, 1, 1) */, mipmap?: int64 /* = 0 */, material?: Material): void
        
        /** Re-calculates the mipmaps for this texture on demand. */
        generateMipmaps(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapDrawableTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapDrawableTexture2D;
    }
    namespace ENetConnection {
        enum CompressionMode {
            CompressNone = 0,
            CompressRangeCoder = 1,
            CompressFastlz = 2,
            CompressZlib = 3,
            CompressZstd = 4,
        }
        enum EventType {
            EventError = -1,
            EventNone = 0,
            EventConnect = 1,
            EventDisconnect = 2,
            EventReceive = 3,
        }
        enum HostStatistic {
            HostTotalSentData = 0,
            HostTotalSentPackets = 1,
            HostTotalReceivedData = 2,
            HostTotalReceivedPackets = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapENetConnection extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapENetConnection extends __NameMapRefCounted {
        create_host_bound: "createHostBound";
        create_host: "createHost";
        connect_to_host: "connectToHost";
        bandwidth_limit: "bandwidthLimit";
        channel_limit: "channelLimit";
        dtls_server_setup: "dtlsServerSetup";
        dtls_client_setup: "dtlsClientSetup";
        refuse_new_connections: "refuseNewConnections";
        pop_statistic: "popStatistic";
        get_max_channels: "getMaxChannels";
        get_local_port: "getLocalPort";
        get_peers: "getPeers";
        socket_send: "socketSend";
    }
    /** A wrapper class for an [url=http://enet.bespin.org/group__host.html]ENetHost[/url].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_enetconnection.html  
     */
    class ENetConnection extends RefCounted {
        constructor(identifier?: any)
        /** Creates an ENetHost bound to the given [param bind_address] and [param bind_port] that allows up to [param max_peers] connected peers, each allocating up to [param max_channels] channels, optionally limiting bandwidth to [param in_bandwidth] and [param out_bandwidth] (if greater than zero).  
         *      
         *  **Note:** It is necessary to create a host in both client and server in order to establish a connection.  
         */
        createHostBound(bindAddress: string, bindPort: int64, maxPeers?: int64 /* = 32 */, maxChannels?: int64 /* = 0 */, inBandwidth?: int64 /* = 0 */, outBandwidth?: int64 /* = 0 */): GError
        
        /** Creates an ENetHost that allows up to [param max_peers] connected peers, each allocating up to [param max_channels] channels, optionally limiting bandwidth to [param in_bandwidth] and [param out_bandwidth] (if greater than zero).  
         *  This method binds a random available dynamic UDP port on the host machine at the  *unspecified*  address. Use [method create_host_bound] to specify the address and port.  
         *      
         *  **Note:** It is necessary to create a host in both client and server in order to establish a connection.  
         */
        createHost(maxPeers?: int64 /* = 32 */, maxChannels?: int64 /* = 0 */, inBandwidth?: int64 /* = 0 */, outBandwidth?: int64 /* = 0 */): GError
        
        /** Destroys the host and all resources associated with it. */
        destroy(): void
        
        /** Initiates a connection to a foreign [param address] using the specified [param port] and allocating the requested [param channels]. Optional [param data] can be passed during connection in the form of a 32 bit integer.  
         *      
         *  **Note:** You must call either [method create_host] or [method create_host_bound] on both ends before calling this method.  
         */
        connectToHost(address: string, port: int64, channels?: int64 /* = 0 */, data?: int64 /* = 0 */): null | ENetPacketPeer
        
        /** Waits for events on this connection and shuttles packets between the host and its peers, with the given [param timeout] (in milliseconds). The returned [Array] will have 4 elements. An [enum EventType], the [ENetPacketPeer] which generated the event, the event associated data (if any), the event associated channel (if any). If the generated event is [constant EVENT_RECEIVE], the received packet will be queued to the associated [ENetPacketPeer].  
         *  Call this function regularly to handle connections, disconnections, and to receive new packets.  
         *      
         *  **Note:** This method must be called on both ends involved in the event (sending and receiving hosts).  
         */
        service(timeout?: int64 /* = 0 */): GArray
        
        /** Sends any queued packets on the host specified to its designated peers. */
        flush(): void
        
        /** Adjusts the bandwidth limits of a host. */
        bandwidthLimit(inBandwidth?: int64 /* = 0 */, outBandwidth?: int64 /* = 0 */): void
        
        /** Limits the maximum allowed channels of future incoming connections. */
        channelLimit(limit: int64): void
        
        /** Queues a [param packet] to be sent to all peers associated with the host over the specified [param channel]. See [ENetPacketPeer] `FLAG_*` constants for available packet flags. */
        broadcast(channel: int64, packet: PackedByteArray | byte[] | ArrayBuffer, flags: int64): void
        
        /** Sets the compression method used for network packets. These have different tradeoffs of compression speed versus bandwidth, you may need to test which one works best for your use case if you use compression at all.  
         *      
         *  **Note:** Most games' network design involve sending many small packets frequently (smaller than 4 KB each). If in doubt, it is recommended to keep the default compression algorithm as it works best on these small packets.  
         *      
         *  **Note:** The compression mode must be set to the same value on both the server and all its clients. Clients will fail to connect if the compression mode set on the client differs from the one set on the server.  
         */
        compress(mode: ENetConnection.CompressionMode): void
        
        /** Configure this ENetHost to use the custom Godot extension allowing DTLS encryption for ENet servers. Call this right after [method create_host_bound] to have ENet expect peers to connect using DTLS. See [method TLSOptions.server]. */
        dtlsServerSetup(serverOptions: TlsOptions): GError
        
        /** Configure this ENetHost to use the custom Godot extension allowing DTLS encryption for ENet clients. Call this before [method connect_to_host] to have ENet connect using DTLS validating the server certificate against [param hostname]. You can pass the optional [param client_options] parameter to customize the trusted certification authorities, or disable the common name verification. See [method TLSOptions.client] and [method TLSOptions.client_unsafe]. */
        dtlsClientSetup(hostname: string, clientOptions?: TlsOptions): GError
        
        /** Configures the DTLS server to automatically drop new connections.  
         *      
         *  **Note:** This method is only relevant after calling [method dtls_server_setup].  
         */
        refuseNewConnections(refuse: boolean): void
        
        /** Returns and resets host statistics. */
        popStatistic(statistic: ENetConnection.HostStatistic): float64
        
        /** Returns the maximum number of channels allowed for connected peers. */
        getMaxChannels(): int64
        
        /** Returns the local port to which this peer is bound. */
        getLocalPort(): int64
        
        /** Returns the list of peers associated with this host.  
         *      
         *  **Note:** This list might include some peers that are not fully connected or are still being disconnected.  
         */
        getPeers(): GArray<ENetPacketPeer>
        
        /** Sends a [param packet] toward a destination from the address and port currently bound by this ENetConnection instance.  
         *  This is useful as it serves to establish entries in NAT routing tables on all devices between this bound instance and the public facing internet, allowing a prospective client's connection packets to be routed backward through the NAT device(s) between the public internet and this host.  
         *  This requires forward knowledge of a prospective client's address and communication port as seen by the public internet - after any NAT devices have handled their connection request. This information can be obtained by a [url=https://en.wikipedia.org/wiki/STUN]STUN[/url] service, and must be handed off to your host by an entity that is not the prospective client. This will never work for a client behind a Symmetric NAT due to the nature of the Symmetric NAT routing algorithm, as their IP and Port cannot be known beforehand.  
         */
        socketSend(destinationAddress: string, destinationPort: int64, packet: PackedByteArray | byte[] | ArrayBuffer): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapENetConnection;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapENetConnection;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapENetMultiplayerPeer extends __RPCMapMultiplayerPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapENetMultiplayerPeer extends __NameMapMultiplayerPeer {
        create_server: "createServer";
        create_client: "createClient";
        create_mesh: "createMesh";
        add_mesh_peer: "addMeshPeer";
        set_bind_ip: "setBindIP";
        get_peer: "getPeer";
    }
    /** A MultiplayerPeer implementation using the [url=http://enet.bespin.org/index.html]ENet[/url] library.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_enetmultiplayerpeer.html  
     */
    class ENetMultiplayerPeer extends MultiplayerPeer {
        constructor(identifier?: any)
        /** Create server that listens to connections via [param port]. The port needs to be an available, unused port between 0 and 65535. Note that ports below 1024 are privileged and may require elevated permissions depending on the platform. To change the interface the server listens on, use [method set_bind_ip]. The default IP is the wildcard `"*"`, which listens on all available interfaces. [param max_clients] is the maximum number of clients that are allowed at once, any number up to 4095 may be used, although the achievable number of simultaneous clients may be far lower and depends on the application. For additional details on the bandwidth parameters, see [method create_client]. Returns [constant OK] if a server was created, [constant ERR_ALREADY_IN_USE] if this ENetMultiplayerPeer instance already has an open connection (in which case you need to call [method MultiplayerPeer.close] first) or [constant ERR_CANT_CREATE] if the server could not be created. */
        createServer(port: int64, maxClients?: int64 /* = 32 */, maxChannels?: int64 /* = 0 */, inBandwidth?: int64 /* = 0 */, outBandwidth?: int64 /* = 0 */): GError
        
        /** Create client that connects to a server at [param address] using specified [param port]. The given address needs to be either a fully qualified domain name (e.g. `"www.example.com"`) or an IP address in IPv4 or IPv6 format (e.g. `"192.168.1.1"`). The [param port] is the port the server is listening on. The [param channel_count] parameter can be used to specify the number of ENet channels allocated for the connection. The [param in_bandwidth] and [param out_bandwidth] parameters can be used to limit the incoming and outgoing bandwidth to the given number of bytes per second. The default of 0 means unlimited bandwidth. Note that ENet will strategically drop packets on specific sides of a connection between peers to ensure the peer's bandwidth is not overwhelmed. The bandwidth parameters also determine the window size of a connection which limits the amount of reliable packets that may be in transit at any given time. Returns [constant OK] if a client was created, [constant ERR_ALREADY_IN_USE] if this ENetMultiplayerPeer instance already has an open connection (in which case you need to call [method MultiplayerPeer.close] first) or [constant ERR_CANT_CREATE] if the client could not be created. If [param local_port] is specified, the client will also listen to the given port; this is useful for some NAT traversal techniques. */
        createClient(address: string, port: int64, channelCount?: int64 /* = 0 */, inBandwidth?: int64 /* = 0 */, outBandwidth?: int64 /* = 0 */, localPort?: int64 /* = 0 */): GError
        
        /** Initialize this [MultiplayerPeer] in mesh mode. The provided [param unique_id] will be used as the local peer network unique ID once assigned as the [member MultiplayerAPI.multiplayer_peer]. In the mesh configuration you will need to set up each new peer manually using [ENetConnection] before calling [method add_mesh_peer]. While this technique is more advanced, it allows for better control over the connection process (e.g. when dealing with NAT punch-through) and for better distribution of the network load (which would otherwise be more taxing on the server). */
        createMesh(uniqueId: int64): GError
        
        /** Add a new remote peer with the given [param peer_id] connected to the given [param host].  
         *      
         *  **Note:** The [param host] must have exactly one peer in the [constant ENetPacketPeer.STATE_CONNECTED] state.  
         */
        addMeshPeer(peerId: int64, host: ENetConnection): GError
        
        /** The IP used when creating a server. This is set to the wildcard `"*"` by default, which binds to all available interfaces. The given IP needs to be in IPv4 or IPv6 address format, for example: `"192.168.1.1"`. */
        setBindIP(ip: string): void
        
        /** Returns the [ENetPacketPeer] associated to the given [param id]. */
        getPeer(id: int64): null | ENetPacketPeer
        
        /** The underlying [ENetConnection] created after [method create_client] and [method create_server]. */
        get host(): null | ENetConnection
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapENetMultiplayerPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapENetMultiplayerPeer;
    }
    namespace ENetPacketPeer {
        enum PeerState {
            StateDisconnected = 0,
            StateConnecting = 1,
            StateAcknowledgingConnect = 2,
            StateConnectionPending = 3,
            StateConnectionSucceeded = 4,
            StateConnected = 5,
            StateDisconnectLater = 6,
            StateDisconnecting = 7,
            StateAcknowledgingDisconnect = 8,
            StateZombie = 9,
        }
        enum PeerStatistic {
            PeerPacketLoss = 0,
            PeerPacketLossVariance = 1,
            PeerPacketLossEpoch = 2,
            PeerRoundTripTime = 3,
            PeerRoundTripTimeVariance = 4,
            PeerLastRoundTripTime = 5,
            PeerLastRoundTripTimeVariance = 6,
            PeerPacketThrottle = 7,
            PeerPacketThrottleLimit = 8,
            PeerPacketThrottleCounter = 9,
            PeerPacketThrottleEpoch = 10,
            PeerPacketThrottleAcceleration = 11,
            PeerPacketThrottleDeceleration = 12,
            PeerPacketThrottleInterval = 13,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapENetPacketPeer extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapENetPacketPeer extends __NameMapPacketPeer {
        peer_disconnect: "peerDisconnect";
        peer_disconnect_later: "peerDisconnectLater";
        peer_disconnect_now: "peerDisconnectNow";
        ping_interval: "pingInterval";
        throttle_configure: "throttleConfigure";
        set_timeout: "setTimeout";
        get_packet_flags: "getPacketFlags";
        get_remote_address: "getRemoteAddress";
        get_remote_port: "getRemotePort";
        get_statistic: "getStatistic";
        get_state: "getState";
        get_channels: "getChannels";
        is_active: "isActive";
    }
    /** A wrapper class for an [url=http://enet.bespin.org/group__peer.html]ENetPeer[/url].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_enetpacketpeer.html  
     */
    class ENetPacketPeer extends PacketPeer {
        /** The reference scale for packet loss. See [method get_statistic] and [constant PEER_PACKET_LOSS]. */
        static readonly PACKET_LOSS_SCALE = 65536
        
        /** The reference value for throttle configuration. The default value is `32`. See [method throttle_configure]. */
        static readonly PACKET_THROTTLE_SCALE = 32
        
        /** Mark the packet to be sent as reliable. */
        static readonly FLAG_RELIABLE = 1
        
        /** Mark the packet to be sent unsequenced (unreliable). */
        static readonly FLAG_UNSEQUENCED = 2
        
        /** Mark the packet to be sent unreliable even if the packet is too big and needs fragmentation (increasing the chance of it being dropped). */
        static readonly FLAG_UNRELIABLE_FRAGMENT = 8
        constructor(identifier?: any)
        
        /** Request a disconnection from a peer. An [constant ENetConnection.EVENT_DISCONNECT] will be generated during [method ENetConnection.service] once the disconnection is complete. */
        peerDisconnect(data?: int64 /* = 0 */): void
        
        /** Request a disconnection from a peer, but only after all queued outgoing packets are sent. An [constant ENetConnection.EVENT_DISCONNECT] will be generated during [method ENetConnection.service] once the disconnection is complete. */
        peerDisconnectLater(data?: int64 /* = 0 */): void
        
        /** Force an immediate disconnection from a peer. No [constant ENetConnection.EVENT_DISCONNECT] will be generated. The foreign peer is not guaranteed to receive the disconnect notification, and is reset immediately upon return from this function. */
        peerDisconnectNow(data?: int64 /* = 0 */): void
        
        /** Sends a ping request to a peer. ENet automatically pings all connected peers at regular intervals, however, this function may be called to ensure more frequent ping requests. */
        ping(): void
        
        /** Sets the [param ping_interval] in milliseconds at which pings will be sent to a peer. Pings are used both to monitor the liveness of the connection and also to dynamically adjust the throttle during periods of low traffic so that the throttle has reasonable responsiveness during traffic spikes. The default ping interval is `500` milliseconds. */
        pingInterval(pingInterval: int64): void
        
        /** Forcefully disconnects a peer. The foreign host represented by the peer is not notified of the disconnection and will timeout on its connection to the local host. */
        reset(): void
        
        /** Queues a [param packet] to be sent over the specified [param channel]. See `FLAG_*` constants for available packet flags. */
        send(channel: int64, packet: PackedByteArray | byte[] | ArrayBuffer, flags: int64): GError
        
        /** Configures throttle parameter for a peer.  
         *  Unreliable packets are dropped by ENet in response to the varying conditions of the Internet connection to the peer. The throttle represents a probability that an unreliable packet should not be dropped and thus sent by ENet to the peer. By measuring fluctuations in round trip times of reliable packets over the specified [param interval], ENet will either increase the probability by the amount specified in the [param acceleration] parameter, or decrease it by the amount specified in the [param deceleration] parameter (both are ratios to [constant PACKET_THROTTLE_SCALE]).  
         *  When the throttle has a value of [constant PACKET_THROTTLE_SCALE], no unreliable packets are dropped by ENet, and so 100% of all unreliable packets will be sent.  
         *  When the throttle has a value of `0`, all unreliable packets are dropped by ENet, and so 0% of all unreliable packets will be sent.  
         *  Intermediate values for the throttle represent intermediate probabilities between 0% and 100% of unreliable packets being sent. The bandwidth limits of the local and foreign hosts are taken into account to determine a sensible limit for the throttle probability above which it should not raise even in the best of conditions.  
         */
        throttleConfigure(interval: int64, acceleration: int64, deceleration: int64): void
        
        /** Sets the timeout parameters for a peer. The timeout parameters control how and when a peer will timeout from a failure to acknowledge reliable traffic. Timeout values are expressed in milliseconds.  
         *  The [param timeout] is a factor that, multiplied by a value based on the average round trip time, will determine the timeout limit for a reliable packet. When that limit is reached, the timeout will be doubled, and the peer will be disconnected if that limit has reached [param timeout_min]. The [param timeout_max] parameter, on the other hand, defines a fixed timeout for which any packet must be acknowledged or the peer will be dropped.  
         */
        setTimeout(timeout: int64, timeoutMin: int64, timeoutMax: int64): void
        
        /** Returns the ENet flags of the next packet in the received queue. See `FLAG_*` constants for available packet flags. Note that not all flags are replicated from the sending peer to the receiving peer. */
        getPacketFlags(): int64
        
        /** Returns the IP address of this peer. */
        getRemoteAddress(): string
        
        /** Returns the remote port of this peer. */
        getRemotePort(): int64
        
        /** Returns the requested [param statistic] for this peer. */
        getStatistic(statistic: ENetPacketPeer.PeerStatistic): float64
        
        /** Returns the current peer state. */
        getState(): ENetPacketPeer.PeerState
        
        /** Returns the number of channels allocated for communication with peer. */
        getChannels(): int64
        
        /** Returns `true` if the peer is currently active (i.e. the associated [ENetConnection] is still valid). */
        isActive(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapENetPacketPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapENetPacketPeer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorCommandPalette extends __RPCMapConfirmationDialog {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorCommandPalette extends __NameMapConfirmationDialog {
        add_command: "addCommand";
        remove_command: "removeCommand";
    }
    /** Godot editor's command palette.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorcommandpalette.html  
     */
    class EditorCommandPalette<Map extends NodePathMap = any> extends ConfirmationDialog<Map> {
        constructor(identifier?: any)
        /** Adds a custom command to EditorCommandPalette.  
         *  - [param command_name]: [String] (Name of the **Command**. This is displayed to the user.)  
         *  - [param key_name]: [String] (Name of the key for a particular **Command**. This is used to uniquely identify the **Command**.)  
         *  - [param binded_callable]: [Callable] (Callable of the **Command**. This will be executed when the **Command** is selected.)  
         *  - [param shortcut_text]: [String] (Shortcut text of the **Command** if available.)  
         */
        addCommand(commandName: string, keyName: string, bindedCallable: Callable, shortcutText?: string /* = 'None' */): void
        
        /** Removes the custom command from EditorCommandPalette.  
         *  - [param key_name]: [String] (Name of the key for a particular **Command**.)  
         */
        removeCommand(keyName: string): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorCommandPalette;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorCommandPalette;
    }
    namespace EditorContextMenuPlugin {
        enum ContextMenuSlot {
            ContextSlotSceneTree = 0,
            ContextSlotFilesystem = 1,
            ContextSlotScriptEditor = 2,
            ContextSlotFilesystemCreate = 3,
            ContextSlotScriptEditorCode = 4,
            ContextSlotSceneTabs = 5,
            ContextSlot2DEditor = 6,
            ContextSlotInspectorProperty = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorContextMenuPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorContextMenuPlugin extends __NameMapRefCounted {
        _get_menu_options: "_getMenuOptions";
        _popup_menu: "_popupMenu";
        add_menu_shortcut: "addMenuShortcut";
        add_context_menu_item: "addContextMenuItem";
        add_context_menu_item_from_shortcut: "addContextMenuItemFromShortcut";
        add_context_submenu_item: "addContextSubmenuItem";
    }
    /** Plugin for adding custom context menus in the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorcontextmenuplugin.html  
     */
    class EditorContextMenuPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Called when creating a context menu, custom options can be added by using the [method add_context_menu_item] or [method add_context_menu_item_from_shortcut] functions. [param data] contains the context data, which differs depending on the context menu slot. See the descriptions of [enum ContextMenuSlot] for more information. */
        /* gdvirtual */ _getMenuOptions(data: GDictionary): void
        
        /**     
         *  **Note:** Implementing this method makes the shortcut callbacks receive legacy data (for compatibility reasons).  
         */
        /* gdvirtual */ _popupMenu(paths: PackedStringArray | string[]): void
        
        /** Registers a shortcut associated with the plugin's context menu. This method should be called once (e.g. in the plugin's [method Object._init]). [param callback] will be called when user presses the specified [param shortcut] while the menu's context is in effect (e.g. FileSystem dock is focused). Callback should take single data [Dictionary], same as in [method add_context_menu_item].  
         *    
         */
        addMenuShortcut(shortcut: Shortcut, callback: Callable): void
        
        /** Add custom option to the context menu of the plugin's specified slot. [param callback] should be a method that takes a single argument of type [Dictionary]. It will be called when the option is activated and the data received in the callback is the same as in [method _get_menu_options].  
         *    
         *  If you want to assign shortcut to the menu item, use [method add_context_menu_item_from_shortcut] instead.  
         */
        addContextMenuItem(name: string, callback: Callable, icon?: Texture2D): void
        
        /** Add custom option to the context menu of the plugin's specified slot. The option will have the [param shortcut] assigned and reuse its callback. The shortcut has to be registered beforehand with [method add_menu_shortcut].  
         *    
         */
        addContextMenuItemFromShortcut(name: string, shortcut: Shortcut, icon?: Texture2D): void
        
        /** Add a submenu to the context menu of the plugin's specified slot. The submenu is not automatically handled, you need to connect to its signals yourself. Also the submenu is freed on every popup, so provide a new [PopupMenu] every time.  
         *    
         */
        addContextSubmenuItem(name: string, menu: PopupMenu, icon?: Texture2D): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorContextMenuPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorContextMenuPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorDebuggerPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorDebuggerPlugin extends __NameMapRefCounted {
        _setup_session: "_setupSession";
        _has_capture: "_hasCapture";
        _goto_script_line: "_gotoScriptLine";
        _breakpoints_cleared_in_tree: "_breakpointsClearedInTree";
        _breakpoint_set_in_tree: "_breakpointSetInTree";
        get_session: "getSession";
        get_sessions: "getSessions";
    }
    /** A base class to implement debugger plugins.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editordebuggerplugin.html  
     */
    class EditorDebuggerPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Override this method to be notified whenever a new [EditorDebuggerSession] is created. Note that the session may be inactive during this stage. */
        /* gdvirtual */ _setupSession(sessionId: int64): void
        
        /** Override this method to enable receiving messages from the debugger. If [param capture] is "my_message" then messages starting with "my_message:" will be passed to the [method _capture] method. */
        /* gdvirtual */ _hasCapture(capture: string): boolean
        
        /** Override this method to process incoming messages. The [param session_id] is the ID of the [EditorDebuggerSession] that received the [param message]. Use [method get_session] to retrieve the session. This method should return `true` if the message is recognized. */
        /* gdvirtual */ _capture(message: string, data: GArray, sessionId: int64): boolean
        
        /** Override this method to be notified when a breakpoint line has been clicked in the debugger breakpoint panel. */
        /* gdvirtual */ _gotoScriptLine(script: Script, line: int64): void
        
        /** Override this method to be notified when all breakpoints are cleared in the editor. */
        /* gdvirtual */ _breakpointsClearedInTree(): void
        
        /** Override this method to be notified when a breakpoint is set in the editor. */
        /* gdvirtual */ _breakpointSetInTree(script: Script, line: int64, enabled: boolean): void
        
        /** Returns the [EditorDebuggerSession] with the given [param id]. */
        getSession(id: int64): null | EditorDebuggerSession
        
        /** Returns an array of [EditorDebuggerSession] currently available to this debugger plugin.  
         *      
         *  **Note:** Sessions in the array may be inactive, check their state via [method EditorDebuggerSession.is_active].  
         */
        getSessions(): GArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorDebuggerPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorDebuggerPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorDebuggerSession extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorDebuggerSession extends __NameMapRefCounted {
        send_message: "sendMessage";
        toggle_profiler: "toggleProfiler";
        is_breaked: "isBreaked";
        is_debuggable: "isDebuggable";
        is_active: "isActive";
        add_session_tab: "addSessionTab";
        remove_session_tab: "removeSessionTab";
        set_breakpoint: "setBreakpoint";
    }
    /** A class to interact with the editor debugger.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editordebuggersession.html  
     */
    class EditorDebuggerSession extends RefCounted {
        constructor(identifier?: any)
        /** Sends the given [param message] to the attached remote instance, optionally passing additionally [param data]. See [EngineDebugger] for how to retrieve those messages. */
        sendMessage(message: string, data?: GArray): void
        
        /** Toggle the given [param profiler] on the attached remote instance, optionally passing additionally [param data]. See [EngineProfiler] for more details. */
        toggleProfiler(profiler: string, enable: boolean, data?: GArray): void
        
        /** Returns `true` if the attached remote instance is currently in the debug loop. */
        isBreaked(): boolean
        
        /** Returns `true` if the attached remote instance can be debugged. */
        isDebuggable(): boolean
        
        /** Returns `true` if the debug session is currently attached to a remote instance. */
        isActive(): boolean
        
        /** Adds the given [param control] to the debug session UI in the debugger bottom panel. The [param control]'s node name will be used as the tab title. */
        addSessionTab(control: Control): void
        
        /** Removes the given [param control] from the debug session UI in the debugger bottom panel. */
        removeSessionTab(control: Control): void
        
        /** Enables or disables a specific breakpoint based on [param enabled], updating the Editor Breakpoint Panel accordingly. */
        setBreakpoint(path: string, line: int64, enabled: boolean): void
        
        /** Emitted when a remote instance is attached to this session (i.e. the session becomes active). */
        readonly started: Signal<() => void>
        
        /** Emitted when a remote instance is detached from this session (i.e. the session becomes inactive). */
        readonly stopped: Signal<() => void>
        
        /** Emitted when the attached remote instance enters a break state. If [param can_debug] is `true`, the remote instance will enter the debug loop. */
        readonly breaked: Signal<(canDebug: boolean) => void>
        
        /** Emitted when the attached remote instance exits a break state. */
        readonly continued: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorDebuggerSession;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorDebuggerSession;
    }
    namespace EditorDock {
        enum DockLayout {
            DockLayoutVertical = 1,
            DockLayoutHorizontal = 2,
            DockLayoutFloating = 4,
            DockLayoutMainScreen = 8,
            DockLayoutAll = 7,
        }
        enum DockSlot {
            DockSlotNone = -1,
            DockSlotLeftUl = 0,
            DockSlotLeftBl = 1,
            DockSlotLeftUr = 2,
            DockSlotLeftBr = 3,
            DockSlotRightUl = 4,
            DockSlotRightBl = 5,
            DockSlotRightUr = 6,
            DockSlotRightBr = 7,
            DockSlotBottom = 8,
            DockSlotBottomL = 9,
            DockSlotBottomR = 10,
            DockSlotMainScreen = 11,
            DockSlotMax = 12,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorDock extends __RPCMapMarginContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorDock extends __NameMapMarginContainer {
        _update_layout_and_slot: "_updateLayoutAndSlot";
        _save_layout_to_config: "_saveLayoutToConfig";
        _load_layout_from_config: "_loadLayoutFromConfig";
        _update_layout: "_updateLayout";
        make_visible: "makeVisible";
        layout_key: "layoutKey";
        allow_switch_screen: "allowSwitchScreen";
        icon_name: "iconName";
        dock_icon: "dockIcon";
        force_show_icon: "forceShowIcon";
        title_color: "titleColor";
        dock_shortcut: "dockShortcut";
        default_slot: "defaultSlot";
        available_layouts: "availableLayouts";
        _tab_style_changed: "_tabStyleChanged";
    }
    /** Dockable container for the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editordock.html  
     */
    class EditorDock<Map extends NodePathMap = any> extends MarginContainer<Map> {
        constructor(identifier?: any)
        /** Implement this method to handle the layout/slot switching for this dock. [param layout] is one of the [enum DockLayout] constants, and [param slot] is one of the [enum DockSlot] ones.  
         *    
         */
        /* gdvirtual */ _updateLayoutAndSlot(layout: int64, slot: int64): void
        
        /** Implement this method to handle saving this dock's layout. It's equivalent to [method EditorPlugin._get_window_layout]. [param section] is a unique section based on [member layout_key]. */
        /* gdvirtual */ _saveLayoutToConfig(config: ConfigFile, section: string): void
        
        /** Implement this method to handle loading this dock's layout. It's equivalent to [method EditorPlugin._set_window_layout]. [param section] is a unique section based on [member layout_key]. */
        /* gdvirtual */ _loadLayoutFromConfig(config: ConfigFile, section: string): void
        
        /** Implement this method to handle the layout switching for this dock. [param layout] is one of the [enum DockLayout] constants.  
         *    
         */
        /* gdvirtual */ _updateLayout(layout: int64): void
        
        /** Opens the dock. It will appear in the last used dock slot. If the dock has no default slot, it will be opened floating.  
         *      
         *  **Note:** This does not focus the dock. If you want to open and focus the dock, use [method make_visible].  
         */
        open(): void
        
        /** Focuses the dock's tab (or window if it's floating). If the dock was closed, it will be opened. If it's a bottom dock, makes the bottom panel visible. */
        makeVisible(): void
        
        /** Closes the dock, making its tab hidden. */
        close(): void
        
        /** The title of the dock's tab. If empty, the dock's [member Node.name] will be used. If the name is auto-generated (contains `@`), the first child's name will be used instead. */
        get title(): string
        set title(value: string)
        
        /** The key representing this dock in the editor's layout file. If empty, the dock's displayed name will be used instead. */
        get layoutKey(): string
        set layoutKey(value: string)
        
        /** If `true`, the dock appears in the **Editor > Editor Docks** menu and can be closed. Non-global docks can still be closed using [method close] or when [member closable] is `true`. */
        get global(): boolean
        set global(value: boolean)
        
        /** If `true`, the dock is not automatically opened or closed when loading an editor layout, only moved. It also can't be opened using a shortcut. This is meant for docks that are opened and closed in specific cases, such as when selecting a [TileMap] or [AnimationTree] node. */
        get transient(): boolean
        set transient(value: boolean)
        
        /** If `true`, the dock can be closed with the Close button in the context popup. Docks with [member global] enabled are always closable. */
        get closable(): boolean
        set closable(value: boolean)
        
        /** If `true` and this dock is docked in the main screen, selecting a node in the scene tree can switch away from this dock. The selected node needs to be handled by another main screen dock (2D, 3D) for the switch to happen. */
        get allowSwitchScreen(): boolean
        set allowSwitchScreen(value: boolean)
        
        /** The icon for the dock, as a name from the `EditorIcons` theme type in the editor theme. You can find the list of available icons [url=https://godot-editor-icons.github.io/]here[/url]. */
        get iconName(): StringName
        set iconName(value: StringName)
        
        /** The icon for the dock, as a texture. If specified, it will override [member icon_name]. */
        get dockIcon(): null | Texture2D
        set dockIcon(value: null | Texture2D)
        
        /** If `true`, the dock will always display an icon, regardless of [member EditorSettings.interface/editor/docks/dock_tab_style] or [member EditorSettings.interface/editor/docks/bottom_dock_tab_style]. */
        get forceShowIcon(): boolean
        set forceShowIcon(value: boolean)
        
        /** The color of the dock tab's title. If its alpha is `0.0`, the default font color will be used. */
        get titleColor(): Color
        set titleColor(value: Color)
        
        /** The shortcut used to open the dock. */
        get dockShortcut(): null | Shortcut
        set dockShortcut(value: null | Shortcut)
        
        /** The default dock slot used when adding the dock with [method EditorPlugin.add_dock].  
         *  After the dock is added, it can be moved to a different slot and the editor will automatically remember its position between sessions. If you remove and re-add the dock, it will be reset to default.  
         */
        get defaultSlot(): int64
        set defaultSlot(value: int64)
        
        /** The available layouts for this dock, as a bitmask. By default, the dock allows vertical and floating layouts. */
        get availableLayouts(): int64
        set availableLayouts(value: int64)
        
        /** Emitted when the dock is opened via the Editor > Editor Docks menu, before it's made visible. */
        readonly opened: Signal<() => void>
        
        /** Emitted when the dock is closed, before it's removed from its parent. The dock can be closed using Close button in the dock popup, using [method close], or as a result of a layout change. */
        readonly closed: Signal<() => void>
        readonly _tabStyleChanged: Signal<() => void>
        readonly _focused: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorDock;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorDock;
    }
    namespace EditorExportPlatform {
        enum ExportMessageType {
            ExportMessageNone = 0,
            ExportMessageInfo = 1,
            ExportMessageWarning = 2,
            ExportMessageError = 3,
        }
        enum DebugFlags {
            DebugFlagDumbClient = 1,
            DebugFlagRemoteDebug = 2,
            DebugFlagRemoteDebugLocalhost = 4,
            DebugFlagViewCollisions = 8,
            DebugFlagViewNavigation = 16,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatform extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatform extends __NameMapRefCounted {
        get_os_name: "getOsName";
        create_preset: "createPreset";
        find_export_template: "findExportTemplate";
        get_current_presets: "getCurrentPresets";
        save_pack: "savePack";
        save_zip: "saveZip";
        save_pack_patch: "savePackPatch";
        save_zip_patch: "saveZipPatch";
        gen_export_flags: "genExportFlags";
        export_project_files: "exportProjectFiles";
        export_project: "exportProject";
        export_pack: "exportPack";
        export_zip: "exportZip";
        export_pack_patch: "exportPackPatch";
        export_zip_patch: "exportZipPatch";
        clear_messages: "clearMessages";
        add_message: "addMessage";
        get_message_count: "getMessageCount";
        get_message_type: "getMessageType";
        get_message_category: "getMessageCategory";
        get_message_text: "getMessageText";
        get_worst_message_type: "getWorstMessageType";
        ssh_run_on_remote: "sshRunOnRemote";
        ssh_run_on_remote_no_wait: "sshRunOnRemoteNoWait";
        ssh_push_to_remote: "sshPushToRemote";
        get_internal_export_files: "getInternalExportFiles";
        get_forced_export_files: "getForcedExportFiles";
    }
    /** Identifies a supported export platform, and internally provides the functionality of exporting to that platform.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatform.html  
     */
    class EditorExportPlatform extends RefCounted {
        constructor(identifier?: any)
        /** Returns the name of the export operating system handled by this [EditorExportPlatform] class, as a friendly string. Possible return values are `Windows`, `Linux`, `macOS`, `Android`, `iOS`, and `Web`. */
        getOsName(): string
        
        /** Create a new preset for this platform. */
        createPreset(): EditorExportPreset
        
        /** Locates export template for the platform, and returns [Dictionary] with the following keys: `path: String` and `error: String`. This method is provided for convenience and custom export platforms aren't required to use it or keep export templates stored in the same way official templates are. */
        findExportTemplate(templateFileName: string): GDictionary
        
        /** Returns array of [EditorExportPreset]s for this platform. */
        getCurrentPresets(): GArray
        
        /** Saves PCK archive and returns [Dictionary] with the following keys: `result: Error`, `so_files: Array` (array of the shared/static objects which contains dictionaries with the following keys: `path: String`, `tags: PackedStringArray`, and `target_folder: String`).  
         *  If [param embed] is `true`, PCK content is appended to the end of [param path] file and return [Dictionary] additionally include following keys: `embedded_start: int` (embedded PCK offset) and `embedded_size: int` (embedded PCK size).  
         */
        savePack(preset: EditorExportPreset, debug: boolean, path: string, embed?: boolean /* = false */): GDictionary
        
        /** Saves ZIP archive and returns [Dictionary] with the following keys: `result: Error`, `so_files: Array` (array of the shared/static objects which contains dictionaries with the following keys: `path: String`, `tags: PackedStringArray`, and `target_folder: String`). */
        saveZip(preset: EditorExportPreset, debug: boolean, path: string): GDictionary
        
        /** Saves patch PCK archive and returns [Dictionary] with the following keys: `result: Error`, `so_files: Array` (array of the shared/static objects which contains dictionaries with the following keys: `path: String`, `tags: PackedStringArray`, and `target_folder: String`). */
        savePackPatch(preset: EditorExportPreset, debug: boolean, path: string): GDictionary
        
        /** Saves patch ZIP archive and returns [Dictionary] with the following keys: `result: Error`, `so_files: Array` (array of the shared/static objects which contains dictionaries with the following keys: `path: String`, `tags: PackedStringArray`, and `target_folder: String`). */
        saveZipPatch(preset: EditorExportPreset, debug: boolean, path: string): GDictionary
        
        /** Generates array of command line arguments for the default export templates for the debug flags and editor settings. */
        genExportFlags(flags: EditorExportPlatform.DebugFlags): PackedStringArray
        
        /** Exports project files for the specified preset. This method can be used to implement custom export format, other than PCK and ZIP. One of the callbacks is called for each exported file.  
         *  [param save_cb] is called for all exported files and have the following arguments: `info: Dictionary`, `file_data: PackedByteArray`. The `info` dictionary contains the following values: `path: String`, `source_path: String`, `file_index: int`, `file_count: int`.  
         *  [param shared_cb] is called for exported native shared/static libraries and have the following arguments: `file_path: String`, `tags: PackedStringArray`, `target_folder: String`.  
         *      
         *  **Note:** `file_index` and `file_count` are intended for progress tracking only and aren't necessarily unique and precise.  
         *      
         *  **Note:** The signature of [param save_cb] changed in Godot 4.8. There is compatibility code to automatically handle the [url=https://docs.godotengine.org/en/4.7/classes/class_editorexportplatform.html#class-editorexportplatform-method-export-project-files]previous signature[/url] if the passed callable has 7 arguments.  
         */
        exportProjectFiles(preset: EditorExportPreset, debug: boolean, saveCb: Callable, sharedCb?: Callable /* = new Callable() */): GError
        
        /** Creates a full project at [param path] for the specified [param preset]. If [param notify] is `true`, plugins using [method EditorExportPlugin._export_begin] will be called during the process. */
        exportProject(preset: EditorExportPreset, debug: boolean, path: string, flags?: EditorExportPlatform.DebugFlags /* = 0 */, notify?: boolean /* = true */): GError
        
        /** Creates a PCK archive at [param path] for the specified [param preset]. */
        exportPack(preset: EditorExportPreset, debug: boolean, path: string, flags?: EditorExportPlatform.DebugFlags /* = 0 */): GError
        
        /** Create a ZIP archive at [param path] for the specified [param preset]. */
        exportZip(preset: EditorExportPreset, debug: boolean, path: string, flags?: EditorExportPlatform.DebugFlags /* = 0 */): GError
        
        /** Creates a patch PCK archive at [param path] for the specified [param preset], containing only the files that have changed since the last patch.  
         *      
         *  **Note:** [param patches] is an optional override of the set of patches defined in the export preset. When empty the patches defined in the export preset will be used instead.  
         */
        exportPackPatch(preset: EditorExportPreset, debug: boolean, path: string, patches?: PackedStringArray | string[] /* = [] */, flags?: EditorExportPlatform.DebugFlags /* = 0 */): GError
        
        /** Create a patch ZIP archive at [param path] for the specified [param preset], containing only the files that have changed since the last patch.  
         *      
         *  **Note:** [param patches] is an optional override of the set of patches defined in the export preset. When empty the patches defined in the export preset will be used instead.  
         */
        exportZipPatch(preset: EditorExportPreset, debug: boolean, path: string, patches?: PackedStringArray | string[] /* = [] */, flags?: EditorExportPlatform.DebugFlags /* = 0 */): GError
        
        /** Clears the export log. */
        clearMessages(): void
        
        /** Adds a message to the export log that will be displayed when exporting ends. */
        addMessage(type: EditorExportPlatform.ExportMessageType, category: string, message: string): void
        
        /** Returns the number of messages in the export log. */
        getMessageCount(): int64
        
        /** Returns the type for the message with the given [param index]. */
        getMessageType(index: int64): EditorExportPlatform.ExportMessageType
        
        /** Returns the message category for the message with the given [param index]. */
        getMessageCategory(index: int64): string
        
        /** Returns the text for the message with the given [param index]. */
        getMessageText(index: int64): string
        
        /** Returns most severe message type currently present in the export log. */
        getWorstMessageType(): EditorExportPlatform.ExportMessageType
        
        /** Executes specified command on the remote host via SSH protocol and returns command output in the [param output]. */
        sshRunOnRemote(host: string, port: string, sshArg: PackedStringArray | string[], cmdArgs: string, output?: GArray, portFwd?: int64 /* = -1 */): GError
        
        /** Executes specified command on the remote host via SSH protocol and returns process ID (on the remote host) without waiting for command to finish. */
        sshRunOnRemoteNoWait(host: string, port: string, sshArgs: PackedStringArray | string[], cmdArgs: string, portFwd?: int64 /* = -1 */): int64
        
        /** Uploads specified file over SCP protocol to the remote host. */
        sshPushToRemote(host: string, port: string, scpArgs: PackedStringArray | string[], srcFile: string, dstFile: string): GError
        
        /** Returns additional files that should always be exported regardless of preset configuration, and are not part of the project source. The returned [Dictionary] contains filename keys ([String]) and their corresponding raw data ([PackedByteArray]). */
        getInternalExportFiles(preset: EditorExportPreset, debug: boolean): GDictionary
        
        /** Returns array of core file names that always should be exported regardless of preset config. */
        static getForcedExportFiles(preset?: EditorExportPreset): PackedStringArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatform;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatform;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformAndroid extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformAndroid extends __NameMapEditorExportPlatform {
    }
    /** Exporter for Android.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformandroid.html  
     */
    class EditorExportPlatformAndroid extends EditorExportPlatform {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformAndroid;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformAndroid;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformAppleEmbedded extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformAppleEmbedded extends __NameMapEditorExportPlatform {
    }
    /** Base class for the Apple embedded platform exporters (iOS and visionOS).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformappleembedded.html  
     */
    class EditorExportPlatformAppleEmbedded extends EditorExportPlatform {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformAppleEmbedded;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformAppleEmbedded;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformExtension extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformExtension extends __NameMapEditorExportPlatform {
        _get_preset_features: "_getPresetFeatures";
        _is_executable: "_isExecutable";
        _get_export_options: "_getExportOptions";
        _should_update_export_options: "_shouldUpdateExportOptions";
        _get_export_option_visibility: "_getExportOptionVisibility";
        _get_export_option_warning: "_getExportOptionWarning";
        _get_os_name: "_getOsName";
        _get_name: "_getName";
        _get_logo: "_getLogo";
        _poll_export: "_pollExport";
        _get_options_count: "_getOptionsCount";
        _get_options_tooltip: "_getOptionsTooltip";
        _get_option_icon: "_getOptionIcon";
        _get_option_label: "_getOptionLabel";
        _get_option_tooltip: "_getOptionTooltip";
        _get_device_architecture: "_getDeviceArchitecture";
        _get_run_icon: "_getRunIcon";
        _can_export: "_canExport";
        _has_valid_export_configuration: "_hasValidExportConfiguration";
        _has_valid_project_configuration: "_hasValidProjectConfiguration";
        _get_binary_extensions: "_getBinaryExtensions";
        _export_project: "_exportProject";
        _export_pack: "_exportPack";
        _export_zip: "_exportZip";
        _export_pack_patch: "_exportPackPatch";
        _export_zip_patch: "_exportZipPatch";
        _get_platform_features: "_getPlatformFeatures";
        _get_debug_protocol: "_getDebugProtocol";
        set_config_error: "setConfigError";
        get_config_error: "getConfigError";
        set_config_missing_templates: "setConfigMissingTemplates";
        get_config_missing_templates: "getConfigMissingTemplates";
    }
    /** Base class for custom [EditorExportPlatform] implementations (plugins).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformextension.html  
     */
    class EditorExportPlatformExtension extends EditorExportPlatform {
        constructor(identifier?: any)
        /** Returns array of platform specific features for the specified [param preset]. */
        /* gdvirtual */ _getPresetFeatures(preset: EditorExportPreset): PackedStringArray
        
        /** Returns `true` if specified file is a valid executable (native executable or script) for the target platform. */
        /* gdvirtual */ _isExecutable(path: string): boolean
        
        /** Returns a property list, as an [Array] of dictionaries. Each [Dictionary] must at least contain the `name: StringName` and `type: Variant.Type` entries.  
         *  Additionally, the following keys are supported:  
         *  - `hint: PropertyHint`  
         *  - `hint_string: String`  
         *  - `usage: PropertyUsageFlags`  
         *  - `class_name: StringName`  
         *  - `default_value: Variant`, default value of the property.  
         *  - `update_visibility: bool`, if set to `true`, [method _get_export_option_visibility] is called for each property when this property is changed.  
         *  - `required: bool`, if set to `true`, this property warnings are critical, and should be resolved to make export possible. This value is a hint for the [method _has_valid_export_configuration] implementation, and not used by the engine directly.  
         *  See also [method Object._get_property_list].  
         */
        /* gdvirtual */ _getExportOptions(): GArray<GDictionary>
        
        /** Returns `true` if export options list is changed and presets should be updated. */
        /* gdvirtual */ _shouldUpdateExportOptions(): boolean
        
        /** Validates [param option] and returns visibility for the specified [param preset]. Default implementation return `true` for all options. */
        /* gdvirtual */ _getExportOptionVisibility(preset: EditorExportPreset, option: string): boolean
        
        /** Validates [param option] and returns warning message for the specified [param preset]. Default implementation return empty string for all options. */
        /* gdvirtual */ _getExportOptionWarning(preset: EditorExportPreset, option: StringName): string
        
        /** Returns target OS name. */
        /* gdvirtual */ _getOsName(): string
        
        /** Returns export platform name. */
        /* gdvirtual */ _getName(): string
        
        /** Returns the platform logo displayed in the export dialog. The logo should be 32×32 pixels, adjusted for the current editor scale (see [method EditorInterface.get_editor_scale]). */
        /* gdvirtual */ _getLogo(): null | Texture2D
        
        /** Returns `true` if remote deploy options are changed and editor interface should be updated. */
        /* gdvirtual */ _pollExport(): boolean
        
        /** Returns the number of devices (or other options) available in the remote deploy menu. */
        /* gdvirtual */ _getOptionsCount(): int64
        
        /** Returns tooltip of the remote deploy menu button. */
        /* gdvirtual */ _getOptionsTooltip(): string
        
        /** Returns the item icon for the specified [param device] in the remote deploy menu. The icon should be 16×16 pixels, adjusted for the current editor scale (see [method EditorInterface.get_editor_scale]). */
        /* gdvirtual */ _getOptionIcon(device: int64): null | Texture2D
        
        /** Returns remote deploy menu item label for the specified [param device]. */
        /* gdvirtual */ _getOptionLabel(device: int64): string
        
        /** Returns remote deploy menu item tooltip for the specified [param device]. */
        /* gdvirtual */ _getOptionTooltip(device: int64): string
        
        /** Returns device architecture for remote deploy. */
        /* gdvirtual */ _getDeviceArchitecture(device: int64): string
        
        /** Called by the editor before platform is unregistered. */
        /* gdvirtual */ _cleanup(): void
        
        /** This method is called when [param device] remote deploy menu option is selected.  
         *  Implementation should export project to a temporary location, upload and run it on the specific [param device], or perform another action associated with the menu item.  
         */
        /* gdvirtual */ _run(preset: EditorExportPreset, device: int64, debugFlags: EditorExportPlatform.DebugFlags): GError
        
        /** Returns the icon of the remote deploy menu button. The icon should be 16×16 pixels, adjusted for the current editor scale (see [method EditorInterface.get_editor_scale]). */
        /* gdvirtual */ _getRunIcon(): null | Texture2D
        
        /** Returns `true` if the specified [param preset] is valid and can be exported. Use [method set_config_error] and [method set_config_missing_templates] to set error details.  
         *  Usual implementations call [method _has_valid_export_configuration] and [method _has_valid_project_configuration] to determine if exporting is possible.  
         */
        /* gdvirtual */ _canExport(preset: EditorExportPreset, debug: boolean): boolean
        
        /** Returns `true` if export configuration is valid. */
        /* gdvirtual */ _hasValidExportConfiguration(preset: EditorExportPreset, debug: boolean): boolean
        
        /** Returns `true` if project configuration is valid. */
        /* gdvirtual */ _hasValidProjectConfiguration(preset: EditorExportPreset): boolean
        
        /** Returns array of supported binary extensions for the full project export. */
        /* gdvirtual */ _getBinaryExtensions(preset: EditorExportPreset): PackedStringArray
        
        /** Creates a full project at [param path] for the specified [param preset].  
         *  This method is called when "Export" button is pressed in the export dialog.  
         *  This method implementation can call [method EditorExportPlatform.save_pack] or [method EditorExportPlatform.save_zip] to use default PCK/ZIP export process, or calls [method EditorExportPlatform.export_project_files] and implement custom callback for processing each exported file.  
         */
        /* gdvirtual */ _exportProject(preset: EditorExportPreset, debug: boolean, path: string, flags: EditorExportPlatform.DebugFlags): GError
        
        /** Creates a PCK archive at [param path] for the specified [param preset].  
         *  This method is called when "Export PCK/ZIP" button is pressed in the export dialog, with "Export as Patch" disabled, and PCK is selected as a file type.  
         */
        /* gdvirtual */ _exportPack(preset: EditorExportPreset, debug: boolean, path: string, flags: EditorExportPlatform.DebugFlags): GError
        
        /** Create a ZIP archive at [param path] for the specified [param preset].  
         *  This method is called when "Export PCK/ZIP" button is pressed in the export dialog, with "Export as Patch" disabled, and ZIP is selected as a file type.  
         */
        /* gdvirtual */ _exportZip(preset: EditorExportPreset, debug: boolean, path: string, flags: EditorExportPlatform.DebugFlags): GError
        
        /** Creates a patch PCK archive at [param path] for the specified [param preset], containing only the files that have changed since the last patch.  
         *  This method is called when "Export PCK/ZIP" button is pressed in the export dialog, with "Export as Patch" enabled, and PCK is selected as a file type.  
         *      
         *  **Note:** The patches provided in [param patches] have already been loaded when this method is called and are merely provided as context. When empty the patches defined in the export preset have been loaded instead.  
         */
        /* gdvirtual */ _exportPackPatch(preset: EditorExportPreset, debug: boolean, path: string, patches: PackedStringArray | string[], flags: EditorExportPlatform.DebugFlags): GError
        
        /** Create a ZIP archive at [param path] for the specified [param preset], containing only the files that have changed since the last patch.  
         *  This method is called when "Export PCK/ZIP" button is pressed in the export dialog, with "Export as Patch" enabled, and ZIP is selected as a file type.  
         *      
         *  **Note:** The patches provided in [param patches] have already been loaded when this method is called and are merely provided as context. When empty the patches defined in the export preset have been loaded instead.  
         */
        /* gdvirtual */ _exportZipPatch(preset: EditorExportPreset, debug: boolean, path: string, patches: PackedStringArray | string[], flags: EditorExportPlatform.DebugFlags): GError
        
        /** Returns array of platform specific features. */
        /* gdvirtual */ _getPlatformFeatures(): PackedStringArray
        
        /** Returns protocol used for remote debugging. Default implementation return `tcp://`. */
        /* gdvirtual */ _getDebugProtocol(): string
        
        /** Initializes the plugin. Called by the editor when platform is registered. */
        /* gdvirtual */ _initialize(): void
        
        /** Sets current configuration error message text. This method should be called only from the [method _can_export], [method _has_valid_export_configuration], or [method _has_valid_project_configuration] implementations. */
        setConfigError(errorText: string): void
        
        /** Returns current configuration error message text. This method should be called only from the [method _can_export], [method _has_valid_export_configuration], or [method _has_valid_project_configuration] implementations. */
        getConfigError(): string
        
        /** Set to `true` is export templates are missing from the current configuration. This method should be called only from the [method _can_export], [method _has_valid_export_configuration], or [method _has_valid_project_configuration] implementations. */
        setConfigMissingTemplates(missingTemplates: boolean): void
        
        /** Returns `true` is export templates are missing from the current configuration. This method should be called only from the [method _can_export], [method _has_valid_export_configuration], or [method _has_valid_project_configuration] implementations. */
        getConfigMissingTemplates(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformIos extends __RPCMapEditorExportPlatformAppleEmbedded {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformIos extends __NameMapEditorExportPlatformAppleEmbedded {
    }
    class EditorExportPlatformIos extends EditorExportPlatformAppleEmbedded {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformIos;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformIos;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformLinuxBsd extends __RPCMapEditorExportPlatformPC {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformLinuxBsd extends __NameMapEditorExportPlatformPC {
    }
    class EditorExportPlatformLinuxBsd extends EditorExportPlatformPC {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformLinuxBsd;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformLinuxBsd;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformMacOS extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformMacOS extends __NameMapEditorExportPlatform {
    }
    /** Exporter for macOS.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformmacos.html  
     */
    class EditorExportPlatformMacOS extends EditorExportPlatform {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformMacOS;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformMacOS;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformPC extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformPC extends __NameMapEditorExportPlatform {
    }
    /** Base class for the desktop platform exporter (Windows and Linux/BSD).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformpc.html  
     */
    class EditorExportPlatformPC extends EditorExportPlatform {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformPC;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformPC;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformVisionOS extends __RPCMapEditorExportPlatformAppleEmbedded {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformVisionOS extends __NameMapEditorExportPlatformAppleEmbedded {
    }
    /** Exporter for visionOS.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformvisionos.html  
     */
    class EditorExportPlatformVisionOS extends EditorExportPlatformAppleEmbedded {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformVisionOS;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformVisionOS;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformWeb extends __RPCMapEditorExportPlatform {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformWeb extends __NameMapEditorExportPlatform {
    }
    /** Exporter for the Web.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformweb.html  
     */
    class EditorExportPlatformWeb extends EditorExportPlatform {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformWeb;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformWeb;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlatformWindows extends __RPCMapEditorExportPlatformPC {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlatformWindows extends __NameMapEditorExportPlatformPC {
    }
    /** Exporter for Windows.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplatformwindows.html  
     */
    class EditorExportPlatformWindows extends EditorExportPlatformPC {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlatformWindows;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlatformWindows;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPlugin extends __NameMapRefCounted {
        _export_file: "_exportFile";
        _export_begin: "_exportBegin";
        _export_end: "_exportEnd";
        _end_generate_apple_embedded_project: "_endGenerateAppleEmbeddedProject";
        _begin_customize_resources: "_beginCustomizeResources";
        _customize_resource: "_customizeResource";
        _begin_customize_scenes: "_beginCustomizeScenes";
        _customize_scene: "_customizeScene";
        _get_customization_configuration_hash: "_getCustomizationConfigurationHash";
        _end_customize_scenes: "_endCustomizeScenes";
        _end_customize_resources: "_endCustomizeResources";
        _get_export_options: "_getExportOptions";
        _get_export_options_overrides: "_getExportOptionsOverrides";
        _should_update_export_options: "_shouldUpdateExportOptions";
        _get_export_option_visibility: "_getExportOptionVisibility";
        _get_export_option_warning: "_getExportOptionWarning";
        _get_export_features: "_getExportFeatures";
        _get_name: "_getName";
        _supports_platform: "_supportsPlatform";
        _get_android_dependencies: "_getAndroidDependencies";
        _get_android_dependencies_maven_repos: "_getAndroidDependenciesMavenRepos";
        _get_android_libraries: "_getAndroidLibraries";
        _get_android_manifest_activity_element_contents: "_getAndroidManifestActivityElementContents";
        _get_android_manifest_application_element_contents: "_getAndroidManifestApplicationElementContents";
        _get_android_manifest_element_contents: "_getAndroidManifestElementContents";
        _update_android_prebuilt_manifest: "_updateAndroidPrebuiltManifest";
        add_shared_object: "addSharedObject";
        add_file: "addFile";
        add_apple_embedded_platform_project_static_lib: "addAppleEmbeddedPlatformProjectStaticLib";
        add_apple_embedded_platform_framework: "addAppleEmbeddedPlatformFramework";
        add_apple_embedded_platform_embedded_framework: "addAppleEmbeddedPlatformEmbeddedFramework";
        add_apple_embedded_platform_plist_content: "addAppleEmbeddedPlatformPlistContent";
        add_apple_embedded_platform_linker_flags: "addAppleEmbeddedPlatformLinkerFlags";
        add_apple_embedded_platform_bundle_file: "addAppleEmbeddedPlatformBundleFile";
        add_apple_embedded_platform_cpp_code: "addAppleEmbeddedPlatformCppCode";
        add_apple_embedded_platform_spm_package: "addAppleEmbeddedPlatformSpmPackage";
        add_ios_project_static_lib: "addIosProjectStaticLib";
        add_ios_framework: "addIosFramework";
        add_ios_embedded_framework: "addIosEmbeddedFramework";
        add_ios_plist_content: "addIosPlistContent";
        add_ios_linker_flags: "addIosLinkerFlags";
        add_ios_bundle_file: "addIosBundleFile";
        add_ios_cpp_code: "addIosCppCode";
        add_macos_plugin_file: "addMacOSPluginFile";
        get_option: "getOption";
        get_export_preset: "getExportPreset";
        get_export_platform: "getExportPlatform";
    }
    /** A script that is executed when exporting the project.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportplugin.html  
     */
    class EditorExportPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Virtual method to be overridden by the user. Called for each exported file before [method _customize_resource] and [method _customize_scene]. The arguments can be used to identify the file. [param path] is the path of the file, [param type] is the [Resource] represented by the file (e.g. [PackedScene]), and [param features] is the list of features for the export.  
         *  Calling [method skip] inside this callback will make the file not included in the export.  
         */
        /* gdvirtual */ _exportFile(path: string, type: string, features: PackedStringArray | string[]): void
        
        /** Virtual method to be overridden by the user. It is called when the export starts and provides all information about the export. [param features] is the list of features for the export, [param is_debug] is `true` for debug builds, [param path] is the target path for the exported project. [param flags] is only used when running a runnable profile, e.g. when using native run on Android. */
        /* gdvirtual */ _exportBegin(features: PackedStringArray | string[], isDebug: boolean, path: string, flags: int64): void
        
        /** Virtual method to be overridden by the user. Called when the export is finished. */
        /* gdvirtual */ _exportEnd(): void
        
        /** This is called after Xcode project generation, but before it is built.  
         *      
         *  **Note:** Only supported on iOS and visionOS.  
         */
        /* gdvirtual */ _endGenerateAppleEmbeddedProject(path: string, willBuildArchive: boolean): void
        
        /** Return `true` if this plugin will customize resources based on the platform and features used.  
         *  When enabled, [method _get_customization_configuration_hash] and [method _customize_resource] will be called and must be implemented.  
         */
        /* gdvirtual */ _beginCustomizeResources(platform: EditorExportPlatform, features: PackedStringArray | string[]): boolean
        
        /** Customize a resource. If changes are made to it, return the same or a new resource. Otherwise, return `null`. When a new resource is returned, [param resource] will be replaced by a copy of the new resource.  
         *  The [param path] argument is only used when customizing an actual file, otherwise this means that this resource is part of another one and it will be empty.  
         *  Implementing this method is required if [method _begin_customize_resources] returns `true`.  
         *      
         *  **Note:** When customizing any of the following types and returning another resource, the other resource should not be skipped using [method skip] in [method _export_file]:  
         *  - [AtlasTexture]  
         *  - [CompressedCubemap]  
         *  - [CompressedCubemapArray]  
         *  - [CompressedTexture2D]  
         *  - [CompressedTexture2DArray]  
         *  - [CompressedTexture3D]  
         */
        /* gdvirtual */ _customizeResource(resource: Resource, path: string): null | Resource
        
        /** Return `true` if this plugin will customize scenes based on the platform and features used.  
         *  When enabled, [method _get_customization_configuration_hash] and [method _customize_scene] will be called and must be implemented.  
         *      
         *  **Note:** [method _customize_scene] will only be called for scenes that have been modified since the last export.  
         */
        /* gdvirtual */ _beginCustomizeScenes(platform: EditorExportPlatform, features: PackedStringArray | string[]): boolean
        
        /** Customize a scene. If changes are made to it, return the same or a new scene. Otherwise, return `null`. If a new scene is returned, it is up to you to dispose of the old one.  
         *  Implementing this method is required if [method _begin_customize_scenes] returns `true`.  
         *      
         *  **Note:** To change a variable in your scene, use the `@export` annotation when declaring it.  
         */
        /* gdvirtual */ _customizeScene(scene: Node, path: string): null | Node
        
        /** Return a hash based on the configuration passed (for both scenes and resources). This helps keep separate caches for separate export configurations.  
         *  Implementing this method is required if [method _begin_customize_resources] returns `true`.  
         *      
         *  **Note:** [method _customize_resource] and [method _customize_scene] will not be called when the [EditorExportPlugin] script is modified unless this hash changes too.  
         */
        /* gdvirtual */ _getCustomizationConfigurationHash(): int64
        
        /** This is called when the customization process for scenes ends. */
        /* gdvirtual */ _endCustomizeScenes(): void
        
        /** This is called when the customization process for resources ends. */
        /* gdvirtual */ _endCustomizeResources(): void
        
        /** Return a list of export options that can be configured for this export plugin.  
         *  Each element in the return value is a [Dictionary] with the following keys:  
         *  - `option`: A dictionary with the structure documented by [method Object.get_property_list], but all keys are optional.  
         *  - `default_value`: The default value for this option.  
         *  - `update_visibility`: An optional boolean value. If set to `true`, the preset will emit [signal Object.property_list_changed] when the option is changed.  
         */
        /* gdvirtual */ _getExportOptions(platform: EditorExportPlatform): GArray<GDictionary>
        
        /** Return a [Dictionary] of override values for export options, that will be used instead of user-provided values. Overridden options will be hidden from the user interface.  
         *    
         */
        /* gdvirtual */ _getExportOptionsOverrides(platform: EditorExportPlatform): GDictionary
        
        /** Return `true` if the result of [method _get_export_options] has changed and the export options of the preset corresponding to [param platform] should be updated. */
        /* gdvirtual */ _shouldUpdateExportOptions(platform: EditorExportPlatform): boolean
        
        /** Validates [param option] and returns the visibility for the specified [param platform]. The default implementation returns `true` for all options. */
        /* gdvirtual */ _getExportOptionVisibility(platform: EditorExportPlatform, option: string): boolean
        
        /** Check the requirements for the given [param option] and return a non-empty warning string if they are not met.  
         *      
         *  **Note:** Use [method get_option] to check the value of the export options.  
         */
        /* gdvirtual */ _getExportOptionWarning(platform: EditorExportPlatform, option: string): string
        
        /** Return a [PackedStringArray] of additional features this preset, for the given [param platform], should have. */
        /* gdvirtual */ _getExportFeatures(platform: EditorExportPlatform, debug: boolean): PackedStringArray
        
        /** Return the name identifier of this plugin (for future identification by the exporter). The plugins are sorted by name before exporting.  
         *  Implementing this method is required.  
         */
        /* gdvirtual */ _getName(): string
        
        /** Return `true` if the plugin supports the given [param platform]. */
        /* gdvirtual */ _supportsPlatform(platform: EditorExportPlatform): boolean
        
        /** Virtual method to be overridden by the user. This is called to retrieve the set of Android dependencies provided by this plugin. Each returned Android dependency should have the format of an Android remote binary dependency: `org.godot.example:my-plugin:0.0.0`  
         *  For more information see [url=https://developer.android.com/build/dependencies?agpversion=4.1#dependency-types]Android documentation on dependencies[/url].  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidDependencies(platform: EditorExportPlatform, debug: boolean): PackedStringArray
        
        /** Virtual method to be overridden by the user. This is called to retrieve the URLs of Maven repositories for the set of Android dependencies provided by this plugin.  
         *  For more information see [url=https://docs.gradle.org/current/userguide/dependency_management.html#sec:maven_repo]Gradle documentation on dependency management[/url].  
         *      
         *  **Note:** Google's Maven repo and the Maven Central repo are already included by default.  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidDependenciesMavenRepos(platform: EditorExportPlatform, debug: boolean): PackedStringArray
        
        /** Virtual method to be overridden by the user. This is called to retrieve the local paths of the Android libraries archive (AAR) files provided by this plugin.  
         *      
         *  **Note:** Relative paths **must** be relative to Godot's `res://addons/` directory. For example, an AAR file located under `res://addons/hello_world_plugin/HelloWorld.release.aar` can be returned as an absolute path using `res://addons/hello_world_plugin/HelloWorld.release.aar` or a relative path using `hello_world_plugin/HelloWorld.release.aar`.  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidLibraries(platform: EditorExportPlatform, debug: boolean): PackedStringArray
        
        /** Virtual method to be overridden by the user. This is used at export time to update the contents of the `activity` element in the generated Android manifest.  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidManifestActivityElementContents(platform: EditorExportPlatform, debug: boolean): string
        
        /** Virtual method to be overridden by the user. This is used at export time to update the contents of the `application` element in the generated Android manifest.  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidManifestApplicationElementContents(platform: EditorExportPlatform, debug: boolean): string
        
        /** Virtual method to be overridden by the user. This is used at export time to update the contents of the `manifest` element in the generated Android manifest.  
         *      
         *  **Note:** Only supported on Android and requires [member EditorExportPlatformAndroid.gradle_build/use_gradle_build] to be enabled.  
         */
        /* gdvirtual */ _getAndroidManifestElementContents(platform: EditorExportPlatform, debug: boolean): string
        
        /** Provide access to the Android prebuilt manifest and allows the plugin to modify it if needed.  
         *  Implementers of this virtual method should take the binary manifest data from [param manifest_data], copy it, modify it, and then return it with the modifications.  
         *  If no modifications are needed, then an empty [PackedByteArray] should be returned.  
         */
        /* gdvirtual */ _updateAndroidPrebuiltManifest(platform: EditorExportPlatform, manifestData: PackedByteArray | byte[] | ArrayBuffer): PackedByteArray
        
        /** Adds a shared object or a directory containing only shared objects with the given [param tags] and destination [param path].  
         *      
         *  **Note:** In case of macOS exports, those shared objects will be added to `Frameworks` directory of app bundle.  
         *  In case of a directory code-sign will error if you place non code object in directory.  
         */
        addSharedObject(path: string, tags: PackedStringArray | string[], target: string): void
        
        /** Adds a custom file to be exported. [param path] is the virtual path that can be used to load the file, [param file] is the binary data of the file.  
         *  When called inside [method _export_file] and [param remap] is `true`, the current file will not be exported, but instead remapped to this custom file. [param remap] is ignored when called in other places.  
         *  [param file] will not be imported, so consider using [method _customize_resource] to remap imported resources.  
         */
        addFile(path: string, file: PackedByteArray | byte[] | ArrayBuffer, remap: boolean): void
        
        /** Adds a static library from the given [param path] to the Apple embedded platform project. */
        addAppleEmbeddedPlatformProjectStaticLib(path: string): void
        
        /** Adds a static library (*.a) or a dynamic library (*.dylib, *.framework) to the Linking Phase to the Apple embedded platform's Xcode project. */
        addAppleEmbeddedPlatformFramework(path: string): void
        
        /** Adds a dynamic library (*.dylib, *.framework) to the Linking Phase in the Apple embedded platform's Xcode project and embeds it into the resulting binary.  
         *      
         *  **Note:** For static libraries (*.a), this works in the same way as [method add_apple_embedded_platform_framework].  
         *      
         *  **Note:** This method should not be used for System libraries as they are already present on the device.  
         */
        addAppleEmbeddedPlatformEmbeddedFramework(path: string): void
        
        /** Adds additional fields to the Apple embedded platform's project Info.plist file. */
        addAppleEmbeddedPlatformPlistContent(plistContent: string): void
        
        /** Adds linker flags for the Apple embedded platform export. */
        addAppleEmbeddedPlatformLinkerFlags(flags: string): void
        
        /** Adds an Apple embedded platform bundle file from the given [param path] to the exported project. */
        addAppleEmbeddedPlatformBundleFile(path: string): void
        
        /** Adds C++ code to the Apple embedded platform export. The final code is created from the code appended by each active export plugin. */
        addAppleEmbeddedPlatformCppCode(code: string): void
        
        /** Adds a Swift Package Manager package to the Apple embedded platform's Xcode project. The [param url] is the URL of the package, [param version] is the version requirement (e.g. "1.0.0"), and [param products] is an array of product names to include from the package.  
         *      
         *  **Note:** Only supported on iOS and visionOS.  
         */
        addAppleEmbeddedPlatformSpmPackage(url: string, version: string, products: PackedStringArray | string[]): void
        
        /** Adds a static library from the given [param path] to the iOS project. */
        addIosProjectStaticLib(path: string): void
        
        /** Adds a static library (*.a) or a dynamic library (*.dylib, *.framework) to the Linking Phase to the iOS Xcode project. */
        addIosFramework(path: string): void
        
        /** Adds a dynamic library (*.dylib, *.framework) to Linking Phase in iOS's Xcode project and embeds it into resulting binary.  
         *      
         *  **Note:** For static libraries (*.a), this works the in same way as [method add_apple_embedded_platform_framework].  
         *      
         *  **Note:** This method should not be used for System libraries as they are already present on the device.  
         */
        addIosEmbeddedFramework(path: string): void
        
        /** Adds additional fields to the iOS project Info.plist file. */
        addIosPlistContent(plistContent: string): void
        
        /** Adds linker flags for the iOS export. */
        addIosLinkerFlags(flags: string): void
        
        /** Adds an iOS bundle file from the given [param path] to the exported project. */
        addIosBundleFile(path: string): void
        
        /** Adds C++ code to the iOS export. The final code is created from the code appended by each active export plugin. */
        addIosCppCode(code: string): void
        
        /** Adds file or directory matching [param path] to `PlugIns` directory of macOS app bundle.  
         *      
         *  **Note:** This is useful only for macOS exports.  
         */
        addMacOSPluginFile(path: string): void
        
        /** To be called inside [method _export_file]. Skips the current file, so it's not included in the export. */
        skip(): void
        
        /** Returns the current value of an export option supplied by [method _get_export_options]. */
        getOption(name: StringName): any
        
        /** Returns currently used export preset. */
        getExportPreset(): null | EditorExportPreset
        
        /** Returns currently used export platform. */
        getExportPlatform(): null | EditorExportPlatform
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPlugin;
    }
    namespace EditorExportPreset {
        enum ExportFilter {
            ExportAllResources = 0,
            ExportSelectedScenes = 1,
            ExportSelectedResources = 2,
            ExcludeSelectedResources = 3,
            ExportCustomized = 4,
        }
        enum FileExportMode {
            ModeFileNotCustomized = 0,
            ModeFileStrip = 1,
            ModeFileKeep = 2,
            ModeFileRemove = 3,
        }
        enum ScriptExportMode {
            ModeScriptText = 0,
            ModeScriptBinaryTokens = 1,
            ModeScriptBinaryTokensCompressed = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorExportPreset extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorExportPreset extends __NameMapRefCounted {
        _get_property_warning: "_getPropertyWarning";
        get_files_to_export: "getFilesToExport";
        get_customized_files: "getCustomizedFiles";
        get_customized_files_count: "getCustomizedFilesCount";
        has_export_file: "hasExportFile";
        get_file_export_mode: "getFileExportMode";
        get_project_setting: "getProjectSetting";
        get_preset_name: "getPresetName";
        is_runnable: "isRunnable";
        are_advanced_options_enabled: "areAdvancedOptionsEnabled";
        is_dedicated_server: "isDedicatedServer";
        get_export_filter: "getExportFilter";
        get_include_filter: "getIncludeFilter";
        get_exclude_filter: "getExcludeFilter";
        get_custom_features: "getCustomFeatures";
        get_patches: "getPatches";
        get_export_path: "getExportPath";
        get_encryption_in_filter: "getEncryptionInFilter";
        get_encryption_ex_filter: "getEncryptionExFilter";
        get_encrypt_pck: "getEncryptPck";
        get_encrypt_directory: "getEncryptDirectory";
        get_encryption_key: "getEncryptionKey";
        resolve_encryption_key: "resolveEncryptionKey";
        get_script_export_mode: "getScriptExportMode";
        get_or_env: "getOrEnv";
        get_version: "getVersion";
    }
    /** Export preset configuration.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorexportpreset.html  
     */
    class EditorExportPreset extends RefCounted {
        constructor(identifier?: any)
        _getPropertyWarning(name: StringName): string
        
        /** Returns `true` if the preset has the property named [param property]. */
        has(property: StringName): boolean
        
        /** Returns array of files to export. */
        getFilesToExport(): PackedStringArray
        
        /** Returns a dictionary of files selected in the "Resources" tab of the export dialog. The dictionary's keys are file paths, and its values are the corresponding export modes: `"strip"`, `"keep"`, or `"remove"`. See also [method get_file_export_mode]. */
        getCustomizedFiles(): GDictionary
        
        /** Returns the number of files selected in the "Resources" tab of the export dialog. */
        getCustomizedFilesCount(): int64
        
        /** Returns `true` if the file at the specified [param path] will be exported. */
        hasExportFile(path: string): boolean
        
        /** Returns file export mode for the specified file. */
        getFileExportMode(path: string, default_?: EditorExportPreset.FileExportMode /* = 0 */): EditorExportPreset.FileExportMode
        
        /** Returns the value of the setting identified by [param name] using export preset feature tag overrides instead of current OS features. */
        getProjectSetting(name: StringName): any
        
        /** Returns this export preset's name. */
        getPresetName(): string
        
        /** Returns `true` if the "Runnable" toggle is enabled in the export dialog. */
        isRunnable(): boolean
        
        /** Returns `true` if the "Advanced" toggle is enabled in the export dialog. */
        areAdvancedOptionsEnabled(): boolean
        
        /** Returns `true` if the dedicated server export mode is selected in the export dialog. */
        isDedicatedServer(): boolean
        
        /** Returns export file filter mode selected in the "Resources" tab of the export dialog. */
        getExportFilter(): EditorExportPreset.ExportFilter
        
        /** Returns file filters to include during export. */
        getIncludeFilter(): string
        
        /** Returns file filters to exclude during export. */
        getExcludeFilter(): string
        
        /** Returns a comma-separated list of custom features added to this preset, as a string. See [url=https://docs.godotengine.org/en/latest/tutorials/export/feature_tags.html]Feature tags[/url] in the documentation for more information. */
        getCustomFeatures(): string
        
        /** Returns the list of packs on which to base a patch export on. */
        getPatches(): PackedStringArray
        
        /** Returns export target path. */
        getExportPath(): string
        
        /** Returns file filters to include during PCK encryption. */
        getEncryptionInFilter(): string
        
        /** Returns file filters to exclude during PCK encryption. */
        getEncryptionExFilter(): string
        
        /** Returns `true` if PCK encryption is enabled in the export dialog. */
        getEncryptPck(): boolean
        
        /** Returns `true` if PCK directory encryption is enabled in the export dialog. */
        getEncryptDirectory(): boolean
        
        /** Returns PCK encryption key. This will only return the value set in the export preset and not the value of the `GODOT_SCRIPT_ENCRYPTION_KEY` environment variable. See also [method resolve_encryption_key]. */
        getEncryptionKey(): string
        
        /** Returns PCK encryption key as a [PackedByteArray]. If the `GODOT_SCRIPT_ENCRYPTION_KEY` environment variable is set, this will return that key instead of the key set in the export preset. See also [method get_encryption_key]. */
        resolveEncryptionKey(): PackedByteArray
        
        /** Returns the export mode used by GDScript files. `0` for "Text", `1` for "Binary tokens", and `2` for "Compressed binary tokens (smaller files)". */
        getScriptExportMode(): EditorExportPreset.ScriptExportMode
        
        /** Returns export option value or value of environment variable if it is set. */
        getOrEnv(name: StringName, envVar: string): any
        
        /** Returns the preset's version number, or fall back to the [member ProjectSettings.application/config/version] project setting if set to an empty string.  
         *  If [param windows_version] is `true`, formats the returned version number to be compatible with Windows executable metadata.  
         */
        getVersion(name: StringName, windowsVersion: boolean): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorExportPreset;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorExportPreset;
    }
    namespace EditorFeatureProfile {
        enum Feature {
            Feature3D = 0,
            FeatureScript = 1,
            FeatureAssetLib = 2,
            FeatureSceneTree = 3,
            FeatureNodeDock = 4,
            FeatureFilesystemDock = 5,
            FeatureImportDock = 6,
            FeatureHistoryDock = 7,
            FeatureGame = 8,
            FeatureSignalsDock = 9,
            FeatureGroupsDock = 10,
            FeatureMax = 11,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorFeatureProfile extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorFeatureProfile extends __NameMapRefCounted {
        set_disable_class: "setDisableClass";
        is_class_disabled: "isClassDisabled";
        set_disable_class_editor: "setDisableClassEditor";
        is_class_editor_disabled: "isClassEditorDisabled";
        set_disable_class_property: "setDisableClassProperty";
        is_class_property_disabled: "isClassPropertyDisabled";
        set_disable_feature: "setDisableFeature";
        is_feature_disabled: "isFeatureDisabled";
        get_feature_name: "getFeatureName";
        save_to_file: "saveToFile";
        load_from_file: "loadFromFile";
    }
    /** An editor feature profile which can be used to disable specific features.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorfeatureprofile.html  
     */
    class EditorFeatureProfile extends RefCounted {
        constructor(identifier?: any)
        /** If [param disable] is `true`, disables the class specified by [param class_name]. When disabled, the class won't appear in the Create New Node dialog. */
        setDisableClass(className: StringName, disable: boolean): void
        
        /** Returns `true` if the class specified by [param class_name] is disabled. When disabled, the class won't appear in the Create New Node dialog. */
        isClassDisabled(className: StringName): boolean
        
        /** If [param disable] is `true`, disables editing for the class specified by [param class_name]. When disabled, the class will still appear in the Create New Node dialog but the Inspector will be read-only when selecting a node that extends the class. */
        setDisableClassEditor(className: StringName, disable: boolean): void
        
        /** Returns `true` if editing for the class specified by [param class_name] is disabled. When disabled, the class will still appear in the Create New Node dialog but the Inspector will be read-only when selecting a node that extends the class. */
        isClassEditorDisabled(className: StringName): boolean
        
        /** If [param disable] is `true`, disables editing for [param property] in the class specified by [param class_name]. When a property is disabled, it won't appear in the Inspector when selecting a node that extends the class specified by [param class_name]. */
        setDisableClassProperty(className: StringName, property: StringName, disable: boolean): void
        
        /** Returns `true` if [param property] is disabled in the class specified by [param class_name]. When a property is disabled, it won't appear in the Inspector when selecting a node that extends the class specified by [param class_name]. */
        isClassPropertyDisabled(className: StringName, property: StringName): boolean
        
        /** If [param disable] is `true`, disables the editor feature specified in [param feature]. When a feature is disabled, it will disappear from the editor entirely. */
        setDisableFeature(feature: EditorFeatureProfile.Feature, disable: boolean): void
        
        /** Returns `true` if the [param feature] is disabled. When a feature is disabled, it will disappear from the editor entirely. */
        isFeatureDisabled(feature: EditorFeatureProfile.Feature): boolean
        
        /** Returns the specified [param feature]'s human-readable name. */
        getFeatureName(feature: EditorFeatureProfile.Feature): string
        
        /** Saves the editor feature profile to a file in JSON format. It can then be imported using the feature profile manager's **Import** button or the [method load_from_file] method.  
         *      
         *  **Note:** Feature profiles created via the user interface are saved in the `feature_profiles` directory, as a file with the `.profile` extension. The editor configuration folder can be found by using [method EditorPaths.get_config_dir].  
         */
        saveToFile(path: string): GError
        
        /** Loads an editor feature profile from a file. The file must follow the JSON format obtained by using the feature profile manager's **Export** button or the [method save_to_file] method.  
         *      
         *  **Note:** Feature profiles created via the user interface are loaded from the `feature_profiles` directory, as a file with the `.profile` extension. The editor configuration folder can be found by using [method EditorPaths.get_config_dir].  
         */
        loadFromFile(path: string): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorFeatureProfile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorFeatureProfile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorFileDialog extends __RPCMapFileDialog {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorFileDialog extends __NameMapFileDialog {
        add_side_menu: "addSideMenu";
        disable_overwrite_warning: "disableOverwriteWarning";
    }
    /** A modified version of [FileDialog] used by the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorfiledialog.html  
     */
    class EditorFileDialog<Map extends NodePathMap = any> extends FileDialog<Map> {
        constructor(identifier?: any)
        /** This method is kept for compatibility and does nothing. As an alternative, you can display another dialog after showing the file dialog. */
        addSideMenu(menu: Control, title?: string /* = '' */): void
        
        /** If `true`, the [EditorFileDialog] will not warn the user before overwriting files. */
        get disableOverwriteWarning(): boolean
        set disableOverwriteWarning(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorFileDialog;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorFileDialog;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorFileSystem extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorFileSystem extends __NameMapNode {
        get_filesystem: "getFilesystem";
        is_scanning: "isScanning";
        is_importing: "isImporting";
        get_scanning_progress: "getScanningProgress";
        scan_sources: "scanSources";
        update_file: "updateFile";
        get_filesystem_path: "getFilesystemPath";
        get_file_type: "getFileType";
        reimport_files: "reimportFiles";
        filesystem_changed: "filesystemChanged";
        script_classes_updated: "scriptClassesUpdated";
        sources_changed: "sourcesChanged";
        resources_reimporting: "resourcesReimporting";
        resources_reimported: "resourcesReimported";
        resources_reload: "resourcesReload";
    }
    /** Resource filesystem, as the editor sees it.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorfilesystem.html  
     */
    class EditorFileSystem<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Gets the root directory object. */
        getFilesystem(): null | EditorFileSystemDirectory
        
        /** Returns `true` if the filesystem is being scanned. */
        isScanning(): boolean
        
        /** Returns `true` if resources are currently being imported. */
        isImporting(): boolean
        
        /** Returns the scan progress for 0 to 1 if the FS is being scanned. */
        getScanningProgress(): float64
        
        /** Scan the filesystem for changes. */
        scan(): void
        
        /** Check if the source of any imported resource changed. */
        scanSources(): void
        
        /** Add a file in an existing directory, or schedule file information to be updated on editor restart. Can be used to update text files saved by an external program.  
         *  This will not import the file. To reimport, call [method reimport_files] or [method scan] methods.  
         */
        updateFile(path: string): void
        
        /** Returns a view into the filesystem at [param path]. */
        getFilesystemPath(path: string): null | EditorFileSystemDirectory
        
        /** Returns the resource type of the file, given the full path. This returns a string such as `"Resource"` or `"GDScript"`,  *not*  a file extension such as `".gd"`. */
        getFileType(path: string): string
        
        /** Reimports a set of files. Call this if these files or their `.import` files were directly edited by script or an external program.  
         *  If the file type changed or the file was newly created, use [method update_file] or [method scan].  
         *      
         *  **Note:** This function blocks until the import is finished. However, the main loop iteration, including timers and [method Node._process], will occur during the import process due to progress bar updates. Avoid calls to [method reimport_files] or [method scan] while an import is in progress.  
         */
        reimportFiles(files: PackedStringArray | string[]): void
        
        /** Emitted if the filesystem changed. */
        readonly filesystemChanged: Signal<() => void>
        
        /** Emitted when the list of global script classes gets updated. */
        readonly scriptClassesUpdated: Signal<() => void>
        
        /** Emitted if the source of any imported file changed. */
        readonly sourcesChanged: Signal<(exist: boolean) => void>
        
        /** Emitted before a resource is reimported. */
        readonly resourcesReimporting: Signal<(resources: PackedStringArray) => void>
        
        /** Emitted if a resource is reimported. */
        readonly resourcesReimported: Signal<(resources: PackedStringArray) => void>
        
        /** Emitted if at least one resource is reloaded when the filesystem is scanned. */
        readonly resourcesReload: Signal<(resources: PackedStringArray) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorFileSystem;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorFileSystem;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorFileSystemDirectory extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorFileSystemDirectory extends __NameMapGObject {
        get_subdir_count: "getSubdirCount";
        get_subdir: "getSubdir";
        get_file_count: "getFileCount";
        get_file: "getFile";
        get_file_path: "getFilePath";
        get_file_type: "getFileType";
        get_file_script_class_name: "getFileScriptClassName";
        get_file_script_class_extends: "getFileScriptClassExtends";
        get_file_import_is_valid: "getFileImportIsValid";
        get_name: "getName";
        get_path: "getPath";
        get_parent: "getParent";
        find_file_index: "findFileIndex";
        find_dir_index: "findDirIndex";
    }
    /** A directory for the resource filesystem.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorfilesystemdirectory.html  
     */
    class EditorFileSystemDirectory extends GObject {
        constructor(identifier?: any)
        /** Returns the number of subdirectories in this directory. */
        getSubdirCount(): int64
        
        /** Returns the subdirectory at index [param idx]. */
        getSubdir(idx: int64): null | EditorFileSystemDirectory
        
        /** Returns the number of files in this directory. */
        getFileCount(): int64
        
        /** Returns the name of the file at index [param idx]. */
        getFile(idx: int64): string
        
        /** Returns the path to the file at index [param idx]. */
        getFilePath(idx: int64): string
        
        /** Returns the resource type of the file at index [param idx]. This returns a string such as `"Resource"` or `"GDScript"`,  *not*  a file extension such as `".gd"`. */
        getFileType(idx: int64): StringName
        
        /** Returns the name of the script class defined in the file at index [param idx]. If the file doesn't define a script class using the `class_name` syntax, this will return an empty string. */
        getFileScriptClassName(idx: int64): string
        
        /** Returns the base class of the script class defined in the file at index [param idx]. If the file doesn't define a script class using the `class_name` syntax, this will return an empty string. */
        getFileScriptClassExtends(idx: int64): string
        
        /** Returns `true` if the file at index [param idx] imported properly. */
        getFileImportIsValid(idx: int64): boolean
        
        /** Returns the name of this directory. */
        getName(): string
        
        /** Returns the path to this directory. */
        getPath(): string
        
        /** Returns the parent directory for this directory or `null` if called on a directory at `res://` or `user://`. */
        getParent(): null | EditorFileSystemDirectory
        
        /** Returns the index of the file with name [param name] or `-1` if not found. */
        findFileIndex(name: string): int64
        
        /** Returns the index of the directory with name [param name] or `-1` if not found. */
        findDirIndex(name: string): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorFileSystemDirectory;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorFileSystemDirectory;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorFileSystemImportFormatSupportQuery extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorFileSystemImportFormatSupportQuery extends __NameMapRefCounted {
        _is_active: "_isActive";
        _get_file_extensions: "_getFileExtensions";
    }
    /** Used to query and configure import format support.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorfilesystemimportformatsupportquery.html  
     */
    class EditorFileSystemImportFormatSupportQuery extends RefCounted {
        constructor(identifier?: any)
        /** Return whether this importer is active. */
        /* gdvirtual */ _isActive(): boolean
        
        /** Return the file extensions supported. */
        /* gdvirtual */ _getFileExtensions(): PackedStringArray
        
        /** Query support. Return `false` if import must not continue. */
        /* gdvirtual */ _query(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorFileSystemImportFormatSupportQuery;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorFileSystemImportFormatSupportQuery;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorImportPlugin extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorImportPlugin extends __NameMapResourceImporter {
        _get_importer_name: "_getImporterName";
        _get_visible_name: "_getVisibleName";
        _get_preset_count: "_getPresetCount";
        _get_preset_name: "_getPresetName";
        _get_recognized_extensions: "_getRecognizedExtensions";
        _get_import_options: "_getImportOptions";
        _get_save_extension: "_getSaveExtension";
        _get_resource_type: "_getResourceType";
        _get_priority: "_getPriority";
        _get_import_order: "_getImportOrder";
        _get_format_version: "_getFormatVersion";
        _get_option_visibility: "_getOptionVisibility";
        _can_import_threaded: "_canImportThreaded";
        append_import_external_resource: "appendImportExternalResource";
    }
    /** Registers a custom resource importer in the editor. Use the class to parse any file and import it as a new resource type.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorimportplugin.html  
     */
    class EditorImportPlugin extends ResourceImporter {
        constructor(identifier?: any)
        /** Gets the unique name of the importer. */
        /* gdvirtual */ _getImporterName(): string
        
        /** Gets the name to display in the import window. You should choose this name as a continuation to "Import as", e.g. "Import as Special Mesh". */
        /* gdvirtual */ _getVisibleName(): string
        
        /** Gets the number of initial presets defined by the plugin. Use [method _get_import_options] to get the default options for the preset and [method _get_preset_name] to get the name of the preset.  
         *  By default, there are no presets.  
         */
        /* gdvirtual */ _getPresetCount(): int64
        
        /** Gets the name of the options preset at this index. */
        /* gdvirtual */ _getPresetName(presetIndex: int64): string
        
        /** Gets the list of file extensions to associate with this loader (case-insensitive). e.g. `["obj"]`. */
        /* gdvirtual */ _getRecognizedExtensions(): PackedStringArray
        
        /** Gets the options and default values for the preset at this index. Returns an Array of Dictionaries with the following keys: `name`, `default_value`, `property_hint` (optional), `hint_string` (optional), `usage` (optional). */
        /* gdvirtual */ _getImportOptions(path: string, presetIndex: int64): GArray<GDictionary>
        
        /** Gets the extension used to save this resource in the `.godot/imported` directory (see [member ProjectSettings.application/config/use_hidden_project_data_directory]). */
        /* gdvirtual */ _getSaveExtension(): string
        
        /** Gets the Godot resource type associated with this loader. e.g. `"Mesh"` or `"Animation"`. */
        /* gdvirtual */ _getResourceType(): string
        
        /** Gets the priority of this plugin for the recognized extension. Higher priority plugins will be preferred. The default priority is `1.0`. */
        /* gdvirtual */ _getPriority(): float64
        
        /** Gets the order of this importer to be run when importing resources. Importers with  *lower*  import orders will be called first, and higher values will be called later. Use this to ensure the importer runs after the dependencies are already imported. The default import order is `0` unless overridden by a specific importer. See [enum ResourceImporter.ImportOrder] for some predefined values. */
        /* gdvirtual */ _getImportOrder(): int64
        
        /** Gets the format version of this importer. Increment this version when making incompatible changes to the format of the imported resources.  
         *  If not overridden, the format version is `0`.  
         */
        /* gdvirtual */ _getFormatVersion(): int64
        
        /** Gets whether the import option specified by [param option_name] should be visible in the Import dock. The default implementation always returns `true`, making all options visible. This is mainly useful for hiding options that depend on others if one of them is disabled.  
         *    
         */
        /* gdvirtual */ _getOptionVisibility(path: string, optionName: StringName, options: GDictionary): boolean
        
        /** Imports [param source_file] with the specified import [param options]. Should return [constant @GlobalScope.OK] if the import is successful.  
         *  The imported resource is expected to be saved to `save_path + "." + _get_save_extension()`. If a different variant is preferred for a [url=https://docs.godotengine.org/en/latest/tutorials/export/feature_tags.html]feature tag[/url], save the variant to `save_path + "." + tag + "." + _get_save_extension()` and add the feature tag to [param platform_variants].  
         *  If additional resource files are generated in the resource filesystem (`res://`), add their full path to [param gen_files] so that the editor knows they depend on [param source_file].  
         *  This method must be overridden to do the actual importing work. See this class's description for an example of overriding this method.  
         */
        /* gdvirtual */ _import(sourceFile: string, savePath: string, options: GDictionary, platformVariants: GArray<string>, genFiles: GArray<string>): GError
        
        /** Tells whether this importer can be run in parallel on threads, or, on the contrary, it's only safe for the editor to call it from the main thread, for one file at a time.  
         *  If this importer's implementation is thread-safe and can be run in parallel, override this with `true` to optimize for concurrency.  
         *  If not overridden, returns `false`.  
         */
        /* gdvirtual */ _canImportThreaded(): boolean
        
        /** This function can only be called during the [method _import] callback and it allows manually importing resources from it. This is useful when the imported file generates external resources that require importing (as example, images). Custom parameters for the ".import" file can be passed via the [param custom_options]. Additionally, in cases where multiple importers can handle a file, the [param custom_importer] can be specified to force a specific one. This function performs a resource import and returns immediately with a success or error code. [param generator_parameters] defines optional extra metadata which will be stored as [code skip-lint]generator_parameters` in the `remap` section of the `.import` file, for example to store a md5 hash of the source data. */
        appendImportExternalResource(path: string, customOptions?: GDictionary /* = new GDictionary() */, customImporter?: string /* = '' */, generatorParameters?: any /* = {} */): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorImportPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorImportPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorInspector extends __RPCMapScrollContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorInspector extends __NameMapScrollContainer {
        _edit_request_change: "_editRequestChange";
        get_selected_path: "getSelectedPath";
        get_edited_object: "getEditedObject";
        collapse_all_folding: "collapseAllFolding";
        expand_all_folding: "expandAllFolding";
        expand_revertable: "expandRevertable";
        instantiate_property_editor: "instantiatePropertyEditor";
        create_default_inspector: "createDefaultInspector";
        set_property_clipboard: "setPropertyClipboard";
        get_property_clipboard: "getPropertyClipboard";
        property_selected: "propertySelected";
        property_keyed: "propertyKeyed";
        property_deleted: "propertyDeleted";
        resource_selected: "resourceSelected";
        object_id_selected: "objectIdSelected";
        property_edited: "propertyEdited";
        property_toggled: "propertyToggled";
        edited_object_changed: "editedObjectChanged";
        restart_requested: "restartRequested";
    }
    /** A control used to edit properties of an object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorinspector.html  
     */
    class EditorInspector<Map extends NodePathMap = any> extends ScrollContainer<Map> {
        constructor(identifier?: any)
        /** Shows the properties of the given [param object] in this inspector for editing. To clear the inspector, call this method with `null`.  
         *      
         *  **Note:** If you want to edit an object in the editor's main inspector, use the `edit_*` methods in [EditorInterface] instead.  
         */
        edit(object: GObject): void
        _editRequestChange(_unnamedArg0: GObject, _unnamedArg1: string): void
        
        /** Gets the path of the currently selected property. */
        getSelectedPath(): string
        
        /** Returns the object currently selected in this inspector. */
        getEditedObject(): null | GObject
        
        /** Collapses all foldable sections. */
        collapseAllFolding(): void
        
        /** Expands all foldable sections. */
        expandAllFolding(): void
        
        /** Expands only the foldable sections that contain a revertable (i.e. non-default) property. */
        expandRevertable(): void
        
        /** Creates a property editor that can be used by plugin UI to edit the specified property of an [param object]. */
        static instantiatePropertyEditor(object: GObject, type: Variant.Type, path: string, hint: PropertyHint, hintText: string, usage: int64, wide?: boolean /* = false */): null | EditorProperty
        
        /** Creates an inspector with the same configuration as the one used in the editor's Inspector dock. When passing a [LineEdit] into [param filter_line_edit], the inspector will filter its properties based on [member LineEdit.text] whenever [signal LineEdit.text_changed] is emitted. */
        static createDefaultInspector(filterLineEdit?: LineEdit): EditorInspector
        
        /** Sets the property clipboard's content to the given value. */
        static setPropertyClipboard(value: any): void
        
        /** Gets the value currently in the property clipboard. */
        static getPropertyClipboard(): any
        
        /** Emitted when a property is selected in the inspector. */
        readonly propertySelected: Signal<(property: string) => void>
        
        /** Emitted when a property is keyed in the inspector. Properties can be keyed by clicking the "key" icon next to a property when the Animation panel is toggled. */
        readonly propertyKeyed: Signal<(property: string, value: any, advance: boolean) => void>
        
        /** Emitted when a property is removed from the inspector. */
        readonly propertyDeleted: Signal<(property: string) => void>
        
        /** Emitted when a resource is selected in the inspector. */
        readonly resourceSelected: Signal<(resource: Resource, path: string) => void>
        
        /** Emitted when the Edit button of an [Object] has been pressed in the inspector. This is mainly used in the remote scene tree Inspector. */
        readonly objectIdSelected: Signal<(id: int64) => void>
        
        /** Emitted when a property is edited in the inspector. */
        readonly propertyEdited: Signal<(property: string) => void>
        
        /** Emitted when a boolean property is toggled in the inspector.  
         *      
         *  **Note:** This signal is never emitted if the internal `autoclear` property enabled. Since this property is always enabled in the editor inspector, this signal is never emitted by the editor itself.  
         */
        readonly propertyToggled: Signal<(property: string, checked: boolean) => void>
        
        /** Emitted when the object being edited by the inspector has changed. */
        readonly editedObjectChanged: Signal<() => void>
        
        /** Emitted when a property that requires a restart to be applied is edited in the inspector. This is only used in the Project Settings and Editor Settings. */
        readonly restartRequested: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorInspector;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorInspector;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorInspectorPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorInspectorPlugin extends __NameMapRefCounted {
        _can_handle: "_canHandle";
        _parse_begin: "_parseBegin";
        _parse_category: "_parseCategory";
        _parse_group: "_parseGroup";
        _parse_property: "_parseProperty";
        _parse_end: "_parseEnd";
        add_custom_control: "addCustomControl";
        add_property_editor: "addPropertyEditor";
        add_property_editor_for_multiple_properties: "addPropertyEditorForMultipleProperties";
    }
    /** Plugin for adding custom property editors on the inspector.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorinspectorplugin.html  
     */
    class EditorInspectorPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Returns `true` if this object can be handled by this plugin. */
        /* gdvirtual */ _canHandle(object: GObject): boolean
        
        /** Called to allow adding controls at the beginning of the property list for [param object]. */
        /* gdvirtual */ _parseBegin(object: GObject): void
        
        /** Called to allow adding controls at the beginning of a category in the property list for [param object]. */
        /* gdvirtual */ _parseCategory(object: GObject, category: string): void
        
        /** Called to allow adding controls at the beginning of a group or a sub-group in the property list for [param object]. */
        /* gdvirtual */ _parseGroup(object: GObject, group: string): void
        
        /** Called to allow adding property-specific editors to the property list for [param object]. The added editor control must extend [EditorProperty]. Returning `true` removes the built-in editor for this property, otherwise allows to insert a custom editor before the built-in one. */
        /* gdvirtual */ _parseProperty(object: GObject, type: Variant.Type, name: string, hintType: PropertyHint, hintString: string, usageFlags: PropertyUsageFlags, wide: boolean): boolean
        
        /** Called to allow adding controls at the end of the property list for [param object]. */
        /* gdvirtual */ _parseEnd(object: GObject): void
        
        /** Adds a custom control, which is not necessarily a property editor. */
        addCustomControl(control: Control): void
        
        /** Adds a property editor for an individual property. The [param editor] control must extend [EditorProperty].  
         *  There can be multiple property editors for a property. If [param add_to_end] is `true`, this newly added editor will be displayed after all the other editors of the property whose [param add_to_end] is `false`. For example, the editor uses this parameter to add an "Edit Region" button for [member Sprite2D.region_rect] below the regular [Rect2] editor.  
         *  [param label] can be used to choose a custom label for the property editor in the inspector. If left empty, the label is computed from the name of the property instead.  
         */
        addPropertyEditor(property: string, editor: Control, addToEnd?: boolean /* = false */, label?: string /* = '' */): void
        
        /** Adds an editor that allows modifying multiple properties. The [param editor] control must extend [EditorProperty]. */
        addPropertyEditorForMultipleProperties(label: string, properties: PackedStringArray | string[], editor: Control): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorInspectorPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorInspectorPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorNode3DGizmo extends __RPCMapNode3DGizmo {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorNode3DGizmo extends __NameMapNode3DGizmo {
        _get_handle_name: "_getHandleName";
        _is_handle_highlighted: "_isHandleHighlighted";
        _get_handle_value: "_getHandleValue";
        _begin_handle_action: "_beginHandleAction";
        _set_handle: "_setHandle";
        _commit_handle: "_commitHandle";
        _subgizmos_intersect_ray: "_subgizmosIntersectRay";
        _subgizmos_intersect_frustum: "_subgizmosIntersectFrustum";
        _set_subgizmo_transform: "_setSubgizmoTransform";
        _get_subgizmo_transform: "_getSubgizmoTransform";
        _commit_subgizmos: "_commitSubgizmos";
        add_lines: "addLines";
        add_mesh: "addMesh";
        add_collision_segments: "addCollisionSegments";
        add_collision_triangles: "addCollisionTriangles";
        add_unscaled_billboard: "addUnscaledBillboard";
        add_handles: "addHandles";
        set_node_3d: "setNode3D";
        get_node_3d: "getNode3D";
        get_plugin: "getPlugin";
        set_hidden: "setHidden";
        is_subgizmo_selected: "isSubgizmoSelected";
        get_subgizmo_selection: "getSubgizmoSelection";
        is_selected: "isSelected";
    }
    /** Gizmo for editing [Node3D] objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editornode3dgizmo.html  
     */
    class EditorNode3DGizmo extends Node3DGizmo {
        constructor(identifier?: any)
        /** Override this method to add all the gizmo elements whenever a gizmo update is requested. It's common to call [method clear] at the beginning of this method and then add visual elements depending on the node's properties. */
        /* gdvirtual */ _redraw(): void
        
        /** Override this method to return the name of an edited handle (handles must have been previously added by [method add_handles]). Handles can be named for reference to the user when editing.  
         *  The [param secondary] argument is `true` when the requested handle is secondary (see [method add_handles] for more information).  
         */
        /* gdvirtual */ _getHandleName(id: int64, secondary: boolean): string
        
        /** Override this method to return `true` whenever the given handle should be highlighted in the editor.  
         *  The [param secondary] argument is `true` when the requested handle is secondary (see [method add_handles] for more information).  
         */
        /* gdvirtual */ _isHandleHighlighted(id: int64, secondary: boolean): boolean
        
        /** Override this method to return the current value of a handle. This value will be requested at the start of an edit and used as the `restore` argument in [method _commit_handle].  
         *  The [param secondary] argument is `true` when the requested handle is secondary (see [method add_handles] for more information).  
         */
        /* gdvirtual */ _getHandleValue(id: int64, secondary: boolean): any
        /* gdvirtual */ _beginHandleAction(id: int64, secondary: boolean): void
        
        /** Override this method to update the node properties when the user drags a gizmo handle (previously added with [method add_handles]). The provided [param point] is the mouse position in screen coordinates and the [param camera] can be used to convert it to raycasts.  
         *  The [param secondary] argument is `true` when the edited handle is secondary (see [method add_handles] for more information).  
         */
        /* gdvirtual */ _setHandle(id: int64, secondary: boolean, camera: Camera3D, point: Vector2): void
        
        /** Override this method to commit a handle being edited (handles must have been previously added by [method add_handles]). This usually means creating an [UndoRedo] action for the change, using the current handle value as "do" and the [param restore] argument as "undo".  
         *  If the [param cancel] argument is `true`, the [param restore] value should be directly set, without any [UndoRedo] action.  
         *  The [param secondary] argument is `true` when the committed handle is secondary (see [method add_handles] for more information).  
         */
        /* gdvirtual */ _commitHandle(id: int64, secondary: boolean, restore: any, cancel: boolean): void
        
        /** Override this method to allow selecting subgizmos using mouse clicks. Given a [param camera] and a [param point] in screen coordinates, this method should return which subgizmo should be selected. The returned value should be a unique subgizmo identifier, which can have any non-negative value and will be used in other virtual methods like [method _get_subgizmo_transform] or [method _commit_subgizmos]. */
        /* gdvirtual */ _subgizmosIntersectRay(camera: Camera3D, point: Vector2): int64
        
        /** Override this method to allow selecting subgizmos using mouse drag box selection. Given a [param camera] and a [param frustum], this method should return which subgizmos are contained within the frustum. The [param frustum] argument consists of an array with all the [Plane]s that make up the selection frustum. The returned value should contain a list of unique subgizmo identifiers, which can have any non-negative value and will be used in other virtual methods like [method _get_subgizmo_transform] or [method _commit_subgizmos]. */
        /* gdvirtual */ _subgizmosIntersectFrustum(camera: Camera3D, frustum: GArray<Plane>): PackedInt32Array
        
        /** Override this method to update the node properties during subgizmo editing (see [method _subgizmos_intersect_ray] and [method _subgizmos_intersect_frustum]). The [param transform] is given in the [Node3D]'s local coordinate system. */
        /* gdvirtual */ _setSubgizmoTransform(id: int64, transform: Transform3D): void
        
        /** Override this method to return the current transform of a subgizmo. This transform will be requested at the start of an edit and used as the `restore` argument in [method _commit_subgizmos]. */
        /* gdvirtual */ _getSubgizmoTransform(id: int64): Transform3D
        
        /** Override this method to commit a group of subgizmos being edited (see [method _subgizmos_intersect_ray] and [method _subgizmos_intersect_frustum]). This usually means creating an [UndoRedo] action for the change, using the current transforms as "do" and the [param restores] transforms as "undo".  
         *  If the [param cancel] argument is `true`, the [param restores] transforms should be directly set, without any [UndoRedo] action.  
         */
        /* gdvirtual */ _commitSubgizmos(ids: PackedInt32Array | int32[], restores: GArray<Transform3D>, cancel: boolean): void
        
        /** Adds lines to the gizmo (as sets of 2 points), with a given material. The lines are used for visualizing the gizmo. Call this method during [method _redraw]. */
        addLines(lines: PackedVector3Array | Vector3[], material: Material, billboard?: boolean /* = false */, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Adds a mesh to the gizmo with the specified [param material], local [param transform] and [param skeleton]. Call this method during [method _redraw]. */
        addMesh(mesh: Mesh, material?: Material, transform?: Transform3D /* = new Transform3D() */, skeleton?: SkinReference): void
        
        /** Adds the specified [param segments] to the gizmo's collision shape for picking. Call this method during [method _redraw]. */
        addCollisionSegments(segments: PackedVector3Array | Vector3[]): void
        
        /** Adds collision triangles to the gizmo for picking. A [TriangleMesh] can be generated from a regular [Mesh] too. Call this method during [method _redraw]. */
        addCollisionTriangles(triangles: TriangleMesh): void
        
        /** Adds an unscaled billboard for visualization and selection. Call this method during [method _redraw]. */
        addUnscaledBillboard(material: Material, defaultScale?: float64 /* = 1 */, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Adds a list of handles (points) which can be used to edit the properties of the gizmo's [Node3D]. The [param ids] argument can be used to specify a custom identifier for each handle, if an empty array is passed, the ids will be assigned automatically from the [param handles] argument order.  
         *  The [param secondary] argument marks the added handles as secondary, meaning they will normally have lower selection priority than regular handles. When the user is holding the shift key secondary handles will switch to have higher priority than regular handles. This change in priority can be used to place multiple handles at the same point while still giving the user control on their selection.  
         *  There are virtual methods which will be called upon editing of these handles. Call this method during [method _redraw].  
         */
        addHandles(handles: PackedVector3Array | Vector3[], material: Material, ids: PackedInt32Array | int32[], billboard?: boolean /* = false */, secondary?: boolean /* = false */): void
        
        /** Sets the reference [Node3D] node for the gizmo. [param node] must inherit from [Node3D]. */
        setNode3D(node: Node): void
        
        /** Returns the [Node3D] node associated with this gizmo. */
        getNode3D(): null | Node3D
        
        /** Returns the [EditorNode3DGizmoPlugin] that owns this gizmo. It's useful to retrieve materials using [method EditorNode3DGizmoPlugin.get_material]. */
        getPlugin(): null | EditorNode3DGizmoPlugin
        
        /** Removes everything in the gizmo including meshes, collisions and handles. */
        clear(): void
        
        /** Sets the gizmo's hidden state. If `true`, the gizmo will be hidden. If `false`, it will be shown. */
        setHidden(hidden: boolean): void
        
        /** Returns `true` if the given subgizmo is currently selected. Can be used to highlight selected elements during [method _redraw]. */
        isSubgizmoSelected(id: int64): boolean
        
        /** Returns a list of the currently selected subgizmos. Can be used to highlight selected elements during [method _redraw]. */
        getSubgizmoSelection(): PackedInt32Array
        
        /** Returns `true` if this gizmo is currently selected. Can be used to write custom visualization logic during [method _redraw]. */
        isSelected(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorNode3DGizmo;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorNode3DGizmo;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorNode3DGizmoPlugin extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorNode3DGizmoPlugin extends __NameMapResource {
        _has_gizmo: "_hasGizmo";
        _create_gizmo: "_createGizmo";
        _get_gizmo_name: "_getGizmoName";
        _get_priority: "_getPriority";
        _can_be_hidden: "_canBeHidden";
        _is_selectable_when_hidden: "_isSelectableWhenHidden";
        _can_commit_handle_on_click: "_canCommitHandleOnClick";
        _get_handle_name: "_getHandleName";
        _is_handle_highlighted: "_isHandleHighlighted";
        _get_handle_value: "_getHandleValue";
        _begin_handle_action: "_beginHandleAction";
        _set_handle: "_setHandle";
        _commit_handle: "_commitHandle";
        _subgizmos_intersect_ray: "_subgizmosIntersectRay";
        _subgizmos_intersect_frustum: "_subgizmosIntersectFrustum";
        _get_subgizmo_transform: "_getSubgizmoTransform";
        _set_subgizmo_transform: "_setSubgizmoTransform";
        _commit_subgizmos: "_commitSubgizmos";
        create_material: "createMaterial";
        create_icon_material: "createIconMaterial";
        create_handle_material: "createHandleMaterial";
        add_material: "addMaterial";
        get_material: "getMaterial";
    }
    /** A class used by the editor to define Node3D gizmo types.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editornode3dgizmoplugin.html  
     */
    class EditorNode3DGizmoPlugin extends Resource {
        constructor(identifier?: any)
        /** Override this method to define which Node3D nodes have a gizmo from this plugin. Whenever a [Node3D] node is added to a scene this method is called, if it returns `true` the node gets a generic [EditorNode3DGizmo] assigned and is added to this plugin's list of active gizmos. */
        /* gdvirtual */ _hasGizmo(forNode3D: Node3D): boolean
        
        /** Override this method to return a custom [EditorNode3DGizmo] for the 3D nodes of your choice, return `null` for the rest of nodes. See also [method _has_gizmo]. */
        /* gdvirtual */ _createGizmo(forNode3D: Node3D): null | EditorNode3DGizmo
        
        /** Override this method to provide the name that will appear in the gizmo visibility menu. */
        /* gdvirtual */ _getGizmoName(): string
        
        /** Override this method to set the gizmo's priority. Gizmos with higher priority will have precedence when processing inputs like handles or subgizmos selection.  
         *  All built-in editor gizmos return a priority of `-1`. If not overridden, this method will return `0`, which means custom gizmos will automatically get higher priority than built-in gizmos.  
         */
        /* gdvirtual */ _getPriority(): int64
        
        /** Override this method to define whether the gizmos handled by this plugin can be hidden or not. Returns `true` if not overridden. */
        /* gdvirtual */ _canBeHidden(): boolean
        
        /** Override this method to define whether Node3D with this gizmo should be selectable even when the gizmo is hidden. */
        /* gdvirtual */ _isSelectableWhenHidden(): boolean
        
        /** Override this method to define whether the gizmos should commit when the final handle position is the same as the initial one. Returns `false` if not overridden. */
        /* gdvirtual */ _canCommitHandleOnClick(): boolean
        
        /** Override this method to add all the gizmo elements whenever a gizmo update is requested. It's common to call [method EditorNode3DGizmo.clear] at the beginning of this method and then add visual elements depending on the node's properties. */
        /* gdvirtual */ _redraw(gizmo: EditorNode3DGizmo): void
        
        /** Override this method to provide gizmo's handle names. The [param secondary] argument is `true` when the requested handle is secondary (see [method EditorNode3DGizmo.add_handles] for more information). Called for this plugin's active gizmos. */
        /* gdvirtual */ _getHandleName(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean): string
        
        /** Override this method to return `true` whenever to given handle should be highlighted in the editor. The [param secondary] argument is `true` when the requested handle is secondary (see [method EditorNode3DGizmo.add_handles] for more information). Called for this plugin's active gizmos. */
        /* gdvirtual */ _isHandleHighlighted(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean): boolean
        
        /** Override this method to return the current value of a handle. This value will be requested at the start of an edit and used as the `restore` argument in [method _commit_handle].  
         *  The [param secondary] argument is `true` when the requested handle is secondary (see [method EditorNode3DGizmo.add_handles] for more information).  
         *  Called for this plugin's active gizmos.  
         */
        /* gdvirtual */ _getHandleValue(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean): any
        /* gdvirtual */ _beginHandleAction(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean): void
        
        /** Override this method to update the node's properties when the user drags a gizmo handle (previously added with [method EditorNode3DGizmo.add_handles]). The provided [param screen_pos] is the mouse position in screen coordinates and the [param camera] can be used to convert it to raycasts.  
         *  The [param secondary] argument is `true` when the edited handle is secondary (see [method EditorNode3DGizmo.add_handles] for more information).  
         *  Called for this plugin's active gizmos.  
         */
        /* gdvirtual */ _setHandle(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean, camera: Camera3D, screenPos: Vector2): void
        
        /** Override this method to commit a handle being edited (handles must have been previously added by [method EditorNode3DGizmo.add_handles] during [method _redraw]). This usually means creating an [UndoRedo] action for the change, using the current handle value as "do" and the [param restore] argument as "undo".  
         *  If the [param cancel] argument is `true`, the [param restore] value should be directly set, without any [UndoRedo] action.  
         *  The [param secondary] argument is `true` when the committed handle is secondary (see [method EditorNode3DGizmo.add_handles] for more information).  
         *  Called for this plugin's active gizmos.  
         */
        /* gdvirtual */ _commitHandle(gizmo: EditorNode3DGizmo, handleId: int64, secondary: boolean, restore: any, cancel: boolean): void
        
        /** Override this method to allow selecting subgizmos using mouse clicks. Given a [param camera] and a [param screen_pos] in screen coordinates, this method should return which subgizmo should be selected. The returned value should be a unique subgizmo identifier, which can have any non-negative value and will be used in other virtual methods like [method _get_subgizmo_transform] or [method _commit_subgizmos]. Called for this plugin's active gizmos. */
        /* gdvirtual */ _subgizmosIntersectRay(gizmo: EditorNode3DGizmo, camera: Camera3D, screenPos: Vector2): int64
        
        /** Override this method to allow selecting subgizmos using mouse drag box selection. Given a [param camera] and [param frustum_planes], this method should return which subgizmos are contained within the frustums. The [param frustum_planes] argument consists of an array with all the [Plane]s that make up the selection frustum. The returned value should contain a list of unique subgizmo identifiers, these identifiers can have any non-negative value and will be used in other virtual methods like [method _get_subgizmo_transform] or [method _commit_subgizmos]. Called for this plugin's active gizmos. */
        /* gdvirtual */ _subgizmosIntersectFrustum(gizmo: EditorNode3DGizmo, camera: Camera3D, frustumPlanes: GArray<Plane>): PackedInt32Array
        
        /** Override this method to return the current transform of a subgizmo. As with all subgizmo methods, the transform should be in local space respect to the gizmo's Node3D. This transform will be requested at the start of an edit and used in the `restore` argument in [method _commit_subgizmos]. Called for this plugin's active gizmos. */
        /* gdvirtual */ _getSubgizmoTransform(gizmo: EditorNode3DGizmo, subgizmoId: int64): Transform3D
        
        /** Override this method to update the node properties during subgizmo editing (see [method _subgizmos_intersect_ray] and [method _subgizmos_intersect_frustum]). The [param transform] is given in the Node3D's local coordinate system. Called for this plugin's active gizmos. */
        /* gdvirtual */ _setSubgizmoTransform(gizmo: EditorNode3DGizmo, subgizmoId: int64, transform: Transform3D): void
        
        /** Override this method to commit a group of subgizmos being edited (see [method _subgizmos_intersect_ray] and [method _subgizmos_intersect_frustum]). This usually means creating an [UndoRedo] action for the change, using the current transforms as "do" and the [param restores] transforms as "undo".  
         *  If the [param cancel] argument is `true`, the [param restores] transforms should be directly set, without any [UndoRedo] action. As with all subgizmo methods, transforms are given in local space respect to the gizmo's Node3D. Called for this plugin's active gizmos.  
         */
        /* gdvirtual */ _commitSubgizmos(gizmo: EditorNode3DGizmo, ids: PackedInt32Array | int32[], restores: GArray<Transform3D>, cancel: boolean): void
        
        /** Creates an unshaded material with its variants (selected and/or editable) and adds them to the internal material list. They can then be accessed with [method get_material] and used in [method EditorNode3DGizmo.add_mesh] and [method EditorNode3DGizmo.add_lines]. Should not be overridden. */
        createMaterial(name: string, color: Color, billboard?: boolean /* = false */, onTop?: boolean /* = false */, useVertexColor?: boolean /* = false */): void
        
        /** Creates an icon material with its variants (selected and/or editable) and adds them to the internal material list. They can then be accessed with [method get_material] and used in [method EditorNode3DGizmo.add_unscaled_billboard]. Should not be overridden. */
        createIconMaterial(name: string, texture: Texture2D, onTop?: boolean /* = false */, color?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Creates a handle material with its variants (selected and/or editable) and adds them to the internal material list. They can then be accessed with [method get_material] and used in [method EditorNode3DGizmo.add_handles]. Should not be overridden.  
         *  You can optionally provide a texture to use instead of the default icon.  
         */
        createHandleMaterial(name: string, billboard?: boolean /* = false */, texture?: Texture2D): void
        
        /** Adds a new material to the internal material list for the plugin. It can then be accessed with [method get_material]. Should not be overridden. */
        addMaterial(name: string, material: StandardMaterial3D): void
        
        /** Gets material from the internal list of materials. If an [EditorNode3DGizmo] is provided, it will try to get the corresponding variant (selected and/or editable). */
        getMaterial(name: string, gizmo?: EditorNode3DGizmo): null | StandardMaterial3D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorNode3DGizmoPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorNode3DGizmoPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorPaths extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorPaths extends __NameMapGObject {
        get_data_dir: "getDataDir";
        get_config_dir: "getConfigDir";
        get_cache_dir: "getCacheDir";
        is_self_contained: "isSelfContained";
        get_self_contained_file: "getSelfContainedFile";
        get_project_settings_dir: "getProjectSettingsDir";
    }
    /** Editor-only singleton that returns paths to various OS-specific data folders and files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorpaths.html  
     */
    class EditorPaths extends GObject {
        constructor(identifier?: any)
        /** Returns the absolute path to the user's data folder. This folder should be used for  *persistent*  user data files such as installed export templates.  
         *  **Default paths per platform:**  
         *  [codeblock lang=text]  
         *  - Windows: %APPDATA%\Godot\                    (same as `get_config_dir()`)  
         *  - macOS: ~/Library/Application Support/Godot/  (same as `get_config_dir()`)  
         *  - Linux: ~/.local/share/godot/  
         *  [/codeblock]  
         */
        getDataDir(): string
        
        /** Returns the absolute path to the user's configuration folder. This folder should be used for  *persistent*  user configuration files.  
         *  **Default paths per platform:**  
         *  [codeblock lang=text]  
         *  - Windows: %APPDATA%\Godot\                    (same as `get_data_dir()`)  
         *  - macOS: ~/Library/Application Support/Godot/  (same as `get_data_dir()`)  
         *  - Linux: ~/.config/godot/  
         *  [/codeblock]  
         */
        getConfigDir(): string
        
        /** Returns the absolute path to the user's cache folder. This folder should be used for temporary data that can be removed safely whenever the editor is closed (such as generated resource thumbnails).  
         *  **Default paths per platform:**  
         *  [codeblock lang=text]  
         *  - Windows: %LOCALAPPDATA%\Godot\  
         *  - macOS: ~/Library/Caches/Godot/  
         *  - Linux: ~/.cache/godot/  
         *  [/codeblock]  
         */
        getCacheDir(): string
        
        /** Returns `true` if the editor is marked as self-contained, `false` otherwise. When self-contained mode is enabled, user configuration, data and cache files are saved in an `editor_data/` folder next to the editor binary. This makes portable usage easier and ensures the Godot editor minimizes file writes outside its own folder. Self-contained mode is not available for exported projects.  
         *  Self-contained mode can be enabled by creating a file named `._sc_` or `_sc_` in the same folder as the editor binary or macOS .app bundle while the editor is not running. See also [method get_self_contained_file].  
         *      
         *  **Note:** On macOS, quarantine flag should be manually removed before using self-contained mode, see [url=https://docs.godotengine.org/en/stable/tutorials/export/running_on_macos.html]Running on macOS[/url].  
         *      
         *  **Note:** On macOS, placing `_sc_` or any other file inside .app bundle will break digital signature and make it non-portable, consider placing it in the same folder as the .app bundle instead.  
         *      
         *  **Note:** The Steam release of Godot uses self-contained mode by default.  
         */
        isSelfContained(): boolean
        
        /** Returns the absolute path to the self-contained file that makes the current Godot editor instance be considered as self-contained. Returns an empty string if the current Godot editor instance isn't self-contained. See also [method is_self_contained]. */
        getSelfContainedFile(): string
        
        /** Returns the relative path to the editor settings for this project. This is usually `"res://.godot/editor"`. Projects all have a unique subdirectory inside the settings path where project-specific editor settings are saved. */
        getProjectSettingsDir(): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorPaths;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorPaths;
    }
    namespace EditorPlugin {
        enum CustomControlContainer {
            ContainerToolbar = 0,
            ContainerSpatialEditorMenu = 1,
            ContainerSpatialEditorSideLeft = 2,
            ContainerSpatialEditorSideRight = 3,
            ContainerSpatialEditorBottom = 4,
            ContainerCanvasEditorMenu = 5,
            ContainerCanvasEditorSideLeft = 6,
            ContainerCanvasEditorSideRight = 7,
            ContainerCanvasEditorBottom = 8,
            ContainerInspectorBottom = 9,
            ContainerProjectSettingTabLeft = 10,
            ContainerProjectSettingTabRight = 11,
        }
        enum DockSlot {
            DockSlotNone = -1,
            DockSlotLeftUl = 0,
            DockSlotLeftBl = 1,
            DockSlotLeftUr = 2,
            DockSlotLeftBr = 3,
            DockSlotRightUl = 4,
            DockSlotRightBl = 5,
            DockSlotRightUr = 6,
            DockSlotRightBr = 7,
            DockSlotBottom = 8,
            DockSlotMax = 9,
        }
        enum AfterGuiInput {
            AfterGuiInputPass = 0,
            AfterGuiInputStop = 1,
            AfterGuiInputCustom = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorPlugin extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorPlugin extends __NameMapNode {
        _forward_canvas_gui_input: "_forwardCanvasGuiInput";
        _forward_canvas_draw_over_viewport: "_forwardCanvasDrawOverViewport";
        _forward_canvas_force_draw_over_viewport: "_forwardCanvasForceDrawOverViewport";
        _forward_3d_gui_input: "_forward3DGuiInput";
        _forward_3d_draw_over_viewport: "_forward3DDrawOverViewport";
        _forward_3d_force_draw_over_viewport: "_forward3DForceDrawOverViewport";
        _get_plugin_name: "_getPluginName";
        _get_plugin_icon: "_getPluginIcon";
        _has_main_screen: "_hasMainScreen";
        _make_visible: "_makeVisible";
        _get_state: "_getState";
        _set_state: "_setState";
        _get_unsaved_status: "_getUnsavedStatus";
        _save_external_data: "_saveExternalData";
        _apply_changes: "_applyChanges";
        _get_breakpoints: "_getBreakpoints";
        _set_window_layout: "_setWindowLayout";
        _get_window_layout: "_getWindowLayout";
        _run_scene: "_runScene";
        _enable_plugin: "_enablePlugin";
        _disable_plugin: "_disablePlugin";
        add_dock: "addDock";
        remove_dock: "removeDock";
        add_control_to_container: "addControlToContainer";
        remove_control_from_container: "removeControlFromContainer";
        add_tool_menu_item: "addToolMenuItem";
        add_tool_submenu_item: "addToolSubmenuItem";
        remove_tool_menu_item: "removeToolMenuItem";
        get_export_as_menu: "getExportAsMenu";
        add_custom_type: "addCustomType";
        remove_custom_type: "removeCustomType";
        add_control_to_dock: "addControlToDock";
        remove_control_from_docks: "removeControlFromDocks";
        set_dock_tab_icon: "setDockTabIcon";
        add_control_to_bottom_panel: "addControlToBottomPanel";
        remove_control_from_bottom_panel: "removeControlFromBottomPanel";
        add_autoload_singleton: "addAutoloadSingleton";
        remove_autoload_singleton: "removeAutoloadSingleton";
        update_overlays: "updateOverlays";
        make_bottom_panel_item_visible: "makeBottomPanelItemVisible";
        hide_bottom_panel: "hideBottomPanel";
        get_undo_redo: "getUndoRedo";
        add_undo_redo_inspector_hook_callback: "addUndoRedoInspectorHookCallback";
        remove_undo_redo_inspector_hook_callback: "removeUndoRedoInspectorHookCallback";
        queue_save_layout: "queueSaveLayout";
        add_translation_parser_plugin: "addTranslationParserPlugin";
        remove_translation_parser_plugin: "removeTranslationParserPlugin";
        add_import_plugin: "addImportPlugin";
        remove_import_plugin: "removeImportPlugin";
        add_export_plugin: "addExportPlugin";
        remove_export_plugin: "removeExportPlugin";
        add_export_platform: "addExportPlatform";
        remove_export_platform: "removeExportPlatform";
        add_inspector_plugin: "addInspectorPlugin";
        remove_inspector_plugin: "removeInspectorPlugin";
        add_resource_conversion_plugin: "addResourceConversionPlugin";
        remove_resource_conversion_plugin: "removeResourceConversionPlugin";
        set_input_event_forwarding_always_enabled: "setInputEventForwardingAlwaysEnabled";
        set_force_draw_over_forwarding_enabled: "setForceDrawOverForwardingEnabled";
        add_context_menu_plugin: "addContextMenuPlugin";
        remove_context_menu_plugin: "removeContextMenuPlugin";
        add_node_3d_gizmo_plugin: "addNode3DGizmoPlugin";
        remove_node_3d_gizmo_plugin: "removeNode3DGizmoPlugin";
        add_scene_format_importer_plugin: "addSceneFormatImporterPlugin";
        remove_scene_format_importer_plugin: "removeSceneFormatImporterPlugin";
        add_scene_post_import_plugin: "addScenePostImportPlugin";
        remove_scene_post_import_plugin: "removeScenePostImportPlugin";
        get_editor_interface: "getEditorInterface";
        get_script_create_dialog: "getScriptCreateDialog";
        add_debugger_plugin: "addDebuggerPlugin";
        remove_debugger_plugin: "removeDebuggerPlugin";
        get_plugin_version: "getPluginVersion";
        scene_changed: "sceneChanged";
        scene_closed: "sceneClosed";
        main_screen_changed: "mainScreenChanged";
        resource_saved: "resourceSaved";
        scene_saved: "sceneSaved";
        project_settings_changed: "projectSettingsChanged";
    }
    /** Used by the editor to extend its functionality.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorplugin.html  
     */
    class EditorPlugin<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Called when there is a root node in the current edited scene, [method _handles] is implemented, and an [InputEvent] happens in the 2D viewport. If this method returns `true`, [param event] is intercepted by this [EditorPlugin], otherwise [param event] is forwarded to other Editor classes.  
         *    
         *  This method must return `false` in order to forward the [InputEvent] to other Editor classes.  
         *    
         */
        /* gdvirtual */ _forwardCanvasGuiInput(event: InputEvent): boolean
        
        /** Called by the engine when the 2D editor's viewport is updated. [param viewport_control] is an overlay on top of the viewport and it can be used for drawing. You can update the viewport manually by calling [method update_overlays].  
         *    
         */
        /* gdvirtual */ _forwardCanvasDrawOverViewport(viewportControl: Control): void
        
        /** This method is the same as [method _forward_canvas_draw_over_viewport], except it draws on top of everything. Useful when you need an extra layer that shows over anything else.  
         *  You need to enable calling of this method by using [method set_force_draw_over_forwarding_enabled].  
         */
        /* gdvirtual */ _forwardCanvasForceDrawOverViewport(viewportControl: Control): void
        
        /** Called when there is a root node in the current edited scene, [method _handles] is implemented, and an [InputEvent] happens in the 3D viewport. The return value decides whether the [InputEvent] is consumed or forwarded to other [EditorPlugin]s. See [enum AfterGUIInput] for options.  
         *    
         *  This method must return [constant AFTER_GUI_INPUT_PASS] in order to forward the [InputEvent] to other Editor classes.  
         *    
         */
        /* gdvirtual */ _forward3DGuiInput(viewportCamera: Camera3D, event: InputEvent): int64
        
        /** Called by the engine when the 3D editor's viewport is updated. [param viewport_control] is an overlay on top of the viewport and it can be used for drawing. You can update the viewport manually by calling [method update_overlays].  
         *    
         */
        /* gdvirtual */ _forward3DDrawOverViewport(viewportControl: Control): void
        
        /** This method is the same as [method _forward_3d_draw_over_viewport], except it draws on top of everything. Useful when you need an extra layer that shows over anything else.  
         *  You need to enable calling of this method by using [method set_force_draw_over_forwarding_enabled].  
         */
        /* gdvirtual */ _forward3DForceDrawOverViewport(viewportControl: Control): void
        
        /** Override this method in your plugin to provide the name of the plugin when displayed in the Godot editor.  
         *  For main screen plugins, this appears at the top of the screen, to the right of the "2D", "3D", "Script", "Game", and "Asset Store" buttons.  
         *      
         *  **Note:** Main screen plugins should instead use [member EditorDock.title] of a main screen dock.  
         */
        /* gdvirtual */ _getPluginName(): string
        
        /** Override this method in your plugin to return a [Texture2D] in order to give it an icon.  
         *  For main screen plugins, this appears at the top of the screen, to the right of the "2D", "3D", "Script", "Game", and "Asset Store" buttons.  
         *  Ideally, the plugin icon should be white with a transparent background and 16×16 pixels in size.  
         *    
         */
        /* gdvirtual */ _getPluginIcon(): null | Texture2D
        
        /** Return `true` if this is a main screen editor plugin (it goes in the workspace selector together with **2D**, **3D**, **Script**, **Game**, and **Asset Store**).  
         *  You can add a main screen dock by using [EditorDock] with [constant EditorDock.DOCK_LAYOUT_MAIN_SCREEN] as available layout.  
         */
        /* gdvirtual */ _hasMainScreen(): boolean
        
        /** This function will be called when the editor is requested to become visible. It is used for plugins that edit a specific object type.  
         *  Remember that you have to manage the visibility of all your editor controls manually.  
         */
        /* gdvirtual */ _makeVisible(visible: boolean): void
        
        /** This function is used for plugins that edit specific object types (nodes or resources). It requests the editor to edit the given object.  
         *  [param object] can be `null` if the plugin was editing an object, but there is no longer any selected object handled by this plugin. It can be used to cleanup editing state.  
         */
        /* gdvirtual */ _edit(object: GObject): void
        
        /** Implement this function if your plugin edits a specific type of object (Resource or Node). If you return `true`, then you will get the functions [method _edit] and [method _make_visible] called when the editor requests them. If you have declared the methods [method _forward_canvas_gui_input] and [method _forward_3d_gui_input] these will be called too.  
         *      
         *  **Note:** Each plugin should handle only one type of objects at a time. If a plugin handles more types of objects and they are edited at the same time, it will result in errors.  
         */
        /* gdvirtual */ _handles(object: GObject): boolean
        
        /** Override this method to provide a state data you want to be saved, like view position, grid settings, folding, etc. This is used when saving the scene (so state is kept when opening it again) and for switching tabs (so state can be restored when the tab returns). This data is automatically saved for each scene in an `editstate` file in the editor metadata folder. If you want to store global (scene-independent) editor data for your plugin, you can use [method _get_window_layout] instead.  
         *  Use [method _set_state] to restore your saved state.  
         *      
         *  **Note:** This method should not be used to save important settings that should persist with the project.  
         *      
         *  **Note:** You must implement [method _get_plugin_name] for the state to be stored and restored correctly.  
         *    
         */
        /* gdvirtual */ _getState(): GDictionary
        
        /** Restore the state saved by [method _get_state]. This method is called when the current scene tab is changed in the editor.  
         *      
         *  **Note:** Your plugin must implement [method _get_plugin_name], otherwise it will not be recognized and this method will not be called.  
         *    
         */
        /* gdvirtual */ _setState(state: GDictionary): void
        
        /** Clear all the state and reset the object being edited to zero. This ensures your plugin does not keep editing a currently existing node, or a node from the wrong scene. */
        /* gdvirtual */ _clear(): void
        
        /** Override this method to provide a custom message that lists unsaved changes. The editor will call this method when exiting or when closing a scene, and display the returned string in a confirmation dialog. Return empty string if the plugin has no unsaved changes.  
         *  When closing a scene, [param for_scene] is the path to the scene being closed. You can use it to handle built-in resources in that scene.  
         *  If the user confirms saving, [method _save_external_data] will be called, before closing the editor.  
         *    
         *  If the plugin has no scene-specific changes, you can ignore the calls when closing scenes:  
         *    
         */
        /* gdvirtual */ _getUnsavedStatus(forScene: string): string
        
        /** This method is called after the editor saves the project or when it's closed. It asks the plugin to save edited external scenes/resources. */
        /* gdvirtual */ _saveExternalData(): void
        
        /** This method is called when the editor is about to save the project, switch to another tab, etc. It asks the plugin to apply any pending state changes to ensure consistency.  
         *  This is used, for example, in shader editors to let the plugin know that it must apply the shader code being written by the user to the object.  
         */
        /* gdvirtual */ _applyChanges(): void
        
        /** This is for editors that edit script-based objects. You can return a list of breakpoints in the format (`script:line`), for example: `res://path_to_script.gd:25`. */
        /* gdvirtual */ _getBreakpoints(): PackedStringArray
        
        /** Restore the plugin GUI layout and data saved by [method _get_window_layout]. This method is called for every plugin on editor startup. Use the provided [param configuration] file to read your saved data.  
         *    
         */
        /* gdvirtual */ _setWindowLayout(configuration: ConfigFile): void
        
        /** Override this method to provide the GUI layout of the plugin or any other data you want to be stored. This is used to save the project's editor layout when [method queue_save_layout] is called or the editor layout was changed (for example changing the position of a dock). The data is stored in the `editor_layout.cfg` file in the editor metadata directory.  
         *  Use [method _set_window_layout] to restore your saved layout.  
         *    
         */
        /* gdvirtual */ _getWindowLayout(configuration: ConfigFile): void
        
        /** This method is called when the editor is about to run the project. The plugin can then perform required operations before the project runs.  
         *  This method must return a boolean. If this method returns `false`, the project will not run. The run is aborted immediately, so this also prevents all other plugins' [method _build] methods from running.  
         */
        /* gdvirtual */ _build(): boolean
        
        /** This function is called when an individual scene is about to be played in the editor. [param args] is a list of command line arguments that will be passed to the new Godot instance, which will be replaced by the list returned by this function.  
         *    
         *      
         *  **Note:** Text that is printed in this method will not be visible in the editor's Output panel unless [member EditorSettings.run/output/always_clear_output_on_play] is `false`.  
         */
        /* gdvirtual */ _runScene(scene: string, args: PackedStringArray | string[]): PackedStringArray
        
        /** Called by the engine when the user enables the [EditorPlugin] in the Plugin tab of the project settings window. */
        /* gdvirtual */ _enablePlugin(): void
        
        /** Called by the engine when the user disables the [EditorPlugin] in the Plugin tab of the project settings window. */
        /* gdvirtual */ _disablePlugin(): void
        
        /** Adds a new dock.  
         *  When your plugin is deactivated, make sure to remove your custom dock with [method remove_dock] and free it with [method Node.queue_free].  
         */
        addDock(dock: EditorDock): void
        
        /** Removes [param dock] from the available docks. You should manually call [method Node.queue_free] to free it. */
        removeDock(dock: EditorDock): void
        
        /** Adds a custom control to a container in the editor UI.  
         *  Please remember that you have to manage the visibility of your custom controls yourself (and likely hide it after adding it).  
         *  When your plugin is deactivated, make sure to remove your custom control with [method remove_control_from_container] and free it with [method Node.queue_free].  
         */
        addControlToContainer(container: EditorPlugin.CustomControlContainer, control: Control): void
        
        /** Removes the control from the specified container. You have to manually [method Node.queue_free] the control. */
        removeControlFromContainer(container: EditorPlugin.CustomControlContainer, control: Control): void
        
        /** Adds a custom menu item to **Project > Tools** named [param name]. When clicked, the provided [param callable] will be called. */
        addToolMenuItem(name: string, callable: Callable): void
        
        /** Adds a custom [PopupMenu] submenu under **Project > Tools >** [param name]. Use [method remove_tool_menu_item] on plugin clean up to remove the menu. */
        addToolSubmenuItem(name: string, submenu: PopupMenu): void
        
        /** Removes a menu [param name] from **Project > Tools**. */
        removeToolMenuItem(name: string): void
        
        /** Returns the [PopupMenu] under **Scene > Export As...**. */
        getExportAsMenu(): null | PopupMenu
        
        /** Adds a custom type, which will appear in the list of nodes or resources.  
         *  When a given node or resource is selected, the base type will be instantiated (e.g. "Node3D", "Control", "Resource"), then the script will be loaded and set to this object.  
         *      
         *  **Note:** The base type is the base engine class which this type's class hierarchy inherits, not any custom type parent classes.  
         *  You can use the virtual method [method _handles] to check if your custom object is being edited by checking the script or using the `is` keyword.  
         *  During run-time, this will be a simple object with a script so this function does not need to be called then.  
         *      
         *  **Note:** Custom types added this way are not true classes. They are just a helper to create a node with specific script.  
         */
        addCustomType(type: string, base: string, script: Script, icon: Texture2D): void
        
        /** Removes a custom type added by [method add_custom_type]. */
        removeCustomType(type: string): void
        
        /** Adds the control to a specific dock slot.  
         *  If the dock is repositioned and as long as the plugin is active, the editor will save the dock position on further sessions.  
         *  When your plugin is deactivated, make sure to remove your custom control with [method remove_control_from_docks] and free it with [method Node.queue_free].  
         *  Optionally, you can specify a shortcut parameter. When pressed, this shortcut will open and focus the dock.  
         */
        addControlToDock(slot: EditorPlugin.DockSlot, control: Control, shortcut?: Shortcut): void
        
        /** Removes the control from the dock. You have to manually [method Node.queue_free] the control. */
        removeControlFromDocks(control: Control): void
        
        /** Sets the tab icon for the given control in a dock slot. Setting to `null` removes the icon. */
        setDockTabIcon(control: Control, icon: Texture2D): void
        
        /** Adds a control to the bottom panel (together with Output, Debug, Animation, etc.). Returns a reference to a button that is outside the scene tree. It's up to you to hide/show the button when needed. When your plugin is deactivated, make sure to remove your custom control with [method remove_control_from_bottom_panel] and free it with [method Node.queue_free].  
         *  [param shortcut] is a shortcut that, when activated, will toggle the bottom panel's visibility. The shortcut object is only set when this control is added to the bottom panel.  
         *      
         *  **Note:** See the default editor bottom panel shortcuts in the Editor Settings for inspiration. By convention, they all use the [kbd]Alt[/kbd] modifier.  
         */
        addControlToBottomPanel(control: Control, title: string, shortcut?: Shortcut): null | Button
        
        /** Removes the control from the bottom panel. You have to manually [method Node.queue_free] the control. */
        removeControlFromBottomPanel(control: Control): void
        
        /** Adds a script at [param path] to the Autoload list as [param name]. */
        addAutoloadSingleton(name: string, path: string): void
        
        /** Removes an Autoload [param name] from the list. */
        removeAutoloadSingleton(name: string): void
        
        /** Updates the overlays of the 2D and 3D editor viewport. Causes methods [method _forward_canvas_draw_over_viewport], [method _forward_canvas_force_draw_over_viewport], [method _forward_3d_draw_over_viewport] and [method _forward_3d_force_draw_over_viewport] to be called. */
        updateOverlays(): int64
        
        /** Makes a specific item in the bottom panel visible. */
        makeBottomPanelItemVisible(item: Control): void
        
        /** Minimizes the bottom panel. */
        hideBottomPanel(): void
        
        /** Gets the undo/redo object. Most actions in the editor can be undoable, so use this object to make sure this happens when it's worth it. */
        getUndoRedo(): null | EditorUndoRedoManager
        
        /** Hooks a callback into the undo/redo action creation when a property is modified in the inspector. This allows, for example, to save other properties that may be lost when a given property is modified.  
         *  The callback should have 4 arguments: [Object] `undo_redo`, [Object] `modified_object`, [String] `property` and [Variant] `new_value`. They are, respectively, the [UndoRedo] object used by the inspector, the currently modified object, the name of the modified property and the new value the property is about to take.  
         */
        addUndoRedoInspectorHookCallback(callable: Callable): void
        
        /** Removes a callback previously added by [method add_undo_redo_inspector_hook_callback]. */
        removeUndoRedoInspectorHookCallback(callable: Callable): void
        
        /** Queue save the project's editor layout. */
        queueSaveLayout(): void
        
        /** Registers a custom translation parser plugin for extracting translatable strings from custom files. */
        addTranslationParserPlugin(parser: EditorTranslationParserPlugin): void
        
        /** Removes a custom translation parser plugin registered by [method add_translation_parser_plugin]. */
        removeTranslationParserPlugin(parser: EditorTranslationParserPlugin): void
        
        /** Registers a new [EditorImportPlugin]. Import plugins are used to import custom and unsupported assets as a custom [Resource] type.  
         *  If [param first_priority] is `true`, the new import plugin is inserted first in the list and takes precedence over pre-existing plugins.  
         *      
         *  **Note:** If you want to import custom 3D asset formats use [method add_scene_format_importer_plugin] instead.  
         *  See [method add_inspector_plugin] for an example of how to register a plugin.  
         */
        addImportPlugin(importer: EditorImportPlugin, firstPriority?: boolean /* = false */): void
        
        /** Removes an import plugin registered by [method add_import_plugin]. */
        removeImportPlugin(importer: EditorImportPlugin): void
        
        /** Registers a new [EditorExportPlugin]. Export plugins are used to perform tasks when the project is being exported.  
         *  See [method add_inspector_plugin] for an example of how to register a plugin.  
         */
        addExportPlugin(plugin: EditorExportPlugin): void
        
        /** Removes an export plugin registered by [method add_export_plugin]. */
        removeExportPlugin(plugin: EditorExportPlugin): void
        
        /** Registers a new [EditorExportPlatform]. Export platforms provides functionality of exporting to the specific platform. */
        addExportPlatform(platform: EditorExportPlatform): void
        
        /** Removes an export platform registered by [method add_export_platform]. */
        removeExportPlatform(platform: EditorExportPlatform): void
        
        /** Registers a new [EditorInspectorPlugin]. Inspector plugins are used to extend [EditorInspector] and provide custom configuration tools for your object's properties.  
         *      
         *  **Note:** Always use [method remove_inspector_plugin] to remove the registered [EditorInspectorPlugin] when your [EditorPlugin] is disabled to prevent leaks and an unexpected behavior.  
         *    
         */
        addInspectorPlugin(plugin: EditorInspectorPlugin): void
        
        /** Removes an inspector plugin registered by [method add_inspector_plugin]. */
        removeInspectorPlugin(plugin: EditorInspectorPlugin): void
        
        /** Registers a new [EditorResourceConversionPlugin]. Resource conversion plugins are used to add custom resource converters to the editor inspector.  
         *  See [EditorResourceConversionPlugin] for an example of how to create a resource conversion plugin.  
         */
        addResourceConversionPlugin(plugin: EditorResourceConversionPlugin): void
        
        /** Removes a resource conversion plugin registered by [method add_resource_conversion_plugin]. */
        removeResourceConversionPlugin(plugin: EditorResourceConversionPlugin): void
        
        /** Use this method if you always want to receive inputs from 3D view screen inside [method _forward_3d_gui_input]. It might be especially usable if your plugin will want to use raycast in the scene. */
        setInputEventForwardingAlwaysEnabled(): void
        
        /** Enables calling of [method _forward_canvas_force_draw_over_viewport] for the 2D editor and [method _forward_3d_force_draw_over_viewport] for the 3D editor when their viewports are updated. You need to call this method only once and it will work permanently for this plugin. */
        setForceDrawOverForwardingEnabled(): void
        
        /** Adds a plugin to the context menu. [param slot] is the context menu where the plugin will be added.  
         *      
         *  **Note:** A plugin instance can belong only to a single context menu slot.  
         */
        addContextMenuPlugin(slot: EditorContextMenuPlugin.ContextMenuSlot, plugin: EditorContextMenuPlugin): void
        
        /** Removes the specified context menu plugin. */
        removeContextMenuPlugin(plugin: EditorContextMenuPlugin): void
        
        /** Registers a new [EditorNode3DGizmoPlugin]. Gizmo plugins are used to add custom gizmos to the 3D preview viewport for a [Node3D].  
         *  See [method add_inspector_plugin] for an example of how to register a plugin.  
         */
        addNode3DGizmoPlugin(plugin: EditorNode3DGizmoPlugin): void
        
        /** Removes a gizmo plugin registered by [method add_node_3d_gizmo_plugin]. */
        removeNode3DGizmoPlugin(plugin: EditorNode3DGizmoPlugin): void
        
        /** Registers a new [EditorSceneFormatImporter]. Scene importers are used to import custom 3D asset formats as scenes.  
         *  If [param first_priority] is `true`, the new import plugin is inserted first in the list and takes precedence over pre-existing plugins.  
         */
        addSceneFormatImporterPlugin(sceneFormatImporter: EditorSceneFormatImporter, firstPriority?: boolean /* = false */): void
        
        /** Removes a scene format importer registered by [method add_scene_format_importer_plugin]. */
        removeSceneFormatImporterPlugin(sceneFormatImporter: EditorSceneFormatImporter): void
        
        /** Add an [EditorScenePostImportPlugin]. These plugins allow customizing the import process of 3D assets by adding new options to the import dialogs.  
         *  If [param first_priority] is `true`, the new import plugin is inserted first in the list and takes precedence over pre-existing plugins.  
         */
        addScenePostImportPlugin(sceneImportPlugin: EditorScenePostImportPlugin, firstPriority?: boolean /* = false */): void
        
        /** Remove the [EditorScenePostImportPlugin], added with [method add_scene_post_import_plugin]. */
        removeScenePostImportPlugin(sceneImportPlugin: EditorScenePostImportPlugin): void
        
        /** Returns the [EditorInterface] singleton instance. */
        getEditorInterface(): null | EditorInterface
        
        /** Gets the Editor's dialog used for making scripts.  
         *      
         *  **Note:** Users can configure it before use.  
         *  **Warning:** Removing and freeing this node will render a part of the editor useless and may cause a crash.  
         */
        getScriptCreateDialog(): null | ScriptCreateDialog
        
        /** Adds a [Script] as debugger plugin to the Debugger. The script must extend [EditorDebuggerPlugin]. */
        addDebuggerPlugin(script: EditorDebuggerPlugin): void
        
        /** Removes the debugger plugin with given script from the Debugger. */
        removeDebuggerPlugin(script: EditorDebuggerPlugin): void
        
        /** Provide the version of the plugin declared in the `plugin.cfg` config file. */
        getPluginVersion(): string
        
        /** Emitted when the scene is changed in the editor. The argument will return the root node of the scene that has just become active. If this scene is new and empty, the argument will be `null`. */
        readonly sceneChanged: Signal<(sceneRoot: Node) => void>
        
        /** Emitted when user closes a scene. The argument is a file path to the closed scene. */
        readonly sceneClosed: Signal<(filepath: string) => void>
        
        /** Emitted when user changes the workspace (**2D**, **3D**, **Script**, **Game**, **Asset Store**). Also works with custom screens defined by plugins. */
        readonly mainScreenChanged: Signal<(screenName: string) => void>
        
        /** Emitted when the given [param resource] was saved on disc. See also [signal scene_saved]. */
        readonly resourceSaved: Signal<(resource: Resource) => void>
        
        /** Emitted when a scene was saved on disc. The argument is a file path to the saved scene. See also [signal resource_saved]. */
        readonly sceneSaved: Signal<(filepath: string) => void>
        
        /** Emitted when any project setting has changed. */
        readonly projectSettingsChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorProperty extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorProperty extends __NameMapContainer {
        _update_property: "_updateProperty";
        _set_read_only: "_setReadOnly";
        get_edited_property: "getEditedProperty";
        get_edited_object: "getEditedObject";
        update_property: "updateProperty";
        add_focusable: "addFocusable";
        set_bottom_editor: "setBottomEditor";
        is_selected: "isSelected";
        set_object_and_property: "setObjectAndProperty";
        set_label_reference: "setLabelReference";
        emit_changed: "emitChanged";
        _update_editor_property_status: "_updateEditorPropertyStatus";
        read_only: "readOnly";
        draw_label: "drawLabel";
        draw_background: "drawBackground";
        draw_warning: "drawWarning";
        use_folding: "useFolding";
        name_split_ratio: "nameSplitRatio";
        property_changed: "propertyChanged";
        multiple_properties_changed: "multiplePropertiesChanged";
        property_keyed: "propertyKeyed";
        property_deleted: "propertyDeleted";
        property_keyed_with_value: "propertyKeyedWithValue";
        property_checked: "propertyChecked";
        property_overridden: "propertyOverridden";
        property_favorited: "propertyFavorited";
        property_pinned: "propertyPinned";
        property_can_revert_changed: "propertyCanRevertChanged";
        resource_selected: "resourceSelected";
        object_id_selected: "objectIdSelected";
    }
    /** Custom control for editing properties that can be added to the [EditorInspector].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorproperty.html  
     */
    class EditorProperty<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** When this virtual function is called, you must update your editor. */
        /* gdvirtual */ _updateProperty(): void
        
        /** Called when the read-only status of the property is changed. It may be used to change custom controls into a read-only or modifiable state. */
        /* gdvirtual */ _setReadOnly(readOnly: boolean): void
        
        /** Returns the edited property. If your editor is for a single property (added via [method EditorInspectorPlugin._parse_property]), then this will return the property.  
         *      
         *  **Note:** This method could return `null` if the editor has not yet been associated with a property. However, in [method _update_property] and [method _set_read_only], this value is  *guaranteed*  to be non-`null`.  
         */
        getEditedProperty(): StringName
        
        /** Returns the edited object.  
         *      
         *  **Note:** This method could return `null` if the editor has not yet been associated with a property. However, in [method _update_property] and [method _set_read_only], this value is  *guaranteed*  to be non-`null`.  
         */
        getEditedObject(): null | GObject
        
        /** Forces a refresh of the property display. */
        updateProperty(): void
        
        /** If any of the controls added can gain keyboard focus, add it here. This ensures that focus will be restored if the inspector is refreshed. */
        addFocusable(control: Control): void
        
        /** Puts the [param editor] control below the property label. The control must be previously added using [method Node.add_child]. */
        setBottomEditor(editor: Control): void
        
        /** Draw property as not selected. Used by the inspector. */
        deselect(): void
        
        /** Returns `true` if property is drawn as selected. Used by the inspector. */
        isSelected(): boolean
        
        /** Draw property as selected. Used by the inspector. */
        select(focusable?: int64 /* = -1 */): void
        
        /** Assigns object and property to edit. */
        setObjectAndProperty(object: GObject, property: StringName): void
        
        /** Used by the inspector, set to a control that will be used as a reference to calculate the size of the label. */
        setLabelReference(control: Control): void
        
        /** If one or several properties have changed, this must be called. [param field] is used in case your editor can modify fields separately (as an example, Vector3.x). The [param changing] argument avoids the editor requesting this property to be refreshed (leave as `false` if unsure). */
        emitChanged(property: StringName, value: any, field?: StringName /* = '' */, changing?: boolean /* = false */): void
        _updateEditorPropertyStatus(): void
        
        /** Set this property to change the label (if you want to show one). */
        get label(): string
        set label(value: string)
        
        /** Used by the inspector, set to `true` when the property is read-only. */
        get readOnly(): boolean
        set readOnly(value: boolean)
        
        /** Used by the inspector, set to `true` when the property label is drawn. */
        get drawLabel(): boolean
        set drawLabel(value: boolean)
        
        /** Used by the inspector, set to `true` when the property background is drawn. */
        get drawBackground(): boolean
        set drawBackground(value: boolean)
        
        /** Used by the inspector, set to `true` when the property is checkable. */
        get checkable(): boolean
        set checkable(value: boolean)
        
        /** Used by the inspector, set to `true` when the property is checked. */
        get checked(): boolean
        set checked(value: boolean)
        
        /** Used by the inspector, set to `true` when the property is drawn with the editor theme's warning color. This is used for editable children's properties. */
        get drawWarning(): boolean
        set drawWarning(value: boolean)
        
        /** Used by the inspector, set to `true` when the property can add keys for animation. */
        get keying(): boolean
        set keying(value: boolean)
        
        /** Used by the inspector, set to `true` when the property can be deleted by the user. */
        get deletable(): boolean
        set deletable(value: boolean)
        
        /** Used by the inspector, set to `true` when the property is selectable. */
        get selectable(): boolean
        set selectable(value: boolean)
        
        /** Used by the inspector, set to `true` when the property is using folding. */
        get useFolding(): boolean
        set useFolding(value: boolean)
        
        /** Space distribution ratio between the label and the editing field. */
        get nameSplitRatio(): float64
        set nameSplitRatio(value: float64)
        
        /** Do not emit this manually, use the [method emit_changed] method instead. */
        readonly propertyChanged: Signal<(property: StringName, value: any, field: StringName, changing: boolean) => void>
        
        /** Emit it if you want multiple properties modified at the same time. Do not use if added via [method EditorInspectorPlugin._parse_property]. */
        readonly multiplePropertiesChanged: Signal<(properties: PackedStringArray, value: GArray) => void>
        
        /** Emit it if you want to add this value as an animation key (check for keying being enabled first). */
        readonly propertyKeyed: Signal<(property: StringName) => void>
        
        /** Emitted when a property was deleted. Used internally. */
        readonly propertyDeleted: Signal<(property: StringName) => void>
        
        /** Emit it if you want to key a property with a single value. */
        readonly propertyKeyedWithValue: Signal<(property: StringName, value: any) => void>
        
        /** Emitted when a property was checked. Used internally. */
        readonly propertyChecked: Signal<(property: StringName, checked: boolean) => void>
        
        /** Emitted when a setting override for the current project is requested. */
        readonly propertyOverridden: Signal<() => void>
        
        /** Emit it if you want to mark a property as favorited, making it appear at the top of the inspector. */
        readonly propertyFavorited: Signal<(property: StringName, favorited: boolean) => void>
        
        /** Emit it if you want to mark (or unmark) the value of a property for being saved regardless of being equal to the default value.  
         *  The default value is the one the property will get when the node is just instantiated and can come from an ancestor scene in the inheritance/instantiation chain, a script or a builtin class.  
         */
        readonly propertyPinned: Signal<(property: StringName, pinned: boolean) => void>
        
        /** Emitted when the revertability (i.e., whether it has a non-default value and thus is displayed with a revert icon) of a property has changed. */
        readonly propertyCanRevertChanged: Signal<(property: StringName, canRevert: boolean) => void>
        
        /** If you want a sub-resource to be edited, emit this signal with the resource. */
        readonly resourceSelected: Signal<(path: string, resource: Resource) => void>
        
        /** Used by sub-inspectors. Emit it if what was selected was an Object ID. */
        readonly objectIdSelected: Signal<(property: StringName, id: int64) => void>
        
        /** Emitted when selected. Used internally. */
        readonly selected: Signal<(path: string, focusableIdx: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorProperty;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorProperty;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorResourceConversionPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorResourceConversionPlugin extends __NameMapRefCounted {
        _converts_to: "_convertsTo";
    }
    /** Plugin for adding custom converters from one resource format to another in the editor resource picker context menu; for example, converting a [StandardMaterial3D] to a [ShaderMaterial].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorresourceconversionplugin.html  
     */
    class EditorResourceConversionPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Returns the class name of the target type of [Resource] that this plugin converts source resources to. */
        /* gdvirtual */ _convertsTo(): string
        
        /** Called to determine whether a particular [Resource] can be converted to the target resource type by this plugin. */
        /* gdvirtual */ _handles(resource: Resource): boolean
        
        /** Takes an input [Resource] and converts it to the type given in [method _converts_to]. The returned [Resource] is the result of the conversion, and the input [Resource] remains unchanged. */
        /* gdvirtual */ _convert(resource: Resource): null | Resource
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorResourceConversionPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorResourceConversionPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorResourcePicker extends __RPCMapHBoxContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorResourcePicker extends __NameMapHBoxContainer {
        _set_create_options: "_setCreateOptions";
        _handle_menu_selected: "_handleMenuSelected";
        get_allowed_types: "getAllowedTypes";
        set_toggle_pressed: "setTogglePressed";
        base_type: "baseType";
        edited_resource: "editedResource";
        toggle_mode: "toggleMode";
        resource_selected: "resourceSelected";
        resource_changed: "resourceChanged";
        _resource_expand_requested: "_resourceExpandRequested";
    }
    /** Godot editor's control for selecting [Resource] type properties.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorresourcepicker.html  
     */
    class EditorResourcePicker<Map extends NodePathMap = any> extends HBoxContainer<Map> {
        constructor(identifier?: any)
        /** This virtual method is called when updating the context menu of an [member editable] [EditorResourcePicker]. Implement this method to override the "New" items section with your own options. [param menu_node] is a reference to the [PopupMenu] node.  
         *      
         *  **Note:** Implement [method _handle_menu_selected] to handle these custom items.  
         *      
         *  **Note:** Relevant built-in options ("Load", "Copy", "Paste", etc.) are automatically added to the [param menu_node] afterwards, using their hard-coded IDs starting from `0`. Custom options need to use non-colliding IDs to be handled properly. Using `id = 100 + custom_option_index` is safe (this is what the default items in the "New" section use).  
         */
        /* gdvirtual */ _setCreateOptions(menuNode: GObject): void
        
        /** This virtual method can be implemented to handle context menu items not handled by default. See [method _set_create_options]. */
        /* gdvirtual */ _handleMenuSelected(id: int64): boolean
        
        /** Returns a list of all allowed types and subtypes corresponding to the [member base_type]. If the [member base_type] is empty, an empty list is returned. */
        getAllowedTypes(): PackedStringArray
        
        /** Sets the toggle mode state for the main button. Works only if [member toggle_mode] is set to `true`. */
        setTogglePressed(pressed: boolean): void
        
        /** The base type of allowed resource types. Can be a comma-separated list of several options. */
        get baseType(): string
        set baseType(value: string)
        
        /** The edited resource value. */
        get editedResource(): null | Resource
        set editedResource(value: null | Resource)
        
        /** If `true`, the value can be selected and edited. */
        get editable(): boolean
        set editable(value: boolean)
        
        /** If `true`, the main button with the resource preview works in the toggle mode. Use [method set_toggle_pressed] to manually set the state. */
        get toggleMode(): boolean
        set toggleMode(value: boolean)
        
        /** Emitted when the resource value was set and user clicked to edit it. When [param inspect] is `true`, the signal was caused by the context menu "Edit" or "Inspect" option. */
        readonly resourceSelected: Signal<(resource: Resource, inspect: boolean) => void>
        
        /** Emitted when the value of the edited resource was changed. */
        readonly resourceChanged: Signal<(resource: Resource) => void>
        readonly _resourceExpandRequested: Signal<(resource: Resource, inspect: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorResourcePicker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorResourcePicker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorResourcePreview extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorResourcePreview extends __NameMapNode {
        queue_resource_preview: "queueResourcePreview";
        queue_edited_resource_preview: "queueEditedResourcePreview";
        add_preview_generator: "addPreviewGenerator";
        remove_preview_generator: "removePreviewGenerator";
        check_for_invalidation: "checkForInvalidation";
        preview_invalidated: "previewInvalidated";
    }
    /** A node used to generate previews of resources or files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorresourcepreview.html  
     */
    class EditorResourcePreview<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Queue a resource file located at [param path] for preview. Once the preview is ready, the [param receiver]'s [param receiver_func] will be called. The [param receiver_func] must take the following four arguments: [String] path, [Texture2D] preview, [Texture2D] thumbnail_preview, [Variant] userdata. [param userdata] can be anything, and will be returned when [param receiver_func] is called.  
         *      
         *  **Note:** If it was not possible to create the preview the [param receiver_func] will still be called, but the preview will be `null`.  
         */
        queueResourcePreview(path: string, receiver: GObject, receiverFunc: StringName, userdata: any): void
        
        /** Queue the [param resource] being edited for preview. Once the preview is ready, the [param receiver]'s [param receiver_func] will be called. The [param receiver_func] must take the following four arguments: [String] path, [Texture2D] preview, [Texture2D] thumbnail_preview, [Variant] userdata. [param userdata] can be anything, and will be returned when [param receiver_func] is called.  
         *      
         *  **Note:** If it was not possible to create the preview the [param receiver_func] will still be called, but the preview will be `null`.  
         */
        queueEditedResourcePreview(resource: Resource, receiver: GObject, receiverFunc: StringName, userdata: any): void
        
        /** Create an own, custom preview generator. */
        addPreviewGenerator(generator: EditorResourcePreviewGenerator): void
        
        /** Removes a custom preview generator. */
        removePreviewGenerator(generator: EditorResourcePreviewGenerator): void
        
        /** Check if the resource changed, if so, it will be invalidated and the corresponding signal emitted. */
        checkForInvalidation(path: string): void
        
        /** Emitted if a preview was invalidated (changed). [param path] corresponds to the path of the preview. */
        readonly previewInvalidated: Signal<(path: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorResourcePreview;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorResourcePreview;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorResourcePreviewGenerator extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorResourcePreviewGenerator extends __NameMapRefCounted {
        _generate_from_path: "_generateFromPath";
        _generate_small_preview_automatically: "_generateSmallPreviewAutomatically";
        _can_generate_small_preview: "_canGenerateSmallPreview";
        request_draw_and_wait: "requestDrawAndWait";
    }
    /** Custom generator of previews.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorresourcepreviewgenerator.html  
     */
    class EditorResourcePreviewGenerator extends RefCounted {
        constructor(identifier?: any)
        /** Returns `true` if your generator supports the resource of type [param type]. */
        /* gdvirtual */ _handles(type: string): boolean
        
        /** Generate a preview from a given resource with the specified size. This must always be implemented.  
         *  Returning `null` is an OK way to fail and let another generator take care.  
         *  Care must be taken because this function is always called from a thread (not the main thread).  
         *  [param metadata] dictionary can be modified to store file-specific metadata that can be used in [method EditorResourceTooltipPlugin._make_tooltip_for_path] (like image size, sample length etc.).  
         */
        /* gdvirtual */ _generate(resource: Resource, size: Vector2I, metadata: GDictionary): null | Texture2D
        
        /** Generate a preview directly from a path with the specified size. Implementing this is optional, as default code will load and call [method _generate].  
         *  Returning `null` is an OK way to fail and let another generator take care.  
         *  Care must be taken because this function is always called from a thread (not the main thread).  
         *  [param metadata] dictionary can be modified to store file-specific metadata that can be used in [method EditorResourceTooltipPlugin._make_tooltip_for_path] (like image size, sample length etc.).  
         */
        /* gdvirtual */ _generateFromPath(path: string, size: Vector2I, metadata: GDictionary): null | Texture2D
        
        /** If this function returns `true`, the generator will automatically generate the small previews from the normal preview texture generated by the methods [method _generate] or [method _generate_from_path].  
         *  By default, it returns `false`.  
         */
        /* gdvirtual */ _generateSmallPreviewAutomatically(): boolean
        
        /** If this function returns `true`, the generator will call [method _generate] or [method _generate_from_path] for small previews as well.  
         *  By default, it returns `false`.  
         */
        /* gdvirtual */ _canGenerateSmallPreview(): boolean
        
        /** Call from within [method _generate] to request the rendering server draw to the [param viewport]. */
        requestDrawAndWait(viewport: Rid): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorResourcePreviewGenerator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorResourcePreviewGenerator;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorResourceTooltipPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorResourceTooltipPlugin extends __NameMapRefCounted {
        _make_tooltip_for_path: "_makeTooltipForPath";
        request_thumbnail: "requestThumbnail";
    }
    /** A plugin that advanced tooltip for its handled resource type.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorresourcetooltipplugin.html  
     */
    class EditorResourceTooltipPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Return `true` if the plugin is going to handle the given [Resource] [param type]. */
        /* gdvirtual */ _handles(type: string): boolean
        
        /** Create and return a tooltip that will be displayed when the user hovers a resource under the given [param path] in filesystem dock.  
         *  The [param metadata] dictionary is provided by preview generator (see [method EditorResourcePreviewGenerator._generate]).  
         *  [param base] is the base default tooltip, which is a [VBoxContainer] with a file name, type and size labels. If another plugin handled the same file type, [param base] will be output from the previous plugin. For best result, make sure the base tooltip is part of the returned [Control].  
         *      
         *  **Note:** It's unadvised to use [method ResourceLoader.load], especially with heavy resources like models or textures, because it will make the editor unresponsive when creating the tooltip. You can use [method request_thumbnail] if you want to display a preview in your tooltip.  
         *      
         *  **Note:** If you decide to discard the [param base], make sure to call [method Node.queue_free], because it's not freed automatically.  
         *    
         */
        /* gdvirtual */ _makeTooltipForPath(path: string, metadata: GDictionary, base: Control): null | Control
        
        /** Requests a thumbnail for the given [TextureRect]. The thumbnail is created asynchronously by [EditorResourcePreview] and automatically set when available. */
        requestThumbnail(path: string, control: TextureRect): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorResourceTooltipPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorResourceTooltipPlugin;
    }
    namespace EditorSceneFormatImporter {
        enum ImportFlags {
            ImportScene = 1,
            ImportAnimation = 2,
            ImportFailOnMissingDependencies = 4,
            ImportGenerateTangentArrays = 8,
            ImportUseNamedSkinBinds = 16,
            ImportDiscardMeshesAndMaterials = 32,
            ImportForceDisableMeshCompression = 64,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSceneFormatImporter extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSceneFormatImporter extends __NameMapRefCounted {
        _get_extensions: "_getExtensions";
        _import_scene: "_importScene";
        _get_import_options: "_getImportOptions";
        _get_option_visibility: "_getOptionVisibility";
        add_import_option: "addImportOption";
        add_import_option_advanced: "addImportOptionAdvanced";
    }
    /** Imports scenes from third-parties' 3D files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorsceneformatimporter.html  
     */
    class EditorSceneFormatImporter extends RefCounted {
        constructor(identifier?: any)
        /** Return supported file extensions for this scene importer. */
        /* gdvirtual */ _getExtensions(): PackedStringArray
        
        /** Perform the bulk of the scene import logic here, for example using [GLTFDocument] or [FBXDocument]. */
        /* gdvirtual */ _importScene(path: string, flags: int64, options: GDictionary): null | GObject
        
        /** Override to add general import options. These will appear in the main import dock on the editor. Add options via [method add_import_option] and [method add_import_option_advanced].  
         *      
         *  **Note:** All [EditorSceneFormatImporter] and [EditorScenePostImportPlugin] instances will add options for all files. It is good practice to check the file extension when [param path] is non-empty.  
         *  When the user is editing project settings, [param path] will be empty. It is recommended to add all options when [param path] is empty to allow the user to customize Import Defaults.  
         */
        /* gdvirtual */ _getImportOptions(path: string): void
        
        /** Should return `true` to show the given option, `false` to hide the given option, or `null` to ignore. */
        /* gdvirtual */ _getOptionVisibility(path: string, forAnimation: boolean, option: string): any
        
        /** Add a specific import option (name and default value only). This function can only be called from [method _get_import_options]. */
        addImportOption(name: string, value: any): void
        
        /** Add a specific import option. This function can only be called from [method _get_import_options]. */
        addImportOptionAdvanced(type: Variant.Type, name: string, defaultValue: any, hint?: PropertyHint /* = 0 */, hintString?: string /* = '' */, usageFlags?: int64 /* = 6 */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSceneFormatImporter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSceneFormatImporter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSceneFormatImporterBlend extends __RPCMapEditorSceneFormatImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSceneFormatImporterBlend extends __NameMapEditorSceneFormatImporter {
    }
    /** Importer for Blender's `.blend` scene file format.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorsceneformatimporterblend.html  
     */
    class EditorSceneFormatImporterBlend extends EditorSceneFormatImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSceneFormatImporterBlend;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSceneFormatImporterBlend;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSceneFormatImporterFbx2Gltf extends __RPCMapEditorSceneFormatImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSceneFormatImporterFbx2Gltf extends __NameMapEditorSceneFormatImporter {
    }
    class EditorSceneFormatImporterFbx2Gltf extends EditorSceneFormatImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSceneFormatImporterFbx2Gltf;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSceneFormatImporterFbx2Gltf;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSceneFormatImporterGltf extends __RPCMapEditorSceneFormatImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSceneFormatImporterGltf extends __NameMapEditorSceneFormatImporter {
    }
    class EditorSceneFormatImporterGltf extends EditorSceneFormatImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSceneFormatImporterGltf;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSceneFormatImporterGltf;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSceneFormatImporterUfbx extends __RPCMapEditorSceneFormatImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSceneFormatImporterUfbx extends __NameMapEditorSceneFormatImporter {
    }
    class EditorSceneFormatImporterUfbx extends EditorSceneFormatImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSceneFormatImporterUfbx;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSceneFormatImporterUfbx;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorScenePostImport extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorScenePostImport extends __NameMapRefCounted {
        _post_import: "_postImport";
        get_source_file: "getSourceFile";
    }
    /** Post-processes scenes after import.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorscenepostimport.html  
     */
    class EditorScenePostImport extends RefCounted {
        constructor(identifier?: any)
        /** Called after the scene was imported. This method must return the modified version of the scene. */
        /* gdvirtual */ _postImport(scene: Node): null | GObject
        
        /** Returns the source file path which got imported (e.g. `res://scene.dae`). */
        getSourceFile(): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorScenePostImport;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorScenePostImport;
    }
    namespace EditorScenePostImportPlugin {
        enum InternalImportCategory {
            InternalImportCategoryNode = 0,
            InternalImportCategoryMesh3DNode = 1,
            InternalImportCategoryMesh = 2,
            InternalImportCategoryMaterial = 3,
            InternalImportCategoryAnimation = 4,
            InternalImportCategoryAnimationNode = 5,
            InternalImportCategorySkeleton3DNode = 6,
            InternalImportCategoryMax = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorScenePostImportPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorScenePostImportPlugin extends __NameMapRefCounted {
        _get_internal_import_options: "_getInternalImportOptions";
        _get_internal_option_visibility: "_getInternalOptionVisibility";
        _get_internal_option_update_view_required: "_getInternalOptionUpdateViewRequired";
        _internal_process: "_internalProcess";
        _get_import_options: "_getImportOptions";
        _get_option_visibility: "_getOptionVisibility";
        _pre_process: "_preProcess";
        _post_process: "_postProcess";
        get_option_value: "getOptionValue";
        add_import_option: "addImportOption";
        add_import_option_advanced: "addImportOptionAdvanced";
    }
    /** Plugin to control and modifying the process of importing a scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorscenepostimportplugin.html  
     */
    class EditorScenePostImportPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Override to add internal import options. These will appear in the 3D scene import dialog. Add options via [method add_import_option] and [method add_import_option_advanced]. */
        /* gdvirtual */ _getInternalImportOptions(category: int64): void
        
        /** Should return `true` to show the given option, `false` to hide the given option, or `null` to ignore. */
        /* gdvirtual */ _getInternalOptionVisibility(category: int64, forAnimation: boolean, option: string): any
        
        /** Should return `true` if the 3D view of the import dialog needs to update when changing the given option. */
        /* gdvirtual */ _getInternalOptionUpdateViewRequired(category: int64, option: string): any
        
        /** Process a specific node or resource for a given category. */
        /* gdvirtual */ _internalProcess(category: int64, baseNode: Node, node: Node, resource: Resource): void
        
        /** Override to add general import options. These will appear in the main import dock on the editor. Add options via [method add_import_option] and [method add_import_option_advanced]. */
        /* gdvirtual */ _getImportOptions(path: string): void
        
        /** Should return `true` to show the given option, `false` to hide the given option, or `null` to ignore. */
        /* gdvirtual */ _getOptionVisibility(path: string, forAnimation: boolean, option: string): any
        
        /** Pre-process the scene. This function is called right after the scene format loader loaded the scene and no changes have been made.  
         *  Pre-process may be used to adjust internal import options in the `"nodes"`, `"meshes"`, `"animations"` or `"materials"` keys inside `get_option_value("_subresources")`.  
         */
        /* gdvirtual */ _preProcess(scene: Node): void
        
        /** Post-process the scene. This function is called after the final scene has been configured. */
        /* gdvirtual */ _postProcess(scene: Node): void
        
        /** Query the value of an option. This function can only be called from those querying visibility, or processing. */
        getOptionValue(name: StringName): any
        
        /** Add a specific import option (name and default value only). This function can only be called from [method _get_import_options] and [method _get_internal_import_options]. */
        addImportOption(name: string, value: any): void
        
        /** Add a specific import option. This function can only be called from [method _get_import_options] and [method _get_internal_import_options]. */
        addImportOptionAdvanced(type: Variant.Type, name: string, defaultValue: any, hint?: PropertyHint /* = 0 */, hintString?: string /* = '' */, usageFlags?: int64 /* = 6 */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorScenePostImportPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorScenePostImportPlugin;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorScript extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorScript extends __NameMapRefCounted {
        add_root_node: "addRootNode";
        get_scene: "getScene";
        get_editor_interface: "getEditorInterface";
    }
    /** Base script that can be used to add extension functions to the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorscript.html  
     */
    class EditorScript extends RefCounted {
        constructor(identifier?: any)
        /** This method is executed by the Editor when **File > Run** is used. */
        /* gdvirtual */ _run(): void
        
        /** Makes [param node] root of the currently opened scene. Only works if the scene is empty. If the [param node] is a scene instance, an inheriting scene will be created. */
        addRootNode(node: Node): void
        
        /** Returns the edited (current) scene's root [Node]. Equivalent of [method EditorInterface.get_edited_scene_root]. */
        getScene(): null | Node
        
        /** Returns the [EditorInterface] singleton instance. */
        getEditorInterface(): null | EditorInterface
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorScript;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorScript;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorScriptPicker extends __RPCMapEditorResourcePicker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorScriptPicker extends __NameMapEditorResourcePicker {
        script_owner: "scriptOwner";
    }
    /** Godot editor's control for selecting the `script` property of a [Node].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorscriptpicker.html  
     */
    class EditorScriptPicker<Map extends NodePathMap = any> extends EditorResourcePicker<Map> {
        constructor(identifier?: any)
        /** The owner [Node] of the script property that holds the edited resource. */
        get scriptOwner(): null | Node
        set scriptOwner(value: null | Node)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorScriptPicker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorScriptPicker;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSelection extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSelection extends __NameMapGObject {
        add_node: "addNode";
        remove_node: "removeNode";
        get_selected_nodes: "getSelectedNodes";
        get_top_selected_nodes: "getTopSelectedNodes";
        get_transformable_selected_nodes: "getTransformableSelectedNodes";
        selection_changed: "selectionChanged";
    }
    /** Manages the SceneTree selection in the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorselection.html  
     */
    class EditorSelection extends GObject {
        constructor(identifier?: any)
        /** Clear the selection. */
        clear(): void
        
        /** Adds a node to the selection.  
         *      
         *  **Note:** The newly selected node will not be automatically edited in the inspector. If you want to edit a node, use [method EditorInterface.edit_node].  
         */
        addNode(node: Node): void
        
        /** Removes a node from the selection. */
        removeNode(node: Node): void
        
        /** Returns the list of selected nodes. */
        getSelectedNodes(): GArray<Node>
        
        /** Returns the list of top selected nodes only, excluding any children. This is useful for performing transform operations (moving them, rotating, etc.).  
         *  For example, if there is a node A with a child B and a sibling C, then selecting all three will cause this method to return only A and C. Changing the global transform of A will affect the global transform of B, so there is no need to change B separately.  
         */
        getTopSelectedNodes(): GArray<Node>
        
        /** Returns the list of top selected nodes only, excluding any children. This is useful for performing transform operations (moving them, rotating, etc.). See [method get_top_selected_nodes]. */
        getTransformableSelectedNodes(): GArray<Node>
        
        /** Emitted when the selection changes. */
        readonly selectionChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSelection;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSelection;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSettings extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSettings extends __NameMapResource {
        has_setting: "hasSetting";
        set_setting: "setSetting";
        get_setting: "getSetting";
        set_initial_value: "setInitialValue";
        add_property_info: "addPropertyInfo";
        set_project_metadata: "setProjectMetadata";
        get_project_metadata: "getProjectMetadata";
        set_favorites: "setFavorites";
        get_favorites: "getFavorites";
        set_recent_dirs: "setRecentDirs";
        get_recent_dirs: "getRecentDirs";
        set_builtin_action_override: "setBuiltinActionOverride";
        add_shortcut: "addShortcut";
        remove_shortcut: "removeShortcut";
        is_shortcut: "isShortcut";
        has_shortcut: "hasShortcut";
        get_shortcut: "getShortcut";
        get_shortcut_list: "getShortcutList";
        check_changed_settings_in_group: "checkChangedSettingsInGroup";
        get_changed_settings: "getChangedSettings";
        mark_setting_changed: "markSettingChanged";
        settings_changed: "settingsChanged";
        _favorites_changed: "_favoritesChanged";
        _translation_changed: "_translationChanged";
    }
    /** Object that holds the project-independent editor settings.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorsettings.html  
     */
    class EditorSettings extends Resource {
        /** Emitted after any editor setting has changed. It's used by various editor plugins to update their visuals on theme changes or logic on configuration changes. */
        static readonly NOTIFICATION_EDITOR_SETTINGS_CHANGED = 10000
        constructor(identifier?: any)
        
        /** Returns `true` if the setting specified by [param name] exists, `false` otherwise. */
        hasSetting(name: string): boolean
        
        /** Sets the [param value] of the setting specified by [param name]. This is equivalent to using [method Object.set] on the EditorSettings instance. */
        setSetting(name: string, value: any): void
        
        /** Returns the value of the setting specified by [param name]. This is equivalent to using [method Object.get] on the EditorSettings instance. */
        getSetting(name: string): any
        
        /** Erases the setting whose name is specified by [param property]. */
        erase(property: string): void
        
        /** Sets the initial value of the setting specified by [param name] to [param value]. This is used to provide a value for the Revert button in the Editor Settings. If [param update_current] is `true`, the setting is reset to [param value] as well. */
        setInitialValue(name: StringName, value: any, updateCurrent: boolean): void
        
        /** Adds a custom property info to a property. The dictionary must contain:  
         *  - `name`: [String] (the name of the property)  
         *  - `type`: [int] (see [enum Variant.Type])  
         *  - optionally `hint`: [int] (see [enum PropertyHint]) and `hint_string`: [String]  
         *    
         */
        addPropertyInfo(info: GDictionary): void
        
        /** Sets project-specific metadata with the [param section], [param key] and [param data] specified. This metadata is stored outside the project folder and therefore won't be checked into version control. See also [method get_project_metadata]. */
        setProjectMetadata(section: string, key: string, data: any): void
        
        /** Returns project-specific metadata for the [param section] and [param key] specified. If the metadata doesn't exist, [param default] will be returned instead. See also [method set_project_metadata]. */
        getProjectMetadata(section: string, key: string, default_?: any /* = {} */): any
        
        /** Sets the list of favorite files and directories for this project. */
        setFavorites(dirs: PackedStringArray | string[]): void
        
        /** Returns the list of favorite files and directories for this project. */
        getFavorites(): PackedStringArray
        
        /** Sets the list of recently visited folders in the file dialog for this project. */
        setRecentDirs(dirs: PackedStringArray | string[]): void
        
        /** Returns the list of recently visited folders in the file dialog for this project. */
        getRecentDirs(): PackedStringArray
        
        /** Overrides the built-in editor action [param name] with the input actions defined in [param actions_list]. */
        setBuiltinActionOverride(name: string, actionsList: GArray<InputEvent>): void
        
        /** Adds a [param shortcut] whose path is specified by [param path].  
         *  The [param path] determines how the shortcut is organized and displayed in the editor's shortcut settings. The path format affects the display as follows:  
         *  - `"name"` (no slash): Creates a category named `name` with the shortcut displayed as `name`.  
         *  - `"category/name"` (single slash): Displays as `name` in the `category` section.  
         *  - `"category/name/extra"` (multiple slashes): Extra path components are ignored, so this behaves the same as `"category/name"`.  
         *      
         *  **Note:** Shortcuts are only saved to the editor settings if they differ from their original/default state. This means empty shortcuts that were originally empty will not persist between editor sessions and must be re-added. If a shortcut with the same [param path] already exists, this method will update it with the new [param shortcut] instead of creating a duplicate.  
         *    
         */
        addShortcut(path: string, shortcut: Shortcut): void
        
        /** Removes the shortcut specified by [param path]. */
        removeShortcut(path: string): void
        
        /** Returns `true` if the shortcut specified by [param path] matches the event specified by [param event], `false` otherwise. */
        isShortcut(path: string, event: InputEvent): boolean
        
        /** Returns `true` if the shortcut specified by [param path] exists, `false` otherwise. */
        hasShortcut(path: string): boolean
        
        /** Returns the shortcut specified by [param path]. Tries to find a built-in action if no shortcut with the provided path is found in the shortcut list. If found, adds it to the list and returns it, otherwise returns `null`. */
        getShortcut(path: string): null | Shortcut
        
        /** Returns the list of stored shortcut paths. */
        getShortcutList(): PackedStringArray
        
        /** Checks if any settings with the prefix [param setting_prefix] exist in the set of changed settings. See also [method get_changed_settings]. */
        checkChangedSettingsInGroup(settingPrefix: string): boolean
        
        /** Gets an array of the settings which have been changed since the last save. Note that internally `changed_settings` is cleared after a successful save, so generally the most appropriate place to use this method is when processing [constant NOTIFICATION_EDITOR_SETTINGS_CHANGED]. */
        getChangedSettings(): PackedStringArray
        
        /** Marks the passed editor setting as being changed, see [method get_changed_settings]. Only settings which exist (see [method has_setting]) will be accepted. */
        markSettingChanged(setting: string): void
        
        /** Emitted after any editor setting has changed. */
        readonly settingsChanged: Signal<() => void>
        readonly _favoritesChanged: Signal<() => void>
        readonly _translationChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSettings;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSettings;
    }
    namespace EditorSpinSlider {
        enum ControlState {
            ControlStateDefault = 0,
            ControlStatePreferSlider = 1,
            ControlStateHide = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSpinSlider extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSpinSlider extends __NameMapRange {
        read_only: "readOnly";
        control_state: "controlState";
        hide_slider: "hideSlider";
        editing_integer: "editingInteger";
        deferred_drag_mode: "deferredDragMode";
        updown_pressed: "updownPressed";
        value_focus_entered: "valueFocusEntered";
        value_focus_exited: "valueFocusExited";
    }
    /** Godot editor's control for editing numeric values.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorspinslider.html  
     */
    class EditorSpinSlider<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** The text that displays to the left of the value. */
        get label(): string
        set label(value: string)
        
        /** The suffix to display after the value (in a faded color). This should generally be a plural word. You may have to use an abbreviation if the suffix is too long to be displayed. */
        get suffix(): string
        set suffix(value: string)
        
        /** If `true`, the slider can't be interacted with. */
        get readOnly(): boolean
        set readOnly(value: boolean)
        
        /** If `true`, the slider will not draw background. */
        get flat(): boolean
        set flat(value: boolean)
        
        /** The state in which the control used to manipulate the value will be. */
        get controlState(): int64
        set controlState(value: int64)
        
        /** If `true`, the slider and up/down arrows are hidden. */
        get hideSlider(): boolean
        set hideSlider(value: boolean)
        
        /** If `true`, the [EditorSpinSlider] is considered to be editing an integer value. If `false`, the [EditorSpinSlider] is considered to be editing a floating-point value. This is used to determine whether a slider should be drawn by default. The slider is only drawn for floats; integers use up-down arrows similar to [SpinBox] instead, unless [member control_state] is set to [constant CONTROL_STATE_PREFER_SLIDER]. It will also use [member EditorSettings.interface/inspector/integer_drag_speed] instead of [member EditorSettings.interface/inspector/float_drag_speed] if the slider is available. */
        get editingInteger(): boolean
        set editingInteger(value: boolean)
        
        /** If `true`, changing via dragging is applied only at the end of the input (for example, when the user releases a mouse button). */
        get deferredDragMode(): boolean
        set deferredDragMode(value: boolean)
        
        /** Emitted when the spinner/slider is grabbed. */
        readonly grabbed: Signal<() => void>
        
        /** Emitted when the spinner/slider is ungrabbed. */
        readonly ungrabbed: Signal<() => void>
        
        /** Emitted when the updown button is pressed. */
        readonly updownPressed: Signal<() => void>
        
        /** Emitted when the value form gains focus. */
        readonly valueFocusEntered: Signal<() => void>
        
        /** Emitted when the value form loses focus. */
        readonly valueFocusExited: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSpinSlider;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSpinSlider;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorSyntaxHighlighter extends __RPCMapSyntaxHighlighter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorSyntaxHighlighter extends __NameMapSyntaxHighlighter {
        _get_name: "_getName";
        _get_supported_languages: "_getSupportedLanguages";
        _get_edited_resource: "_getEditedResource";
    }
    /** Base class for [SyntaxHighlighter] used by the [ScriptEditor].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorsyntaxhighlighter.html  
     */
    class EditorSyntaxHighlighter extends SyntaxHighlighter {
        constructor(identifier?: any)
        /** Virtual method which can be overridden to return the syntax highlighter name. */
        /* gdvirtual */ _getName(): string
        
        /** Virtual method which can be overridden to return the supported language names. */
        /* gdvirtual */ _getSupportedLanguages(): PackedStringArray
        
        /** Virtual method which creates a new instance of the syntax highlighter. */
        /* gdvirtual */ _create(): null | EditorSyntaxHighlighter
        _getEditedResource(): null | RefCounted
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorSyntaxHighlighter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorSyntaxHighlighter;
    }
    namespace EditorToaster {
        enum Severity {
            SeverityInfo = 0,
            SeverityWarning = 1,
            SeverityError = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorToaster extends __RPCMapHBoxContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorToaster extends __NameMapHBoxContainer {
        push_toast: "pushToast";
    }
    /** Manages toast notifications within the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editortoaster.html  
     */
    class EditorToaster<Map extends NodePathMap = any> extends HBoxContainer<Map> {
        constructor(identifier?: any)
        /** Pushes a toast notification to the editor for display. */
        pushToast(message: string, severity?: EditorToaster.Severity /* = 0 */, tooltip?: string /* = '' */): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorToaster;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorToaster;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorTranslationParserPlugin extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorTranslationParserPlugin extends __NameMapRefCounted {
        _parse_file: "_parseFile";
        _get_recognized_extensions: "_getRecognizedExtensions";
        _customize_strings: "_customizeStrings";
    }
    /** Plugin for adding custom parsers to extract strings that are to be translated from custom files (.csv, .json etc.).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editortranslationparserplugin.html  
     */
    class EditorTranslationParserPlugin extends RefCounted {
        constructor(identifier?: any)
        /** Override this method to define a custom parsing logic to extract the translatable strings. */
        /* gdvirtual */ _parseFile(path: string): GArray<PackedStringArray>
        
        /** Gets the list of file extensions to associate with this parser, e.g. `["csv"]`. */
        /* gdvirtual */ _getRecognizedExtensions(): PackedStringArray
        
        /** Called after parsing all files. You can modify the [param strings] array to add or remove entries from the final list of strings, then return it after modifications. Each entry is a [PackedStringArray] like explained in the [EditorTranslationParserPlugin]'s description.  
         *    
         */
        /* gdvirtual */ _customizeStrings(strings: GArray<PackedStringArray>): GArray<PackedStringArray>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorTranslationParserPlugin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorTranslationParserPlugin;
    }
    namespace EditorUndoRedoManager {
        enum SpecialHistory {
            GlobalHistory = 0,
            RemoteHistory = -9,
            InvalidHistory = -99,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorUndoRedoManager extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorUndoRedoManager extends __NameMapGObject {
        create_action: "createAction";
        commit_action: "commitAction";
        is_committing_action: "isCommittingAction";
        force_fixed_history: "forceFixedHistory";
        add_do_method: "addDoMethod";
        add_undo_method: "addUndoMethod";
        add_do_property: "addDoProperty";
        add_undo_property: "addUndoProperty";
        add_do_reference: "addDoReference";
        add_undo_reference: "addUndoReference";
        get_object_history_id: "getObjectHistoryId";
        get_history_undo_redo: "getHistoryUndoRedo";
        clear_history: "clearHistory";
        history_changed: "historyChanged";
        version_changed: "versionChanged";
    }
    /** Manages undo history of scenes opened in the editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_editorundoredomanager.html  
     */
    class EditorUndoRedoManager extends GObject {
        constructor(identifier?: any)
        /** Create a new action. After this is called, do all your calls to [method add_do_method], [method add_undo_method], [method add_do_property], and [method add_undo_property], then commit the action with [method commit_action].  
         *  The way actions are merged is dictated by the [param merge_mode] argument.  
         *  If [param custom_context] object is provided, it will be used for deducing target history (instead of using the first operation).  
         *  The way undo operation are ordered in actions is dictated by [param backward_undo_ops]. When [param backward_undo_ops] is `false` undo option are ordered in the same order they were added. Which means the first operation to be added will be the first to be undone.  
         *  If [param mark_unsaved] is `false`, the action will not mark the history as unsaved. This is useful for example for actions that change a selection, or a setting that will be saved automatically. Otherwise, this should be left to `true` if the action requires saving by the user or if it can cause data loss when left unsaved.  
         */
        createAction(name: string, mergeMode?: UndoRedo.MergeMode /* = 0 */, customContext?: GObject, backwardUndoOps?: boolean /* = false */, markUnsaved?: boolean /* = true */): void
        
        /** Commits the action. If [param execute] is `true` (default), all "do" methods/properties are called/set when this function is called. */
        commitAction(execute?: boolean /* = true */): void
        
        /** Returns `true` if the [EditorUndoRedoManager] is currently committing the action, i.e. running its "do" method or property change (see [method commit_action]). */
        isCommittingAction(): boolean
        
        /** Forces the next operation (e.g. [method add_do_method]) to use the action's history rather than guessing it from the object. This is sometimes needed when a history can't be correctly determined, like for a nested resource that doesn't have a path yet.  
         *  This method should only be used when absolutely necessary, otherwise it might cause invalid history state. For most of complex cases, the `custom_context` parameter of [method create_action] is sufficient.  
         */
        forceFixedHistory(): void
        
        /** Register a method that will be called when the action is committed (i.e. the "do" action).  
         *  If this is the first operation, the [param object] will be used to deduce target undo history.  
         */
        addDoMethod<T extends GObject, M extends GodotNames<T>>(object: T, method: M, ...args: ResolveGodotNameParameters<T, M>): void
        
        /** Register a method that will be called when the action is undone (i.e. the "undo" action).  
         *  If this is the first operation, the [param object] will be used to deduce target undo history.  
         */
        addUndoMethod<T extends GObject, M extends GodotNames<T>>(object: T, method: M, ...args: ResolveGodotNameParameters<T, M>): void
        
        /** Register a property value change for "do".  
         *  If this is the first operation, the [param object] will be used to deduce target undo history.  
         */
        addDoProperty<T extends GObject, P extends GodotNames<T>>(object: T, property: P, value: ResolveGodotNameValue<T, P>): void
        
        /** Register a property value change for "undo".  
         *  If this is the first operation, the [param object] will be used to deduce target undo history.  
         */
        addUndoProperty<T extends GObject, P extends GodotNames<T>>(object: T, property: P, value: ResolveGodotNameValue<T, P>): void
        
        /** Register a reference for "do" that will be erased if the "do" history is lost. This is useful mostly for new nodes created for the "do" call. Do not use for resources. */
        addDoReference(object: GObject): void
        
        /** Register a reference for "undo" that will be erased if the "undo" history is lost. This is useful mostly for nodes removed with the "do" call (not the "undo" call!). */
        addUndoReference(object: GObject): void
        
        /** Returns the history ID deduced from the given [param object]. It can be used with [method get_history_undo_redo]. */
        getObjectHistoryId(object: GObject): int64
        
        /** Returns the [UndoRedo] object associated with the given history [param id].  
         *  [param id] above `0` are mapped to the opened scene tabs (but it doesn't match their order). [param id] of `0` or lower have special meaning (see [enum SpecialHistory]).  
         *  Best used with [method get_object_history_id]. This method is only provided in case you need some more advanced methods of [UndoRedo] (but keep in mind that directly operating on the [UndoRedo] object might affect editor's stability).  
         */
        getHistoryUndoRedo(id: int64): null | UndoRedo
        
        /** Clears the given undo history. You can clear history for a specific scene, global history, or for all histories at once (except [constant REMOTE_HISTORY]) if [param id] is [constant INVALID_HISTORY].  
         *  If [param increase_version] is `true`, the undo history version will be increased, marking it as unsaved. Useful for operations that modify the scene, but don't support undo.  
         *    
         *      
         *  **Note:** If you want to mark an edited scene as unsaved without clearing its history, use [method EditorInterface.mark_scene_as_unsaved] instead.  
         */
        clearHistory(id?: int64 /* = -99 */, increaseVersion?: boolean /* = true */): void
        
        /** Emitted when the list of actions in any history has changed, either when an action is committed or a history is cleared. */
        readonly historyChanged: Signal<() => void>
        
        /** Emitted when the version of any history has changed as a result of undo or redo call. */
        readonly versionChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorUndoRedoManager;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorUndoRedoManager;
    }
    namespace EditorVcsInterface {
        enum ChangeType {
            ChangeTypeNew = 0,
            ChangeTypeModified = 1,
            ChangeTypeRenamed = 2,
            ChangeTypeDeleted = 3,
            ChangeTypeTypechange = 4,
            ChangeTypeUnmerged = 5,
        }
        enum TreeArea {
            TreeAreaCommit = 0,
            TreeAreaStaged = 1,
            TreeAreaUnstaged = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEditorVcsInterface extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEditorVcsInterface extends __NameMapGObject {
        _set_credentials: "_setCredentials";
        _get_modified_files_data: "_getModifiedFilesData";
        _stage_file: "_stageFile";
        _unstage_file: "_unstageFile";
        _discard_file: "_discardFile";
        _allow_amends: "_allowAmends";
        _get_diff: "_getDiff";
        _shut_down: "_shutDown";
        _get_vcs_name: "_getVcsName";
        _get_previous_commits: "_getPreviousCommits";
        _get_branch_list: "_getBranchList";
        _get_remotes: "_getRemotes";
        _create_branch: "_createBranch";
        _remove_branch: "_removeBranch";
        _create_remote: "_createRemote";
        _remove_remote: "_removeRemote";
        _get_current_branch_name: "_getCurrentBranchName";
        _checkout_branch: "_checkoutBranch";
        _get_line_diff: "_getLineDiff";
        create_diff_line: "createDiffLine";
        create_diff_hunk: "createDiffHunk";
        create_diff_file: "createDiffFile";
        create_commit: "createCommit";
        create_status_file: "createStatusFile";
        add_diff_hunks_into_diff_file: "addDiffHunksIntoDiffFile";
        add_line_diffs_into_diff_hunk: "addLineDiffsIntoDiffHunk";
        popup_error: "popupError";
    }
    class EditorVcsInterface extends GObject {
        constructor(identifier?: any)
        /* gdvirtual */ _initialize(projectPath: string): boolean
        /* gdvirtual */ _setCredentials(username: string, password: string, sshPublicKeyPath: string, sshPrivateKeyPath: string, sshPassphrase: string): void
        /* gdvirtual */ _getModifiedFilesData(): GArray<GDictionary>
        /* gdvirtual */ _stageFile(filePath: string): void
        /* gdvirtual */ _unstageFile(filePath: string): void
        /* gdvirtual */ _discardFile(filePath: string): void
        /* gdvirtual */ _commit(msg: string, amend: boolean): void
        /* gdvirtual */ _allowAmends(): boolean
        /* gdvirtual */ _getDiff(identifier: string, area: int64): GArray<GDictionary>
        /* gdvirtual */ _shutDown(): boolean
        /* gdvirtual */ _getVcsName(): string
        /* gdvirtual */ _getPreviousCommits(maxCommits: int64): GArray<GDictionary>
        /* gdvirtual */ _getBranchList(): GArray<string>
        /* gdvirtual */ _getRemotes(): GArray<string>
        /* gdvirtual */ _createBranch(branchName: string): void
        /* gdvirtual */ _removeBranch(branchName: string): void
        /* gdvirtual */ _createRemote(remoteName: string, remoteUrl: string): void
        /* gdvirtual */ _removeRemote(remoteName: string): void
        /* gdvirtual */ _getCurrentBranchName(): string
        /* gdvirtual */ _checkoutBranch(branchName: string): boolean
        /* gdvirtual */ _pull(remote: string): void
        /* gdvirtual */ _push(remote: string, force: boolean): void
        /* gdvirtual */ _fetch(remote: string): void
        /* gdvirtual */ _getLineDiff(filePath: string, text: string): GArray<GDictionary>
        createDiffLine(newLineNo: int64, oldLineNo: int64, content: string, status: string): GDictionary
        createDiffHunk(oldStart: int64, newStart: int64, oldLines: int64, newLines: int64): GDictionary
        createDiffFile(newFile: string, oldFile: string): GDictionary
        createCommit(msg: string, author: string, id: string, unixTimestamp: int64, offsetMinutes: int64): GDictionary
        createStatusFile(filePath: string, changeType: EditorVcsInterface.ChangeType, area: EditorVcsInterface.TreeArea): GDictionary
        addDiffHunksIntoDiffFile(diffFile: GDictionary, diffHunks: GArray<GDictionary>): GDictionary
        addLineDiffsIntoDiffHunk(diffHunk: GDictionary, lineDiffs: GArray<GDictionary>): GDictionary
        popupError(msg: string): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEditorVcsInterface;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEditorVcsInterface;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEncodedObjectAsId extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEncodedObjectAsId extends __NameMapRefCounted {
        object_id: "objectId";
    }
    class EncodedObjectAsId extends RefCounted {
        constructor(identifier?: any)
        get objectId(): int64
        set objectId(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEncodedObjectAsId;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEncodedObjectAsId;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEngineProfiler extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEngineProfiler extends __NameMapRefCounted {
        _add_frame: "_addFrame";
    }
    /** Base class for creating custom profilers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_engineprofiler.html  
     */
    class EngineProfiler extends RefCounted {
        constructor(identifier?: any)
        /** Called when the profiler is enabled/disabled, along with a set of [param options]. */
        /* gdvirtual */ _toggle(enable: boolean, options: GArray): void
        
        /** Called when data is added to profiler using [method EngineDebugger.profiler_add_frame_data]. */
        /* gdvirtual */ _addFrame(data: GArray): void
        
        /** Called once every engine iteration when the profiler is active with information about the current frame. All time values are in seconds. Lower values represent faster processing times and are therefore considered better. */
        /* gdvirtual */ _tick(frameTime: float64, processTime: float64, physicsTime: float64, physicsFrameTime: float64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEngineProfiler;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEngineProfiler;
    }
    namespace Environment {
        enum BGMode {
            BgClearColor = 0,
            BgColor = 1,
            BgSky = 2,
            BgCanvas = 3,
            BgKeep = 4,
            BgCameraFeed = 5,
            BgMax = 6,
        }
        enum AmbientSource {
            AmbientSourceBg = 0,
            AmbientSourceDisabled = 1,
            AmbientSourceColor = 2,
            AmbientSourceSky = 3,
        }
        enum ReflectionSource {
            ReflectionSourceBg = 0,
            ReflectionSourceDisabled = 1,
            ReflectionSourceSky = 2,
        }
        enum ToneMapper {
            ToneMapperLinear = 0,
            ToneMapperReinhardt = 1,
            ToneMapperFilmic = 2,
            ToneMapperAces = 3,
            ToneMapperAgx = 4,
        }
        enum GlowBlendMode {
            GlowBlendModeAdditive = 0,
            GlowBlendModeScreen = 1,
            GlowBlendModeSoftlight = 2,
            GlowBlendModeReplace = 3,
            GlowBlendModeMix = 4,
        }
        enum FogMode {
            FogModeExponential = 0,
            FogModeDepth = 1,
        }
        enum SdfgiyScale {
            SdfgiYScale50Percent = 0,
            SdfgiYScale75Percent = 1,
            SdfgiYScale100Percent = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapEnvironment extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapEnvironment extends __NameMapResource {
        set_glow_level: "setGlowLevel";
        get_glow_level: "getGlowLevel";
        background_mode: "backgroundMode";
        background_color: "backgroundColor";
        background_energy_multiplier: "backgroundEnergyMultiplier";
        background_intensity: "backgroundIntensity";
        background_canvas_max_layer: "backgroundCanvasMaxLayer";
        background_camera_feed_id: "backgroundCameraFeedId";
        sky_custom_fov: "skyCustomFov";
        sky_rotation: "skyRotation";
        ambient_light_source: "ambientLightSource";
        ambient_light_color: "ambientLightColor";
        ambient_light_sky_contribution: "ambientLightSkyContribution";
        ambient_light_energy: "ambientLightEnergy";
        reflected_light_source: "reflectedLightSource";
        tonemap_mode: "tonemapMode";
        tonemap_exposure: "tonemapExposure";
        tonemap_white: "tonemapWhite";
        tonemap_agx_white: "tonemapAgxWhite";
        tonemap_agx_contrast: "tonemapAgxContrast";
        ssr_enabled: "ssrEnabled";
        ssr_max_steps: "ssrMaxSteps";
        ssr_fade_in: "ssrFadeIn";
        ssr_fade_out: "ssrFadeOut";
        ssr_depth_tolerance: "ssrDepthTolerance";
        ssao_enabled: "ssaoEnabled";
        ssao_radius: "ssaoRadius";
        ssao_intensity: "ssaoIntensity";
        ssao_power: "ssaoPower";
        ssao_detail: "ssaoDetail";
        ssao_horizon: "ssaoHorizon";
        ssao_sharpness: "ssaoSharpness";
        ssao_light_affect: "ssaoLightAffect";
        ssao_ao_channel_affect: "ssaoAOChannelAffect";
        ssil_enabled: "ssilEnabled";
        ssil_radius: "ssilRadius";
        ssil_intensity: "ssilIntensity";
        ssil_sharpness: "ssilSharpness";
        ssil_normal_rejection: "ssilNormalRejection";
        sdfgi_enabled: "sdfgiEnabled";
        sdfgi_use_occlusion: "sdfgiUseOcclusion";
        sdfgi_read_sky_light: "sdfgiReadSkyLight";
        sdfgi_bounce_feedback: "sdfgiBounceFeedback";
        sdfgi_cascades: "sdfgiCascades";
        sdfgi_min_cell_size: "sdfgiMinCellSize";
        sdfgi_cascade0_distance: "sdfgiCascade0Distance";
        sdfgi_max_distance: "sdfgiMaxDistance";
        sdfgi_y_scale: "sdfgiYScale";
        sdfgi_energy: "sdfgiEnergy";
        sdfgi_normal_bias: "sdfgiNormalBias";
        sdfgi_probe_bias: "sdfgiProbeBias";
        glow_enabled: "glowEnabled";
        "glow_levels/1": "glowLevels/1";
        "glow_levels/2": "glowLevels/2";
        "glow_levels/3": "glowLevels/3";
        "glow_levels/4": "glowLevels/4";
        "glow_levels/5": "glowLevels/5";
        "glow_levels/6": "glowLevels/6";
        "glow_levels/7": "glowLevels/7";
        glow_normalized: "glowNormalized";
        glow_intensity: "glowIntensity";
        glow_strength: "glowStrength";
        glow_mix: "glowMix";
        glow_bloom: "glowBloom";
        glow_blend_mode: "glowBlendMode";
        glow_hdr_threshold: "glowHdrThreshold";
        glow_hdr_scale: "glowHdrScale";
        glow_hdr_luminance_cap: "glowHdrLuminanceCap";
        glow_map_strength: "glowMapStrength";
        glow_map: "glowMap";
        fog_enabled: "fogEnabled";
        fog_mode: "fogMode";
        fog_light_color: "fogLightColor";
        fog_light_energy: "fogLightEnergy";
        fog_sun_scatter: "fogSunScatter";
        fog_density: "fogDensity";
        fog_aerial_perspective: "fogAerialPerspective";
        fog_sky_affect: "fogSkyAffect";
        fog_height: "fogHeight";
        fog_height_density: "fogHeightDensity";
        fog_depth_curve: "fogDepthCurve";
        fog_depth_begin: "fogDepthBegin";
        fog_depth_end: "fogDepthEnd";
        volumetric_fog_enabled: "volumetricFogEnabled";
        volumetric_fog_density: "volumetricFogDensity";
        volumetric_fog_albedo: "volumetricFogAlbedo";
        volumetric_fog_emission: "volumetricFogEmission";
        volumetric_fog_emission_energy: "volumetricFogEmissionEnergy";
        volumetric_fog_gi_inject: "volumetricFogGIInject";
        volumetric_fog_anisotropy: "volumetricFogAnisotropy";
        volumetric_fog_length: "volumetricFogLength";
        volumetric_fog_detail_spread: "volumetricFogDetailSpread";
        volumetric_fog_ambient_inject: "volumetricFogAmbientInject";
        volumetric_fog_sky_affect: "volumetricFogSkyAffect";
        volumetric_fog_temporal_reprojection_enabled: "volumetricFogTemporalReprojectionEnabled";
        volumetric_fog_temporal_reprojection_amount: "volumetricFogTemporalReprojectionAmount";
        adjustment_enabled: "adjustmentEnabled";
        adjustment_brightness: "adjustmentBrightness";
        adjustment_contrast: "adjustmentContrast";
        adjustment_saturation: "adjustmentSaturation";
        adjustment_color_correction: "adjustmentColorCorrection";
    }
    /** Resource for environment nodes (like [WorldEnvironment]) that define multiple rendering options.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_environment.html  
     */
    class Environment extends Resource {
        constructor(identifier?: any)
        /** Sets the intensity of the glow level [param idx]. A value above `0.0` enables the level. Each level relies on the previous level. This means that enabling higher glow levels will slow down the glow effect rendering, even if previous levels aren't enabled. */
        setGlowLevel(idx: int64, intensity: float64): void
        
        /** Returns the intensity of the glow level [param idx]. */
        getGlowLevel(idx: int64): float64
        
        /** The background mode. */
        get backgroundMode(): int64
        set backgroundMode(value: int64)
        
        /** The [Color] displayed for clear areas of the scene. Only effective when using the [constant BG_COLOR] background mode. */
        get backgroundColor(): Color
        set backgroundColor(value: Color)
        
        /** Multiplier for background energy. Increase to make background brighter, decrease to make background dimmer. */
        get backgroundEnergyMultiplier(): float64
        set backgroundEnergyMultiplier(value: float64)
        
        /** Luminance of background measured in nits (candela per square meter). Only used when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is enabled. The default value is roughly equivalent to the sky at midday. */
        get backgroundIntensity(): float64
        set backgroundIntensity(value: float64)
        
        /** The maximum layer ID to display. Only effective when using the [constant BG_CANVAS] background mode. */
        get backgroundCanvasMaxLayer(): int64
        set backgroundCanvasMaxLayer(value: int64)
        
        /** The ID of the camera feed to show in the background. */
        get backgroundCameraFeedId(): int64
        set backgroundCameraFeedId(value: int64)
        
        /** The [Sky] resource used for this [Environment]. */
        get sky(): null | Sky
        set sky(value: null | Sky)
        
        /** If set to a value greater than `0.0`, overrides the field of view to use for sky rendering. If set to `0.0`, the same FOV as the current [Camera3D] is used for sky rendering. */
        get skyCustomFov(): float64
        set skyCustomFov(value: float64)
        
        /** The rotation to use for sky rendering. */
        get skyRotation(): Vector3
        set skyRotation(value: Vector3)
        
        /** The ambient light source to use for rendering materials and global illumination. */
        get ambientLightSource(): int64
        set ambientLightSource(value: int64)
        
        /** The ambient light's [Color]. Only effective if [member ambient_light_sky_contribution] is lower than `1.0` (exclusive). */
        get ambientLightColor(): Color
        set ambientLightColor(value: Color)
        
        /** Defines the amount of light that the sky brings on the scene. A value of `0.0` means that the sky's light emission has no effect on the scene illumination, thus all ambient illumination is provided by the ambient light. On the contrary, a value of `1.0` means that  *all*  the light that affects the scene is provided by the sky, thus the ambient light parameter has no effect on the scene.  
         *      
         *  **Note:** [member ambient_light_sky_contribution] is internally clamped between `0.0` and `1.0` (inclusive).  
         */
        get ambientLightSkyContribution(): float64
        set ambientLightSkyContribution(value: float64)
        
        /** The ambient light's energy. The higher the value, the stronger the light. Only effective if [member ambient_light_sky_contribution] is lower than `1.0` (exclusive). */
        get ambientLightEnergy(): float64
        set ambientLightEnergy(value: float64)
        
        /** The reflected (specular) light source. */
        get reflectedLightSource(): int64
        set reflectedLightSource(value: int64)
        
        /** The tonemapping mode to use. Tonemapping is the process that "converts" HDR values to be suitable for rendering on an LDR display. (Godot doesn't support rendering on HDR displays yet.) */
        get tonemapMode(): int64
        set tonemapMode(value: int64)
        
        /** Adjusts the brightness of values before they are provided to the tonemapper. Higher [member tonemap_exposure] values result in a brighter image. See also [member tonemap_white].  
         *      
         *  **Note:** Values provided to the tonemapper will also be multiplied by `2.0` and `1.8` for [constant TONE_MAPPER_FILMIC] and [constant TONE_MAPPER_ACES] respectively to produce a similar apparent brightness as [constant TONE_MAPPER_LINEAR].  
         */
        get tonemapExposure(): float64
        set tonemapExposure(value: float64)
        
        /** The white reference value for tonemapping, which indicates where bright white is located in the scale of values provided to the tonemapper. For photorealistic lighting, it is recommended to set [member tonemap_white] to at least `6.0`. Higher values result in less blown out highlights, but may make the scene appear lower contrast. [member tonemap_agx_white] will be used instead when using the [constant TONE_MAPPER_AGX] tonemapper. See also [member tonemap_exposure].  
         *      
         *  **Note:** [member tonemap_white] must be set to `2.0` or lower on the Mobile renderer to produce bright images.  
         *      
         *  **Note:** [member tonemap_white] is ignored when using [constant TONE_MAPPER_LINEAR] and will be dynamically adjusted at runtime to never be less than the parent window's [method Window.get_output_max_linear_value] when using [constant TONE_MAPPER_REINHARDT] with [member Viewport.use_hdr_2d].  
         */
        get tonemapWhite(): float64
        set tonemapWhite(value: float64)
        
        /** The white reference value for tonemapping, which indicates where bright white is located in the scale of values provided to the tonemapper. For photorealistic lighting, it is recommended to set [member tonemap_agx_white] to at least `6.0`. Higher values result in less blown out highlights, but may make the scene appear lower contrast. [member tonemap_agx_white] is the same as [member tonemap_white], but is only effective with the [constant TONE_MAPPER_AGX] tonemapper. See also [member tonemap_exposure].  
         *      
         *  **Note:** When using the Mobile renderer with [member Viewport.use_hdr_2d] disabled, [member tonemap_agx_white] is ignored and a white value of `2.0` will always be used instead. Otherwise, [member tonemap_agx_white] will be dynamically adjusted at runtime by multiplying it by the parent window's [method Window.get_output_max_linear_value] when using [member Viewport.use_hdr_2d] to ensure good behavior with both SDR and HDR output.  
         */
        get tonemapAgxWhite(): float64
        set tonemapAgxWhite(value: float64)
        
        /** Increasing [member tonemap_agx_contrast] will make dark values darker and bright values brighter. Produces a higher quality result than [member adjustment_contrast] without any additional performance cost, but is only available when using the [constant TONE_MAPPER_AGX] tonemapper. */
        get tonemapAgxContrast(): float64
        set tonemapAgxContrast(value: float64)
        
        /** If `true`, screen-space reflections are enabled. Screen-space reflections are more accurate than reflections from [VoxelGI]s or [ReflectionProbe]s, but are slower and can't reflect surfaces occluded by others.  
         *      
         *  **Note:** SSR is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         *      
         *  **Note:** SSR is not supported on viewports that have a transparent background (where [member Viewport.transparent_bg] is `true`).  
         */
        get ssrEnabled(): boolean
        set ssrEnabled(value: boolean)
        
        /** The maximum number of steps for screen-space reflections. Higher values are slower. */
        get ssrMaxSteps(): int64
        set ssrMaxSteps(value: int64)
        
        /** The fade-in distance for screen-space reflections. Affects the area from the reflected material to the screen-space reflection. Only positive values are valid (negative values will be clamped to `0.0`). */
        get ssrFadeIn(): float64
        set ssrFadeIn(value: float64)
        
        /** The fade-out distance for screen-space reflections. Affects the area from the screen-space reflection to the "global" reflection. Only positive values are valid (negative values will be clamped to `0.0`). */
        get ssrFadeOut(): float64
        set ssrFadeOut(value: float64)
        
        /** The depth tolerance for screen-space reflections. */
        get ssrDepthTolerance(): float64
        set ssrDepthTolerance(value: float64)
        
        /** If `true`, the screen-space ambient occlusion effect is enabled. This darkens objects' corners and cavities to simulate ambient light not reaching the entire object as in real life. This works well for small, dynamic objects, but baked lighting or ambient occlusion textures will do a better job at displaying ambient occlusion on large static objects. Godot uses a form of SSAO called Adaptive Screen Space Ambient Occlusion which is itself a form of Horizon Based Ambient Occlusion.  
         *      
         *  **Note:** SSAO is only supported in the Forward+ and Compatibility rendering methods, not Mobile.  
         */
        get ssaoEnabled(): boolean
        set ssaoEnabled(value: boolean)
        
        /** The distance at which objects can occlude each other when calculating screen-space ambient occlusion. Higher values will result in occlusion over a greater distance at the cost of performance and quality. */
        get ssaoRadius(): float64
        set ssaoRadius(value: float64)
        
        /** The primary screen-space ambient occlusion intensity. Acts as a multiplier for the screen-space ambient occlusion effect. A higher value results in darker occlusion. */
        get ssaoIntensity(): float64
        set ssaoIntensity(value: float64)
        
        /** The distribution of occlusion. A higher value results in darker occlusion, similar to [member ssao_intensity], but with a sharper falloff. */
        get ssaoPower(): float64
        set ssaoPower(value: float64)
        
        /** Sets the strength of the additional level of detail for the screen-space ambient occlusion effect. A high value makes the detail pass more prominent, but it may contribute to aliasing in your final image. */
        get ssaoDetail(): float64
        set ssaoDetail(value: float64)
        
        /** The threshold for considering whether a given point on a surface is occluded or not represented as an angle from the horizon mapped into the `0.0-1.0` range. A value of `1.0` results in no occlusion. */
        get ssaoHorizon(): float64
        set ssaoHorizon(value: float64)
        
        /** The amount that the screen-space ambient occlusion effect is allowed to blur over the edges of objects. Setting too high will result in aliasing around the edges of objects. Setting too low will make object edges appear blurry. */
        get ssaoSharpness(): float64
        set ssaoSharpness(value: float64)
        
        /** The screen-space ambient occlusion intensity in direct light. In real life, ambient occlusion only applies to indirect light, which means its effects can't be seen in direct light. Values higher than `0` will make the SSAO effect visible in direct light. */
        get ssaoLightAffect(): float64
        set ssaoLightAffect(value: float64)
        
        /** The screen-space ambient occlusion intensity on materials that have an AO texture defined. Values higher than `0` will make the SSAO effect visible in areas darkened by AO textures. */
        get ssaoAOChannelAffect(): float64
        set ssaoAOChannelAffect(value: float64)
        
        /** If `true`, the screen-space indirect lighting effect is enabled. Screen space indirect lighting is a form of indirect lighting that allows diffuse light to bounce between nearby objects. Screen-space indirect lighting works very similarly to screen-space ambient occlusion, in that it only affects a limited range. It is intended to be used along with a form of proper global illumination like SDFGI or [VoxelGI]. Screen-space indirect lighting is not affected by individual light's [member Light3D.light_indirect_energy].  
         *      
         *  **Note:** SSIL is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         */
        get ssilEnabled(): boolean
        set ssilEnabled(value: boolean)
        
        /** The distance that bounced lighting can travel when using the screen space indirect lighting effect. A larger value will result in light bouncing further in a scene, but may result in under-sampling artifacts which look like long spikes surrounding light sources. */
        get ssilRadius(): float64
        set ssilRadius(value: float64)
        
        /** The brightness multiplier for the screen-space indirect lighting effect. A higher value will result in brighter light. */
        get ssilIntensity(): float64
        set ssilIntensity(value: float64)
        
        /** The amount that the screen-space indirect lighting effect is allowed to blur over the edges of objects. Setting too high will result in aliasing around the edges of objects. Setting too low will make object edges appear blurry. */
        get ssilSharpness(): float64
        set ssilSharpness(value: float64)
        
        /** Amount of normal rejection used when calculating screen-space indirect lighting. Normal rejection uses the normal of a given sample point to reject samples that are facing away from the current pixel. Normal rejection is necessary to avoid light leaking when only one side of an object is illuminated. However, normal rejection can be disabled if light leaking is desirable, such as when the scene mostly contains emissive objects that emit light from faces that cannot be seen from the camera. */
        get ssilNormalRejection(): float64
        set ssilNormalRejection(value: float64)
        
        /** If `true`, enables signed distance field global illumination for meshes that have their [member GeometryInstance3D.gi_mode] set to [constant GeometryInstance3D.GI_MODE_STATIC]. SDFGI is a real-time global illumination technique that works well with procedurally generated and user-built levels, including in situations where geometry is created during gameplay. The signed distance field is automatically generated around the camera as it moves. Dynamic lights are supported, but dynamic occluders and emissive surfaces are not.  
         *      
         *  **Note:** SDFGI is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         *  **Performance:** SDFGI is relatively demanding on the GPU and is not suited to low-end hardware such as integrated graphics (consider [LightmapGI] instead). To improve SDFGI performance, enable [member ProjectSettings.rendering/global_illumination/gi/use_half_resolution] in the Project Settings.  
         *      
         *  **Note:** Meshes should have sufficiently thick walls to avoid light leaks (avoid one-sided walls). For interior levels, enclose your level geometry in a sufficiently large box and bridge the loops to close the mesh.  
         */
        get sdfgiEnabled(): boolean
        set sdfgiEnabled(value: boolean)
        
        /** If `true`, SDFGI uses an occlusion detection approach to reduce light leaking. Occlusion may however introduce dark blotches in certain spots, which may be undesired in mostly outdoor scenes. [member sdfgi_use_occlusion] has a performance impact and should only be enabled when needed. */
        get sdfgiUseOcclusion(): boolean
        set sdfgiUseOcclusion(value: boolean)
        
        /** If `true`, SDFGI takes the environment lighting into account. This should be set to `false` for interior scenes. */
        get sdfgiReadSkyLight(): boolean
        set sdfgiReadSkyLight(value: boolean)
        
        /** The energy multiplier applied to light every time it bounces from a surface when using SDFGI. Values greater than `0.0` will simulate multiple bounces, resulting in a more realistic appearance. Increasing [member sdfgi_bounce_feedback] generally has no performance impact. See also [member sdfgi_energy].  
         *      
         *  **Note:** Values greater than `0.5` can cause infinite feedback loops and should be avoided in scenes with bright materials.  
         *      
         *  **Note:** If [member sdfgi_bounce_feedback] is `0.0`, indirect lighting will not be represented in reflections as light will only bounce one time.  
         */
        get sdfgiBounceFeedback(): float64
        set sdfgiBounceFeedback(value: float64)
        
        /** The number of cascades to use for SDFGI (between 1 and 8). A higher number of cascades allows displaying SDFGI further away while preserving detail up close, at the cost of performance. When using SDFGI on small-scale levels, [member sdfgi_cascades] can often be decreased between `1` and `4` to improve performance. */
        get sdfgiCascades(): int64
        set sdfgiCascades(value: int64)
        
        /** The cell size to use for the closest SDFGI cascade (in 3D units). Lower values allow SDFGI to be more precise up close, at the cost of making SDFGI updates more demanding. This can cause stuttering when the camera moves fast. Higher values allow SDFGI to cover more ground, while also reducing the performance impact of SDFGI updates.  
         *      
         *  **Note:** This property is linked to [member sdfgi_max_distance] and [member sdfgi_cascade0_distance]. Changing its value will automatically change those properties as well.  
         */
        get sdfgiMinCellSize(): float64
        set sdfgiMinCellSize(value: float64)
        
        /**     
         *  **Note:** This property is linked to [member sdfgi_min_cell_size] and [member sdfgi_max_distance]. Changing its value will automatically change those properties as well.  
         */
        get sdfgiCascade0Distance(): float64
        set sdfgiCascade0Distance(value: float64)
        
        /** The maximum distance at which SDFGI is visible. Beyond this distance, environment lighting or other sources of GI such as [ReflectionProbe] will be used as a fallback.  
         *      
         *  **Note:** This property is linked to [member sdfgi_min_cell_size] and [member sdfgi_cascade0_distance]. Changing its value will automatically change those properties as well.  
         */
        get sdfgiMaxDistance(): float64
        set sdfgiMaxDistance(value: float64)
        
        /** The Y scale to use for SDFGI cells. Lower values will result in SDFGI cells being packed together more closely on the Y axis. This is used to balance between quality and covering a lot of vertical ground. [member sdfgi_y_scale] should be set depending on how vertical your scene is (and how fast your camera may move on the Y axis). */
        get sdfgiYScale(): int64
        set sdfgiYScale(value: int64)
        
        /** The energy multiplier to use for SDFGI. Higher values will result in brighter indirect lighting and reflections. See also [member sdfgi_bounce_feedback]. */
        get sdfgiEnergy(): float64
        set sdfgiEnergy(value: float64)
        
        /** The normal bias to use for SDFGI probes. Increasing this value can reduce visible streaking artifacts on sloped surfaces, at the cost of increased light leaking. */
        get sdfgiNormalBias(): float64
        set sdfgiNormalBias(value: float64)
        
        /** The constant bias to use for SDFGI probes. Increasing this value can reduce visible streaking artifacts on sloped surfaces, at the cost of increased light leaking. */
        get sdfgiProbeBias(): float64
        set sdfgiProbeBias(value: float64)
        
        /** If `true`, the glow effect is enabled. This simulates real world atmosphere and eye/camera behavior by causing bright pixels to bleed onto surrounding pixels.  
         *      
         *  **Note:** When using the Mobile rendering method, glow looks different due to the lower dynamic range available in the Mobile rendering method.  
         *      
         *  **Note:** When using the Compatibility rendering method, glow uses a different implementation with some properties being unavailable and hidden from the inspector: `glow_levels/*`, [member glow_normalized], [member glow_strength], [member glow_blend_mode], [member glow_mix], [member glow_map], and [member glow_map_strength]. This implementation is optimized to run on low-end devices and is less flexible as a result.  
         */
        get glowEnabled(): boolean
        set glowEnabled(value: boolean)
        
        /** The intensity of the 1st level of glow. This is the most "local" level (least blurry).  
         *      
         *  **Note:** [member glow_levels/1] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/1"(): float64
        set "glowLevels/1"(value: float64)
        
        /** The intensity of the 2nd level of glow.  
         *      
         *  **Note:** [member glow_levels/2] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/2"(): float64
        set "glowLevels/2"(value: float64)
        
        /** The intensity of the 3rd level of glow.  
         *      
         *  **Note:** [member glow_levels/3] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/3"(): float64
        set "glowLevels/3"(value: float64)
        
        /** The intensity of the 4th level of glow.  
         *      
         *  **Note:** [member glow_levels/4] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/4"(): float64
        set "glowLevels/4"(value: float64)
        
        /** The intensity of the 5th level of glow.  
         *      
         *  **Note:** [member glow_levels/5] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/5"(): float64
        set "glowLevels/5"(value: float64)
        
        /** The intensity of the 6th level of glow.  
         *      
         *  **Note:** [member glow_levels/6] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/6"(): float64
        set "glowLevels/6"(value: float64)
        
        /** The intensity of the 7th level of glow. This is the most "global" level (blurriest).  
         *      
         *  **Note:** [member glow_levels/7] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get "glowLevels/7"(): float64
        set "glowLevels/7"(value: float64)
        
        /** If `true`, glow levels will be normalized so that summed together their intensities equal `1.0`.  
         *      
         *  **Note:** [member glow_normalized] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get glowNormalized(): boolean
        set glowNormalized(value: boolean)
        
        /** The overall brightness multiplier that is applied to the glow effect just before it is blended with the scene. When using the Mobile rendering method (which only supports a lower dynamic range up to `2.0`), this should be increased to `1.5` to compensate. */
        get glowIntensity(): float64
        set glowIntensity(value: float64)
        
        /** The strength that is used when blurring across the screen to generate the glow effect. This affects the distance and intensity of the blur. When using the Mobile rendering method, this should be increased to compensate for the lower dynamic range.  
         *      
         *  **Note:** [member glow_strength] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get glowStrength(): float64
        set glowStrength(value: float64)
        
        /** When using the [constant GLOW_BLEND_MODE_MIX] [member glow_blend_mode], this controls how much the source image is blended with the glow layer. A value of `0.0` makes the glow rendering invisible, while a value of `1.0` is equivalent to [constant GLOW_BLEND_MODE_REPLACE].  
         *      
         *  **Note:** [member glow_mix] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get glowMix(): float64
        set glowMix(value: float64)
        
        /** The bloom's intensity. If set to a value higher than `0`, this will make glow visible in areas darker than the [member glow_hdr_threshold]. */
        get glowBloom(): float64
        set glowBloom(value: float64)
        
        /** The glow blending mode.  
         *      
         *  **Note:** The Compatibility renderer always uses [constant GLOW_BLEND_MODE_SCREEN] and [member glow_blend_mode] will have no effect.  
         */
        get glowBlendMode(): int64
        set glowBlendMode(value: int64)
        
        /** The lower threshold of the HDR glow. When using the Mobile rendering method (which only supports a lower dynamic range up to `2.0`), this may need to be below `1.0` for glow to be visible. A value of `0.9` works well in this case. This value also needs to be decreased below `1.0` when using glow in 2D, as 2D rendering is performed in SDR. */
        get glowHdrThreshold(): float64
        set glowHdrThreshold(value: float64)
        
        /** Smooths the transition between values that are below and above [member glow_hdr_threshold] by reducing the amount of glow generated by values that are close to [member glow_hdr_threshold]. Values above `glow_hdr_threshold + glow_hdr_scale` will not have glow reduced in this way. */
        get glowHdrScale(): float64
        set glowHdrScale(value: float64)
        
        /** The higher threshold of the HDR glow. Areas brighter than this threshold will be clamped for the purposes of the glow effect. */
        get glowHdrLuminanceCap(): float64
        set glowHdrLuminanceCap(value: float64)
        
        /** How strong of an influence the [member glow_map] should have on the overall glow effect. A strength of `0.0` means the glow map has no influence, while a strength of `1.0` means the glow map has full influence.  
         *      
         *  **Note:** If the glow map has black areas, a value of `1.0` can also turn off the glow effect entirely in specific areas of the screen.  
         *      
         *  **Note:** [member glow_map_strength] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get glowMapStrength(): float64
        set glowMapStrength(value: float64)
        
        /** The texture that should be used as a glow map to  *multiply*  the resulting glow color according to [member glow_map_strength]. This can be used to create a "lens dirt" effect. The texture's RGB color channels are used for modulation, but the alpha channel is ignored.  
         *      
         *  **Note:** The texture will be stretched to fit the screen. Therefore, it's recommended to use a texture with an aspect ratio that matches your project's base aspect ratio (typically 16:9).  
         *      
         *  **Note:** [member glow_map] has no effect when using the Compatibility rendering method, due to this rendering method using a simpler glow implementation optimized for low-end devices.  
         */
        get glowMap(): null | Texture2D
        set glowMap(value: null | Texture2D)
        
        /** If `true`, fog effects are enabled. */
        get fogEnabled(): boolean
        set fogEnabled(value: boolean)
        
        /** The fog mode. */
        get fogMode(): int64
        set fogMode(value: int64)
        
        /** The fog's color. */
        get fogLightColor(): Color
        set fogLightColor(value: Color)
        
        /** The fog's brightness. Higher values result in brighter fog. */
        get fogLightEnergy(): float64
        set fogLightEnergy(value: float64)
        
        /** If set above `0.0`, renders the scene's directional light(s) in the fog color depending on the view angle. This can be used to give the impression that the sun is "piercing" through the fog. */
        get fogSunScatter(): float64
        set fogSunScatter(value: float64)
        
        /** The fog density to be used. This is demonstrated in different ways depending on the [member fog_mode] mode chosen:  
         *  **Exponential Fog Mode:** Higher values result in denser fog. The fog rendering is exponential like in real life.  
         *  **Depth Fog mode:** The maximum intensity of the deep fog, effect will appear in the distance (relative to the camera). At `1.0` the fog will fully obscure the scene, at `0.0` the fog will not be visible.  
         */
        get fogDensity(): float64
        set fogDensity(value: float64)
        
        /** If set above `0.0` (exclusive), blends between the fog's color and the color of the background [Sky], as read from the radiance cubemap. This has a small performance cost when set above `0.0`. Must have [member background_mode] set to [constant BG_SKY].  
         *  This is useful to simulate [url=https://en.wikipedia.org/wiki/Aerial_perspective]aerial perspective[/url] in large scenes with low density fog. However, it is not very useful for high-density fog, as the sky will shine through. When set to `1.0`, the fog color comes completely from the [Sky]. If set to `0.0`, aerial perspective is disabled.  
         *  Notice that this does not sample the [Sky] directly, but rather the radiance cubemap. The cubemap is sampled at a mipmap level depending on the depth of the rendered pixel; the farther away, the higher the resolution of the sampled mipmap. This results in the actual color being a blurred version of the sky, with more blur closer to the camera. The highest mipmap resolution is used at a depth of [member Camera3D.far].  
         */
        get fogAerialPerspective(): float64
        set fogAerialPerspective(value: float64)
        
        /** The factor to use when affecting the sky with non-volumetric fog. `1.0` means that fog can fully obscure the sky. Lower values reduce the impact of fog on sky rendering, with `0.0` not affecting sky rendering at all.  
         *      
         *  **Note:** [member fog_sky_affect] has no visual effect if [member fog_aerial_perspective] is `1.0`.  
         */
        get fogSkyAffect(): float64
        set fogSkyAffect(value: float64)
        
        /** The height at which the height fog effect begins. */
        get fogHeight(): float64
        set fogHeight(value: float64)
        
        /** The density used to increase fog as height decreases. To make fog increase as height increases, use a negative value. */
        get fogHeightDensity(): float64
        set fogHeightDensity(value: float64)
        
        /** The fog depth's intensity curve. A number of presets are available in the Inspector by right-clicking the curve. Only available when [member fog_mode] is set to [constant FOG_MODE_DEPTH]. */
        get fogDepthCurve(): float64
        set fogDepthCurve(value: float64)
        
        /** The fog's depth starting distance from the camera. Only available when [member fog_mode] is set to [constant FOG_MODE_DEPTH]. */
        get fogDepthBegin(): float64
        set fogDepthBegin(value: float64)
        
        /** The fog's depth end distance from the camera. If this value is set to `0`, it will be equal to the current camera's [member Camera3D.far] value. Only available when [member fog_mode] is set to [constant FOG_MODE_DEPTH]. */
        get fogDepthEnd(): float64
        set fogDepthEnd(value: float64)
        
        /** Enables the volumetric fog effect. Volumetric fog uses a screen-aligned froxel buffer to calculate accurate volumetric scattering in the short to medium range. Volumetric fog interacts with [FogVolume]s and lights to calculate localized and global fog. Volumetric fog uses a PBR single-scattering model based on extinction, scattering, and emission which it exposes to users as density, albedo, and emission.  
         *      
         *  **Note:** Volumetric fog is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         */
        get volumetricFogEnabled(): boolean
        set volumetricFogEnabled(value: boolean)
        
        /** The base  *exponential*  density of the volumetric fog. Set this to the lowest density you want to have globally. [FogVolume]s can be used to add to or subtract from this density in specific areas. Fog rendering is exponential as in real life.  
         *  A value of `0.0` disables global volumetric fog while allowing [FogVolume]s to display volumetric fog in specific areas.  
         *  To make volumetric fog work as a volumetric  *lighting*  solution, set [member volumetric_fog_density] to the lowest non-zero value (`0.0001`) then increase lights' [member Light3D.light_volumetric_fog_energy] to values between `10000` and `100000` to compensate for the very low density.  
         */
        get volumetricFogDensity(): float64
        set volumetricFogDensity(value: float64)
        
        /** The [Color] of the volumetric fog when interacting with lights. Mist and fog have an albedo close to `Color(1, 1, 1, 1)` while smoke has a darker albedo. */
        get volumetricFogAlbedo(): Color
        set volumetricFogAlbedo(value: Color)
        
        /** The emitted light from the volumetric fog. Even with emission, volumetric fog will not cast light onto other surfaces. Emission is useful to establish an ambient color. As the volumetric fog effect uses single-scattering only, fog tends to need a little bit of emission to soften the harsh shadows. */
        get volumetricFogEmission(): Color
        set volumetricFogEmission(value: Color)
        
        /** The brightness of the emitted light from the volumetric fog. */
        get volumetricFogEmissionEnergy(): float64
        set volumetricFogEmissionEnergy(value: float64)
        
        /** Scales the strength of Global Illumination used in the volumetric fog's albedo color. A value of `0.0` means that Global Illumination will not impact the volumetric fog. [member volumetric_fog_gi_inject] has a small performance cost when set above `0.0`.  
         *      
         *  **Note:** This has no visible effect if [member volumetric_fog_density] is `0.0` or if [member volumetric_fog_albedo] is a fully black color.  
         *      
         *  **Note:** Only [VoxelGI] and SDFGI ([member Environment.sdfgi_enabled]) are taken into account when using [member volumetric_fog_gi_inject]. Global illumination from [LightmapGI], [ReflectionProbe] and SSIL (see [member ssil_enabled]) will be ignored by volumetric fog.  
         */
        get volumetricFogGIInject(): float64
        set volumetricFogGIInject(value: float64)
        
        /** The direction of scattered light as it goes through the volumetric fog. A value close to `1.0` means almost all light is scattered forward. A value close to `0.0` means light is scattered equally in all directions. A value close to `-1.0` means light is scattered mostly backward. Fog and mist scatter light slightly forward, while smoke scatters light equally in all directions. */
        get volumetricFogAnisotropy(): float64
        set volumetricFogAnisotropy(value: float64)
        
        /** The distance over which the volumetric fog is computed. Increase to compute fog over a greater range, decrease to add more detail when a long range is not needed. For best quality fog, keep this as low as possible. See also [member ProjectSettings.rendering/environment/volumetric_fog/volume_depth]. */
        get volumetricFogLength(): float64
        set volumetricFogLength(value: float64)
        
        /** The distribution of size down the length of the froxel buffer. A higher value compresses the froxels closer to the camera and places more detail closer to the camera. */
        get volumetricFogDetailSpread(): float64
        set volumetricFogDetailSpread(value: float64)
        
        /** Scales the strength of ambient light used in the volumetric fog. A value of `0.0` means that ambient light will not impact the volumetric fog. [member volumetric_fog_ambient_inject] has a small performance cost when set above `0.0`.  
         *      
         *  **Note:** This has no visible effect if [member volumetric_fog_density] is `0.0` or if [member volumetric_fog_albedo] is a fully black color.  
         */
        get volumetricFogAmbientInject(): float64
        set volumetricFogAmbientInject(value: float64)
        
        /** The factor to use when affecting the sky with volumetric fog. `1.0` means that volumetric fog can fully obscure the sky. Lower values reduce the impact of volumetric fog on sky rendering, with `0.0` not affecting sky rendering at all.  
         *      
         *  **Note:** [member volumetric_fog_sky_affect] also affects [FogVolume]s, even if [member volumetric_fog_density] is `0.0`. If you notice [FogVolume]s are disappearing when looking towards the sky, set [member volumetric_fog_sky_affect] to `1.0`.  
         */
        get volumetricFogSkyAffect(): float64
        set volumetricFogSkyAffect(value: float64)
        
        /** Enables temporal reprojection in the volumetric fog. Temporal reprojection blends the current frame's volumetric fog with the last frame's volumetric fog to smooth out jagged edges. The performance cost is minimal; however, it leads to moving [FogVolume]s and [Light3D]s "ghosting" and leaving a trail behind them. When temporal reprojection is enabled, try to avoid moving [FogVolume]s or [Light3D]s too fast. Short-lived dynamic lighting effects should have [member Light3D.light_volumetric_fog_energy] set to `0.0` to avoid ghosting. */
        get volumetricFogTemporalReprojectionEnabled(): boolean
        set volumetricFogTemporalReprojectionEnabled(value: boolean)
        
        /** The amount by which to blend the last frame with the current frame. A higher number results in smoother volumetric fog, but makes "ghosting" much worse. A lower value reduces ghosting but can result in the per-frame temporal jitter becoming visible. */
        get volumetricFogTemporalReprojectionAmount(): float64
        set volumetricFogTemporalReprojectionAmount(value: float64)
        
        /** If `true`, enables the `adjustment_*` properties provided by this resource. If `false`, modifications to the `adjustment_*` properties will have no effect on the rendered scene. */
        get adjustmentEnabled(): boolean
        set adjustmentEnabled(value: boolean)
        
        /** Applies a simple brightness adjustment to the rendered image after tonemaping. To adjust scene brightness use [member tonemap_exposure] instead, which is applied before tonemapping and thus less prone to issues with bright colors. Effective only if [member adjustment_enabled] is `true`. */
        get adjustmentBrightness(): float64
        set adjustmentBrightness(value: float64)
        
        /** Increasing [member adjustment_contrast] will make dark values darker and bright values brighter. This simple adjustment is applied to the rendered image after tonemaping. When set to a value greater than `1.0`, [member adjustment_contrast] is prone to clipping colors that become too bright or too dark. Effective only if [member adjustment_enabled] is `true`. */
        get adjustmentContrast(): float64
        set adjustmentContrast(value: float64)
        
        /** Applies a simple saturation adjustment to the rendered image after tonemaping. When [member adjustment_saturation] is set to `0.0`, the rendered image will be fully converted to a grayscale image. Effective only if [member adjustment_enabled] is `true`. */
        get adjustmentSaturation(): float64
        set adjustmentSaturation(value: float64)
        
        /** The [Texture2D] or [Texture3D] lookup table (LUT) to use for the built-in post-process color grading. Can use a [GradientTexture1D] for a 1-dimensional LUT, or a [Texture3D] for a more complex LUT. Effective only if [member adjustment_enabled] is `true`.  
         *      
         *  **Note:** Color correction does not currently support HDR output due to only supporting values in the SDR (0.0 to 1.0) range.  
         */
        get adjustmentColorCorrection(): null | Texture2D | Texture3D
        set adjustmentColorCorrection(value: null | Texture2D | Texture3D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapEnvironment;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapEnvironment;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapExpression extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapExpression extends __NameMapRefCounted {
        has_execute_failed: "hasExecuteFailed";
        get_error_text: "getErrorText";
    }
    /** A class that stores an expression you can execute.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_expression.html  
     */
    class Expression extends RefCounted {
        constructor(identifier?: any)
        /** Parses the expression and returns an [enum Error] code.  
         *  You can optionally specify names of variables that may appear in the expression with [param input_names], so that you can bind them when it gets executed.  
         */
        parse(expression: string, inputNames?: PackedStringArray | string[] /* = [] */): GError
        
        /** Executes the expression that was previously parsed by [method parse] and returns the result. Before you use the returned object, you should check if the method failed by calling [method has_execute_failed].  
         *  If you defined input variables in [method parse], you can specify their values in the inputs array, in the same order.  
         */
        execute(inputs?: GArray, baseInstance?: GObject, showError?: boolean /* = true */, constCallsOnly?: boolean /* = false */): any
        
        /** Returns `true` if [method execute] has failed. */
        hasExecuteFailed(): boolean
        
        /** Returns the error text if [method parse] or [method execute] has failed. */
        getErrorText(): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapExpression;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapExpression;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapExternalTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapExternalTexture extends __NameMapTexture2D {
        get_external_texture_id: "getExternalTextureId";
        set_external_buffer_id: "setExternalBufferId";
    }
    /** Texture which displays the content of an external buffer.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_externaltexture.html  
     */
    class ExternalTexture extends Texture2D {
        constructor(identifier?: any)
        /** Returns the external texture ID.  
         *  Depending on your use case, you may need to pass this to platform APIs, for example, when creating an `android.graphics.SurfaceTexture` on Android.  
         */
        getExternalTextureId(): int64
        
        /** Sets the external buffer ID.  
         *  Depending on your use case, you may need to call this with data received from a platform API, for example, `SurfaceTexture.getHardwareBuffer()` on Android.  
         */
        setExternalBufferId(externalBufferId: int64): void
        
        /** External texture size. */
        get size(): Vector2
        set size(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapExternalTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapExternalTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapFabrik3D extends __RPCMapIterateIK3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapFabrik3D extends __NameMapIterateIK3D {
    }
    class Fabrik3D<Map extends NodePathMap = any> extends IterateIK3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapFabrik3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapFabrik3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapFbxDocument extends __RPCMapGltfDocument {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapFbxDocument extends __NameMapGltfDocument {
    }
    class FbxDocument extends GltfDocument {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapFbxDocument;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapFbxDocument;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapFbxState extends __RPCMapGltfState {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapFbxState extends __NameMapGltfState {
        allow_geometry_helper_nodes: "allowGeometryHelperNodes";
    }
    class FbxState extends GltfState {
        constructor(identifier?: any)
        get allowGeometryHelperNodes(): boolean
        set allowGeometryHelperNodes(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapFbxState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapFbxState;
    }
}
