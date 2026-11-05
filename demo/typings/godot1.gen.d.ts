declare module "godot" {
    // AUTO-GENERATED
    // _singleton_class_: NavigationServer2D
    namespace NavigationServer2D {
        enum ProcessInfo {
            InfoActiveMaps = 0,
            InfoRegionCount = 1,
            InfoAgentCount = 2,
            InfoLinkCount = 3,
            InfoPolygonCount = 4,
            InfoEdgeCount = 5,
            InfoEdgeMergeCount = 6,
            InfoEdgeConnectionCount = 7,
            InfoEdgeFreeCount = 8,
            InfoObstacleCount = 9,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationServer2D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationServer2D extends __NameMapGObject {
        get_maps: "getMaps";
        map_create: "mapCreate";
        map_set_active: "mapSetActive";
        map_is_active: "mapIsActive";
        map_set_cell_size: "mapSetCellSize";
        map_get_cell_size: "mapGetCellSize";
        map_set_merge_rasterizer_cell_scale: "mapSetMergeRasterizerCellScale";
        map_get_merge_rasterizer_cell_scale: "mapGetMergeRasterizerCellScale";
        map_set_use_edge_connections: "mapSetUseEdgeConnections";
        map_get_use_edge_connections: "mapGetUseEdgeConnections";
        map_set_edge_connection_margin: "mapSetEdgeConnectionMargin";
        map_get_edge_connection_margin: "mapGetEdgeConnectionMargin";
        map_set_link_connection_radius: "mapSetLinkConnectionRadius";
        map_get_link_connection_radius: "mapGetLinkConnectionRadius";
        map_get_path: "mapGetPath";
        map_get_closest_point: "mapGetClosestPoint";
        map_get_closest_point_owner: "mapGetClosestPointOwner";
        map_get_links: "mapGetLinks";
        map_get_regions: "mapGetRegions";
        map_get_agents: "mapGetAgents";
        map_get_obstacles: "mapGetObstacles";
        map_force_update: "mapForceUpdate";
        map_get_iteration_id: "mapGetIterationId";
        map_set_use_async_iterations: "mapSetUseAsyncIterations";
        map_get_use_async_iterations: "mapGetUseAsyncIterations";
        map_get_random_point: "mapGetRandomPoint";
        query_path: "queryPath";
        region_create: "regionCreate";
        region_get_iteration_id: "regionGetIterationId";
        region_set_use_async_iterations: "regionSetUseAsyncIterations";
        region_get_use_async_iterations: "regionGetUseAsyncIterations";
        region_set_enabled: "regionSetEnabled";
        region_get_enabled: "regionGetEnabled";
        region_set_use_edge_connections: "regionSetUseEdgeConnections";
        region_get_use_edge_connections: "regionGetUseEdgeConnections";
        region_set_enter_cost: "regionSetEnterCost";
        region_get_enter_cost: "regionGetEnterCost";
        region_set_travel_cost: "regionSetTravelCost";
        region_get_travel_cost: "regionGetTravelCost";
        region_set_owner_id: "regionSetOwnerId";
        region_get_owner_id: "regionGetOwnerId";
        region_owns_point: "regionOwnsPoint";
        region_set_map: "regionSetMap";
        region_get_map: "regionGetMap";
        region_set_navigation_layers: "regionSetNavigationLayers";
        region_get_navigation_layers: "regionGetNavigationLayers";
        region_set_transform: "regionSetTransform";
        region_get_transform: "regionGetTransform";
        region_set_navigation_polygon: "regionSetNavigationPolygon";
        region_get_connections_count: "regionGetConnectionsCount";
        region_get_connection_pathway_start: "regionGetConnectionPathwayStart";
        region_get_connection_pathway_end: "regionGetConnectionPathwayEnd";
        region_get_closest_point: "regionGetClosestPoint";
        region_get_random_point: "regionGetRandomPoint";
        region_get_bounds: "regionGetBounds";
        link_create: "linkCreate";
        link_get_iteration_id: "linkGetIterationId";
        link_set_map: "linkSetMap";
        link_get_map: "linkGetMap";
        link_set_enabled: "linkSetEnabled";
        link_get_enabled: "linkGetEnabled";
        link_set_bidirectional: "linkSetBidirectional";
        link_is_bidirectional: "linkIsBidirectional";
        link_set_navigation_layers: "linkSetNavigationLayers";
        link_get_navigation_layers: "linkGetNavigationLayers";
        link_set_start_position: "linkSetStartPosition";
        link_get_start_position: "linkGetStartPosition";
        link_set_end_position: "linkSetEndPosition";
        link_get_end_position: "linkGetEndPosition";
        link_set_enter_cost: "linkSetEnterCost";
        link_get_enter_cost: "linkGetEnterCost";
        link_set_travel_cost: "linkSetTravelCost";
        link_get_travel_cost: "linkGetTravelCost";
        link_set_owner_id: "linkSetOwnerId";
        link_get_owner_id: "linkGetOwnerId";
        agent_create: "agentCreate";
        agent_set_avoidance_enabled: "agentSetAvoidanceEnabled";
        agent_get_avoidance_enabled: "agentGetAvoidanceEnabled";
        agent_set_map: "agentSetMap";
        agent_get_map: "agentGetMap";
        agent_set_paused: "agentSetPaused";
        agent_get_paused: "agentGetPaused";
        agent_set_neighbor_distance: "agentSetNeighborDistance";
        agent_get_neighbor_distance: "agentGetNeighborDistance";
        agent_set_max_neighbors: "agentSetMaxNeighbors";
        agent_get_max_neighbors: "agentGetMaxNeighbors";
        agent_set_time_horizon_agents: "agentSetTimeHorizonAgents";
        agent_get_time_horizon_agents: "agentGetTimeHorizonAgents";
        agent_set_time_horizon_obstacles: "agentSetTimeHorizonObstacles";
        agent_get_time_horizon_obstacles: "agentGetTimeHorizonObstacles";
        agent_set_radius: "agentSetRadius";
        agent_get_radius: "agentGetRadius";
        agent_set_max_speed: "agentSetMaxSpeed";
        agent_get_max_speed: "agentGetMaxSpeed";
        agent_set_velocity_forced: "agentSetVelocityForced";
        agent_set_velocity: "agentSetVelocity";
        agent_get_velocity: "agentGetVelocity";
        agent_set_position: "agentSetPosition";
        agent_get_position: "agentGetPosition";
        agent_is_map_changed: "agentIsMapChanged";
        agent_set_avoidance_callback: "agentSetAvoidanceCallback";
        agent_has_avoidance_callback: "agentHasAvoidanceCallback";
        agent_set_avoidance_layers: "agentSetAvoidanceLayers";
        agent_get_avoidance_layers: "agentGetAvoidanceLayers";
        agent_set_avoidance_mask: "agentSetAvoidanceMask";
        agent_get_avoidance_mask: "agentGetAvoidanceMask";
        agent_set_avoidance_priority: "agentSetAvoidancePriority";
        agent_get_avoidance_priority: "agentGetAvoidancePriority";
        obstacle_create: "obstacleCreate";
        obstacle_set_avoidance_enabled: "obstacleSetAvoidanceEnabled";
        obstacle_get_avoidance_enabled: "obstacleGetAvoidanceEnabled";
        obstacle_set_map: "obstacleSetMap";
        obstacle_get_map: "obstacleGetMap";
        obstacle_set_paused: "obstacleSetPaused";
        obstacle_get_paused: "obstacleGetPaused";
        obstacle_set_radius: "obstacleSetRadius";
        obstacle_get_radius: "obstacleGetRadius";
        obstacle_set_velocity: "obstacleSetVelocity";
        obstacle_get_velocity: "obstacleGetVelocity";
        obstacle_set_position: "obstacleSetPosition";
        obstacle_get_position: "obstacleGetPosition";
        obstacle_set_vertices: "obstacleSetVertices";
        obstacle_get_vertices: "obstacleGetVertices";
        obstacle_set_avoidance_layers: "obstacleSetAvoidanceLayers";
        obstacle_get_avoidance_layers: "obstacleGetAvoidanceLayers";
        parse_source_geometry_data: "parseSourceGeometryData";
        bake_from_source_geometry_data: "bakeFromSourceGeometryData";
        bake_from_source_geometry_data_async: "bakeFromSourceGeometryDataAsync";
        is_baking_navigation_polygon: "isBakingNavigationPolygon";
        source_geometry_parser_create: "sourceGeometryParserCreate";
        source_geometry_parser_set_callback: "sourceGeometryParserSetCallback";
        simplify_path: "simplifyPath";
        free_rid: "freeRid";
        set_active: "setActive";
        set_debug_enabled: "setDebugEnabled";
        get_debug_enabled: "getDebugEnabled";
        get_process_info: "getProcessInfo";
        map_changed: "mapChanged";
        navigation_debug_changed: "navigationDebugChanged";
        avoidance_debug_changed: "avoidanceDebugChanged";
    }
    /** A server interface for low-level 2D navigation access.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationserver2d.html  
     */
    class NavigationServer2D extends GObject {
        /** Returns all created navigation map [RID]s on the NavigationServer. This returns both 2D and 3D created navigation maps as there is technically no distinction between them. */
        static getMaps(): GArray<Rid>
        
        /** Create a new map. */
        static mapCreate(): Rid
        
        /** Sets the map active. */
        static mapSetActive(map: Rid, active: boolean): void
        
        /** Returns `true` if the map is active. */
        static mapIsActive(map: Rid): boolean
        
        /** Sets the map cell size used to rasterize the navigation mesh vertices. Must match with the cell size of the used navigation meshes. */
        static mapSetCellSize(map: Rid, cellSize: float64): void
        
        /** Returns the map cell size used to rasterize the navigation mesh vertices. */
        static mapGetCellSize(map: Rid): float64
        
        /** Set the map's internal merge rasterizer cell scale used to control merging sensitivity. */
        static mapSetMergeRasterizerCellScale(map: Rid, scale: float64): void
        
        /** Returns the map's internal merge rasterizer cell scale. */
        static mapGetMergeRasterizerCellScale(map: Rid): float64
        
        /** Set the navigation [param map] edge connection use. If [param enabled] is `true`, the navigation map allows navigation regions to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static mapSetUseEdgeConnections(map: Rid, enabled: boolean): void
        
        /** Returns whether the navigation [param map] allows navigation regions to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static mapGetUseEdgeConnections(map: Rid): boolean
        
        /** Set the map edge connection margin used to weld the compatible region edges. */
        static mapSetEdgeConnectionMargin(map: Rid, margin: float64): void
        
        /** Returns the edge connection margin of the map. The edge connection margin is a distance used to connect two regions. */
        static mapGetEdgeConnectionMargin(map: Rid): float64
        
        /** Set the map's link connection radius used to connect links to navigation polygons. */
        static mapSetLinkConnectionRadius(map: Rid, radius: float64): void
        
        /** Returns the link connection radius of the map. This distance is the maximum range any link will search for navigation mesh polygons to connect to. */
        static mapGetLinkConnectionRadius(map: Rid): float64
        
        /** Returns the navigation path to reach the destination from the origin. [param navigation_layers] is a bitmask of all region navigation layers that are allowed to be in the path. */
        static mapGetPath(map: Rid, origin: Vector2, destination: Vector2, optimize: boolean, navigationLayers?: int64 /* = 1 */): PackedVector2Array
        
        /** Returns the navigation mesh surface point closest to the provided [param to_point] on the navigation [param map]. */
        static mapGetClosestPoint(map: Rid, toPoint: Vector2): Vector2
        
        /** Returns the owner region RID for the navigation mesh surface point closest to the provided [param to_point] on the navigation [param map]. */
        static mapGetClosestPointOwner(map: Rid, toPoint: Vector2): Rid
        
        /** Returns all navigation link [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetLinks(map: Rid): GArray<Rid>
        
        /** Returns all navigation region [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetRegions(map: Rid): GArray<Rid>
        
        /** Returns all navigation agent [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetAgents(map: Rid): GArray<Rid>
        
        /** Returns all navigation obstacle [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetObstacles(map: Rid): GArray<Rid>
        
        /** This function immediately forces synchronization of the specified navigation [param map] [RID]. By default navigation maps are only synchronized at the end of each physics frame. This function can be used to immediately (re)calculate all the navigation meshes and region connections of the navigation map. This makes it possible to query a navigation path for a changed map immediately and in the same frame (multiple times if needed).  
         *  Due to technical restrictions the current NavigationServer command queue will be flushed. This means all already queued update commands for this physics frame will be executed, even those intended for other maps, regions, and agents not part of the specified map. The expensive computation of the navigation meshes and region connections of a map will only be done for the specified map. Other maps will receive the normal synchronization at the end of the physics frame. Should the specified map receive changes after the forced update it will update again as well when the other maps receive their update.  
         *  Avoidance processing and dispatch of the `safe_velocity` signals is unaffected by this function and continues to happen for all maps and agents at the end of the physics frame.  
         *      
         *  **Note:** With great power comes great responsibility. This function should only be used by users that really know what they are doing and have a good reason for it. Forcing an immediate update of a navigation map requires locking the NavigationServer and flushing the entire NavigationServer command queue. Not only can this severely impact the performance of a game but it can also introduce bugs if used inappropriately without much foresight.  
         */
        static mapForceUpdate(map: Rid): void
        
        /** Returns the current iteration id of the navigation map. Every time the navigation map changes and synchronizes the iteration id increases. An iteration id of 0 means the navigation map has never synchronized.  
         *      
         *  **Note:** The iteration id will wrap back to 1 after reaching its range limit.  
         */
        static mapGetIterationId(map: Rid): int64
        
        /** If [param enabled] is `true` the [param map] synchronization uses an async process that runs on a background thread. */
        static mapSetUseAsyncIterations(map: Rid, enabled: boolean): void
        
        /** Returns `true` if the [param map] synchronization uses an async process that runs on a background thread. */
        static mapGetUseAsyncIterations(map: Rid): boolean
        
        /** Returns a random position picked from all map region polygons with matching [param navigation_layers].  
         *  If [param uniformly] is `true`, all map regions, polygons, and faces are weighted by their surface area (slower).  
         *  If [param uniformly] is `false`, just a random region and a random polygon are picked (faster).  
         */
        static mapGetRandomPoint(map: Rid, navigationLayers: int64, uniformly: boolean): Vector2
        
        /** Queries a path in a given navigation map. Start and target position and other parameters are defined through [NavigationPathQueryParameters2D]. Updates the provided [NavigationPathQueryResult2D] result object with the path among other results requested by the query. After the process is finished the optional [param callback] will be called. */
        static queryPath(parameters: NavigationPathQueryParameters2D, result: NavigationPathQueryResult2D, callback?: Callable /* = new Callable() */): void
        
        /** Creates a new region. */
        static regionCreate(): Rid
        
        /** Returns the current iteration ID of the navigation region. Every time the navigation region changes and synchronizes, the iteration ID increases. An iteration ID of `0` means the navigation region has never synchronized.  
         *      
         *  **Note:** The iteration ID will wrap around to `1` after reaching its range limit.  
         */
        static regionGetIterationId(region: Rid): int64
        
        /** If [param enabled] is `true` the [param region] uses an async synchronization process that runs on a background thread. */
        static regionSetUseAsyncIterations(region: Rid, enabled: boolean): void
        
        /** Returns `true` if the [param region] uses an async synchronization process that runs on a background thread. */
        static regionGetUseAsyncIterations(region: Rid): boolean
        
        /** If [param enabled] is `true` the specified [param region] will contribute to its current navigation map. */
        static regionSetEnabled(region: Rid, enabled: boolean): void
        
        /** Returns `true` if the specified [param region] is enabled. */
        static regionGetEnabled(region: Rid): boolean
        
        /** If [param enabled] is `true`, the navigation [param region] will use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static regionSetUseEdgeConnections(region: Rid, enabled: boolean): void
        
        /** Returns whether the navigation [param region] is set to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static regionGetUseEdgeConnections(region: Rid): boolean
        
        /** Sets the [param enter_cost] for this [param region]. */
        static regionSetEnterCost(region: Rid, enterCost: float64): void
        
        /** Returns the enter cost of this [param region]. */
        static regionGetEnterCost(region: Rid): float64
        
        /** Sets the [param travel_cost] for this [param region]. */
        static regionSetTravelCost(region: Rid, travelCost: float64): void
        
        /** Returns the travel cost of this [param region]. */
        static regionGetTravelCost(region: Rid): float64
        
        /** Set the `ObjectID` of the object which manages this region. */
        static regionSetOwnerId(region: Rid, ownerId: int64): void
        
        /** Returns the `ObjectID` of the object which manages this region. */
        static regionGetOwnerId(region: Rid): int64
        
        /** Returns `true` if the provided [param point] in world space is currently owned by the provided navigation [param region]. Owned in this context means that one of the region's navigation mesh polygon faces has a possible position at the closest distance to this point compared to all other navigation meshes from other navigation regions that are also registered on the navigation map of the provided region.  
         *  If multiple navigation meshes have positions at equal distance the navigation region whose polygons are processed first wins the ownership. Polygons are processed in the same order that navigation regions were registered on the NavigationServer.  
         *      
         *  **Note:** If navigation meshes from different navigation regions overlap (which should be avoided in general) the result might not be what is expected.  
         */
        static regionOwnsPoint(region: Rid, point: Vector2): boolean
        
        /** Sets the map for the region. */
        static regionSetMap(region: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param region] is currently assigned to. */
        static regionGetMap(region: Rid): Rid
        
        /** Set the region's navigation layers. This allows selecting regions from a path request (when using [method NavigationServer2D.map_get_path]). */
        static regionSetNavigationLayers(region: Rid, navigationLayers: int64): void
        
        /** Returns the region's navigation layers. */
        static regionGetNavigationLayers(region: Rid): int64
        
        /** Sets the global transformation for the region. */
        static regionSetTransform(region: Rid, transform: Transform2D): void
        
        /** Returns the global transformation of this [param region]. */
        static regionGetTransform(region: Rid): Transform2D
        
        /** Sets the [param navigation_polygon] for the region. */
        static regionSetNavigationPolygon(region: Rid, navigationPolygon: NavigationPolygon): void
        
        /** Returns how many connections this [param region] has with other regions in the map. */
        static regionGetConnectionsCount(region: Rid): int64
        
        /** Returns the starting point of a connection door. [param connection] is an index between 0 and the return value of [method region_get_connections_count]. */
        static regionGetConnectionPathwayStart(region: Rid, connection: int64): Vector2
        
        /** Returns the ending point of a connection door. [param connection] is an index between 0 and the return value of [method region_get_connections_count]. */
        static regionGetConnectionPathwayEnd(region: Rid, connection: int64): Vector2
        
        /** Returns the navigation mesh surface point closest to the provided [param to_point] on the navigation [param region]. */
        static regionGetClosestPoint(region: Rid, toPoint: Vector2): Vector2
        
        /** Returns a random position picked from all region polygons with matching [param navigation_layers].  
         *  If [param uniformly] is `true`, all region polygons and faces are weighted by their surface area (slower).  
         *  If [param uniformly] is `false`, just a random polygon and face is picked (faster).  
         */
        static regionGetRandomPoint(region: Rid, navigationLayers: int64, uniformly: boolean): Vector2
        
        /** Returns the axis-aligned rectangle for the [param region]'s transformed navigation mesh. */
        static regionGetBounds(region: Rid): Rect2
        
        /** Create a new link between two positions on a map. */
        static linkCreate(): Rid
        
        /** Returns the current iteration ID of the navigation link. Every time the navigation link changes and synchronizes, the iteration ID increases. An iteration ID of `0` means the navigation link has never synchronized.  
         *      
         *  **Note:** The iteration ID will wrap around to `1` after reaching its range limit.  
         */
        static linkGetIterationId(link: Rid): int64
        
        /** Sets the navigation map [RID] for the link. */
        static linkSetMap(link: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param link] is currently assigned to. */
        static linkGetMap(link: Rid): Rid
        
        /** If [param enabled] is `true`, the specified [param link] will contribute to its current navigation map. */
        static linkSetEnabled(link: Rid, enabled: boolean): void
        
        /** Returns `true` if the specified [param link] is enabled. */
        static linkGetEnabled(link: Rid): boolean
        
        /** Sets whether this [param link] can be travelled in both directions. */
        static linkSetBidirectional(link: Rid, bidirectional: boolean): void
        
        /** Returns whether this [param link] can be travelled in both directions. */
        static linkIsBidirectional(link: Rid): boolean
        
        /** Sets the given [param link]'s navigation layers to [param navigation_layers]. This allows selecting links from a path request (when using [method NavigationServer2D.map_get_path]). */
        static linkSetNavigationLayers(link: Rid, navigationLayers: int64): void
        
        /** Returns the navigation layers for this [param link]. */
        static linkGetNavigationLayers(link: Rid): int64
        
        /** Sets the entry position for this [param link]. */
        static linkSetStartPosition(link: Rid, position: Vector2): void
        
        /** Returns the starting position of this [param link]. */
        static linkGetStartPosition(link: Rid): Vector2
        
        /** Sets the exit position for the [param link]. */
        static linkSetEndPosition(link: Rid, position: Vector2): void
        
        /** Returns the ending position of this [param link]. */
        static linkGetEndPosition(link: Rid): Vector2
        
        /** Sets the [param enter_cost] for this [param link]. */
        static linkSetEnterCost(link: Rid, enterCost: float64): void
        
        /** Returns the enter cost of this [param link]. */
        static linkGetEnterCost(link: Rid): float64
        
        /** Sets the [param travel_cost] for this [param link]. */
        static linkSetTravelCost(link: Rid, travelCost: float64): void
        
        /** Returns the travel cost of this [param link]. */
        static linkGetTravelCost(link: Rid): float64
        
        /** Set the `ObjectID` of the object which manages this link. */
        static linkSetOwnerId(link: Rid, ownerId: int64): void
        
        /** Returns the `ObjectID` of the object which manages this link. */
        static linkGetOwnerId(link: Rid): int64
        
        /** Creates the agent. */
        static agentCreate(): Rid
        
        /** If [param enabled] is `true`, the specified [param agent] uses avoidance. */
        static agentSetAvoidanceEnabled(agent: Rid, enabled: boolean): void
        
        /** Return `true` if the specified [param agent] uses avoidance. */
        static agentGetAvoidanceEnabled(agent: Rid): boolean
        
        /** Puts the agent in the map. */
        static agentSetMap(agent: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param agent] is currently assigned to. */
        static agentGetMap(agent: Rid): Rid
        
        /** If [param paused] is `true` the specified [param agent] will not be processed. For example, it will not calculate avoidance velocities or receive avoidance callbacks. */
        static agentSetPaused(agent: Rid, paused: boolean): void
        
        /** Returns `true` if the specified [param agent] is paused. */
        static agentGetPaused(agent: Rid): boolean
        
        /** Sets the maximum distance to other agents this agent takes into account in the navigation. The larger this number, the longer the running time of the simulation. If the number is too low, the simulation will not be safe. */
        static agentSetNeighborDistance(agent: Rid, distance: float64): void
        
        /** Returns the maximum distance to other agents the specified [param agent] takes into account in the navigation. */
        static agentGetNeighborDistance(agent: Rid): float64
        
        /** Sets the maximum number of other agents the agent takes into account in the navigation. The larger this number, the longer the running time of the simulation. If the number is too low, the simulation will not be safe. */
        static agentSetMaxNeighbors(agent: Rid, count: int64): void
        
        /** Returns the maximum number of other agents the specified [param agent] takes into account in the navigation. */
        static agentGetMaxNeighbors(agent: Rid): int64
        
        /** The minimal amount of time for which the agent's velocities that are computed by the simulation are safe with respect to other agents. The larger this number, the sooner this agent will respond to the presence of other agents, but the less freedom this agent has in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        static agentSetTimeHorizonAgents(agent: Rid, timeHorizon: float64): void
        
        /** Returns the minimal amount of time for which the specified [param agent]'s velocities that are computed by the simulation are safe with respect to other agents. */
        static agentGetTimeHorizonAgents(agent: Rid): float64
        
        /** The minimal amount of time for which the agent's velocities that are computed by the simulation are safe with respect to static avoidance obstacles. The larger this number, the sooner this agent will respond to the presence of static avoidance obstacles, but the less freedom this agent has in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        static agentSetTimeHorizonObstacles(agent: Rid, timeHorizon: float64): void
        
        /** Returns the minimal amount of time for which the specified [param agent]'s velocities that are computed by the simulation are safe with respect to static avoidance obstacles. */
        static agentGetTimeHorizonObstacles(agent: Rid): float64
        
        /** Sets the radius of the agent. */
        static agentSetRadius(agent: Rid, radius: float64): void
        
        /** Returns the radius of the specified [param agent]. */
        static agentGetRadius(agent: Rid): float64
        
        /** Sets the maximum speed of the agent. Must be positive. */
        static agentSetMaxSpeed(agent: Rid, maxSpeed: float64): void
        
        /** Returns the maximum speed of the specified [param agent]. */
        static agentGetMaxSpeed(agent: Rid): float64
        
        /** Replaces the internal velocity in the collision avoidance simulation with [param velocity] for the specified [param agent]. When an agent is teleported to a new position far away this function should be used in the same frame. If called frequently this function can get agents stuck. */
        static agentSetVelocityForced(agent: Rid, velocity: Vector2): void
        
        /** Sets [param velocity] as the new wanted velocity for the specified [param agent]. The avoidance simulation will try to achieve this velocity if possible, but will adjust it to avoid colliding with other agents and obstacles. When an agent is teleported to a new position far away, use [method agent_set_velocity_forced] instead to reset the internal velocity state. */
        static agentSetVelocity(agent: Rid, velocity: Vector2): void
        
        /** Returns the velocity of the specified [param agent]. */
        static agentGetVelocity(agent: Rid): Vector2
        
        /** Sets the position of the agent in world space. */
        static agentSetPosition(agent: Rid, position: Vector2): void
        
        /** Returns the position of the specified [param agent] in world space. */
        static agentGetPosition(agent: Rid): Vector2
        
        /** Returns `true` if the map got changed the previous frame. */
        static agentIsMapChanged(agent: Rid): boolean
        
        /** Sets the callback [Callable] that gets called after each avoidance processing step for the [param agent]. The calculated `safe_velocity` will be dispatched with a signal to the object just before the physics calculations.  
         *      
         *  **Note:** Created callbacks are always processed independently of the SceneTree state as long as the agent is on a navigation map and not freed. To disable the dispatch of a callback from an agent use [method agent_set_avoidance_callback] again with an empty [Callable].  
         */
        static agentSetAvoidanceCallback(agent: Rid, callback: Callable): void
        
        /** Return `true` if the specified [param agent] has an avoidance callback. */
        static agentHasAvoidanceCallback(agent: Rid): boolean
        
        /** Set the agent's `avoidance_layers` bitmask. */
        static agentSetAvoidanceLayers(agent: Rid, layers: int64): void
        
        /** Returns the `avoidance_layers` bitmask of the specified [param agent]. */
        static agentGetAvoidanceLayers(agent: Rid): int64
        
        /** Set the agent's `avoidance_mask` bitmask. */
        static agentSetAvoidanceMask(agent: Rid, mask: int64): void
        
        /** Returns the `avoidance_mask` bitmask of the specified [param agent]. */
        static agentGetAvoidanceMask(agent: Rid): int64
        
        /** Set the agent's `avoidance_priority` with a [param priority] between 0.0 (lowest priority) to 1.0 (highest priority).  
         *  The specified [param agent] does not adjust the velocity for other agents that would match the `avoidance_mask` but have a lower `avoidance_priority`. This in turn makes the other agents with lower priority adjust their velocities even more to avoid collision with this agent.  
         */
        static agentSetAvoidancePriority(agent: Rid, priority: float64): void
        
        /** Returns the `avoidance_priority` of the specified [param agent]. */
        static agentGetAvoidancePriority(agent: Rid): float64
        
        /** Creates a new navigation obstacle. */
        static obstacleCreate(): Rid
        
        /** If [param enabled] is `true`, the provided [param obstacle] affects avoidance using agents. */
        static obstacleSetAvoidanceEnabled(obstacle: Rid, enabled: boolean): void
        
        /** Returns `true` if the provided [param obstacle] has avoidance enabled. */
        static obstacleGetAvoidanceEnabled(obstacle: Rid): boolean
        
        /** Sets the navigation map [RID] for the obstacle. */
        static obstacleSetMap(obstacle: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param obstacle] is currently assigned to. */
        static obstacleGetMap(obstacle: Rid): Rid
        
        /** If [param paused] is `true` the specified [param obstacle] will not be processed. For example, it will no longer affect avoidance velocities. */
        static obstacleSetPaused(obstacle: Rid, paused: boolean): void
        
        /** Returns `true` if the specified [param obstacle] is paused. */
        static obstacleGetPaused(obstacle: Rid): boolean
        
        /** Sets the radius of the dynamic obstacle. */
        static obstacleSetRadius(obstacle: Rid, radius: float64): void
        
        /** Returns the radius of the specified dynamic [param obstacle]. */
        static obstacleGetRadius(obstacle: Rid): float64
        
        /** Sets [param velocity] of the dynamic [param obstacle]. Allows other agents to better predict the movement of the dynamic obstacle. Only works in combination with the radius of the obstacle. */
        static obstacleSetVelocity(obstacle: Rid, velocity: Vector2): void
        
        /** Returns the velocity of the specified dynamic [param obstacle]. */
        static obstacleGetVelocity(obstacle: Rid): Vector2
        
        /** Sets the position of the obstacle in world space. */
        static obstacleSetPosition(obstacle: Rid, position: Vector2): void
        
        /** Returns the position of the specified [param obstacle] in world space. */
        static obstacleGetPosition(obstacle: Rid): Vector2
        
        /** Sets the outline vertices for the obstacle. If the vertices are winded in clockwise order agents will be pushed in by the obstacle, else they will be pushed out. */
        static obstacleSetVertices(obstacle: Rid, vertices: PackedVector2Array | Vector2[]): void
        
        /** Returns the outline vertices for the specified [param obstacle]. */
        static obstacleGetVertices(obstacle: Rid): PackedVector2Array
        
        /** Sets the given [param obstacle]'s avoidance layers to [param layers]. */
        static obstacleSetAvoidanceLayers(obstacle: Rid, layers: int64): void
        
        /** Returns the `avoidance_layers` bitmask of the specified [param obstacle]. */
        static obstacleGetAvoidanceLayers(obstacle: Rid): int64
        
        /** Parses the [SceneTree] for source geometry according to the properties of [param navigation_polygon]. Updates the provided [param source_geometry_data] resource with the resulting data. The resource can then be used to bake a navigation mesh with [method bake_from_source_geometry_data]. After the process is finished the optional [param callback] will be called.  
         *      
         *  **Note:** This function needs to run on the main thread or with a deferred call as the SceneTree is not thread-safe.  
         *  **Performance:** While convenient, reading data arrays from [Mesh] resources can affect the frame rate negatively. The data needs to be received from the GPU, stalling the [RenderingServer] in the process. For performance prefer the use of e.g. collision shapes or creating the data arrays entirely in code.  
         */
        static parseSourceGeometryData(navigationPolygon: NavigationPolygon, sourceGeometryData: NavigationMeshSourceGeometryData2D, rootNode: Node, callback?: Callable /* = new Callable() */): void
        
        /** Bakes the provided [param navigation_polygon] with the data from the provided [param source_geometry_data]. After the process is finished the optional [param callback] will be called. */
        static bakeFromSourceGeometryData(navigationPolygon: NavigationPolygon, sourceGeometryData: NavigationMeshSourceGeometryData2D, callback?: Callable /* = new Callable() */): void
        
        /** Bakes the provided [param navigation_polygon] with the data from the provided [param source_geometry_data] as an async task running on a background thread. After the process is finished the optional [param callback] will be called. */
        static bakeFromSourceGeometryDataAsync(navigationPolygon: NavigationPolygon, sourceGeometryData: NavigationMeshSourceGeometryData2D, callback?: Callable /* = new Callable() */): void
        
        /** Returns `true` when the provided navigation polygon is being baked on a background thread. */
        static isBakingNavigationPolygon(navigationPolygon: NavigationPolygon): boolean
        
        /** Creates a new source geometry parser. If a [Callable] is set for the parser with [method source_geometry_parser_set_callback] the callback will be called for every single node that gets parsed whenever [method parse_source_geometry_data] is used. */
        static sourceGeometryParserCreate(): Rid
        
        /** Sets the [param callback] [Callable] for the specific source geometry [param parser]. The [Callable] will receive a call with the following parameters:  
         *  - `navigation_mesh` - The [NavigationPolygon] reference used to define the parse settings. Do NOT edit or add directly to the navigation mesh.  
         *  - `source_geometry_data` - The [NavigationMeshSourceGeometryData2D] reference. Add custom source geometry for navigation mesh baking to this object.  
         *  - `node` - The [Node] that is parsed.  
         */
        static sourceGeometryParserSetCallback(parser: Rid, callback: Callable): void
        
        /** Returns a simplified version of [param path] with less critical path points removed. The simplification amount is in world units and controlled by [param epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        static simplifyPath(path: PackedVector2Array | Vector2[], epsilon: float64): PackedVector2Array
        
        /** Destroys the given RID. */
        static freeRid(rid: Rid): void
        
        /** Control activation of this server. */
        static setActive(active: boolean): void
        
        /** If `true` enables debug mode on the NavigationServer. */
        static setDebugEnabled(enabled: boolean): void
        
        /** Returns `true` when the NavigationServer has debug enabled. */
        static getDebugEnabled(): boolean
        
        /** Returns information about the current state of the NavigationServer. */
        static getProcessInfo(processInfo: NavigationServer2D.ProcessInfo): int64
        
        /** Emitted when a navigation map is updated, when a region moves or is modified. */
        static readonly mapChanged: Signal<(map: Rid) => void>
        
        /** Emitted when navigation debug settings are changed. Only available in debug builds. */
        static readonly navigationDebugChanged: Signal<() => void>
        
        /** Emitted when avoidance debug settings are changed. Only available in debug builds. */
        static readonly avoidanceDebugChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationServer2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationServer2D;
    }
    // _singleton_class_: NavigationServer3D
    namespace NavigationServer3D {
        enum ProcessInfo {
            InfoActiveMaps = 0,
            InfoRegionCount = 1,
            InfoAgentCount = 2,
            InfoLinkCount = 3,
            InfoPolygonCount = 4,
            InfoEdgeCount = 5,
            InfoEdgeMergeCount = 6,
            InfoEdgeConnectionCount = 7,
            InfoEdgeFreeCount = 8,
            InfoObstacleCount = 9,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationServer3D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationServer3D extends __NameMapGObject {
        get_maps: "getMaps";
        map_create: "mapCreate";
        map_set_active: "mapSetActive";
        map_is_active: "mapIsActive";
        map_set_up: "mapSetUp";
        map_get_up: "mapGetUp";
        map_set_cell_size: "mapSetCellSize";
        map_get_cell_size: "mapGetCellSize";
        map_set_cell_height: "mapSetCellHeight";
        map_get_cell_height: "mapGetCellHeight";
        map_set_merge_rasterizer_cell_scale: "mapSetMergeRasterizerCellScale";
        map_get_merge_rasterizer_cell_scale: "mapGetMergeRasterizerCellScale";
        map_set_use_edge_connections: "mapSetUseEdgeConnections";
        map_get_use_edge_connections: "mapGetUseEdgeConnections";
        map_set_edge_connection_margin: "mapSetEdgeConnectionMargin";
        map_get_edge_connection_margin: "mapGetEdgeConnectionMargin";
        map_set_link_connection_radius: "mapSetLinkConnectionRadius";
        map_get_link_connection_radius: "mapGetLinkConnectionRadius";
        map_get_path: "mapGetPath";
        map_get_closest_point_to_segment: "mapGetClosestPointToSegment";
        map_get_closest_point: "mapGetClosestPoint";
        map_get_closest_point_normal: "mapGetClosestPointNormal";
        map_get_closest_point_owner: "mapGetClosestPointOwner";
        map_get_links: "mapGetLinks";
        map_get_regions: "mapGetRegions";
        map_get_agents: "mapGetAgents";
        map_get_obstacles: "mapGetObstacles";
        map_force_update: "mapForceUpdate";
        map_get_iteration_id: "mapGetIterationId";
        map_set_use_async_iterations: "mapSetUseAsyncIterations";
        map_get_use_async_iterations: "mapGetUseAsyncIterations";
        map_get_random_point: "mapGetRandomPoint";
        query_path: "queryPath";
        region_create: "regionCreate";
        region_get_iteration_id: "regionGetIterationId";
        region_set_use_async_iterations: "regionSetUseAsyncIterations";
        region_get_use_async_iterations: "regionGetUseAsyncIterations";
        region_set_enabled: "regionSetEnabled";
        region_get_enabled: "regionGetEnabled";
        region_set_use_edge_connections: "regionSetUseEdgeConnections";
        region_get_use_edge_connections: "regionGetUseEdgeConnections";
        region_set_enter_cost: "regionSetEnterCost";
        region_get_enter_cost: "regionGetEnterCost";
        region_set_travel_cost: "regionSetTravelCost";
        region_get_travel_cost: "regionGetTravelCost";
        region_set_owner_id: "regionSetOwnerId";
        region_get_owner_id: "regionGetOwnerId";
        region_owns_point: "regionOwnsPoint";
        region_set_map: "regionSetMap";
        region_get_map: "regionGetMap";
        region_set_navigation_layers: "regionSetNavigationLayers";
        region_get_navigation_layers: "regionGetNavigationLayers";
        region_set_transform: "regionSetTransform";
        region_get_transform: "regionGetTransform";
        region_set_navigation_mesh: "regionSetNavigationMesh";
        region_bake_navigation_mesh: "regionBakeNavigationMesh";
        region_get_connections_count: "regionGetConnectionsCount";
        region_get_connection_pathway_start: "regionGetConnectionPathwayStart";
        region_get_connection_pathway_end: "regionGetConnectionPathwayEnd";
        region_get_closest_point_to_segment: "regionGetClosestPointToSegment";
        region_get_closest_point: "regionGetClosestPoint";
        region_get_closest_point_normal: "regionGetClosestPointNormal";
        region_get_random_point: "regionGetRandomPoint";
        region_get_bounds: "regionGetBounds";
        link_create: "linkCreate";
        link_get_iteration_id: "linkGetIterationId";
        link_set_map: "linkSetMap";
        link_get_map: "linkGetMap";
        link_set_enabled: "linkSetEnabled";
        link_get_enabled: "linkGetEnabled";
        link_set_bidirectional: "linkSetBidirectional";
        link_is_bidirectional: "linkIsBidirectional";
        link_set_navigation_layers: "linkSetNavigationLayers";
        link_get_navigation_layers: "linkGetNavigationLayers";
        link_set_start_position: "linkSetStartPosition";
        link_get_start_position: "linkGetStartPosition";
        link_set_end_position: "linkSetEndPosition";
        link_get_end_position: "linkGetEndPosition";
        link_set_enter_cost: "linkSetEnterCost";
        link_get_enter_cost: "linkGetEnterCost";
        link_set_travel_cost: "linkSetTravelCost";
        link_get_travel_cost: "linkGetTravelCost";
        link_set_owner_id: "linkSetOwnerId";
        link_get_owner_id: "linkGetOwnerId";
        agent_create: "agentCreate";
        agent_set_avoidance_enabled: "agentSetAvoidanceEnabled";
        agent_get_avoidance_enabled: "agentGetAvoidanceEnabled";
        agent_set_use_3d_avoidance: "agentSetUse3DAvoidance";
        agent_get_use_3d_avoidance: "agentGetUse3DAvoidance";
        agent_set_map: "agentSetMap";
        agent_get_map: "agentGetMap";
        agent_set_paused: "agentSetPaused";
        agent_get_paused: "agentGetPaused";
        agent_set_neighbor_distance: "agentSetNeighborDistance";
        agent_get_neighbor_distance: "agentGetNeighborDistance";
        agent_set_max_neighbors: "agentSetMaxNeighbors";
        agent_get_max_neighbors: "agentGetMaxNeighbors";
        agent_set_time_horizon_agents: "agentSetTimeHorizonAgents";
        agent_get_time_horizon_agents: "agentGetTimeHorizonAgents";
        agent_set_time_horizon_obstacles: "agentSetTimeHorizonObstacles";
        agent_get_time_horizon_obstacles: "agentGetTimeHorizonObstacles";
        agent_set_radius: "agentSetRadius";
        agent_get_radius: "agentGetRadius";
        agent_set_height: "agentSetHeight";
        agent_get_height: "agentGetHeight";
        agent_set_max_speed: "agentSetMaxSpeed";
        agent_get_max_speed: "agentGetMaxSpeed";
        agent_set_velocity_forced: "agentSetVelocityForced";
        agent_set_velocity: "agentSetVelocity";
        agent_get_velocity: "agentGetVelocity";
        agent_set_position: "agentSetPosition";
        agent_get_position: "agentGetPosition";
        agent_is_map_changed: "agentIsMapChanged";
        agent_set_avoidance_callback: "agentSetAvoidanceCallback";
        agent_has_avoidance_callback: "agentHasAvoidanceCallback";
        agent_set_avoidance_layers: "agentSetAvoidanceLayers";
        agent_get_avoidance_layers: "agentGetAvoidanceLayers";
        agent_set_avoidance_mask: "agentSetAvoidanceMask";
        agent_get_avoidance_mask: "agentGetAvoidanceMask";
        agent_set_avoidance_priority: "agentSetAvoidancePriority";
        agent_get_avoidance_priority: "agentGetAvoidancePriority";
        obstacle_create: "obstacleCreate";
        obstacle_set_avoidance_enabled: "obstacleSetAvoidanceEnabled";
        obstacle_get_avoidance_enabled: "obstacleGetAvoidanceEnabled";
        obstacle_set_use_3d_avoidance: "obstacleSetUse3DAvoidance";
        obstacle_get_use_3d_avoidance: "obstacleGetUse3DAvoidance";
        obstacle_set_map: "obstacleSetMap";
        obstacle_get_map: "obstacleGetMap";
        obstacle_set_paused: "obstacleSetPaused";
        obstacle_get_paused: "obstacleGetPaused";
        obstacle_set_radius: "obstacleSetRadius";
        obstacle_get_radius: "obstacleGetRadius";
        obstacle_set_height: "obstacleSetHeight";
        obstacle_get_height: "obstacleGetHeight";
        obstacle_set_velocity: "obstacleSetVelocity";
        obstacle_get_velocity: "obstacleGetVelocity";
        obstacle_set_position: "obstacleSetPosition";
        obstacle_get_position: "obstacleGetPosition";
        obstacle_set_vertices: "obstacleSetVertices";
        obstacle_get_vertices: "obstacleGetVertices";
        obstacle_set_avoidance_layers: "obstacleSetAvoidanceLayers";
        obstacle_get_avoidance_layers: "obstacleGetAvoidanceLayers";
        parse_source_geometry_data: "parseSourceGeometryData";
        bake_from_source_geometry_data: "bakeFromSourceGeometryData";
        bake_from_source_geometry_data_async: "bakeFromSourceGeometryDataAsync";
        is_baking_navigation_mesh: "isBakingNavigationMesh";
        source_geometry_parser_create: "sourceGeometryParserCreate";
        source_geometry_parser_set_callback: "sourceGeometryParserSetCallback";
        simplify_path: "simplifyPath";
        free_rid: "freeRid";
        set_active: "setActive";
        set_debug_enabled: "setDebugEnabled";
        get_debug_enabled: "getDebugEnabled";
        get_process_info: "getProcessInfo";
        map_changed: "mapChanged";
        navigation_debug_changed: "navigationDebugChanged";
        avoidance_debug_changed: "avoidanceDebugChanged";
    }
    /** A server interface for low-level 3D navigation access.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationserver3d.html  
     */
    class NavigationServer3D extends GObject {
        /** Returns all created navigation map [RID]s on the NavigationServer. This returns both 2D and 3D created navigation maps as there is technically no distinction between them. */
        static getMaps(): GArray<Rid>
        
        /** Create a new map. */
        static mapCreate(): Rid
        
        /** Sets the map active. */
        static mapSetActive(map: Rid, active: boolean): void
        
        /** Returns `true` if the map is active. */
        static mapIsActive(map: Rid): boolean
        
        /** Sets the map up direction. */
        static mapSetUp(map: Rid, up: Vector3): void
        
        /** Returns the map's up direction. */
        static mapGetUp(map: Rid): Vector3
        
        /** Sets the map cell size used to rasterize the navigation mesh vertices on the XZ plane. Must match with the cell size of the used navigation meshes. */
        static mapSetCellSize(map: Rid, cellSize: float64): void
        
        /** Returns the map cell size used to rasterize the navigation mesh vertices on the XZ plane. */
        static mapGetCellSize(map: Rid): float64
        
        /** Sets the map cell height used to rasterize the navigation mesh vertices on the Y axis. Must match with the cell height of the used navigation meshes. */
        static mapSetCellHeight(map: Rid, cellHeight: float64): void
        
        /** Returns the map cell height used to rasterize the navigation mesh vertices on the Y axis. */
        static mapGetCellHeight(map: Rid): float64
        
        /** Set the map's internal merge rasterizer cell scale used to control merging sensitivity. */
        static mapSetMergeRasterizerCellScale(map: Rid, scale: float64): void
        
        /** Returns the map's internal merge rasterizer cell scale. */
        static mapGetMergeRasterizerCellScale(map: Rid): float64
        
        /** Set the navigation [param map] edge connection use. If [param enabled] is `true`, the navigation map allows navigation regions to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static mapSetUseEdgeConnections(map: Rid, enabled: boolean): void
        
        /** Returns `true` if the navigation [param map] allows navigation regions to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static mapGetUseEdgeConnections(map: Rid): boolean
        
        /** Set the map edge connection margin used to weld the compatible region edges. */
        static mapSetEdgeConnectionMargin(map: Rid, margin: float64): void
        
        /** Returns the edge connection margin of the map. This distance is the minimum vertex distance needed to connect two edges from different regions. */
        static mapGetEdgeConnectionMargin(map: Rid): float64
        
        /** Set the map's link connection radius used to connect links to navigation polygons. */
        static mapSetLinkConnectionRadius(map: Rid, radius: float64): void
        
        /** Returns the link connection radius of the map. This distance is the maximum range any link will search for navigation mesh polygons to connect to. */
        static mapGetLinkConnectionRadius(map: Rid): float64
        
        /** Returns the navigation path to reach the destination from the origin. [param navigation_layers] is a bitmask of all region navigation layers that are allowed to be in the path. */
        static mapGetPath(map: Rid, origin: Vector3, destination: Vector3, optimize: boolean, navigationLayers?: int64 /* = 1 */): PackedVector3Array
        
        /** Returns the navigation mesh surface point closest to the provided [param start] and [param end] segment on the navigation [param map].  
         *  If [param use_collision] is `true`, a closest point test is only done when the segment intersects with the navigation mesh surface.  
         */
        static mapGetClosestPointToSegment(map: Rid, start: Vector3, end: Vector3, useCollision?: boolean /* = false */): Vector3
        
        /** Returns the navigation mesh surface point closest to the provided [param to_point] on the navigation [param map]. */
        static mapGetClosestPoint(map: Rid, toPoint: Vector3): Vector3
        
        /** Returns the navigation mesh surface normal closest to the provided [param to_point] on the navigation [param map]. */
        static mapGetClosestPointNormal(map: Rid, toPoint: Vector3): Vector3
        
        /** Returns the owner region RID for the navigation mesh surface point closest to the provided [param to_point] on the navigation [param map]. */
        static mapGetClosestPointOwner(map: Rid, toPoint: Vector3): Rid
        
        /** Returns all navigation link [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetLinks(map: Rid): GArray<Rid>
        
        /** Returns all navigation region [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetRegions(map: Rid): GArray<Rid>
        
        /** Returns all navigation agent [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetAgents(map: Rid): GArray<Rid>
        
        /** Returns all navigation obstacle [RID]s that are currently assigned to the requested navigation [param map]. */
        static mapGetObstacles(map: Rid): GArray<Rid>
        
        /** This function immediately forces synchronization of the specified navigation [param map] [RID]. By default navigation maps are only synchronized at the end of each physics frame. This function can be used to immediately (re)calculate all the navigation meshes and region connections of the navigation map. This makes it possible to query a navigation path for a changed map immediately and in the same frame (multiple times if needed).  
         *  Due to technical restrictions the current NavigationServer command queue will be flushed. This means all already queued update commands for this physics frame will be executed, even those intended for other maps, regions, and agents not part of the specified map. The expensive computation of the navigation meshes and region connections of a map will only be done for the specified map. Other maps will receive the normal synchronization at the end of the physics frame. Should the specified map receive changes after the forced update it will update again as well when the other maps receive their update.  
         *  Avoidance processing and dispatch of the `safe_velocity` signals is unaffected by this function and continues to happen for all maps and agents at the end of the physics frame.  
         *      
         *  **Note:** With great power comes great responsibility. This function should only be used by users that really know what they are doing and have a good reason for it. Forcing an immediate update of a navigation map requires locking the NavigationServer and flushing the entire NavigationServer command queue. Not only can this severely impact the performance of a game but it can also introduce bugs if used inappropriately without much foresight.  
         */
        static mapForceUpdate(map: Rid): void
        
        /** Returns the current iteration id of the navigation map. Every time the navigation map changes and synchronizes the iteration id increases. An iteration id of 0 means the navigation map has never synchronized.  
         *      
         *  **Note:** The iteration id will wrap back to 1 after reaching its range limit.  
         */
        static mapGetIterationId(map: Rid): int64
        
        /** If [param enabled] is `true` the [param map] synchronization uses an async process that runs on a background thread. */
        static mapSetUseAsyncIterations(map: Rid, enabled: boolean): void
        
        /** Returns `true` if the [param map] synchronization uses an async process that runs on a background thread. */
        static mapGetUseAsyncIterations(map: Rid): boolean
        
        /** Returns a random position picked from all map region polygons with matching [param navigation_layers].  
         *  If [param uniformly] is `true`, all map regions, polygons, and faces are weighted by their surface area (slower).  
         *  If [param uniformly] is `false`, just a random region and a random polygon are picked (faster).  
         */
        static mapGetRandomPoint(map: Rid, navigationLayers: int64, uniformly: boolean): Vector3
        
        /** Queries a path in a given navigation map. Start and target position and other parameters are defined through [NavigationPathQueryParameters3D]. Updates the provided [NavigationPathQueryResult3D] result object with the path among other results requested by the query. After the process is finished the optional [param callback] will be called. */
        static queryPath(parameters: NavigationPathQueryParameters3D, result: NavigationPathQueryResult3D, callback?: Callable /* = new Callable() */): void
        
        /** Creates a new region. */
        static regionCreate(): Rid
        
        /** Returns the current iteration ID of the navigation region. Every time the navigation region changes and synchronizes, the iteration ID increases. An iteration ID of `0` means the navigation region has never synchronized.  
         *      
         *  **Note:** The iteration ID will wrap around to `1` after reaching its range limit.  
         */
        static regionGetIterationId(region: Rid): int64
        
        /** If [param enabled] is `true` the [param region] uses an async synchronization process that runs on a background thread. */
        static regionSetUseAsyncIterations(region: Rid, enabled: boolean): void
        
        /** Returns `true` if the [param region] uses an async synchronization process that runs on a background thread. */
        static regionGetUseAsyncIterations(region: Rid): boolean
        
        /** If [param enabled] is `true`, the specified [param region] will contribute to its current navigation map. */
        static regionSetEnabled(region: Rid, enabled: boolean): void
        
        /** Returns `true` if the specified [param region] is enabled. */
        static regionGetEnabled(region: Rid): boolean
        
        /** If [param enabled] is `true`, the navigation [param region] will use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static regionSetUseEdgeConnections(region: Rid, enabled: boolean): void
        
        /** Returns `true` if the navigation [param region] is set to use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        static regionGetUseEdgeConnections(region: Rid): boolean
        
        /** Sets the [param enter_cost] for this [param region]. */
        static regionSetEnterCost(region: Rid, enterCost: float64): void
        
        /** Returns the enter cost of this [param region]. */
        static regionGetEnterCost(region: Rid): float64
        
        /** Sets the [param travel_cost] for this [param region]. */
        static regionSetTravelCost(region: Rid, travelCost: float64): void
        
        /** Returns the travel cost of this [param region]. */
        static regionGetTravelCost(region: Rid): float64
        
        /** Set the `ObjectID` of the object which manages this region. */
        static regionSetOwnerId(region: Rid, ownerId: int64): void
        
        /** Returns the `ObjectID` of the object which manages this region. */
        static regionGetOwnerId(region: Rid): int64
        
        /** Returns `true` if the provided [param point] in world space is currently owned by the provided navigation [param region]. Owned in this context means that one of the region's navigation mesh polygon faces has a possible position at the closest distance to this point compared to all other navigation meshes from other navigation regions that are also registered on the navigation map of the provided region.  
         *  If multiple navigation meshes have positions at equal distance the navigation region whose polygons are processed first wins the ownership. Polygons are processed in the same order that navigation regions were registered on the NavigationServer.  
         *      
         *  **Note:** If navigation meshes from different navigation regions overlap (which should be avoided in general) the result might not be what is expected.  
         */
        static regionOwnsPoint(region: Rid, point: Vector3): boolean
        
        /** Sets the map for the region. */
        static regionSetMap(region: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param region] is currently assigned to. */
        static regionGetMap(region: Rid): Rid
        
        /** Set the region's navigation layers. This allows selecting regions from a path request (when using [method NavigationServer3D.map_get_path]). */
        static regionSetNavigationLayers(region: Rid, navigationLayers: int64): void
        
        /** Returns the region's navigation layers. */
        static regionGetNavigationLayers(region: Rid): int64
        
        /** Sets the global transformation for the region. */
        static regionSetTransform(region: Rid, transform: Transform3D): void
        
        /** Returns the global transformation of this [param region]. */
        static regionGetTransform(region: Rid): Transform3D
        
        /** Sets the navigation mesh for the region. */
        static regionSetNavigationMesh(region: Rid, navigationMesh: NavigationMesh): void
        
        /** Bakes the [param navigation_mesh] with bake source geometry collected starting from the [param root_node]. */
        static regionBakeNavigationMesh(navigationMesh: NavigationMesh, rootNode: Node): void
        
        /** Returns how many connections this [param region] has with other regions in the map. */
        static regionGetConnectionsCount(region: Rid): int64
        
        /** Returns the starting point of a connection door. [param connection] is an index between 0 and the return value of [method region_get_connections_count]. */
        static regionGetConnectionPathwayStart(region: Rid, connection: int64): Vector3
        
        /** Returns the ending point of a connection door. [param connection] is an index between 0 and the return value of [method region_get_connections_count]. */
        static regionGetConnectionPathwayEnd(region: Rid, connection: int64): Vector3
        
        /** Returns the navigation mesh surface point closest to the provided [param start] and [param end] segment on the navigation [param region].  
         *  If [param use_collision] is `true`, a closest point test is only done when the segment intersects with the navigation mesh surface.  
         */
        static regionGetClosestPointToSegment(region: Rid, start: Vector3, end: Vector3, useCollision?: boolean /* = false */): Vector3
        
        /** Returns the navigation mesh surface point closest to the provided [param to_point] on the navigation [param region]. */
        static regionGetClosestPoint(region: Rid, toPoint: Vector3): Vector3
        
        /** Returns the navigation mesh surface normal closest to the provided [param to_point] on the navigation [param region]. */
        static regionGetClosestPointNormal(region: Rid, toPoint: Vector3): Vector3
        
        /** Returns a random position picked from all region polygons with matching [param navigation_layers].  
         *  If [param uniformly] is `true`, all region polygons and faces are weighted by their surface area (slower).  
         *  If [param uniformly] is `false`, just a random polygon and face is picked (faster).  
         */
        static regionGetRandomPoint(region: Rid, navigationLayers: int64, uniformly: boolean): Vector3
        
        /** Returns the axis-aligned bounding box for the [param region]'s transformed navigation mesh. */
        static regionGetBounds(region: Rid): Aabb
        
        /** Create a new link between two positions on a map. */
        static linkCreate(): Rid
        
        /** Returns the current iteration ID of the navigation link. Every time the navigation link changes and synchronizes, the iteration ID increases. An iteration ID of `0` means the navigation link has never synchronized.  
         *      
         *  **Note:** The iteration ID will wrap around to `1` after reaching its range limit.  
         */
        static linkGetIterationId(link: Rid): int64
        
        /** Sets the navigation map [RID] for the link. */
        static linkSetMap(link: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param link] is currently assigned to. */
        static linkGetMap(link: Rid): Rid
        
        /** If [param enabled] is `true`, the specified [param link] will contribute to its current navigation map. */
        static linkSetEnabled(link: Rid, enabled: boolean): void
        
        /** Returns `true` if the specified [param link] is enabled. */
        static linkGetEnabled(link: Rid): boolean
        
        /** Sets whether this [param link] can be travelled in both directions. */
        static linkSetBidirectional(link: Rid, bidirectional: boolean): void
        
        /** Returns whether this [param link] can be travelled in both directions. */
        static linkIsBidirectional(link: Rid): boolean
        
        /** Sets the given [param link]'s navigation layers to [param navigation_layers]. This allows selecting links from a path request (when using [method NavigationServer3D.map_get_path]). */
        static linkSetNavigationLayers(link: Rid, navigationLayers: int64): void
        
        /** Returns the navigation layers for this [param link]. */
        static linkGetNavigationLayers(link: Rid): int64
        
        /** Sets the entry position for this [param link]. */
        static linkSetStartPosition(link: Rid, position: Vector3): void
        
        /** Returns the starting position of this [param link]. */
        static linkGetStartPosition(link: Rid): Vector3
        
        /** Sets the exit position for the [param link]. */
        static linkSetEndPosition(link: Rid, position: Vector3): void
        
        /** Returns the ending position of this [param link]. */
        static linkGetEndPosition(link: Rid): Vector3
        
        /** Sets the [param enter_cost] for this [param link]. */
        static linkSetEnterCost(link: Rid, enterCost: float64): void
        
        /** Returns the enter cost of this [param link]. */
        static linkGetEnterCost(link: Rid): float64
        
        /** Sets the [param travel_cost] for this [param link]. */
        static linkSetTravelCost(link: Rid, travelCost: float64): void
        
        /** Returns the travel cost of this [param link]. */
        static linkGetTravelCost(link: Rid): float64
        
        /** Set the `ObjectID` of the object which manages this link. */
        static linkSetOwnerId(link: Rid, ownerId: int64): void
        
        /** Returns the `ObjectID` of the object which manages this link. */
        static linkGetOwnerId(link: Rid): int64
        
        /** Creates the agent. */
        static agentCreate(): Rid
        
        /** If [param enabled] is `true`, the provided [param agent] calculates avoidance. */
        static agentSetAvoidanceEnabled(agent: Rid, enabled: boolean): void
        
        /** Returns `true` if the provided [param agent] has avoidance enabled. */
        static agentGetAvoidanceEnabled(agent: Rid): boolean
        
        /** Sets if the agent uses the 2D avoidance or the 3D avoidance while avoidance is enabled.  
         *  If `true` the agent calculates avoidance velocities in 3D for the XYZ axes, e.g. for games that take place in the air, underwater, or space. The 3D agent only avoids other 3D avoidance agents. The 3D agent only reacts to radius based avoidance obstacles. The 3D agent ignores any vertices based obstacles. The 3D agent only avoids other 3D agents.  
         *  If `false` the agent calculates avoidance velocities in 2D along the xz-axes ignoring the y-axis. The 2D agent only avoids other 2D avoidance agents. The 2D agent reacts to radius avoidance obstacles. The 2D agent reacts to vertex based avoidance obstacles. The 2D agent only avoids other 2D agents. 2D agents will ignore other 2D agents or obstacles that are below their current position or above their current position including the agent's height in 2D avoidance.  
         */
        static agentSetUse3DAvoidance(agent: Rid, enabled: boolean): void
        
        /** Returns `true` if the provided [param agent] uses avoidance in 3D space Vector3(x,y,z) instead of horizontal 2D Vector2(x,y) / Vector3(x,0.0,z). */
        static agentGetUse3DAvoidance(agent: Rid): boolean
        
        /** Puts the agent in the map. */
        static agentSetMap(agent: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param agent] is currently assigned to. */
        static agentGetMap(agent: Rid): Rid
        
        /** If [param paused] is `true` the specified [param agent] will not be processed. For example, it will not calculate avoidance velocities or receive avoidance callbacks. */
        static agentSetPaused(agent: Rid, paused: boolean): void
        
        /** Returns `true` if the specified [param agent] is paused. */
        static agentGetPaused(agent: Rid): boolean
        
        /** Sets the maximum distance to other agents this agent takes into account in the navigation. The larger this number, the longer the running time of the simulation. If the number is too low, the simulation will not be safe. */
        static agentSetNeighborDistance(agent: Rid, distance: float64): void
        
        /** Returns the maximum distance to other agents the specified [param agent] takes into account in the navigation. */
        static agentGetNeighborDistance(agent: Rid): float64
        
        /** Sets the maximum number of other agents the agent takes into account in the navigation. The larger this number, the longer the running time of the simulation. If the number is too low, the simulation will not be safe. */
        static agentSetMaxNeighbors(agent: Rid, count: int64): void
        
        /** Returns the maximum number of other agents the specified [param agent] takes into account in the navigation. */
        static agentGetMaxNeighbors(agent: Rid): int64
        
        /** The minimal amount of time for which the agent's velocities that are computed by the simulation are safe with respect to other agents. The larger this number, the sooner this agent will respond to the presence of other agents, but the less freedom this agent has in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        static agentSetTimeHorizonAgents(agent: Rid, timeHorizon: float64): void
        
        /** Returns the minimal amount of time for which the specified [param agent]'s velocities that are computed by the simulation are safe with respect to other agents. */
        static agentGetTimeHorizonAgents(agent: Rid): float64
        
        /** The minimal amount of time for which the agent's velocities that are computed by the simulation are safe with respect to static avoidance obstacles. The larger this number, the sooner this agent will respond to the presence of static avoidance obstacles, but the less freedom this agent has in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        static agentSetTimeHorizonObstacles(agent: Rid, timeHorizon: float64): void
        
        /** Returns the minimal amount of time for which the specified [param agent]'s velocities that are computed by the simulation are safe with respect to static avoidance obstacles. */
        static agentGetTimeHorizonObstacles(agent: Rid): float64
        
        /** Sets the radius of the agent. */
        static agentSetRadius(agent: Rid, radius: float64): void
        
        /** Returns the radius of the specified [param agent]. */
        static agentGetRadius(agent: Rid): float64
        
        /** Updates the provided [param agent] [param height]. */
        static agentSetHeight(agent: Rid, height: float64): void
        
        /** Returns the `height` of the specified [param agent]. */
        static agentGetHeight(agent: Rid): float64
        
        /** Sets the maximum speed of the agent. Must be positive. */
        static agentSetMaxSpeed(agent: Rid, maxSpeed: float64): void
        
        /** Returns the maximum speed of the specified [param agent]. */
        static agentGetMaxSpeed(agent: Rid): float64
        
        /** Replaces the internal velocity in the collision avoidance simulation with [param velocity] for the specified [param agent]. When an agent is teleported to a new position this function should be used in the same frame. If called frequently this function can get agents stuck. */
        static agentSetVelocityForced(agent: Rid, velocity: Vector3): void
        
        /** Sets [param velocity] as the new wanted velocity for the specified [param agent]. The avoidance simulation will try to achieve this velocity if possible, but will adjust it to avoid colliding with other agents and obstacles. When an agent is teleported to a new position far away, use [method agent_set_velocity_forced] instead to reset the internal velocity state. */
        static agentSetVelocity(agent: Rid, velocity: Vector3): void
        
        /** Returns the velocity of the specified [param agent]. */
        static agentGetVelocity(agent: Rid): Vector3
        
        /** Sets the position of the agent in world space. */
        static agentSetPosition(agent: Rid, position: Vector3): void
        
        /** Returns the position of the specified [param agent] in world space. */
        static agentGetPosition(agent: Rid): Vector3
        
        /** Returns `true` if the map got changed the previous frame. */
        static agentIsMapChanged(agent: Rid): boolean
        
        /** Sets the callback [Callable] that gets called after each avoidance processing step for the [param agent]. The calculated `safe_velocity` will be dispatched with a signal to the object just before the physics calculations.  
         *      
         *  **Note:** Created callbacks are always processed independently of the SceneTree state as long as the agent is on a navigation map and not freed. To disable the dispatch of a callback from an agent use [method agent_set_avoidance_callback] again with an empty [Callable].  
         */
        static agentSetAvoidanceCallback(agent: Rid, callback: Callable): void
        
        /** Return `true` if the specified [param agent] has an avoidance callback. */
        static agentHasAvoidanceCallback(agent: Rid): boolean
        
        /** Set the agent's `avoidance_layers` bitmask. */
        static agentSetAvoidanceLayers(agent: Rid, layers: int64): void
        
        /** Returns the `avoidance_layers` bitmask of the specified [param agent]. */
        static agentGetAvoidanceLayers(agent: Rid): int64
        
        /** Set the agent's `avoidance_mask` bitmask. */
        static agentSetAvoidanceMask(agent: Rid, mask: int64): void
        
        /** Returns the `avoidance_mask` bitmask of the specified [param agent]. */
        static agentGetAvoidanceMask(agent: Rid): int64
        
        /** Set the agent's `avoidance_priority` with a [param priority] between 0.0 (lowest priority) to 1.0 (highest priority).  
         *  The specified [param agent] does not adjust the velocity for other agents that would match the `avoidance_mask` but have a lower `avoidance_priority`. This in turn makes the other agents with lower priority adjust their velocities even more to avoid collision with this agent.  
         */
        static agentSetAvoidancePriority(agent: Rid, priority: float64): void
        
        /** Returns the `avoidance_priority` of the specified [param agent]. */
        static agentGetAvoidancePriority(agent: Rid): float64
        
        /** Creates a new obstacle. */
        static obstacleCreate(): Rid
        
        /** If [param enabled] is `true`, the provided [param obstacle] affects avoidance using agents. */
        static obstacleSetAvoidanceEnabled(obstacle: Rid, enabled: boolean): void
        
        /** Returns `true` if the provided [param obstacle] has avoidance enabled. */
        static obstacleGetAvoidanceEnabled(obstacle: Rid): boolean
        
        /** Sets if the [param obstacle] uses the 2D avoidance or the 3D avoidance while avoidance is enabled. */
        static obstacleSetUse3DAvoidance(obstacle: Rid, enabled: boolean): void
        
        /** Returns `true` if the provided [param obstacle] uses avoidance in 3D space Vector3(x,y,z) instead of horizontal 2D Vector2(x,y) / Vector3(x,0.0,z). */
        static obstacleGetUse3DAvoidance(obstacle: Rid): boolean
        
        /** Assigns the [param obstacle] to a navigation map. */
        static obstacleSetMap(obstacle: Rid, map: Rid): void
        
        /** Returns the navigation map [RID] the requested [param obstacle] is currently assigned to. */
        static obstacleGetMap(obstacle: Rid): Rid
        
        /** If [param paused] is `true` the specified [param obstacle] will not be processed. For example, it will no longer affect avoidance velocities. */
        static obstacleSetPaused(obstacle: Rid, paused: boolean): void
        
        /** Returns `true` if the specified [param obstacle] is paused. */
        static obstacleGetPaused(obstacle: Rid): boolean
        
        /** Sets the radius of the dynamic obstacle. */
        static obstacleSetRadius(obstacle: Rid, radius: float64): void
        
        /** Returns the radius of the specified dynamic [param obstacle]. */
        static obstacleGetRadius(obstacle: Rid): float64
        
        /** Sets the [param height] for the [param obstacle]. In 3D agents will ignore obstacles that are above or below them while using 2D avoidance. */
        static obstacleSetHeight(obstacle: Rid, height: float64): void
        
        /** Returns the `height` of the specified [param obstacle]. */
        static obstacleGetHeight(obstacle: Rid): float64
        
        /** Sets [param velocity] of the dynamic [param obstacle]. Allows other agents to better predict the movement of the dynamic obstacle. Only works in combination with the radius of the obstacle. */
        static obstacleSetVelocity(obstacle: Rid, velocity: Vector3): void
        
        /** Returns the velocity of the specified dynamic [param obstacle]. */
        static obstacleGetVelocity(obstacle: Rid): Vector3
        
        /** Updates the [param position] in world space for the [param obstacle]. */
        static obstacleSetPosition(obstacle: Rid, position: Vector3): void
        
        /** Returns the position of the specified [param obstacle] in world space. */
        static obstacleGetPosition(obstacle: Rid): Vector3
        
        /** Sets the outline vertices for the obstacle. If the vertices are winded in clockwise order agents will be pushed in by the obstacle, else they will be pushed out. */
        static obstacleSetVertices(obstacle: Rid, vertices: PackedVector3Array | Vector3[]): void
        
        /** Returns the outline vertices for the specified [param obstacle]. */
        static obstacleGetVertices(obstacle: Rid): PackedVector3Array
        
        /** Sets the given [param obstacle]'s avoidance layers to [param layers]. */
        static obstacleSetAvoidanceLayers(obstacle: Rid, layers: int64): void
        
        /** Returns the `avoidance_layers` bitmask of the specified [param obstacle]. */
        static obstacleGetAvoidanceLayers(obstacle: Rid): int64
        
        /** Parses the [SceneTree] for source geometry according to the properties of [param navigation_mesh]. Updates the provided [param source_geometry_data] resource with the resulting data. The resource can then be used to bake a navigation mesh with [method bake_from_source_geometry_data]. After the process is finished the optional [param callback] will be called.  
         *      
         *  **Note:** This function needs to run on the main thread or with a deferred call as the SceneTree is not thread-safe.  
         *  **Performance:** While convenient, reading data arrays from [Mesh] resources can affect the frame rate negatively. The data needs to be received from the GPU, stalling the [RenderingServer] in the process. For performance prefer the use of e.g. collision shapes or creating the data arrays entirely in code.  
         */
        static parseSourceGeometryData(navigationMesh: NavigationMesh, sourceGeometryData: NavigationMeshSourceGeometryData3D, rootNode: Node, callback?: Callable /* = new Callable() */): void
        
        /** Bakes the provided [param navigation_mesh] with the data from the provided [param source_geometry_data]. After the process is finished the optional [param callback] will be called. */
        static bakeFromSourceGeometryData(navigationMesh: NavigationMesh, sourceGeometryData: NavigationMeshSourceGeometryData3D, callback?: Callable /* = new Callable() */): void
        
        /** Bakes the provided [param navigation_mesh] with the data from the provided [param source_geometry_data] as an async task running on a background thread. After the process is finished the optional [param callback] will be called. */
        static bakeFromSourceGeometryDataAsync(navigationMesh: NavigationMesh, sourceGeometryData: NavigationMeshSourceGeometryData3D, callback?: Callable /* = new Callable() */): void
        
        /** Returns `true` when the provided navigation mesh is being baked on a background thread. */
        static isBakingNavigationMesh(navigationMesh: NavigationMesh): boolean
        
        /** Creates a new source geometry parser. If a [Callable] is set for the parser with [method source_geometry_parser_set_callback] the callback will be called for every single node that gets parsed whenever [method parse_source_geometry_data] is used. */
        static sourceGeometryParserCreate(): Rid
        
        /** Sets the [param callback] [Callable] for the specific source geometry [param parser]. The [Callable] will receive a call with the following parameters:  
         *  - `navigation_mesh` - The [NavigationMesh] reference used to define the parse settings. Do NOT edit or add directly to the navigation mesh.  
         *  - `source_geometry_data` - The [NavigationMeshSourceGeometryData3D] reference. Add custom source geometry for navigation mesh baking to this object.  
         *  - `node` - The [Node] that is parsed.  
         */
        static sourceGeometryParserSetCallback(parser: Rid, callback: Callable): void
        
        /** Returns a simplified version of [param path] with less critical path points removed. The simplification amount is in world units and controlled by [param epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        static simplifyPath(path: PackedVector3Array | Vector3[], epsilon: float64): PackedVector3Array
        
        /** Destroys the given RID. */
        static freeRid(rid: Rid): void
        
        /** Control activation of this server. */
        static setActive(active: boolean): void
        
        /** If `true` enables debug mode on the NavigationServer. */
        static setDebugEnabled(enabled: boolean): void
        
        /** Returns `true` when the NavigationServer has debug enabled. */
        static getDebugEnabled(): boolean
        
        /** Returns information about the current state of the NavigationServer. */
        static getProcessInfo(processInfo: NavigationServer3D.ProcessInfo): int64
        
        /** Emitted when a navigation map is updated, when a region moves or is modified. */
        static readonly mapChanged: Signal<(map: Rid) => void>
        
        /** Emitted when navigation debug settings are changed. Only available in debug builds. */
        static readonly navigationDebugChanged: Signal<() => void>
        
        /** Emitted when avoidance debug settings are changed. Only available in debug builds. */
        static readonly avoidanceDebugChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationServer3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationServer3D;
    }
    // _singleton_class_: PhysicsServer2D
    namespace PhysicsServer2D {
        enum SpaceParameter {
            SpaceParamContactRecycleRadius = 0,
            SpaceParamContactMaxSeparation = 1,
            SpaceParamContactMaxAllowedPenetration = 2,
            SpaceParamContactDefaultBias = 3,
            SpaceParamBodyLinearVelocitySleepThreshold = 4,
            SpaceParamBodyAngularVelocitySleepThreshold = 5,
            SpaceParamBodyTimeToSleep = 6,
            SpaceParamConstraintDefaultBias = 7,
            SpaceParamSolverIterations = 8,
        }
        enum ShapeType {
            ShapeWorldBoundary = 0,
            ShapeSeparationRay = 1,
            ShapeSegment = 2,
            ShapeCircle = 3,
            ShapeRectangle = 4,
            ShapeCapsule = 5,
            ShapeConvexPolygon = 6,
            ShapeConcavePolygon = 7,
            ShapeCustom = 8,
        }
        enum AreaParameter {
            AreaParamGravityOverrideMode = 0,
            AreaParamGravity = 1,
            AreaParamGravityVector = 2,
            AreaParamGravityIsPoint = 3,
            AreaParamGravityPointUnitDistance = 4,
            AreaParamLinearDampOverrideMode = 5,
            AreaParamLinearDamp = 6,
            AreaParamAngularDampOverrideMode = 7,
            AreaParamAngularDamp = 8,
            AreaParamPriority = 9,
        }
        enum AreaSpaceOverrideMode {
            AreaSpaceOverrideDisabled = 0,
            AreaSpaceOverrideCombine = 1,
            AreaSpaceOverrideCombineReplace = 2,
            AreaSpaceOverrideReplace = 3,
            AreaSpaceOverrideReplaceCombine = 4,
        }
        enum BodyMode {
            BodyModeStatic = 0,
            BodyModeKinematic = 1,
            BodyModeRigid = 2,
            BodyModeRigidLinear = 3,
        }
        enum BodyParameter {
            BodyParamBounce = 0,
            BodyParamFriction = 1,
            BodyParamMass = 2,
            BodyParamInertia = 3,
            BodyParamCenterOfMass = 4,
            BodyParamGravityScale = 5,
            BodyParamLinearDampMode = 6,
            BodyParamAngularDampMode = 7,
            BodyParamLinearDamp = 8,
            BodyParamAngularDamp = 9,
            BodyParamMax = 10,
        }
        enum BodyDampMode {
            BodyDampModeCombine = 0,
            BodyDampModeReplace = 1,
        }
        enum BodyState {
            BodyStateTransform = 0,
            BodyStateLinearVelocity = 1,
            BodyStateAngularVelocity = 2,
            BodyStateSleeping = 3,
            BodyStateCanSleep = 4,
        }
        enum JointType {
            JointTypePin = 0,
            JointTypeGroove = 1,
            JointTypeDampedSpring = 2,
            JointTypeMax = 3,
        }
        enum JointParam {
            JointParamBias = 0,
            JointParamMaxBias = 1,
            JointParamMaxForce = 2,
        }
        enum PinJointParam {
            PinJointSoftness = 0,
            PinJointLimitUpper = 1,
            PinJointLimitLower = 2,
            PinJointMotorTargetVelocity = 3,
        }
        enum PinJointFlag {
            PinJointFlagAngularLimitEnabled = 0,
            PinJointFlagMotorEnabled = 1,
        }
        enum DampedSpringParam {
            DampedSpringRestLength = 0,
            DampedSpringStiffness = 1,
            DampedSpringDamping = 2,
        }
        enum CcdMode {
            CcdModeDisabled = 0,
            CcdModeCastRay = 1,
            CcdModeCastShape = 2,
        }
        enum AreaBodyStatus {
            AreaBodyAdded = 0,
            AreaBodyRemoved = 1,
        }
        enum ProcessInfo {
            InfoActiveObjects = 0,
            InfoCollisionPairs = 1,
            InfoIslandCount = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer2D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer2D extends __NameMapGObject {
        world_boundary_shape_create: "worldBoundaryShapeCreate";
        separation_ray_shape_create: "separationRayShapeCreate";
        segment_shape_create: "segmentShapeCreate";
        circle_shape_create: "circleShapeCreate";
        rectangle_shape_create: "rectangleShapeCreate";
        capsule_shape_create: "capsuleShapeCreate";
        convex_polygon_shape_create: "convexPolygonShapeCreate";
        concave_polygon_shape_create: "concavePolygonShapeCreate";
        shape_set_data: "shapeSetData";
        shape_get_type: "shapeGetType";
        shape_get_data: "shapeGetData";
        space_create: "spaceCreate";
        space_set_active: "spaceSetActive";
        space_is_active: "spaceIsActive";
        space_set_param: "spaceSetParam";
        space_get_param: "spaceGetParam";
        space_get_direct_state: "spaceGetDirectState";
        area_create: "areaCreate";
        area_set_space: "areaSetSpace";
        area_get_space: "areaGetSpace";
        area_add_shape: "areaAddShape";
        area_set_shape: "areaSetShape";
        area_set_shape_transform: "areaSetShapeTransform";
        area_set_shape_disabled: "areaSetShapeDisabled";
        area_get_shape_count: "areaGetShapeCount";
        area_get_shape: "areaGetShape";
        area_get_shape_transform: "areaGetShapeTransform";
        area_remove_shape: "areaRemoveShape";
        area_clear_shapes: "areaClearShapes";
        area_set_collision_layer: "areaSetCollisionLayer";
        area_get_collision_layer: "areaGetCollisionLayer";
        area_set_collision_mask: "areaSetCollisionMask";
        area_get_collision_mask: "areaGetCollisionMask";
        area_set_param: "areaSetParam";
        area_set_transform: "areaSetTransform";
        area_get_param: "areaGetParam";
        area_get_transform: "areaGetTransform";
        area_attach_object_instance_id: "areaAttachObjectInstanceId";
        area_get_object_instance_id: "areaGetObjectInstanceId";
        area_attach_canvas_instance_id: "areaAttachCanvasInstanceId";
        area_get_canvas_instance_id: "areaGetCanvasInstanceId";
        area_set_monitor_callback: "areaSetMonitorCallback";
        area_set_area_monitor_callback: "areaSetAreaMonitorCallback";
        area_set_monitorable: "areaSetMonitorable";
        body_create: "bodyCreate";
        body_set_space: "bodySetSpace";
        body_get_space: "bodyGetSpace";
        body_set_mode: "bodySetMode";
        body_get_mode: "bodyGetMode";
        body_add_shape: "bodyAddShape";
        body_set_shape: "bodySetShape";
        body_set_shape_transform: "bodySetShapeTransform";
        body_get_shape_count: "bodyGetShapeCount";
        body_get_shape: "bodyGetShape";
        body_get_shape_transform: "bodyGetShapeTransform";
        body_remove_shape: "bodyRemoveShape";
        body_clear_shapes: "bodyClearShapes";
        body_set_shape_disabled: "bodySetShapeDisabled";
        body_set_shape_as_one_way_collision: "bodySetShapeAsOneWayCollision";
        body_attach_object_instance_id: "bodyAttachObjectInstanceId";
        body_get_object_instance_id: "bodyGetObjectInstanceId";
        body_attach_canvas_instance_id: "bodyAttachCanvasInstanceId";
        body_get_canvas_instance_id: "bodyGetCanvasInstanceId";
        body_set_continuous_collision_detection_mode: "bodySetContinuousCollisionDetectionMode";
        body_get_continuous_collision_detection_mode: "bodyGetContinuousCollisionDetectionMode";
        body_set_collision_layer: "bodySetCollisionLayer";
        body_get_collision_layer: "bodyGetCollisionLayer";
        body_set_collision_mask: "bodySetCollisionMask";
        body_get_collision_mask: "bodyGetCollisionMask";
        body_set_collision_priority: "bodySetCollisionPriority";
        body_get_collision_priority: "bodyGetCollisionPriority";
        body_set_param: "bodySetParam";
        body_get_param: "bodyGetParam";
        body_reset_mass_properties: "bodyResetMassProperties";
        body_set_state: "bodySetState";
        body_get_state: "bodyGetState";
        body_apply_central_impulse: "bodyApplyCentralImpulse";
        body_apply_torque_impulse: "bodyApplyTorqueImpulse";
        body_apply_impulse: "bodyApplyImpulse";
        body_apply_central_force: "bodyApplyCentralForce";
        body_apply_force: "bodyApplyForce";
        body_apply_torque: "bodyApplyTorque";
        body_add_constant_central_force: "bodyAddConstantCentralForce";
        body_add_constant_force: "bodyAddConstantForce";
        body_add_constant_torque: "bodyAddConstantTorque";
        body_set_constant_force: "bodySetConstantForce";
        body_get_constant_force: "bodyGetConstantForce";
        body_set_constant_torque: "bodySetConstantTorque";
        body_get_constant_torque: "bodyGetConstantTorque";
        body_set_axis_velocity: "bodySetAxisVelocity";
        body_add_collision_exception: "bodyAddCollisionException";
        body_remove_collision_exception: "bodyRemoveCollisionException";
        body_set_max_contacts_reported: "bodySetMaxContactsReported";
        body_get_max_contacts_reported: "bodyGetMaxContactsReported";
        body_set_omit_force_integration: "bodySetOmitForceIntegration";
        body_is_omitting_force_integration: "bodyIsOmittingForceIntegration";
        body_set_state_sync_callback: "bodySetStateSyncCallback";
        body_set_force_integration_callback: "bodySetForceIntegrationCallback";
        body_test_motion: "bodyTestMotion";
        body_get_direct_state: "bodyGetDirectState";
        joint_create: "jointCreate";
        joint_clear: "jointClear";
        joint_set_param: "jointSetParam";
        joint_get_param: "jointGetParam";
        joint_disable_collisions_between_bodies: "jointDisableCollisionsBetweenBodies";
        joint_is_disabled_collisions_between_bodies: "jointIsDisabledCollisionsBetweenBodies";
        joint_make_pin: "jointMakePin";
        joint_make_groove: "jointMakeGroove";
        joint_make_damped_spring: "jointMakeDampedSpring";
        pin_joint_set_flag: "pinJointSetFlag";
        pin_joint_get_flag: "pinJointGetFlag";
        pin_joint_set_param: "pinJointSetParam";
        pin_joint_get_param: "pinJointGetParam";
        damped_spring_joint_set_param: "dampedSpringJointSetParam";
        damped_spring_joint_get_param: "dampedSpringJointGetParam";
        joint_get_type: "jointGetType";
        free_rid: "freeRid";
        set_active: "setActive";
        get_process_info: "getProcessInfo";
        _debug_changed: "_debugChanged";
    }
    /** A server interface for low-level 2D physics access.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver2d.html  
     */
    class PhysicsServer2D extends GObject {
        /** Creates a 2D world boundary shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the shape's normal direction and distance properties. */
        static worldBoundaryShapeCreate(): Rid
        
        /** Creates a 2D separation ray shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the shape's `length` and `slide_on_slope` properties. */
        static separationRayShapeCreate(): Rid
        
        /** Creates a 2D segment shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the segment's start and end points. */
        static segmentShapeCreate(): Rid
        
        /** Creates a 2D circle shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the circle's radius. */
        static circleShapeCreate(): Rid
        
        /** Creates a 2D rectangle shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the rectangle's half-extents. */
        static rectangleShapeCreate(): Rid
        
        /** Creates a 2D capsule shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the capsule's height and radius. */
        static capsuleShapeCreate(): Rid
        
        /** Creates a 2D convex polygon shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the convex polygon's points. */
        static convexPolygonShapeCreate(): Rid
        
        /** Creates a 2D concave polygon shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the concave polygon's segments. */
        static concavePolygonShapeCreate(): Rid
        
        /** Sets the shape data that defines the configuration of the shape. The [param data] to be passed depends on the shape's type (see [method shape_get_type]):  
         *  - [constant SHAPE_WORLD_BOUNDARY]: an array of length two containing a [Vector2] `normal` direction and a [float] distance `d`,  
         *  - [constant SHAPE_SEPARATION_RAY]: a dictionary containing the key `length` with a [float] value and the key `slide_on_slope` with a [bool] value,  
         *  - [constant SHAPE_SEGMENT]: a [Rect2] `rect` containing the first point of the segment in `rect.position` and the second point of the segment in `rect.size`,  
         *  - [constant SHAPE_CIRCLE]: a [float] `radius`,  
         *  - [constant SHAPE_RECTANGLE]: a [Vector2] `half_extents`,  
         *  - [constant SHAPE_CAPSULE]: an array of length two (or a [Vector2]) containing a [float] `height` and a [float] `radius`,  
         *  - [constant SHAPE_CONVEX_POLYGON]: either a [PackedVector2Array] of points defining a convex polygon in counterclockwise order (the clockwise outward normal of each segment formed by consecutive points is calculated internally), or a [PackedFloat32Array] of length divisible by four so that every 4-tuple of [float]s contains the coordinates of a point followed by the coordinates of the clockwise outward normal vector to the segment between the current point and the next point,  
         *  - [constant SHAPE_CONCAVE_POLYGON]: a [PackedVector2Array] of length divisible by two (each pair of points forms one segment).  
         *  **Warning:** In the case of [constant SHAPE_CONVEX_POLYGON], this method does not check if the points supplied actually form a convex polygon (unlike the [member CollisionPolygon2D.polygon] property).  
         */
        static shapeSetData(shape: Rid, data: any): void
        
        /** Returns the shape's type. */
        static shapeGetType(shape: Rid): PhysicsServer2D.ShapeType
        
        /** Returns the shape data that defines the configuration of the shape, such as the half-extents of a rectangle or the segments of a concave shape. See [method shape_set_data] for the precise format of this data in each case. */
        static shapeGetData(shape: Rid): any
        
        /** Creates a 2D space in the physics server, and returns the [RID] that identifies it. A space contains bodies and areas, and controls the stepping of the physics simulation of the objects in it. */
        static spaceCreate(): Rid
        
        /** Activates or deactivates the space. If [param active] is `false`, then the physics server will not do anything with this space in its physics step. */
        static spaceSetActive(space: Rid, active: boolean): void
        
        /** Returns `true` if the space is active. */
        static spaceIsActive(space: Rid): boolean
        
        /** Sets the value of the given space parameter. */
        static spaceSetParam(space: Rid, param: PhysicsServer2D.SpaceParameter, value: float64): void
        
        /** Returns the value of the given space parameter. */
        static spaceGetParam(space: Rid, param: PhysicsServer2D.SpaceParameter): float64
        
        /** Returns the state of a space, a [PhysicsDirectSpaceState2D]. This object can be used for collision/intersection queries. */
        static spaceGetDirectState(space: Rid): null | PhysicsDirectSpaceState2D
        
        /** Creates a 2D area object in the physics server, and returns the [RID] that identifies it. The default settings for the created area include a collision layer and mask set to `1`, and `monitorable` set to `false`.  
         *  Use [method area_add_shape] to add shapes to it, use [method area_set_transform] to set its transform, and use [method area_set_space] to add the area to a space. If you want the area to be detectable use [method area_set_monitorable].  
         */
        static areaCreate(): Rid
        
        /** Adds the area to the given space, after removing the area from the previously assigned space (if any).  
         *      
         *  **Note:** To remove an area from a space without immediately adding it back elsewhere, use `PhysicsServer2D.area_set_space(area, RID())`.  
         */
        static areaSetSpace(area: Rid, space: Rid): void
        
        /** Returns the [RID] of the space assigned to the area. Returns an empty [RID] if no space is assigned. */
        static areaGetSpace(area: Rid): Rid
        
        /** Adds a shape to the area, with the given local transform. The shape (together with its [param transform] and [param disabled] properties) is added to an array of shapes, and the shapes of an area are usually referenced by their index in this array. */
        static areaAddShape(area: Rid, shape: Rid, transform?: Transform2D /* = new Transform2D() */, disabled?: boolean /* = false */): void
        
        /** Replaces the area's shape at the given index by another shape, while not affecting the `transform` and `disabled` properties at the same index. */
        static areaSetShape(area: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Sets the local transform matrix of the area's shape with the given index. */
        static areaSetShapeTransform(area: Rid, shapeIdx: int64, transform: Transform2D): void
        
        /** Sets the disabled property of the area's shape with the given index. If [param disabled] is `true`, then the shape will not detect any other shapes entering or exiting it. */
        static areaSetShapeDisabled(area: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Returns the number of shapes added to the area. */
        static areaGetShapeCount(area: Rid): int64
        
        /** Returns the [RID] of the shape with the given index in the area's array of shapes. */
        static areaGetShape(area: Rid, shapeIdx: int64): Rid
        
        /** Returns the local transform matrix of the shape with the given index in the area's array of shapes. */
        static areaGetShapeTransform(area: Rid, shapeIdx: int64): Transform2D
        
        /** Removes the shape with the given index from the area's array of shapes. The shape itself is not deleted, so it can continue to be used elsewhere or added back later. As a result of this operation, the area's shapes which used to have indices higher than [param shape_idx] will have their index decreased by one. */
        static areaRemoveShape(area: Rid, shapeIdx: int64): void
        
        /** Removes all shapes from the area. This does not delete the shapes themselves, so they can continue to be used elsewhere or added back later. */
        static areaClearShapes(area: Rid): void
        
        /** Assigns the area to one or many physics layers, via a bitmask. */
        static areaSetCollisionLayer(area: Rid, layer: int64): void
        
        /** Returns the physics layer or layers the area belongs to, as a bitmask. */
        static areaGetCollisionLayer(area: Rid): int64
        
        /** Sets which physics layers the area will monitor, via a bitmask. */
        static areaSetCollisionMask(area: Rid, mask: int64): void
        
        /** Returns the physics layer or layers the area can contact with, as a bitmask. */
        static areaGetCollisionMask(area: Rid): int64
        
        /** Sets the value of the given area parameter. */
        static areaSetParam(area: Rid, param: PhysicsServer2D.AreaParameter, value: any): void
        
        /** Sets the transform matrix of the area. */
        static areaSetTransform(area: Rid, transform: Transform2D): void
        
        /** Returns the value of the given area parameter. */
        static areaGetParam(area: Rid, param: PhysicsServer2D.AreaParameter): any
        
        /** Returns the transform matrix of the area. */
        static areaGetTransform(area: Rid): Transform2D
        
        /** Attaches the `ObjectID` of an [Object] to the area. Use [method Object.get_instance_id] to get the `ObjectID` of a [CollisionObject2D]. */
        static areaAttachObjectInstanceId(area: Rid, id: int64): void
        
        /** Returns the `ObjectID` attached to the area. Use [method @GlobalScope.instance_from_id] to retrieve an [Object] from a nonzero `ObjectID`. */
        static areaGetObjectInstanceId(area: Rid): int64
        
        /** Attaches the `ObjectID` of a canvas to the area. Use [method Object.get_instance_id] to get the `ObjectID` of a [CanvasLayer]. */
        static areaAttachCanvasInstanceId(area: Rid, id: int64): void
        
        /** Returns the `ObjectID` of the canvas attached to the area. Use [method @GlobalScope.instance_from_id] to retrieve a [CanvasLayer] from a nonzero `ObjectID`. */
        static areaGetCanvasInstanceId(area: Rid): int64
        
        /** Sets the area's body monitor callback. This callback will be called when any other (shape of a) body enters or exits (a shape of) the given area, and must take the following five parameters:  
         *  1. an integer `status`: either [constant AREA_BODY_ADDED] or [constant AREA_BODY_REMOVED] depending on whether the other body shape entered or exited the area,  
         *  2. an [RID] `body_rid`: the [RID] of the body that entered or exited the area,  
         *  3. an integer `instance_id`: the `ObjectID` attached to the body,  
         *  4. an integer `body_shape_idx`: the index of the shape of the body that entered or exited the area,  
         *  5. an integer `self_shape_idx`: the index of the shape of the area where the body entered or exited.  
         *  By counting (or keeping track of) the shapes that enter and exit, it can be determined if a body (with all its shapes) is entering for the first time or exiting for the last time.  
         */
        static areaSetMonitorCallback(area: Rid, callback: Callable): void
        
        /** Sets the area's area monitor callback. This callback will be called when any other (shape of an) area enters or exits (a shape of) the given area, and must take the following five parameters:  
         *  1. an integer `status`: either [constant AREA_BODY_ADDED] or [constant AREA_BODY_REMOVED] depending on whether the other area's shape entered or exited the area,  
         *  2. an [RID] `area_rid`: the [RID] of the other area that entered or exited the area,  
         *  3. an integer `instance_id`: the `ObjectID` attached to the other area,  
         *  4. an integer `area_shape_idx`: the index of the shape of the other area that entered or exited the area,  
         *  5. an integer `self_shape_idx`: the index of the shape of the area where the other area entered or exited.  
         *  By counting (or keeping track of) the shapes that enter and exit, it can be determined if an area (with all its shapes) is entering for the first time or exiting for the last time.  
         */
        static areaSetAreaMonitorCallback(area: Rid, callback: Callable): void
        
        /** Sets whether the area is monitorable or not. If [param monitorable] is `true`, the area monitoring callback of other areas will be called when this area enters or exits them. */
        static areaSetMonitorable(area: Rid, monitorable: boolean): void
        
        /** Creates a 2D body object in the physics server, and returns the [RID] that identifies it. The default settings for the created area include a collision layer and mask set to `1`, and body mode set to [constant BODY_MODE_RIGID].  
         *  Use [method body_add_shape] to add shapes to it, use [method body_set_state] to set its transform, and use [method body_set_space] to add the body to a space.  
         */
        static bodyCreate(): Rid
        
        /** Adds the body to the given space, after removing the body from the previously assigned space (if any). If the body's mode is set to [constant BODY_MODE_RIGID], then adding the body to a space will have the following additional effects:  
         *  - If the parameter [constant BODY_PARAM_CENTER_OF_MASS] has never been set explicitly, then the value of that parameter will be recalculated based on the body's shapes.  
         *  - If the parameter [constant BODY_PARAM_INERTIA] is set to a value `<= 0.0`, then the value of that parameter will be recalculated based on the body's shapes, mass, and center of mass.  
         *      
         *  **Note:** To remove a body from a space without immediately adding it back elsewhere, use `PhysicsServer2D.body_set_space(body, RID())`.  
         */
        static bodySetSpace(body: Rid, space: Rid): void
        
        /** Returns the [RID] of the space assigned to the body. Returns an empty [RID] if no space is assigned. */
        static bodyGetSpace(body: Rid): Rid
        
        /** Sets the body's mode. */
        static bodySetMode(body: Rid, mode: PhysicsServer2D.BodyMode): void
        
        /** Returns the body's mode. */
        static bodyGetMode(body: Rid): PhysicsServer2D.BodyMode
        
        /** Adds a shape to the area, with the given local transform. The shape (together with its [param transform] and [param disabled] properties) is added to an array of shapes, and the shapes of a body are usually referenced by their index in this array. */
        static bodyAddShape(body: Rid, shape: Rid, transform?: Transform2D /* = new Transform2D() */, disabled?: boolean /* = false */): void
        
        /** Replaces the body's shape at the given index by another shape, while not affecting the `transform`, `disabled`, and one-way collision properties at the same index. */
        static bodySetShape(body: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Sets the local transform matrix of the body's shape with the given index. */
        static bodySetShapeTransform(body: Rid, shapeIdx: int64, transform: Transform2D): void
        
        /** Returns the number of shapes added to the body. */
        static bodyGetShapeCount(body: Rid): int64
        
        /** Returns the [RID] of the shape with the given index in the body's array of shapes. */
        static bodyGetShape(body: Rid, shapeIdx: int64): Rid
        
        /** Returns the local transform matrix of the shape with the given index in the area's array of shapes. */
        static bodyGetShapeTransform(body: Rid, shapeIdx: int64): Transform2D
        
        /** Removes the shape with the given index from the body's array of shapes. The shape itself is not deleted, so it can continue to be used elsewhere or added back later. As a result of this operation, the body's shapes which used to have indices higher than [param shape_idx] will have their index decreased by one. */
        static bodyRemoveShape(body: Rid, shapeIdx: int64): void
        
        /** Removes all shapes from the body. This does not delete the shapes themselves, so they can continue to be used elsewhere or added back later. */
        static bodyClearShapes(body: Rid): void
        
        /** Sets the disabled property of the body's shape with the given index. If [param disabled] is `true`, then the shape will be ignored in all collision detection. */
        static bodySetShapeDisabled(body: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Sets the one-way collision properties of the body's shape with the given index. If [param enable] is `true`, the one-way collision direction given by [param direction] in the shape's local space (that is `body_get_shape_transform(body, shape_idx).basis_xform(direction).normalized()` in the body's local space) will be used to ignore collisions with the shape in the opposite direction, and to ensure depenetration of kinematic bodies happens in this direction. */
        static bodySetShapeAsOneWayCollision(body: Rid, shapeIdx: int64, enable: boolean, margin: float64, direction?: Vector2 /* = new Vector2(0, 1) */): void
        
        /** Attaches the `ObjectID` of an [Object] to the body. Use [method Object.get_instance_id] to get the `ObjectID` of a [CollisionObject2D]. */
        static bodyAttachObjectInstanceId(body: Rid, id: int64): void
        
        /** Returns the `ObjectID` attached to the body. Use [method @GlobalScope.instance_from_id] to retrieve an [Object] from a nonzero `ObjectID`. */
        static bodyGetObjectInstanceId(body: Rid): int64
        
        /** Attaches the `ObjectID` of a canvas to the body. Use [method Object.get_instance_id] to get the `ObjectID` of a [CanvasLayer]. */
        static bodyAttachCanvasInstanceId(body: Rid, id: int64): void
        
        /** Returns the `ObjectID` of the canvas attached to the body. Use [method @GlobalScope.instance_from_id] to retrieve a [CanvasLayer] from a nonzero `ObjectID`. */
        static bodyGetCanvasInstanceId(body: Rid): int64
        
        /** Sets the continuous collision detection mode.  
         *  Continuous collision detection tries to predict where a moving body would collide in between physics updates, instead of moving it and correcting its movement if it collided.  
         */
        static bodySetContinuousCollisionDetectionMode(body: Rid, mode: PhysicsServer2D.CcdMode): void
        
        /** Returns the body's continuous collision detection mode. */
        static bodyGetContinuousCollisionDetectionMode(body: Rid): PhysicsServer2D.CcdMode
        
        /** Sets the physics layer or layers the body belongs to, via a bitmask. */
        static bodySetCollisionLayer(body: Rid, layer: int64): void
        
        /** Returns the physics layer or layers the body belongs to, as a bitmask. */
        static bodyGetCollisionLayer(body: Rid): int64
        
        /** Sets the physics layer or layers the body can collide with, via a bitmask. */
        static bodySetCollisionMask(body: Rid, mask: int64): void
        
        /** Returns the physics layer or layers the body can collide with, as a bitmask. */
        static bodyGetCollisionMask(body: Rid): int64
        
        /** Sets the body's collision priority. This is used in the depenetration phase of [method body_test_motion]. The higher the priority is, the lower the penetration into the body will be. */
        static bodySetCollisionPriority(body: Rid, priority: float64): void
        
        /** Returns the body's collision priority. This is used in the depenetration phase of [method body_test_motion]. The higher the priority is, the lower the penetration into the body will be. */
        static bodyGetCollisionPriority(body: Rid): float64
        
        /** Sets the value of the given body parameter. */
        static bodySetParam(body: Rid, param: PhysicsServer2D.BodyParameter, value: any): void
        
        /** Returns the value of the given body parameter. */
        static bodyGetParam(body: Rid, param: PhysicsServer2D.BodyParameter): any
        
        /** Restores the default inertia and center of mass of the body based on its shapes. This undoes any custom values previously set using [method body_set_param]. */
        static bodyResetMassProperties(body: Rid): void
        
        /** Sets the value of a body's state.  
         *      
         *  **Note:** The state change doesn't take effect immediately. The state will change on the next physics frame.  
         */
        static bodySetState(body: Rid, state: PhysicsServer2D.BodyState, value: any): void
        
        /** Returns the value of the given state of the body. */
        static bodyGetState(body: Rid, state: PhysicsServer2D.BodyState): any
        
        /** Applies a directional impulse to the body, at the body's center of mass. The impulse does not affect rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method body_apply_impulse] at the body's center of mass.  
         */
        static bodyApplyCentralImpulse(body: Rid, impulse: Vector2): void
        
        /** Applies a rotational impulse to the body. The impulse does not affect position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        static bodyApplyTorqueImpulse(body: Rid, impulse: float64): void
        
        /** Applies a positioned impulse to the body. The impulse can affect rotation if [param position] is different from the body's center of mass.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyApplyImpulse(body: Rid, impulse: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a directional force to the body, at the body's center of mass. The force does not affect rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method body_apply_force] at the body's center of mass.  
         */
        static bodyApplyCentralForce(body: Rid, force: Vector2): void
        
        /** Applies a positioned force to the body. The force can affect rotation if [param position] is different from the body's center of mass. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyApplyForce(body: Rid, force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a rotational force to the body. The force does not affect position. A force is time dependent and meant to be applied every physics update. */
        static bodyApplyTorque(body: Rid, torque: float64): void
        
        /** Adds a constant directional force to the body. The force does not affect rotation. The force remains applied over time until cleared with `PhysicsServer2D.body_set_constant_force(body, Vector2(0, 0))`.  
         *  This is equivalent to using [method body_add_constant_force] at the body's center of mass.  
         */
        static bodyAddConstantCentralForce(body: Rid, force: Vector2): void
        
        /** Adds a constant positioned force to the body. The force can affect rotation if [param position] is different from the body's center of mass. The force remains applied over time until cleared with `PhysicsServer2D.body_set_constant_force(body, Vector2(0, 0))`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyAddConstantForce(body: Rid, force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Adds a constant rotational force to the body. The force does not affect position. The force remains applied over time until cleared with `PhysicsServer2D.body_set_constant_torque(body, 0)`. */
        static bodyAddConstantTorque(body: Rid, torque: float64): void
        
        /** Sets the body's total constant positional force applied during each physics update.  
         *  See [method body_add_constant_force] and [method body_add_constant_central_force].  
         */
        static bodySetConstantForce(body: Rid, force: Vector2): void
        
        /** Returns the body's total constant positional force applied during each physics update.  
         *  See [method body_add_constant_force] and [method body_add_constant_central_force].  
         */
        static bodyGetConstantForce(body: Rid): Vector2
        
        /** Sets the body's total constant rotational force applied during each physics update.  
         *  See [method body_add_constant_torque].  
         */
        static bodySetConstantTorque(body: Rid, torque: float64): void
        
        /** Returns the body's total constant rotational force applied during each physics update.  
         *  See [method body_add_constant_torque].  
         */
        static bodyGetConstantTorque(body: Rid): float64
        
        /** Modifies the body's linear velocity so that its projection to the axis `axis_velocity.normalized()` is exactly `axis_velocity.length()`. This is useful for jumping behavior. */
        static bodySetAxisVelocity(body: Rid, axisVelocity: Vector2): void
        
        /** Adds [param excepted_body] to the body's list of collision exceptions, so that collisions with it are ignored. */
        static bodyAddCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Removes [param excepted_body] from the body's list of collision exceptions, so that collisions with it are no longer ignored. */
        static bodyRemoveCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Sets the maximum number of contacts that the body can report. If [param amount] is greater than zero, then the body will keep track of at most this many contacts with other bodies. */
        static bodySetMaxContactsReported(body: Rid, amount: int64): void
        
        /** Returns the maximum number of contacts that the body can report. See [method body_set_max_contacts_reported]. */
        static bodyGetMaxContactsReported(body: Rid): int64
        
        /** Sets whether the body omits the standard force integration. If [param enable] is `true`, the body will not automatically use applied forces, torques, and damping to update the body's linear and angular velocity. In this case, [method body_set_force_integration_callback] can be used to manually update the linear and angular velocity instead.  
         *  This method is called when the property [member RigidBody2D.custom_integrator] is set.  
         */
        static bodySetOmitForceIntegration(body: Rid, enable: boolean): void
        
        /** Returns `true` if the body is omitting the standard force integration. See [method body_set_omit_force_integration]. */
        static bodyIsOmittingForceIntegration(body: Rid): boolean
        
        /** Sets the body's state synchronization callback function to [param callable]. Use an empty [Callable] ([code skip-lint]Callable()`) to clear the callback.  
         *  The function [param callable] will be called every physics frame, assuming that the body was active during the previous physics tick, and can be used to fetch the latest state from the physics server.  
         *  The function [param callable] must take the following parameters:  
         *  1. `state`: a [PhysicsDirectBodyState2D], used to retrieve the body's state.  
         */
        static bodySetStateSyncCallback(body: Rid, callable: Callable): void
        
        /** Sets the body's custom force integration callback function to [param callable]. Use an empty [Callable] ([code skip-lint]Callable()`) to clear the custom callback.  
         *  The function [param callable] will be called every physics tick, before the standard force integration (see [method body_set_omit_force_integration]). It can be used for example to update the body's linear and angular velocity based on contact with other bodies.  
         *  If [param userdata] is not `null`, the function [param callable] must take the following two parameters:  
         *  1. `state`: a [PhysicsDirectBodyState2D] used to retrieve and modify the body's state,  
         *  2. [code skip-lint]userdata`: a [Variant]; its value will be the [param userdata] passed into this method.  
         *  If [param userdata] is `null`, then [param callable] must take only the `state` parameter.  
         */
        static bodySetForceIntegrationCallback(body: Rid, callable: Callable, userdata?: any /* = {} */): void
        
        /** Returns `true` if a collision would result from moving the body along a motion vector from a given point in space. See [PhysicsTestMotionParameters2D] for the available motion parameters. Optionally a [PhysicsTestMotionResult2D] object can be passed, which will be used to store the information about the resulting collision. */
        static bodyTestMotion(body: Rid, parameters: PhysicsTestMotionParameters2D, result?: PhysicsTestMotionResult2D): boolean
        
        /** Returns the [PhysicsDirectBodyState2D] of the body. Returns `null` if the body is destroyed or not assigned to a space. */
        static bodyGetDirectState(body: Rid): null | PhysicsDirectBodyState2D
        
        /** Creates a 2D joint in the physics server, and returns the [RID] that identifies it. To set the joint type, use [method joint_make_damped_spring], [method joint_make_groove] or [method joint_make_pin]. Use [method joint_set_param] to set generic joint parameters. */
        static jointCreate(): Rid
        
        /** Destroys the joint with the given [RID], creates a new uninitialized joint, and makes the [RID] refer to this new joint. */
        static jointClear(joint: Rid): void
        
        /** Sets the value of the given joint parameter. */
        static jointSetParam(joint: Rid, param: PhysicsServer2D.JointParam, value: float64): void
        
        /** Returns the value of the given joint parameter. */
        static jointGetParam(joint: Rid, param: PhysicsServer2D.JointParam): float64
        
        /** Sets whether the bodies attached to the [Joint2D] will collide with each other. */
        static jointDisableCollisionsBetweenBodies(joint: Rid, disable: boolean): void
        
        /** Returns whether the bodies attached to the [Joint2D] will collide with each other. */
        static jointIsDisabledCollisionsBetweenBodies(joint: Rid): boolean
        
        /** Makes the joint a pin joint. If [param body_b] is an empty [RID], then [param body_a] is pinned to the point [param anchor] (given in global coordinates); otherwise, [param body_a] is pinned to [param body_b] at the point [param anchor] (given in global coordinates). To set the parameters which are specific to the pin joint, see [method pin_joint_set_param]. */
        static jointMakePin(joint: Rid, anchor: Vector2, bodyA: Rid, bodyB?: Rid /* = new Rid() */): void
        
        /** Makes the joint a groove joint. */
        static jointMakeGroove(joint: Rid, groove1A: Vector2, groove2A: Vector2, anchorB: Vector2, bodyA?: Rid /* = new Rid() */, bodyB?: Rid /* = new Rid() */): void
        
        /** Makes the joint a damped spring joint, attached at the point [param anchor_a] (given in global coordinates) on the body [param body_a] and at the point [param anchor_b] (given in global coordinates) on the body [param body_b]. To set the parameters which are specific to the damped spring, see [method damped_spring_joint_set_param]. */
        static jointMakeDampedSpring(joint: Rid, anchorA: Vector2, anchorB: Vector2, bodyA: Rid, bodyB?: Rid /* = new Rid() */): void
        
        /** Sets a pin joint flag. */
        static pinJointSetFlag(joint: Rid, flag: PhysicsServer2D.PinJointFlag, enabled: boolean): void
        
        /** Gets a pin joint flag. */
        static pinJointGetFlag(joint: Rid, flag: PhysicsServer2D.PinJointFlag): boolean
        
        /** Sets a pin joint parameter. */
        static pinJointSetParam(joint: Rid, param: PhysicsServer2D.PinJointParam, value: float64): void
        
        /** Returns the value of a pin joint parameter. */
        static pinJointGetParam(joint: Rid, param: PhysicsServer2D.PinJointParam): float64
        
        /** Sets the value of the given damped spring joint parameter. */
        static dampedSpringJointSetParam(joint: Rid, param: PhysicsServer2D.DampedSpringParam, value: float64): void
        
        /** Returns the value of the given damped spring joint parameter. */
        static dampedSpringJointGetParam(joint: Rid, param: PhysicsServer2D.DampedSpringParam): float64
        
        /** Returns the joint's type. */
        static jointGetType(joint: Rid): PhysicsServer2D.JointType
        
        /** Destroys any of the objects created by PhysicsServer2D. If the [RID] passed is not one of the objects that can be created by PhysicsServer2D, an error will be printed to the console. */
        static freeRid(rid: Rid): void
        
        /** Activates or deactivates the 2D physics server. If [param active] is `false`, then the physics server will not do anything in its physics step. */
        static setActive(active: boolean): void
        
        /** Returns the value of a physics engine state specified by [param process_info]. */
        static getProcessInfo(processInfo: PhysicsServer2D.ProcessInfo): int64
        static readonly _debugChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer2D;
    }
    // _singleton_class_: PhysicsServer3D
    namespace PhysicsServer3D {
        enum JointType {
            JointTypePin = 0,
            JointTypeHinge = 1,
            JointTypeSlider = 2,
            JointTypeConeTwist = 3,
            JointType6Dof = 4,
            JointTypeMax = 5,
        }
        enum PinJointParam {
            PinJointBias = 0,
            PinJointDamping = 1,
            PinJointImpulseClamp = 2,
        }
        enum HingeJointParam {
            HingeJointBias = 0,
            HingeJointLimitUpper = 1,
            HingeJointLimitLower = 2,
            HingeJointLimitBias = 3,
            HingeJointLimitSoftness = 4,
            HingeJointLimitRelaxation = 5,
            HingeJointMotorTargetVelocity = 6,
            HingeJointMotorMaxImpulse = 7,
        }
        enum HingeJointFlag {
            HingeJointFlagUseLimit = 0,
            HingeJointFlagEnableMotor = 1,
        }
        enum SliderJointParam {
            SliderJointLinearLimitUpper = 0,
            SliderJointLinearLimitLower = 1,
            SliderJointLinearLimitSoftness = 2,
            SliderJointLinearLimitRestitution = 3,
            SliderJointLinearLimitDamping = 4,
            SliderJointLinearMotionSoftness = 5,
            SliderJointLinearMotionRestitution = 6,
            SliderJointLinearMotionDamping = 7,
            SliderJointLinearOrthogonalSoftness = 8,
            SliderJointLinearOrthogonalRestitution = 9,
            SliderJointLinearOrthogonalDamping = 10,
            SliderJointAngularLimitUpper = 11,
            SliderJointAngularLimitLower = 12,
            SliderJointAngularLimitSoftness = 13,
            SliderJointAngularLimitRestitution = 14,
            SliderJointAngularLimitDamping = 15,
            SliderJointAngularMotionSoftness = 16,
            SliderJointAngularMotionRestitution = 17,
            SliderJointAngularMotionDamping = 18,
            SliderJointAngularOrthogonalSoftness = 19,
            SliderJointAngularOrthogonalRestitution = 20,
            SliderJointAngularOrthogonalDamping = 21,
            SliderJointMax = 22,
        }
        enum ConeTwistJointParam {
            ConeTwistJointSwingSpan = 0,
            ConeTwistJointTwistSpan = 1,
            ConeTwistJointBias = 2,
            ConeTwistJointSoftness = 3,
            ConeTwistJointRelaxation = 4,
        }
        enum G6DofJointAxisParam {
            G6DofJointLinearLowerLimit = 0,
            G6DofJointLinearUpperLimit = 1,
            G6DofJointLinearLimitSoftness = 2,
            G6DofJointLinearRestitution = 3,
            G6DofJointLinearDamping = 4,
            G6DofJointLinearMotorTargetVelocity = 5,
            G6DofJointLinearMotorForceLimit = 6,
            G6DofJointLinearSpringStiffness = 7,
            G6DofJointLinearSpringDamping = 8,
            G6DofJointLinearSpringEquilibriumPoint = 9,
            G6DofJointAngularLowerLimit = 10,
            G6DofJointAngularUpperLimit = 11,
            G6DofJointAngularLimitSoftness = 12,
            G6DofJointAngularDamping = 13,
            G6DofJointAngularRestitution = 14,
            G6DofJointAngularForceLimit = 15,
            G6DofJointAngularErp = 16,
            G6DofJointAngularMotorTargetVelocity = 17,
            G6DofJointAngularMotorForceLimit = 18,
            G6DofJointAngularSpringStiffness = 19,
            G6DofJointAngularSpringDamping = 20,
            G6DofJointAngularSpringEquilibriumPoint = 21,
            G6DofJointLinearDriveForceLimit = 22,
            G6DofJointAngularDriveTorqueLimit = 23,
            G6DofJointMax = 24,
        }
        enum G6DofJointAxisFlag {
            G6DofJointFlagEnableLinearLimit = 0,
            G6DofJointFlagEnableAngularLimit = 1,
            G6DofJointFlagEnableAngularSpring = 2,
            G6DofJointFlagEnableLinearSpring = 3,
            G6DofJointFlagEnableAngularMotor = 4,
            G6DofJointFlagEnableMotor = 4,
            G6DofJointFlagEnableLinearMotor = 5,
            G6DofJointFlagMax = 6,
        }
        enum ShapeType {
            ShapeWorldBoundary = 0,
            ShapeSeparationRay = 1,
            ShapeSphere = 2,
            ShapeBox = 3,
            ShapeCapsule = 4,
            ShapeCylinder = 5,
            ShapeConvexPolygon = 6,
            ShapeConcavePolygon = 7,
            ShapeHeightmap = 8,
            ShapeSoftBody = 9,
            ShapeCustom = 10,
        }
        enum AreaParameter {
            AreaParamGravityOverrideMode = 0,
            AreaParamGravity = 1,
            AreaParamGravityVector = 2,
            AreaParamGravityIsPoint = 3,
            AreaParamGravityPointUnitDistance = 4,
            AreaParamLinearDampOverrideMode = 5,
            AreaParamLinearDamp = 6,
            AreaParamAngularDampOverrideMode = 7,
            AreaParamAngularDamp = 8,
            AreaParamPriority = 9,
            AreaParamWindForceMagnitude = 10,
            AreaParamWindSource = 11,
            AreaParamWindDirection = 12,
            AreaParamWindAttenuationFactor = 13,
        }
        enum AreaSpaceOverrideMode {
            AreaSpaceOverrideDisabled = 0,
            AreaSpaceOverrideCombine = 1,
            AreaSpaceOverrideCombineReplace = 2,
            AreaSpaceOverrideReplace = 3,
            AreaSpaceOverrideReplaceCombine = 4,
        }
        enum BodyMode {
            BodyModeStatic = 0,
            BodyModeKinematic = 1,
            BodyModeRigid = 2,
            BodyModeRigidLinear = 3,
        }
        enum BodyParameter {
            BodyParamBounce = 0,
            BodyParamFriction = 1,
            BodyParamMass = 2,
            BodyParamInertia = 3,
            BodyParamCenterOfMass = 4,
            BodyParamGravityScale = 5,
            BodyParamLinearDampMode = 6,
            BodyParamAngularDampMode = 7,
            BodyParamLinearDamp = 8,
            BodyParamAngularDamp = 9,
            BodyParamMax = 10,
        }
        enum BodyDampMode {
            BodyDampModeCombine = 0,
            BodyDampModeReplace = 1,
        }
        enum BodyState {
            BodyStateTransform = 0,
            BodyStateLinearVelocity = 1,
            BodyStateAngularVelocity = 2,
            BodyStateSleeping = 3,
            BodyStateCanSleep = 4,
        }
        enum AreaBodyStatus {
            AreaBodyAdded = 0,
            AreaBodyRemoved = 1,
        }
        enum ProcessInfo {
            InfoActiveObjects = 0,
            InfoCollisionPairs = 1,
            InfoIslandCount = 2,
        }
        enum SpaceParameter {
            SpaceParamContactRecycleRadius = 0,
            SpaceParamContactMaxSeparation = 1,
            SpaceParamContactMaxAllowedPenetration = 2,
            SpaceParamContactDefaultBias = 3,
            SpaceParamBodyLinearVelocitySleepThreshold = 4,
            SpaceParamBodyAngularVelocitySleepThreshold = 5,
            SpaceParamBodyTimeToSleep = 6,
            SpaceParamSolverIterations = 7,
        }
        enum BodyAxis {
            BodyAxisLinearX = 1,
            BodyAxisLinearY = 2,
            BodyAxisLinearZ = 4,
            BodyAxisAngularX = 8,
            BodyAxisAngularY = 16,
            BodyAxisAngularZ = 32,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapPhysicsServer3D extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapPhysicsServer3D extends __NameMapGObject {
        world_boundary_shape_create: "worldBoundaryShapeCreate";
        separation_ray_shape_create: "separationRayShapeCreate";
        sphere_shape_create: "sphereShapeCreate";
        box_shape_create: "boxShapeCreate";
        capsule_shape_create: "capsuleShapeCreate";
        cylinder_shape_create: "cylinderShapeCreate";
        convex_polygon_shape_create: "convexPolygonShapeCreate";
        concave_polygon_shape_create: "concavePolygonShapeCreate";
        heightmap_shape_create: "heightmapShapeCreate";
        custom_shape_create: "customShapeCreate";
        shape_set_data: "shapeSetData";
        shape_set_margin: "shapeSetMargin";
        shape_get_type: "shapeGetType";
        shape_get_data: "shapeGetData";
        shape_get_margin: "shapeGetMargin";
        space_create: "spaceCreate";
        space_set_active: "spaceSetActive";
        space_is_active: "spaceIsActive";
        space_set_param: "spaceSetParam";
        space_get_param: "spaceGetParam";
        space_get_direct_state: "spaceGetDirectState";
        area_create: "areaCreate";
        area_set_space: "areaSetSpace";
        area_get_space: "areaGetSpace";
        area_add_shape: "areaAddShape";
        area_set_shape: "areaSetShape";
        area_set_shape_transform: "areaSetShapeTransform";
        area_set_shape_disabled: "areaSetShapeDisabled";
        area_get_shape_count: "areaGetShapeCount";
        area_get_shape: "areaGetShape";
        area_get_shape_transform: "areaGetShapeTransform";
        area_remove_shape: "areaRemoveShape";
        area_clear_shapes: "areaClearShapes";
        area_set_collision_layer: "areaSetCollisionLayer";
        area_get_collision_layer: "areaGetCollisionLayer";
        area_set_collision_mask: "areaSetCollisionMask";
        area_get_collision_mask: "areaGetCollisionMask";
        area_set_param: "areaSetParam";
        area_set_transform: "areaSetTransform";
        area_get_param: "areaGetParam";
        area_get_transform: "areaGetTransform";
        area_attach_object_instance_id: "areaAttachObjectInstanceId";
        area_get_object_instance_id: "areaGetObjectInstanceId";
        area_set_monitor_callback: "areaSetMonitorCallback";
        area_set_area_monitor_callback: "areaSetAreaMonitorCallback";
        area_set_monitorable: "areaSetMonitorable";
        area_set_ray_pickable: "areaSetRayPickable";
        body_create: "bodyCreate";
        body_set_space: "bodySetSpace";
        body_get_space: "bodyGetSpace";
        body_set_mode: "bodySetMode";
        body_get_mode: "bodyGetMode";
        body_set_collision_layer: "bodySetCollisionLayer";
        body_get_collision_layer: "bodyGetCollisionLayer";
        body_set_collision_mask: "bodySetCollisionMask";
        body_get_collision_mask: "bodyGetCollisionMask";
        body_set_collision_priority: "bodySetCollisionPriority";
        body_get_collision_priority: "bodyGetCollisionPriority";
        body_add_shape: "bodyAddShape";
        body_set_shape: "bodySetShape";
        body_set_shape_transform: "bodySetShapeTransform";
        body_set_shape_disabled: "bodySetShapeDisabled";
        body_get_shape_count: "bodyGetShapeCount";
        body_get_shape: "bodyGetShape";
        body_get_shape_transform: "bodyGetShapeTransform";
        body_remove_shape: "bodyRemoveShape";
        body_clear_shapes: "bodyClearShapes";
        body_attach_object_instance_id: "bodyAttachObjectInstanceId";
        body_get_object_instance_id: "bodyGetObjectInstanceId";
        body_set_enable_continuous_collision_detection: "bodySetEnableContinuousCollisionDetection";
        body_is_continuous_collision_detection_enabled: "bodyIsContinuousCollisionDetectionEnabled";
        body_set_param: "bodySetParam";
        body_get_param: "bodyGetParam";
        body_reset_mass_properties: "bodyResetMassProperties";
        body_set_state: "bodySetState";
        body_get_state: "bodyGetState";
        body_apply_central_impulse: "bodyApplyCentralImpulse";
        body_apply_impulse: "bodyApplyImpulse";
        body_apply_torque_impulse: "bodyApplyTorqueImpulse";
        body_apply_central_force: "bodyApplyCentralForce";
        body_apply_force: "bodyApplyForce";
        body_apply_torque: "bodyApplyTorque";
        body_add_constant_central_force: "bodyAddConstantCentralForce";
        body_add_constant_force: "bodyAddConstantForce";
        body_add_constant_torque: "bodyAddConstantTorque";
        body_set_constant_force: "bodySetConstantForce";
        body_get_constant_force: "bodyGetConstantForce";
        body_set_constant_torque: "bodySetConstantTorque";
        body_get_constant_torque: "bodyGetConstantTorque";
        body_set_axis_velocity: "bodySetAxisVelocity";
        body_set_axis_lock: "bodySetAxisLock";
        body_is_axis_locked: "bodyIsAxisLocked";
        body_add_collision_exception: "bodyAddCollisionException";
        body_remove_collision_exception: "bodyRemoveCollisionException";
        body_set_max_contacts_reported: "bodySetMaxContactsReported";
        body_get_max_contacts_reported: "bodyGetMaxContactsReported";
        body_set_omit_force_integration: "bodySetOmitForceIntegration";
        body_is_omitting_force_integration: "bodyIsOmittingForceIntegration";
        body_set_state_sync_callback: "bodySetStateSyncCallback";
        body_set_force_integration_callback: "bodySetForceIntegrationCallback";
        body_set_ray_pickable: "bodySetRayPickable";
        body_test_motion: "bodyTestMotion";
        body_get_direct_state: "bodyGetDirectState";
        soft_body_create: "softBodyCreate";
        soft_body_update_rendering_server: "softBodyUpdateRenderingServer";
        soft_body_set_space: "softBodySetSpace";
        soft_body_get_space: "softBodyGetSpace";
        soft_body_set_mesh: "softBodySetMesh";
        soft_body_get_bounds: "softBodyGetBounds";
        soft_body_set_collision_layer: "softBodySetCollisionLayer";
        soft_body_get_collision_layer: "softBodyGetCollisionLayer";
        soft_body_set_collision_mask: "softBodySetCollisionMask";
        soft_body_get_collision_mask: "softBodyGetCollisionMask";
        soft_body_add_collision_exception: "softBodyAddCollisionException";
        soft_body_remove_collision_exception: "softBodyRemoveCollisionException";
        soft_body_set_state: "softBodySetState";
        soft_body_get_state: "softBodyGetState";
        soft_body_set_transform: "softBodySetTransform";
        soft_body_set_ray_pickable: "softBodySetRayPickable";
        soft_body_set_simulation_precision: "softBodySetSimulationPrecision";
        soft_body_get_simulation_precision: "softBodyGetSimulationPrecision";
        soft_body_set_total_mass: "softBodySetTotalMass";
        soft_body_get_total_mass: "softBodyGetTotalMass";
        soft_body_set_linear_stiffness: "softBodySetLinearStiffness";
        soft_body_get_linear_stiffness: "softBodyGetLinearStiffness";
        soft_body_set_shrinking_factor: "softBodySetShrinkingFactor";
        soft_body_get_shrinking_factor: "softBodyGetShrinkingFactor";
        soft_body_set_pressure_coefficient: "softBodySetPressureCoefficient";
        soft_body_get_pressure_coefficient: "softBodyGetPressureCoefficient";
        soft_body_set_damping_coefficient: "softBodySetDampingCoefficient";
        soft_body_get_damping_coefficient: "softBodyGetDampingCoefficient";
        soft_body_set_drag_coefficient: "softBodySetDragCoefficient";
        soft_body_get_drag_coefficient: "softBodyGetDragCoefficient";
        soft_body_move_point: "softBodyMovePoint";
        soft_body_get_point_global_position: "softBodyGetPointGlobalPosition";
        soft_body_remove_all_pinned_points: "softBodyRemoveAllPinnedPoints";
        soft_body_pin_point: "softBodyPinPoint";
        soft_body_is_point_pinned: "softBodyIsPointPinned";
        soft_body_apply_point_impulse: "softBodyApplyPointImpulse";
        soft_body_apply_point_force: "softBodyApplyPointForce";
        soft_body_apply_central_impulse: "softBodyApplyCentralImpulse";
        soft_body_apply_central_force: "softBodyApplyCentralForce";
        joint_create: "jointCreate";
        joint_clear: "jointClear";
        joint_make_pin: "jointMakePin";
        pin_joint_set_param: "pinJointSetParam";
        pin_joint_get_param: "pinJointGetParam";
        pin_joint_set_local_a: "pinJointSetLocalA";
        pin_joint_get_local_a: "pinJointGetLocalA";
        pin_joint_set_local_b: "pinJointSetLocalB";
        pin_joint_get_local_b: "pinJointGetLocalB";
        joint_make_hinge: "jointMakeHinge";
        hinge_joint_set_param: "hingeJointSetParam";
        hinge_joint_get_param: "hingeJointGetParam";
        hinge_joint_set_flag: "hingeJointSetFlag";
        hinge_joint_get_flag: "hingeJointGetFlag";
        joint_make_slider: "jointMakeSlider";
        slider_joint_set_param: "sliderJointSetParam";
        slider_joint_get_param: "sliderJointGetParam";
        joint_make_cone_twist: "jointMakeConeTwist";
        cone_twist_joint_set_param: "coneTwistJointSetParam";
        cone_twist_joint_get_param: "coneTwistJointGetParam";
        joint_get_type: "jointGetType";
        joint_set_solver_priority: "jointSetSolverPriority";
        joint_get_solver_priority: "jointGetSolverPriority";
        joint_disable_collisions_between_bodies: "jointDisableCollisionsBetweenBodies";
        joint_is_disabled_collisions_between_bodies: "jointIsDisabledCollisionsBetweenBodies";
        joint_make_generic_6dof: "jointMakeGeneric6Dof";
        generic_6dof_joint_set_param: "generic6DofJointSetParam";
        generic_6dof_joint_get_param: "generic6DofJointGetParam";
        generic_6dof_joint_set_flag: "generic6DofJointSetFlag";
        generic_6dof_joint_get_flag: "generic6DofJointGetFlag";
        generic_6dof_joint_set_angular_target_rotation: "generic6DofJointSetAngularTargetRotation";
        generic_6dof_joint_get_angular_target_rotation: "generic6DofJointGetAngularTargetRotation";
        free_rid: "freeRid";
        set_active: "setActive";
        get_process_info: "getProcessInfo";
        _debug_changed: "_debugChanged";
    }
    /** A server interface for low-level 3D physics access.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_physicsserver3d.html  
     */
    class PhysicsServer3D extends GObject {
        /** Creates a 3D world boundary shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the shape's normal direction and distance properties. */
        static worldBoundaryShapeCreate(): Rid
        
        /** Creates a 3D separation ray shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the shape's `length` and `slide_on_slope` properties. */
        static separationRayShapeCreate(): Rid
        
        /** Creates a 3D sphere shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the sphere's radius. */
        static sphereShapeCreate(): Rid
        
        /** Creates a 3D box shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the box's half-extents. */
        static boxShapeCreate(): Rid
        
        /** Creates a 3D capsule shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the capsule's height and radius. */
        static capsuleShapeCreate(): Rid
        
        /** Creates a 3D cylinder shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the cylinder's height and radius. */
        static cylinderShapeCreate(): Rid
        
        /** Creates a 3D convex polygon shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the convex polygon's points. */
        static convexPolygonShapeCreate(): Rid
        
        /** Creates a 3D concave polygon shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the concave polygon's triangles. */
        static concavePolygonShapeCreate(): Rid
        
        /** Creates a 3D heightmap shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the heightmap's data. */
        static heightmapShapeCreate(): Rid
        
        /** Creates a custom shape in the physics server, and returns the [RID] that identifies it. Use [method shape_set_data] to set the shape's data.  
         *      
         *  **Note:** Custom shapes are not supported by the built-in physics servers, so calling this method always produces an error when using Godot Physics or Jolt Physics. Custom physics servers implemented as GDExtensions may support a custom shape.  
         */
        static customShapeCreate(): Rid
        
        /** Sets the shape data that configures the shape. The [param data] to be passed depends on the shape's type (see [method shape_get_type]):  
         *  - [constant SHAPE_WORLD_BOUNDARY]: a [Plane],  
         *  - [constant SHAPE_SEPARATION_RAY]: a dictionary containing the key `"length"` with a [float] value and the key `"slide_on_slope"` with a [bool] value,  
         *  - [constant SHAPE_SPHERE]: a [float] that is the radius of the sphere,  
         *  - [constant SHAPE_BOX]: a [Vector3] containing the half-extents of the box,  
         *  - [constant SHAPE_CAPSULE]: a dictionary containing the keys `"height"` and `"radius"` with [float] values,  
         *  - [constant SHAPE_CYLINDER]: a dictionary containing the keys `"height"` and `"radius"` with [float] values,  
         *  - [constant SHAPE_CONVEX_POLYGON]: a [PackedVector3Array] of points defining a convex polygon (the shape will be the convex hull of the points),  
         *  - [constant SHAPE_CONCAVE_POLYGON]: a dictionary containing the key `"faces"` with a [PackedVector3Array] value (with a length divisible by 3, so that each 3-tuple of points forms a face) and the key `"backface_collision"` with a [bool] value,  
         *  - [constant SHAPE_HEIGHTMAP]: a dictionary containing the keys `"width"` and `"depth"` with [int] values, and the key `"heights"` with a value that is a packed array of [float]s of length `width * depth` (that is a [PackedFloat32Array], or a [PackedFloat64Array] if Godot was compiled with the `precision=double` option), and optionally the keys `"min_height"` and `"max_height"` with [float] values,  
         *  - [constant SHAPE_SOFT_BODY]: the input [param data] is ignored and this method has no effect,  
         *  - [constant SHAPE_CUSTOM]: the input [param data] is interpreted by a custom physics server, if it supports custom shapes.  
         */
        static shapeSetData(shape: Rid, data: any): void
        
        /** Sets the collision margin for the shape.  
         *      
         *  **Note:** This is not used in Godot Physics.  
         */
        static shapeSetMargin(shape: Rid, margin: float64): void
        
        /** Returns the shape's type. */
        static shapeGetType(shape: Rid): PhysicsServer3D.ShapeType
        
        /** Returns the shape data that configures the shape, such as the half-extents of a box or the triangles of a concave (trimesh) shape. See [method shape_set_data] for the precise format of this data in each case. */
        static shapeGetData(shape: Rid): any
        
        /** Returns the collision margin for the shape.  
         *      
         *  **Note:** This is not used in Godot Physics, so will always return `0`.  
         */
        static shapeGetMargin(shape: Rid): float64
        
        /** Creates a space. A space is a collection of parameters for the physics engine that can be assigned to an area or a body. It can be assigned to an area with [method area_set_space], or to a body with [method body_set_space]. */
        static spaceCreate(): Rid
        
        /** Marks a space as active. It will not have an effect, unless it is assigned to an area or body. */
        static spaceSetActive(space: Rid, active: boolean): void
        
        /** Returns whether the space is active. */
        static spaceIsActive(space: Rid): boolean
        
        /** Sets the value for a space parameter. A list of available parameters is on the [enum SpaceParameter] constants. */
        static spaceSetParam(space: Rid, param: PhysicsServer3D.SpaceParameter, value: float64): void
        
        /** Returns the value of a space parameter. */
        static spaceGetParam(space: Rid, param: PhysicsServer3D.SpaceParameter): float64
        
        /** Returns the state of a space, a [PhysicsDirectSpaceState3D]. This object can be used to make collision/intersection queries. */
        static spaceGetDirectState(space: Rid): null | PhysicsDirectSpaceState3D
        
        /** Creates a 3D area object in the physics server, and returns the [RID] that identifies it. The default settings for the created area include a collision layer and mask set to `1`, and `monitorable` set to `false`.  
         *  Use [method area_add_shape] to add shapes to it, use [method area_set_transform] to set its transform, and use [method area_set_space] to add the area to a space. If you want the area to be detectable use [method area_set_monitorable].  
         */
        static areaCreate(): Rid
        
        /** Assigns a space to the area. */
        static areaSetSpace(area: Rid, space: Rid): void
        
        /** Returns the space assigned to the area. */
        static areaGetSpace(area: Rid): Rid
        
        /** Adds a shape to the area, along with a transform matrix. Shapes are usually referenced by their index, so you should track which shape has a given index. */
        static areaAddShape(area: Rid, shape: Rid, transform?: Transform3D /* = new Transform3D() */, disabled?: boolean /* = false */): void
        
        /** Substitutes a given area shape by another. The old shape is selected by its index, the new one by its [RID]. */
        static areaSetShape(area: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Sets the transform matrix for an area shape. */
        static areaSetShapeTransform(area: Rid, shapeIdx: int64, transform: Transform3D): void
        static areaSetShapeDisabled(area: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Returns the number of shapes assigned to an area. */
        static areaGetShapeCount(area: Rid): int64
        
        /** Returns the [RID] of the nth shape of an area. */
        static areaGetShape(area: Rid, shapeIdx: int64): Rid
        
        /** Returns the transform matrix of a shape within an area. */
        static areaGetShapeTransform(area: Rid, shapeIdx: int64): Transform3D
        
        /** Removes a shape from an area. It does not delete the shape, so it can be reassigned later. */
        static areaRemoveShape(area: Rid, shapeIdx: int64): void
        
        /** Removes all shapes from an area. It does not delete the shapes, so they can be reassigned later. */
        static areaClearShapes(area: Rid): void
        
        /** Assigns the area to one or many physics layers. */
        static areaSetCollisionLayer(area: Rid, layer: int64): void
        
        /** Returns the physics layer or layers an area belongs to. */
        static areaGetCollisionLayer(area: Rid): int64
        
        /** Sets which physics layers the area will monitor. */
        static areaSetCollisionMask(area: Rid, mask: int64): void
        
        /** Returns the physics layer or layers an area can contact with. */
        static areaGetCollisionMask(area: Rid): int64
        
        /** Sets the value for an area parameter. A list of available parameters is on the [enum AreaParameter] constants. */
        static areaSetParam(area: Rid, param: PhysicsServer3D.AreaParameter, value: any): void
        
        /** Sets the transform matrix for an area. */
        static areaSetTransform(area: Rid, transform: Transform3D): void
        
        /** Returns an area parameter value. A list of available parameters is on the [enum AreaParameter] constants. */
        static areaGetParam(area: Rid, param: PhysicsServer3D.AreaParameter): any
        
        /** Returns the transform matrix for an area. */
        static areaGetTransform(area: Rid): Transform3D
        
        /** Assigns the area to a descendant of [Object], so it can exist in the node tree. */
        static areaAttachObjectInstanceId(area: Rid, id: int64): void
        
        /** Gets the instance ID of the object the area is assigned to. */
        static areaGetObjectInstanceId(area: Rid): int64
        
        /** Sets the area's body monitor callback. This callback will be called when any other (shape of a) body enters or exits (a shape of) the given area, and must take the following five parameters:  
         *  1. an integer `status`: either [constant AREA_BODY_ADDED] or [constant AREA_BODY_REMOVED] depending on whether the other body shape entered or exited the area,  
         *  2. an [RID] `body_rid`: the [RID] of the body that entered or exited the area,  
         *  3. an integer `instance_id`: the `ObjectID` attached to the body,  
         *  4. an integer `body_shape_idx`: the index of the shape of the body that entered or exited the area,  
         *  5. an integer `self_shape_idx`: the index of the shape of the area where the body entered or exited.  
         *  By counting (or keeping track of) the shapes that enter and exit, it can be determined if a body (with all its shapes) is entering for the first time or exiting for the last time.  
         */
        static areaSetMonitorCallback(area: Rid, callback: Callable): void
        
        /** Sets the area's area monitor callback. This callback will be called when any other (shape of an) area enters or exits (a shape of) the given area, and must take the following five parameters:  
         *  1. an integer `status`: either [constant AREA_BODY_ADDED] or [constant AREA_BODY_REMOVED] depending on whether the other area's shape entered or exited the area,  
         *  2. an [RID] `area_rid`: the [RID] of the other area that entered or exited the area,  
         *  3. an integer `instance_id`: the `ObjectID` attached to the other area,  
         *  4. an integer `area_shape_idx`: the index of the shape of the other area that entered or exited the area,  
         *  5. an integer `self_shape_idx`: the index of the shape of the area where the other area entered or exited.  
         *  By counting (or keeping track of) the shapes that enter and exit, it can be determined if an area (with all its shapes) is entering for the first time or exiting for the last time.  
         */
        static areaSetAreaMonitorCallback(area: Rid, callback: Callable): void
        static areaSetMonitorable(area: Rid, monitorable: boolean): void
        
        /** Sets object pickable with rays. */
        static areaSetRayPickable(area: Rid, enable: boolean): void
        
        /** Creates a 3D body object in the physics server, and returns the [RID] that identifies it. The default settings for the created area include a collision layer and mask set to `1`, and body mode set to [constant BODY_MODE_RIGID].  
         *  Use [method body_add_shape] to add shapes to it, use [method body_set_state] to set its transform, and use [method body_set_space] to add the body to a space.  
         */
        static bodyCreate(): Rid
        
        /** Assigns a space to the body (see [method space_create]). */
        static bodySetSpace(body: Rid, space: Rid): void
        
        /** Returns the [RID] of the space assigned to a body. */
        static bodyGetSpace(body: Rid): Rid
        
        /** Sets the body mode. */
        static bodySetMode(body: Rid, mode: PhysicsServer3D.BodyMode): void
        
        /** Returns the body mode. */
        static bodyGetMode(body: Rid): PhysicsServer3D.BodyMode
        
        /** Sets the physics layer or layers a body belongs to. */
        static bodySetCollisionLayer(body: Rid, layer: int64): void
        
        /** Returns the physics layer or layers a body belongs to. */
        static bodyGetCollisionLayer(body: Rid): int64
        
        /** Sets the physics layer or layers a body can collide with. */
        static bodySetCollisionMask(body: Rid, mask: int64): void
        
        /** Returns the physics layer or layers a body can collide with. */
        static bodyGetCollisionMask(body: Rid): int64
        
        /** Sets the body's collision priority. */
        static bodySetCollisionPriority(body: Rid, priority: float64): void
        
        /** Returns the body's collision priority. */
        static bodyGetCollisionPriority(body: Rid): float64
        
        /** Adds a shape to the body, along with a transform matrix. Shapes are usually referenced by their index, so you should track which shape has a given index. */
        static bodyAddShape(body: Rid, shape: Rid, transform?: Transform3D /* = new Transform3D() */, disabled?: boolean /* = false */): void
        
        /** Substitutes a given body shape by another. The old shape is selected by its index, the new one by its [RID]. */
        static bodySetShape(body: Rid, shapeIdx: int64, shape: Rid): void
        
        /** Sets the transform matrix for a body shape. */
        static bodySetShapeTransform(body: Rid, shapeIdx: int64, transform: Transform3D): void
        static bodySetShapeDisabled(body: Rid, shapeIdx: int64, disabled: boolean): void
        
        /** Returns the number of shapes assigned to a body. */
        static bodyGetShapeCount(body: Rid): int64
        
        /** Returns the [RID] of the nth shape of a body. */
        static bodyGetShape(body: Rid, shapeIdx: int64): Rid
        
        /** Returns the transform matrix of a body shape. */
        static bodyGetShapeTransform(body: Rid, shapeIdx: int64): Transform3D
        
        /** Removes a shape from a body. The shape is not deleted, so it can be reused afterwards. */
        static bodyRemoveShape(body: Rid, shapeIdx: int64): void
        
        /** Removes all shapes from a body. */
        static bodyClearShapes(body: Rid): void
        
        /** Assigns the area to a descendant of [Object], so it can exist in the node tree. */
        static bodyAttachObjectInstanceId(body: Rid, id: int64): void
        
        /** Gets the instance ID of the object the area is assigned to. */
        static bodyGetObjectInstanceId(body: Rid): int64
        
        /** If `true`, the continuous collision detection mode is enabled.  
         *  Continuous collision detection tries to predict where a moving body will collide, instead of moving it and correcting its movement if it collided.  
         */
        static bodySetEnableContinuousCollisionDetection(body: Rid, enable: boolean): void
        
        /** If `true`, the continuous collision detection mode is enabled. */
        static bodyIsContinuousCollisionDetectionEnabled(body: Rid): boolean
        
        /** Sets a body parameter. A list of available parameters is on the [enum BodyParameter] constants. */
        static bodySetParam(body: Rid, param: PhysicsServer3D.BodyParameter, value: any): void
        
        /** Returns the value of a body parameter. A list of available parameters is on the [enum BodyParameter] constants. */
        static bodyGetParam(body: Rid, param: PhysicsServer3D.BodyParameter): any
        
        /** Restores the default inertia and center of mass based on shapes to cancel any custom values previously set using [method body_set_param]. */
        static bodyResetMassProperties(body: Rid): void
        
        /** Sets a body state. */
        static bodySetState(body: Rid, state: PhysicsServer3D.BodyState, value: any): void
        
        /** Returns a body state. */
        static bodyGetState(body: Rid, state: PhysicsServer3D.BodyState): any
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method body_apply_impulse] at the body's center of mass.  
         */
        static bodyApplyCentralImpulse(body: Rid, impulse: Vector3): void
        
        /** Applies a positioned impulse to the body.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyApplyImpulse(body: Rid, impulse: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational impulse to the body without affecting the position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        static bodyApplyTorqueImpulse(body: Rid, impulse: Vector3): void
        
        /** Applies a directional force without affecting rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method body_apply_force] at the body's center of mass.  
         */
        static bodyApplyCentralForce(body: Rid, force: Vector3): void
        
        /** Applies a positioned force to the body. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyApplyForce(body: Rid, force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational force without affecting position. A force is time dependent and meant to be applied every physics update. */
        static bodyApplyTorque(body: Rid, torque: Vector3): void
        
        /** Adds a constant directional force without affecting rotation that keeps being applied over time until cleared with `body_set_constant_force(body, Vector3(0, 0, 0))`.  
         *  This is equivalent to using [method body_add_constant_force] at the body's center of mass.  
         */
        static bodyAddConstantCentralForce(body: Rid, force: Vector3): void
        
        /** Adds a constant positioned force to the body that keeps being applied over time until cleared with `body_set_constant_force(body, Vector3(0, 0, 0))`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        static bodyAddConstantForce(body: Rid, force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Adds a constant rotational force without affecting position that keeps being applied over time until cleared with `body_set_constant_torque(body, Vector3(0, 0, 0))`. */
        static bodyAddConstantTorque(body: Rid, torque: Vector3): void
        
        /** Sets the body's total constant positional forces applied during each physics update.  
         *  See [method body_add_constant_force] and [method body_add_constant_central_force].  
         */
        static bodySetConstantForce(body: Rid, force: Vector3): void
        
        /** Returns the body's total constant positional forces applied during each physics update.  
         *  See [method body_add_constant_force] and [method body_add_constant_central_force].  
         */
        static bodyGetConstantForce(body: Rid): Vector3
        
        /** Sets the body's total constant rotational forces applied during each physics update.  
         *  See [method body_add_constant_torque].  
         */
        static bodySetConstantTorque(body: Rid, torque: Vector3): void
        
        /** Returns the body's total constant rotational forces applied during each physics update.  
         *  See [method body_add_constant_torque].  
         */
        static bodyGetConstantTorque(body: Rid): Vector3
        
        /** Sets an axis velocity. The velocity in the given vector axis will be set as the given vector length. This is useful for jumping behavior. */
        static bodySetAxisVelocity(body: Rid, axisVelocity: Vector3): void
        static bodySetAxisLock(body: Rid, axis: PhysicsServer3D.BodyAxis, lock: boolean): void
        static bodyIsAxisLocked(body: Rid, axis: PhysicsServer3D.BodyAxis): boolean
        
        /** Adds a body to the list of bodies exempt from collisions. */
        static bodyAddCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Removes a body from the list of bodies exempt from collisions.  
         *  Continuous collision detection tries to predict where a moving body will collide, instead of moving it and correcting its movement if it collided.  
         */
        static bodyRemoveCollisionException(body: Rid, exceptedBody: Rid): void
        
        /** Sets the maximum contacts to report. Bodies can keep a log of the contacts with other bodies. This is enabled by setting the maximum number of contacts reported to a number greater than 0. */
        static bodySetMaxContactsReported(body: Rid, amount: int64): void
        
        /** Returns the maximum contacts that can be reported. See [method body_set_max_contacts_reported]. */
        static bodyGetMaxContactsReported(body: Rid): int64
        
        /** Sets whether the body omits the standard force integration. If [param enable] is `true`, the body will not automatically use applied forces, torques, and damping to update the body's linear and angular velocity. In this case, [method body_set_force_integration_callback] can be used to manually update the linear and angular velocity instead.  
         *  This method is called when the property [member RigidBody3D.custom_integrator] is set.  
         */
        static bodySetOmitForceIntegration(body: Rid, enable: boolean): void
        
        /** Returns `true` if the body is omitting the standard force integration. See [method body_set_omit_force_integration]. */
        static bodyIsOmittingForceIntegration(body: Rid): boolean
        
        /** Sets the body's state synchronization callback function to [param callable]. Use an empty [Callable] ([code skip-lint]Callable()`) to clear the callback.  
         *  The function [param callable] will be called every physics frame, assuming that the body was active during the previous physics tick, and can be used to fetch the latest state from the physics server.  
         *  The function [param callable] must take the following parameters:  
         *  1. `state`: a [PhysicsDirectBodyState3D], used to retrieve the body's state.  
         */
        static bodySetStateSyncCallback(body: Rid, callable: Callable): void
        
        /** Sets the body's custom force integration callback function to [param callable]. Use an empty [Callable] ([code skip-lint]Callable()`) to clear the custom callback.  
         *  The function [param callable] will be called every physics tick, before the standard force integration (see [method body_set_omit_force_integration]). It can be used for example to update the body's linear and angular velocity based on contact with other bodies.  
         *  If [param userdata] is not `null`, the function [param callable] must take the following two parameters:  
         *  1. `state`: a [PhysicsDirectBodyState3D], used to retrieve and modify the body's state,  
         *  2. [code skip-lint]userdata`: a [Variant]; its value will be the [param userdata] passed into this method.  
         *  If [param userdata] is `null`, then [param callable] must take only the `state` parameter.  
         */
        static bodySetForceIntegrationCallback(body: Rid, callable: Callable, userdata?: any /* = {} */): void
        
        /** Sets the body pickable with rays if [param enable] is set. */
        static bodySetRayPickable(body: Rid, enable: boolean): void
        
        /** Returns `true` if a collision would result from moving along a motion vector from a given point in space. [PhysicsTestMotionParameters3D] is passed to set motion parameters. [PhysicsTestMotionResult3D] can be passed to return additional information. */
        static bodyTestMotion(body: Rid, parameters: PhysicsTestMotionParameters3D, result?: PhysicsTestMotionResult3D): boolean
        
        /** Returns the [PhysicsDirectBodyState3D] of the body. Returns `null` if the body is destroyed or removed from the physics space. */
        static bodyGetDirectState(body: Rid): null | PhysicsDirectBodyState3D
        
        /** Creates a new soft body and returns its internal [RID]. */
        static softBodyCreate(): Rid
        
        /** Requests that the physics server updates the rendering server with the latest positions of the given soft body's points through the [param rendering_server_handler] interface. */
        static softBodyUpdateRenderingServer(body: Rid, renderingServerHandler: PhysicsServer3DRenderingServerHandler): void
        
        /** Assigns a space to the given soft body (see [method space_create]). */
        static softBodySetSpace(body: Rid, space: Rid): void
        
        /** Returns the [RID] of the space assigned to the given soft body. */
        static softBodyGetSpace(body: Rid): Rid
        
        /** Sets the mesh of the given soft body. */
        static softBodySetMesh(body: Rid, mesh: Rid): void
        
        /** Returns the bounds of the given soft body in global coordinates. */
        static softBodyGetBounds(body: Rid): Aabb
        
        /** Sets the physics layer or layers the given soft body belongs to. */
        static softBodySetCollisionLayer(body: Rid, layer: int64): void
        
        /** Returns the physics layer or layers that the given soft body belongs to. */
        static softBodyGetCollisionLayer(body: Rid): int64
        
        /** Sets the physics layer or layers the given soft body can collide with. */
        static softBodySetCollisionMask(body: Rid, mask: int64): void
        
        /** Returns the physics layer or layers that the given soft body can collide with. */
        static softBodyGetCollisionMask(body: Rid): int64
        
        /** Adds the given body to the list of bodies exempt from collisions. */
        static softBodyAddCollisionException(body: Rid, bodyB: Rid): void
        
        /** Removes the given body from the list of bodies exempt from collisions. */
        static softBodyRemoveCollisionException(body: Rid, bodyB: Rid): void
        
        /** Sets the given body state for the given body.  
         *      
         *  **Note:** Godot's default physics implementation does not support [constant BODY_STATE_LINEAR_VELOCITY], [constant BODY_STATE_ANGULAR_VELOCITY], [constant BODY_STATE_SLEEPING], or [constant BODY_STATE_CAN_SLEEP].  
         */
        static softBodySetState(body: Rid, state: PhysicsServer3D.BodyState, variant: any): void
        
        /** Returns the given soft body state.  
         *      
         *  **Note:** Godot's default physics implementation does not support [constant BODY_STATE_LINEAR_VELOCITY], [constant BODY_STATE_ANGULAR_VELOCITY], [constant BODY_STATE_SLEEPING], or [constant BODY_STATE_CAN_SLEEP].  
         */
        static softBodyGetState(body: Rid, state: PhysicsServer3D.BodyState): any
        
        /** Sets the global transform of the given soft body. */
        static softBodySetTransform(body: Rid, transform: Transform3D): void
        
        /** Sets whether the given soft body will be pickable when using object picking. */
        static softBodySetRayPickable(body: Rid, enable: boolean): void
        
        /** Sets the simulation precision of the given soft body. Increasing this value will improve the resulting simulation, but can affect performance. Use with care. */
        static softBodySetSimulationPrecision(body: Rid, simulationPrecision: int64): void
        
        /** Returns the simulation precision of the given soft body. */
        static softBodyGetSimulationPrecision(body: Rid): int64
        
        /** Sets the total mass for the given soft body. */
        static softBodySetTotalMass(body: Rid, totalMass: float64): void
        
        /** Returns the total mass assigned to the given soft body. */
        static softBodyGetTotalMass(body: Rid): float64
        
        /** Sets the linear stiffness of the given soft body. Higher values will result in a stiffer body, while lower values will increase the body's ability to bend. The value can be between `0.0` and `1.0` (inclusive). */
        static softBodySetLinearStiffness(body: Rid, stiffness: float64): void
        
        /** Returns the linear stiffness of the given soft body. */
        static softBodyGetLinearStiffness(body: Rid): float64
        
        /** Sets the shrinking factor of the given soft body. */
        static softBodySetShrinkingFactor(body: Rid, shrinkingFactor: float64): void
        
        /** Returns the shrinking factor of the given soft body. */
        static softBodyGetShrinkingFactor(body: Rid): float64
        
        /** Sets the pressure coefficient of the given soft body. Simulates pressure build-up from inside this body. Higher values increase the strength of this effect. */
        static softBodySetPressureCoefficient(body: Rid, pressureCoefficient: float64): void
        
        /** Returns the pressure coefficient of the given soft body. */
        static softBodyGetPressureCoefficient(body: Rid): float64
        
        /** Sets the damping coefficient of the given soft body. Higher values will slow down the body more noticeably when forces are applied. */
        static softBodySetDampingCoefficient(body: Rid, dampingCoefficient: float64): void
        
        /** Returns the damping coefficient of the given soft body. */
        static softBodyGetDampingCoefficient(body: Rid): float64
        
        /** Sets the drag coefficient of the given soft body. Higher values increase this body's air resistance.  
         *      
         *  **Note:** This value is currently unused by Godot's default physics implementation.  
         */
        static softBodySetDragCoefficient(body: Rid, dragCoefficient: float64): void
        
        /** Returns the drag coefficient of the given soft body. */
        static softBodyGetDragCoefficient(body: Rid): float64
        
        /** Moves the given soft body point to a position in global coordinates. */
        static softBodyMovePoint(body: Rid, pointIndex: int64, globalPosition: Vector3): void
        
        /** Returns the current position of the given soft body point in global coordinates. */
        static softBodyGetPointGlobalPosition(body: Rid, pointIndex: int64): Vector3
        
        /** Unpins all points of the given soft body. */
        static softBodyRemoveAllPinnedPoints(body: Rid): void
        
        /** Pins or unpins the given soft body point based on the value of [param pin].  
         *      
         *  **Note:** Pinning a point effectively makes it kinematic, preventing it from being affected by forces, but you can still move it using [method soft_body_move_point].  
         */
        static softBodyPinPoint(body: Rid, pointIndex: int64, pin: boolean): void
        
        /** Returns whether the given soft body point is pinned. */
        static softBodyIsPointPinned(body: Rid, pointIndex: int64): boolean
        
        /** Applies an impulse to a point.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        static softBodyApplyPointImpulse(body: Rid, pointIndex: int64, impulse: Vector3): void
        
        /** Applies a force to a point. A force is time dependent and meant to be applied every physics update. */
        static softBodyApplyPointForce(body: Rid, pointIndex: int64, force: Vector3): void
        
        /** Distributes and applies an impulse to all points.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         */
        static softBodyApplyCentralImpulse(body: Rid, impulse: Vector3): void
        
        /** Distributes and applies a force to all points. A force is time dependent and meant to be applied every physics update. */
        static softBodyApplyCentralForce(body: Rid, force: Vector3): void
        static jointCreate(): Rid
        static jointClear(joint: Rid): void
        static jointMakePin(joint: Rid, bodyA: Rid, localA: Vector3, bodyB: Rid, localB: Vector3): void
        
        /** Sets a pin joint parameter. */
        static pinJointSetParam(joint: Rid, param: PhysicsServer3D.PinJointParam, value: float64): void
        
        /** Gets a pin joint parameter. */
        static pinJointGetParam(joint: Rid, param: PhysicsServer3D.PinJointParam): float64
        
        /** Sets position of the joint in the local space of body a of the joint. */
        static pinJointSetLocalA(joint: Rid, localA: Vector3): void
        
        /** Returns position of the joint in the local space of body a of the joint. */
        static pinJointGetLocalA(joint: Rid): Vector3
        
        /** Sets position of the joint in the local space of body b of the joint. */
        static pinJointSetLocalB(joint: Rid, localB: Vector3): void
        
        /** Returns position of the joint in the local space of body b of the joint. */
        static pinJointGetLocalB(joint: Rid): Vector3
        static jointMakeHinge(joint: Rid, bodyA: Rid, hingeA: Transform3D, bodyB: Rid, hingeB: Transform3D): void
        
        /** Sets a hinge joint parameter. */
        static hingeJointSetParam(joint: Rid, param: PhysicsServer3D.HingeJointParam, value: float64): void
        
        /** Gets a hinge joint parameter. */
        static hingeJointGetParam(joint: Rid, param: PhysicsServer3D.HingeJointParam): float64
        
        /** Sets a hinge joint flag. */
        static hingeJointSetFlag(joint: Rid, flag: PhysicsServer3D.HingeJointFlag, enabled: boolean): void
        
        /** Gets a hinge joint flag. */
        static hingeJointGetFlag(joint: Rid, flag: PhysicsServer3D.HingeJointFlag): boolean
        static jointMakeSlider(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        
        /** Gets a slider joint parameter. */
        static sliderJointSetParam(joint: Rid, param: PhysicsServer3D.SliderJointParam, value: float64): void
        
        /** Gets a slider joint parameter. */
        static sliderJointGetParam(joint: Rid, param: PhysicsServer3D.SliderJointParam): float64
        static jointMakeConeTwist(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        
        /** Sets a cone twist joint parameter. */
        static coneTwistJointSetParam(joint: Rid, param: PhysicsServer3D.ConeTwistJointParam, value: float64): void
        
        /** Gets a cone twist joint parameter. */
        static coneTwistJointGetParam(joint: Rid, param: PhysicsServer3D.ConeTwistJointParam): float64
        
        /** Returns the type of the Joint3D. */
        static jointGetType(joint: Rid): PhysicsServer3D.JointType
        
        /** Sets the priority value of the Joint3D.  
         *      
         *  **Note:** Only supported when using GodotPhysics3D. This method has no effect when using Jolt Physics, as it does not support joint solver priority.  
         */
        static jointSetSolverPriority(joint: Rid, priority: int64): void
        
        /** Gets the priority value of the Joint3D.  
         *      
         *  **Note:** Only supported when using GodotPhysics3D. This method always returns `1` when using Jolt Physics, as it does not support joint solver priority.  
         */
        static jointGetSolverPriority(joint: Rid): int64
        
        /** Sets whether the bodies attached to the [Joint3D] will collide with each other. */
        static jointDisableCollisionsBetweenBodies(joint: Rid, disable: boolean): void
        
        /** Returns whether the bodies attached to the [Joint3D] will collide with each other. */
        static jointIsDisabledCollisionsBetweenBodies(joint: Rid): boolean
        
        /** Make the joint a generic six degrees of freedom (6DOF) joint. Use [method generic_6dof_joint_set_flag] and [method generic_6dof_joint_set_param] to set the joint's flags and parameters respectively. */
        static jointMakeGeneric6Dof(joint: Rid, bodyA: Rid, localRefA: Transform3D, bodyB: Rid, localRefB: Transform3D): void
        
        /** Sets the value of a given generic 6DOF joint parameter. */
        static generic6DofJointSetParam(joint: Rid, axis: Vector3.Axis, param: PhysicsServer3D.G6DofJointAxisParam, value: float64): void
        
        /** Returns the value of a generic 6DOF joint parameter. */
        static generic6DofJointGetParam(joint: Rid, axis: Vector3.Axis, param: PhysicsServer3D.G6DofJointAxisParam): float64
        
        /** Sets the value of a given generic 6DOF joint flag. */
        static generic6DofJointSetFlag(joint: Rid, axis: Vector3.Axis, flag: PhysicsServer3D.G6DofJointAxisFlag, enable: boolean): void
        
        /** Returns the value of a generic 6DOF joint flag. */
        static generic6DofJointGetFlag(joint: Rid, axis: Vector3.Axis, flag: PhysicsServer3D.G6DofJointAxisFlag): boolean
        
        /** Sets the target angular orientation of a generic 6DOF joint as a body-space quaternion describing the desired orientation of body B relative to body A.  
         *      
         *  **Note:** Only for Jolt backend. Other 3D physics backends may ignore this value.  
         */
        static generic6DofJointSetAngularTargetRotation(joint: Rid, targetRotation: Quaternion): void
        
        /** Returns the target angular orientation of a generic 6DOF joint as a body-space quaternion describing the desired orientation of body B relative to body A.  
         *      
         *  **Note:** Only for Jolt backend. Other 3D physics backends return the identity quaternion.  
         */
        static generic6DofJointGetAngularTargetRotation(joint: Rid): Quaternion
        
        /** Destroys any of the objects created by PhysicsServer3D. If the [RID] passed is not one of the objects that can be created by PhysicsServer3D, an error will be sent to the console. */
        static freeRid(rid: Rid): void
        
        /** Activates or deactivates the 3D physics engine. */
        static setActive(active: boolean): void
        
        /** Returns the value of a physics engine state specified by [param process_info]. */
        static getProcessInfo(processInfo: PhysicsServer3D.ProcessInfo): int64
        static readonly _debugChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapPhysicsServer3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapPhysicsServer3D;
    }
    // _singleton_class_: XRServer
    namespace XRServer {
        enum TrackerType {
            TrackerCamera = 1,
            TrackerController = 2,
            TrackerBasestation = 4,
            TrackerAnchor = 8,
            TrackerHand = 16,
            TrackerBody = 32,
            TrackerFace = 64,
            TrackerAnyKnown = 127,
            TrackerUnknown = 128,
            TrackerAny = 255,
            TrackerHead = 1,
        }
        enum RotationMode {
            ResetFullRotation = 0,
            ResetButKeepTilt = 1,
            DontResetRotation = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapXRServer extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapXRServer extends __NameMapGObject {
        get_reference_frame: "getReferenceFrame";
        clear_reference_frame: "clearReferenceFrame";
        center_on_hmd: "centerOnHmd";
        get_hmd_transform: "getHmdTransform";
        add_interface: "addInterface";
        get_interface_count: "getInterfaceCount";
        remove_interface: "removeInterface";
        get_interface: "getInterface";
        get_interfaces: "getInterfaces";
        find_interface: "findInterface";
        add_tracker: "addTracker";
        remove_tracker: "removeTracker";
        get_trackers: "getTrackers";
        get_tracker: "getTracker";
        get_camera_projections: "getCameraProjections";
        get_camera_offsets: "getCameraOffsets";
        world_scale: "worldScale";
        world_origin: "worldOrigin";
        camera_locked_to_origin: "cameraLockedToOrigin";
        primary_interface: "primaryInterface";
        reference_frame_changed: "referenceFrameChanged";
        interface_added: "interfaceAdded";
        interface_removed: "interfaceRemoved";
        tracker_added: "trackerAdded";
        tracker_updated: "trackerUpdated";
        tracker_removed: "trackerRemoved";
        world_origin_changed: "worldOriginChanged";
    }
    /** Server for AR and VR features.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_xrserver.html  
     */
    class XRServer extends GObject {
        /** Returns the reference frame transform. Mostly used internally and exposed for GDExtension build interfaces. */
        static getReferenceFrame(): Transform3D
        
        /** Clears the reference frame that was set by previous calls to [method center_on_hmd]. */
        static clearReferenceFrame(): void
        
        /** This is an important function to understand correctly. AR and VR platforms all handle positioning slightly differently.  
         *  For platforms that do not offer spatial tracking, our origin point `(0, 0, 0)` is the location of our HMD, but you have little control over the direction the player is facing in the real world.  
         *  For platforms that do offer spatial tracking, our origin point depends very much on the system. For OpenVR, our origin point is usually the center of the tracking space, on the ground. For other platforms, it's often the location of the tracking camera.  
         *  This method allows you to center your tracker on the location of the HMD. It will take the current location of the HMD and use that to adjust all your tracking data; in essence, realigning the real world to your player's current position in the game world.  
         *  For this method to produce usable results, tracking information must be available. This often takes a few frames after starting your game.  
         *  You should call this method after a few seconds have passed. For example, when the user requests a realignment of the display holding a designated button on a controller for a short period of time, or when implementing a teleport mechanism.  
         */
        static centerOnHmd(rotationMode: XRServer.RotationMode, keepHeight: boolean): void
        
        /** Returns the primary interface's transformation. */
        static getHmdTransform(): Transform3D
        
        /** Registers an [XRInterface] object. */
        static addInterface(interface: XRInterface): void
        
        /** Returns the number of interfaces currently registered with the AR/VR server. If your project supports multiple AR/VR platforms, you can look through the available interface, and either present the user with a selection or simply try to initialize each interface and use the first one that returns `true`. */
        static getInterfaceCount(): int64
        
        /** Removes this [param interface]. */
        static removeInterface(interface: XRInterface): void
        
        /** Returns the interface registered at the given [param idx] index in the list of interfaces. */
        static getInterface(idx: int64): null | XRInterface
        
        /** Returns a list of available interfaces the ID and name of each interface. */
        static getInterfaces(): GArray<GDictionary>
        
        /** Finds an interface by its [param name]. For example, if your project uses capabilities of an AR/VR platform, you can find the interface for that platform by name and initialize it. */
        static findInterface(name: string): null | XRInterface
        
        /** Registers a new [XRTracker] that tracks a physical object. */
        static addTracker(tracker: XRTracker): void
        
        /** Removes this [param tracker]. */
        static removeTracker(tracker: XRTracker): void
        
        /** Returns a dictionary of trackers for [param tracker_types]. */
        static getTrackers(trackerTypes: int64): GDictionary
        
        /** Returns the positional tracker with the given [param tracker_name]. */
        static getTracker(trackerName: StringName): null | XRTracker
        
        /** Gets an array of projection matrices for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera.  
         *  Will check our primary interface first, then check each active interface. Returns empty if no interfaces manage this tracker.  
         */
        static getCameraProjections(trackerName: StringName, aspect: float64, near: float64, far: float64): GArray<Projection>
        
        /** Gets an array of offset transforms for each view for tracker [param tracker_name]. [param tracker_name] must refer to an [XRPositionalTracker] used as a camera.  
         *  Will check our primary interface first, then check each active interface. Returns empty if no interfaces manage this tracker.  
         */
        static getCameraOffsets(trackerName: StringName): GArray<Transform3D>
        
        /** The scale of the game world compared to the real world. By default, most AR/VR platforms assume that 1 game unit corresponds to 1 real world meter. */
        static get worldScale(): float64
        static set worldScale(value: float64)
        
        /** The current origin of our tracking space in the virtual world. This is used by the renderer to properly position the camera with new tracking data.  
         *      
         *  **Note:** This property is managed by the current [XROrigin3D] node. It is exposed for access from GDExtensions.  
         */
        static get worldOrigin(): Vector3
        static set worldOrigin(value: Vector3)
        
        /** If set to `true`, the scene will be rendered as if the camera is locked to the [XROrigin3D].  
         *      
         *  **Note:** This doesn't provide a very comfortable experience for users. This setting exists for doing benchmarking or automated testing, where you want to control what is rendered via code.  
         */
        static get cameraLockedToOrigin(): boolean
        static set cameraLockedToOrigin(value: boolean)
        
        /** The primary [XRInterface] currently bound to the [XRServer]. */
        static get primaryInterface(): null | GObject
        static set primaryInterface(value: null | GObject)
        
        /** Emitted when the reference frame transform changes. */
        static readonly referenceFrameChanged: Signal<() => void>
        
        /** Emitted when a new interface has been added. */
        static readonly interfaceAdded: Signal<(interfaceName: StringName) => void>
        
        /** Emitted when an interface is removed. */
        static readonly interfaceRemoved: Signal<(interfaceName: StringName) => void>
        
        /** Emitted when a new tracker has been added. If you don't use a fixed number of controllers or if you're using [XRAnchor3D]s for an AR solution, it is important to react to this signal to add the appropriate [XRController3D] or [XRAnchor3D] nodes related to this new tracker. */
        static readonly trackerAdded: Signal<(trackerName: StringName, type: int64) => void>
        
        /** Emitted when an existing tracker has been updated. This can happen if the user switches controllers. */
        static readonly trackerUpdated: Signal<(trackerName: StringName, type: int64) => void>
        
        /** Emitted when a tracker is removed. You should remove any [XRController3D] or [XRAnchor3D] points if applicable. This is not mandatory, the nodes simply become inactive and will be made active again when a new tracker becomes available (i.e. a new controller is switched on that takes the place of the previous one). */
        static readonly trackerRemoved: Signal<(trackerName: StringName, type: int64) => void>
        
        /** Emitted when the world origin transform changes. */
        static readonly worldOriginChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapXRServer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapXRServer;
    }
    namespace AesContext {
        enum Mode {
            ModeEcbEncrypt = 0,
            ModeEcbDecrypt = 1,
            ModeCbcEncrypt = 2,
            ModeCbcDecrypt = 3,
            ModeMax = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAesContext extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAesContext extends __NameMapRefCounted {
        get_iv_state: "getIVState";
    }
    class AesContext extends RefCounted {
        constructor(identifier?: any)
        start(mode: AesContext.Mode, key: PackedByteArray | byte[] | ArrayBuffer, iv?: PackedByteArray | byte[] | ArrayBuffer /* = [] */): GError
        update(src: PackedByteArray | byte[] | ArrayBuffer): PackedByteArray
        getIVState(): PackedByteArray
        finish(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAesContext;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAesContext;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAStar2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAStar2D extends __NameMapRefCounted {
        _filter_neighbor: "_filterNeighbor";
        _estimate_cost: "_estimateCost";
        _compute_cost: "_computeCost";
        get_available_point_id: "getAvailablePointId";
        add_point: "addPoint";
        get_point_position: "getPointPosition";
        set_point_position: "setPointPosition";
        get_point_weight_scale: "getPointWeightScale";
        set_point_weight_scale: "setPointWeightScale";
        remove_point: "removePoint";
        has_point: "hasPoint";
        get_point_connections: "getPointConnections";
        get_point_ids: "getPointIds";
        set_point_disabled: "setPointDisabled";
        is_point_disabled: "isPointDisabled";
        connect_points: "connectPoints";
        disconnect_points: "disconnectPoints";
        are_points_connected: "arePointsConnected";
        get_point_count: "getPointCount";
        get_point_capacity: "getPointCapacity";
        reserve_space: "reserveSpace";
        get_closest_point: "getClosestPoint";
        get_closest_position_in_segment: "getClosestPositionInSegment";
        get_point_path: "getPointPath";
        get_id_path: "getIdPath";
        neighbor_filter_enabled: "neighborFilterEnabled";
    }
    /** An implementation of A* for finding the shortest path between two vertices on a connected graph in 2D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_astar2d.html  
     */
    class AStar2D extends RefCounted {
        constructor(identifier?: any)
        /** Called when neighboring enters processing and if [member neighbor_filter_enabled] is `true`. If `true` is returned the point will not be processed.  
         *  Note that this function is hidden in the default [AStar2D] class.  
         */
        /* gdvirtual */ _filterNeighbor(fromId: int64, neighborId: int64): boolean
        
        /** Called when estimating the cost between a point and the path's ending point.  
         *  Note that this function is hidden in the default [AStar2D] class.  
         */
        /* gdvirtual */ _estimateCost(fromId: int64, endId: int64): float64
        
        /** Called when computing the cost between two connected points.  
         *  Note that this function is hidden in the default [AStar2D] class.  
         */
        /* gdvirtual */ _computeCost(fromId: int64, toId: int64): float64
        
        /** Returns the next available point ID with no point associated to it. */
        getAvailablePointId(): int64
        
        /** Adds a new point at the given position with the given identifier. The [param id] must be 0 or larger, and the [param weight_scale] must be 0.0 or greater.  
         *  The [param weight_scale] is multiplied by the result of [method _compute_cost] when determining the overall cost of traveling across a segment from a neighboring point to this point. Thus, all else being equal, the algorithm prefers points with lower [param weight_scale]s to form a path.  
         *    
         *  If there already exists a point for the given [param id], its position and weight scale are updated to the given values.  
         */
        addPoint(id: int64, position: Vector2, weightScale?: float64 /* = 1 */): void
        
        /** Returns the position of the point associated with the given [param id]. */
        getPointPosition(id: int64): Vector2
        
        /** Sets the [param position] for the point with the given [param id]. */
        setPointPosition(id: int64, position: Vector2): void
        
        /** Returns the weight scale of the point associated with the given [param id]. */
        getPointWeightScale(id: int64): float64
        
        /** Sets the [param weight_scale] for the point with the given [param id]. The [param weight_scale] is multiplied by the result of [method _compute_cost] when determining the overall cost of traveling across a segment from a neighboring point to this point. */
        setPointWeightScale(id: int64, weightScale: float64): void
        
        /** Removes the point associated with the given [param id] from the points pool. */
        removePoint(id: int64): void
        
        /** Returns whether a point associated with the given [param id] exists. */
        hasPoint(id: int64): boolean
        
        /** Returns an array with the IDs of the points that form the connection with the given point.  
         *    
         */
        getPointConnections(id: int64): PackedInt64Array
        
        /** Returns an array of all point IDs. */
        getPointIds(): PackedInt64Array
        
        /** Disables or enables the specified point for pathfinding. Useful for making a temporary obstacle. */
        setPointDisabled(id: int64, disabled?: boolean /* = true */): void
        
        /** Returns whether a point is disabled or not for pathfinding. By default, all points are enabled. */
        isPointDisabled(id: int64): boolean
        
        /** Creates a segment between the given points. If [param bidirectional] is `false`, only movement from [param id] to [param to_id] is allowed, not the reverse direction.  
         *    
         */
        connectPoints(id: int64, toId: int64, bidirectional?: boolean /* = true */): void
        
        /** Deletes the segment between the given points. If [param bidirectional] is `false`, only movement from [param id] to [param to_id] is prevented, and a unidirectional segment possibly remains. */
        disconnectPoints(id: int64, toId: int64, bidirectional?: boolean /* = true */): void
        
        /** Returns whether there is a connection/segment between the given points. If [param bidirectional] is `false`, returns whether movement from [param id] to [param to_id] is possible through this segment. */
        arePointsConnected(id: int64, toId: int64, bidirectional?: boolean /* = true */): boolean
        
        /** Returns the number of points currently in the points pool. */
        getPointCount(): int64
        
        /** Returns the capacity of the structure backing the points, useful in conjunction with [method reserve_space]. */
        getPointCapacity(): int64
        
        /** Reserves space internally for [param num_nodes] points. Useful if you're adding a known large number of points at once, such as points on a grid. */
        reserveSpace(numNodes: int64): void
        
        /** Clears all the points and segments. */
        clear(): void
        
        /** Returns the ID of the closest point to [param to_position], optionally taking disabled points into account. Returns `-1` if there are no points in the points pool.  
         *      
         *  **Note:** If several points are the closest to [param to_position], the one with the smallest ID will be returned, ensuring a deterministic result.  
         */
        getClosestPoint(toPosition: Vector2, includeDisabled?: boolean /* = false */): int64
        
        /** Returns the closest position to [param to_position] that resides inside a segment between two connected points.  
         *    
         *  The result is in the segment that goes from `y = 0` to `y = 5`. It's the closest position in the segment to the given point.  
         */
        getClosestPositionInSegment(toPosition: Vector2): Vector2
        
        /** Returns an array with the points that are in the path found by AStar2D between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** This method is not thread-safe; it can only be used from a single [Thread] at a given time. Consider using [Mutex] to ensure exclusive access to one thread to avoid race conditions.  
         *  Additionally, when [param allow_partial_path] is `true` and [param to_id] is disabled the search may take an unusually long time to finish.  
         */
        getPointPath(fromId: int64, toId: int64, allowPartialPath?: boolean /* = false */): PackedVector2Array
        
        /** Returns an array with the IDs of the points that form the path found by AStar2D between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** When [param allow_partial_path] is `true` and [param to_id] is disabled the search may take an unusually long time to finish.  
         *    
         *  If you change the 2nd point's weight to 3, then the result will be `[1, 4, 3]` instead, because now even though the distance is longer, it's "easier" to get through point 4 than through point 2.  
         */
        getIdPath(fromId: int64, toId: int64, allowPartialPath?: boolean /* = false */): PackedInt64Array
        
        /** If `true` enables the filtering of neighbors via [method _filter_neighbor]. */
        get neighborFilterEnabled(): boolean
        set neighborFilterEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAStar2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAStar2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAStar3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAStar3D extends __NameMapRefCounted {
        _filter_neighbor: "_filterNeighbor";
        _estimate_cost: "_estimateCost";
        _compute_cost: "_computeCost";
        get_available_point_id: "getAvailablePointId";
        add_point: "addPoint";
        get_point_position: "getPointPosition";
        set_point_position: "setPointPosition";
        get_point_weight_scale: "getPointWeightScale";
        set_point_weight_scale: "setPointWeightScale";
        remove_point: "removePoint";
        has_point: "hasPoint";
        get_point_connections: "getPointConnections";
        get_point_ids: "getPointIds";
        set_point_disabled: "setPointDisabled";
        is_point_disabled: "isPointDisabled";
        connect_points: "connectPoints";
        disconnect_points: "disconnectPoints";
        are_points_connected: "arePointsConnected";
        get_point_count: "getPointCount";
        get_point_capacity: "getPointCapacity";
        reserve_space: "reserveSpace";
        get_closest_point: "getClosestPoint";
        get_closest_position_in_segment: "getClosestPositionInSegment";
        get_point_path: "getPointPath";
        get_id_path: "getIdPath";
        neighbor_filter_enabled: "neighborFilterEnabled";
    }
    /** An implementation of A* for finding the shortest path between two vertices on a connected graph in 3D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_astar3d.html  
     */
    class AStar3D extends RefCounted {
        constructor(identifier?: any)
        /** Called when neighboring point enters processing and if [member neighbor_filter_enabled] is `true`. If `true` is returned the point will not be processed.  
         *  Note that this function is hidden in the default [AStar3D] class.  
         */
        /* gdvirtual */ _filterNeighbor(fromId: int64, neighborId: int64): boolean
        
        /** Called when estimating the cost between a point and the path's ending point.  
         *  Note that this function is hidden in the default [AStar3D] class.  
         */
        /* gdvirtual */ _estimateCost(fromId: int64, endId: int64): float64
        
        /** Called when computing the cost between two connected points.  
         *  Note that this function is hidden in the default [AStar3D] class.  
         */
        /* gdvirtual */ _computeCost(fromId: int64, toId: int64): float64
        
        /** Returns the next available point ID with no point associated to it. */
        getAvailablePointId(): int64
        
        /** Adds a new point at the given position with the given identifier. The [param id] must be 0 or larger, and the [param weight_scale] must be 0.0 or greater.  
         *  The [param weight_scale] is multiplied by the result of [method _compute_cost] when determining the overall cost of traveling across a segment from a neighboring point to this point. Thus, all else being equal, the algorithm prefers points with lower [param weight_scale]s to form a path.  
         *    
         *  If there already exists a point for the given [param id], its position and weight scale are updated to the given values.  
         */
        addPoint(id: int64, position: Vector3, weightScale?: float64 /* = 1 */): void
        
        /** Returns the position of the point associated with the given [param id]. */
        getPointPosition(id: int64): Vector3
        
        /** Sets the [param position] for the point with the given [param id]. */
        setPointPosition(id: int64, position: Vector3): void
        
        /** Returns the weight scale of the point associated with the given [param id]. */
        getPointWeightScale(id: int64): float64
        
        /** Sets the [param weight_scale] for the point with the given [param id]. The [param weight_scale] is multiplied by the result of [method _compute_cost] when determining the overall cost of traveling across a segment from a neighboring point to this point. */
        setPointWeightScale(id: int64, weightScale: float64): void
        
        /** Removes the point associated with the given [param id] from the points pool. */
        removePoint(id: int64): void
        
        /** Returns whether a point associated with the given [param id] exists. */
        hasPoint(id: int64): boolean
        
        /** Returns an array with the IDs of the points that form the connection with the given point.  
         *    
         */
        getPointConnections(id: int64): PackedInt64Array
        
        /** Returns an array of all point IDs. */
        getPointIds(): PackedInt64Array
        
        /** Disables or enables the specified point for pathfinding. Useful for making a temporary obstacle. */
        setPointDisabled(id: int64, disabled?: boolean /* = true */): void
        
        /** Returns whether a point is disabled or not for pathfinding. By default, all points are enabled. */
        isPointDisabled(id: int64): boolean
        
        /** Creates a segment between the given points. If [param bidirectional] is `false`, only movement from [param id] to [param to_id] is allowed, not the reverse direction.  
         *    
         */
        connectPoints(id: int64, toId: int64, bidirectional?: boolean /* = true */): void
        
        /** Deletes the segment between the given points. If [param bidirectional] is `false`, only movement from [param id] to [param to_id] is prevented, and a unidirectional segment possibly remains. */
        disconnectPoints(id: int64, toId: int64, bidirectional?: boolean /* = true */): void
        
        /** Returns whether the two given points are directly connected by a segment. If [param bidirectional] is `false`, returns whether movement from [param id] to [param to_id] is possible through this segment. */
        arePointsConnected(id: int64, toId: int64, bidirectional?: boolean /* = true */): boolean
        
        /** Returns the number of points currently in the points pool. */
        getPointCount(): int64
        
        /** Returns the capacity of the structure backing the points, useful in conjunction with [method reserve_space]. */
        getPointCapacity(): int64
        
        /** Reserves space internally for [param num_nodes] points. Useful if you're adding a known large number of points at once, such as points on a grid. */
        reserveSpace(numNodes: int64): void
        
        /** Clears all the points and segments. */
        clear(): void
        
        /** Returns the ID of the closest point to [param to_position], optionally taking disabled points into account. Returns `-1` if there are no points in the points pool.  
         *      
         *  **Note:** If several points are the closest to [param to_position], the one with the smallest ID will be returned, ensuring a deterministic result.  
         */
        getClosestPoint(toPosition: Vector3, includeDisabled?: boolean /* = false */): int64
        
        /** Returns the closest position to [param to_position] that resides inside a segment between two connected points.  
         *    
         *  The result is in the segment that goes from `y = 0` to `y = 5`. It's the closest position in the segment to the given point.  
         */
        getClosestPositionInSegment(toPosition: Vector3): Vector3
        
        /** Returns an array with the points that are in the path found by AStar3D between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** This method is not thread-safe; it can only be used from a single [Thread] at a given time. Consider using [Mutex] to ensure exclusive access to one thread to avoid race conditions.  
         *  Additionally, when [param allow_partial_path] is `true` and [param to_id] is disabled the search may take an unusually long time to finish.  
         */
        getPointPath(fromId: int64, toId: int64, allowPartialPath?: boolean /* = false */): PackedVector3Array
        
        /** Returns an array with the IDs of the points that form the path found by AStar3D between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** When [param allow_partial_path] is `true` and [param to_id] is disabled the search may take an unusually long time to finish.  
         *    
         *  If you change the 2nd point's weight to 3, then the result will be `[1, 4, 3]` instead, because now even though the distance is longer, it's "easier" to get through point 4 than through point 2.  
         */
        getIdPath(fromId: int64, toId: int64, allowPartialPath?: boolean /* = false */): PackedInt64Array
        
        /** If `true` enables the filtering of neighbors via [method _filter_neighbor]. */
        get neighborFilterEnabled(): boolean
        set neighborFilterEnabled(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAStar3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAStar3D;
    }
    namespace AStarGrid2D {
        enum Heuristic {
            HeuristicEuclidean = 0,
            HeuristicManhattan = 1,
            HeuristicOctile = 2,
            HeuristicChebyshev = 3,
            HeuristicMax = 4,
        }
        enum DiagonalMode {
            DiagonalModeAlways = 0,
            DiagonalModeNever = 1,
            DiagonalModeAtLeastOneWalkable = 2,
            DiagonalModeOnlyIfNoObstacles = 3,
            DiagonalModeMax = 4,
        }
        enum CellShape {
            CellShapeSquare = 0,
            CellShapeIsometricRight = 1,
            CellShapeIsometricDown = 2,
            CellShapeMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAStarGrid2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAStarGrid2D extends __NameMapRefCounted {
        _estimate_cost: "_estimateCost";
        _compute_cost: "_computeCost";
        is_in_bounds: "isInBounds";
        is_in_boundsv: "isInBoundsv";
        is_dirty: "isDirty";
        set_point_solid: "setPointSolid";
        is_point_solid: "isPointSolid";
        set_point_weight_scale: "setPointWeightScale";
        get_point_weight_scale: "getPointWeightScale";
        fill_solid_region: "fillSolidRegion";
        fill_weight_scale_region: "fillWeightScaleRegion";
        get_point_position: "getPointPosition";
        get_point_data_in_region: "getPointDataInRegion";
        get_point_path: "getPointPath";
        get_id_path: "getIdPath";
        cell_size: "cellSize";
        cell_shape: "cellShape";
        jumping_enabled: "jumpingEnabled";
        default_compute_heuristic: "defaultComputeHeuristic";
        default_estimate_heuristic: "defaultEstimateHeuristic";
        diagonal_mode: "diagonalMode";
    }
    /** An implementation of A* for finding the shortest path between two points on a partial 2D grid.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_astargrid2d.html  
     */
    class AStarGrid2D extends RefCounted {
        constructor(identifier?: any)
        /** Called when estimating the cost between a point and the path's ending point.  
         *  Note that this function is hidden in the default [AStarGrid2D] class.  
         */
        /* gdvirtual */ _estimateCost(fromId: Vector2I, endId: Vector2I): float64
        
        /** Called when computing the cost between two connected points.  
         *  Note that this function is hidden in the default [AStarGrid2D] class.  
         */
        /* gdvirtual */ _computeCost(fromId: Vector2I, toId: Vector2I): float64
        
        /** Returns `true` if the [param x] and [param y] is a valid grid coordinate (id), i.e. if it is inside [member region]. Equivalent to `region.has_point(Vector2i(x, y))`. */
        isInBounds(x: int64, y: int64): boolean
        
        /** Returns `true` if the [param id] vector is a valid grid coordinate, i.e. if it is inside [member region]. Equivalent to `region.has_point(id)`. */
        isInBoundsv(id: Vector2I): boolean
        
        /** Indicates that the grid parameters were changed and [method update] needs to be called. */
        isDirty(): boolean
        
        /** Updates the internal state of the grid according to the parameters to prepare it to search the path. Needs to be called if parameters like [member region], [member cell_size] or [member offset] are changed. [method is_dirty] will return `true` if this is the case and this needs to be called.  
         *      
         *  **Note:** All point data (solidity and weight scale) will be cleared.  
         */
        update(): void
        
        /** Disables or enables the specified point for pathfinding. Useful for making an obstacle. By default, all points are enabled.  
         *      
         *  **Note:** Calling [method update] is not needed after the call of this function.  
         */
        setPointSolid(id: Vector2I, solid?: boolean /* = true */): void
        
        /** Returns `true` if a point is disabled for pathfinding. By default, all points are enabled. */
        isPointSolid(id: Vector2I): boolean
        
        /** Sets the [param weight_scale] for the point with the given [param id]. The [param weight_scale] is multiplied by the result of [method _compute_cost] when determining the overall cost of traveling across a segment from a neighboring point to this point.  
         *      
         *  **Note:** Calling [method update] is not needed after the call of this function.  
         */
        setPointWeightScale(id: Vector2I, weightScale: float64): void
        
        /** Returns the weight scale of the point associated with the given [param id]. */
        getPointWeightScale(id: Vector2I): float64
        
        /** Fills the given [param region] on the grid with the specified value for the solid flag.  
         *      
         *  **Note:** Calling [method update] is not needed after the call of this function.  
         */
        fillSolidRegion(region: Rect2I, solid?: boolean /* = true */): void
        
        /** Fills the given [param region] on the grid with the specified value for the weight scale.  
         *      
         *  **Note:** Calling [method update] is not needed after the call of this function.  
         */
        fillWeightScaleRegion(region: Rect2I, weightScale: float64): void
        
        /** Clears the grid and sets the [member region] to `Rect2i(0, 0, 0, 0)`. */
        clear(): void
        
        /** Returns the position of the point associated with the given [param id]. */
        getPointPosition(id: Vector2I): Vector2
        
        /** Returns an array of dictionaries with point data (`id`: [Vector2i], `position`: [Vector2], `solid`: [bool], `weight_scale`: [float]) within a [param region]. */
        getPointDataInRegion(region: Rect2I): GArray<GDictionary>
        
        /** Returns an array with the points that are in the path found by [AStarGrid2D] between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** This method is not thread-safe; it can only be used from a single [Thread] at a given time. Consider using [Mutex] to ensure exclusive access to one thread to avoid race conditions.  
         *  Additionally, when [param allow_partial_path] is `true` and [param to_id] is solid the search may take an unusually long time to finish.  
         */
        getPointPath(fromId: Vector2I, toId: Vector2I, allowPartialPath?: boolean /* = false */): PackedVector2Array
        
        /** Returns an array with the IDs of the points that form the path found by AStar2D between the given points. The array is ordered from the starting point to the ending point of the path.  
         *  If [param from_id] point is disabled, returns an empty array (even if `from_id == to_id`).  
         *  If [param from_id] point is not disabled, there is no valid path to the target, and [param allow_partial_path] is `true`, returns a path to the point closest to the target that can be reached.  
         *      
         *  **Note:** When [param allow_partial_path] is `true` and [param to_id] is solid the search may take an unusually long time to finish.  
         */
        getIdPath(fromId: Vector2I, toId: Vector2I, allowPartialPath?: boolean /* = false */): GArray<Vector2I>
        
        /** The region of grid cells available for pathfinding. If changed, [method update] needs to be called before finding the next path. */
        get region(): Rect2I
        set region(value: Rect2I)
        
        /** The size of the grid (number of cells of size [member cell_size] on each axis). If changed, [method update] needs to be called before finding the next path. */
        get size(): Vector2I
        set size(value: Vector2I)
        
        /** The offset of the grid which will be applied to calculate the resulting point position returned by [method get_point_path]. If changed, [method update] needs to be called before finding the next path. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** The size of the point cell which will be applied to calculate the resulting point position returned by [method get_point_path]. If changed, [method update] needs to be called before finding the next path. */
        get cellSize(): Vector2
        set cellSize(value: Vector2)
        
        /** The cell shape. Affects how the positions are placed in the grid. If changed, [method update] needs to be called before finding the next path. */
        get cellShape(): int64
        set cellShape(value: int64)
        
        /** Enables or disables jumping to skip up the intermediate points and speeds up the searching algorithm.  
         *      
         *  **Note:** Currently, toggling it on disables the consideration of weight scaling in pathfinding.  
         */
        get jumpingEnabled(): boolean
        set jumpingEnabled(value: boolean)
        
        /** The default [enum Heuristic] which will be used to calculate the cost between two points if [method _compute_cost] was not overridden. */
        get defaultComputeHeuristic(): int64
        set defaultComputeHeuristic(value: int64)
        
        /** The default [enum Heuristic] which will be used to calculate the cost between the point and the end point if [method _estimate_cost] was not overridden. */
        get defaultEstimateHeuristic(): int64
        set defaultEstimateHeuristic(value: int64)
        
        /** A specific [enum DiagonalMode] mode which will force the path to avoid or accept the specified diagonals. */
        get diagonalMode(): int64
        set diagonalMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAStarGrid2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAStarGrid2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAcceptDialog extends __RPCMapWindow {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAcceptDialog extends __NameMapWindow {
        get_ok_button: "getOkButton";
        get_label: "getLabel";
        add_button: "addButton";
        add_cancel_button: "addCancelButton";
        remove_button: "removeButton";
        register_text_enter: "registerTextEnter";
        ok_button_text: "okButtonText";
        dialog_text: "dialogText";
        dialog_hide_on_ok: "dialogHideOnOk";
        dialog_close_on_escape: "dialogCloseOnEscape";
        dialog_autowrap: "dialogAutowrap";
        custom_action: "customAction";
    }
    /** A base dialog used for user notification.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_acceptdialog.html  
     */
    class AcceptDialog<Map extends NodePathMap = any> extends Window<Map> {
        constructor(identifier?: any)
        /** Returns the OK [Button] instance.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getOkButton(): null | Button
        
        /** Returns the label used for built-in text.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getLabel(): null | Label
        
        /** Adds a button with label [param text] and a custom [param action] to the dialog and returns the created button.  
         *  If [param action] is not empty, pressing the button will emit the [signal custom_action] signal with the specified action string.  
         *  If `true`, [param right] will place the button to the right of any sibling buttons.  
         *  You can use [method remove_button] method to remove a button created with this method from the dialog.  
         */
        addButton(text: string, right?: boolean /* = false */, action?: string /* = '' */): null | Button
        
        /** Adds a button with label [param name] and a cancel action to the dialog and returns the created button.  
         *  You can use [method remove_button] method to remove a button created with this method from the dialog.  
         */
        addCancelButton(name: string): null | Button
        
        /** Removes the [param button] from the dialog. Does NOT free the [param button]. The [param button] must be a [Button] added with [method add_button] or [method add_cancel_button] method. After removal, pressing the [param button] will no longer emit this dialog's [signal custom_action] or [signal canceled] signals. */
        removeButton(button: Button): void
        
        /** Registers a [LineEdit] in the dialog. When the enter key is pressed, the dialog will be accepted. */
        registerTextEnter(lineEdit: LineEdit): void
        
        /** The text displayed by the OK button (see [method get_ok_button]). If empty, a default text will be used. */
        get okButtonText(): string
        set okButtonText(value: string)
        
        /** The text displayed by the dialog. */
        get dialogText(): string
        set dialogText(value: string)
        
        /** If `true`, the dialog is hidden when the OK button is pressed. You can set it to `false` if you want to do e.g. input validation when receiving the [signal confirmed] signal, and handle hiding the dialog in your own logic.  
         *      
         *  **Note:** Some nodes derived from this class can have a different default value, and potentially their own built-in logic overriding this setting. For example [FileDialog] defaults to `false`, and has its own input validation code that is called when you press OK, which eventually hides the dialog if the input is valid. As such, this property can't be used in [FileDialog] to disable hiding the dialog when pressing OK.  
         */
        get dialogHideOnOk(): boolean
        set dialogHideOnOk(value: boolean)
        
        /** If `true`, the dialog will be hidden when the `ui_close_dialog` action is pressed (by default, this action is bound to [kbd]Escape[/kbd], or [kbd]Cmd + W[/kbd] on macOS). */
        get dialogCloseOnEscape(): boolean
        set dialogCloseOnEscape(value: boolean)
        
        /** Sets autowrapping for the text in the dialog. */
        get dialogAutowrap(): boolean
        set dialogAutowrap(value: boolean)
        
        /** Emitted when the dialog is accepted, i.e. the OK button is pressed. */
        readonly confirmed: Signal<() => void>
        
        /** Emitted when the dialog is closed or the button created with [method add_cancel_button] is pressed. */
        readonly canceled: Signal<() => void>
        
        /** Emitted when a custom button with an action is pressed. See [method add_button]. */
        readonly customAction: Signal<(action: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAcceptDialog;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAcceptDialog;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAimModifier3D extends __RPCMapBoneConstraint3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAimModifier3D extends __NameMapBoneConstraint3D {
        set_forward_axis: "setForwardAxis";
        get_forward_axis: "getForwardAxis";
        set_use_euler: "setUseEuler";
        is_using_euler: "isUsingEuler";
        set_primary_rotation_axis: "setPrimaryRotationAxis";
        get_primary_rotation_axis: "getPrimaryRotationAxis";
        set_use_secondary_rotation: "setUseSecondaryRotation";
        is_using_secondary_rotation: "isUsingSecondaryRotation";
        set_relative: "setRelative";
        is_relative: "isRelative";
        setting_count: "settingCount";
    }
    /** The [AimModifier3D] rotates a bone to look at a reference bone.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_aimmodifier3d.html  
     */
    class AimModifier3D<Map extends NodePathMap = any> extends BoneConstraint3D<Map> {
        constructor(identifier?: any)
        /** Sets the forward axis of the bone. */
        setForwardAxis(index: int64, axis: SkeletonModifier3D.BoneAxis): void
        
        /** Returns the forward axis of the bone. */
        getForwardAxis(index: int64): SkeletonModifier3D.BoneAxis
        
        /** If sets [param enabled] to `true`, it provides rotation with using euler.  
         *  If sets [param enabled] to `false`, it provides rotation with using rotation by arc generated from the forward axis vector and the vector toward the reference.  
         */
        setUseEuler(index: int64, enabled: boolean): void
        
        /** Returns `true` if it provides rotation with using euler. */
        isUsingEuler(index: int64): boolean
        
        /** Sets the axis of the first rotation. It is enabled only if [method is_using_euler] is `true`. */
        setPrimaryRotationAxis(index: int64, axis: Vector3.Axis): void
        
        /** Returns the axis of the first rotation. It is enabled only if [method is_using_euler] is `true`. */
        getPrimaryRotationAxis(index: int64): Vector3.Axis
        
        /** If sets [param enabled] to `true`, it provides rotation by two axes. It is enabled only if [method is_using_euler] is `true`. */
        setUseSecondaryRotation(index: int64, enabled: boolean): void
        
        /** Returns `true` if it provides rotation by two axes. It is enabled only if [method is_using_euler] is `true`. */
        isUsingSecondaryRotation(index: int64): boolean
        
        /** Sets relative option in the setting at [param index] to [param enabled].  
         *  If sets [param enabled] to `true`, the rotation is applied relative to the pose.  
         *  If sets [param enabled] to `false`, the rotation is applied relative to the rest. It means to replace the current pose with the [AimModifier3D]'s result.  
         */
        setRelative(index: int64, enabled: boolean): void
        
        /** Returns `true` if the relative option is enabled in the setting at [param index]. */
        isRelative(index: int64): boolean
        
        /** The number of settings in the modifier. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAimModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAimModifier3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimatableBody2D extends __RPCMapStaticBody2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimatableBody2D extends __NameMapStaticBody2D {
        sync_to_physics: "syncToPhysics";
    }
    /** A 2D physics body that can't be moved by external forces. When moved manually, it affects other bodies in its path.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animatablebody2d.html  
     */
    class AnimatableBody2D<Map extends NodePathMap = any> extends StaticBody2D<Map> {
        constructor(identifier?: any)
        /** If `true`, the body's movement will be synchronized to the physics frame. This is useful when animating movement via [AnimationPlayer], for example on moving platforms. Do **not** use together with [method PhysicsBody2D.move_and_collide]. */
        get syncToPhysics(): boolean
        set syncToPhysics(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimatableBody2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimatableBody2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimatableBody3D extends __RPCMapStaticBody3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimatableBody3D extends __NameMapStaticBody3D {
        sync_to_physics: "syncToPhysics";
    }
    /** A 3D physics body that can't be moved by external forces. When moved manually, it affects other bodies in its path.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animatablebody3d.html  
     */
    class AnimatableBody3D<Map extends NodePathMap = any> extends StaticBody3D<Map> {
        constructor(identifier?: any)
        /** If `true`, the body's movement will be synchronized to the physics frame. This is useful when animating movement via [AnimationPlayer], for example on moving platforms. Do **not** use together with [method PhysicsBody3D.move_and_collide]. */
        get syncToPhysics(): boolean
        set syncToPhysics(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimatableBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimatableBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimatedSprite2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimatedSprite2D extends __NameMapNode2D {
        is_playing: "isPlaying";
        play_backwards: "playBackwards";
        set_frame_and_progress: "setFrameAndProgress";
        get_playing_speed: "getPlayingSpeed";
        sprite_frames: "spriteFrames";
        frame_progress: "frameProgress";
        speed_scale: "speedScale";
        flip_h: "flipH";
        flip_v: "flipV";
        sprite_frames_changed: "spriteFramesChanged";
        animation_changed: "animationChanged";
        frame_changed: "frameChanged";
        animation_looped: "animationLooped";
        animation_finished: "animationFinished";
    }
    /** Sprite node that contains multiple textures as frames to play for animation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animatedsprite2d.html  
     */
    class AnimatedSprite2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns `true` if an animation is currently playing (even if [member speed_scale] and/or `custom_speed` are `0`). */
        isPlaying(): boolean
        
        /** Plays the animation with key [param name]. If [param custom_speed] is negative and [param from_end] is `true`, the animation will play backwards (which is equivalent to calling [method play_backwards]).  
         *  If this method is called with that same animation [param name], or with no [param name] parameter, the assigned animation will resume playing if it was paused.  
         */
        play(name?: StringName /* = '' */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */): void
        
        /** Plays the animation with key [param name] in reverse.  
         *  This method is a shorthand for [method play] with `custom_speed = -1.0` and `from_end = true`, so see its description for more information.  
         */
        playBackwards(name?: StringName /* = '' */): void
        
        /** Pauses the currently playing animation. The [member frame] and [member frame_progress] will be kept and calling [method play] or [method play_backwards] without arguments will resume the animation from the current playback position.  
         *  See also [method stop].  
         */
        pause(): void
        
        /** Stops the currently playing animation. The animation position is reset to `0` and the `custom_speed` is reset to `1.0`. See also [method pause]. */
        stop(): void
        
        /** Sets [member frame] and [member frame_progress] to the given values. Unlike setting [member frame], this method does not reset the [member frame_progress] to `0.0` implicitly.  
         *  **Example:** Change the animation while keeping the same [member frame] and [member frame_progress]:  
         *    
         */
        setFrameAndProgress(frame: int64, progress: float64): void
        
        /** Returns the actual playing speed of current animation or `0` if not playing. This speed is the [member speed_scale] property multiplied by `custom_speed` argument specified when calling the [method play] method.  
         *  Returns a negative value if the current animation is playing backwards.  
         */
        getPlayingSpeed(): float64
        
        /** The [SpriteFrames] resource containing the animation(s). Allows you the option to load, edit, clear, make unique and save the states of the [SpriteFrames] resource. */
        get spriteFrames(): null | SpriteFrames
        set spriteFrames(value: null | SpriteFrames)
        
        /** The current animation from the [member sprite_frames] resource. If this value is changed, the [member frame] counter and the [member frame_progress] are reset. */
        get animation(): StringName
        set animation(value: StringName)
        
        /** The key of the animation to play when the scene loads. */
        get autoplay(): StringName
        set autoplay(value: StringName)
        
        /** The displayed animation frame's index. Setting this property also resets [member frame_progress]. If this is not desired, use [method set_frame_and_progress]. */
        get frame(): int64
        set frame(value: int64)
        
        /** The progress value between `0.0` and `1.0` until the current frame transitions to the next frame. If the animation is playing backwards, the value transitions from `1.0` to `0.0`. */
        get frameProgress(): float64
        set frameProgress(value: float64)
        
        /** The speed scaling ratio. For example, if this value is `1`, then the animation plays at normal speed. If it's `0.5`, then it plays at half speed. If it's `2`, then it plays at double speed.  
         *  If set to a negative value, the animation is played in reverse. If set to `0`, the animation will not advance.  
         */
        get speedScale(): float64
        set speedScale(value: float64)
        
        /** If `true`, texture will be centered.  
         *      
         *  **Note:** For games with a pixel art aesthetic, textures may appear deformed when centered. This is caused by their position being between pixels. To prevent this, set this property to `false`, or consider enabling [member ProjectSettings.rendering/2d/snap/snap_2d_vertices_to_pixel] and [member ProjectSettings.rendering/2d/snap/snap_2d_transforms_to_pixel].  
         */
        get centered(): boolean
        set centered(value: boolean)
        
        /** The texture's drawing offset. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** If `true`, texture is flipped horizontally. */
        get flipH(): boolean
        set flipH(value: boolean)
        
        /** If `true`, texture is flipped vertically. */
        get flipV(): boolean
        set flipV(value: boolean)
        
        /** Emitted when [member sprite_frames] changes. */
        readonly spriteFramesChanged: Signal<() => void>
        
        /** Emitted when [member animation] changes. */
        readonly animationChanged: Signal<() => void>
        
        /** Emitted when [member frame] changes. */
        readonly frameChanged: Signal<() => void>
        
        /** Emitted when the animation loops. */
        readonly animationLooped: Signal<() => void>
        
        /** Emitted when the animation reaches the end, or the start if it is played in reverse. When the animation finishes, it pauses the playback.  
         *      
         *  **Note:** This signal is not emitted if an animation is looping.  
         */
        readonly animationFinished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimatedSprite2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimatedSprite2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimatedSprite3D extends __RPCMapSpriteBase3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimatedSprite3D extends __NameMapSpriteBase3D {
        is_playing: "isPlaying";
        play_backwards: "playBackwards";
        set_frame_and_progress: "setFrameAndProgress";
        get_playing_speed: "getPlayingSpeed";
        _res_changed: "_resChanged";
        sprite_frames: "spriteFrames";
        frame_progress: "frameProgress";
        speed_scale: "speedScale";
        sprite_frames_changed: "spriteFramesChanged";
        animation_changed: "animationChanged";
        frame_changed: "frameChanged";
        animation_looped: "animationLooped";
        animation_finished: "animationFinished";
    }
    /** 2D sprite node in 3D world, that can use multiple 2D textures for animation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animatedsprite3d.html  
     */
    class AnimatedSprite3D<Map extends NodePathMap = any> extends SpriteBase3D<Map> {
        constructor(identifier?: any)
        /** Returns `true` if an animation is currently playing (even if [member speed_scale] and/or `custom_speed` are `0`). */
        isPlaying(): boolean
        
        /** Plays the animation with key [param name]. If [param custom_speed] is negative and [param from_end] is `true`, the animation will play backwards (which is equivalent to calling [method play_backwards]).  
         *  If this method is called with that same animation [param name], or with no [param name] parameter, the assigned animation will resume playing if it was paused.  
         */
        play(name?: StringName /* = '' */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */): void
        
        /** Plays the animation with key [param name] in reverse.  
         *  This method is a shorthand for [method play] with `custom_speed = -1.0` and `from_end = true`, so see its description for more information.  
         */
        playBackwards(name?: StringName /* = '' */): void
        
        /** Pauses the currently playing animation. The [member frame] and [member frame_progress] will be kept and calling [method play] or [method play_backwards] without arguments will resume the animation from the current playback position.  
         *  See also [method stop].  
         */
        pause(): void
        
        /** Stops the currently playing animation. The animation position is reset to `0` and the `custom_speed` is reset to `1.0`. See also [method pause]. */
        stop(): void
        
        /** Sets [member frame] and [member frame_progress] to the given values. Unlike setting [member frame], this method does not reset the [member frame_progress] to `0.0` implicitly.  
         *  **Example:** Change the animation while keeping the same [member frame] and [member frame_progress]:  
         *    
         */
        setFrameAndProgress(frame: int64, progress: float64): void
        
        /** Returns the actual playing speed of current animation or `0` if not playing. This speed is the [member speed_scale] property multiplied by `custom_speed` argument specified when calling the [method play] method.  
         *  Returns a negative value if the current animation is playing backwards.  
         */
        getPlayingSpeed(): float64
        _resChanged(): void
        
        /** The [SpriteFrames] resource containing the animation(s). Allows you the option to load, edit, clear, make unique and save the states of the [SpriteFrames] resource. */
        get spriteFrames(): null | SpriteFrames
        set spriteFrames(value: null | SpriteFrames)
        
        /** The current animation from the [member sprite_frames] resource. If this value is changed, the [member frame] counter and the [member frame_progress] are reset. */
        get animation(): StringName
        set animation(value: StringName)
        
        /** The key of the animation to play when the scene loads. */
        get autoplay(): StringName
        set autoplay(value: StringName)
        
        /** The displayed animation frame's index. Setting this property also resets [member frame_progress]. If this is not desired, use [method set_frame_and_progress]. */
        get frame(): int64
        set frame(value: int64)
        
        /** The progress value between `0.0` and `1.0` until the current frame transitions to the next frame. If the animation is playing backwards, the value transitions from `1.0` to `0.0`. */
        get frameProgress(): float64
        set frameProgress(value: float64)
        
        /** The speed scaling ratio. For example, if this value is `1`, then the animation plays at normal speed. If it's `0.5`, then it plays at half speed. If it's `2`, then it plays at double speed.  
         *  If set to a negative value, the animation is played in reverse. If set to `0`, the animation will not advance.  
         */
        get speedScale(): float64
        set speedScale(value: float64)
        
        /** Emitted when [member sprite_frames] changes. */
        readonly spriteFramesChanged: Signal<() => void>
        
        /** Emitted when [member animation] changes. */
        readonly animationChanged: Signal<() => void>
        
        /** Emitted when [member frame] changes. */
        readonly frameChanged: Signal<() => void>
        
        /** Emitted when the animation loops. */
        readonly animationLooped: Signal<() => void>
        
        /** Emitted when the animation reaches the end, or the start if it is played in reverse. When the animation finishes, it pauses the playback.  
         *      
         *  **Note:** This signal is not emitted if an animation is looping.  
         */
        readonly animationFinished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimatedSprite3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimatedSprite3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimatedTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimatedTexture extends __NameMapTexture2D {
        set_frame_texture: "setFrameTexture";
        get_frame_texture: "getFrameTexture";
        set_frame_duration: "setFrameDuration";
        get_frame_duration: "getFrameDuration";
        current_frame: "currentFrame";
        one_shot: "oneShot";
        speed_scale: "speedScale";
        "frame_0/texture": "frame0/texture";
        "frame_0/duration": "frame0/duration";
        "frame_1/texture": "frame1/texture";
        "frame_1/duration": "frame1/duration";
        "frame_2/texture": "frame2/texture";
        "frame_2/duration": "frame2/duration";
        "frame_3/texture": "frame3/texture";
        "frame_3/duration": "frame3/duration";
        "frame_4/texture": "frame4/texture";
        "frame_4/duration": "frame4/duration";
        "frame_5/texture": "frame5/texture";
        "frame_5/duration": "frame5/duration";
        "frame_6/texture": "frame6/texture";
        "frame_6/duration": "frame6/duration";
        "frame_7/texture": "frame7/texture";
        "frame_7/duration": "frame7/duration";
        "frame_8/texture": "frame8/texture";
        "frame_8/duration": "frame8/duration";
        "frame_9/texture": "frame9/texture";
        "frame_9/duration": "frame9/duration";
        "frame_10/texture": "frame10/texture";
        "frame_10/duration": "frame10/duration";
        "frame_11/texture": "frame11/texture";
        "frame_11/duration": "frame11/duration";
        "frame_12/texture": "frame12/texture";
        "frame_12/duration": "frame12/duration";
        "frame_13/texture": "frame13/texture";
        "frame_13/duration": "frame13/duration";
        "frame_14/texture": "frame14/texture";
        "frame_14/duration": "frame14/duration";
        "frame_15/texture": "frame15/texture";
        "frame_15/duration": "frame15/duration";
        "frame_16/texture": "frame16/texture";
        "frame_16/duration": "frame16/duration";
        "frame_17/texture": "frame17/texture";
        "frame_17/duration": "frame17/duration";
        "frame_18/texture": "frame18/texture";
        "frame_18/duration": "frame18/duration";
        "frame_19/texture": "frame19/texture";
        "frame_19/duration": "frame19/duration";
        "frame_20/texture": "frame20/texture";
        "frame_20/duration": "frame20/duration";
        "frame_21/texture": "frame21/texture";
        "frame_21/duration": "frame21/duration";
        "frame_22/texture": "frame22/texture";
        "frame_22/duration": "frame22/duration";
        "frame_23/texture": "frame23/texture";
        "frame_23/duration": "frame23/duration";
        "frame_24/texture": "frame24/texture";
        "frame_24/duration": "frame24/duration";
        "frame_25/texture": "frame25/texture";
        "frame_25/duration": "frame25/duration";
        "frame_26/texture": "frame26/texture";
        "frame_26/duration": "frame26/duration";
        "frame_27/texture": "frame27/texture";
        "frame_27/duration": "frame27/duration";
        "frame_28/texture": "frame28/texture";
        "frame_28/duration": "frame28/duration";
        "frame_29/texture": "frame29/texture";
        "frame_29/duration": "frame29/duration";
        "frame_30/texture": "frame30/texture";
        "frame_30/duration": "frame30/duration";
        "frame_31/texture": "frame31/texture";
        "frame_31/duration": "frame31/duration";
        "frame_32/texture": "frame32/texture";
        "frame_32/duration": "frame32/duration";
        "frame_33/texture": "frame33/texture";
        "frame_33/duration": "frame33/duration";
        "frame_34/texture": "frame34/texture";
        "frame_34/duration": "frame34/duration";
        "frame_35/texture": "frame35/texture";
        "frame_35/duration": "frame35/duration";
        "frame_36/texture": "frame36/texture";
        "frame_36/duration": "frame36/duration";
        "frame_37/texture": "frame37/texture";
        "frame_37/duration": "frame37/duration";
        "frame_38/texture": "frame38/texture";
        "frame_38/duration": "frame38/duration";
        "frame_39/texture": "frame39/texture";
        "frame_39/duration": "frame39/duration";
        "frame_40/texture": "frame40/texture";
        "frame_40/duration": "frame40/duration";
        "frame_41/texture": "frame41/texture";
        "frame_41/duration": "frame41/duration";
        "frame_42/texture": "frame42/texture";
        "frame_42/duration": "frame42/duration";
        "frame_43/texture": "frame43/texture";
        "frame_43/duration": "frame43/duration";
        "frame_44/texture": "frame44/texture";
        "frame_44/duration": "frame44/duration";
        "frame_45/texture": "frame45/texture";
        "frame_45/duration": "frame45/duration";
        "frame_46/texture": "frame46/texture";
        "frame_46/duration": "frame46/duration";
        "frame_47/texture": "frame47/texture";
        "frame_47/duration": "frame47/duration";
        "frame_48/texture": "frame48/texture";
        "frame_48/duration": "frame48/duration";
        "frame_49/texture": "frame49/texture";
        "frame_49/duration": "frame49/duration";
        "frame_50/texture": "frame50/texture";
        "frame_50/duration": "frame50/duration";
        "frame_51/texture": "frame51/texture";
        "frame_51/duration": "frame51/duration";
        "frame_52/texture": "frame52/texture";
        "frame_52/duration": "frame52/duration";
        "frame_53/texture": "frame53/texture";
        "frame_53/duration": "frame53/duration";
        "frame_54/texture": "frame54/texture";
        "frame_54/duration": "frame54/duration";
        "frame_55/texture": "frame55/texture";
        "frame_55/duration": "frame55/duration";
        "frame_56/texture": "frame56/texture";
        "frame_56/duration": "frame56/duration";
        "frame_57/texture": "frame57/texture";
        "frame_57/duration": "frame57/duration";
        "frame_58/texture": "frame58/texture";
        "frame_58/duration": "frame58/duration";
        "frame_59/texture": "frame59/texture";
        "frame_59/duration": "frame59/duration";
        "frame_60/texture": "frame60/texture";
        "frame_60/duration": "frame60/duration";
        "frame_61/texture": "frame61/texture";
        "frame_61/duration": "frame61/duration";
        "frame_62/texture": "frame62/texture";
        "frame_62/duration": "frame62/duration";
        "frame_63/texture": "frame63/texture";
        "frame_63/duration": "frame63/duration";
        "frame_64/texture": "frame64/texture";
        "frame_64/duration": "frame64/duration";
        "frame_65/texture": "frame65/texture";
        "frame_65/duration": "frame65/duration";
        "frame_66/texture": "frame66/texture";
        "frame_66/duration": "frame66/duration";
        "frame_67/texture": "frame67/texture";
        "frame_67/duration": "frame67/duration";
        "frame_68/texture": "frame68/texture";
        "frame_68/duration": "frame68/duration";
        "frame_69/texture": "frame69/texture";
        "frame_69/duration": "frame69/duration";
        "frame_70/texture": "frame70/texture";
        "frame_70/duration": "frame70/duration";
        "frame_71/texture": "frame71/texture";
        "frame_71/duration": "frame71/duration";
        "frame_72/texture": "frame72/texture";
        "frame_72/duration": "frame72/duration";
        "frame_73/texture": "frame73/texture";
        "frame_73/duration": "frame73/duration";
        "frame_74/texture": "frame74/texture";
        "frame_74/duration": "frame74/duration";
        "frame_75/texture": "frame75/texture";
        "frame_75/duration": "frame75/duration";
        "frame_76/texture": "frame76/texture";
        "frame_76/duration": "frame76/duration";
        "frame_77/texture": "frame77/texture";
        "frame_77/duration": "frame77/duration";
        "frame_78/texture": "frame78/texture";
        "frame_78/duration": "frame78/duration";
        "frame_79/texture": "frame79/texture";
        "frame_79/duration": "frame79/duration";
        "frame_80/texture": "frame80/texture";
        "frame_80/duration": "frame80/duration";
        "frame_81/texture": "frame81/texture";
        "frame_81/duration": "frame81/duration";
        "frame_82/texture": "frame82/texture";
        "frame_82/duration": "frame82/duration";
        "frame_83/texture": "frame83/texture";
        "frame_83/duration": "frame83/duration";
        "frame_84/texture": "frame84/texture";
        "frame_84/duration": "frame84/duration";
        "frame_85/texture": "frame85/texture";
        "frame_85/duration": "frame85/duration";
        "frame_86/texture": "frame86/texture";
        "frame_86/duration": "frame86/duration";
        "frame_87/texture": "frame87/texture";
        "frame_87/duration": "frame87/duration";
        "frame_88/texture": "frame88/texture";
        "frame_88/duration": "frame88/duration";
        "frame_89/texture": "frame89/texture";
        "frame_89/duration": "frame89/duration";
        "frame_90/texture": "frame90/texture";
        "frame_90/duration": "frame90/duration";
        "frame_91/texture": "frame91/texture";
        "frame_91/duration": "frame91/duration";
        "frame_92/texture": "frame92/texture";
        "frame_92/duration": "frame92/duration";
        "frame_93/texture": "frame93/texture";
        "frame_93/duration": "frame93/duration";
        "frame_94/texture": "frame94/texture";
        "frame_94/duration": "frame94/duration";
        "frame_95/texture": "frame95/texture";
        "frame_95/duration": "frame95/duration";
        "frame_96/texture": "frame96/texture";
        "frame_96/duration": "frame96/duration";
        "frame_97/texture": "frame97/texture";
        "frame_97/duration": "frame97/duration";
        "frame_98/texture": "frame98/texture";
        "frame_98/duration": "frame98/duration";
        "frame_99/texture": "frame99/texture";
        "frame_99/duration": "frame99/duration";
        "frame_100/texture": "frame100/texture";
        "frame_100/duration": "frame100/duration";
        "frame_101/texture": "frame101/texture";
        "frame_101/duration": "frame101/duration";
        "frame_102/texture": "frame102/texture";
        "frame_102/duration": "frame102/duration";
        "frame_103/texture": "frame103/texture";
        "frame_103/duration": "frame103/duration";
        "frame_104/texture": "frame104/texture";
        "frame_104/duration": "frame104/duration";
        "frame_105/texture": "frame105/texture";
        "frame_105/duration": "frame105/duration";
        "frame_106/texture": "frame106/texture";
        "frame_106/duration": "frame106/duration";
        "frame_107/texture": "frame107/texture";
        "frame_107/duration": "frame107/duration";
        "frame_108/texture": "frame108/texture";
        "frame_108/duration": "frame108/duration";
        "frame_109/texture": "frame109/texture";
        "frame_109/duration": "frame109/duration";
        "frame_110/texture": "frame110/texture";
        "frame_110/duration": "frame110/duration";
        "frame_111/texture": "frame111/texture";
        "frame_111/duration": "frame111/duration";
        "frame_112/texture": "frame112/texture";
        "frame_112/duration": "frame112/duration";
        "frame_113/texture": "frame113/texture";
        "frame_113/duration": "frame113/duration";
        "frame_114/texture": "frame114/texture";
        "frame_114/duration": "frame114/duration";
        "frame_115/texture": "frame115/texture";
        "frame_115/duration": "frame115/duration";
        "frame_116/texture": "frame116/texture";
        "frame_116/duration": "frame116/duration";
        "frame_117/texture": "frame117/texture";
        "frame_117/duration": "frame117/duration";
        "frame_118/texture": "frame118/texture";
        "frame_118/duration": "frame118/duration";
        "frame_119/texture": "frame119/texture";
        "frame_119/duration": "frame119/duration";
        "frame_120/texture": "frame120/texture";
        "frame_120/duration": "frame120/duration";
        "frame_121/texture": "frame121/texture";
        "frame_121/duration": "frame121/duration";
        "frame_122/texture": "frame122/texture";
        "frame_122/duration": "frame122/duration";
        "frame_123/texture": "frame123/texture";
        "frame_123/duration": "frame123/duration";
        "frame_124/texture": "frame124/texture";
        "frame_124/duration": "frame124/duration";
        "frame_125/texture": "frame125/texture";
        "frame_125/duration": "frame125/duration";
        "frame_126/texture": "frame126/texture";
        "frame_126/duration": "frame126/duration";
        "frame_127/texture": "frame127/texture";
        "frame_127/duration": "frame127/duration";
        "frame_128/texture": "frame128/texture";
        "frame_128/duration": "frame128/duration";
        "frame_129/texture": "frame129/texture";
        "frame_129/duration": "frame129/duration";
        "frame_130/texture": "frame130/texture";
        "frame_130/duration": "frame130/duration";
        "frame_131/texture": "frame131/texture";
        "frame_131/duration": "frame131/duration";
        "frame_132/texture": "frame132/texture";
        "frame_132/duration": "frame132/duration";
        "frame_133/texture": "frame133/texture";
        "frame_133/duration": "frame133/duration";
        "frame_134/texture": "frame134/texture";
        "frame_134/duration": "frame134/duration";
        "frame_135/texture": "frame135/texture";
        "frame_135/duration": "frame135/duration";
        "frame_136/texture": "frame136/texture";
        "frame_136/duration": "frame136/duration";
        "frame_137/texture": "frame137/texture";
        "frame_137/duration": "frame137/duration";
        "frame_138/texture": "frame138/texture";
        "frame_138/duration": "frame138/duration";
        "frame_139/texture": "frame139/texture";
        "frame_139/duration": "frame139/duration";
        "frame_140/texture": "frame140/texture";
        "frame_140/duration": "frame140/duration";
        "frame_141/texture": "frame141/texture";
        "frame_141/duration": "frame141/duration";
        "frame_142/texture": "frame142/texture";
        "frame_142/duration": "frame142/duration";
        "frame_143/texture": "frame143/texture";
        "frame_143/duration": "frame143/duration";
        "frame_144/texture": "frame144/texture";
        "frame_144/duration": "frame144/duration";
        "frame_145/texture": "frame145/texture";
        "frame_145/duration": "frame145/duration";
        "frame_146/texture": "frame146/texture";
        "frame_146/duration": "frame146/duration";
        "frame_147/texture": "frame147/texture";
        "frame_147/duration": "frame147/duration";
        "frame_148/texture": "frame148/texture";
        "frame_148/duration": "frame148/duration";
        "frame_149/texture": "frame149/texture";
        "frame_149/duration": "frame149/duration";
        "frame_150/texture": "frame150/texture";
        "frame_150/duration": "frame150/duration";
        "frame_151/texture": "frame151/texture";
        "frame_151/duration": "frame151/duration";
        "frame_152/texture": "frame152/texture";
        "frame_152/duration": "frame152/duration";
        "frame_153/texture": "frame153/texture";
        "frame_153/duration": "frame153/duration";
        "frame_154/texture": "frame154/texture";
        "frame_154/duration": "frame154/duration";
        "frame_155/texture": "frame155/texture";
        "frame_155/duration": "frame155/duration";
        "frame_156/texture": "frame156/texture";
        "frame_156/duration": "frame156/duration";
        "frame_157/texture": "frame157/texture";
        "frame_157/duration": "frame157/duration";
        "frame_158/texture": "frame158/texture";
        "frame_158/duration": "frame158/duration";
        "frame_159/texture": "frame159/texture";
        "frame_159/duration": "frame159/duration";
        "frame_160/texture": "frame160/texture";
        "frame_160/duration": "frame160/duration";
        "frame_161/texture": "frame161/texture";
        "frame_161/duration": "frame161/duration";
        "frame_162/texture": "frame162/texture";
        "frame_162/duration": "frame162/duration";
        "frame_163/texture": "frame163/texture";
        "frame_163/duration": "frame163/duration";
        "frame_164/texture": "frame164/texture";
        "frame_164/duration": "frame164/duration";
        "frame_165/texture": "frame165/texture";
        "frame_165/duration": "frame165/duration";
        "frame_166/texture": "frame166/texture";
        "frame_166/duration": "frame166/duration";
        "frame_167/texture": "frame167/texture";
        "frame_167/duration": "frame167/duration";
        "frame_168/texture": "frame168/texture";
        "frame_168/duration": "frame168/duration";
        "frame_169/texture": "frame169/texture";
        "frame_169/duration": "frame169/duration";
        "frame_170/texture": "frame170/texture";
        "frame_170/duration": "frame170/duration";
        "frame_171/texture": "frame171/texture";
        "frame_171/duration": "frame171/duration";
        "frame_172/texture": "frame172/texture";
        "frame_172/duration": "frame172/duration";
        "frame_173/texture": "frame173/texture";
        "frame_173/duration": "frame173/duration";
        "frame_174/texture": "frame174/texture";
        "frame_174/duration": "frame174/duration";
        "frame_175/texture": "frame175/texture";
        "frame_175/duration": "frame175/duration";
        "frame_176/texture": "frame176/texture";
        "frame_176/duration": "frame176/duration";
        "frame_177/texture": "frame177/texture";
        "frame_177/duration": "frame177/duration";
        "frame_178/texture": "frame178/texture";
        "frame_178/duration": "frame178/duration";
        "frame_179/texture": "frame179/texture";
        "frame_179/duration": "frame179/duration";
        "frame_180/texture": "frame180/texture";
        "frame_180/duration": "frame180/duration";
        "frame_181/texture": "frame181/texture";
        "frame_181/duration": "frame181/duration";
        "frame_182/texture": "frame182/texture";
        "frame_182/duration": "frame182/duration";
        "frame_183/texture": "frame183/texture";
        "frame_183/duration": "frame183/duration";
        "frame_184/texture": "frame184/texture";
        "frame_184/duration": "frame184/duration";
        "frame_185/texture": "frame185/texture";
        "frame_185/duration": "frame185/duration";
        "frame_186/texture": "frame186/texture";
        "frame_186/duration": "frame186/duration";
        "frame_187/texture": "frame187/texture";
        "frame_187/duration": "frame187/duration";
        "frame_188/texture": "frame188/texture";
        "frame_188/duration": "frame188/duration";
        "frame_189/texture": "frame189/texture";
        "frame_189/duration": "frame189/duration";
        "frame_190/texture": "frame190/texture";
        "frame_190/duration": "frame190/duration";
        "frame_191/texture": "frame191/texture";
        "frame_191/duration": "frame191/duration";
        "frame_192/texture": "frame192/texture";
        "frame_192/duration": "frame192/duration";
        "frame_193/texture": "frame193/texture";
        "frame_193/duration": "frame193/duration";
        "frame_194/texture": "frame194/texture";
        "frame_194/duration": "frame194/duration";
        "frame_195/texture": "frame195/texture";
        "frame_195/duration": "frame195/duration";
        "frame_196/texture": "frame196/texture";
        "frame_196/duration": "frame196/duration";
        "frame_197/texture": "frame197/texture";
        "frame_197/duration": "frame197/duration";
        "frame_198/texture": "frame198/texture";
        "frame_198/duration": "frame198/duration";
        "frame_199/texture": "frame199/texture";
        "frame_199/duration": "frame199/duration";
        "frame_200/texture": "frame200/texture";
        "frame_200/duration": "frame200/duration";
        "frame_201/texture": "frame201/texture";
        "frame_201/duration": "frame201/duration";
        "frame_202/texture": "frame202/texture";
        "frame_202/duration": "frame202/duration";
        "frame_203/texture": "frame203/texture";
        "frame_203/duration": "frame203/duration";
        "frame_204/texture": "frame204/texture";
        "frame_204/duration": "frame204/duration";
        "frame_205/texture": "frame205/texture";
        "frame_205/duration": "frame205/duration";
        "frame_206/texture": "frame206/texture";
        "frame_206/duration": "frame206/duration";
        "frame_207/texture": "frame207/texture";
        "frame_207/duration": "frame207/duration";
        "frame_208/texture": "frame208/texture";
        "frame_208/duration": "frame208/duration";
        "frame_209/texture": "frame209/texture";
        "frame_209/duration": "frame209/duration";
        "frame_210/texture": "frame210/texture";
        "frame_210/duration": "frame210/duration";
        "frame_211/texture": "frame211/texture";
        "frame_211/duration": "frame211/duration";
        "frame_212/texture": "frame212/texture";
        "frame_212/duration": "frame212/duration";
        "frame_213/texture": "frame213/texture";
        "frame_213/duration": "frame213/duration";
        "frame_214/texture": "frame214/texture";
        "frame_214/duration": "frame214/duration";
        "frame_215/texture": "frame215/texture";
        "frame_215/duration": "frame215/duration";
        "frame_216/texture": "frame216/texture";
        "frame_216/duration": "frame216/duration";
        "frame_217/texture": "frame217/texture";
        "frame_217/duration": "frame217/duration";
        "frame_218/texture": "frame218/texture";
        "frame_218/duration": "frame218/duration";
        "frame_219/texture": "frame219/texture";
        "frame_219/duration": "frame219/duration";
        "frame_220/texture": "frame220/texture";
        "frame_220/duration": "frame220/duration";
        "frame_221/texture": "frame221/texture";
        "frame_221/duration": "frame221/duration";
        "frame_222/texture": "frame222/texture";
        "frame_222/duration": "frame222/duration";
        "frame_223/texture": "frame223/texture";
        "frame_223/duration": "frame223/duration";
        "frame_224/texture": "frame224/texture";
        "frame_224/duration": "frame224/duration";
        "frame_225/texture": "frame225/texture";
        "frame_225/duration": "frame225/duration";
        "frame_226/texture": "frame226/texture";
        "frame_226/duration": "frame226/duration";
        "frame_227/texture": "frame227/texture";
        "frame_227/duration": "frame227/duration";
        "frame_228/texture": "frame228/texture";
        "frame_228/duration": "frame228/duration";
        "frame_229/texture": "frame229/texture";
        "frame_229/duration": "frame229/duration";
        "frame_230/texture": "frame230/texture";
        "frame_230/duration": "frame230/duration";
        "frame_231/texture": "frame231/texture";
        "frame_231/duration": "frame231/duration";
        "frame_232/texture": "frame232/texture";
        "frame_232/duration": "frame232/duration";
        "frame_233/texture": "frame233/texture";
        "frame_233/duration": "frame233/duration";
        "frame_234/texture": "frame234/texture";
        "frame_234/duration": "frame234/duration";
        "frame_235/texture": "frame235/texture";
        "frame_235/duration": "frame235/duration";
        "frame_236/texture": "frame236/texture";
        "frame_236/duration": "frame236/duration";
        "frame_237/texture": "frame237/texture";
        "frame_237/duration": "frame237/duration";
        "frame_238/texture": "frame238/texture";
        "frame_238/duration": "frame238/duration";
        "frame_239/texture": "frame239/texture";
        "frame_239/duration": "frame239/duration";
        "frame_240/texture": "frame240/texture";
        "frame_240/duration": "frame240/duration";
        "frame_241/texture": "frame241/texture";
        "frame_241/duration": "frame241/duration";
        "frame_242/texture": "frame242/texture";
        "frame_242/duration": "frame242/duration";
        "frame_243/texture": "frame243/texture";
        "frame_243/duration": "frame243/duration";
        "frame_244/texture": "frame244/texture";
        "frame_244/duration": "frame244/duration";
        "frame_245/texture": "frame245/texture";
        "frame_245/duration": "frame245/duration";
        "frame_246/texture": "frame246/texture";
        "frame_246/duration": "frame246/duration";
        "frame_247/texture": "frame247/texture";
        "frame_247/duration": "frame247/duration";
        "frame_248/texture": "frame248/texture";
        "frame_248/duration": "frame248/duration";
        "frame_249/texture": "frame249/texture";
        "frame_249/duration": "frame249/duration";
        "frame_250/texture": "frame250/texture";
        "frame_250/duration": "frame250/duration";
        "frame_251/texture": "frame251/texture";
        "frame_251/duration": "frame251/duration";
        "frame_252/texture": "frame252/texture";
        "frame_252/duration": "frame252/duration";
        "frame_253/texture": "frame253/texture";
        "frame_253/duration": "frame253/duration";
        "frame_254/texture": "frame254/texture";
        "frame_254/duration": "frame254/duration";
        "frame_255/texture": "frame255/texture";
        "frame_255/duration": "frame255/duration";
    }
    /** Proxy texture for simple frame-based animations.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animatedtexture.html  
     */
    class AnimatedTexture extends Texture2D {
        /** The maximum number of frames supported by [AnimatedTexture]. If you need more frames in your animation, use [AnimationPlayer] or [AnimatedSprite2D]. */
        static readonly MAX_FRAMES = 256
        constructor(identifier?: any)
        
        /** Assigns a [Texture2D] to the given frame. Frame IDs start at 0, so the first frame has ID 0, and the last frame of the animation has ID [member frames] - 1.  
         *  You can define any number of textures up to [constant MAX_FRAMES], but keep in mind that only frames from 0 to [member frames] - 1 will be part of the animation.  
         */
        setFrameTexture(frame: int64, texture: Texture2D): void
        
        /** Returns the given frame's [Texture2D]. */
        getFrameTexture(frame: int64): null | Texture2D
        
        /** Sets the duration of any given [param frame]. The final duration is affected by the [member speed_scale]. If set to `0`, the frame is skipped during playback. */
        setFrameDuration(frame: int64, duration: float64): void
        
        /** Returns the given [param frame]'s duration, in seconds. */
        getFrameDuration(frame: int64): float64
        
        /** Number of frames to use in the animation. While you can create the frames independently with [method set_frame_texture], you need to set this value for the animation to take new frames into account. The maximum number of frames is [constant MAX_FRAMES]. */
        get frames(): int64
        set frames(value: int64)
        
        /** Sets the currently visible frame of the texture. Setting this frame while playing resets the current frame time, so the newly selected frame plays for its whole configured frame duration. */
        get currentFrame(): int64
        set currentFrame(value: int64)
        
        /** If `true`, the animation will pause where it currently is (i.e. at [member current_frame]). The animation will continue from where it was paused when changing this property to `false`. */
        get pause(): boolean
        set pause(value: boolean)
        
        /** If `true`, the animation will only play once and will not loop back to the first frame after reaching the end. Note that reaching the end will not set [member pause] to `true`. */
        get oneShot(): boolean
        set oneShot(value: boolean)
        
        /** The animation speed is multiplied by this value. If set to a negative value, the animation is played in reverse. */
        get speedScale(): float64
        set speedScale(value: float64)
        get "frame0/texture"(): null | Texture2D
        set "frame0/texture"(value: null | Texture2D)
        get "frame0/duration"(): float64
        set "frame0/duration"(value: float64)
        get "frame1/texture"(): null | Texture2D
        set "frame1/texture"(value: null | Texture2D)
        get "frame1/duration"(): float64
        set "frame1/duration"(value: float64)
        get "frame2/texture"(): null | Texture2D
        set "frame2/texture"(value: null | Texture2D)
        get "frame2/duration"(): float64
        set "frame2/duration"(value: float64)
        get "frame3/texture"(): null | Texture2D
        set "frame3/texture"(value: null | Texture2D)
        get "frame3/duration"(): float64
        set "frame3/duration"(value: float64)
        get "frame4/texture"(): null | Texture2D
        set "frame4/texture"(value: null | Texture2D)
        get "frame4/duration"(): float64
        set "frame4/duration"(value: float64)
        get "frame5/texture"(): null | Texture2D
        set "frame5/texture"(value: null | Texture2D)
        get "frame5/duration"(): float64
        set "frame5/duration"(value: float64)
        get "frame6/texture"(): null | Texture2D
        set "frame6/texture"(value: null | Texture2D)
        get "frame6/duration"(): float64
        set "frame6/duration"(value: float64)
        get "frame7/texture"(): null | Texture2D
        set "frame7/texture"(value: null | Texture2D)
        get "frame7/duration"(): float64
        set "frame7/duration"(value: float64)
        get "frame8/texture"(): null | Texture2D
        set "frame8/texture"(value: null | Texture2D)
        get "frame8/duration"(): float64
        set "frame8/duration"(value: float64)
        get "frame9/texture"(): null | Texture2D
        set "frame9/texture"(value: null | Texture2D)
        get "frame9/duration"(): float64
        set "frame9/duration"(value: float64)
        get "frame10/texture"(): null | Texture2D
        set "frame10/texture"(value: null | Texture2D)
        get "frame10/duration"(): float64
        set "frame10/duration"(value: float64)
        get "frame11/texture"(): null | Texture2D
        set "frame11/texture"(value: null | Texture2D)
        get "frame11/duration"(): float64
        set "frame11/duration"(value: float64)
        get "frame12/texture"(): null | Texture2D
        set "frame12/texture"(value: null | Texture2D)
        get "frame12/duration"(): float64
        set "frame12/duration"(value: float64)
        get "frame13/texture"(): null | Texture2D
        set "frame13/texture"(value: null | Texture2D)
        get "frame13/duration"(): float64
        set "frame13/duration"(value: float64)
        get "frame14/texture"(): null | Texture2D
        set "frame14/texture"(value: null | Texture2D)
        get "frame14/duration"(): float64
        set "frame14/duration"(value: float64)
        get "frame15/texture"(): null | Texture2D
        set "frame15/texture"(value: null | Texture2D)
        get "frame15/duration"(): float64
        set "frame15/duration"(value: float64)
        get "frame16/texture"(): null | Texture2D
        set "frame16/texture"(value: null | Texture2D)
        get "frame16/duration"(): float64
        set "frame16/duration"(value: float64)
        get "frame17/texture"(): null | Texture2D
        set "frame17/texture"(value: null | Texture2D)
        get "frame17/duration"(): float64
        set "frame17/duration"(value: float64)
        get "frame18/texture"(): null | Texture2D
        set "frame18/texture"(value: null | Texture2D)
        get "frame18/duration"(): float64
        set "frame18/duration"(value: float64)
        get "frame19/texture"(): null | Texture2D
        set "frame19/texture"(value: null | Texture2D)
        get "frame19/duration"(): float64
        set "frame19/duration"(value: float64)
        get "frame20/texture"(): null | Texture2D
        set "frame20/texture"(value: null | Texture2D)
        get "frame20/duration"(): float64
        set "frame20/duration"(value: float64)
        get "frame21/texture"(): null | Texture2D
        set "frame21/texture"(value: null | Texture2D)
        get "frame21/duration"(): float64
        set "frame21/duration"(value: float64)
        get "frame22/texture"(): null | Texture2D
        set "frame22/texture"(value: null | Texture2D)
        get "frame22/duration"(): float64
        set "frame22/duration"(value: float64)
        get "frame23/texture"(): null | Texture2D
        set "frame23/texture"(value: null | Texture2D)
        get "frame23/duration"(): float64
        set "frame23/duration"(value: float64)
        get "frame24/texture"(): null | Texture2D
        set "frame24/texture"(value: null | Texture2D)
        get "frame24/duration"(): float64
        set "frame24/duration"(value: float64)
        get "frame25/texture"(): null | Texture2D
        set "frame25/texture"(value: null | Texture2D)
        get "frame25/duration"(): float64
        set "frame25/duration"(value: float64)
        get "frame26/texture"(): null | Texture2D
        set "frame26/texture"(value: null | Texture2D)
        get "frame26/duration"(): float64
        set "frame26/duration"(value: float64)
        get "frame27/texture"(): null | Texture2D
        set "frame27/texture"(value: null | Texture2D)
        get "frame27/duration"(): float64
        set "frame27/duration"(value: float64)
        get "frame28/texture"(): null | Texture2D
        set "frame28/texture"(value: null | Texture2D)
        get "frame28/duration"(): float64
        set "frame28/duration"(value: float64)
        get "frame29/texture"(): null | Texture2D
        set "frame29/texture"(value: null | Texture2D)
        get "frame29/duration"(): float64
        set "frame29/duration"(value: float64)
        get "frame30/texture"(): null | Texture2D
        set "frame30/texture"(value: null | Texture2D)
        get "frame30/duration"(): float64
        set "frame30/duration"(value: float64)
        get "frame31/texture"(): null | Texture2D
        set "frame31/texture"(value: null | Texture2D)
        get "frame31/duration"(): float64
        set "frame31/duration"(value: float64)
        get "frame32/texture"(): null | Texture2D
        set "frame32/texture"(value: null | Texture2D)
        get "frame32/duration"(): float64
        set "frame32/duration"(value: float64)
        get "frame33/texture"(): null | Texture2D
        set "frame33/texture"(value: null | Texture2D)
        get "frame33/duration"(): float64
        set "frame33/duration"(value: float64)
        get "frame34/texture"(): null | Texture2D
        set "frame34/texture"(value: null | Texture2D)
        get "frame34/duration"(): float64
        set "frame34/duration"(value: float64)
        get "frame35/texture"(): null | Texture2D
        set "frame35/texture"(value: null | Texture2D)
        get "frame35/duration"(): float64
        set "frame35/duration"(value: float64)
        get "frame36/texture"(): null | Texture2D
        set "frame36/texture"(value: null | Texture2D)
        get "frame36/duration"(): float64
        set "frame36/duration"(value: float64)
        get "frame37/texture"(): null | Texture2D
        set "frame37/texture"(value: null | Texture2D)
        get "frame37/duration"(): float64
        set "frame37/duration"(value: float64)
        get "frame38/texture"(): null | Texture2D
        set "frame38/texture"(value: null | Texture2D)
        get "frame38/duration"(): float64
        set "frame38/duration"(value: float64)
        get "frame39/texture"(): null | Texture2D
        set "frame39/texture"(value: null | Texture2D)
        get "frame39/duration"(): float64
        set "frame39/duration"(value: float64)
        get "frame40/texture"(): null | Texture2D
        set "frame40/texture"(value: null | Texture2D)
        get "frame40/duration"(): float64
        set "frame40/duration"(value: float64)
        get "frame41/texture"(): null | Texture2D
        set "frame41/texture"(value: null | Texture2D)
        get "frame41/duration"(): float64
        set "frame41/duration"(value: float64)
        get "frame42/texture"(): null | Texture2D
        set "frame42/texture"(value: null | Texture2D)
        get "frame42/duration"(): float64
        set "frame42/duration"(value: float64)
        get "frame43/texture"(): null | Texture2D
        set "frame43/texture"(value: null | Texture2D)
        get "frame43/duration"(): float64
        set "frame43/duration"(value: float64)
        get "frame44/texture"(): null | Texture2D
        set "frame44/texture"(value: null | Texture2D)
        get "frame44/duration"(): float64
        set "frame44/duration"(value: float64)
        get "frame45/texture"(): null | Texture2D
        set "frame45/texture"(value: null | Texture2D)
        get "frame45/duration"(): float64
        set "frame45/duration"(value: float64)
        get "frame46/texture"(): null | Texture2D
        set "frame46/texture"(value: null | Texture2D)
        get "frame46/duration"(): float64
        set "frame46/duration"(value: float64)
        get "frame47/texture"(): null | Texture2D
        set "frame47/texture"(value: null | Texture2D)
        get "frame47/duration"(): float64
        set "frame47/duration"(value: float64)
        get "frame48/texture"(): null | Texture2D
        set "frame48/texture"(value: null | Texture2D)
        get "frame48/duration"(): float64
        set "frame48/duration"(value: float64)
        get "frame49/texture"(): null | Texture2D
        set "frame49/texture"(value: null | Texture2D)
        get "frame49/duration"(): float64
        set "frame49/duration"(value: float64)
        get "frame50/texture"(): null | Texture2D
        set "frame50/texture"(value: null | Texture2D)
        get "frame50/duration"(): float64
        set "frame50/duration"(value: float64)
        get "frame51/texture"(): null | Texture2D
        set "frame51/texture"(value: null | Texture2D)
        get "frame51/duration"(): float64
        set "frame51/duration"(value: float64)
        get "frame52/texture"(): null | Texture2D
        set "frame52/texture"(value: null | Texture2D)
        get "frame52/duration"(): float64
        set "frame52/duration"(value: float64)
        get "frame53/texture"(): null | Texture2D
        set "frame53/texture"(value: null | Texture2D)
        get "frame53/duration"(): float64
        set "frame53/duration"(value: float64)
        get "frame54/texture"(): null | Texture2D
        set "frame54/texture"(value: null | Texture2D)
        get "frame54/duration"(): float64
        set "frame54/duration"(value: float64)
        get "frame55/texture"(): null | Texture2D
        set "frame55/texture"(value: null | Texture2D)
        get "frame55/duration"(): float64
        set "frame55/duration"(value: float64)
        get "frame56/texture"(): null | Texture2D
        set "frame56/texture"(value: null | Texture2D)
        get "frame56/duration"(): float64
        set "frame56/duration"(value: float64)
        get "frame57/texture"(): null | Texture2D
        set "frame57/texture"(value: null | Texture2D)
        get "frame57/duration"(): float64
        set "frame57/duration"(value: float64)
        get "frame58/texture"(): null | Texture2D
        set "frame58/texture"(value: null | Texture2D)
        get "frame58/duration"(): float64
        set "frame58/duration"(value: float64)
        get "frame59/texture"(): null | Texture2D
        set "frame59/texture"(value: null | Texture2D)
        get "frame59/duration"(): float64
        set "frame59/duration"(value: float64)
        get "frame60/texture"(): null | Texture2D
        set "frame60/texture"(value: null | Texture2D)
        get "frame60/duration"(): float64
        set "frame60/duration"(value: float64)
        get "frame61/texture"(): null | Texture2D
        set "frame61/texture"(value: null | Texture2D)
        get "frame61/duration"(): float64
        set "frame61/duration"(value: float64)
        get "frame62/texture"(): null | Texture2D
        set "frame62/texture"(value: null | Texture2D)
        get "frame62/duration"(): float64
        set "frame62/duration"(value: float64)
        get "frame63/texture"(): null | Texture2D
        set "frame63/texture"(value: null | Texture2D)
        get "frame63/duration"(): float64
        set "frame63/duration"(value: float64)
        get "frame64/texture"(): null | Texture2D
        set "frame64/texture"(value: null | Texture2D)
        get "frame64/duration"(): float64
        set "frame64/duration"(value: float64)
        get "frame65/texture"(): null | Texture2D
        set "frame65/texture"(value: null | Texture2D)
        get "frame65/duration"(): float64
        set "frame65/duration"(value: float64)
        get "frame66/texture"(): null | Texture2D
        set "frame66/texture"(value: null | Texture2D)
        get "frame66/duration"(): float64
        set "frame66/duration"(value: float64)
        get "frame67/texture"(): null | Texture2D
        set "frame67/texture"(value: null | Texture2D)
        get "frame67/duration"(): float64
        set "frame67/duration"(value: float64)
        get "frame68/texture"(): null | Texture2D
        set "frame68/texture"(value: null | Texture2D)
        get "frame68/duration"(): float64
        set "frame68/duration"(value: float64)
        get "frame69/texture"(): null | Texture2D
        set "frame69/texture"(value: null | Texture2D)
        get "frame69/duration"(): float64
        set "frame69/duration"(value: float64)
        get "frame70/texture"(): null | Texture2D
        set "frame70/texture"(value: null | Texture2D)
        get "frame70/duration"(): float64
        set "frame70/duration"(value: float64)
        get "frame71/texture"(): null | Texture2D
        set "frame71/texture"(value: null | Texture2D)
        get "frame71/duration"(): float64
        set "frame71/duration"(value: float64)
        get "frame72/texture"(): null | Texture2D
        set "frame72/texture"(value: null | Texture2D)
        get "frame72/duration"(): float64
        set "frame72/duration"(value: float64)
        get "frame73/texture"(): null | Texture2D
        set "frame73/texture"(value: null | Texture2D)
        get "frame73/duration"(): float64
        set "frame73/duration"(value: float64)
        get "frame74/texture"(): null | Texture2D
        set "frame74/texture"(value: null | Texture2D)
        get "frame74/duration"(): float64
        set "frame74/duration"(value: float64)
        get "frame75/texture"(): null | Texture2D
        set "frame75/texture"(value: null | Texture2D)
        get "frame75/duration"(): float64
        set "frame75/duration"(value: float64)
        get "frame76/texture"(): null | Texture2D
        set "frame76/texture"(value: null | Texture2D)
        get "frame76/duration"(): float64
        set "frame76/duration"(value: float64)
        get "frame77/texture"(): null | Texture2D
        set "frame77/texture"(value: null | Texture2D)
        get "frame77/duration"(): float64
        set "frame77/duration"(value: float64)
        get "frame78/texture"(): null | Texture2D
        set "frame78/texture"(value: null | Texture2D)
        get "frame78/duration"(): float64
        set "frame78/duration"(value: float64)
        get "frame79/texture"(): null | Texture2D
        set "frame79/texture"(value: null | Texture2D)
        get "frame79/duration"(): float64
        set "frame79/duration"(value: float64)
        get "frame80/texture"(): null | Texture2D
        set "frame80/texture"(value: null | Texture2D)
        get "frame80/duration"(): float64
        set "frame80/duration"(value: float64)
        get "frame81/texture"(): null | Texture2D
        set "frame81/texture"(value: null | Texture2D)
        get "frame81/duration"(): float64
        set "frame81/duration"(value: float64)
        get "frame82/texture"(): null | Texture2D
        set "frame82/texture"(value: null | Texture2D)
        get "frame82/duration"(): float64
        set "frame82/duration"(value: float64)
        get "frame83/texture"(): null | Texture2D
        set "frame83/texture"(value: null | Texture2D)
        get "frame83/duration"(): float64
        set "frame83/duration"(value: float64)
        get "frame84/texture"(): null | Texture2D
        set "frame84/texture"(value: null | Texture2D)
        get "frame84/duration"(): float64
        set "frame84/duration"(value: float64)
        get "frame85/texture"(): null | Texture2D
        set "frame85/texture"(value: null | Texture2D)
        get "frame85/duration"(): float64
        set "frame85/duration"(value: float64)
        get "frame86/texture"(): null | Texture2D
        set "frame86/texture"(value: null | Texture2D)
        get "frame86/duration"(): float64
        set "frame86/duration"(value: float64)
        get "frame87/texture"(): null | Texture2D
        set "frame87/texture"(value: null | Texture2D)
        get "frame87/duration"(): float64
        set "frame87/duration"(value: float64)
        get "frame88/texture"(): null | Texture2D
        set "frame88/texture"(value: null | Texture2D)
        get "frame88/duration"(): float64
        set "frame88/duration"(value: float64)
        get "frame89/texture"(): null | Texture2D
        set "frame89/texture"(value: null | Texture2D)
        get "frame89/duration"(): float64
        set "frame89/duration"(value: float64)
        get "frame90/texture"(): null | Texture2D
        set "frame90/texture"(value: null | Texture2D)
        get "frame90/duration"(): float64
        set "frame90/duration"(value: float64)
        get "frame91/texture"(): null | Texture2D
        set "frame91/texture"(value: null | Texture2D)
        get "frame91/duration"(): float64
        set "frame91/duration"(value: float64)
        get "frame92/texture"(): null | Texture2D
        set "frame92/texture"(value: null | Texture2D)
        get "frame92/duration"(): float64
        set "frame92/duration"(value: float64)
        get "frame93/texture"(): null | Texture2D
        set "frame93/texture"(value: null | Texture2D)
        get "frame93/duration"(): float64
        set "frame93/duration"(value: float64)
        get "frame94/texture"(): null | Texture2D
        set "frame94/texture"(value: null | Texture2D)
        get "frame94/duration"(): float64
        set "frame94/duration"(value: float64)
        get "frame95/texture"(): null | Texture2D
        set "frame95/texture"(value: null | Texture2D)
        get "frame95/duration"(): float64
        set "frame95/duration"(value: float64)
        get "frame96/texture"(): null | Texture2D
        set "frame96/texture"(value: null | Texture2D)
        get "frame96/duration"(): float64
        set "frame96/duration"(value: float64)
        get "frame97/texture"(): null | Texture2D
        set "frame97/texture"(value: null | Texture2D)
        get "frame97/duration"(): float64
        set "frame97/duration"(value: float64)
        get "frame98/texture"(): null | Texture2D
        set "frame98/texture"(value: null | Texture2D)
        get "frame98/duration"(): float64
        set "frame98/duration"(value: float64)
        get "frame99/texture"(): null | Texture2D
        set "frame99/texture"(value: null | Texture2D)
        get "frame99/duration"(): float64
        set "frame99/duration"(value: float64)
        get "frame100/texture"(): null | Texture2D
        set "frame100/texture"(value: null | Texture2D)
        get "frame100/duration"(): float64
        set "frame100/duration"(value: float64)
        get "frame101/texture"(): null | Texture2D
        set "frame101/texture"(value: null | Texture2D)
        get "frame101/duration"(): float64
        set "frame101/duration"(value: float64)
        get "frame102/texture"(): null | Texture2D
        set "frame102/texture"(value: null | Texture2D)
        get "frame102/duration"(): float64
        set "frame102/duration"(value: float64)
        get "frame103/texture"(): null | Texture2D
        set "frame103/texture"(value: null | Texture2D)
        get "frame103/duration"(): float64
        set "frame103/duration"(value: float64)
        get "frame104/texture"(): null | Texture2D
        set "frame104/texture"(value: null | Texture2D)
        get "frame104/duration"(): float64
        set "frame104/duration"(value: float64)
        get "frame105/texture"(): null | Texture2D
        set "frame105/texture"(value: null | Texture2D)
        get "frame105/duration"(): float64
        set "frame105/duration"(value: float64)
        get "frame106/texture"(): null | Texture2D
        set "frame106/texture"(value: null | Texture2D)
        get "frame106/duration"(): float64
        set "frame106/duration"(value: float64)
        get "frame107/texture"(): null | Texture2D
        set "frame107/texture"(value: null | Texture2D)
        get "frame107/duration"(): float64
        set "frame107/duration"(value: float64)
        get "frame108/texture"(): null | Texture2D
        set "frame108/texture"(value: null | Texture2D)
        get "frame108/duration"(): float64
        set "frame108/duration"(value: float64)
        get "frame109/texture"(): null | Texture2D
        set "frame109/texture"(value: null | Texture2D)
        get "frame109/duration"(): float64
        set "frame109/duration"(value: float64)
        get "frame110/texture"(): null | Texture2D
        set "frame110/texture"(value: null | Texture2D)
        get "frame110/duration"(): float64
        set "frame110/duration"(value: float64)
        get "frame111/texture"(): null | Texture2D
        set "frame111/texture"(value: null | Texture2D)
        get "frame111/duration"(): float64
        set "frame111/duration"(value: float64)
        get "frame112/texture"(): null | Texture2D
        set "frame112/texture"(value: null | Texture2D)
        get "frame112/duration"(): float64
        set "frame112/duration"(value: float64)
        get "frame113/texture"(): null | Texture2D
        set "frame113/texture"(value: null | Texture2D)
        get "frame113/duration"(): float64
        set "frame113/duration"(value: float64)
        get "frame114/texture"(): null | Texture2D
        set "frame114/texture"(value: null | Texture2D)
        get "frame114/duration"(): float64
        set "frame114/duration"(value: float64)
        get "frame115/texture"(): null | Texture2D
        set "frame115/texture"(value: null | Texture2D)
        get "frame115/duration"(): float64
        set "frame115/duration"(value: float64)
        get "frame116/texture"(): null | Texture2D
        set "frame116/texture"(value: null | Texture2D)
        get "frame116/duration"(): float64
        set "frame116/duration"(value: float64)
        get "frame117/texture"(): null | Texture2D
        set "frame117/texture"(value: null | Texture2D)
        get "frame117/duration"(): float64
        set "frame117/duration"(value: float64)
        get "frame118/texture"(): null | Texture2D
        set "frame118/texture"(value: null | Texture2D)
        get "frame118/duration"(): float64
        set "frame118/duration"(value: float64)
        get "frame119/texture"(): null | Texture2D
        set "frame119/texture"(value: null | Texture2D)
        get "frame119/duration"(): float64
        set "frame119/duration"(value: float64)
        get "frame120/texture"(): null | Texture2D
        set "frame120/texture"(value: null | Texture2D)
        get "frame120/duration"(): float64
        set "frame120/duration"(value: float64)
        get "frame121/texture"(): null | Texture2D
        set "frame121/texture"(value: null | Texture2D)
        get "frame121/duration"(): float64
        set "frame121/duration"(value: float64)
        get "frame122/texture"(): null | Texture2D
        set "frame122/texture"(value: null | Texture2D)
        get "frame122/duration"(): float64
        set "frame122/duration"(value: float64)
        get "frame123/texture"(): null | Texture2D
        set "frame123/texture"(value: null | Texture2D)
        get "frame123/duration"(): float64
        set "frame123/duration"(value: float64)
        get "frame124/texture"(): null | Texture2D
        set "frame124/texture"(value: null | Texture2D)
        get "frame124/duration"(): float64
        set "frame124/duration"(value: float64)
        get "frame125/texture"(): null | Texture2D
        set "frame125/texture"(value: null | Texture2D)
        get "frame125/duration"(): float64
        set "frame125/duration"(value: float64)
        get "frame126/texture"(): null | Texture2D
        set "frame126/texture"(value: null | Texture2D)
        get "frame126/duration"(): float64
        set "frame126/duration"(value: float64)
        get "frame127/texture"(): null | Texture2D
        set "frame127/texture"(value: null | Texture2D)
        get "frame127/duration"(): float64
        set "frame127/duration"(value: float64)
        get "frame128/texture"(): null | Texture2D
        set "frame128/texture"(value: null | Texture2D)
        get "frame128/duration"(): float64
        set "frame128/duration"(value: float64)
        get "frame129/texture"(): null | Texture2D
        set "frame129/texture"(value: null | Texture2D)
        get "frame129/duration"(): float64
        set "frame129/duration"(value: float64)
        get "frame130/texture"(): null | Texture2D
        set "frame130/texture"(value: null | Texture2D)
        get "frame130/duration"(): float64
        set "frame130/duration"(value: float64)
        get "frame131/texture"(): null | Texture2D
        set "frame131/texture"(value: null | Texture2D)
        get "frame131/duration"(): float64
        set "frame131/duration"(value: float64)
        get "frame132/texture"(): null | Texture2D
        set "frame132/texture"(value: null | Texture2D)
        get "frame132/duration"(): float64
        set "frame132/duration"(value: float64)
        get "frame133/texture"(): null | Texture2D
        set "frame133/texture"(value: null | Texture2D)
        get "frame133/duration"(): float64
        set "frame133/duration"(value: float64)
        get "frame134/texture"(): null | Texture2D
        set "frame134/texture"(value: null | Texture2D)
        get "frame134/duration"(): float64
        set "frame134/duration"(value: float64)
        get "frame135/texture"(): null | Texture2D
        set "frame135/texture"(value: null | Texture2D)
        get "frame135/duration"(): float64
        set "frame135/duration"(value: float64)
        get "frame136/texture"(): null | Texture2D
        set "frame136/texture"(value: null | Texture2D)
        get "frame136/duration"(): float64
        set "frame136/duration"(value: float64)
        get "frame137/texture"(): null | Texture2D
        set "frame137/texture"(value: null | Texture2D)
        get "frame137/duration"(): float64
        set "frame137/duration"(value: float64)
        get "frame138/texture"(): null | Texture2D
        set "frame138/texture"(value: null | Texture2D)
        get "frame138/duration"(): float64
        set "frame138/duration"(value: float64)
        get "frame139/texture"(): null | Texture2D
        set "frame139/texture"(value: null | Texture2D)
        get "frame139/duration"(): float64
        set "frame139/duration"(value: float64)
        get "frame140/texture"(): null | Texture2D
        set "frame140/texture"(value: null | Texture2D)
        get "frame140/duration"(): float64
        set "frame140/duration"(value: float64)
        get "frame141/texture"(): null | Texture2D
        set "frame141/texture"(value: null | Texture2D)
        get "frame141/duration"(): float64
        set "frame141/duration"(value: float64)
        get "frame142/texture"(): null | Texture2D
        set "frame142/texture"(value: null | Texture2D)
        get "frame142/duration"(): float64
        set "frame142/duration"(value: float64)
        get "frame143/texture"(): null | Texture2D
        set "frame143/texture"(value: null | Texture2D)
        get "frame143/duration"(): float64
        set "frame143/duration"(value: float64)
        get "frame144/texture"(): null | Texture2D
        set "frame144/texture"(value: null | Texture2D)
        get "frame144/duration"(): float64
        set "frame144/duration"(value: float64)
        get "frame145/texture"(): null | Texture2D
        set "frame145/texture"(value: null | Texture2D)
        get "frame145/duration"(): float64
        set "frame145/duration"(value: float64)
        get "frame146/texture"(): null | Texture2D
        set "frame146/texture"(value: null | Texture2D)
        get "frame146/duration"(): float64
        set "frame146/duration"(value: float64)
        get "frame147/texture"(): null | Texture2D
        set "frame147/texture"(value: null | Texture2D)
        get "frame147/duration"(): float64
        set "frame147/duration"(value: float64)
        get "frame148/texture"(): null | Texture2D
        set "frame148/texture"(value: null | Texture2D)
        get "frame148/duration"(): float64
        set "frame148/duration"(value: float64)
        get "frame149/texture"(): null | Texture2D
        set "frame149/texture"(value: null | Texture2D)
        get "frame149/duration"(): float64
        set "frame149/duration"(value: float64)
        get "frame150/texture"(): null | Texture2D
        set "frame150/texture"(value: null | Texture2D)
        get "frame150/duration"(): float64
        set "frame150/duration"(value: float64)
        get "frame151/texture"(): null | Texture2D
        set "frame151/texture"(value: null | Texture2D)
        get "frame151/duration"(): float64
        set "frame151/duration"(value: float64)
        get "frame152/texture"(): null | Texture2D
        set "frame152/texture"(value: null | Texture2D)
        get "frame152/duration"(): float64
        set "frame152/duration"(value: float64)
        get "frame153/texture"(): null | Texture2D
        set "frame153/texture"(value: null | Texture2D)
        get "frame153/duration"(): float64
        set "frame153/duration"(value: float64)
        get "frame154/texture"(): null | Texture2D
        set "frame154/texture"(value: null | Texture2D)
        get "frame154/duration"(): float64
        set "frame154/duration"(value: float64)
        get "frame155/texture"(): null | Texture2D
        set "frame155/texture"(value: null | Texture2D)
        get "frame155/duration"(): float64
        set "frame155/duration"(value: float64)
        get "frame156/texture"(): null | Texture2D
        set "frame156/texture"(value: null | Texture2D)
        get "frame156/duration"(): float64
        set "frame156/duration"(value: float64)
        get "frame157/texture"(): null | Texture2D
        set "frame157/texture"(value: null | Texture2D)
        get "frame157/duration"(): float64
        set "frame157/duration"(value: float64)
        get "frame158/texture"(): null | Texture2D
        set "frame158/texture"(value: null | Texture2D)
        get "frame158/duration"(): float64
        set "frame158/duration"(value: float64)
        get "frame159/texture"(): null | Texture2D
        set "frame159/texture"(value: null | Texture2D)
        get "frame159/duration"(): float64
        set "frame159/duration"(value: float64)
        get "frame160/texture"(): null | Texture2D
        set "frame160/texture"(value: null | Texture2D)
        get "frame160/duration"(): float64
        set "frame160/duration"(value: float64)
        get "frame161/texture"(): null | Texture2D
        set "frame161/texture"(value: null | Texture2D)
        get "frame161/duration"(): float64
        set "frame161/duration"(value: float64)
        get "frame162/texture"(): null | Texture2D
        set "frame162/texture"(value: null | Texture2D)
        get "frame162/duration"(): float64
        set "frame162/duration"(value: float64)
        get "frame163/texture"(): null | Texture2D
        set "frame163/texture"(value: null | Texture2D)
        get "frame163/duration"(): float64
        set "frame163/duration"(value: float64)
        get "frame164/texture"(): null | Texture2D
        set "frame164/texture"(value: null | Texture2D)
        get "frame164/duration"(): float64
        set "frame164/duration"(value: float64)
        get "frame165/texture"(): null | Texture2D
        set "frame165/texture"(value: null | Texture2D)
        get "frame165/duration"(): float64
        set "frame165/duration"(value: float64)
        get "frame166/texture"(): null | Texture2D
        set "frame166/texture"(value: null | Texture2D)
        get "frame166/duration"(): float64
        set "frame166/duration"(value: float64)
        get "frame167/texture"(): null | Texture2D
        set "frame167/texture"(value: null | Texture2D)
        get "frame167/duration"(): float64
        set "frame167/duration"(value: float64)
        get "frame168/texture"(): null | Texture2D
        set "frame168/texture"(value: null | Texture2D)
        get "frame168/duration"(): float64
        set "frame168/duration"(value: float64)
        get "frame169/texture"(): null | Texture2D
        set "frame169/texture"(value: null | Texture2D)
        get "frame169/duration"(): float64
        set "frame169/duration"(value: float64)
        get "frame170/texture"(): null | Texture2D
        set "frame170/texture"(value: null | Texture2D)
        get "frame170/duration"(): float64
        set "frame170/duration"(value: float64)
        get "frame171/texture"(): null | Texture2D
        set "frame171/texture"(value: null | Texture2D)
        get "frame171/duration"(): float64
        set "frame171/duration"(value: float64)
        get "frame172/texture"(): null | Texture2D
        set "frame172/texture"(value: null | Texture2D)
        get "frame172/duration"(): float64
        set "frame172/duration"(value: float64)
        get "frame173/texture"(): null | Texture2D
        set "frame173/texture"(value: null | Texture2D)
        get "frame173/duration"(): float64
        set "frame173/duration"(value: float64)
        get "frame174/texture"(): null | Texture2D
        set "frame174/texture"(value: null | Texture2D)
        get "frame174/duration"(): float64
        set "frame174/duration"(value: float64)
        get "frame175/texture"(): null | Texture2D
        set "frame175/texture"(value: null | Texture2D)
        get "frame175/duration"(): float64
        set "frame175/duration"(value: float64)
        get "frame176/texture"(): null | Texture2D
        set "frame176/texture"(value: null | Texture2D)
        get "frame176/duration"(): float64
        set "frame176/duration"(value: float64)
        get "frame177/texture"(): null | Texture2D
        set "frame177/texture"(value: null | Texture2D)
        get "frame177/duration"(): float64
        set "frame177/duration"(value: float64)
        get "frame178/texture"(): null | Texture2D
        set "frame178/texture"(value: null | Texture2D)
        get "frame178/duration"(): float64
        set "frame178/duration"(value: float64)
        get "frame179/texture"(): null | Texture2D
        set "frame179/texture"(value: null | Texture2D)
        get "frame179/duration"(): float64
        set "frame179/duration"(value: float64)
        get "frame180/texture"(): null | Texture2D
        set "frame180/texture"(value: null | Texture2D)
        get "frame180/duration"(): float64
        set "frame180/duration"(value: float64)
        get "frame181/texture"(): null | Texture2D
        set "frame181/texture"(value: null | Texture2D)
        get "frame181/duration"(): float64
        set "frame181/duration"(value: float64)
        get "frame182/texture"(): null | Texture2D
        set "frame182/texture"(value: null | Texture2D)
        get "frame182/duration"(): float64
        set "frame182/duration"(value: float64)
        get "frame183/texture"(): null | Texture2D
        set "frame183/texture"(value: null | Texture2D)
        get "frame183/duration"(): float64
        set "frame183/duration"(value: float64)
        get "frame184/texture"(): null | Texture2D
        set "frame184/texture"(value: null | Texture2D)
        get "frame184/duration"(): float64
        set "frame184/duration"(value: float64)
        get "frame185/texture"(): null | Texture2D
        set "frame185/texture"(value: null | Texture2D)
        get "frame185/duration"(): float64
        set "frame185/duration"(value: float64)
        get "frame186/texture"(): null | Texture2D
        set "frame186/texture"(value: null | Texture2D)
        get "frame186/duration"(): float64
        set "frame186/duration"(value: float64)
        get "frame187/texture"(): null | Texture2D
        set "frame187/texture"(value: null | Texture2D)
        get "frame187/duration"(): float64
        set "frame187/duration"(value: float64)
        get "frame188/texture"(): null | Texture2D
        set "frame188/texture"(value: null | Texture2D)
        get "frame188/duration"(): float64
        set "frame188/duration"(value: float64)
        get "frame189/texture"(): null | Texture2D
        set "frame189/texture"(value: null | Texture2D)
        get "frame189/duration"(): float64
        set "frame189/duration"(value: float64)
        get "frame190/texture"(): null | Texture2D
        set "frame190/texture"(value: null | Texture2D)
        get "frame190/duration"(): float64
        set "frame190/duration"(value: float64)
        get "frame191/texture"(): null | Texture2D
        set "frame191/texture"(value: null | Texture2D)
        get "frame191/duration"(): float64
        set "frame191/duration"(value: float64)
        get "frame192/texture"(): null | Texture2D
        set "frame192/texture"(value: null | Texture2D)
        get "frame192/duration"(): float64
        set "frame192/duration"(value: float64)
        get "frame193/texture"(): null | Texture2D
        set "frame193/texture"(value: null | Texture2D)
        get "frame193/duration"(): float64
        set "frame193/duration"(value: float64)
        get "frame194/texture"(): null | Texture2D
        set "frame194/texture"(value: null | Texture2D)
        get "frame194/duration"(): float64
        set "frame194/duration"(value: float64)
        get "frame195/texture"(): null | Texture2D
        set "frame195/texture"(value: null | Texture2D)
        get "frame195/duration"(): float64
        set "frame195/duration"(value: float64)
        get "frame196/texture"(): null | Texture2D
        set "frame196/texture"(value: null | Texture2D)
        get "frame196/duration"(): float64
        set "frame196/duration"(value: float64)
        get "frame197/texture"(): null | Texture2D
        set "frame197/texture"(value: null | Texture2D)
        get "frame197/duration"(): float64
        set "frame197/duration"(value: float64)
        get "frame198/texture"(): null | Texture2D
        set "frame198/texture"(value: null | Texture2D)
        get "frame198/duration"(): float64
        set "frame198/duration"(value: float64)
        get "frame199/texture"(): null | Texture2D
        set "frame199/texture"(value: null | Texture2D)
        get "frame199/duration"(): float64
        set "frame199/duration"(value: float64)
        get "frame200/texture"(): null | Texture2D
        set "frame200/texture"(value: null | Texture2D)
        get "frame200/duration"(): float64
        set "frame200/duration"(value: float64)
        get "frame201/texture"(): null | Texture2D
        set "frame201/texture"(value: null | Texture2D)
        get "frame201/duration"(): float64
        set "frame201/duration"(value: float64)
        get "frame202/texture"(): null | Texture2D
        set "frame202/texture"(value: null | Texture2D)
        get "frame202/duration"(): float64
        set "frame202/duration"(value: float64)
        get "frame203/texture"(): null | Texture2D
        set "frame203/texture"(value: null | Texture2D)
        get "frame203/duration"(): float64
        set "frame203/duration"(value: float64)
        get "frame204/texture"(): null | Texture2D
        set "frame204/texture"(value: null | Texture2D)
        get "frame204/duration"(): float64
        set "frame204/duration"(value: float64)
        get "frame205/texture"(): null | Texture2D
        set "frame205/texture"(value: null | Texture2D)
        get "frame205/duration"(): float64
        set "frame205/duration"(value: float64)
        get "frame206/texture"(): null | Texture2D
        set "frame206/texture"(value: null | Texture2D)
        get "frame206/duration"(): float64
        set "frame206/duration"(value: float64)
        get "frame207/texture"(): null | Texture2D
        set "frame207/texture"(value: null | Texture2D)
        get "frame207/duration"(): float64
        set "frame207/duration"(value: float64)
        get "frame208/texture"(): null | Texture2D
        set "frame208/texture"(value: null | Texture2D)
        get "frame208/duration"(): float64
        set "frame208/duration"(value: float64)
        get "frame209/texture"(): null | Texture2D
        set "frame209/texture"(value: null | Texture2D)
        get "frame209/duration"(): float64
        set "frame209/duration"(value: float64)
        get "frame210/texture"(): null | Texture2D
        set "frame210/texture"(value: null | Texture2D)
        get "frame210/duration"(): float64
        set "frame210/duration"(value: float64)
        get "frame211/texture"(): null | Texture2D
        set "frame211/texture"(value: null | Texture2D)
        get "frame211/duration"(): float64
        set "frame211/duration"(value: float64)
        get "frame212/texture"(): null | Texture2D
        set "frame212/texture"(value: null | Texture2D)
        get "frame212/duration"(): float64
        set "frame212/duration"(value: float64)
        get "frame213/texture"(): null | Texture2D
        set "frame213/texture"(value: null | Texture2D)
        get "frame213/duration"(): float64
        set "frame213/duration"(value: float64)
        get "frame214/texture"(): null | Texture2D
        set "frame214/texture"(value: null | Texture2D)
        get "frame214/duration"(): float64
        set "frame214/duration"(value: float64)
        get "frame215/texture"(): null | Texture2D
        set "frame215/texture"(value: null | Texture2D)
        get "frame215/duration"(): float64
        set "frame215/duration"(value: float64)
        get "frame216/texture"(): null | Texture2D
        set "frame216/texture"(value: null | Texture2D)
        get "frame216/duration"(): float64
        set "frame216/duration"(value: float64)
        get "frame217/texture"(): null | Texture2D
        set "frame217/texture"(value: null | Texture2D)
        get "frame217/duration"(): float64
        set "frame217/duration"(value: float64)
        get "frame218/texture"(): null | Texture2D
        set "frame218/texture"(value: null | Texture2D)
        get "frame218/duration"(): float64
        set "frame218/duration"(value: float64)
        get "frame219/texture"(): null | Texture2D
        set "frame219/texture"(value: null | Texture2D)
        get "frame219/duration"(): float64
        set "frame219/duration"(value: float64)
        get "frame220/texture"(): null | Texture2D
        set "frame220/texture"(value: null | Texture2D)
        get "frame220/duration"(): float64
        set "frame220/duration"(value: float64)
        get "frame221/texture"(): null | Texture2D
        set "frame221/texture"(value: null | Texture2D)
        get "frame221/duration"(): float64
        set "frame221/duration"(value: float64)
        get "frame222/texture"(): null | Texture2D
        set "frame222/texture"(value: null | Texture2D)
        get "frame222/duration"(): float64
        set "frame222/duration"(value: float64)
        get "frame223/texture"(): null | Texture2D
        set "frame223/texture"(value: null | Texture2D)
        get "frame223/duration"(): float64
        set "frame223/duration"(value: float64)
        get "frame224/texture"(): null | Texture2D
        set "frame224/texture"(value: null | Texture2D)
        get "frame224/duration"(): float64
        set "frame224/duration"(value: float64)
        get "frame225/texture"(): null | Texture2D
        set "frame225/texture"(value: null | Texture2D)
        get "frame225/duration"(): float64
        set "frame225/duration"(value: float64)
        get "frame226/texture"(): null | Texture2D
        set "frame226/texture"(value: null | Texture2D)
        get "frame226/duration"(): float64
        set "frame226/duration"(value: float64)
        get "frame227/texture"(): null | Texture2D
        set "frame227/texture"(value: null | Texture2D)
        get "frame227/duration"(): float64
        set "frame227/duration"(value: float64)
        get "frame228/texture"(): null | Texture2D
        set "frame228/texture"(value: null | Texture2D)
        get "frame228/duration"(): float64
        set "frame228/duration"(value: float64)
        get "frame229/texture"(): null | Texture2D
        set "frame229/texture"(value: null | Texture2D)
        get "frame229/duration"(): float64
        set "frame229/duration"(value: float64)
        get "frame230/texture"(): null | Texture2D
        set "frame230/texture"(value: null | Texture2D)
        get "frame230/duration"(): float64
        set "frame230/duration"(value: float64)
        get "frame231/texture"(): null | Texture2D
        set "frame231/texture"(value: null | Texture2D)
        get "frame231/duration"(): float64
        set "frame231/duration"(value: float64)
        get "frame232/texture"(): null | Texture2D
        set "frame232/texture"(value: null | Texture2D)
        get "frame232/duration"(): float64
        set "frame232/duration"(value: float64)
        get "frame233/texture"(): null | Texture2D
        set "frame233/texture"(value: null | Texture2D)
        get "frame233/duration"(): float64
        set "frame233/duration"(value: float64)
        get "frame234/texture"(): null | Texture2D
        set "frame234/texture"(value: null | Texture2D)
        get "frame234/duration"(): float64
        set "frame234/duration"(value: float64)
        get "frame235/texture"(): null | Texture2D
        set "frame235/texture"(value: null | Texture2D)
        get "frame235/duration"(): float64
        set "frame235/duration"(value: float64)
        get "frame236/texture"(): null | Texture2D
        set "frame236/texture"(value: null | Texture2D)
        get "frame236/duration"(): float64
        set "frame236/duration"(value: float64)
        get "frame237/texture"(): null | Texture2D
        set "frame237/texture"(value: null | Texture2D)
        get "frame237/duration"(): float64
        set "frame237/duration"(value: float64)
        get "frame238/texture"(): null | Texture2D
        set "frame238/texture"(value: null | Texture2D)
        get "frame238/duration"(): float64
        set "frame238/duration"(value: float64)
        get "frame239/texture"(): null | Texture2D
        set "frame239/texture"(value: null | Texture2D)
        get "frame239/duration"(): float64
        set "frame239/duration"(value: float64)
        get "frame240/texture"(): null | Texture2D
        set "frame240/texture"(value: null | Texture2D)
        get "frame240/duration"(): float64
        set "frame240/duration"(value: float64)
        get "frame241/texture"(): null | Texture2D
        set "frame241/texture"(value: null | Texture2D)
        get "frame241/duration"(): float64
        set "frame241/duration"(value: float64)
        get "frame242/texture"(): null | Texture2D
        set "frame242/texture"(value: null | Texture2D)
        get "frame242/duration"(): float64
        set "frame242/duration"(value: float64)
        get "frame243/texture"(): null | Texture2D
        set "frame243/texture"(value: null | Texture2D)
        get "frame243/duration"(): float64
        set "frame243/duration"(value: float64)
        get "frame244/texture"(): null | Texture2D
        set "frame244/texture"(value: null | Texture2D)
        get "frame244/duration"(): float64
        set "frame244/duration"(value: float64)
        get "frame245/texture"(): null | Texture2D
        set "frame245/texture"(value: null | Texture2D)
        get "frame245/duration"(): float64
        set "frame245/duration"(value: float64)
        get "frame246/texture"(): null | Texture2D
        set "frame246/texture"(value: null | Texture2D)
        get "frame246/duration"(): float64
        set "frame246/duration"(value: float64)
        get "frame247/texture"(): null | Texture2D
        set "frame247/texture"(value: null | Texture2D)
        get "frame247/duration"(): float64
        set "frame247/duration"(value: float64)
        get "frame248/texture"(): null | Texture2D
        set "frame248/texture"(value: null | Texture2D)
        get "frame248/duration"(): float64
        set "frame248/duration"(value: float64)
        get "frame249/texture"(): null | Texture2D
        set "frame249/texture"(value: null | Texture2D)
        get "frame249/duration"(): float64
        set "frame249/duration"(value: float64)
        get "frame250/texture"(): null | Texture2D
        set "frame250/texture"(value: null | Texture2D)
        get "frame250/duration"(): float64
        set "frame250/duration"(value: float64)
        get "frame251/texture"(): null | Texture2D
        set "frame251/texture"(value: null | Texture2D)
        get "frame251/duration"(): float64
        set "frame251/duration"(value: float64)
        get "frame252/texture"(): null | Texture2D
        set "frame252/texture"(value: null | Texture2D)
        get "frame252/duration"(): float64
        set "frame252/duration"(value: float64)
        get "frame253/texture"(): null | Texture2D
        set "frame253/texture"(value: null | Texture2D)
        get "frame253/duration"(): float64
        set "frame253/duration"(value: float64)
        get "frame254/texture"(): null | Texture2D
        set "frame254/texture"(value: null | Texture2D)
        get "frame254/duration"(): float64
        set "frame254/duration"(value: float64)
        get "frame255/texture"(): null | Texture2D
        set "frame255/texture"(value: null | Texture2D)
        get "frame255/duration"(): float64
        set "frame255/duration"(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimatedTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimatedTexture;
    }
    namespace Animation {
        enum TrackType {
            TypeValue = 0,
            TypePosition3D = 1,
            TypeRotation3D = 2,
            TypeScale3D = 3,
            TypeBlendShape = 4,
            TypeMethod = 5,
            TypeBezier = 6,
            TypeAudio = 7,
            TypeAnimation = 8,
        }
        enum InterpolationType {
            InterpolationNearest = 0,
            InterpolationLinear = 1,
            InterpolationCubic = 2,
            InterpolationLinearAngle = 3,
            InterpolationCubicAngle = 4,
            InterpolationMakima = 5,
            InterpolationMakimaAngle = 6,
        }
        enum UpdateMode {
            UpdateContinuous = 0,
            UpdateDiscrete = 1,
            UpdateCapture = 2,
        }
        enum LoopMode {
            LoopNone = 0,
            LoopLinear = 1,
            LoopPingpong = 2,
        }
        enum LoopedFlag {
            LoopedFlagNone = 0,
            LoopedFlagEnd = 1,
            LoopedFlagStart = 2,
        }
        enum FindMode {
            FindModeNearest = 0,
            FindModeApprox = 1,
            FindModeExact = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimation extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimation extends __NameMapResource {
        add_track: "addTrack";
        remove_track: "removeTrack";
        get_track_count: "getTrackCount";
        track_get_type: "trackGetType";
        track_get_path: "trackGetPath";
        track_set_path: "trackSetPath";
        find_track: "findTrack";
        track_move_up: "trackMoveUp";
        track_move_down: "trackMoveDown";
        track_move_to: "trackMoveTo";
        track_swap: "trackSwap";
        track_set_imported: "trackSetImported";
        track_is_imported: "trackIsImported";
        track_set_enabled: "trackSetEnabled";
        track_is_enabled: "trackIsEnabled";
        position_track_insert_key: "positionTrackInsertKey";
        rotation_track_insert_key: "rotationTrackInsertKey";
        scale_track_insert_key: "scaleTrackInsertKey";
        blend_shape_track_insert_key: "blendShapeTrackInsertKey";
        position_track_interpolate: "positionTrackInterpolate";
        rotation_track_interpolate: "rotationTrackInterpolate";
        scale_track_interpolate: "scaleTrackInterpolate";
        blend_shape_track_interpolate: "blendShapeTrackInterpolate";
        track_insert_key: "trackInsertKey";
        track_remove_key: "trackRemoveKey";
        track_remove_key_at_time: "trackRemoveKeyAtTime";
        track_set_key_value: "trackSetKeyValue";
        track_set_key_transition: "trackSetKeyTransition";
        track_set_key_time: "trackSetKeyTime";
        track_get_key_transition: "trackGetKeyTransition";
        track_get_key_count: "trackGetKeyCount";
        track_get_key_value: "trackGetKeyValue";
        track_get_key_time: "trackGetKeyTime";
        track_find_key: "trackFindKey";
        track_set_interpolation_type: "trackSetInterpolationType";
        track_get_interpolation_type: "trackGetInterpolationType";
        track_set_interpolation_loop_wrap: "trackSetInterpolationLoopWrap";
        track_get_interpolation_loop_wrap: "trackGetInterpolationLoopWrap";
        track_is_compressed: "trackIsCompressed";
        value_track_set_update_mode: "valueTrackSetUpdateMode";
        value_track_get_update_mode: "valueTrackGetUpdateMode";
        value_track_interpolate: "valueTrackInterpolate";
        method_track_get_name: "methodTrackGetName";
        method_track_get_params: "methodTrackGetParams";
        bezier_track_insert_key: "bezierTrackInsertKey";
        bezier_track_set_key_value: "bezierTrackSetKeyValue";
        bezier_track_set_key_in_handle: "bezierTrackSetKeyInHandle";
        bezier_track_set_key_out_handle: "bezierTrackSetKeyOutHandle";
        bezier_track_get_key_value: "bezierTrackGetKeyValue";
        bezier_track_get_key_in_handle: "bezierTrackGetKeyInHandle";
        bezier_track_get_key_out_handle: "bezierTrackGetKeyOutHandle";
        bezier_track_interpolate: "bezierTrackInterpolate";
        audio_track_insert_key: "audioTrackInsertKey";
        audio_track_set_key_stream: "audioTrackSetKeyStream";
        audio_track_set_key_start_offset: "audioTrackSetKeyStartOffset";
        audio_track_set_key_end_offset: "audioTrackSetKeyEndOffset";
        audio_track_get_key_stream: "audioTrackGetKeyStream";
        audio_track_get_key_start_offset: "audioTrackGetKeyStartOffset";
        audio_track_get_key_end_offset: "audioTrackGetKeyEndOffset";
        audio_track_set_use_blend: "audioTrackSetUseBlend";
        audio_track_is_use_blend: "audioTrackIsUseBlend";
        animation_track_insert_key: "animationTrackInsertKey";
        animation_track_set_key_animation: "animationTrackSetKeyAnimation";
        animation_track_get_key_animation: "animationTrackGetKeyAnimation";
        add_marker: "addMarker";
        remove_marker: "removeMarker";
        has_marker: "hasMarker";
        get_marker_at_time: "getMarkerAtTime";
        get_next_marker: "getNextMarker";
        get_prev_marker: "getPrevMarker";
        get_marker_time: "getMarkerTime";
        get_marker_names: "getMarkerNames";
        get_marker_color: "getMarkerColor";
        set_marker_color: "setMarkerColor";
        copy_track: "copyTrack";
        loop_mode: "loopMode";
        capture_included: "captureIncluded";
    }
    /** Holds data that can be used to animate anything in the engine.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animation.html  
     */
    class Animation extends Resource {
        constructor(identifier?: any)
        /** Adds a track to the Animation. */
        addTrack(type: Animation.TrackType, atPosition?: int64 /* = -1 */): int64
        
        /** Removes a track by specifying the track index. */
        removeTrack(trackIdx: int64): void
        
        /** Returns the amount of tracks in the animation. */
        getTrackCount(): int64
        
        /** Gets the type of a track. */
        trackGetType(trackIdx: int64): Animation.TrackType
        
        /** Gets the path of a track. For more information on the path format, see [method track_set_path]. */
        trackGetPath(trackIdx: int64): NodePath
        
        /** Sets the path of a track. Paths must be valid scene-tree paths to a node and must be specified starting from the [member AnimationMixer.root_node] that will reproduce the animation. Tracks that control properties or bones must append their name after the path, separated by `":"`.  
         *  For example, `"character/skeleton:ankle"` or `"character/mesh:transform/local"`.  
         */
        trackSetPath(trackIdx: int64, path: NodePath | string): void
        
        /** Returns the index of the specified track. If the track is not found, return -1. */
        findTrack(path: NodePath | string, type: Animation.TrackType): int64
        
        /** Moves a track up. */
        trackMoveUp(trackIdx: int64): void
        
        /** Moves a track down. */
        trackMoveDown(trackIdx: int64): void
        
        /** Changes the index position of track [param track_idx] to the one defined in [param to_idx]. */
        trackMoveTo(trackIdx: int64, toIdx: int64): void
        
        /** Swaps the track [param track_idx]'s index position with the track [param with_idx]. */
        trackSwap(trackIdx: int64, withIdx: int64): void
        
        /** Sets the given track as imported or not. */
        trackSetImported(trackIdx: int64, imported: boolean): void
        
        /** Returns `true` if the given track is imported. Else, return `false`. */
        trackIsImported(trackIdx: int64): boolean
        
        /** Enables/disables the given track. Tracks are enabled by default. */
        trackSetEnabled(trackIdx: int64, enabled: boolean): void
        
        /** Returns `true` if the track at index [param track_idx] is enabled. */
        trackIsEnabled(trackIdx: int64): boolean
        
        /** Inserts a key in a given 3D position track. Returns the key index. */
        positionTrackInsertKey(trackIdx: int64, time: float64, position: Vector3): int64
        
        /** Inserts a key in a given 3D rotation track. Returns the key index. */
        rotationTrackInsertKey(trackIdx: int64, time: float64, rotation: Quaternion): int64
        
        /** Inserts a key in a given 3D scale track. Returns the key index. */
        scaleTrackInsertKey(trackIdx: int64, time: float64, scale: Vector3): int64
        
        /** Inserts a key in a given blend shape track. Returns the key index. */
        blendShapeTrackInsertKey(trackIdx: int64, time: float64, amount: float64): int64
        
        /** Returns the interpolated position value at the given time (in seconds). The [param track_idx] must be the index of a 3D position track.  
         *      
         *  **Note:** If [param backward] is `true`, the keys are retrieved on the reversed timeline. See also [method value_track_interpolate].  
         */
        positionTrackInterpolate(trackIdx: int64, timeSec: float64, backward?: boolean /* = false */): Vector3
        
        /** Returns the interpolated rotation value at the given time (in seconds). The [param track_idx] must be the index of a 3D rotation track.  
         *      
         *  **Note:** If [param backward] is `true`, the keys are retrieved on the reversed timeline. See also [method value_track_interpolate].  
         */
        rotationTrackInterpolate(trackIdx: int64, timeSec: float64, backward?: boolean /* = false */): Quaternion
        
        /** Returns the interpolated scale value at the given time (in seconds). The [param track_idx] must be the index of a 3D scale track.  
         *      
         *  **Note:** If [param backward] is `true`, the keys are retrieved on the reversed timeline. See also [method value_track_interpolate].  
         */
        scaleTrackInterpolate(trackIdx: int64, timeSec: float64, backward?: boolean /* = false */): Vector3
        
        /** Returns the interpolated blend shape value at the given time (in seconds). The [param track_idx] must be the index of a blend shape track.  
         *      
         *  **Note:** If [param backward] is `true`, the keys are retrieved on the reversed timeline. See also [method value_track_interpolate].  
         */
        blendShapeTrackInterpolate(trackIdx: int64, timeSec: float64, backward?: boolean /* = false */): float64
        
        /** Inserts a generic key in a given track. Returns the key index. */
        trackInsertKey(trackIdx: int64, time: float64, key: any, transition?: float64 /* = 1 */): int64
        
        /** Removes a key by index in a given track. */
        trackRemoveKey(trackIdx: int64, keyIdx: int64): void
        
        /** Removes a key at [param time] in a given track. */
        trackRemoveKeyAtTime(trackIdx: int64, time: float64): void
        
        /** Sets the value of an existing key. */
        trackSetKeyValue(trackIdx: int64, key: int64, value: any): void
        
        /** Sets the transition curve (easing) for a specific key (see the built-in math function [method @GlobalScope.ease]). */
        trackSetKeyTransition(trackIdx: int64, keyIdx: int64, transition: float64): void
        
        /** Sets the time of an existing key. */
        trackSetKeyTime(trackIdx: int64, keyIdx: int64, time: float64): void
        
        /** Returns the transition curve (easing) for a specific key (see the built-in math function [method @GlobalScope.ease]). */
        trackGetKeyTransition(trackIdx: int64, keyIdx: int64): float64
        
        /** Returns the number of keys in a given track. */
        trackGetKeyCount(trackIdx: int64): int64
        
        /** Returns the value of a given key in a given track. */
        trackGetKeyValue(trackIdx: int64, keyIdx: int64): any
        
        /** Returns the time at which the key is located. */
        trackGetKeyTime(trackIdx: int64, keyIdx: int64): float64
        
        /** Finds the key index by time in a given track. Optionally, only find it if the approx/exact time is given.  
         *  If [param limit] is `true`, it does not return keys outside the animation range.  
         *  If [param backward] is `true`, the direction is reversed in methods that rely on one directional processing.  
         *  For example, in case [param find_mode] is [constant FIND_MODE_NEAREST], if there is no key in the current position just after seeked, the first key found is retrieved by searching before the position, but if [param backward] is `true`, the first key found is retrieved after the position.  
         */
        trackFindKey(trackIdx: int64, time: float64, findMode?: Animation.FindMode /* = 0 */, limit?: boolean /* = false */, backward?: boolean /* = false */): int64
        
        /** Sets the interpolation type of a given track. */
        trackSetInterpolationType(trackIdx: int64, interpolation: Animation.InterpolationType): void
        
        /** Returns the interpolation type of a given track. */
        trackGetInterpolationType(trackIdx: int64): Animation.InterpolationType
        
        /** If `true`, the track at [param track_idx] wraps the interpolation loop. */
        trackSetInterpolationLoopWrap(trackIdx: int64, interpolation: boolean): void
        
        /** Returns `true` if the track at [param track_idx] wraps the interpolation loop. New tracks wrap the interpolation loop by default. */
        trackGetInterpolationLoopWrap(trackIdx: int64): boolean
        
        /** Returns `true` if the track is compressed, `false` otherwise. See also [method compress]. */
        trackIsCompressed(trackIdx: int64): boolean
        
        /** Sets the update mode of a value track. */
        valueTrackSetUpdateMode(trackIdx: int64, mode: Animation.UpdateMode): void
        
        /** Returns the update mode of a value track. */
        valueTrackGetUpdateMode(trackIdx: int64): Animation.UpdateMode
        
        /** Returns the interpolated value at the given time (in seconds). The [param track_idx] must be the index of a value track.  
         *  If [param backward] is `true`, the keys are retrieved on the reversed timeline, so the base key is the key after [param time_sec]. This changes the result only for [constant UPDATE_DISCRETE] and [constant INTERPOLATION_NEAREST]; the other interpolation types give the same result as forward.  
         *      
         *  **Note:** [AnimationMixer] always passes `false` for continuous tracks with playback API.  
         */
        valueTrackInterpolate(trackIdx: int64, timeSec: float64, backward?: boolean /* = false */): any
        
        /** Returns the method name of a method track. */
        methodTrackGetName(trackIdx: int64, keyIdx: int64): StringName
        
        /** Returns the arguments values to be called on a method track for a given key in a given track. */
        methodTrackGetParams(trackIdx: int64, keyIdx: int64): GArray
        
        /** Inserts a Bezier Track key at the given [param time] in seconds. The [param track_idx] must be the index of a Bezier Track.  
         *  [param in_handle] is the left-side weight of the added Bezier curve point, [param out_handle] is the right-side one, while [param value] is the actual value at this point.  
         */
        bezierTrackInsertKey(trackIdx: int64, time: float64, value: float64, inHandle?: Vector2 /* = Vector2.ZERO */, outHandle?: Vector2 /* = Vector2.ZERO */): int64
        
        /** Sets the value of the key identified by [param key_idx] to the given value. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackSetKeyValue(trackIdx: int64, keyIdx: int64, value: float64): void
        
        /** Sets the in handle of the key identified by [param key_idx] to value [param in_handle]. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackSetKeyInHandle(trackIdx: int64, keyIdx: int64, inHandle: Vector2, balancedValueTimeRatio?: float64 /* = 1 */): void
        
        /** Sets the out handle of the key identified by [param key_idx] to value [param out_handle]. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackSetKeyOutHandle(trackIdx: int64, keyIdx: int64, outHandle: Vector2, balancedValueTimeRatio?: float64 /* = 1 */): void
        
        /** Returns the value of the key identified by [param key_idx]. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackGetKeyValue(trackIdx: int64, keyIdx: int64): float64
        
        /** Returns the in handle of the key identified by [param key_idx]. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackGetKeyInHandle(trackIdx: int64, keyIdx: int64): Vector2
        
        /** Returns the out handle of the key identified by [param key_idx]. The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackGetKeyOutHandle(trackIdx: int64, keyIdx: int64): Vector2
        
        /** Returns the interpolated value at the given [param time] (in seconds). The [param track_idx] must be the index of a Bezier Track. */
        bezierTrackInterpolate(trackIdx: int64, time: float64): float64
        
        /** Inserts an Audio Track key at the given [param time] in seconds. The [param track_idx] must be the index of an Audio Track.  
         *  [param stream] is the [AudioStream] resource to play. [param start_offset] is the number of seconds cut off at the beginning of the audio stream, while [param end_offset] is at the ending.  
         */
        audioTrackInsertKey(trackIdx: int64, time: float64, stream: Resource, startOffset?: float64 /* = 0 */, endOffset?: float64 /* = 0 */): int64
        
        /** Sets the stream of the key identified by [param key_idx] to value [param stream]. The [param track_idx] must be the index of an Audio Track. */
        audioTrackSetKeyStream(trackIdx: int64, keyIdx: int64, stream: Resource): void
        
        /** Sets the start offset of the key identified by [param key_idx] to value [param offset]. The [param track_idx] must be the index of an Audio Track. */
        audioTrackSetKeyStartOffset(trackIdx: int64, keyIdx: int64, offset: float64): void
        
        /** Sets the end offset of the key identified by [param key_idx] to value [param offset]. The [param track_idx] must be the index of an Audio Track. */
        audioTrackSetKeyEndOffset(trackIdx: int64, keyIdx: int64, offset: float64): void
        
        /** Returns the audio stream of the key identified by [param key_idx]. The [param track_idx] must be the index of an Audio Track. */
        audioTrackGetKeyStream(trackIdx: int64, keyIdx: int64): null | Resource
        
        /** Returns the start offset of the key identified by [param key_idx]. The [param track_idx] must be the index of an Audio Track.  
         *  Start offset is the number of seconds cut off at the beginning of the audio stream.  
         */
        audioTrackGetKeyStartOffset(trackIdx: int64, keyIdx: int64): float64
        
        /** Returns the end offset of the key identified by [param key_idx]. The [param track_idx] must be the index of an Audio Track.  
         *  End offset is the number of seconds cut off at the ending of the audio stream.  
         */
        audioTrackGetKeyEndOffset(trackIdx: int64, keyIdx: int64): float64
        
        /** Sets whether the track will be blended with other animations. If `true`, the audio playback volume changes depending on the blend value. */
        audioTrackSetUseBlend(trackIdx: int64, enable: boolean): void
        
        /** Returns `true` if the track at [param track_idx] will be blended with other animations. */
        audioTrackIsUseBlend(trackIdx: int64): boolean
        
        /** Inserts a key with value [param animation] at the given [param time] (in seconds). The [param track_idx] must be the index of an Animation Track. */
        animationTrackInsertKey(trackIdx: int64, time: float64, animation: StringName): int64
        
        /** Sets the key identified by [param key_idx] to value [param animation]. The [param track_idx] must be the index of an Animation Track. */
        animationTrackSetKeyAnimation(trackIdx: int64, keyIdx: int64, animation: StringName): void
        
        /** Returns the animation name at the key identified by [param key_idx]. The [param track_idx] must be the index of an Animation Track. */
        animationTrackGetKeyAnimation(trackIdx: int64, keyIdx: int64): StringName
        
        /** Adds a marker to this Animation. */
        addMarker(name: StringName, time: float64): void
        
        /** Removes the marker with the given name from this Animation. */
        removeMarker(name: StringName): void
        
        /** Returns `true` if this Animation contains a marker with the given name. */
        hasMarker(name: StringName): boolean
        
        /** Returns the name of the marker located at the given time. */
        getMarkerAtTime(time: float64): StringName
        
        /** Returns the closest marker that comes after the given time. If no such marker exists, an empty string is returned. */
        getNextMarker(time: float64): StringName
        
        /** Returns the closest marker that comes before the given time. If no such marker exists, an empty string is returned. */
        getPrevMarker(time: float64): StringName
        
        /** Returns the given marker's time. */
        getMarkerTime(name: StringName): float64
        
        /** Returns every marker in this Animation, sorted ascending by time. */
        getMarkerNames(): PackedStringArray
        
        /** Returns the given marker's color. */
        getMarkerColor(name: StringName): Color
        
        /** Sets the given marker's color. */
        setMarkerColor(name: StringName, color: Color): void
        
        /** Clear the animation (clear all tracks and reset all). */
        clear(): void
        
        /** Adds a new track to [param to_animation] that is a copy of the given track from this animation. */
        copyTrack(trackIdx: int64, toAnimation: Animation): void
        
        /** Optimize the animation and all its tracks in-place. This will preserve only as many keys as are necessary to keep the animation within the specified bounds. */
        optimize(allowedVelocityErr?: float64 /* = 0.01 */, allowedAngularErr?: float64 /* = 0.01 */, precision?: int64 /* = 3 */): void
        
        /** Compress the animation and all its tracks in-place. This will make [method track_is_compressed] return `true` once called on this [Animation]. Compressed tracks require less memory to be played, and are designed to be used for complex 3D animations (such as cutscenes) imported from external 3D software. Compression is lossy, but the difference is usually not noticeable in real world conditions.  
         *      
         *  **Note:** Compressed tracks have various limitations (such as not being editable from the editor), so only use compressed animations if you actually need them.  
         */
        compress(pageSize?: int64 /* = 8192 */, fps?: int64 /* = 120 */, splitTolerance?: float64 /* = 4 */): void
        
        /** The total length of the animation (in seconds).  
         *      
         *  **Note:** Length is not delimited by the last key, as this one may be before or after the end to ensure correct interpolation and looping.  
         */
        get length(): float64
        set length(value: float64)
        
        /** Determines the behavior of both ends of the animation timeline during animation playback. This indicates whether and how the animation should be restarted, and is also used to correctly interpolate animation cycles. */
        get loopMode(): int64
        set loopMode(value: int64)
        
        /** The animation step value. */
        get step(): float64
        set step(value: float64)
        
        /** Returns `true` if the capture track is included. This is a cached readonly value for performance. */
        get captureIncluded(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimation;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimation;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationLibrary extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationLibrary extends __NameMapResource {
        add_animation: "addAnimation";
        remove_animation: "removeAnimation";
        rename_animation: "renameAnimation";
        has_animation: "hasAnimation";
        get_animation: "getAnimation";
        get_animation_list: "getAnimationList";
        get_animation_list_size: "getAnimationListSize";
        animation_added: "animationAdded";
        animation_removed: "animationRemoved";
        animation_renamed: "animationRenamed";
        animation_changed: "animationChanged";
    }
    namespace __PathMappableDummyKeys { const AnimationLibrary: unique symbol }
    /** Container for [Animation] resources.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationlibrary.html  
     */
    class AnimationLibrary<AnimationName extends string = string> extends Resource implements PathMappable<typeof __PathMappableDummyKeys.AnimationLibrary, Record<AnimationName, Animation>> {
        [__PathMappableDummyKeys.AnimationLibrary]: Record<AnimationName, Animation>
        constructor(identifier?: any)
        /** Adds the [param animation] to the library, accessible by the key [param name]. */
        addAnimation(name: AnimationName, animation: Animation): GError
        
        /** Removes the [Animation] with the key [param name]. */
        removeAnimation(name: AnimationName): void
        
        /** Changes the key of the [Animation] associated with the key [param name] to [param newname]. */
        renameAnimation(name: AnimationName, newname: AnimationName): void
        
        /** Returns `true` if the library stores an [Animation] with [param name] as the key. */
        hasAnimation(name: AnimationName): boolean
        
        /** Returns the [Animation] with the key [param name]. If the animation does not exist, `null` is returned and an error is logged. */
        getAnimation(name: AnimationName): null | Animation
        
        /** Returns the keys for the [Animation]s stored in the library. */
        getAnimationList(): GArray<StringName>
        
        /** Returns the key count for the [Animation]s stored in the library. */
        getAnimationListSize(): int64
        get _data(): GDictionary
        set _data(value: GDictionary)
        
        /** Emitted when an [Animation] is added, under the key [param anim_name]. */
        readonly animationAdded: Signal<(animName: StringName) => void>
        
        /** Emitted when an [Animation] stored with the key [param anim_name] is removed. */
        readonly animationRemoved: Signal<(animName: StringName) => void>
        
        /** Emitted when the key for an [Animation] is changed, from [param old_name] to [param new_name]. */
        readonly animationRenamed: Signal<(oldName: StringName, newName: StringName) => void>
        
        /** Emitted when there's a change in one of the animations, e.g. tracks are added, moved or have changed paths. [param anim_name] is the key of the animation that was changed.  
         *  See also [signal Resource.changed], which this acts as a relay for.  
         */
        readonly animationChanged: Signal<(animName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationLibrary;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationLibrary;
    }
    namespace AnimationMixer {
        enum AnimationCallbackModeProcess {
            AnimationCallbackModeProcessPhysics = 0,
            AnimationCallbackModeProcessIdle = 1,
            AnimationCallbackModeProcessManual = 2,
        }
        enum AnimationCallbackModeMethod {
            AnimationCallbackModeMethodDeferred = 0,
            AnimationCallbackModeMethodImmediate = 1,
        }
        enum AnimationCallbackModeDiscrete {
            AnimationCallbackModeDiscreteDominant = 0,
            AnimationCallbackModeDiscreteRecessive = 1,
            AnimationCallbackModeDiscreteForceContinuous = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationMixer extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationMixer extends __NameMapNode {
        _post_process_key_value: "_postProcessKeyValue";
        add_animation_library: "addAnimationLibrary";
        remove_animation_library: "removeAnimationLibrary";
        rename_animation_library: "renameAnimationLibrary";
        has_animation_library: "hasAnimationLibrary";
        get_animation_library: "getAnimationLibrary";
        get_animation_library_list: "getAnimationLibraryList";
        has_animation: "hasAnimation";
        get_animation: "getAnimation";
        get_animation_list: "getAnimationList";
        get_root_motion_position: "getRootMotionPosition";
        get_root_motion_rotation: "getRootMotionRotation";
        get_root_motion_scale: "getRootMotionScale";
        get_root_motion_position_accumulator: "getRootMotionPositionAccumulator";
        get_root_motion_rotation_accumulator: "getRootMotionRotationAccumulator";
        get_root_motion_scale_accumulator: "getRootMotionScaleAccumulator";
        clear_caches: "clearCaches";
        find_animation: "findAnimation";
        find_animation_library: "findAnimationLibrary";
        reset_on_save: "resetOnSave";
        root_node: "rootNode";
        root_motion_track: "rootMotionTrack";
        root_motion_local: "rootMotionLocal";
        audio_max_polyphony: "audioMaxPolyphony";
        callback_mode_process: "callbackModeProcess";
        callback_mode_method: "callbackModeMethod";
        callback_mode_discrete: "callbackModeDiscrete";
        animation_list_changed: "animationListChanged";
        animation_libraries_updated: "animationLibrariesUpdated";
        animation_finished: "animationFinished";
        animation_started: "animationStarted";
        caches_cleared: "cachesCleared";
        mixer_applied: "mixerApplied";
        mixer_updated: "mixerUpdated";
    }
    namespace __PathMappableDummyKeys { const AnimationMixer: unique symbol }
    /** Base class for [AnimationPlayer] and [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationmixer.html  
     */
    class AnimationMixer<NodeMap extends NodePathMap = any, LibraryMap extends AnimationMixerPathMap = any> extends Node<NodeMap> implements PathMappable<typeof __PathMappableDummyKeys.AnimationMixer, LibraryMap> {
        [__PathMappableDummyKeys.AnimationMixer]: LibraryMap
        constructor(identifier?: any)
        /** A virtual function for processing after getting a key during playback. */
        /* gdvirtual */ _postProcessKeyValue(animation: Animation, track: int64, value: any, objectId: int64, objectSubIdx: int64): any
        
        /** Adds [param library] to the animation player, under the key [param name].  
         *  AnimationMixer has a global library by default with an empty string as key. For adding an animation to the global library:  
         *    
         */
        addAnimationLibrary<Name extends keyof LibraryMap>(name: Name, library: LibraryMap[Name]): GError
        
        /** Removes the [AnimationLibrary] associated with the key [param name]. */
        removeAnimationLibrary<Name extends keyof LibraryMap>(name: Name): void
        
        /** Moves the [AnimationLibrary] associated with the key [param name] to the key [param newname]. */
        renameAnimationLibrary<FromName extends keyof LibraryMap, ToName extends ExtractValueKeys<LibraryMap, LibraryMap[FromName]>>(name: FromName, newname: ToName): void
        
        /** Returns `true` if the [AnimationMixer] stores an [AnimationLibrary] with key [param name]. */
        hasAnimationLibrary<Name extends keyof LibraryMap>(name: Name): boolean
        
        /** Returns the first [AnimationLibrary] with key [param name] or `null` if not found.  
         *  To get the [AnimationMixer]'s global animation library, use `get_animation_library("")`.  
         */
        getAnimationLibrary<Name extends keyof LibraryMap>(name: Name): LibraryMap[Name]
        
        /** Returns the list of stored library keys. */
        getAnimationLibraryList(): keyof LibraryMap extends GAny ? GArray<keyof LibraryMap> : GArray
        
        /** Returns `true` if the [AnimationMixer] stores an [Animation] with key [param name]. */
        hasAnimation<Name extends StaticAnimationMixerPath<LibraryMap>>(name: Name): boolean
        
        /** Returns the [Animation] with the key [param name]. If the animation does not exist, `null` is returned and an error is logged. */
        getAnimation<Name extends StaticAnimationMixerPath<LibraryMap>>(name: Name): ResolveAnimationMixerPath<LibraryMap, Name>
        
        /** Returns the list of stored animation keys. */
        getAnimationList(): PackedStringArray
        
        /** Retrieve the motion delta of position with the [member root_motion_track] as a [Vector3] that can be used elsewhere.  
         *  If [member root_motion_track] is not a path to a track of type [constant Animation.TYPE_POSITION_3D], returns `Vector3(0, 0, 0)`.  
         *  See also [member root_motion_track] and [RootMotionView].  
         *  The most basic example is applying position to [CharacterBody3D]:  
         *    
         *  By using this in combination with [method get_root_motion_rotation_accumulator], you can apply the root motion position more correctly to account for the rotation of the node.  
         *    
         *  If [member root_motion_local] is `true`, returns the pre-multiplied translation value with the inverted rotation.  
         *  In this case, the code can be written as follows:  
         *    
         */
        getRootMotionPosition(): Vector3
        
        /** Retrieve the motion delta of rotation with the [member root_motion_track] as a [Quaternion] that can be used elsewhere.  
         *  If [member root_motion_track] is not a path to a track of type [constant Animation.TYPE_ROTATION_3D], returns `Quaternion(0, 0, 0, 1)`.  
         *  See also [member root_motion_track] and [RootMotionView].  
         *  The most basic example is applying rotation to [CharacterBody3D]:  
         *    
         */
        getRootMotionRotation(): Quaternion
        
        /** Retrieve the motion delta of scale with the [member root_motion_track] as a [Vector3] that can be used elsewhere.  
         *  If [member root_motion_track] is not a path to a track of type [constant Animation.TYPE_SCALE_3D], returns `Vector3(0, 0, 0)`.  
         *  See also [member root_motion_track] and [RootMotionView].  
         *  The most basic example is applying scale to [CharacterBody3D]:  
         *    
         */
        getRootMotionScale(): Vector3
        
        /** Retrieve the blended value of the position tracks with the [member root_motion_track] as a [Vector3] that can be used elsewhere.  
         *  This is useful in cases where you want to respect the initial key values of the animation.  
         *  For example, if an animation with only one key `Vector3(0, 0, 0)` is played in the previous frame and then an animation with only one key `Vector3(1, 0, 1)` is played in the next frame, the difference can be calculated as follows:  
         *    
         *  However, if the animation loops, an unintended discrete change may occur, so this is only useful for some simple use cases.  
         */
        getRootMotionPositionAccumulator(): Vector3
        
        /** Retrieve the blended value of the rotation tracks with the [member root_motion_track] as a [Quaternion] that can be used elsewhere.  
         *  This is necessary to apply the root motion position correctly, taking rotation into account. See also [method get_root_motion_position].  
         *  Also, this is useful in cases where you want to respect the initial key values of the animation.  
         *  For example, if an animation with only one key `Quaternion(0, 0, 0, 1)` is played in the previous frame and then an animation with only one key `Quaternion(0, 0.707, 0, 0.707)` is played in the next frame, the difference can be calculated as follows:  
         *    
         *  However, if the animation loops, an unintended discrete change may occur, so this is only useful for some simple use cases.  
         */
        getRootMotionRotationAccumulator(): Quaternion
        
        /** Retrieve the blended value of the scale tracks with the [member root_motion_track] as a [Vector3] that can be used elsewhere.  
         *  For example, if an animation with only one key `Vector3(1, 1, 1)` is played in the previous frame and then an animation with only one key `Vector3(2, 2, 2)` is played in the next frame, the difference can be calculated as follows:  
         *    
         *  However, if the animation loops, an unintended discrete change may occur, so this is only useful for some simple use cases.  
         */
        getRootMotionScaleAccumulator(): Vector3
        
        /** [AnimationMixer] caches animated nodes. It may not notice if a node disappears; [method clear_caches] forces it to update the cache again. */
        clearCaches(): void
        
        /** Manually advance the animations by the specified time (in seconds). */
        advance(delta: float64): void
        
        /** If the animation track specified by [param name] has an option [constant Animation.UPDATE_CAPTURE], stores current values of the objects indicated by the track path as a cache. If there is already a captured cache, the old cache is discarded.  
         *  After this it will interpolate with current animation blending result during the playback process for the time specified by [param duration], working like a crossfade.  
         *  You can specify [param trans_type] as the curve for the interpolation. For better results, it may be appropriate to specify [constant Tween.TRANS_LINEAR] for cases where the first key of the track begins with a non-zero value or where the key value does not change, and [constant Tween.TRANS_QUAD] for cases where the key value changes linearly.  
         */
        capture(name: StringName, duration: float64, transType?: Tween.TransitionType /* = 0 */, easeType?: Tween.EaseType /* = 0 */): void
        _reset(): void
        _restore(backup: any /*AnimatedValuesBackup*/): void
        
        /** Returns the key of [param animation] or an empty [StringName] if not found. */
        findAnimation(animation: Animation): StringName
        
        /** Returns the key for the [AnimationLibrary] that contains [param animation] or an empty [StringName] if not found. */
        findAnimationLibrary(animation: Animation): StringName
        
        /** If `true`, the [AnimationMixer] will be processing. */
        get active(): boolean
        set active(value: boolean)
        
        /** If `true`, the blending uses the deterministic algorithm. The total weight is not normalized and the result is accumulated with an initial value (`0` or a `"RESET"` animation if present).  
         *  This means that if the total amount of blending is `0.0`, the result is equal to the `"RESET"` animation.  
         *  If the number of tracks between the blended animations is different, the animation with the missing track is treated as if it had the initial value.  
         *  If `false`, The blend does not use the deterministic algorithm. The total weight is normalized and always `1.0`. If the number of tracks between the blended animations is different, nothing is done about the animation that is missing a track.  
         *      
         *  **Note:** In [AnimationTree], the blending with [AnimationNodeAdd2], [AnimationNodeAdd3], [AnimationNodeSub2] or the weight greater than `1.0` may produce unexpected results.  
         *  For example, if [AnimationNodeAdd2] blends two nodes with the amount `1.0`, then total weight is `2.0` but it will be normalized to make the total amount `1.0` and the result will be equal to [AnimationNodeBlend2] with the amount `0.5`.  
         */
        get deterministic(): boolean
        set deterministic(value: boolean)
        
        /** This is used by the editor. If set to `true`, the scene will be saved with the effects of the reset animation (the animation with the key `"RESET"`) applied as if it had been seeked to time 0, with the editor keeping the values that the scene had before saving.  
         *  This makes it more convenient to preview and edit animations in the editor, as changes to the scene will not be saved as long as they are set in the reset animation.  
         */
        get resetOnSave(): boolean
        set resetOnSave(value: boolean)
        
        /** The node which node path references will travel from. */
        get rootNode(): NodePath
        set rootNode(value: NodePath | string)
        
        /** The path to the Animation track used for root motion. Paths must be valid scene-tree paths to a node, and must be specified starting from the parent node of the node that will reproduce the animation. The [member root_motion_track] uses the same format as [method Animation.track_set_path], but note that a bone must be specified.  
         *  If the track has type [constant Animation.TYPE_POSITION_3D], [constant Animation.TYPE_ROTATION_3D], or [constant Animation.TYPE_SCALE_3D] the transformation will be canceled visually, and the animation will appear to stay in place. See also [method get_root_motion_position], [method get_root_motion_rotation], [method get_root_motion_scale], and [RootMotionView].  
         */
        get rootMotionTrack(): NodePath
        set rootMotionTrack(value: NodePath | string)
        
        /** If `true`, [method get_root_motion_position] value is extracted as a local translation value before blending. In other words, it is treated like the translation is done after the rotation. */
        get rootMotionLocal(): boolean
        set rootMotionLocal(value: boolean)
        
        /** The number of possible simultaneous sounds for each of the assigned AudioStreamPlayers.  
         *  For example, if this value is `32` and the animation has two audio tracks, the two [AudioStreamPlayer]s assigned can play simultaneously up to `32` voices each.  
         */
        get audioMaxPolyphony(): int64
        set audioMaxPolyphony(value: int64)
        
        /** The process notification in which to update animations. */
        get callbackModeProcess(): int64
        set callbackModeProcess(value: int64)
        
        /** The call mode used for "Call Method" tracks. */
        get callbackModeMethod(): int64
        set callbackModeMethod(value: int64)
        
        /** Ordinarily, tracks can be set to [constant Animation.UPDATE_DISCRETE] to update infrequently, usually when using nearest interpolation.  
         *  However, when blending with [constant Animation.UPDATE_CONTINUOUS] several results are considered. The [member callback_mode_discrete] specify it explicitly. See also [enum AnimationCallbackModeDiscrete].  
         *  To make the blended results look good, it is recommended to set this to [constant ANIMATION_CALLBACK_MODE_DISCRETE_FORCE_CONTINUOUS] to update every frame during blending. Other values exist for compatibility and they are fine if there is no blending, but not so, may produce artifacts.  
         */
        get callbackModeDiscrete(): int64
        set callbackModeDiscrete(value: int64)
        
        /** Notifies when an animation list is changed. */
        readonly animationListChanged: Signal<() => void>
        
        /** Notifies when the animation libraries have changed. */
        readonly animationLibrariesUpdated: Signal<() => void>
        
        /** Notifies when an animation finished playing.  
         *      
         *  **Note:** This signal is not emitted if an animation is looping.  
         */
        readonly animationFinished: Signal<(animName: StringName) => void>
        
        /** Notifies when an animation starts playing.  
         *      
         *  **Note:** This signal is not emitted if an animation is looping.  
         */
        readonly animationStarted: Signal<(animName: StringName) => void>
        
        /** Notifies when the caches have been cleared, either automatically, or manually via [method clear_caches]. */
        readonly cachesCleared: Signal<() => void>
        
        /** Notifies when the blending result related have been applied to the target objects. */
        readonly mixerApplied: Signal<() => void>
        
        /** Notifies when the property related process have been updated. */
        readonly mixerUpdated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationMixer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationMixer;
    }
    namespace AnimationNode {
        enum FilterAction {
            FilterIgnore = 0,
            FilterPass = 1,
            FilterStop = 2,
            FilterBlend = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNode extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNode extends __NameMapResource {
        _get_child_nodes: "_getChildNodes";
        _get_parameter_list: "_getParameterList";
        _get_child_by_name: "_getChildByName";
        _get_parameter_default_value: "_getParameterDefaultValue";
        _is_parameter_read_only: "_isParameterReadOnly";
        _get_caption: "_getCaption";
        _has_filter: "_hasFilter";
        add_input: "addInput";
        remove_input: "removeInput";
        set_input_name: "setInputName";
        get_input_name: "getInputName";
        get_input_count: "getInputCount";
        find_input: "findInput";
        set_filter_path: "setFilterPath";
        is_path_filtered: "isPathFiltered";
        get_processing_animation_tree_instance_id: "getProcessingAnimationTreeInstanceId";
        is_process_testing: "isProcessTesting";
        blend_animation: "blendAnimation";
        blend_node: "blendNode";
        blend_input: "blendInput";
        set_parameter: "setParameter";
        get_parameter: "getParameter";
        filter_enabled: "filterEnabled";
        tree_changed: "treeChanged";
        node_updated: "nodeUpdated";
        animation_node_renamed: "animationNodeRenamed";
        animation_node_removed: "animationNodeRemoved";
    }
    /** Base class for [AnimationTree] nodes. Not related to scene nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnode.html  
     */
    class AnimationNode extends Resource {
        constructor(identifier?: any)
        /** When inheriting from [AnimationRootNode], implement this virtual method to return all child animation nodes in order as a `name: node` dictionary. */
        /* gdvirtual */ _getChildNodes(): GDictionary
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to return a list of the properties on this animation node. Parameters are custom local memory used for your animation nodes, given a resource can be reused in multiple trees. Format is similar to [method Object.get_property_list]. */
        /* gdvirtual */ _getParameterList(): GArray
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to return a child animation node by its [param name]. */
        /* gdvirtual */ _getChildByName(name: StringName): null | AnimationNode
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to return the default value of a [param parameter]. Parameters are custom local memory used for your animation nodes, given a resource can be reused in multiple trees. */
        /* gdvirtual */ _getParameterDefaultValue(parameter: StringName): any
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to return whether the [param parameter] is read-only. Parameters are custom local memory used for your animation nodes, given a resource can be reused in multiple trees. */
        /* gdvirtual */ _isParameterReadOnly(parameter: StringName): boolean
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to run some code when this animation node is processed. The [param time] parameter is a relative delta, unless [param seek] is `true`, in which case it is absolute.  
         *  Here, call the [method blend_input], [method blend_node] or [method blend_animation] functions. You can also use [method get_parameter] and [method set_parameter] to modify local memory.  
         *  This function should return the delta.  
         */
        /* gdvirtual */ _process(time: float64, seek: boolean, isExternalSeeking: boolean, testOnly: boolean): float64
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to override the text caption for this animation node. */
        /* gdvirtual */ _getCaption(): string
        
        /** When inheriting from [AnimationRootNode], implement this virtual method to return whether the blend tree editor should display filter editing on this animation node. */
        /* gdvirtual */ _hasFilter(): boolean
        
        /** Adds an input to the animation node. This is only useful for animation nodes created for use in an [AnimationNodeBlendTree]. If the addition fails, returns `false`. */
        addInput(name: string): boolean
        
        /** Removes an input, call this only when inactive. */
        removeInput(index: int64): void
        
        /** Sets the name of the input at the given [param input] index. If the setting fails, returns `false`. */
        setInputName(input: int64, name: string): boolean
        
        /** Gets the name of an input by index. */
        getInputName(input: int64): string
        
        /** Amount of inputs in this animation node, only useful for animation nodes that go into [AnimationNodeBlendTree]. */
        getInputCount(): int64
        
        /** Returns the input index which corresponds to [param name]. If not found, returns `-1`. */
        findInput(name: string): int64
        
        /** Adds or removes a path for the filter. */
        setFilterPath(path: NodePath | string, enable: boolean): void
        
        /** Returns `true` if the given path is filtered. */
        isPathFiltered(path: NodePath | string): boolean
        
        /** Returns the object id of the [AnimationTree] that owns this node.  
         *      
         *  **Note:** This method should only be called from within the [method AnimationNodeExtension._process_animation_node] method, and will return an invalid id otherwise.  
         */
        getProcessingAnimationTreeInstanceId(): int64
        
        /** Returns `true` if this animation node is being processed in test-only mode. */
        isProcessTesting(): boolean
        
        /** Blends an animation by [param blend] amount (name must be valid in the linked [AnimationPlayer]). A [param time] and [param delta] may be passed, as well as whether [param seeked] happened.  
         *  A [param looped_flag] is used by internal processing immediately after the loop.  
         */
        blendAnimation(animation: StringName, time: float64, delta: float64, seeked: boolean, isExternalSeeking: boolean, blend: float64, loopedFlag?: Animation.LoopedFlag /* = 0 */): void
        
        /** Blend another animation node (in case this animation node contains child animation nodes). This function is only useful if you inherit from [AnimationRootNode] instead, otherwise editors will not display your animation node for addition. */
        blendNode(name: StringName, node: AnimationNode, time: float64, seek: boolean, isExternalSeeking: boolean, blend: float64, filter?: AnimationNode.FilterAction /* = 0 */, sync?: boolean /* = true */, testOnly?: boolean /* = false */): float64
        
        /** Blends an input. This is only useful for animation nodes created for an [AnimationNodeBlendTree]. The [param time] parameter is a relative delta, unless [param seek] is `true`, in which case it is absolute. A filter mode may be optionally passed. */
        blendInput(inputIndex: int64, time: float64, seek: boolean, isExternalSeeking: boolean, blend: float64, filter?: AnimationNode.FilterAction /* = 0 */, sync?: boolean /* = true */, testOnly?: boolean /* = false */): float64
        
        /** Sets a custom parameter. These are used as local memory, because resources can be reused across the tree or scenes. */
        setParameter(name: StringName, value: any): void
        
        /** Gets the value of a parameter. Parameters are custom local memory used for your animation nodes, given a resource can be reused in multiple trees. */
        getParameter(name: StringName): any
        
        /** If `true`, filtering is enabled. */
        get filterEnabled(): boolean
        set filterEnabled(value: boolean)
        get filters(): GArray
        set filters(value: GArray)
        
        /** Emitted by nodes that inherit from this class and that have an internal tree when one of their animation nodes changes. The animation nodes that emit this signal are [AnimationNodeBlendSpace1D], [AnimationNodeBlendSpace2D], [AnimationNodeStateMachine], [AnimationNodeBlendTree] and [AnimationNodeTransition]. */
        readonly treeChanged: Signal<() => void>
        
        /** Emitted by [AnimationNodeAnimation] when its [member AnimationNodeAnimation.animation] resource is changed, or by [AnimationNodeBlendTree] when its connections change. */
        readonly nodeUpdated: Signal<(objectId: int64) => void>
        
        /** Emitted by nodes that inherit from this class and that have an internal tree when one of their animation node names changes. The animation nodes that emit this signal are [AnimationNodeBlendSpace1D], [AnimationNodeBlendSpace2D], [AnimationNodeStateMachine], and [AnimationNodeBlendTree]. */
        readonly animationNodeRenamed: Signal<(objectId: int64, oldName: string, newName: string) => void>
        
        /** Emitted by nodes that inherit from this class and that have an internal tree when one of their animation nodes removes. The animation nodes that emit this signal are [AnimationNodeBlendSpace1D], [AnimationNodeBlendSpace2D], [AnimationNodeStateMachine], and [AnimationNodeBlendTree]. */
        readonly animationNodeRemoved: Signal<(objectId: int64, nodeName: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNode;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeAdd2 extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeAdd2 extends __NameMapAnimationNodeSync {
    }
    /** Blends two animations additively inside of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeadd2.html  
     */
    class AnimationNodeAdd2 extends AnimationNodeSync {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeAdd2;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeAdd2;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeAdd3 extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeAdd3 extends __NameMapAnimationNodeSync {
    }
    /** Blends two of three animations additively inside of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeadd3.html  
     */
    class AnimationNodeAdd3 extends AnimationNodeSync {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeAdd3;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeAdd3;
    }
    namespace AnimationNodeAnimation {
        enum PlayMode {
            PlayModeForward = 0,
            PlayModeBackward = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeAnimation extends __RPCMapAnimationRootNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeAnimation extends __NameMapAnimationRootNode {
        play_mode: "playMode";
        advance_on_start: "advanceOnStart";
        use_custom_timeline: "useCustomTimeline";
        timeline_length: "timelineLength";
        stretch_time_scale: "stretchTimeScale";
        start_offset: "startOffset";
        loop_mode: "loopMode";
    }
    /** An input animation for an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeanimation.html  
     */
    class AnimationNodeAnimation extends AnimationRootNode {
        constructor(identifier?: any)
        /** Animation to use as an output. It is one of the animations provided by [member AnimationTree.anim_player]. */
        get animation(): StringName
        set animation(value: StringName)
        
        /** Determines the playback direction of the animation. */
        get playMode(): int64
        set playMode(value: int64)
        
        /** If `true`, on receiving a request to play an animation from the start, the first frame is not drawn, but only processed, and playback starts from the next frame.  
         *  See also the notes of [method AnimationPlayer.play].  
         */
        get advanceOnStart(): boolean
        set advanceOnStart(value: boolean)
        
        /** If `true`, [AnimationNode] provides an animation based on the [Animation] resource with some parameters adjusted. */
        get useCustomTimeline(): boolean
        set useCustomTimeline(value: boolean)
        
        /** The length of the custom timeline.  
         *  If [member stretch_time_scale] is `true`, scales the animation to this length.  
         */
        get timelineLength(): float64
        set timelineLength(value: float64)
        
        /** If `true`, scales the time so that the length specified in [member timeline_length] is one cycle.  
         *  This is useful for matching the periods of walking and running animations.  
         *  If `false`, the original animation length is respected. If you set the loop to [member loop_mode], the animation will loop in [member timeline_length].  
         */
        get stretchTimeScale(): boolean
        set stretchTimeScale(value: boolean)
        
        /** If [member use_custom_timeline] is `true`, offset the start position of the animation.  
         *  This is useful for adjusting which foot steps first in 3D walking animations.  
         */
        get startOffset(): float64
        set startOffset(value: float64)
        
        /** If [member use_custom_timeline] is `true`, override the loop settings of the original [Animation] resource with the value.  
         *      
         *  **Note:** If the [member Animation.loop_mode] isn't set to looping, the [method Animation.track_set_interpolation_loop_wrap] option will not be respected. If you cannot get the expected behavior, consider duplicating the [Animation] resource and changing the loop settings.  
         */
        get loopMode(): int64
        set loopMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeAnimation;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeAnimation;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeBlend2 extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeBlend2 extends __NameMapAnimationNodeSync {
    }
    /** Blends two animations linearly inside of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeblend2.html  
     */
    class AnimationNodeBlend2 extends AnimationNodeSync {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeBlend2;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeBlend2;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeBlend3 extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeBlend3 extends __NameMapAnimationNodeSync {
    }
    /** Blends two of three animations linearly inside of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeblend3.html  
     */
    class AnimationNodeBlend3 extends AnimationNodeSync {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeBlend3;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeBlend3;
    }
    namespace AnimationNodeBlendSpace1D {
        enum BlendMode {
            BlendModeInterpolated = 0,
            BlendModeDiscrete = 1,
            BlendModeDiscreteCarry = 2,
        }
        enum SyncMode {
            SyncModeNone = 0,
            SyncModeIndependent = 1,
            SyncModeCyclicMutable = 2,
            SyncModeCyclicConstant = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeBlendSpace1D extends __RPCMapAnimationRootNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeBlendSpace1D extends __NameMapAnimationRootNode {
        add_blend_point: "addBlendPoint";
        set_blend_point_position: "setBlendPointPosition";
        get_blend_point_position: "getBlendPointPosition";
        set_blend_point_node: "setBlendPointNode";
        get_blend_point_node: "getBlendPointNode";
        set_blend_point_name: "setBlendPointName";
        get_blend_point_name: "getBlendPointName";
        find_blend_point_by_name: "findBlendPointByName";
        remove_blend_point: "removeBlendPoint";
        get_blend_point_count: "getBlendPointCount";
        reorder_blend_point: "reorderBlendPoint";
        min_space: "minSpace";
        max_space: "maxSpace";
        value_label: "valueLabel";
        blend_mode: "blendMode";
        sync_mode: "syncMode";
        cyclic_length: "cyclicLength";
    }
    /** A set of [AnimationRootNode]s placed on a virtual axis, crossfading between the two adjacent ones. Used by [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeblendspace1d.html  
     */
    class AnimationNodeBlendSpace1D extends AnimationRootNode {
        constructor(identifier?: any)
        /** Adds a new point with [param name] that represents a [param node] on the virtual axis at a given position set by [param pos]. You can insert it at a specific index using the [param at_index] argument. If you use the default value for [param at_index], the point is inserted at the end of the blend points array.  
         *      
         *  **Note:** If no name is provided, safe index is used as reference. In the future, empty names will be deprecated, so explicitly passing a name is recommended.  
         */
        addBlendPoint(node: AnimationRootNode, pos: float64, atIndex?: int64 /* = -1 */, name?: StringName /* = '' */): void
        
        /** Updates the position of the point at index [param point] on the blend axis. */
        setBlendPointPosition(point: int64, pos: float64): void
        
        /** Returns the position of the point at index [param point]. */
        getBlendPointPosition(point: int64): float64
        
        /** Changes the [AnimationNode] referenced by the point at index [param point]. */
        setBlendPointNode(point: int64, node: AnimationRootNode): void
        
        /** Returns the [AnimationNode] referenced by the point at index [param point]. */
        getBlendPointNode(point: int64): null | AnimationRootNode
        
        /** Sets the name of the blend point at index [param point]. If the name conflicts with an existing point, a unique name will be generated automatically. */
        setBlendPointName(point: int64, name: StringName): void
        
        /** Returns the name of the blend point at index [param point]. */
        getBlendPointName(point: int64): StringName
        
        /** Returns the index of the blend point with the given [param name]. Returns `-1` if no blend point with that name is found. */
        findBlendPointByName(name: StringName): int64
        
        /** Removes the point at index [param point] from the blend axis. */
        removeBlendPoint(point: int64): void
        
        /** Returns the number of points on the blend axis. */
        getBlendPointCount(): int64
        
        /** Swaps the blend points at indices [param from_index] and [param to_index], exchanging their positions and properties. */
        reorderBlendPoint(fromIndex: int64, toIndex: int64): void
        
        /** The blend space's axis's lower limit for the points' position. See [method add_blend_point]. */
        get minSpace(): float64
        set minSpace(value: float64)
        
        /** The blend space's axis's upper limit for the points' position. See [method add_blend_point]. */
        get maxSpace(): float64
        set maxSpace(value: float64)
        
        /** Position increment to snap to when moving a point on the axis. */
        get snap(): float64
        set snap(value: float64)
        
        /** Label of the virtual axis of the blend space. */
        get valueLabel(): string
        set valueLabel(value: string)
        
        /** Controls the interpolation between animations. */
        get blendMode(): int64
        set blendMode(value: int64)
        
        /** If `true`, sync mode is enabled (equivalent to [constant SYNC_MODE_INDEPENDENT]). This property is kept for backward compatibility. */
        get sync(): boolean
        set sync(value: boolean)
        
        /** Controls how animations are synced when blended. See [enum SyncMode] for available options. */
        get syncMode(): int64
        set syncMode(value: int64)
        
        /** The cycle length in seconds used by [constant SYNC_MODE_CYCLIC_CONSTANT]. All animations are time-scaled so they complete one full cycle in this duration. Must be greater than `0` for cyclic sync to take effect. */
        get cyclicLength(): float64
        set cyclicLength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeBlendSpace1D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeBlendSpace1D;
    }
    namespace AnimationNodeBlendSpace2D {
        enum BlendMode {
            BlendModeInterpolated = 0,
            BlendModeDiscrete = 1,
            BlendModeDiscreteCarry = 2,
        }
        enum SyncMode {
            SyncModeNone = 0,
            SyncModeIndependent = 1,
            SyncModeCyclicMutable = 2,
            SyncModeCyclicConstant = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeBlendSpace2D extends __RPCMapAnimationRootNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeBlendSpace2D extends __NameMapAnimationRootNode {
        add_blend_point: "addBlendPoint";
        set_blend_point_position: "setBlendPointPosition";
        get_blend_point_position: "getBlendPointPosition";
        set_blend_point_node: "setBlendPointNode";
        get_blend_point_node: "getBlendPointNode";
        set_blend_point_name: "setBlendPointName";
        get_blend_point_name: "getBlendPointName";
        find_blend_point_by_name: "findBlendPointByName";
        remove_blend_point: "removeBlendPoint";
        get_blend_point_count: "getBlendPointCount";
        reorder_blend_point: "reorderBlendPoint";
        add_triangle: "addTriangle";
        get_triangle_point: "getTrianglePoint";
        remove_triangle: "removeTriangle";
        get_triangle_count: "getTriangleCount";
        _set_triangles: "_setTriangles";
        _get_triangles: "_getTriangles";
        auto_triangles: "autoTriangles";
        min_space: "minSpace";
        max_space: "maxSpace";
        x_label: "xLabel";
        y_label: "yLabel";
        blend_mode: "blendMode";
        sync_mode: "syncMode";
        cyclic_length: "cyclicLength";
        triangles_updated: "trianglesUpdated";
    }
    /** A set of [AnimationRootNode]s placed on 2D coordinates, crossfading between the three adjacent ones. Used by [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeblendspace2d.html  
     */
    class AnimationNodeBlendSpace2D extends AnimationRootNode {
        constructor(identifier?: any)
        /** Adds a new point with [param name] that represents a [param node] at the position set by [param pos]. You can insert it at a specific index using the [param at_index] argument. If you use the default value for [param at_index], the point is inserted at the end of the blend points array.  
         *      
         *  **Note:** If no name is provided, safe index is used as reference. In the future, empty names will be deprecated, so explicitly passing a name is recommended.  
         */
        addBlendPoint(node: AnimationRootNode, pos: Vector2, atIndex?: int64 /* = -1 */, name?: StringName /* = '' */): void
        
        /** Updates the position of the point at index [param point] in the blend space. */
        setBlendPointPosition(point: int64, pos: Vector2): void
        
        /** Returns the position of the point at index [param point]. */
        getBlendPointPosition(point: int64): Vector2
        
        /** Changes the [AnimationNode] referenced by the point at index [param point]. */
        setBlendPointNode(point: int64, node: AnimationRootNode): void
        
        /** Returns the [AnimationRootNode] referenced by the point at index [param point]. */
        getBlendPointNode(point: int64): null | AnimationRootNode
        
        /** Sets the name of the blend point at index [param point]. If the name conflicts with an existing point, a unique name will be generated automatically. */
        setBlendPointName(point: int64, name: StringName): void
        
        /** Returns the name of the blend point at index [param point]. */
        getBlendPointName(point: int64): StringName
        
        /** Returns the index of the blend point with the given [param name]. Returns `-1` if no blend point with that name is found. */
        findBlendPointByName(name: StringName): int64
        
        /** Removes the point at index [param point] from the blend space. */
        removeBlendPoint(point: int64): void
        
        /** Returns the number of points in the blend space. */
        getBlendPointCount(): int64
        
        /** Swaps the blend points at indices [param from_index] and [param to_index], exchanging their positions and properties. */
        reorderBlendPoint(fromIndex: int64, toIndex: int64): void
        
        /** Creates a new triangle using three points [param x], [param y], and [param z]. Triangles can overlap. You can insert the triangle at a specific index using the [param at_index] argument. If you use the default value for [param at_index], the point is inserted at the end of the blend points array. */
        addTriangle(x: int64, y: int64, z: int64, atIndex?: int64 /* = -1 */): void
        
        /** Returns the position of the point at index [param point] in the triangle of index [param triangle]. */
        getTrianglePoint(triangle: int64, point: int64): int64
        
        /** Removes the triangle at index [param triangle] from the blend space. */
        removeTriangle(triangle: int64): void
        
        /** Returns the number of triangles in the blend space. */
        getTriangleCount(): int64
        _setTriangles(triangles: PackedInt32Array | int32[]): void
        _getTriangles(): PackedInt32Array
        
        /** If `true`, the blend space is triangulated automatically. The mesh updates every time you add or remove points with [method add_blend_point] and [method remove_blend_point]. */
        get autoTriangles(): boolean
        set autoTriangles(value: boolean)
        
        /** The blend space's X and Y axes' lower limit for the points' position. See [method add_blend_point]. */
        get minSpace(): Vector2
        set minSpace(value: Vector2)
        
        /** The blend space's X and Y axes' upper limit for the points' position. See [method add_blend_point]. */
        get maxSpace(): Vector2
        set maxSpace(value: Vector2)
        
        /** Position increment to snap to when moving a point. */
        get snap(): Vector2
        set snap(value: Vector2)
        
        /** Name of the blend space's X axis. */
        get xLabel(): string
        set xLabel(value: string)
        
        /** Name of the blend space's Y axis. */
        get yLabel(): string
        set yLabel(value: string)
        
        /** Controls the interpolation between animations. */
        get blendMode(): int64
        set blendMode(value: int64)
        
        /** If `true`, sync mode is enabled (equivalent to [constant SYNC_MODE_INDEPENDENT]). This property is kept for backward compatibility. */
        get sync(): boolean
        set sync(value: boolean)
        
        /** Controls how animations are synced when blended. See [enum SyncMode] for available options. */
        get syncMode(): int64
        set syncMode(value: int64)
        
        /** The cycle length in seconds used by [constant SYNC_MODE_CYCLIC_CONSTANT]. All animations are time-scaled so they complete one full cycle in this duration. Must be greater than `0` for cyclic sync to take effect. */
        get cyclicLength(): float64
        set cyclicLength(value: float64)
        
        /** Emitted every time the blend space's triangles are created, removed, or when one of their vertices changes position. */
        readonly trianglesUpdated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeBlendSpace2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeBlendSpace2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeBlendTree extends __RPCMapAnimationRootNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeBlendTree extends __NameMapAnimationRootNode {
        add_node: "addNode";
        get_node: "getNode";
        remove_node: "removeNode";
        rename_node: "renameNode";
        has_node: "hasNode";
        connect_node: "connectNode";
        disconnect_node: "disconnectNode";
        get_node_list: "getNodeList";
        set_node_position: "setNodePosition";
        get_node_position: "getNodePosition";
        graph_offset: "graphOffset";
        node_changed: "nodeChanged";
    }
    /** A sub-tree of many type [AnimationNode]s used for complex animations. Used by [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeblendtree.html  
     */
    class AnimationNodeBlendTree extends AnimationRootNode {
        /** The connection was successful. */
        static readonly CONNECTION_OK = 0
        
        /** The input node is `null`. */
        static readonly CONNECTION_ERROR_NO_INPUT = 1
        
        /** The specified input port is out of range. */
        static readonly CONNECTION_ERROR_NO_INPUT_INDEX = 2
        
        /** The output node is `null`. */
        static readonly CONNECTION_ERROR_NO_OUTPUT = 3
        
        /** Input and output nodes are the same. */
        static readonly CONNECTION_ERROR_SAME_NODE = 4
        
        /** The specified connection already exists. */
        static readonly CONNECTION_ERROR_CONNECTION_EXISTS = 5
        constructor(identifier?: any)
        
        /** Adds an [AnimationNode] at the given [param position]. The [param name] is used to identify the created sub animation node later. */
        addNode(name: StringName, node: AnimationNode, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Returns the sub animation node with the specified [param name]. */
        getNode(name: StringName): null | AnimationNode
        
        /** Removes a sub animation node. */
        removeNode(name: StringName): void
        
        /** Changes the name of a sub animation node. */
        renameNode(name: StringName, newName: StringName): void
        
        /** Returns `true` if a sub animation node with specified [param name] exists. */
        hasNode(name: StringName): boolean
        
        /** Connects the output of an [AnimationNode] as input for another [AnimationNode], at the input port specified by [param input_index]. */
        connectNode(inputNode: StringName, inputIndex: int64, outputNode: StringName): void
        
        /** Disconnects the animation node connected to the specified input. */
        disconnectNode(inputNode: StringName, inputIndex: int64): void
        
        /** Returns a list containing the names of all sub animation nodes in this blend tree. */
        getNodeList(): GArray<StringName>
        
        /** Modifies the position of a sub animation node. */
        setNodePosition(name: StringName, position: Vector2): void
        
        /** Returns the position of the sub animation node with the specified [param name]. */
        getNodePosition(name: StringName): Vector2
        
        /** The global offset of all sub animation nodes. */
        get graphOffset(): Vector2
        set graphOffset(value: Vector2)
        
        /** Emitted when the input port information is changed. */
        readonly nodeChanged: Signal<(nodeName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeBlendTree;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeBlendTree;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeExtension extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeExtension extends __NameMapAnimationNode {
        _process_animation_node: "_processAnimationNode";
        is_looping: "isLooping";
        get_remaining_time: "getRemainingTime";
    }
    /** Base class for extending [AnimationRootNode]s from GDScript, C#, or C++.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeextension.html  
     */
    class AnimationNodeExtension extends AnimationNode {
        constructor(identifier?: any)
        /** A version of the [method AnimationNode._process] method that is meant to be overridden by custom nodes. It returns a [PackedFloat32Array] with the processed animation data.  
         *  The [PackedFloat64Array] parameter contains the playback information, containing the following values encoded as floating point numbers (in order): playback time and delta, start and end times, whether a seek was requested (encoded as a float greater than `0`), whether the seek request was externally requested (encoded as a float greater than `0`), the current [enum Animation.LoopedFlag] (encoded as a float), and the current blend weight.  
         *  The function must return a [PackedFloat32Array] of the node's time info, containing the following values (in order): animation length, time position, delta, [enum Animation.LoopMode] (encoded as a float), whether the animation is about to end (encoded as a float greater than `0`) and whether the animation is infinite (encoded as a float greater than `0`). All values must be included in the returned array.  
         */
        /* gdvirtual */ _processAnimationNode(playbackInfo: PackedFloat64Array | float64[], testOnly: boolean): PackedFloat32Array
        
        /** Returns `true` if the animation for the given [param node_info] is looping. */
        static isLooping(nodeInfo: PackedFloat32Array | float32[]): boolean
        
        /** Returns the animation's remaining time for the given node info. For looping animations, it will only return the remaining time if [param break_loop] is `true`, a large integer value will be returned otherwise. */
        static getRemainingTime(nodeInfo: PackedFloat32Array | float32[], breakLoop: boolean): float64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeObserver extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeObserver extends __NameMapResource {
    }
    /** Base class for observer types which relay [AnimationNode] events for a particular [AnimationTree] node.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeobserver.html  
     */
    class AnimationNodeObserver extends Resource {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeObserver;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeObserver;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeObserverBlendSpace extends __RPCMapAnimationNodeObserver {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeObserverBlendSpace extends __NameMapAnimationNodeObserver {
        closest_point_changed: "closestPointChanged";
    }
    /** Observer for events from [AnimationNodeBlendSpace1D] and [AnimationNodeBlendSpace2D] instances.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeobserverblendspace.html  
     */
    class AnimationNodeObserverBlendSpace extends AnimationNodeObserver {
        constructor(identifier?: any)
        /** Emitted when the closest point to the current blend position changes. */
        readonly closestPointChanged: Signal<(closestPointName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeObserverBlendSpace;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeObserverBlendSpace;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeObserverOneShot extends __RPCMapAnimationNodeObserver {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeObserverOneShot extends __NameMapAnimationNodeObserver {
        fade_in_finished: "fadeInFinished";
        fade_out_started: "fadeOutStarted";
    }
    /** Observer for events from [AnimationNodeOneShot] instances.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeobserveroneshot.html  
     */
    class AnimationNodeObserverOneShot extends AnimationNodeObserver {
        constructor(identifier?: any)
        /** Emitted when the one-shot has started. */
        readonly started: Signal<() => void>
        
        /** Emitted when the one-shot has finished fading in. Only emitted if fade-in time is greater than zero. */
        readonly fadeInFinished: Signal<() => void>
        
        /** Emitted when the one-shot has started fading out. Only emitted if fade-out time is greater than zero. */
        readonly fadeOutStarted: Signal<() => void>
        
        /** Emitted when the one-shot has finished. */
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeObserverOneShot;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeObserverOneShot;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeObserverTransition extends __RPCMapAnimationNodeObserver {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeObserverTransition extends __NameMapAnimationNodeObserver {
        state_started: "stateStarted";
        state_finished: "stateFinished";
    }
    /** Observer for events from [AnimationNodeTransition] instances.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeobservertransition.html  
     */
    class AnimationNodeObserverTransition extends AnimationNodeObserver {
        constructor(identifier?: any)
        /** Emitted when a transition to a new state starts. */
        readonly stateStarted: Signal<(state: string) => void>
        
        /** Emitted when transitioning out of a state. If crossfade time is greater than zero, emits when the crossfade finishes. Otherwise, emits immediately before [signal state_started] emits for the new state. */
        readonly stateFinished: Signal<(state: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeObserverTransition;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeObserverTransition;
    }
    namespace AnimationNodeOneShot {
        enum OneShotRequest {
            OneShotRequestNone = 0,
            OneShotRequestFire = 1,
            OneShotRequestAbort = 2,
            OneShotRequestFadeOut = 3,
        }
        enum MixMode {
            MixModeBlend = 0,
            MixModeAdd = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeOneShot extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeOneShot extends __NameMapAnimationNodeSync {
        mix_mode: "mixMode";
        fadein_time: "fadeInTime";
        fadein_curve: "fadeInCurve";
        fadeout_time: "fadeOutTime";
        fadeout_curve: "fadeOutCurve";
        break_loop_at_end: "breakLoopAtEnd";
        abort_on_reset: "abortOnReset";
        autorestart_delay: "autorestartDelay";
        autorestart_random_delay: "autorestartRandomDelay";
    }
    /** Plays an animation once in an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeoneshot.html  
     */
    class AnimationNodeOneShot extends AnimationNodeSync {
        constructor(identifier?: any)
        /** The blend type. */
        get mixMode(): int64
        set mixMode(value: int64)
        
        /** The fade-in duration. For example, setting this to `1.0` for a 5 second length animation will produce a cross-fade that starts at 0 second and ends at 1 second during the animation.  
         *      
         *  **Note:** [AnimationNodeOneShot] transitions the current state after the fading has finished.  
         */
        get fadeInTime(): float64
        set fadeInTime(value: float64)
        
        /** Determines how cross-fading between animations is eased. If empty, the transition will be linear. Should be a unit [Curve]. */
        get fadeInCurve(): null | Curve
        set fadeInCurve(value: null | Curve)
        
        /** The fade-out duration. For example, setting this to `1.0` for a 5 second length animation will produce a cross-fade that starts at 4 second and ends at 5 second during the animation.  
         *      
         *  **Note:** [AnimationNodeOneShot] transitions the current state after the fading has finished.  
         */
        get fadeOutTime(): float64
        set fadeOutTime(value: float64)
        
        /** Determines how cross-fading between animations is eased. If empty, the transition will be linear. Should be a unit [Curve]. */
        get fadeOutCurve(): null | Curve
        set fadeOutCurve(value: null | Curve)
        
        /** If `true`, breaks the loop at the end of the loop cycle for transition, even if the animation is looping. */
        get breakLoopAtEnd(): boolean
        set breakLoopAtEnd(value: boolean)
        
        /** If `true`, the sub-animation will abort if resumed with a reset after a prior interruption. */
        get abortOnReset(): boolean
        set abortOnReset(value: boolean)
        
        /** If `true`, the sub-animation will restart automatically after finishing.  
         *  In other words, to start auto restarting, the animation must be played once with the [constant ONE_SHOT_REQUEST_FIRE] request. The [constant ONE_SHOT_REQUEST_ABORT] request stops the auto restarting, but it does not disable the [member autorestart] itself. So, the [constant ONE_SHOT_REQUEST_FIRE] request will start auto restarting again.  
         */
        get autorestart(): boolean
        set autorestart(value: boolean)
        
        /** The delay after which the automatic restart is triggered, in seconds. */
        get autorestartDelay(): float64
        set autorestartDelay(value: float64)
        
        /** If [member autorestart] is `true`, a random additional delay (in seconds) between 0 and this value will be added to [member autorestart_delay]. */
        get autorestartRandomDelay(): float64
        set autorestartRandomDelay(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeOneShot;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeOneShot;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeOutput extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeOutput extends __NameMapAnimationNode {
    }
    /** The animation output node of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodeoutput.html  
     */
    class AnimationNodeOutput extends AnimationNode {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeOutput;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeOutput;
    }
    namespace AnimationNodeStateMachine {
        enum StateMachineType {
            StateMachineTypeRoot = 0,
            StateMachineTypeNested = 1,
            StateMachineTypeGrouped = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeStateMachine extends __RPCMapAnimationRootNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeStateMachine extends __NameMapAnimationRootNode {
        add_node: "addNode";
        replace_node: "replaceNode";
        get_node: "getNode";
        remove_node: "removeNode";
        rename_node: "renameNode";
        has_node: "hasNode";
        get_node_name: "getNodeName";
        get_node_list: "getNodeList";
        set_node_position: "setNodePosition";
        get_node_position: "getNodePosition";
        has_transition: "hasTransition";
        add_transition: "addTransition";
        get_transition: "getTransition";
        get_transition_from: "getTransitionFrom";
        get_transition_to: "getTransitionTo";
        get_transition_count: "getTransitionCount";
        remove_transition_by_index: "removeTransitionByIndex";
        remove_transition: "removeTransition";
        set_graph_offset: "setGraphOffset";
        get_graph_offset: "getGraphOffset";
        state_machine_type: "stateMachineType";
        allow_transition_to_self: "allowTransitionToSelf";
        reset_ends: "resetEnds";
    }
    /** A state machine with multiple [AnimationRootNode]s, used by [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodestatemachine.html  
     */
    class AnimationNodeStateMachine extends AnimationRootNode {
        constructor(identifier?: any)
        /** Adds a new animation node to the graph. The [param position] is used for display in the editor. */
        addNode(name: StringName, node: AnimationNode, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Replaces the given animation node with a new animation node. */
        replaceNode(name: StringName, node: AnimationNode): void
        
        /** Returns the animation node with the given name. */
        getNode(name: StringName): null | AnimationNode
        
        /** Deletes the given animation node from the graph. */
        removeNode(name: StringName): void
        
        /** Renames the given animation node. */
        renameNode(name: StringName, newName: StringName): void
        
        /** Returns `true` if the graph contains the given animation node. */
        hasNode(name: StringName): boolean
        
        /** Returns the given animation node's name. */
        getNodeName(node: AnimationNode): StringName
        
        /** Returns a list containing the names of all animation nodes in this state machine. */
        getNodeList(): GArray<StringName>
        
        /** Sets the animation node's coordinates. Used for display in the editor. */
        setNodePosition(name: StringName, position: Vector2): void
        
        /** Returns the given animation node's coordinates. Used for display in the editor. */
        getNodePosition(name: StringName): Vector2
        
        /** Returns `true` if there is a transition between the given animation nodes. */
        hasTransition(from: StringName, to: StringName): boolean
        
        /** Adds a transition between the given animation nodes. */
        addTransition(from: StringName, to: StringName, transition: AnimationNodeStateMachineTransition): void
        
        /** Returns the given transition. */
        getTransition(idx: int64): null | AnimationNodeStateMachineTransition
        
        /** Returns the given transition's start node. */
        getTransitionFrom(idx: int64): StringName
        
        /** Returns the given transition's end node. */
        getTransitionTo(idx: int64): StringName
        
        /** Returns the number of connections in the graph. */
        getTransitionCount(): int64
        
        /** Deletes the given transition by index. */
        removeTransitionByIndex(idx: int64): void
        
        /** Deletes the transition between the two specified animation nodes. */
        removeTransition(from: StringName, to: StringName): void
        
        /** Sets the draw offset of the graph. Used for display in the editor. */
        setGraphOffset(offset: Vector2): void
        
        /** Returns the draw offset of the graph. Used for display in the editor. */
        getGraphOffset(): Vector2
        
        /** This property can define the process of transitions for different use cases. See also [enum AnimationNodeStateMachine.StateMachineType]. */
        get stateMachineType(): int64
        set stateMachineType(value: int64)
        
        /** If `true`, allows teleport to the self state with [method AnimationNodeStateMachinePlayback.travel]. When the reset option is enabled in [method AnimationNodeStateMachinePlayback.travel], the animation is restarted. If `false`, nothing happens on the teleportation to the self state. */
        get allowTransitionToSelf(): boolean
        set allowTransitionToSelf(value: boolean)
        
        /** If `true`, treat the cross-fade to the start and end nodes as a blend with the RESET animation.  
         *  In most cases, when additional cross-fades are performed in the parent [AnimationNode] of the state machine, setting this property to `false` and matching the cross-fade time of the parent [AnimationNode] and the state machine's start node and end node gives good results.  
         */
        get resetEnds(): boolean
        set resetEnds(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeStateMachine;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeStateMachine;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeStateMachinePlayback extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeStateMachinePlayback extends __NameMapResource {
        is_playing: "isPlaying";
        get_current_node: "getCurrentNode";
        get_current_play_position: "getCurrentPlayPosition";
        get_current_length: "getCurrentLength";
        get_fading_from_node: "getFadingFromNode";
        get_fading_from_play_position: "getFadingFromPlayPosition";
        get_fading_from_length: "getFadingFromLength";
        get_fading_position: "getFadingPosition";
        get_fading_length: "getFadingLength";
        get_travel_path: "getTravelPath";
        state_started: "stateStarted";
        state_finished: "stateFinished";
    }
    /** Provides playback control for an [AnimationNodeStateMachine].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodestatemachineplayback.html  
     */
    class AnimationNodeStateMachinePlayback extends Resource {
        constructor(identifier?: any)
        /** Transitions from the current state to another one, following the shortest path.  
         *  If the path does not connect from the current state, the animation will play after the state teleports.  
         *  If [param reset_on_teleport] is `true`, the animation is played from the beginning when the travel cause a teleportation.  
         */
        travel(toNode: StringName, resetOnTeleport?: boolean /* = true */): void
        
        /** Starts playing the given animation.  
         *  If [param reset] is `true`, the animation is played from the beginning.  
         */
        start(node: StringName, reset?: boolean /* = true */): void
        
        /** If there is a next path by travel or auto advance, immediately transitions from the current state to the next state. */
        next(): void
        
        /** Stops the currently playing animation. */
        stop(): void
        
        /** Returns `true` if an animation is playing. */
        isPlaying(): boolean
        
        /** Returns the currently playing animation state.  
         *      
         *  **Note:** When using a cross-fade, the current state changes to the next state immediately after the cross-fade begins.  
         */
        getCurrentNode(): StringName
        
        /** Returns the playback position within the current animation state. */
        getCurrentPlayPosition(): float64
        
        /** Returns the current state length.  
         *      
         *  **Note:** It is possible that any [AnimationRootNode] can be nodes as well as animations. This means that there can be multiple animations within a single state. Which animation length has priority depends on the nodes connected inside it. Also, if a transition does not reset, the remaining length at that point will be returned.  
         */
        getCurrentLength(): float64
        
        /** Returns the starting state of currently fading animation. */
        getFadingFromNode(): StringName
        
        /** Returns the playback position of the node from [method get_fading_from_node]. Returns `0` if no animation fade is occurring. */
        getFadingFromPlayPosition(): float64
        
        /** Returns the playback state length of the node from [method get_fading_from_node]. Returns `0` if no animation fade is occurring. */
        getFadingFromLength(): float64
        
        /** Returns the playback position of the current fade animation. Returns `0` if no animation fade is occurring. */
        getFadingPosition(): float64
        
        /** Returns the length of the current fade animation. Returns `0` if no animation fade is occurring. */
        getFadingLength(): float64
        
        /** Returns the current travel path as computed internally by the A* algorithm. */
        getTravelPath(): GArray<StringName>
        
        /** Emitted when the [param state] starts playback. If [param state] is a state machine set to grouped mode, its signals are passed through with its name prefixed. */
        readonly stateStarted: Signal<(state: StringName) => void>
        
        /** Emitted when the [param state] finishes playback. If [param state] is a state machine set to grouped mode, its signals are passed through with its name prefixed.  
         *  If there is a crossfade, this will be fired when the influence of the [method get_fading_from_node] animation is no longer present.  
         */
        readonly stateFinished: Signal<(state: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeStateMachinePlayback;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeStateMachinePlayback;
    }
    namespace AnimationNodeStateMachineTransition {
        enum SwitchMode {
            SwitchModeImmediate = 0,
            SwitchModeSync = 1,
            SwitchModeAtEnd = 2,
        }
        enum AdvanceMode {
            AdvanceModeDisabled = 0,
            AdvanceModeEnabled = 1,
            AdvanceModeAuto = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeStateMachineTransition extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeStateMachineTransition extends __NameMapResource {
        xfade_time: "xfadeTime";
        xfade_curve: "xfadeCurve";
        break_loop_at_end: "breakLoopAtEnd";
        switch_mode: "switchMode";
        advance_mode: "advanceMode";
        advance_condition: "advanceCondition";
        advance_expression: "advanceExpression";
        advance_condition_changed: "advanceConditionChanged";
    }
    /** A transition within an [AnimationNodeStateMachine] connecting two [AnimationRootNode]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodestatemachinetransition.html  
     */
    class AnimationNodeStateMachineTransition extends Resource {
        constructor(identifier?: any)
        /** The time to cross-fade between this state and the next.  
         *      
         *  **Note:** [AnimationNodeStateMachine] transitions the current state immediately after the start of the fading. The precise remaining time can only be inferred from the main animation. When [AnimationNodeOutput] is considered as the most upstream, so the [member xfade_time] is not scaled depending on the downstream delta. See also [member AnimationNodeOneShot.fadeout_time].  
         */
        get xfadeTime(): float64
        set xfadeTime(value: float64)
        
        /** Ease curve for better control over cross-fade between this state and the next. Should be a unit [Curve]. */
        get xfadeCurve(): null | Curve
        set xfadeCurve(value: null | Curve)
        
        /** If `true`, breaks the loop at the end of the loop cycle for transition, even if the animation is looping. */
        get breakLoopAtEnd(): boolean
        set breakLoopAtEnd(value: boolean)
        
        /** If `true`, the destination animation is played back from the beginning when switched. */
        get reset(): boolean
        set reset(value: boolean)
        
        /** Lower priority transitions are preferred when travelling through the tree via [method AnimationNodeStateMachinePlayback.travel] or [member advance_mode] is set to [constant ADVANCE_MODE_AUTO]. */
        get priority(): int64
        set priority(value: int64)
        
        /** The transition type. */
        get switchMode(): int64
        set switchMode(value: int64)
        
        /** Determines whether the transition should be disabled, enabled when using [method AnimationNodeStateMachinePlayback.travel], or traversed automatically if the [member advance_condition] and [member advance_expression] checks are `true` (if assigned). */
        get advanceMode(): int64
        set advanceMode(value: int64)
        
        /** Turn on auto advance when this condition is set. The provided name will become a boolean parameter on the [AnimationTree] that can be controlled from code (see [url=https://docs.godotengine.org/en/latest/tutorials/animation/animation_tree.html#controlling-from-code]Using AnimationTree[/url]). For example, if [member AnimationTree.tree_root] is an [AnimationNodeStateMachine] and [member advance_condition] is set to `"idle"`:  
         *    
         */
        get advanceCondition(): StringName
        set advanceCondition(value: StringName)
        
        /** Use an expression as a condition for state machine transitions. It is possible to create complex animation advance conditions for switching between states and gives much greater flexibility for creating complex state machines by directly interfacing with the script code. */
        get advanceExpression(): string
        set advanceExpression(value: string)
        
        /** Emitted when [member advance_condition] is changed. */
        readonly advanceConditionChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeStateMachineTransition;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeStateMachineTransition;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeSub2 extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeSub2 extends __NameMapAnimationNodeSync {
    }
    /** Blends two animations subtractively inside of an [AnimationNodeBlendTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodesub2.html  
     */
    class AnimationNodeSub2 extends AnimationNodeSync {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeSub2;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeSub2;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeSync extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeSync extends __NameMapAnimationNode {
    }
    /** Base class for [AnimationNode]s with multiple input ports that must be synchronized.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodesync.html  
     */
    class AnimationNodeSync extends AnimationNode {
        constructor(identifier?: any)
        /** If `false`, the blended animations' frame are stopped when the blend value is `0`.  
         *  If `true`, forcing the blended animations to advance frame.  
         */
        get sync(): boolean
        set sync(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeSync;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeSync;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeTimeScale extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeTimeScale extends __NameMapAnimationNode {
    }
    /** A time-scaling animation node used in [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodetimescale.html  
     */
    class AnimationNodeTimeScale extends AnimationNode {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeTimeScale;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeTimeScale;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeTimeSeek extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeTimeSeek extends __NameMapAnimationNode {
        explicit_elapse: "explicitElapse";
    }
    /** A time-seeking animation node used in [AnimationTree].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodetimeseek.html  
     */
    class AnimationNodeTimeSeek extends AnimationNode {
        constructor(identifier?: any)
        /** If `true`, some processes are executed to handle keys between seeks, such as calculating root motion and finding the nearest discrete key. */
        get explicitElapse(): boolean
        set explicitElapse(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeTimeSeek;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeTimeSeek;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationNodeTransition extends __RPCMapAnimationNodeSync {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationNodeTransition extends __NameMapAnimationNodeSync {
        set_input_as_auto_advance: "setInputAsAutoAdvance";
        is_input_set_as_auto_advance: "isInputSetAsAutoAdvance";
        set_input_break_loop_at_end: "setInputBreakLoopAtEnd";
        is_input_loop_broken_at_end: "isInputLoopBrokenAtEnd";
        set_input_reset: "setInputReset";
        is_input_reset: "isInputReset";
        xfade_time: "xfadeTime";
        xfade_curve: "xfadeCurve";
        allow_transition_to_self: "allowTransitionToSelf";
        input_count: "inputCount";
    }
    /** A transition within an [AnimationTree] connecting two [AnimationNode]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationnodetransition.html  
     */
    class AnimationNodeTransition extends AnimationNodeSync {
        constructor(identifier?: any)
        /** Enables or disables auto-advance for the given [param input] index. If enabled, state changes to the next input after playing the animation once. If enabled for the last input state, it loops to the first. */
        setInputAsAutoAdvance(input: int64, enable: boolean): void
        
        /** Returns `true` if auto-advance is enabled for the given [param input] index. */
        isInputSetAsAutoAdvance(input: int64): boolean
        
        /** If `true`, breaks the loop at the end of the loop cycle for transition, even if the animation is looping. */
        setInputBreakLoopAtEnd(input: int64, enable: boolean): void
        
        /** Returns whether the animation breaks the loop at the end of the loop cycle for transition. */
        isInputLoopBrokenAtEnd(input: int64): boolean
        
        /** If `true`, the destination animation is restarted when the animation transitions. */
        setInputReset(input: int64, enable: boolean): void
        
        /** Returns whether the animation restarts when the animation transitions from the other animation. */
        isInputReset(input: int64): boolean
        
        /** Cross-fading time (in seconds) between each animation connected to the inputs.  
         *      
         *  **Note:** [AnimationNodeTransition] transitions the current state immediately after the start of the fading. The precise remaining time can only be inferred from the main animation. When [AnimationNodeOutput] is considered as the most upstream, so the [member xfade_time] is not scaled depending on the downstream delta. See also [member AnimationNodeOneShot.fadeout_time].  
         */
        get xfadeTime(): float64
        set xfadeTime(value: float64)
        
        /** Determines how cross-fading between animations is eased. If empty, the transition will be linear. Should be a unit [Curve]. */
        get xfadeCurve(): null | Curve
        set xfadeCurve(value: null | Curve)
        
        /** If `true`, allows transition to the self state. When the reset option is enabled in input, the animation is restarted. If `false`, nothing happens on the transition to the self state. */
        get allowTransitionToSelf(): boolean
        set allowTransitionToSelf(value: boolean)
        
        /** The number of enabled input ports for this animation node. */
        get inputCount(): int64
        set inputCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationNodeTransition;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationNodeTransition;
    }
    namespace AnimationPlayer {
        enum AnimationProcessCallback {
            AnimationProcessPhysics = 0,
            AnimationProcessIdle = 1,
            AnimationProcessManual = 2,
        }
        enum AnimationMethodCallMode {
            AnimationMethodCallDeferred = 0,
            AnimationMethodCallImmediate = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationPlayer extends __RPCMapAnimationMixer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationPlayer extends __NameMapAnimationMixer {
        animation_set_next: "animationSetNext";
        animation_get_next: "animationGetNext";
        set_blend_time: "setBlendTime";
        get_blend_time: "getBlendTime";
        play_section_with_markers: "playSectionWithMarkers";
        play_section: "playSection";
        play_backwards: "playBackwards";
        play_section_with_markers_backwards: "playSectionWithMarkersBackwards";
        play_section_backwards: "playSectionBackwards";
        play_with_capture: "playWithCapture";
        is_playing: "isPlaying";
        is_animation_active: "isAnimationActive";
        get_queue: "getQueue";
        clear_queue: "clearQueue";
        get_playing_speed: "getPlayingSpeed";
        set_section_with_markers: "setSectionWithMarkers";
        set_section: "setSection";
        reset_section: "resetSection";
        get_section_start_time: "getSectionStartTime";
        get_section_end_time: "getSectionEndTime";
        has_section: "hasSection";
        set_process_callback: "setProcessCallback";
        get_process_callback: "getProcessCallback";
        set_method_call_mode: "setMethodCallMode";
        get_method_call_mode: "getMethodCallMode";
        set_root: "setRoot";
        get_root: "getRoot";
        current_animation: "currentAnimation";
        assigned_animation: "assignedAnimation";
        current_animation_length: "currentAnimationLength";
        current_animation_position: "currentAnimationPosition";
        playback_auto_capture: "playbackAutoCapture";
        playback_auto_capture_duration: "playbackAutoCaptureDuration";
        playback_auto_capture_transition_type: "playbackAutoCaptureTransitionType";
        playback_auto_capture_ease_type: "playbackAutoCaptureEaseType";
        playback_default_blend_time: "playbackDefaultBlendTime";
        speed_scale: "speedScale";
        movie_quit_on_finish: "movieQuitOnFinish";
        clear_cache_on_stop: "clearCacheOnStop";
        current_animation_changed: "currentAnimationChanged";
        animation_changed: "animationChanged";
    }
    /** A node used for animation playback.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationplayer.html  
     */
    class AnimationPlayer<NodeMap extends NodePathMap = any, LibraryMap extends AnimationMixerPathMap = any> extends AnimationMixer<NodeMap, LibraryMap> {
        constructor(identifier?: any)
        /** Triggers the [param animation_to] animation when the [param animation_from] animation completes. */
        animationSetNext(animationFrom: StaticAnimationMixerPath<LibraryMap>, animationTo: StaticAnimationMixerPath<LibraryMap>): void
        
        /** Returns the key of the animation which is queued to play after the [param animation_from] animation. */
        animationGetNext(animationFrom: StaticAnimationMixerPath<LibraryMap>): StaticAnimationMixerPath<LibraryMap>
        
        /** Specifies a blend time (in seconds) between two animations, referenced by their keys. */
        setBlendTime(animationFrom: StaticAnimationMixerPath<LibraryMap>, animationTo: StaticAnimationMixerPath<LibraryMap>, sec: float64): void
        
        /** Returns the blend time (in seconds) between two animations, referenced by their keys. */
        getBlendTime(animationFrom: StaticAnimationMixerPath<LibraryMap>, animationTo: StaticAnimationMixerPath<LibraryMap>): float64
        
        /** Plays the animation with key [param name]. Custom blend times and speed can be set.  
         *  The [param from_end] option only affects when switching to a new animation track, or if the same track but at the start or end. It does not affect resuming playback that was paused in the middle of an animation. If [param custom_speed] is negative and [param from_end] is `true`, the animation will play backwards (which is equivalent to calling [method play_backwards]).  
         *  The [AnimationPlayer] keeps track of its current or last played animation with [member assigned_animation]. If this method is called with that same animation [param name], or with no [param name] parameter, the assigned animation will resume playing if it was paused.  
         *      
         *  **Note:** The animation will be updated the next time the [AnimationPlayer] is processed. If other variables are updated at the same time this is called, they may be updated too early. To perform the update immediately, call `advance(0)`.  
         */
        play(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, customBlend?: float64 /* = -1 */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */): void
        
        /** Plays the animation with key [param name] and the section starting from [param start_marker] and ending on [param end_marker].  
         *  If the start marker is empty, the section starts from the beginning of the animation. If the end marker is empty, the section ends on the end of the animation. See also [method play].  
         */
        playSectionWithMarkers(name?: StringName /* = '' */, startMarker?: StringName /* = '' */, endMarker?: StringName /* = '' */, customBlend?: float64 /* = -1 */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */): void
        
        /** Plays the animation with key [param name] and the section starting from [param start_time] and ending on [param end_time]. See also [method play].  
         *  Setting [param start_time] to a value outside the range of the animation means the start of the animation will be used instead, and setting [param end_time] to a value outside the range of the animation means the end of the animation will be used instead. [param start_time] cannot be equal to [param end_time].  
         */
        playSection(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, startTime?: float64 /* = -1 */, endTime?: float64 /* = -1 */, customBlend?: float64 /* = -1 */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */): void
        
        /** Plays the animation with key [param name] in reverse.  
         *  This method is a shorthand for [method play] with `custom_speed = -1.0` and `from_end = true`, so see its description for more information.  
         *      
         *  **Note:** Continuous tracks, including value tracks with [constant Animation.UPDATE_CONTINUOUS], are simply interpolated on the reversed timeline, while value tracks with [constant Animation.UPDATE_DISCRETE] apply a key only in the frame it is passed, so the value held between two keys can differ from forward playback.  
         */
        playBackwards(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, customBlend?: float64 /* = -1 */): void
        
        /** Plays the animation with key [param name] and the section starting from [param start_marker] and ending on [param end_marker] in reverse.  
         *  This method is a shorthand for [method play_section_with_markers] with `custom_speed = -1.0` and `from_end = true`, see its description for more information.  
         */
        playSectionWithMarkersBackwards(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, startMarker?: StringName /* = '' */, endMarker?: StringName /* = '' */, customBlend?: float64 /* = -1 */): void
        
        /** Plays the animation with key [param name] and the section starting from [param start_time] and ending on [param end_time] in reverse.  
         *  This method is a shorthand for [method play_section] with `custom_speed = -1.0` and `from_end = true`, see its description for more information.  
         */
        playSectionBackwards(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, startTime?: float64 /* = -1 */, endTime?: float64 /* = -1 */, customBlend?: float64 /* = -1 */): void
        
        /** See also [method AnimationMixer.capture].  
         *  You can use this method to use more detailed options for capture than those performed by [member playback_auto_capture]. When [member playback_auto_capture] is `false`, this method is almost the same as the following:  
         *    
         *  If [param name] is blank, it specifies [member assigned_animation].  
         *  If [param duration] is a negative value, the duration is set to the interval between the current position and the first key, when [param from_end] is `true`, uses the interval between the current position and the last key instead.  
         *      
         *  **Note:** The [param duration] takes [member speed_scale] into account, but [param custom_speed] does not, because the capture cache is interpolated with the blend result and the result may contain multiple animations.  
         */
        playWithCapture(name: StaticAnimationMixerPath<LibraryMap> /* = '' */, duration?: float64 /* = -1 */, customBlend?: float64 /* = -1 */, customSpeed?: float64 /* = 1 */, fromEnd?: boolean /* = false */, transType?: Tween.TransitionType /* = 0 */, easeType?: Tween.EaseType /* = 0 */): void
        
        /** Pauses the currently playing animation. The [member current_animation_position] will be kept and calling [method play] or [method play_backwards] without arguments or with the same animation name as [member assigned_animation] will resume the animation.  
         *  See also [method stop].  
         */
        pause(): void
        
        /** Stops the currently playing animation. The animation position is reset to `0` and the `custom_speed` is reset to `1.0`. See also [method pause].  
         *  If [param keep_state] is `true`, the animation state is not updated visually.  
         *      
         *  **Note:** The method / audio / animation playback tracks will not be processed by this method.  
         */
        stop(keepState?: boolean /* = false */): void
        
        /** Returns `true` if an animation is currently playing (even if [member speed_scale] and/or `custom_speed` are `0`). */
        isPlaying(): boolean
        
        /** Returns `true` if the an animation is currently active. An animation is active if it was played by calling [method play] and was not finished yet, or was stopped by calling [method stop].  
         *  This can be used to check whether an animation is currently paused or stopped.  
         *    
         */
        isAnimationActive(): boolean
        
        /** Queues an animation for playback once the current animation and all previously queued animations are done.  
         *      
         *  **Note:** If a looped animation is currently playing, the queued animation will never play unless the looped animation is stopped somehow.  
         */
        queue(name: StaticAnimationMixerPath<LibraryMap>): void
        
        /** Returns a list of the animation keys that are currently queued to play. */
        getQueue(): GArray<StringName>
        
        /** Clears all queued, unplayed animations. */
        clearQueue(): void
        
        /** Returns the actual playing speed of current animation or `0` if not playing. This speed is the [member speed_scale] property multiplied by `custom_speed` argument specified when calling the [method play] method.  
         *  Returns a negative value if the current animation is playing backwards.  
         */
        getPlayingSpeed(): float64
        
        /** Changes the start and end markers of the section being played. The current playback position will be clamped within the new section. See also [method play_section_with_markers].  
         *  If the argument is empty, the section uses the beginning or end of the animation. If both are empty, it means that the section is not set.  
         */
        setSectionWithMarkers(startMarker?: StringName /* = '' */, endMarker?: StringName /* = '' */): void
        
        /** Changes the start and end times of the section being played. The current playback position will be clamped within the new section. See also [method play_section]. */
        setSection(startTime?: float64 /* = -1 */, endTime?: float64 /* = -1 */): void
        
        /** Resets the current section. Does nothing if a section has not been set. */
        resetSection(): void
        
        /** Returns the start time of the section currently being played. */
        getSectionStartTime(): float64
        
        /** Returns the end time of the section currently being played. */
        getSectionEndTime(): float64
        
        /** Returns `true` if an animation is currently playing with a section. */
        hasSection(): boolean
        
        /** Seeks the animation to the [param seconds] point in time (in seconds). If [param update] is `true`, the animation updates too, otherwise it updates at process time. Events between the current frame and [param seconds] are skipped.  
         *  If [param update_only] is `true`, the method / audio / animation playback tracks will not be processed.  
         *      
         *  **Note:** Seeking to the end of the animation doesn't emit [signal AnimationMixer.animation_finished]. If you want to skip animation and emit the signal, use [method AnimationMixer.advance].  
         */
        seek(seconds: float64, update?: boolean /* = false */, updateOnly?: boolean /* = false */): void
        
        /** Sets the process notification in which to update animations. */
        setProcessCallback(mode: AnimationPlayer.AnimationProcessCallback): void
        
        /** Returns the process notification in which to update animations. */
        getProcessCallback(): AnimationPlayer.AnimationProcessCallback
        
        /** Sets the call mode used for "Call Method" tracks. */
        setMethodCallMode(mode: AnimationPlayer.AnimationMethodCallMode): void
        
        /** Returns the call mode used for "Call Method" tracks. */
        getMethodCallMode(): AnimationPlayer.AnimationMethodCallMode
        
        /** Sets the node which node path references will travel from. */
        setRoot(path: NodePath | string): void
        
        /** Returns the node which node path references will travel from. */
        getRoot(): NodePath
        
        /** The key of the currently playing animation. If no animation is playing, the property's value is an empty string. Changing this value does not restart the animation. See [method play] for more information on playing animations.  
         *      
         *  **Note:** While this property appears in the Inspector, it's not meant to be edited, and it's not saved in the scene. This property is mainly used to get the currently playing animation, and internally for animation playback tracks. For more information, see [Animation].  
         */
        get currentAnimation(): StaticAnimationMixerPath<LibraryMap>
        set currentAnimation(value: StaticAnimationMixerPath<LibraryMap>)
        
        /** If playing, the current animation's key, otherwise, the animation last played. When set, this changes the animation, but will not play it unless already playing. See also [member current_animation]. */
        get assignedAnimation(): StaticAnimationMixerPath<LibraryMap>
        set assignedAnimation(value: StaticAnimationMixerPath<LibraryMap>)
        
        /** The key of the animation to play when the scene loads. */
        get autoplay(): StaticAnimationMixerPath<LibraryMap>
        set autoplay(value: StaticAnimationMixerPath<LibraryMap>)
        
        /** The length (in seconds) of the currently playing animation. */
        get currentAnimationLength(): float64
        
        /** The position (in seconds) of the currently playing animation. */
        get currentAnimationPosition(): float64
        
        /** If `true`, performs [method AnimationMixer.capture] before playback automatically. This means just [method play_with_capture] is executed with default arguments instead of [method play].  
         *      
         *  **Note:** Capture interpolation is only performed if the animation contains a capture track. See also [constant Animation.UPDATE_CAPTURE].  
         */
        get playbackAutoCapture(): boolean
        set playbackAutoCapture(value: boolean)
        
        /** See also [method play_with_capture] and [method AnimationMixer.capture].  
         *  If [member playback_auto_capture_duration] is negative value, the duration is set to the interval between the current position and the first key.  
         */
        get playbackAutoCaptureDuration(): float64
        set playbackAutoCaptureDuration(value: float64)
        
        /** The transition type of the capture interpolation. See also [enum Tween.TransitionType]. */
        get playbackAutoCaptureTransitionType(): int64
        set playbackAutoCaptureTransitionType(value: int64)
        
        /** The ease type of the capture interpolation. See also [enum Tween.EaseType]. */
        get playbackAutoCaptureEaseType(): int64
        set playbackAutoCaptureEaseType(value: int64)
        
        /** The default time in which to blend animations. Ranges from 0 to 4096 with 0.01 precision. */
        get playbackDefaultBlendTime(): float64
        set playbackDefaultBlendTime(value: float64)
        
        /** The speed scaling ratio. For example, if this value is `1`, then the animation plays at normal speed. If it's `0.5`, then it plays at half speed. If it's `2`, then it plays at double speed.  
         *  If set to a negative value, the animation is played in reverse. If set to `0`, the animation will not advance.  
         */
        get speedScale(): float64
        set speedScale(value: float64)
        
        /** If `true` and the engine is running in Movie Maker mode (see [MovieWriter]), exits the engine with [method SceneTree.quit] as soon as an animation is done playing in this [AnimationPlayer]. A message is printed when the engine quits for this reason.  
         *      
         *  **Note:** This obeys the same logic as the [signal AnimationMixer.animation_finished] signal, so it will not quit the engine if the animation is set to be looping.  
         */
        get movieQuitOnFinish(): boolean
        set movieQuitOnFinish(value: boolean)
        
        /** If `true`, the animation track cache is cleared when the animation is stopped or the playback queue becomes empty. If `false`, the track cache is preserved, which can improve performance when animations are frequently started and stopped. */
        get clearCacheOnStop(): boolean
        set clearCacheOnStop(value: boolean)
        
        /** Emitted when [member current_animation] changes. */
        readonly currentAnimationChanged: Signal<(animName: StringName) => void>
        
        /** Emitted when a queued animation plays after the previous animation finished. See also [method AnimationPlayer.queue].  
         *      
         *  **Note:** The signal is not emitted when the animation is changed via [method AnimationPlayer.play] or by an [AnimationTree].  
         */
        readonly animationChanged: Signal<(oldName: StringName, newName: StringName) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationPlayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationPlayer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationRootNode extends __RPCMapAnimationNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationRootNode extends __NameMapAnimationNode {
    }
    /** Base class for [AnimationNode]s that hold one or multiple composite animations. Usually used for [member AnimationTree.tree_root].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationrootnode.html  
     */
    class AnimationRootNode extends AnimationNode {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationRootNode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationRootNode;
    }
    namespace AnimationTree {
        enum AnimationProcessCallback {
            AnimationProcessPhysics = 0,
            AnimationProcessIdle = 1,
            AnimationProcessManual = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAnimationTree extends __RPCMapAnimationMixer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAnimationTree extends __NameMapAnimationMixer {
        set_process_callback: "setProcessCallback";
        get_process_callback: "getProcessCallback";
        tree_root: "treeRoot";
        advance_expression_base_node: "advanceExpressionBaseNode";
        anim_player: "animPlayer";
        animation_player_changed: "animationPlayerChanged";
    }
    /** A node used for advanced animation transitions in an [AnimationPlayer].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_animationtree.html  
     */
    class AnimationTree<NodeMap extends NodePathMap = any, LibraryMap extends AnimationMixerPathMap = any> extends AnimationMixer<NodeMap, LibraryMap> {
        constructor(identifier?: any)
        /** Sets the process notification in which to update animations. */
        setProcessCallback(mode: AnimationTree.AnimationProcessCallback): void
        
        /** Returns the process notification in which to update animations. */
        getProcessCallback(): AnimationTree.AnimationProcessCallback
        
        /** The root animation node of this [AnimationTree]. See [AnimationRootNode]. */
        get treeRoot(): null | AnimationRootNode
        set treeRoot(value: null | AnimationRootNode)
        
        /** The path to the [Node] used to evaluate the [AnimationNode] [Expression] if one is not explicitly specified internally. */
        get advanceExpressionBaseNode(): NodePath
        set advanceExpressionBaseNode(value: NodePath | string)
        
        /** The path to the [AnimationPlayer] used for animating. */
        get animPlayer(): NodePath
        set animPlayer(value: NodePath | string)
        
        /** Emitted when the [member anim_player] is changed. */
        readonly animationPlayerChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAnimationTree;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAnimationTree;
    }
    namespace Area2D {
        enum SpaceOverride {
            SpaceOverrideDisabled = 0,
            SpaceOverrideCombine = 1,
            SpaceOverrideCombineReplace = 2,
            SpaceOverrideReplace = 3,
            SpaceOverrideReplaceCombine = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapArea2D extends __RPCMapCollisionObject2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapArea2D extends __NameMapCollisionObject2D {
        get_overlapping_bodies: "getOverlappingBodies";
        get_overlapping_areas: "getOverlappingAreas";
        has_overlapping_bodies: "hasOverlappingBodies";
        has_overlapping_areas: "hasOverlappingAreas";
        overlaps_body: "overlapsBody";
        overlaps_area: "overlapsArea";
        gravity_space_override: "gravitySpaceOverride";
        gravity_point: "gravityPoint";
        gravity_point_unit_distance: "gravityPointUnitDistance";
        gravity_point_center: "gravityPointCenter";
        gravity_direction: "gravityDirection";
        linear_damp_space_override: "linearDampSpaceOverride";
        linear_damp: "linearDamp";
        angular_damp_space_override: "angularDampSpaceOverride";
        angular_damp: "angularDamp";
        audio_bus_override: "audioBusOverride";
        audio_bus_name: "audioBusName";
        body_shape_entered: "bodyShapeEntered";
        body_shape_exited: "bodyShapeExited";
        body_entered: "bodyEntered";
        body_exited: "bodyExited";
        area_shape_entered: "areaShapeEntered";
        area_shape_exited: "areaShapeExited";
        area_entered: "areaEntered";
        area_exited: "areaExited";
    }
    /** A region of 2D space that detects other [CollisionObject2D]s entering or exiting it.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_area2d.html  
     */
    class Area2D<Map extends NodePathMap = any> extends CollisionObject2D<Map> {
        constructor(identifier?: any)
        /** Returns a list of intersecting [PhysicsBody2D]s and [TileMap]s. The overlapping body's [member CollisionObject2D.collision_layer] must be part of this area's [member CollisionObject2D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) this list is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        getOverlappingBodies(): GArray<Node2D>
        
        /** Returns a list of intersecting [Area2D]s. The overlapping area's [member CollisionObject2D.collision_layer] must be part of this area's [member CollisionObject2D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) this list is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        getOverlappingAreas(): GArray<Area2D>
        
        /** Returns `true` if intersecting any [PhysicsBody2D]s or [TileMap]s, otherwise returns `false`. The overlapping body's [member CollisionObject2D.collision_layer] must be part of this area's [member CollisionObject2D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) the list of overlapping bodies is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        hasOverlappingBodies(): boolean
        
        /** Returns `true` if intersecting any [Area2D]s, otherwise returns `false`. The overlapping area's [member CollisionObject2D.collision_layer] must be part of this area's [member CollisionObject2D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) the list of overlapping areas is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        hasOverlappingAreas(): boolean
        
        /** Returns `true` if the given physics body intersects or overlaps this [Area2D], `false` otherwise.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, list of overlaps is updated once per frame and before the physics step. Consider using signals instead.  
         *  The [param body] argument can either be a [PhysicsBody2D] or a [TileMap] instance. While TileMaps are not physics bodies themselves, they register their tiles with collision shapes as a virtual physics body.  
         */
        overlapsBody(body: Node): boolean
        
        /** Returns `true` if the given [Area2D] intersects or overlaps this [Area2D], `false` otherwise.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, the list of overlaps is updated once per frame and before the physics step. Consider using signals instead.  
         */
        overlapsArea(area: Node): boolean
        
        /** If `true`, the area detects bodies or areas entering and exiting it. */
        get monitoring(): boolean
        set monitoring(value: boolean)
        
        /** If `true`, other monitoring areas can detect this area. */
        get monitorable(): boolean
        set monitorable(value: boolean)
        
        /** The area's priority. Higher priority areas are processed first. The [World2D]'s physics is always processed last, after all areas. */
        get priority(): int64
        set priority(value: int64)
        
        /** Override mode for gravity calculations within this area. */
        get gravitySpaceOverride(): int64
        set gravitySpaceOverride(value: int64)
        
        /** If `true`, gravity is calculated from a point (set via [member gravity_point_center]). See also [member gravity_space_override]. */
        get gravityPoint(): boolean
        set gravityPoint(value: boolean)
        
        /** The distance at which the gravity strength is equal to [member gravity]. For example, on a planet 100 pixels in radius with a surface gravity of 4.0 px/s², set the [member gravity] to 4.0 and the unit distance to 100.0. The gravity will have falloff according to the inverse square law, so in the example, at 200 pixels from the center the gravity will be 1.0 px/s² (twice the distance, 1/4th the gravity), at 50 pixels it will be 16.0 px/s² (half the distance, 4× the gravity), and so on.  
         *  The above is true only when the unit distance is a positive number. When this is set to 0.0, the gravity will be constant regardless of distance.  
         */
        get gravityPointUnitDistance(): float64
        set gravityPointUnitDistance(value: float64)
        
        /** If gravity is a point (see [member gravity_point]), this will be the point of attraction. */
        get gravityPointCenter(): Vector2
        set gravityPointCenter(value: Vector2)
        
        /** The area's gravity vector (not normalized). */
        get gravityDirection(): Vector2
        set gravityDirection(value: Vector2)
        
        /** The area's gravity intensity (in pixels per second squared). This value multiplies the gravity direction. This is useful to alter the force of gravity without altering its direction. */
        get gravity(): float64
        set gravity(value: float64)
        
        /** Override mode for linear damping calculations within this area. */
        get linearDampSpaceOverride(): int64
        set linearDampSpaceOverride(value: int64)
        
        /** The rate at which objects stop moving in this area. Represents the linear velocity lost per second.  
         *  See [member ProjectSettings.physics/2d/default_linear_damp] for more details about damping.  
         */
        get linearDamp(): float64
        set linearDamp(value: float64)
        
        /** Override mode for angular damping calculations within this area. */
        get angularDampSpaceOverride(): int64
        set angularDampSpaceOverride(value: int64)
        
        /** The rate at which objects stop spinning in this area. Represents the angular velocity lost per second.  
         *  See [member ProjectSettings.physics/2d/default_angular_damp] for more details about damping.  
         */
        get angularDamp(): float64
        set angularDamp(value: float64)
        
        /** If `true`, the area's audio bus overrides the default audio bus. */
        get audioBusOverride(): boolean
        set audioBusOverride(value: boolean)
        
        /** The name of the area's audio bus. */
        get audioBusName(): StringName
        set audioBusName(value: StringName)
        
        /** Emitted when a [Shape2D] of the received [param body] enters a shape of this area. [param body] can be a [PhysicsBody2D] or a [TileMap]. [TileMap]s are detected if their [TileSet] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *  [param local_shape_index] and [param body_shape_index] contain indices of the interacting shapes from this area and the interacting body, respectively. [param body_rid] contains the [RID] of the body. These values can be used with the [PhysicsServer2D].  
         *  **Example:** Get the [CollisionShape2D] node from the shape index:  
         *    
         */
        readonly bodyShapeEntered: Signal<(bodyRid: Rid, body: Node2D, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a [Shape2D] of the received [param body] exits a shape of this area. [param body] can be a [PhysicsBody2D] or a [TileMap]. [TileMap]s are detected if their [TileSet] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *  See also [signal body_shape_entered].  
         */
        readonly bodyShapeExited: Signal<(bodyRid: Rid, body: Node2D, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the received [param body] enters this area. [param body] can be a [PhysicsBody2D] or a [TileMap]. [TileMap]s are detected if their [TileSet] has collision shapes configured. Requires [member monitoring] to be set to `true`. */
        readonly bodyEntered: Signal<(body: Node2D) => void>
        
        /** Emitted when the received [param body] exits this area. [param body] can be a [PhysicsBody2D] or a [TileMap]. [TileMap]s are detected if their [TileSet] has collision shapes configured. Requires [member monitoring] to be set to `true`. */
        readonly bodyExited: Signal<(body: Node2D) => void>
        
        /** Emitted when a [Shape2D] of the received [param area] enters a shape of this area. Requires [member monitoring] to be set to `true`.  
         *  [param local_shape_index] and [param area_shape_index] contain indices of the interacting shapes from this area and the other area, respectively. [param area_rid] contains the [RID] of the other area. These values can be used with the [PhysicsServer2D].  
         *  **Example:** Get the [CollisionShape2D] node from the shape index:  
         *    
         */
        readonly areaShapeEntered: Signal<(areaRid: Rid, area: Area2D, areaShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a [Shape2D] of the received [param area] exits a shape of this area. Requires [member monitoring] to be set to `true`.  
         *  See also [signal area_shape_entered].  
         */
        readonly areaShapeExited: Signal<(areaRid: Rid, area: Area2D, areaShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the received [param area] enters this area. Requires [member monitoring] to be set to `true`. */
        readonly areaEntered: Signal<(area: Area2D) => void>
        
        /** Emitted when the received [param area] exits this area. Requires [member monitoring] to be set to `true`. */
        readonly areaExited: Signal<(area: Area2D) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapArea2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapArea2D;
    }
    namespace Area3D {
        enum SpaceOverride {
            SpaceOverrideDisabled = 0,
            SpaceOverrideCombine = 1,
            SpaceOverrideCombineReplace = 2,
            SpaceOverrideReplace = 3,
            SpaceOverrideReplaceCombine = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapArea3D extends __RPCMapCollisionObject3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapArea3D extends __NameMapCollisionObject3D {
        get_overlapping_bodies: "getOverlappingBodies";
        get_overlapping_areas: "getOverlappingAreas";
        has_overlapping_bodies: "hasOverlappingBodies";
        has_overlapping_areas: "hasOverlappingAreas";
        overlaps_body: "overlapsBody";
        overlaps_area: "overlapsArea";
        gravity_space_override: "gravitySpaceOverride";
        gravity_point: "gravityPoint";
        gravity_point_unit_distance: "gravityPointUnitDistance";
        gravity_point_center: "gravityPointCenter";
        gravity_direction: "gravityDirection";
        linear_damp_space_override: "linearDampSpaceOverride";
        linear_damp: "linearDamp";
        angular_damp_space_override: "angularDampSpaceOverride";
        angular_damp: "angularDamp";
        wind_force_magnitude: "windForceMagnitude";
        wind_attenuation_factor: "windAttenuationFactor";
        wind_source_path: "windSourcePath";
        audio_bus_override: "audioBusOverride";
        audio_bus_name: "audioBusName";
        reverb_bus_enabled: "reverbBusEnabled";
        reverb_bus_name: "reverbBusName";
        reverb_bus_amount: "reverbBusAmount";
        reverb_bus_uniformity: "reverbBusUniformity";
        body_shape_entered: "bodyShapeEntered";
        body_shape_exited: "bodyShapeExited";
        body_entered: "bodyEntered";
        body_exited: "bodyExited";
        area_shape_entered: "areaShapeEntered";
        area_shape_exited: "areaShapeExited";
        area_entered: "areaEntered";
        area_exited: "areaExited";
    }
    /** A region of 3D space that detects other [CollisionObject3D]s entering or exiting it.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_area3d.html  
     */
    class Area3D<Map extends NodePathMap = any> extends CollisionObject3D<Map> {
        constructor(identifier?: any)
        /** Returns a list of intersecting [PhysicsBody3D]s, [SoftBody3D]s, and [GridMap]s. The overlapping body's [member CollisionObject3D.collision_layer] must be part of this area's [member CollisionObject3D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) this list is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not return any such bodies.  
         */
        getOverlappingBodies(): GArray<Node3D>
        
        /** Returns a list of intersecting [Area3D]s. The overlapping area's [member CollisionObject3D.collision_layer] must be part of this area's [member CollisionObject3D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) this list is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        getOverlappingAreas(): GArray<Area3D>
        
        /** Returns `true` if intersecting any [PhysicsBody3D]s, [SoftBody3D]s, or [GridMap]s, otherwise returns `false`. The overlapping body's [member CollisionObject3D.collision_layer] must be part of this area's [member CollisionObject3D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) the list of overlapping bodies is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not consider such bodies.  
         */
        hasOverlappingBodies(): boolean
        
        /** Returns `true` if intersecting any [Area3D]s, otherwise returns `false`. The overlapping area's [member CollisionObject3D.collision_layer] must be part of this area's [member CollisionObject3D.collision_mask] in order to be detected.  
         *  For performance reasons (collisions are all processed at the same time) the list of overlapping areas is modified once during the physics step, not immediately after objects are moved. Consider using signals instead.  
         */
        hasOverlappingAreas(): boolean
        
        /** Returns `true` if the given physics body intersects or overlaps this [Area3D], `false` otherwise.  
         *  [param body] argument can either be a [PhysicsBody3D], [SoftBody3D], or a [GridMap] instance. While GridMaps are not physics body themselves, they register their tiles with collision shapes as a virtual physics body.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, list of overlaps is updated once per frame and before the physics step. Consider using signals instead.  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will return `false` in such cases.  
         */
        overlapsBody(body: Node): boolean
        
        /** Returns `true` if the given [Area3D] intersects or overlaps this [Area3D], `false` otherwise.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, list of overlaps is updated once per frame and before the physics step. Consider using signals instead.  
         */
        overlapsArea(area: Node): boolean
        
        /** If `true`, the area detects bodies or areas entering and exiting it. */
        get monitoring(): boolean
        set monitoring(value: boolean)
        
        /** If `true`, other monitoring areas can detect this area. */
        get monitorable(): boolean
        set monitorable(value: boolean)
        
        /** The area's priority. Higher priority areas are processed first. The [World3D]'s physics is always processed last, after all areas. */
        get priority(): int64
        set priority(value: int64)
        
        /** Override mode for gravity calculations within this area. */
        get gravitySpaceOverride(): int64
        set gravitySpaceOverride(value: int64)
        
        /** If `true`, gravity is calculated from a point (set via [member gravity_point_center]). See also [member gravity_space_override]. */
        get gravityPoint(): boolean
        set gravityPoint(value: boolean)
        
        /** The distance at which the gravity strength is equal to [member gravity]. For example, on a planet 100 meters in radius with a surface gravity of 4.0 m/s², set the [member gravity] to 4.0 and the unit distance to 100.0. The gravity will have falloff according to the inverse square law, so in the example, at 200 meters from the center the gravity will be 1.0 m/s² (twice the distance, 1/4th the gravity), at 50 meters it will be 16.0 m/s² (half the distance, 4× the gravity), and so on.  
         *  The above is true only when the unit distance is a positive number. When this is set to 0.0, the gravity will be constant regardless of distance.  
         */
        get gravityPointUnitDistance(): float64
        set gravityPointUnitDistance(value: float64)
        
        /** If gravity is a point (see [member gravity_point]), this will be the point of attraction. */
        get gravityPointCenter(): Vector3
        set gravityPointCenter(value: Vector3)
        
        /** The area's gravity vector (not normalized). */
        get gravityDirection(): Vector3
        set gravityDirection(value: Vector3)
        
        /** The area's gravity intensity (in meters per second squared). This value multiplies the gravity direction. This is useful to alter the force of gravity without altering its direction. */
        get gravity(): float64
        set gravity(value: float64)
        
        /** Override mode for linear damping calculations within this area. */
        get linearDampSpaceOverride(): int64
        set linearDampSpaceOverride(value: int64)
        
        /** The rate at which objects stop moving in this area. Represents the linear velocity lost per second.  
         *  See [member ProjectSettings.physics/3d/default_linear_damp] for more details about damping.  
         */
        get linearDamp(): float64
        set linearDamp(value: float64)
        
        /** Override mode for angular damping calculations within this area. */
        get angularDampSpaceOverride(): int64
        set angularDampSpaceOverride(value: int64)
        
        /** The rate at which objects stop spinning in this area. Represents the angular velocity lost per second.  
         *  See [member ProjectSettings.physics/3d/default_angular_damp] for more details about damping.  
         */
        get angularDamp(): float64
        set angularDamp(value: float64)
        
        /** The magnitude of area-specific wind force.  
         *      
         *  **Note:** This wind force only applies to [SoftBody3D] nodes. Other physics bodies are currently not affected by wind.  
         */
        get windForceMagnitude(): float64
        set windForceMagnitude(value: float64)
        
        /** The exponential rate at which wind force decreases with distance from its origin.  
         *      
         *  **Note:** This wind force only applies to [SoftBody3D] nodes. Other physics bodies are currently not affected by wind.  
         */
        get windAttenuationFactor(): float64
        set windAttenuationFactor(value: float64)
        
        /** The [Node3D] which is used to specify the direction and origin of an area-specific wind force. The direction is opposite to the z-axis of the [Node3D]'s local transform, and its origin is the origin of the [Node3D]'s local transform.  
         *      
         *  **Note:** This wind force only applies to [SoftBody3D] nodes. Other physics bodies are currently not affected by wind.  
         */
        get windSourcePath(): NodePath
        set windSourcePath(value: NodePath | string)
        
        /** If `true`, the area's audio bus overrides the default audio bus. */
        get audioBusOverride(): boolean
        set audioBusOverride(value: boolean)
        
        /** The name of the area's audio bus. */
        get audioBusName(): StringName
        set audioBusName(value: StringName)
        
        /** If `true`, the area applies reverb to its associated audio. */
        get reverbBusEnabled(): boolean
        set reverbBusEnabled(value: boolean)
        
        /** The name of the reverb bus to use for this area's associated audio. */
        get reverbBusName(): StringName
        set reverbBusName(value: StringName)
        
        /** The degree to which this area applies reverb to its associated audio. Ranges from `0` to `1` with `0.1` precision. */
        get reverbBusAmount(): float64
        set reverbBusAmount(value: float64)
        
        /** The degree to which this area's reverb is a uniform effect. Ranges from `0` to `1` with `0.1` precision. */
        get reverbBusUniformity(): float64
        set reverbBusUniformity(value: float64)
        
        /** Emitted when a [Shape3D] of the received [param body] enters a shape of this area. [param body] can be a [PhysicsBody3D], [SoftBody3D] or [GridMap]. [GridMap]s are detected if their [MeshLibrary] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *  [param local_shape_index] and [param body_shape_index] contain indices of the interacting shapes from this area and the interacting body, respectively. [param body_rid] contains the [RID] of the body. These values can be used with the [PhysicsServer3D].  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not emit this signal in such cases.  
         *  **Example:** Get the [CollisionShape3D] node from the shape index:  
         *    
         */
        readonly bodyShapeEntered: Signal<(bodyRid: Rid, body: Node3D, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a [Shape3D] of the received [param body] exits a shape of this area. [param body] can be a [PhysicsBody3D], [SoftBody3D] or [GridMap]. [GridMap]s are detected if their [MeshLibrary] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *  See also [signal body_shape_entered].  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not emit this signal in such cases.  
         */
        readonly bodyShapeExited: Signal<(bodyRid: Rid, body: Node3D, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the received [param body] enters this area. [param body] can be a [PhysicsBody3D], [SoftBody3D] or [GridMap]. [GridMap]s are detected if their [MeshLibrary] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not emit this signal in such cases.  
         */
        readonly bodyEntered: Signal<(body: Node3D) => void>
        
        /** Emitted when the received [param body] exits this area. [param body] can be a [PhysicsBody3D], [SoftBody3D] or [GridMap]. [GridMap]s are detected if their [MeshLibrary] has collision shapes configured. Requires [member monitoring] to be set to `true`.  
         *      
         *  **Note:** Godot Physics does not support reporting overlaps with [SoftBody3D], so will not emit this signal in such cases.  
         */
        readonly bodyExited: Signal<(body: Node3D) => void>
        
        /** Emitted when a [Shape3D] of the received [param area] enters a shape of this area. Requires [member monitoring] to be set to `true`.  
         *  [param local_shape_index] and [param area_shape_index] contain indices of the interacting shapes from this area and the other area, respectively. [param area_rid] contains the [RID] of the other area. These values can be used with the [PhysicsServer3D].  
         *  **Example:** Get the [CollisionShape3D] node from the shape index:  
         *    
         */
        readonly areaShapeEntered: Signal<(areaRid: Rid, area: Area3D, areaShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a [Shape3D] of the received [param area] exits a shape of this area. Requires [member monitoring] to be set to `true`.  
         *  See also [signal area_shape_entered].  
         */
        readonly areaShapeExited: Signal<(areaRid: Rid, area: Area3D, areaShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the received [param area] enters this area. Requires [member monitoring] to be set to `true`. */
        readonly areaEntered: Signal<(area: Area3D) => void>
        
        /** Emitted when the received [param area] exits this area. Requires [member monitoring] to be set to `true`. */
        readonly areaExited: Signal<(area: Area3D) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapArea3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapArea3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAreaLight3D extends __RPCMapLight3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAreaLight3D extends __NameMapLight3D {
        area_range: "areaRange";
        area_attenuation: "areaAttenuation";
        area_normalize_energy: "areaNormalizeEnergy";
        area_size: "areaSize";
        area_texture: "areaTexture";
    }
    /** An area light, such as a neon light tube or a screen.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_arealight3d.html  
     */
    class AreaLight3D<Map extends NodePathMap = any> extends Light3D<Map> {
        constructor(identifier?: any)
        /** The range of the area in meters. This determines the maximum distance from any point on the area at which the area can still emit light. */
        get areaRange(): float64
        set areaRange(value: float64)
        
        /** Controls the distance attenuation function for this area light.  
         *  A value of `0.0` will maintain a constant brightness through most of the range, but will smoothly attenuate the light at the edge of the range. Use a value of `2.0` for physically accurate lights as it results in the proper inverse square attenuation.  
         *      
         *  **Note:** Setting attenuation to `2.0` or higher may result in distant objects receiving minimal light, even when within range. For example, with a range of `4096`, an object at `100` units is attenuated by a factor of `0.0001`. With a default brightness of `1`, the light would not be visible at that distance.  
         *      
         *  **Note:** Using negative values or values higher than `10.0` may lead to unexpected results.  
         */
        get areaAttenuation(): float64
        set areaAttenuation(value: float64)
        
        /** Defines whether the energy is normalized (divided) by the surface area of the light. If set to `true`, changing the size does not affect the total energy output, and does not dramatically alter the brightness of the scene. */
        get areaNormalizeEnergy(): boolean
        set areaNormalizeEnergy(value: boolean)
        
        /** The extents (width and height) of the area in meters. */
        get areaSize(): Vector2
        set areaSize(value: Vector2)
        
        /** An optional texture to use as a light source. Changing the texture at runtime might impact performance, as it needs to be drawn to the area light atlas with filtered mipmaps.  
         *  If no texture is assigned, the area light emits uniform light across its surface.  
         *      
         *  **Note:** Area light textures are only supported in the Forward+ and Mobile rendering methods, not Compatibility. To reduce the performance impact of switching textures at runtime, make sure each dimension of an area texture is either a multiple of 128 pixels, or a power of two. This removes the need for a scaling pass, which slows down texture changes. The textures don't necessarily have to be square to be optimal. Examples of optimal texture sizes include 32×64, 128×128, and 256×384.  
         */
        get areaTexture(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture
        set areaTexture(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAreaLight3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAreaLight3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapArrayMesh extends __RPCMapMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapArrayMesh extends __NameMapMesh {
        add_blend_shape: "addBlendShape";
        get_blend_shape_count: "getBlendShapeCount";
        get_blend_shape_name: "getBlendShapeName";
        set_blend_shape_name: "setBlendShapeName";
        clear_blend_shapes: "clearBlendShapes";
        add_surface_from_arrays: "addSurfaceFromArrays";
        clear_surfaces: "clearSurfaces";
        surface_remove: "surfaceRemove";
        surface_update_vertex_region: "surfaceUpdateVertexRegion";
        surface_update_attribute_region: "surfaceUpdateAttributeRegion";
        surface_update_skin_region: "surfaceUpdateSkinRegion";
        surface_get_array_len: "surfaceGetArrayLen";
        surface_get_array_index_len: "surfaceGetArrayIndexLen";
        surface_get_format: "surfaceGetFormat";
        surface_get_primitive_type: "surfaceGetPrimitiveType";
        surface_find_by_name: "surfaceFindByName";
        surface_set_name: "surfaceSetName";
        surface_get_name: "surfaceGetName";
        regen_normal_maps: "regenNormalMaps";
        lightmap_unwrap: "lightmapUnwrap";
        _blend_shape_names: "_blendShapeNames";
        blend_shape_mode: "blendShapeMode";
        custom_aabb: "customAabb";
        shadow_mesh: "shadowMesh";
    }
    /** [Mesh] type that provides utility for constructing a surface from arrays.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_arraymesh.html  
     */
    class ArrayMesh extends Mesh {
        constructor(identifier?: any)
        /** Adds name for a blend shape that will be added with [method add_surface_from_arrays]. Must be called before surface is added. */
        addBlendShape(name: StringName): void
        
        /** Returns the number of blend shapes that the [ArrayMesh] holds. */
        getBlendShapeCount(): int64
        
        /** Returns the name of the blend shape at this index. */
        getBlendShapeName(index: int64): StringName
        
        /** Sets the name of the blend shape at this index. */
        setBlendShapeName(index: int64, name: StringName): void
        
        /** Removes all blend shapes from this [ArrayMesh]. */
        clearBlendShapes(): void
        
        /** Creates a new surface. [method Mesh.get_surface_count] will become the `surf_idx` for this new surface.  
         *  Surfaces are created to be rendered using a [param primitive], which may be any of the values defined in [enum Mesh.PrimitiveType].  
         *  The [param arrays] argument is an array of arrays. Each of the [constant Mesh.ARRAY_MAX] elements contains an array with some of the mesh data for this surface as described by the corresponding member of [enum Mesh.ArrayType] or `null` if it is not used by the surface. For example, `arrays[0]` is the array of vertices. That first vertex sub-array is always required; the others are optional. Adding an index array puts this surface into "index mode" where the vertex and other arrays become the sources of data and the index array defines the vertex order. All sub-arrays must have the same length as the vertex array (or be an exact multiple of the vertex array's length, when multiple elements of a sub-array correspond to a single vertex) or be empty, except for [constant Mesh.ARRAY_INDEX] if it is used.  
         *  The [param blend_shapes] argument is an array of vertex data for each blend shape. Each element is an array of the same structure as [param arrays], but [constant Mesh.ARRAY_VERTEX], [constant Mesh.ARRAY_NORMAL], and [constant Mesh.ARRAY_TANGENT] are set if and only if they are set in [param arrays] and all other entries are `null`.  
         *  The [param lods] argument is a dictionary with [float] keys and [PackedInt32Array] values. Each entry in the dictionary represents an LOD level of the surface, where the value is the [constant Mesh.ARRAY_INDEX] array to use for the LOD level and the key is roughly proportional to the distance at which the LOD stats being used. I.e., increasing the key of an LOD also increases the distance that the objects has to be from the camera before the LOD is used.  
         *  The [param flags] argument is the bitwise OR of, as required: One value of [enum Mesh.ArrayCustomFormat] left shifted by `ARRAY_FORMAT_CUSTOMn_SHIFT` for each custom channel in use, [constant Mesh.ARRAY_FLAG_USE_DYNAMIC_UPDATE], [constant Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS], or [constant Mesh.ARRAY_FLAG_USES_EMPTY_VERTEX_ARRAY].  
         *      
         *  **Note:** When using indices, it is recommended to only use points, lines, or triangles.  
         */
        addSurfaceFromArrays(primitive: Mesh.PrimitiveType, arrays: GArray, blendShapes?: GArray<GArray>, lods?: GDictionary /* = new GDictionary() */, flags?: Mesh.ArrayFormat /* = 0 */): void
        
        /** Removes all surfaces from this [ArrayMesh]. */
        clearSurfaces(): void
        
        /** Removes the surface at the given index from the Mesh, shifting surfaces with higher index down by one. */
        surfaceRemove(surfIdx: int64): void
        
        /** Updates the vertex buffer of this mesh's surface with the given [param data]. The expected data per vertex is 12 or 8 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector3] or [Vector2] vertices. This value can be determined with [method RenderingServer.mesh_surface_get_format_vertex_stride].  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each vertex.  
         *  A [PackedVector3Array] of vertex locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        surfaceUpdateVertexRegion(surfIdx: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Updates the attribute buffer of this mesh's surface with the given [param data]. The expected data per attribute is 12 or 8 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector3] or [Vector2] vertices. This value can be determined with [method RenderingServer.mesh_surface_get_format_attribute_stride].  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each attribute.  
         *  A [PackedVector3Array] of attribute locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        surfaceUpdateAttributeRegion(surfIdx: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Updates the skin buffer of this mesh's surface with the given [param data]. The expected data per skin is 12 or 8 bytes (4 bytes per float, 2 floats per [Vector2], and 3 floats per [Vector3]) depending on if the mesh is using [Vector3] or [Vector2] vertices. This value can be determined with [method RenderingServer.mesh_surface_get_format_skin_stride].  
         *  The starting point of the updates can be changed with [param offset]. The value of [param offset] should be a multiple of 12 bytes in most cases to align to each skin.  
         *  A [PackedVector3Array] of skin locations can be converted into a [PackedByteArray] using [method PackedVector3Array.to_byte_array] for use in [param data].  
         */
        surfaceUpdateSkinRegion(surfIdx: int64, offset: int64, data: PackedByteArray | byte[] | ArrayBuffer): void
        
        /** Returns the length in vertices of the vertex array in the requested surface (see [method add_surface_from_arrays]). */
        surfaceGetArrayLen(surfIdx: int64): int64
        
        /** Returns the length in indices of the index array in the requested surface (see [method add_surface_from_arrays]). */
        surfaceGetArrayIndexLen(surfIdx: int64): int64
        
        /** Returns the format mask of the requested surface (see [method add_surface_from_arrays]). */
        surfaceGetFormat(surfIdx: int64): Mesh.ArrayFormat
        
        /** Returns the primitive type of the requested surface (see [method add_surface_from_arrays]). */
        surfaceGetPrimitiveType(surfIdx: int64): Mesh.PrimitiveType
        
        /** Returns the index of the first surface with this name held within this [ArrayMesh]. If none are found, -1 is returned. */
        surfaceFindByName(name: string): int64
        
        /** Sets a name for a given surface. */
        surfaceSetName(surfIdx: int64, name: string): void
        
        /** Gets the name assigned to this surface. */
        surfaceGetName(surfIdx: int64): string
        
        /** Regenerates tangents for each of the [ArrayMesh]'s surfaces. */
        regenNormalMaps(): void
        
        /** Performs a UV unwrap on the [ArrayMesh] to prepare the mesh for lightmapping. */
        lightmapUnwrap(transform: Transform3D, texelSize: float64): GError
        get _blendShapeNames(): PackedStringArray
        set _blendShapeNames(value: PackedStringArray | string[])
        get _surfaces(): GArray
        set _surfaces(value: GArray)
        
        /** The blend shape mode. */
        get blendShapeMode(): int64
        set blendShapeMode(value: int64)
        
        /** Overrides the [AABB] with one defined by user for use with frustum culling. Especially useful to avoid unexpected culling when using a shader to offset vertices. */
        get customAabb(): Aabb
        set customAabb(value: Aabb)
        
        /** An optional mesh which can be used for rendering shadows and the depth prepass. Can be used to increase performance by supplying a mesh with fused vertices and only vertex position data (without normals, UVs, colors, etc.).  
         *      
         *  **Note:** This mesh must have exactly the same vertex positions as the source mesh (including the source mesh's LODs, if present). If vertex positions differ, then the mesh will not draw correctly.  
         */
        get shadowMesh(): null | ArrayMesh
        set shadowMesh(value: null | ArrayMesh)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapArrayMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapArrayMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapArrayOccluder3D extends __RPCMapOccluder3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapArrayOccluder3D extends __NameMapOccluder3D {
        set_arrays: "setArrays";
    }
    /** 3D polygon shape for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_arrayoccluder3d.html  
     */
    class ArrayOccluder3D extends Occluder3D {
        constructor(identifier?: any)
        /** Sets [member indices] and [member vertices], while updating the final occluder only once after both values are set. */
        setArrays(vertices: PackedVector3Array | Vector3[], indices: PackedInt32Array | int32[]): void
        
        /** The occluder's vertex positions in local 3D coordinates.  
         *      
         *  **Note:** The occluder is always updated after setting this value. If creating occluders procedurally, consider using [method set_arrays] instead to avoid updating the occluder twice when it's created.  
         */
        get vertices(): PackedVector3Array
        set vertices(value: PackedVector3Array | Vector3[])
        
        /** The occluder's index position. Indices determine which points from the [member vertices] array should be drawn, and in which order.  
         *      
         *  **Note:** The occluder is always updated after setting this value. If creating occluders procedurally, consider using [method set_arrays] instead to avoid updating the occluder twice when it's created.  
         */
        get indices(): PackedInt32Array
        set indices(value: PackedInt32Array | int32[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapArrayOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapArrayOccluder3D;
    }
    namespace AspectRatioContainer {
        enum StretchMode {
            StretchWidthControlsHeight = 0,
            StretchHeightControlsWidth = 1,
            StretchFit = 2,
            StretchCover = 3,
        }
        enum AlignmentMode {
            AlignmentBegin = 0,
            AlignmentCenter = 1,
            AlignmentEnd = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAspectRatioContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAspectRatioContainer extends __NameMapContainer {
        stretch_mode: "stretchMode";
        alignment_horizontal: "alignmentHorizontal";
        alignment_vertical: "alignmentVertical";
    }
    /** A container that preserves the proportions of its child controls.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_aspectratiocontainer.html  
     */
    class AspectRatioContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** The aspect ratio to enforce on child controls. This is the width divided by the height. The ratio depends on the [member stretch_mode]. */
        get ratio(): float64
        set ratio(value: float64)
        
        /** The stretch mode used to align child controls. */
        get stretchMode(): int64
        set stretchMode(value: int64)
        
        /** Specifies the horizontal relative position of child controls. */
        get alignmentHorizontal(): int64
        set alignmentHorizontal(value: int64)
        
        /** Specifies the vertical relative position of child controls. */
        get alignmentVertical(): int64
        set alignmentVertical(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAspectRatioContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAspectRatioContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAtlasTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAtlasTexture extends __NameMapTexture2D {
        filter_clip: "filterClip";
    }
    /** A texture that crops out part of another Texture2D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_atlastexture.html  
     */
    class AtlasTexture extends Texture2D {
        constructor(identifier?: any)
        /** The texture that contains the atlas. Can be any type inheriting from [Texture2D], including another [AtlasTexture]. */
        get atlas(): null | Texture2D
        set atlas(value: null | Texture2D)
        
        /** The region used to draw the [member atlas]. If either dimension of the region's size is `0`, the value from [member atlas] size will be used for that axis instead.  
         *      
         *  **Note:** The image size is always an integer, so the actual region size is rounded down.  
         */
        get region(): Rect2
        set region(value: Rect2)
        
        /** The margin around the [member region]. Useful for small adjustments. If the [member Rect2.size] of this property ("w" and "h" in the editor) is set, the drawn texture is resized to fit within the margin. */
        get margin(): Rect2
        set margin(value: Rect2)
        
        /** If `true`, the area outside of the [member region] is clipped to avoid bleeding of the surrounding texture pixels. */
        get filterClip(): boolean
        set filterClip(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAtlasTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAtlasTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioBusLayout extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioBusLayout extends __NameMapResource {
    }
    /** Stores information about the audio buses.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiobuslayout.html  
     */
    class AudioBusLayout extends Resource {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioBusLayout;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioBusLayout;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffect extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffect extends __NameMapResource {
    }
    /** Base class for audio effect resources.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffect.html  
     */
    class AudioEffect extends Resource {
        constructor(identifier?: any)
        /** Override this method to customize the [AudioEffectInstance] created when this effect is applied on a bus in the editor's Audio panel, or through [method AudioServer.add_bus_effect].  
         *    
         *      
         *  **Note:** It is recommended to keep a reference to the original [AudioEffect] in the new instance. Depending on the implementation this allows the effect instance to listen for changes at run-time and be modified accordingly.  
         */
        /* gdvirtual */ _instantiate(): null | AudioEffectInstance
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffect;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectAmplify extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectAmplify extends __NameMapAudioEffect {
        volume_db: "volumeDb";
        volume_linear: "volumeLinear";
    }
    /** Adds a volume manipulation audio effect to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectamplify.html  
     */
    class AudioEffectAmplify extends AudioEffect {
        constructor(identifier?: any)
        /** Amount of amplification in dB. Positive values make the sound louder, negative values make it quieter. Value can range from -80 to 24. */
        get volumeDb(): float64
        set volumeDb(value: float64)
        
        /** Amount of amplification as a linear value.  
         *      
         *  **Note:** This member modifies [member volume_db] for convenience. The returned value is equivalent to the result of [method @GlobalScope.db_to_linear] on [member volume_db]. Setting this member is equivalent to setting [member volume_db] to the result of [method @GlobalScope.linear_to_db] on a value.  
         */
        get volumeLinear(): float64
        set volumeLinear(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectAmplify;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectAmplify;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectBandLimitFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectBandLimitFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a band-limit filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectbandlimitfilter.html  
     */
    class AudioEffectBandLimitFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectBandLimitFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectBandLimitFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectBandPassFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectBandPassFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a band-pass filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectbandpassfilter.html  
     */
    class AudioEffectBandPassFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectBandPassFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectBandPassFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectCapture extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectCapture extends __NameMapAudioEffect {
        can_get_buffer: "canGetBuffer";
        get_buffer: "getBuffer";
        clear_buffer: "clearBuffer";
        get_frames_available: "getFramesAvailable";
        get_discarded_frames: "getDiscardedFrames";
        get_buffer_length_frames: "getBufferLengthFrames";
        get_pushed_frames: "getPushedFrames";
        buffer_length: "bufferLength";
    }
    /** Exposes audio samples from an audio bus in real-time, such that it can be accessed as data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectcapture.html  
     */
    class AudioEffectCapture extends AudioEffect {
        constructor(identifier?: any)
        /** Returns `true` if at least [param frames] samples are available to read in the internal ring buffer. */
        canGetBuffer(frames: int64): boolean
        
        /** Gets the next [param frames] samples from the internal ring buffer.  
         *  Returns a [PackedVector2Array] containing exactly [param frames] samples if available, or an empty [PackedVector2Array] if insufficient data was available.  
         *  The samples are signed floating-point PCM between `-1` and `1`. You will have to scale them if you want to use them as 8 or 16-bit integer samples. (`v = 0x7fff * samples[0].x`)  
         */
        getBuffer(frames: int64): PackedVector2Array
        
        /** Clears the internal ring buffer.  
         *      
         *  **Note:** Calling this during a capture can cause the loss of samples which causes popping in the playback.  
         */
        clearBuffer(): void
        
        /** Returns the number of samples available to read using [method get_buffer]. */
        getFramesAvailable(): int64
        
        /** Returns the number of samples discarded from the audio bus due to full buffer. */
        getDiscardedFrames(): int64
        
        /** Returns the total size of the internal ring buffer in number of samples. */
        getBufferLengthFrames(): int64
        
        /** Returns the number of samples inserted from the audio bus. */
        getPushedFrames(): int64
        
        /** Length of the internal ring buffer, in seconds. Higher values keep data around for longer, but require more memory. Value can range from 0.01 to 10.  
         *      
         *  **Note:** Setting the buffer length will have no effect if already initialized.  
         */
        get bufferLength(): float64
        set bufferLength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectCapture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectCapture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectChorus extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectChorus extends __NameMapAudioEffect {
        set_voice_delay_ms: "setVoiceDelayMs";
        get_voice_delay_ms: "getVoiceDelayMs";
        set_voice_rate_hz: "setVoiceRateHz";
        get_voice_rate_hz: "getVoiceRateHz";
        set_voice_depth_ms: "setVoiceDepthMs";
        get_voice_depth_ms: "getVoiceDepthMs";
        set_voice_level_db: "setVoiceLevelDb";
        get_voice_level_db: "getVoiceLevelDb";
        set_voice_cutoff_hz: "setVoiceCutoffHz";
        get_voice_cutoff_hz: "getVoiceCutoffHz";
        set_voice_pan: "setVoicePan";
        get_voice_pan: "getVoicePan";
        voice_count: "voiceCount";
        "voice/1/delay_ms": "voice/1/delayMs";
        "voice/1/rate_hz": "voice/1/rateHz";
        "voice/1/depth_ms": "voice/1/depthMs";
        "voice/1/level_db": "voice/1/levelDb";
        "voice/1/cutoff_hz": "voice/1/cutoffHz";
        "voice/2/delay_ms": "voice/2/delayMs";
        "voice/2/rate_hz": "voice/2/rateHz";
        "voice/2/depth_ms": "voice/2/depthMs";
        "voice/2/level_db": "voice/2/levelDb";
        "voice/2/cutoff_hz": "voice/2/cutoffHz";
        "voice/3/delay_ms": "voice/3/delayMs";
        "voice/3/rate_hz": "voice/3/rateHz";
        "voice/3/depth_ms": "voice/3/depthMs";
        "voice/3/level_db": "voice/3/levelDb";
        "voice/3/cutoff_hz": "voice/3/cutoffHz";
        "voice/4/delay_ms": "voice/4/delayMs";
        "voice/4/rate_hz": "voice/4/rateHz";
        "voice/4/depth_ms": "voice/4/depthMs";
        "voice/4/level_db": "voice/4/levelDb";
        "voice/4/cutoff_hz": "voice/4/cutoffHz";
    }
    /** Adds a chorus audio effect to an audio bus.  
     *  Gives the impression of multiple audio sources.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectchorus.html  
     */
    class AudioEffectChorus extends AudioEffect {
        constructor(identifier?: any)
        /** Sets the delay of a given [param voice_idx] in milliseconds, compared to the original audio. Value can range from 0 to 50. */
        setVoiceDelayMs(voiceIdx: int64, delayMs: float64): void
        
        /** Returns the delay of a given [param voice_idx] in milliseconds, compared to the original audio. */
        getVoiceDelayMs(voiceIdx: int64): float64
        
        /** Sets the rate of a given [param voice_idx]'s low-frequency oscillator in Hz. Value can range from 0.1 to 20. */
        setVoiceRateHz(voiceIdx: int64, rateHz: float64): void
        
        /** Returns the rate of a given [param voice_idx]'s low-frequency oscillator in Hz. */
        getVoiceRateHz(voiceIdx: int64): float64
        
        /** Sets the depth of a given [param voice_idx]'s low-frequency oscillator in milliseconds. Value can range from 0 to 20. */
        setVoiceDepthMs(voiceIdx: int64, depthMs: float64): void
        
        /** Returns the depth of a given [param voice_idx]'s low-frequency oscillator in milliseconds. */
        getVoiceDepthMs(voiceIdx: int64): float64
        
        /** Sets the gain of a given [param voice_idx] in dB. Value can range from -60 to 24. */
        setVoiceLevelDb(voiceIdx: int64, levelDb: float64): void
        
        /** Returns the gain of a given [param voice_idx] in dB. */
        getVoiceLevelDb(voiceIdx: int64): float64
        
        /** Sets the frequency threshold of a given [param voice_idx]'s low-pass filter in Hz. Frequencies above [param cutoff_hz] are removed from [param voice_idx]. Value can range from 1 to 20500. */
        setVoiceCutoffHz(voiceIdx: int64, cutoffHz: float64): void
        
        /** Returns the frequency threshold of a given [param voice_idx]'s low-pass filter in Hz. Frequencies above this value are removed from the voice. */
        getVoiceCutoffHz(voiceIdx: int64): float64
        
        /** Sets the pan position of a given [param voice_idx]. Negative values pan the sound to the left, positive pan to the right. Value can range from -1 to 1. */
        setVoicePan(voiceIdx: int64, pan: float64): void
        
        /** Returns the pan position of a given [param voice_idx]. Negative values mean the left channel, positive mean the right. */
        getVoicePan(voiceIdx: int64): float64
        
        /** The number of voices in the effect. Value can range from 1 to 4. */
        get voiceCount(): int64
        set voiceCount(value: int64)
        
        /** The volume ratio of the original audio. Value can range from 0 to 1. */
        get dry(): float64
        set dry(value: float64)
        
        /** The volume ratio of all voices. Value can range from 0 to 1. */
        get wet(): float64
        set wet(value: float64)
        
        /** The delay of the voice in milliseconds, compared to the original audio. */
        get "voice/1/delayMs"(): float64
        set "voice/1/delayMs"(value: float64)
        
        /** The rate of the voice's low-frequency oscillator in Hz. */
        get "voice/1/rateHz"(): float64
        set "voice/1/rateHz"(value: float64)
        
        /** The depth of the voice's low-frequency oscillator in milliseconds. */
        get "voice/1/depthMs"(): float64
        set "voice/1/depthMs"(value: float64)
        
        /** The gain of the voice in dB. */
        get "voice/1/levelDb"(): float64
        set "voice/1/levelDb"(value: float64)
        
        /** The frequency threshold of the voice's low-pass filter in Hz. */
        get "voice/1/cutoffHz"(): float64
        set "voice/1/cutoffHz"(value: float64)
        
        /** The pan position of the voice. */
        get "voice/1/pan"(): float64
        set "voice/1/pan"(value: float64)
        
        /** The delay of the voice in milliseconds, compared to the original audio. */
        get "voice/2/delayMs"(): float64
        set "voice/2/delayMs"(value: float64)
        
        /** The rate of the voice's low-frequency oscillator in Hz. */
        get "voice/2/rateHz"(): float64
        set "voice/2/rateHz"(value: float64)
        
        /** The depth of the voice's low-frequency oscillator in milliseconds. */
        get "voice/2/depthMs"(): float64
        set "voice/2/depthMs"(value: float64)
        
        /** The gain of the voice in dB. */
        get "voice/2/levelDb"(): float64
        set "voice/2/levelDb"(value: float64)
        
        /** The frequency threshold of the voice's low-pass filter in Hz. */
        get "voice/2/cutoffHz"(): float64
        set "voice/2/cutoffHz"(value: float64)
        
        /** The pan position of the voice. */
        get "voice/2/pan"(): float64
        set "voice/2/pan"(value: float64)
        
        /** The delay of the voice in milliseconds, compared to the original audio. */
        get "voice/3/delayMs"(): float64
        set "voice/3/delayMs"(value: float64)
        
        /** The rate of the voice's low-frequency oscillator in Hz. */
        get "voice/3/rateHz"(): float64
        set "voice/3/rateHz"(value: float64)
        
        /** The depth of the voice's low-frequency oscillator in milliseconds. */
        get "voice/3/depthMs"(): float64
        set "voice/3/depthMs"(value: float64)
        
        /** The gain of the voice in dB. */
        get "voice/3/levelDb"(): float64
        set "voice/3/levelDb"(value: float64)
        
        /** The frequency threshold of the voice's low-pass filter in Hz. */
        get "voice/3/cutoffHz"(): float64
        set "voice/3/cutoffHz"(value: float64)
        
        /** The pan position of the voice. */
        get "voice/3/pan"(): float64
        set "voice/3/pan"(value: float64)
        
        /** The delay of the voice in milliseconds, compared to the original audio. */
        get "voice/4/delayMs"(): float64
        set "voice/4/delayMs"(value: float64)
        
        /** The rate of the voice's low-frequency oscillator in Hz. */
        get "voice/4/rateHz"(): float64
        set "voice/4/rateHz"(value: float64)
        
        /** The depth of the voice's low-frequency oscillator in milliseconds. */
        get "voice/4/depthMs"(): float64
        set "voice/4/depthMs"(value: float64)
        
        /** The gain of the voice in dB. */
        get "voice/4/levelDb"(): float64
        set "voice/4/levelDb"(value: float64)
        
        /** The frequency threshold of the voice's low-pass filter in Hz. */
        get "voice/4/cutoffHz"(): float64
        set "voice/4/cutoffHz"(value: float64)
        
        /** The pan position of the voice. */
        get "voice/4/pan"(): float64
        set "voice/4/pan"(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectChorus;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectChorus;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectCompressor extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectCompressor extends __NameMapAudioEffect {
        attack_us: "attackUs";
        release_ms: "releaseMs";
    }
    /** Adds a downward compressor audio effect to an audio bus.  
     *  Allows control of the dynamic range via a volume threshold and timing controls.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectcompressor.html  
     */
    class AudioEffectCompressor extends AudioEffect {
        constructor(identifier?: any)
        /** The volume level above which compression is applied to the audio, in dB. Value can range from -60 to 0. */
        get threshold(): float64
        set threshold(value: float64)
        
        /** Amount of compression applied to the audio once it passes the volume threshold level. The higher the ratio, the stronger the compression applied to audio signals that pass the volume threshold level. Value can range from 1 to 48. */
        get ratio(): float64
        set ratio(value: float64)
        
        /** Gain of the audio signal, in dB. Value can range from -20 to 20. */
        get gain(): float64
        set gain(value: float64)
        
        /** Compressor's reaction time when the audio exceeds the volume threshold level, in microseconds. Value can range from 20 to 2000. */
        get attackUs(): float64
        set attackUs(value: float64)
        
        /** Compressor's delay time to stop decreasing the volume after the it falls below the volume threshold level, in milliseconds. Value can range from 20 to 2000. */
        get releaseMs(): float64
        set releaseMs(value: float64)
        
        /** Balance between the original audio and the compressed audio. Value can range from 0 (totally dry) to 1 (totally wet). */
        get mix(): float64
        set mix(value: float64)
        
        /** Audio bus to use for the volume threshold detection. */
        get sidechain(): StringName
        set sidechain(value: StringName)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectCompressor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectCompressor;
    }
}
