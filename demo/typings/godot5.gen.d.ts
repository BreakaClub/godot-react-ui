declare module "godot" {
    // AUTO-GENERATED
    namespace Light3D {
        enum Param {
            ParamEnergy = 0,
            ParamIndirectEnergy = 1,
            ParamVolumetricFogEnergy = 2,
            ParamSpecular = 3,
            ParamRange = 4,
            ParamSize = 5,
            ParamAttenuation = 6,
            ParamSpotAngle = 7,
            ParamSpotAttenuation = 8,
            ParamShadowMaxDistance = 9,
            ParamShadowSplit1Offset = 10,
            ParamShadowSplit2Offset = 11,
            ParamShadowSplit3Offset = 12,
            ParamShadowFadeStart = 13,
            ParamShadowNormalBias = 14,
            ParamShadowBias = 15,
            ParamShadowPancakeSize = 16,
            ParamShadowOpacity = 17,
            ParamShadowBlur = 18,
            ParamTransmittanceBias = 19,
            ParamIntensity = 20,
            ParamContactShadowBlur = 21,
            ParamMax = 22,
        }
        enum BakeMode {
            BakeDisabled = 0,
            BakeStatic = 1,
            BakeDynamic = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLight3D extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLight3D extends __NameMapVisualInstance3D {
        set_param: "setParam";
        get_param: "getParam";
        get_correlated_color: "getCorrelatedColor";
        light_intensity_lumens: "lightIntensityLumens";
        light_intensity_lux: "lightIntensityLux";
        light_temperature: "lightTemperature";
        light_color: "lightColor";
        light_energy: "lightEnergy";
        light_indirect_energy: "lightIndirectEnergy";
        light_volumetric_fog_energy: "lightVolumetricFogEnergy";
        light_projector: "lightProjector";
        light_size: "lightSize";
        light_angular_distance: "lightAngularDistance";
        light_negative: "lightNegative";
        light_specular: "lightSpecular";
        light_bake_mode: "lightBakeMode";
        light_cull_mask: "lightCullMask";
        shadow_enabled: "shadowEnabled";
        shadow_bias: "shadowBias";
        shadow_normal_bias: "shadowNormalBias";
        shadow_reverse_cull_face: "shadowReverseCullFace";
        shadow_transmittance_bias: "shadowTransmittanceBias";
        shadow_opacity: "shadowOpacity";
        shadow_blur: "shadowBlur";
        shadow_caster_mask: "shadowCasterMask";
        shadow_contact_shadows_allow: "shadowContactShadowsAllow";
        shadow_contact_shadows_blur: "shadowContactShadowsBlur";
        distance_fade_enabled: "distanceFadeEnabled";
        distance_fade_begin: "distanceFadeBegin";
        distance_fade_shadow: "distanceFadeShadow";
        distance_fade_length: "distanceFadeLength";
        editor_only: "editorOnly";
    }
    /** Provides a base class for different kinds of light nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_light3d.html  
     */
    class Light3D<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** Sets the value of the specified [enum Light3D.Param] parameter. */
        setParam(param: Light3D.Param, value: float64): void
        
        /** Returns the value of the specified [enum Light3D.Param] parameter. */
        getParam(param: Light3D.Param): float64
        
        /** Returns the [Color] of an idealized blackbody at the given [member light_temperature]. This value is calculated internally based on the [member light_temperature]. This [Color] is multiplied by [member light_color] before being sent to the [RenderingServer]. */
        getCorrelatedColor(): Color
        
        /** Used by positional lights ([OmniLight3D] and [SpotLight3D]) when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is `true`. Sets the intensity of the light source measured in Lumens. Lumens are a measure of luminous flux, which is the total amount of visible light emitted by a light source per unit of time.  
         *  For [SpotLight3D]s, we assume that the area outside the visible cone is surrounded by a perfect light absorbing material. Accordingly, the apparent brightness of the cone area does not change as the cone increases and decreases in size.  
         *  A typical household lightbulb can range from around 600 lumens to 1,200 lumens, a candle is about 13 lumens, while a streetlight can be approximately 60,000 lumens.  
         */
        get lightIntensityLumens(): float64
        set lightIntensityLumens(value: float64)
        
        /** Used by [DirectionalLight3D]s when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is `true`. Sets the intensity of the light source measured in Lux. Lux is a measure of luminous flux per unit area, it is equal to one lumen per square meter. Lux is the measure of how much light hits a surface at a given time.  
         *  On a clear sunny day a surface in direct sunlight may be approximately 100,000 lux, a typical room in a home may be approximately 50 lux, while the moonlit ground may be approximately 0.1 lux.  
         */
        get lightIntensityLux(): float64
        set lightIntensityLux(value: float64)
        
        /** Sets the color temperature of the light source, measured in Kelvin. This is used to calculate a correlated color temperature which tints the [member light_color].  
         *  The sun on a cloudy day is approximately 6500 Kelvin, on a clear day it is between 5500 to 6000 Kelvin, and on a clear day at sunrise or sunset it ranges to around 1850 Kelvin.  
         */
        get lightTemperature(): float64
        set lightTemperature(value: float64)
        
        /** The light's color in nonlinear sRGB encoding. An  *overbright*  color can be used to achieve a result equivalent to increasing the light's [member light_energy]. */
        get lightColor(): Color
        set lightColor(value: Color)
        
        /** The light's strength multiplier (this is not a physical unit). For [OmniLight3D] and [SpotLight3D], changing this value will only change the light color's intensity, not the light's radius. */
        get lightEnergy(): float64
        set lightEnergy(value: float64)
        
        /** Secondary multiplier used with indirect light (light bounces). Used with [VoxelGI] and SDFGI (see [member Environment.sdfgi_enabled]).  
         *      
         *  **Note:** This property is ignored if [member light_energy] is equal to `0.0`, as the light won't be present at all in the GI shader.  
         */
        get lightIndirectEnergy(): float64
        set lightIndirectEnergy(value: float64)
        
        /** Secondary multiplier multiplied with [member light_energy] then used with the [Environment]'s volumetric fog (if enabled). If set to `0.0`, computing volumetric fog will be skipped for this light, which can improve performance for large amounts of lights when volumetric fog is enabled.  
         *      
         *  **Note:** To prevent short-lived dynamic light effects from poorly interacting with volumetric fog, lights used in those effects should have [member light_volumetric_fog_energy] set to `0.0` unless [member Environment.volumetric_fog_temporal_reprojection_enabled] is disabled (or unless the reprojection amount is significantly lowered).  
         */
        get lightVolumetricFogEnergy(): float64
        set lightVolumetricFogEnergy(value: float64)
        
        /** [Texture2D] projected by light. [member shadow_enabled] must be on for the projector to work. Light projectors make the light appear as if it is shining through a colored but transparent object, almost like light shining through stained-glass.  
         *      
         *  **Note:** Unlike [BaseMaterial3D] whose filter mode can be adjusted on a per-material basis, the filter mode for light projector textures is set globally with [member ProjectSettings.rendering/textures/light_projectors/filter].  
         *      
         *  **Note:** Light projector textures are only supported in the Forward+ and Mobile rendering methods, not Compatibility.  
         */
        get lightProjector(): null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture
        set lightProjector(value: null | Texture2D | AnimatedTexture | AtlasTexture | CameraTexture | CanvasTexture | MeshTexture | Texture2Drd | ViewportTexture)
        
        /** The simulated size of the light in Godot units, affecting shading and shadows. For [OmniLight3D]s and [SpotLight3D]s, increasing this value simulates a spherical area light, expanding the size of specular highlights. If shadows are enabled, a penumbra is rendered, making shadows appear blurrier. For [AreaLight3D]s, only the shadows are affected. Penumbras are simulated with percentage-closer soft shadows, or PCSS, which has a noticeable performance cost for values above `0.0`.  
         *      
         *  **Note:** [member light_size] is not affected by [member Node3D.scale] (the light's scale or its parent's scale).  
         *      
         *  **Note:** PCSS for positional lights is only supported in the Forward+ and Mobile rendering methods, not Compatibility.  
         */
        get lightSize(): float64
        set lightSize(value: float64)
        
        /** The light's angular size in degrees. Increasing this will make shadows softer at greater distances (also called percentage-closer soft shadows, or PCSS). Only available for [DirectionalLight3D]s. For reference, the Sun from the Earth is approximately `0.5`. Increasing this value above `0.0` for lights with shadows enabled will have a noticeable performance cost due to PCSS.  
         *      
         *  **Note:** [member light_angular_distance] is not affected by [member Node3D.scale] (the light's scale or its parent's scale).  
         *      
         *  **Note:** PCSS for directional lights is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         */
        get lightAngularDistance(): float64
        set lightAngularDistance(value: float64)
        
        /** If `true`, the light's effect is reversed, darkening areas and casting bright shadows. */
        get lightNegative(): boolean
        set lightNegative(value: boolean)
        
        /** The intensity of the specular blob in objects affected by the light. At `0`, the light becomes a pure diffuse light. When not baking emission, this can be used to avoid unrealistic reflections when placing lights above an emissive surface. */
        get lightSpecular(): float64
        set lightSpecular(value: float64)
        
        /** The light's bake mode. This will affect the global illumination techniques that have an effect on the light's rendering.  
         *      
         *  **Note:** Meshes' global illumination mode will also affect the global illumination rendering. See [member GeometryInstance3D.gi_mode].  
         */
        get lightBakeMode(): int64
        set lightBakeMode(value: int64)
        
        /** The light will affect objects in the selected layers.  
         *      
         *  **Note:** The light cull mask is ignored by [VoxelGI], SDFGI, [LightmapGI], and volumetric fog. These will always render lights in a way that ignores the cull mask. See also [member VisualInstance3D.layers].  
         */
        get lightCullMask(): int64
        set lightCullMask(value: int64)
        
        /** If `true`, the light will cast real-time shadows. This has a significant performance cost. Only enable shadow rendering when it makes a noticeable difference in the scene's appearance, and consider using [member distance_fade_enabled] to hide the light when far away from the [Camera3D]. */
        get shadowEnabled(): boolean
        set shadowEnabled(value: boolean)
        
        /** Used to adjust shadow appearance. Too small a value results in self-shadowing ("shadow acne"), while too large a value causes shadows to separate from casters ("peter-panning"). Adjust as needed. */
        get shadowBias(): float64
        set shadowBias(value: float64)
        
        /** Offsets the lookup into the shadow map by the object's normal. This can be used to reduce self-shadowing artifacts without using [member shadow_bias]. In practice, this value should be tweaked along with [member shadow_bias] to reduce artifacts as much as possible. */
        get shadowNormalBias(): float64
        set shadowNormalBias(value: float64)
        
        /** If `true`, reverses the backface culling of the mesh. This can be useful when you have a flat mesh that has a light behind it. If you need to cast a shadow on both sides of the mesh, set the mesh to use double-sided shadows with [constant GeometryInstance3D.SHADOW_CASTING_SETTING_DOUBLE_SIDED]. */
        get shadowReverseCullFace(): boolean
        set shadowReverseCullFace(value: boolean)
        get shadowTransmittanceBias(): float64
        set shadowTransmittanceBias(value: float64)
        
        /** The opacity to use when rendering the light's shadow map. Values lower than `1.0` make the light appear through shadows. This can be used to fake global illumination at a low performance cost. */
        get shadowOpacity(): float64
        set shadowOpacity(value: float64)
        
        /** Blurs the edges of the shadow. Can be used to hide pixel artifacts in low-resolution shadow maps. A high value can impact performance, make shadows appear grainy and can cause other unwanted artifacts. Try to keep as near default as possible. */
        get shadowBlur(): float64
        set shadowBlur(value: float64)
        
        /** The light will only cast shadows using objects in the selected layers. */
        get shadowCasterMask(): int64
        set shadowCasterMask(value: int64)
        
        /** Enables screen-space contact shadows for this light. Only used when [member ProjectSettings.rendering/lights_and_shadows/contact_shadow/enabled] is enabled. */
        get shadowContactShadowsAllow(): boolean
        set shadowContactShadowsAllow(value: boolean)
        
        /** Blurs the edges of the contact shadow. `0.0` produces sharp shadows; higher values increase the noise magnitude. Only used when [member shadow_contact_shadows_allow] is enabled. */
        get shadowContactShadowsBlur(): float64
        set shadowContactShadowsBlur(value: float64)
        
        /** If `true`, the light will smoothly fade away when far from the active [Camera3D] starting at [member distance_fade_begin]. This acts as a form of level of detail (LOD). The light will fade out over [member distance_fade_begin] + [member distance_fade_length], after which it will be culled and not sent to the shader at all. Use this to reduce the number of active lights in a scene and thus improve performance.  
         *      
         *  **Note:** Only effective for [OmniLight3D] and [SpotLight3D].  
         */
        get distanceFadeEnabled(): boolean
        set distanceFadeEnabled(value: boolean)
        
        /** The distance from the camera at which the light begins to fade away (in 3D units).  
         *      
         *  **Note:** Only effective for [OmniLight3D] and [SpotLight3D].  
         */
        get distanceFadeBegin(): float64
        set distanceFadeBegin(value: float64)
        
        /** The distance from the camera at which the light's shadow cuts off (in 3D units). Set this to a value lower than [member distance_fade_begin] + [member distance_fade_length] to further improve performance, as shadow rendering is often more expensive than light rendering itself.  
         *      
         *  **Note:** Only effective for [OmniLight3D] and [SpotLight3D], and only when [member shadow_enabled] is `true`.  
         */
        get distanceFadeShadow(): float64
        set distanceFadeShadow(value: float64)
        
        /** Distance over which the light and its shadow fades. The light's energy and shadow's opacity is progressively reduced over this distance and is completely invisible at the end.  
         *      
         *  **Note:** Only effective for [OmniLight3D] and [SpotLight3D].  
         */
        get distanceFadeLength(): float64
        set distanceFadeLength(value: float64)
        
        /** If `true`, the light only appears in the editor and will not be visible at runtime. If `true`, the light will never be baked in [LightmapGI] regardless of its [member light_bake_mode]. */
        get editorOnly(): boolean
        set editorOnly(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLight3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLight3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightOccluder2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightOccluder2D extends __NameMapNode2D {
        sdf_collision: "sdfCollision";
        occluder_light_mask: "occluderLightMask";
    }
    /** Occludes light cast by a Light2D, casting shadows.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightoccluder2d.html  
     */
    class LightOccluder2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The [OccluderPolygon2D] used to compute the shadow. */
        get occluder(): null | OccluderPolygon2D
        set occluder(value: null | OccluderPolygon2D)
        
        /** If enabled, the occluder will be part of a real-time generated signed distance field that can be used in custom shaders. */
        get sdfCollision(): boolean
        set sdfCollision(value: boolean)
        
        /** The LightOccluder2D's occluder light mask. The LightOccluder2D will cast shadows only from Light2D(s) that have the same light mask(s). */
        get occluderLightMask(): int64
        set occluderLightMask(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightOccluder2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightOccluder2D;
    }
    namespace LightmapGI {
        enum BakeQuality {
            BakeQualityLow = 0,
            BakeQualityMedium = 1,
            BakeQualityHigh = 2,
            BakeQualityUltra = 3,
        }
        enum GenerateProbes {
            GenerateProbesDisabled = 0,
            GenerateProbesSubdiv4 = 1,
            GenerateProbesSubdiv8 = 2,
            GenerateProbesSubdiv16 = 3,
            GenerateProbesSubdiv32 = 4,
        }
        enum BakeError {
            BakeErrorOk = 0,
            BakeErrorNoSceneRoot = 1,
            BakeErrorForeignData = 2,
            BakeErrorNoLightmapper = 3,
            BakeErrorNoSavePath = 4,
            BakeErrorNoMeshes = 5,
            BakeErrorMeshesInvalid = 6,
            BakeErrorCantCreateImage = 7,
            BakeErrorUserAborted = 8,
            BakeErrorTextureSizeTooSmall = 9,
            BakeErrorLightmapTooSmall = 10,
            BakeErrorAtlasTooSmall = 11,
            BakeErrorTextureExceedsDeviceLimit = 12,
        }
        enum EnvironmentMode {
            EnvironmentModeDisabled = 0,
            EnvironmentModeScene = 1,
            EnvironmentModeCustomSky = 2,
            EnvironmentModeCustomColor = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightmapGI extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightmapGI extends __NameMapVisualInstance3D {
        supersampling_factor: "supersamplingFactor";
        bounce_indirect_energy: "bounceIndirectEnergy";
        specular_intensity: "specularIntensity";
        shadowmask_mode: "shadowmaskMode";
        use_texture_for_bounces: "useTextureForBounces";
        use_denoiser: "useDenoiser";
        denoiser_strength: "denoiserStrength";
        denoiser_range: "denoiserRange";
        texel_scale: "texelScale";
        max_texture_size: "maxTextureSize";
        environment_mode: "environmentMode";
        environment_custom_sky: "environmentCustomSky";
        environment_custom_color: "environmentCustomColor";
        environment_custom_energy: "environmentCustomEnergy";
        camera_attributes: "cameraAttributes";
        generate_probes_subdiv: "generateProbesSubdiv";
        light_data: "lightData";
    }
    /** Computes and stores baked lightmaps for fast global illumination.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightmapgi.html  
     */
    class LightmapGI<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** The quality preset to use when baking lightmaps. This affects bake times, but output file sizes remain mostly identical across quality levels.  
         *  To further speed up bake times, decrease [member bounces], disable [member use_denoiser] and/or decrease [member texel_scale].  
         *  To further increase quality, enable [member supersampling] and/or increase [member texel_scale].  
         */
        get quality(): int64
        set quality(value: int64)
        
        /** If `true`, lightmaps are baked with the texel scale multiplied with [member supersampling_factor] and downsampled before saving the lightmap (so the effective texel density is identical to having supersampling disabled).  
         *  Supersampling provides increased lightmap quality with less noise, smoother shadows and better shadowing of small-scale features in objects. However, it may result in significantly increased bake times and memory usage while baking lightmaps. Padding is automatically adjusted to avoid increasing light leaking.  
         */
        get supersampling(): boolean
        set supersampling(value: boolean)
        
        /** The factor by which the texel density is multiplied for supersampling. For best results, use an integer value. While fractional values are allowed, they can result in increased light leaking and a blurry lightmap.  
         *  Higher values may result in better quality, but also increase bake times and memory usage while baking.  
         *  See [member supersampling] for more information.  
         */
        get supersamplingFactor(): float64
        set supersamplingFactor(value: float64)
        
        /** Number of light bounces that are taken into account during baking. Higher values result in brighter, more realistic lighting, at the cost of longer bake times. If set to `0`, only environment lighting, direct light and emissive lighting is baked. */
        get bounces(): int64
        set bounces(value: int64)
        
        /** The energy multiplier for each bounce. Higher values will make indirect lighting brighter. A value of `1.0` represents physically accurate behavior, but higher values can be used to make indirect lighting propagate more visibly when using a low number of bounces. This can be used to speed up bake times by lowering the number of [member bounces] then increasing [member bounce_indirect_energy].  
         *      
         *  **Note:** [member bounce_indirect_energy] only has an effect if [member bounces] is set to a value greater than or equal to `1`.  
         */
        get bounceIndirectEnergy(): float64
        set bounceIndirectEnergy(value: float64)
        
        /** If `true`, bakes lightmaps to contain directional information as spherical harmonics. This results in more realistic lighting appearance, especially with normal mapped materials and for lights that have their direct light baked ([member Light3D.light_bake_mode] set to [constant Light3D.BAKE_STATIC] and with [member Light3D.editor_only] set to `false`). The directional information is also used to provide rough reflections for static and dynamic objects. This has a small run-time performance cost as the shader has to perform more work to interpret the direction information from the lightmap. Directional lightmaps also take longer to bake and result in larger file sizes.  
         *      
         *  **Note:** The property's name has no relationship with [DirectionalLight3D]. [member directional] works with all light types.  
         */
        get directional(): boolean
        set directional(value: boolean)
        
        /** The strength of the lightmap's approximated specular lobe. This helps make lightmapped scenes look closer to real-time lighting, which is particularly noticeable for lights that use the [constant Light3D.BAKE_STATIC] bake mode. Only effective if [member directional] is `true`.  
         *      
         *  **Note:** The lightmap is only able to represent one light direction per texel, which means that the specular direction may appear to be incorrect in certain cases. This can manifest as specular lobes appearing to warp around as the camera moves.  
         */
        get specularIntensity(): float64
        set specularIntensity(value: float64)
        
        /** The shadowmasking policy to use for directional shadows on static objects that are baked with this [LightmapGI] instance.  
         *  Shadowmasking allows [DirectionalLight3D] nodes to cast shadows even outside the range defined by their [member DirectionalLight3D.directional_shadow_max_distance] property. This is done by baking a texture that contains a shadowmap for the directional light, then using this texture according to the current shadowmask mode.  
         *      
         *  **Note:** The shadowmask texture is only created if [member shadowmask_mode] is not [constant LightmapGIData.SHADOWMASK_MODE_NONE]. To see a difference, you need to bake lightmaps again after switching from [constant LightmapGIData.SHADOWMASK_MODE_NONE] to any other mode.  
         */
        get shadowmaskMode(): int64
        set shadowmaskMode(value: int64)
        
        /** If `true`, a texture with the lighting information will be generated to speed up the generation of indirect lighting at the cost of some accuracy. The geometry might exhibit extra light leak artifacts when using low resolution lightmaps or UVs that stretch the lightmap significantly across surfaces. Leave [member use_texture_for_bounces] at its default value of `true` if unsure.  
         *      
         *  **Note:** [member use_texture_for_bounces] only has an effect if [member bounces] is set to a value greater than or equal to `1`.  
         */
        get useTextureForBounces(): boolean
        set useTextureForBounces(value: boolean)
        
        /** If `true`, ignore environment lighting when baking lightmaps. */
        get interior(): boolean
        set interior(value: boolean)
        
        /** If `true`, uses a GPU-based denoising algorithm on the generated lightmap. This eliminates most noise within the generated lightmap at the cost of longer bake times. File sizes are generally not impacted significantly by the use of a denoiser, although lossless compression may do a better job at compressing a denoised image. */
        get useDenoiser(): boolean
        set useDenoiser(value: boolean)
        
        /** The strength of denoising step applied to the generated lightmaps. Only effective if [member use_denoiser] is `true` and [member ProjectSettings.rendering/lightmapping/denoising/denoiser] is set to JNLM. */
        get denoiserStrength(): float64
        set denoiserStrength(value: float64)
        
        /** The distance in pixels from which the denoiser samples. Lower values preserve more details, but may give blotchy results if the lightmap quality is not high enough. Only effective if [member use_denoiser] is `true` and [member ProjectSettings.rendering/lightmapping/denoising/denoiser] is set to JNLM. */
        get denoiserRange(): int64
        set denoiserRange(value: int64)
        
        /** The bias to use when computing shadows. Increasing [member bias] can fix shadow acne on the resulting baked lightmap, but can introduce peter-panning (shadows not connecting to their casters). Real-time [Light3D] shadows are not affected by this [member bias] property. */
        get bias(): float64
        set bias(value: float64)
        
        /** Scales the lightmap texel density of all meshes for the current bake. This is a multiplier that builds upon the existing lightmap texel size defined in each imported 3D scene, along with the per-mesh density multiplier (which is designed to be used when the same mesh is used at different scales). Lower values will result in faster bake times.  
         *  For example, doubling [member texel_scale] doubles the lightmap texture resolution for all objects  *on each axis* , so it will  *quadruple*  the texel count.  
         */
        get texelScale(): float64
        set texelScale(value: float64)
        
        /** The maximum texture size for the generated texture atlas. Higher values will result in fewer slices being generated, but may not work on all hardware as a result of hardware limitations on texture sizes. Leave [member max_texture_size] at its default value of `16384` if unsure.  
         *      
         *  **Note:** If [member supersampling] is enabled, the texture atlas used while baking may be up to [member supersampling_factor] times larger than [member max_texture_size], since it's downsampled before saving.  
         */
        get maxTextureSize(): int64
        set maxTextureSize(value: int64)
        
        /** The environment mode to use when baking lightmaps. */
        get environmentMode(): int64
        set environmentMode(value: int64)
        
        /** The sky to use as a source of environment lighting. Only effective if [member environment_mode] is [constant ENVIRONMENT_MODE_CUSTOM_SKY]. */
        get environmentCustomSky(): null | Sky
        set environmentCustomSky(value: null | Sky)
        
        /** The color to use for environment lighting. Only effective if [member environment_mode] is [constant ENVIRONMENT_MODE_CUSTOM_COLOR]. */
        get environmentCustomColor(): Color
        set environmentCustomColor(value: Color)
        
        /** The color multiplier to use for environment lighting. Only effective if [member environment_mode] is [constant ENVIRONMENT_MODE_CUSTOM_COLOR]. */
        get environmentCustomEnergy(): float64
        set environmentCustomEnergy(value: float64)
        
        /** The [CameraAttributes] resource that specifies exposure levels to bake at. Auto-exposure and non exposure properties will be ignored. Exposure settings should be used to reduce the dynamic range present when baking. If exposure is too high, the [LightmapGI] will have banding artifacts or may have over-exposure artifacts. */
        get cameraAttributes(): null | CameraAttributesPractical | CameraAttributesPhysical
        set cameraAttributes(value: null | CameraAttributesPractical | CameraAttributesPhysical)
        
        /** The level of subdivision to use when automatically generating [LightmapProbe]s for dynamic object lighting. Higher values result in more accurate indirect lighting on dynamic objects, at the cost of longer bake times and larger file sizes.  
         *      
         *  **Note:** Automatically generated [LightmapProbe]s are not visible as nodes in the Scene tree dock, and cannot be modified this way after they are generated.  
         *      
         *  **Note:** Regardless of [member generate_probes_subdiv], direct lighting on dynamic objects is always applied using [Light3D] nodes in real-time.  
         */
        get generateProbesSubdiv(): int64
        set generateProbesSubdiv(value: int64)
        
        /** The [LightmapGIData] associated to this [LightmapGI] node. This resource is automatically created after baking, and is not meant to be created manually. */
        get lightData(): null | LightmapGIData
        set lightData(value: null | LightmapGIData)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightmapGI;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightmapGI;
    }
    namespace LightmapGIData {
        enum ShadowmaskMode {
            ShadowmaskModeNone = 0,
            ShadowmaskModeReplace = 1,
            ShadowmaskModeOverlay = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightmapGIData extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightmapGIData extends __NameMapResource {
        add_user: "addUser";
        get_user_count: "getUserCount";
        get_user_path: "getUserPath";
        clear_users: "clearUsers";
        lightmap_textures: "lightmapTextures";
        shadowmask_textures: "shadowmaskTextures";
        uses_spherical_harmonics: "usesSphericalHarmonics";
        user_data: "userData";
        probe_data: "probeData";
        _uses_packed_directional: "_usesPackedDirectional";
        light_texture: "lightTexture";
        light_textures: "lightTextures";
    }
    /** Contains baked lightmap and dynamic object probe data for [LightmapGI].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightmapgidata.html  
     */
    class LightmapGIData extends Resource {
        constructor(identifier?: any)
        /** Adds an object that is considered baked within this [LightmapGIData]. */
        addUser(path: NodePath | string, uVScale: Rect2, sliceIndex: int64, subInstance: int64): void
        
        /** Returns the number of objects that are considered baked within this [LightmapGIData]. */
        getUserCount(): int64
        
        /** Returns the [NodePath] of the baked object at index [param user_idx]. */
        getUserPath(userIdx: int64): NodePath
        
        /** Clear all objects that are considered baked within this [LightmapGIData]. */
        clearUsers(): void
        
        /** The lightmap atlas textures generated by the lightmapper. */
        get lightmapTextures(): GArray<TextureLayered>
        set lightmapTextures(value: GArray<TextureLayered>)
        
        /** The shadowmask atlas textures generated by the lightmapper. */
        get shadowmaskTextures(): GArray<TextureLayered>
        set shadowmaskTextures(value: GArray<TextureLayered>)
        get usesSphericalHarmonics(): boolean
        set usesSphericalHarmonics(value: boolean)
        get userData(): GArray
        set userData(value: GArray)
        get probeData(): GDictionary
        set probeData(value: GDictionary)
        get _usesPackedDirectional(): boolean
        set _usesPackedDirectional(value: boolean)
        
        /** The lightmap atlas texture generated by the lightmapper. */
        get lightTexture(): null | TextureLayered
        set lightTexture(value: null | TextureLayered)
        get lightTextures(): GArray
        set lightTextures(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightmapGIData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightmapGIData;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightmapProbe extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightmapProbe extends __NameMapNode3D {
    }
    /** Represents a single manually placed probe for dynamic object lighting with [LightmapGI].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightmapprobe.html  
     */
    class LightmapProbe<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightmapProbe;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightmapProbe;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightmapper extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightmapper extends __NameMapRefCounted {
    }
    /** Abstract class extended by lightmappers, for use in [LightmapGI].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightmapper.html  
     */
    class Lightmapper extends RefCounted {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightmapper;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightmapper;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLightmapperRD extends __RPCMapLightmapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLightmapperRD extends __NameMapLightmapper {
    }
    /** The built-in GPU-based lightmapper for use with [LightmapGI].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lightmapperrd.html  
     */
    class LightmapperRD extends Lightmapper {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLightmapperRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLightmapperRD;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLimitAngularVelocityModifier3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLimitAngularVelocityModifier3D extends __NameMapSkeletonModifier3D {
        set_root_bone_name: "setRootBoneName";
        get_root_bone_name: "getRootBoneName";
        set_root_bone: "setRootBone";
        get_root_bone: "getRootBone";
        set_end_bone_name: "setEndBoneName";
        get_end_bone_name: "getEndBoneName";
        set_end_bone: "setEndBone";
        get_end_bone: "getEndBone";
        clear_chains: "clearChains";
        max_angular_velocity: "maxAngularVelocity";
        chain_count: "chainCount";
        joint_count: "jointCount";
    }
    /** Limit bone rotation angular velocity.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_limitangularvelocitymodifier3d.html  
     */
    class LimitAngularVelocityModifier3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
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
         *  **Note:** End bone must be the root bone or a child of the root bone.  
         */
        setEndBoneName(index: int64, boneName: string): void
        
        /** Returns the end bone name of the bone chain. */
        getEndBoneName(index: int64): string
        
        /** Sets the end bone index of the bone chain. */
        setEndBone(index: int64, bone: int64): void
        
        /** Returns the end bone index of the bone chain. */
        getEndBone(index: int64): int64
        
        /** Clear all chains. */
        clearChains(): void
        
        /** Sets the reference pose for angle comparison to the current pose with the influence of constraints removed. This function is automatically triggered when joints change or upon activation. */
        reset(): void
        
        /** The maximum angular velocity per second. */
        get maxAngularVelocity(): float64
        set maxAngularVelocity(value: float64)
        
        /** If `true`, the modifier processes bones not included in the bone list.  
         *  If `false`, the bones processed by the modifier are equal to the bone list.  
         */
        get exclude(): boolean
        set exclude(value: boolean)
        
        /** The number of chains. */
        get chainCount(): int64
        set chainCount(value: int64)
        
        /** The number of joints in the list which created by chains dynamically. */
        get jointCount(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLimitAngularVelocityModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLimitAngularVelocityModifier3D;
    }
    namespace Line2D {
        enum LineJointMode {
            LineJointSharp = 0,
            LineJointBevel = 1,
            LineJointRound = 2,
        }
        enum LineCapMode {
            LineCapNone = 0,
            LineCapBox = 1,
            LineCapRound = 2,
        }
        enum LineTextureMode {
            LineTextureNone = 0,
            LineTextureTile = 1,
            LineTextureStretch = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLine2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLine2D extends __NameMapNode2D {
        set_point_position: "setPointPosition";
        get_point_position: "getPointPosition";
        get_point_count: "getPointCount";
        add_point: "addPoint";
        remove_point: "removePoint";
        clear_points: "clearPoints";
        width_curve: "widthCurve";
        default_color: "defaultColor";
        texture_mode: "textureMode";
        joint_mode: "jointMode";
        begin_cap_mode: "beginCapMode";
        end_cap_mode: "endCapMode";
        sharp_limit: "sharpLimit";
        round_precision: "roundPrecision";
    }
    /** A 2D polyline that can optionally be textured.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_line2d.html  
     */
    class Line2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Overwrites the position of the point at the given [param index] with the supplied [param position]. */
        setPointPosition(index: int64, position: Vector2): void
        
        /** Returns the position of the point at index [param index]. */
        getPointPosition(index: int64): Vector2
        
        /** Returns the number of points in the polyline. */
        getPointCount(): int64
        
        /** Adds a point with the specified [param position] relative to the polyline's own position. If no [param index] is provided, the new point will be added to the end of the points array.  
         *  If [param index] is given, the new point is inserted before the existing point identified by index [param index]. The indices of the points after the new point get increased by 1. The provided [param index] must not exceed the number of existing points in the polyline. See [method get_point_count].  
         */
        addPoint(position: Vector2, index?: int64 /* = -1 */): void
        
        /** Removes the point at index [param index] from the polyline. */
        removePoint(index: int64): void
        
        /** Removes all points from the polyline, making it empty. */
        clearPoints(): void
        
        /** The points of the polyline, interpreted in local 2D coordinates. Segments are drawn between the adjacent points in this array. */
        get points(): PackedVector2Array
        set points(value: PackedVector2Array | Vector2[])
        
        /** If `true` and the polyline has more than 2 points, the last point and the first one will be connected by a segment.  
         *      
         *  **Note:** The shape of the closing segment is not guaranteed to be seamless if a [member width_curve] is provided.  
         *      
         *  **Note:** The joint between the closing segment and the first segment is drawn first and it samples the [member gradient] and the [member width_curve] at the beginning. This is an implementation detail that might change in a future version.  
         */
        get closed(): boolean
        set closed(value: boolean)
        
        /** The polyline's width. */
        get width(): float64
        set width(value: float64)
        
        /** The polyline's width curve. The width of the polyline over its length will be equivalent to the value of the width curve over its domain. The width curve should be a unit [Curve]. */
        get widthCurve(): null | Curve
        set widthCurve(value: null | Curve)
        
        /** The color of the polyline. Will not be used if a gradient is set. */
        get defaultColor(): Color
        set defaultColor(value: Color)
        
        /** The gradient is drawn through the whole line from start to finish. The [member default_color] will not be used if this property is set. */
        get gradient(): null | Gradient
        set gradient(value: null | Gradient)
        
        /** The texture used for the polyline. Uses [member texture_mode] for drawing style. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** The style to render the [member texture] of the polyline. */
        get textureMode(): int64
        set textureMode(value: int64)
        
        /** The style of the connections between segments of the polyline. */
        get jointMode(): int64
        set jointMode(value: int64)
        
        /** The style of the beginning of the polyline, if [member closed] is `false`. */
        get beginCapMode(): int64
        set beginCapMode(value: int64)
        
        /** The style of the end of the polyline, if [member closed] is `false`. */
        get endCapMode(): int64
        set endCapMode(value: int64)
        
        /** Determines the miter limit of the polyline. Normally, when [member joint_mode] is set to [constant LINE_JOINT_SHARP], sharp angles fall back to using the logic of [constant LINE_JOINT_BEVEL] joints to prevent very long miters. Higher values of this property mean that the fallback to a bevel joint will happen at sharper angles. */
        get sharpLimit(): float64
        set sharpLimit(value: float64)
        
        /** The smoothness used for rounded joints and caps. Higher values result in smoother corners, but are more demanding to render and update. */
        get roundPrecision(): int64
        set roundPrecision(value: int64)
        
        /** If `true`, the polyline's border will be anti-aliased.  
         *      
         *  **Note:** [Line2D] is not accelerated by batching when being anti-aliased.  
         */
        get antialiased(): boolean
        set antialiased(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLine2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLine2D;
    }
    namespace Line3D {
        enum MeshAlignment {
            MeshAlignmentLocal = 0,
            MeshAlignmentBillboard = 1,
            MeshAlignmentMax = 2,
        }
        enum TilingMode {
            TilingModeStretch = 0,
            TilingModeTile = 1,
            TilingMax = 2,
        }
        enum MaterialMode {
            MaterialModeMix = 0,
            MaterialModeAdd = 1,
            MaterialModeCustom = 2,
            MaterialModeMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLine3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLine3D extends __NameMapGeometryInstance3D {
    }
    /** A node to draw 3D lines in space.  
     *      
     *  **Note:** This class currently has no functionality and only serves as a base class for [Trail3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_line3d.html  
     */
    class Line3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLine3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLine3D;
    }
    namespace LineEdit {
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
        enum ExpandMode {
            ExpandModeOriginalSize = 0,
            ExpandModeFitToText = 1,
            ExpandModeFitToLineEdit = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLineEdit extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLineEdit extends __NameMapControl {
        _set_text: "_setText";
        has_ime_text: "hasImeText";
        cancel_ime: "cancelIme";
        apply_ime: "applyIme";
        is_editing: "isEditing";
        select_all: "selectAll";
        has_undo: "hasUndo";
        has_redo: "hasRedo";
        has_selection: "hasSelection";
        get_selected_text: "getSelectedText";
        get_selection_from_column: "getSelectionFromColumn";
        get_selection_to_column: "getSelectionToColumn";
        get_next_composite_character_column: "getNextCompositeCharacterColumn";
        get_previous_composite_character_column: "getPreviousCompositeCharacterColumn";
        get_scroll_offset: "getScrollOffset";
        insert_text_at_caret: "insertTextAtCaret";
        delete_char_at_caret: "deleteCharAtCaret";
        delete_text: "deleteText";
        menu_option: "menuOption";
        get_menu: "getMenu";
        is_menu_visible: "isMenuVisible";
        placeholder_text: "placeholderText";
        max_length: "maxLength";
        keep_editing_on_text_submit: "keepEditingOnTextSubmit";
        expand_to_text_length: "expandToTextLength";
        context_menu_enabled: "contextMenuEnabled";
        emoji_menu_enabled: "emojiMenuEnabled";
        backspace_deletes_composite_character_enabled: "backspaceDeletesCompositeCharacterEnabled";
        clear_button_enabled: "clearButtonEnabled";
        shortcut_keys_enabled: "shortcutKeysEnabled";
        middle_mouse_paste_enabled: "middleMousePasteEnabled";
        selecting_enabled: "selectingEnabled";
        deselect_on_focus_loss_enabled: "deselectOnFocusLossEnabled";
        drag_and_drop_selection_enabled: "dragAndDropSelectionEnabled";
        draw_control_chars: "drawControlChars";
        select_all_on_focus: "selectAllOnFocus";
        virtual_keyboard_enabled: "virtualKeyboardEnabled";
        virtual_keyboard_show_on_focus: "virtualKeyboardShowOnFocus";
        virtual_keyboard_type: "virtualKeyboardType";
        caret_blink: "caretBlink";
        caret_blink_interval: "caretBlinkInterval";
        caret_column: "caretColumn";
        caret_force_displayed: "caretForceDisplayed";
        caret_mid_grapheme: "caretMidGrapheme";
        secret_character: "secretCharacter";
        text_direction: "textDirection";
        structured_text_bidi_override: "structuredTextBidiOverride";
        structured_text_bidi_override_options: "structuredTextBidiOverrideOptions";
        right_icon: "rightIcon";
        icon_expand_mode: "iconExpandMode";
        right_icon_scale: "rightIconScale";
        text_changed: "textChanged";
        text_change_rejected: "textChangeRejected";
        text_submitted: "textSubmitted";
        editing_toggled: "editingToggled";
    }
    /** An input field for single-line text.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lineedit.html  
     */
    class LineEdit<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        _setText(text: string, emitSignal?: boolean /* = false */): void
        
        /** Returns `true` if the user has text in the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME). */
        hasImeText(): boolean
        
        /** Closes the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME) if it is open. Any text in the IME will be lost. */
        cancelIme(): void
        
        /** Applies text from the [url=https://en.wikipedia.org/wiki/Input_method]Input Method Editor[/url] (IME) and closes the IME if it is open. */
        applyIme(): void
        
        /** Allows entering edit mode whether the [LineEdit] is focused or not. If [param hide_focus] is `true`, the focused state will not be shown (see [method Control.grab_focus]).  
         *  See also [member keep_editing_on_text_submit].  
         */
        edit(hideFocus?: boolean /* = false */): void
        
        /** Allows exiting edit mode while preserving focus. */
        unedit(): void
        
        /** Returns whether the [LineEdit] is being edited. */
        isEditing(): boolean
        
        /** Erases the [LineEdit]'s [member text]. */
        clear(): void
        
        /** Selects characters inside [LineEdit] between [param from] and [param to]. By default, [param from] is at the beginning and [param to] at the end.  
         *    
         */
        select(from?: int64 /* = 0 */, to?: int64 /* = -1 */): void
        
        /** Selects the whole [String]. */
        selectAll(): void
        
        /** Clears the current selection. */
        deselect(): void
        
        /** Returns `true` if an "undo" action is available. */
        hasUndo(): boolean
        
        /** Returns `true` if a "redo" action is available. */
        hasRedo(): boolean
        
        /** Returns `true` if the user has selected text. */
        hasSelection(): boolean
        
        /** Returns the text inside the selection. */
        getSelectedText(): string
        
        /** Returns the selection begin column. */
        getSelectionFromColumn(): int64
        
        /** Returns the selection end column. */
        getSelectionToColumn(): int64
        
        /** Returns the correct column at the end of a composite character like ❤️‍🩹 (mending heart; Unicode: `U+2764 U+FE0F U+200D U+1FA79`) which is comprised of more than one Unicode code point, if the caret is at the start of the composite character. Also returns the correct column with the caret at mid grapheme and for non-composite characters.  
         *      
         *  **Note:** To check at caret location use `get_next_composite_character_column(get_caret_column())`  
         */
        getNextCompositeCharacterColumn(column: int64): int64
        
        /** Returns the correct column at the start of a composite character like ❤️‍🩹 (mending heart; Unicode: `U+2764 U+FE0F U+200D U+1FA79`) which is comprised of more than one Unicode code point, if the caret is at the end of the composite character. Also returns the correct column with the caret at mid grapheme and for non-composite characters.  
         *      
         *  **Note:** To check at caret location use `get_previous_composite_character_column(get_caret_column())`  
         */
        getPreviousCompositeCharacterColumn(column: int64): int64
        
        /** Returns the scroll offset due to [member caret_column], as a number of characters. */
        getScrollOffset(): float64
        
        /** Inserts [param text] at the caret. If the resulting value is longer than [member max_length], nothing happens. */
        insertTextAtCaret(text: string): void
        
        /** Deletes one character at the caret's current position (equivalent to pressing [kbd]Delete[/kbd]). */
        deleteCharAtCaret(): void
        
        /** Deletes a section of the [member text] going from position [param from_column] to [param to_column]. Both parameters should be within the text's length. */
        deleteText(fromColumn: int64, toColumn: int64): void
        
        /** Executes a given action as defined in the [enum MenuItems] enum. */
        menuOption(option: int64): void
        
        /** Returns the [PopupMenu] of this [LineEdit]. By default, this menu is displayed when right-clicking on the [LineEdit].  
         *  You can add custom menu items or remove standard ones. Make sure your IDs don't conflict with the standard ones (see [enum MenuItems]). For example:  
         *    
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getMenu(): null | PopupMenu
        
        /** Returns whether the menu is visible. Use this instead of `get_menu().visible` to improve performance (so the creation of the menu is avoided). */
        isMenuVisible(): boolean
        
        /** String value of the [LineEdit].  
         *      
         *  **Note:** Changing text using this property won't emit the [signal text_changed] signal.  
         */
        get text(): string
        set text(value: string)
        
        /** Text shown when the [LineEdit] is empty. It is **not** the [LineEdit]'s default value (see [member text]). */
        get placeholderText(): string
        set placeholderText(value: string)
        
        /** The text's horizontal alignment. */
        get alignment(): int64
        set alignment(value: int64)
        
        /** Maximum number of characters that can be entered inside the [LineEdit]. If `0`, there is no limit.  
         *  When a limit is defined, characters that would exceed [member max_length] are truncated. This happens both for existing [member text] contents when setting the max length, or for new text inserted in the [LineEdit], including pasting.  
         *  If any input text is truncated, the [signal text_change_rejected] signal is emitted with the truncated substring as a parameter:  
         *    
         */
        get maxLength(): int64
        set maxLength(value: int64)
        
        /** If `false`, existing text cannot be modified and new text cannot be added. */
        get editable(): boolean
        set editable(value: boolean)
        
        /** If `true`, the [LineEdit] will not exit edit mode when text is submitted by pressing `ui_text_submit` action (by default: [kbd]Enter[/kbd] or [kbd]Kp Enter[/kbd]). */
        get keepEditingOnTextSubmit(): boolean
        set keepEditingOnTextSubmit(value: boolean)
        
        /** If `true`, the [LineEdit] width will increase to stay longer than the [member text]. It will **not** compress if the [member text] is shortened. */
        get expandToTextLength(): boolean
        set expandToTextLength(value: boolean)
        
        /** If `true`, the context menu will appear when right-clicked. */
        get contextMenuEnabled(): boolean
        set contextMenuEnabled(value: boolean)
        
        /** If `true`, "Emoji and Symbols" menu is enabled. */
        get emojiMenuEnabled(): boolean
        set emojiMenuEnabled(value: boolean)
        
        /** If `true` and [member caret_mid_grapheme] is `false`, backspace deletes an entire composite character such as ❤️‍🩹, instead of deleting part of the composite character. */
        get backspaceDeletesCompositeCharacterEnabled(): boolean
        set backspaceDeletesCompositeCharacterEnabled(value: boolean)
        
        /** If `true`, the [LineEdit] will show a clear button if [member text] is not empty, which can be used to clear the text quickly. */
        get clearButtonEnabled(): boolean
        set clearButtonEnabled(value: boolean)
        
        /** If `true`, shortcut keys for context menu items are enabled, even if the context menu is disabled. */
        get shortcutKeysEnabled(): boolean
        set shortcutKeysEnabled(value: boolean)
        
        /** If `false`, using middle mouse button to paste clipboard will be disabled.  
         *      
         *  **Note:** This method is only implemented on Linux.  
         */
        get middleMousePasteEnabled(): boolean
        set middleMousePasteEnabled(value: boolean)
        
        /** If `false`, it's impossible to select the text using mouse nor keyboard. */
        get selectingEnabled(): boolean
        set selectingEnabled(value: boolean)
        
        /** If `true`, the selected text will be deselected when focus is lost. */
        get deselectOnFocusLossEnabled(): boolean
        set deselectOnFocusLossEnabled(value: boolean)
        
        /** If `true`, allow drag and drop of selected text. */
        get dragAndDropSelectionEnabled(): boolean
        set dragAndDropSelectionEnabled(value: boolean)
        
        /** If `true`, the [LineEdit] doesn't display decoration. */
        get flat(): boolean
        set flat(value: boolean)
        
        /** If `true`, control characters are displayed. */
        get drawControlChars(): boolean
        set drawControlChars(value: boolean)
        
        /** If `true`, the [LineEdit] will select the whole text when it gains focus. */
        get selectAllOnFocus(): boolean
        set selectAllOnFocus(value: boolean)
        
        /** If `true`, the native virtual keyboard is enabled on platforms that support it. */
        get virtualKeyboardEnabled(): boolean
        set virtualKeyboardEnabled(value: boolean)
        
        /** If `true`, the native virtual keyboard is shown on focus events on platforms that support it. */
        get virtualKeyboardShowOnFocus(): boolean
        set virtualKeyboardShowOnFocus(value: boolean)
        
        /** Specifies the type of virtual keyboard to show. */
        get virtualKeyboardType(): int64
        set virtualKeyboardType(value: int64)
        
        /** If `true`, makes the caret blink. */
        get caretBlink(): boolean
        set caretBlink(value: boolean)
        
        /** The interval at which the caret blinks (in seconds). */
        get caretBlinkInterval(): float64
        set caretBlinkInterval(value: float64)
        
        /** The caret's column position inside the [LineEdit]. When set, the text may scroll to accommodate it. */
        get caretColumn(): int64
        set caretColumn(value: int64)
        
        /** If `true`, the [LineEdit] will always show the caret, even if not editing or focus is lost. */
        get caretForceDisplayed(): boolean
        set caretForceDisplayed(value: boolean)
        
        /** Allow moving caret, selecting and removing the individual composite character components.  
         *      
         *  **Note:** [kbd]Backspace[/kbd] is always removing individual composite character components.  
         */
        get caretMidGrapheme(): boolean
        set caretMidGrapheme(value: boolean)
        
        /** If `true`, every character is replaced with the secret character (see [member secret_character]). */
        get secret(): boolean
        set secret(value: boolean)
        
        /** The character to use to mask secret input. Only a single character can be used as the secret character. If it is longer than one character, only the first one will be used. If it is empty, a space will be used instead. */
        get secretCharacter(): string
        set secretCharacter(value: string)
        
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
        
        /** Sets the icon that will appear in the right end of the [LineEdit] if there's no [member text], or always, if [member clear_button_enabled] is set to `false`. */
        get rightIcon(): null | Texture2D
        set rightIcon(value: null | Texture2D)
        
        /** Define the scaling behavior of the [member right_icon]. */
        get iconExpandMode(): int64
        set iconExpandMode(value: int64)
        
        /** Scale ratio of the icon when [member icon_expand_mode] is set to [constant EXPAND_MODE_FIT_TO_LINE_EDIT]. */
        get rightIconScale(): float64
        set rightIconScale(value: float64)
        
        /** Emitted when the text changes. */
        readonly textChanged: Signal<(newText: string) => void>
        
        /** Emitted when appending text that overflows the [member max_length]. The appended text is truncated to fit [member max_length], and the part that couldn't fit is passed as the [param rejected_substring] argument. */
        readonly textChangeRejected: Signal<(rejectedSubstring: string) => void>
        
        /** Emitted when the user presses the `ui_text_submit` action (by default: [kbd]Enter[/kbd] or [kbd]Kp Enter[/kbd]) while the [LineEdit] has focus. */
        readonly textSubmitted: Signal<(newText: string) => void>
        
        /** Emitted when the [LineEdit] switches in or out of edit mode. */
        readonly editingToggled: Signal<(toggledOn: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLineEdit;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLineEdit;
    }
    namespace LinkButton {
        enum UnderlineMode {
            UnderlineModeAlways = 0,
            UnderlineModeOnHover = 1,
            UnderlineModeNever = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLinkButton extends __RPCMapBaseButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLinkButton extends __NameMapBaseButton {
        text_overrun_behavior: "textOverrunBehavior";
        ellipsis_char: "ellipsisChar";
        text_direction: "textDirection";
        structured_text_bidi_override: "structuredTextBidiOverride";
        structured_text_bidi_override_options: "structuredTextBidiOverrideOptions";
    }
    /** A button that represents a link.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_linkbutton.html  
     */
    class LinkButton<Map extends NodePathMap = any> extends BaseButton<Map> {
        constructor(identifier?: any)
        /** The button's text that will be displayed inside the button's area. */
        get text(): string
        set text(value: string)
        
        /** The underline mode to use for the text. */
        get underline(): int64
        set underline(value: int64)
        
        /** The [url=https://en.wikipedia.org/wiki/Uniform_Resource_Identifier]URI[/url] for this [LinkButton]. If set to a valid URI, pressing the button opens the URI using the operating system's default program for the protocol (via [method OS.shell_open]). HTTP and HTTPS URLs open the default web browser.  
         *    
         */
        get uri(): string
        set uri(value: string)
        
        /** Sets the clipping behavior when the text exceeds the node's bounding rectangle. */
        get textOverrunBehavior(): int64
        set textOverrunBehavior(value: int64)
        
        /** Ellipsis character used for text clipping. */
        get ellipsisChar(): string
        set ellipsisChar(value: string)
        
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
        __godotRPCMap: __RPCMapLinkButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLinkButton;
    }
    namespace Logger {
        enum ErrorType {
            ErrorTypeError = 0,
            ErrorTypeWarning = 1,
            ErrorTypeScript = 2,
            ErrorTypeShader = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLogger extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLogger extends __NameMapRefCounted {
        _log_error: "_logError";
        _log_message: "_logMessage";
    }
    /** Custom logger to receive messages from the internal error/warning stream.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_logger.html  
     */
    class Logger extends RefCounted {
        constructor(identifier?: any)
        /** Called when an error is logged. The error provides the [param function], [param file], and [param line] that it originated from, as well as either the [param code] that generated the error or a [param rationale].  
         *  The type of error provided by [param error_type] is described in the [enum ErrorType] enumeration.  
         *  Additionally, [param script_backtraces] provides backtraces for each of the script languages. These will only contain stack frames in editor builds and debug builds by default. To enable them for release builds as well, you need to enable [member ProjectSettings.debug/settings/gdscript/always_track_call_stacks].  
         *  **Warning:** This method will be called from threads other than the main thread, possibly at the same time, so you will need to have some kind of thread-safety in your implementation of it, like a [Mutex].  
         *      
         *  **Note:** [param script_backtraces] will not contain any captured variables, due to its prohibitively high cost. To get those, you will need to capture the backtraces yourself, from within the [Logger] virtual methods, using [method Engine.capture_script_backtraces].  
         *      
         *  **Note:** Logging errors from this method using functions like [method @GlobalScope.push_error] or [method @GlobalScope.push_warning] is not supported, as it could cause infinite recursion. These errors will only show up in the console output.  
         */
        /* gdvirtual */ _logError(function_: string, file: string, line: int64, code: string, rationale: string, editorNotify: boolean, errorType: int64, scriptBacktraces: GArray<ScriptBacktrace>): void
        
        /** Called when a message is logged. If [param error] is `true`, then this message was meant to be sent to `stderr`.  
         *  **Warning:** This method will be called from threads other than the main thread, possibly at the same time, so you will need to have some kind of thread-safety in your implementation of it, like a [Mutex].  
         *      
         *  **Note:** Logging another message from this method using functions like [method @GlobalScope.print] is not supported, as it could cause infinite recursion. These messages will only show up in the console output.  
         */
        /* gdvirtual */ _logMessage(message: string, error: boolean): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLogger;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLogger;
    }
    namespace LookAtModifier3D {
        enum OriginFrom {
            OriginFromSelf = 0,
            OriginFromSpecificBone = 1,
            OriginFromExternalNode = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapLookAtModifier3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapLookAtModifier3D extends __NameMapSkeletonModifier3D {
        get_interpolation_remaining: "getInterpolationRemaining";
        is_interpolating: "isInterpolating";
        is_target_within_limitation: "isTargetWithinLimitation";
        target_node: "targetNode";
        bone_name: "boneName";
        forward_axis: "forwardAxis";
        primary_rotation_axis: "primaryRotationAxis";
        use_secondary_rotation: "useSecondaryRotation";
        origin_from: "originFrom";
        origin_bone_name: "originBoneName";
        origin_bone: "originBone";
        origin_external_node: "originExternalNode";
        origin_offset: "originOffset";
        origin_safe_margin: "originSafeMargin";
        transition_type: "transitionType";
        ease_type: "easeType";
        use_angle_limitation: "useAngleLimitation";
        use_rest_for_limitation: "useRestForLimitation";
        symmetry_limitation: "symmetryLimitation";
        primary_limit_angle: "primaryLimitAngle";
        primary_damp_threshold: "primaryDampThreshold";
        primary_positive_limit_angle: "primaryPositiveLimitAngle";
        primary_positive_damp_threshold: "primaryPositiveDampThreshold";
        primary_negative_limit_angle: "primaryNegativeLimitAngle";
        primary_negative_damp_threshold: "primaryNegativeDampThreshold";
        secondary_limit_angle: "secondaryLimitAngle";
        secondary_damp_threshold: "secondaryDampThreshold";
        secondary_positive_limit_angle: "secondaryPositiveLimitAngle";
        secondary_positive_damp_threshold: "secondaryPositiveDampThreshold";
        secondary_negative_limit_angle: "secondaryNegativeLimitAngle";
        secondary_negative_damp_threshold: "secondaryNegativeDampThreshold";
    }
    /** The [LookAtModifier3D] rotates a bone to look at a target.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_lookatmodifier3d.html  
     */
    class LookAtModifier3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Returns the remaining seconds of the time-based interpolation. */
        getInterpolationRemaining(): float64
        
        /** Returns `true` if time-based interpolation is running. If `false`, it is equivalent to [method get_interpolation_remaining] returning `0.0`.  
         *  This is useful to determine whether a [LookAtModifier3D] can be removed safely.  
         */
        isInterpolating(): boolean
        
        /** Returns whether the target is within the angle limitations. It is useful for unsetting the [member target_node] when the target is outside of the angle limitations.  
         *      
         *  **Note:** The value is updated after [method SkeletonModifier3D._process_modification]. To retrieve this value correctly, we recommend using the signal [signal SkeletonModifier3D.modification_processed].  
         */
        isTargetWithinLimitation(): boolean
        
        /** The [NodePath] to the node that is the target for the look at modification. This node is what the modification will rotate the bone to. */
        get targetNode(): NodePath
        set targetNode(value: NodePath | string)
        
        /** The bone name of the [Skeleton3D] that the modification will operate on. */
        get boneName(): string
        set boneName(value: string)
        
        /** Index of the [member bone_name] in the parent [Skeleton3D]. */
        get bone(): int64
        set bone(value: int64)
        
        /** The forward axis of the bone. This [SkeletonModifier3D] modifies the bone so that this axis points toward the [member target_node]. */
        get forwardAxis(): int64
        set forwardAxis(value: int64)
        
        /** The axis of the first rotation. This [SkeletonModifier3D] works by compositing the rotation by Euler angles to prevent to rotate the [member forward_axis].  
         *      
         *  **Note:** Since [LookAtModifier3D] never modifies the twist when [member use_secondary_rotation] is `false` and [member relative] is `true`, the twist is not fixed even if [member use_rest_for_limitation] is `true`.  
         */
        get primaryRotationAxis(): int64
        set primaryRotationAxis(value: int64)
        
        /** If `true`, provides rotation by two axes. */
        get useSecondaryRotation(): boolean
        set useSecondaryRotation(value: boolean)
        
        /** The relative option. If `true`, the rotation is applied relative to the pose. If `false`, the rotation is applied relative to the rest. It means to replace the current pose with the [LookAtModifier3D]'s result. */
        get relative(): boolean
        set relative(value: boolean)
        
        /** This value determines from what origin is retrieved for use in the calculation of the forward vector. */
        get originFrom(): int64
        set originFrom(value: int64)
        
        /** If [member origin_from] is [constant ORIGIN_FROM_SPECIFIC_BONE], the bone global pose position specified for this is used as origin. */
        get originBoneName(): string
        set originBoneName(value: string)
        
        /** Index of the [member origin_bone_name] in the parent [Skeleton3D]. */
        get originBone(): int64
        set originBone(value: int64)
        
        /** If [member origin_from] is [constant ORIGIN_FROM_EXTERNAL_NODE], the global position of the [Node3D] specified for this is used as origin. */
        get originExternalNode(): NodePath
        set originExternalNode(value: NodePath | string)
        
        /** The offset of the bone pose origin. Matching the origins by offset is useful for cases where multiple bones must always face the same direction, such as the eyes.  
         *      
         *  **Note:** This value indicates the local position of the object set in [member origin_from].  
         */
        get originOffset(): Vector3
        set originOffset(value: Vector3)
        
        /** If the target passes through too close to the origin than this value, time-based interpolation is used even if the target is within the angular limitations, to prevent the angular velocity from becoming too high. */
        get originSafeMargin(): float64
        set originSafeMargin(value: float64)
        
        /** The duration of the time-based interpolation. Interpolation is triggered at the following cases:  
         *  - When the target node is changed  
         *  - When an axis is flipped due to angle limitation  
         *      
         *  **Note:** The flipping occurs when the target is outside the angle limitation and the internally computed secondary rotation axis of the forward vector is flipped. Visually, it occurs when the target is outside the angle limitation and crosses the plane of the [member forward_axis] and [member primary_rotation_axis].  
         */
        get duration(): float64
        set duration(value: float64)
        
        /** The transition type of the time-based interpolation. See also [enum Tween.TransitionType]. */
        get transitionType(): int64
        set transitionType(value: int64)
        
        /** The ease type of the time-based interpolation. See also [enum Tween.EaseType]. */
        get easeType(): int64
        set easeType(value: int64)
        
        /** If `true`, limits the amount of rotation. For example, this helps to prevent a character's neck from rotating 360 degrees.  
         *      
         *  **Note:** As with [AnimationTree] blending, interpolation is provided that favors [method Skeleton3D.get_bone_rest] or [method Skeleton3D.get_bone_pose] depends on the [member relative] option. This means that interpolation does not select the shortest path in some cases.  
         *      
         *  **Note:** Some values for [member transition_type] (such as [constant Tween.TRANS_BACK], [constant Tween.TRANS_ELASTIC], and [constant Tween.TRANS_SPRING]) may exceed the limitations. If interpolation occurs while overshooting the limitations, the result might not respect the bone rest.  
         */
        get useAngleLimitation(): boolean
        set useAngleLimitation(value: boolean)
        
        /** If `true`, the angle limitation and the rotation axes are applied based on the [method Skeleton3D.get_bone_rest].  
         *  If `false`, the angle limitation is applied based on the reference pose. In here, the reference pose is the bone pose immediately before processing this modifier.  
         *      
         *  **Note:** The limitation is applied to the rotation computed by this modifier. If the reference pose is rotated around the same axis, the limitation behaves as if it also limits the rotation of the reference pose. A rotation that this modifier does not change, such as the twist, is not limited.  
         */
        get useRestForLimitation(): boolean
        set useRestForLimitation(value: boolean)
        
        /** If `true`, the limitations are spread from the bone symmetrically.  
         *  If `false`, the limitation can be specified separately for each side of the reference pose. In here, the reference pose is the bone pose immediately before processing this modifier.  
         */
        get symmetryLimitation(): boolean
        set symmetryLimitation(value: boolean)
        
        /** The limit angle of the primary rotation when [member symmetry_limitation] is `true`, in radians. */
        get primaryLimitAngle(): float64
        set primaryLimitAngle(value: float64)
        
        /** The threshold to start damping for [member primary_limit_angle]. It provides non-linear (b-spline) interpolation, let it feel more resistance the more it rotate to the edge limit. This is useful for simulating the limits of human motion.  
         *  If `1.0`, no damping is performed. If `0.0`, damping is always performed.  
         */
        get primaryDampThreshold(): float64
        set primaryDampThreshold(value: float64)
        
        /** The limit angle of positive side of the primary rotation when [member symmetry_limitation] is `false`, in radians. */
        get primaryPositiveLimitAngle(): float64
        set primaryPositiveLimitAngle(value: float64)
        
        /** The threshold to start damping for [member primary_positive_limit_angle]. */
        get primaryPositiveDampThreshold(): float64
        set primaryPositiveDampThreshold(value: float64)
        
        /** The limit angle of negative side of the primary rotation when [member symmetry_limitation] is `false`, in radians. */
        get primaryNegativeLimitAngle(): float64
        set primaryNegativeLimitAngle(value: float64)
        
        /** The threshold to start damping for [member primary_negative_limit_angle]. */
        get primaryNegativeDampThreshold(): float64
        set primaryNegativeDampThreshold(value: float64)
        
        /** The limit angle of the secondary rotation when [member symmetry_limitation] is `true`, in radians. */
        get secondaryLimitAngle(): float64
        set secondaryLimitAngle(value: float64)
        
        /** The threshold to start damping for [member secondary_limit_angle]. */
        get secondaryDampThreshold(): float64
        set secondaryDampThreshold(value: float64)
        
        /** The limit angle of positive side of the secondary rotation when [member symmetry_limitation] is `false`, in radians. */
        get secondaryPositiveLimitAngle(): float64
        set secondaryPositiveLimitAngle(value: float64)
        
        /** The threshold to start damping for [member secondary_positive_limit_angle]. */
        get secondaryPositiveDampThreshold(): float64
        set secondaryPositiveDampThreshold(value: float64)
        
        /** The limit angle of negative side of the secondary rotation when [member symmetry_limitation] is `false`, in radians. */
        get secondaryNegativeLimitAngle(): float64
        set secondaryNegativeLimitAngle(value: float64)
        
        /** The threshold to start damping for [member secondary_negative_limit_angle]. */
        get secondaryNegativeDampThreshold(): float64
        set secondaryNegativeDampThreshold(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapLookAtModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapLookAtModifier3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMainLoop extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMainLoop extends __NameMapGObject {
        _physics_process: "_physicsProcess";
        on_request_permissions_result: "onRequestPermissionsResult";
    }
    /** Abstract base class for the game's main loop.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_mainloop.html  
     */
    class MainLoop extends GObject {
        /** Notification received from the OS when the application is exceeding its allocated memory.  
         *  Specific to the iOS platform.  
         */
        static readonly NOTIFICATION_OS_MEMORY_WARNING = 2009
        
        /** Notification received when translations may have changed. Can be triggered by the user changing the locale. Can be used to respond to language changes, for example to change the UI strings on the fly. Useful when working with the built-in translation support, like [method Object.tr]. */
        static readonly NOTIFICATION_TRANSLATION_CHANGED = 2010
        
        /** Notification received from the OS when a request for "About" information is sent.  
         *  Specific to the macOS platform.  
         */
        static readonly NOTIFICATION_WM_ABOUT = 2011
        
        /** Notification received from Godot's crash handler when the engine is about to crash.  
         *  Implemented on desktop platforms if the crash handler is enabled.  
         */
        static readonly NOTIFICATION_CRASH = 2012
        
        /** Notification received from the OS when an update of the Input Method Engine occurs (e.g. change of IME cursor position or composition string).  
         *  Implemented on desktop and web platforms.  
         */
        static readonly NOTIFICATION_OS_IME_UPDATE = 2013
        
        /** Notification received from the OS when the application is resumed.  
         *  Specific to the Android and iOS platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_RESUMED = 2014
        
        /** Notification received from the OS when the application is paused.  
         *  Specific to the Android and iOS platforms.  
         *      
         *  **Note:** On iOS, you only have approximately 5 seconds to finish a task started by this signal. If you go over this allotment, iOS will kill the app instead of pausing it.  
         */
        static readonly NOTIFICATION_APPLICATION_PAUSED = 2015
        
        /** Notification received from the OS when the application is focused, i.e. when changing the focus from the OS desktop or a thirdparty application to any open window of the Godot instance.  
         *  Implemented on desktop and mobile platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_FOCUS_IN = 2016
        
        /** Notification received from the OS when the application is defocused, i.e. when changing the focus from any open window of the Godot instance to the OS desktop or a thirdparty application.  
         *  Implemented on desktop and mobile platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_FOCUS_OUT = 2017
        
        /** Notification received when text server is changed. */
        static readonly NOTIFICATION_TEXT_SERVER_CHANGED = 2018
        
        /** Notification received when the application enters picture-in-picture mode. */
        static readonly NOTIFICATION_APPLICATION_PIP_MODE_ENTERED = 2019
        
        /** Notification received when the application exits picture-in-picture mode. */
        static readonly NOTIFICATION_APPLICATION_PIP_MODE_EXITED = 2020
        constructor(identifier?: any)
        
        /** Called once during initialization. */
        /* gdvirtual */ _initialize(): void
        
        /** Called each physics tick. [param delta] is the logical time between physics ticks in seconds and is equal to [member Engine.time_scale] / [member Engine.physics_ticks_per_second]. Equivalent to [method Node._physics_process].  
         *  If implemented, the method must return a boolean value. `true` ends the main loop, while `false` lets it proceed to the next step.  
         *      
         *  **Note:** [method _physics_process] may be called up to [member Engine.max_physics_steps_per_frame] times per (idle) frame. This step limit may be reached when the engine is suffering performance issues.  
         *      
         *  **Note:** Accumulated [param delta] may diverge from real world seconds.  
         */
        /* gdvirtual */ _physicsProcess(delta: float64): boolean
        
        /** Called on each idle frame, prior to rendering, and after physics ticks have been processed. [param delta] is the time between frames in seconds. Equivalent to [method Node._process].  
         *  If implemented, the method must return a boolean value. `true` ends the main loop, while `false` lets it proceed to the next frame.  
         *      
         *  **Note:** When the engine is struggling and the frame rate is lowered, [param delta] will increase. When [param delta] is increased, it's capped at a maximum of [member Engine.time_scale] * [member Engine.max_physics_steps_per_frame] / [member Engine.physics_ticks_per_second]. As a result, accumulated [param delta] may not represent real world time.  
         *      
         *  **Note:** When `--fixed-fps` is enabled or the engine is running in Movie Maker mode (see [MovieWriter]), process [param delta] will always be the same for every frame, regardless of how much time the frame took to render.  
         *      
         *  **Note:** Frame delta may be post-processed by [member OS.delta_smoothing] if this is enabled for the project.  
         */
        /* gdvirtual */ _process(delta: float64): boolean
        
        /** Called before the program exits. */
        /* gdvirtual */ _finalize(): void
        
        /** Emitted when a user responds to a permission request. */
        readonly onRequestPermissionsResult: Signal<(permission: string, granted: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMainLoop;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMainLoop;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMarginContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMarginContainer extends __NameMapContainer {
    }
    /** A container that keeps a margin around its child controls.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_margincontainer.html  
     */
    class MarginContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMarginContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMarginContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMarker2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMarker2D extends __NameMapNode2D {
        gizmo_extents: "gizmoExtents";
    }
    /** Generic 2D position hint for editing.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_marker2d.html  
     */
    class Marker2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Size of the gizmo cross that appears in the editor. */
        get gizmoExtents(): float64
        set gizmoExtents(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMarker2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMarker2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMarker3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMarker3D extends __NameMapNode3D {
        gizmo_extents: "gizmoExtents";
    }
    /** Generic 3D position hint for editing.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_marker3d.html  
     */
    class Marker3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Size of the gizmo cross that appears in the editor. */
        get gizmoExtents(): float64
        set gizmoExtents(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMarker3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMarker3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMaterial extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMaterial extends __NameMapResource {
        _get_shader_rid: "_getShaderRid";
        _get_shader_mode: "_getShaderMode";
        _can_do_next_pass: "_canDoNextPass";
        _can_use_render_priority: "_canUseRenderPriority";
        inspect_native_shader_code: "inspectNativeShaderCode";
        create_placeholder: "createPlaceholder";
        render_priority: "renderPriority";
        next_pass: "nextPass";
    }
    /** Virtual base class for applying visual properties to an object, such as color and roughness.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_material.html  
     */
    class Material extends Resource {
        /** Maximum value for the [member render_priority] parameter. */
        static readonly RENDER_PRIORITY_MAX = 127
        
        /** Minimum value for the [member render_priority] parameter. */
        static readonly RENDER_PRIORITY_MIN = -128
        constructor(identifier?: any)
        
        /** Only exposed for the purpose of overriding. You cannot call this function directly. Used internally by various editor tools. Used to access the RID of the [Material]'s [Shader]. */
        /* gdvirtual */ _getShaderRid(): Rid
        
        /** Only exposed for the purpose of overriding. You cannot call this function directly. Used internally by various editor tools. */
        /* gdvirtual */ _getShaderMode(): Shader.Mode
        
        /** Only exposed for the purpose of overriding. You cannot call this function directly. Used internally to determine if [member next_pass] should be shown in the editor or not. */
        /* gdvirtual */ _canDoNextPass(): boolean
        
        /** Only exposed for the purpose of overriding. You cannot call this function directly. Used internally to determine if [member render_priority] should be shown in the editor or not. */
        /* gdvirtual */ _canUseRenderPriority(): boolean
        
        /** Only available when running in the editor. Opens a popup that visualizes the generated shader code, including all variants and internal shader code. See also [method Shader.inspect_native_shader_code]. */
        inspectNativeShaderCode(): void
        
        /** Creates a placeholder version of this resource ([PlaceholderMaterial]). */
        createPlaceholder(): Resource
        
        /** Sets the render priority for objects in 3D scenes. Higher priority objects will be sorted in front of lower priority objects. In other words, all objects with [member render_priority] `1` will render on top of all objects with [member render_priority] `0`.  
         *      
         *  **Note:** This only applies to [StandardMaterial3D]s and [ShaderMaterial]s with type "Spatial".  
         *      
         *  **Note:** This will not impact how transparent objects are sorted relative to opaque objects or how dynamic meshes will be sorted relative to other opaque meshes. This is because all transparent objects are drawn after all opaque objects and all dynamic opaque meshes are drawn before other opaque meshes.  
         */
        get renderPriority(): int64
        set renderPriority(value: int64)
        
        /** Sets the [Material] to be used for the next pass. This renders the object again using a different material.  
         *      
         *  **Note:** [member next_pass] materials are not necessarily drawn immediately after the source [Material]. Draw order is determined by material properties, [member render_priority], and distance to camera.  
         *      
         *  **Note:** This only applies to [StandardMaterial3D]s and [ShaderMaterial]s with type "Spatial".  
         */
        get nextPass(): null | Material
        set nextPass(value: null | Material)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMenuBar extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMenuBar extends __NameMapControl {
        set_disable_shortcuts: "setDisableShortcuts";
        is_native_menu: "isNativeMenu";
        get_menu_count: "getMenuCount";
        set_menu_title: "setMenuTitle";
        get_menu_title: "getMenuTitle";
        set_menu_tooltip: "setMenuTooltip";
        get_menu_tooltip: "getMenuTooltip";
        set_menu_disabled: "setMenuDisabled";
        is_menu_disabled: "isMenuDisabled";
        set_menu_hidden: "setMenuHidden";
        is_menu_hidden: "isMenuHidden";
        get_menu_popup: "getMenuPopup";
        start_index: "startIndex";
        switch_on_hover: "switchOnHover";
        prefer_global_menu: "preferGlobalMenu";
        text_direction: "textDirection";
    }
    /** A horizontal menu bar that creates a menu for each [PopupMenu] child.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_menubar.html  
     */
    class MenuBar<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** If `true`, shortcuts are disabled and cannot be used to trigger the button. */
        setDisableShortcuts(disabled: boolean): void
        
        /** Returns `true` if the current system's global menu is supported and used by this [MenuBar]. */
        isNativeMenu(): boolean
        
        /** Returns number of menu items. */
        getMenuCount(): int64
        
        /** Sets menu item title. */
        setMenuTitle(menu: int64, title: string): void
        
        /** Returns menu item title. */
        getMenuTitle(menu: int64): string
        
        /** Sets menu item tooltip. */
        setMenuTooltip(menu: int64, tooltip: string): void
        
        /** Returns menu item tooltip. */
        getMenuTooltip(menu: int64): string
        
        /** If `true`, menu item is disabled. */
        setMenuDisabled(menu: int64, disabled: boolean): void
        
        /** Returns `true` if the menu item is disabled. */
        isMenuDisabled(menu: int64): boolean
        
        /** If `true`, menu item is hidden. */
        setMenuHidden(menu: int64, hidden: boolean): void
        
        /** Returns `true` if the menu item is hidden. */
        isMenuHidden(menu: int64): boolean
        
        /** Returns [PopupMenu] associated with menu item. */
        getMenuPopup(menu: int64): null | PopupMenu
        
        /** Flat [MenuBar] don't display item decoration. */
        get flat(): boolean
        set flat(value: boolean)
        
        /** Position order in the global menu to insert [MenuBar] items at. All menu items in the [MenuBar] are always inserted as a continuous range. Menus with lower [member start_index] are inserted first. Menus with [member start_index] equal to `-1` are inserted last. */
        get startIndex(): int64
        set startIndex(value: int64)
        
        /** If `true`, when the cursor hovers above menu item, it will close the current [PopupMenu] and open the other one. */
        get switchOnHover(): boolean
        set switchOnHover(value: boolean)
        
        /** If `true`, [MenuBar] will use system global menu when supported.  
         *      
         *  **Note:** If `true` and global menu is supported, this node is not displayed, has zero size, and all its child nodes except [PopupMenu]s are inaccessible.  
         *      
         *  **Note:** This property overrides the value of the [member PopupMenu.prefer_native_menu] property of the child nodes.  
         */
        get preferGlobalMenu(): boolean
        set preferGlobalMenu(value: boolean)
        
        /** Base text writing direction. */
        get textDirection(): int64
        set textDirection(value: int64)
        
        /** Language code used for line-breaking and text shaping algorithms. If left empty, the current locale is used instead. */
        get language(): string
        set language(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMenuBar;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMenuBar;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMenuButton extends __RPCMapButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMenuButton extends __NameMapButton {
        get_popup: "getPopup";
        show_popup: "showPopup";
        set_disable_shortcuts: "setDisableShortcuts";
        switch_on_hover: "switchOnHover";
        item_count: "itemCount";
        about_to_popup: "aboutToPopup";
    }
    /** A button that brings up a [PopupMenu] when clicked.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_menubutton.html  
     */
    class MenuButton<Map extends NodePathMap = any> extends Button<Map> {
        constructor(identifier?: any)
        /** Returns the [PopupMenu] contained in this button.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getPopup(): null | PopupMenu
        
        /** Adjusts popup position and sizing for the [MenuButton], then shows the [PopupMenu]. Prefer this over using `get_popup().popup()`. */
        showPopup(): void
        
        /** If `true`, shortcuts are disabled and cannot be used to trigger the button. */
        setDisableShortcuts(disabled: boolean): void
        
        /** If `true`, when the cursor hovers above another [MenuButton] within the same parent which also has [member switch_on_hover] enabled, it will close the current [MenuButton] and open the other one. */
        get switchOnHover(): boolean
        set switchOnHover(value: boolean)
        
        /** The number of items currently in the list. */
        get itemCount(): int64
        set itemCount(value: int64)
        
        /** Emitted when the [PopupMenu] of this MenuButton is about to show. */
        readonly aboutToPopup: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMenuButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMenuButton;
    }
    namespace Mesh {
        enum PrimitiveType {
            PrimitivePoints = 0,
            PrimitiveLines = 1,
            PrimitiveLineStrip = 2,
            PrimitiveTriangles = 3,
            PrimitiveTriangleStrip = 4,
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
        }
        enum BlendShapeMode {
            BlendShapeModeNormalized = 0,
            BlendShapeModeRelative = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMesh extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMesh extends __NameMapResource {
        _get_surface_count: "_getSurfaceCount";
        _surface_get_array_len: "_surfaceGetArrayLen";
        _surface_get_array_index_len: "_surfaceGetArrayIndexLen";
        _surface_get_arrays: "_surfaceGetArrays";
        _surface_get_blend_shape_arrays: "_surfaceGetBlendShapeArrays";
        _surface_get_lods: "_surfaceGetLods";
        _surface_get_format: "_surfaceGetFormat";
        _surface_get_primitive_type: "_surfaceGetPrimitiveType";
        _surface_set_material: "_surfaceSetMaterial";
        _surface_get_material: "_surfaceGetMaterial";
        _get_blend_shape_count: "_getBlendShapeCount";
        _get_blend_shape_name: "_getBlendShapeName";
        _set_blend_shape_name: "_setBlendShapeName";
        _get_aabb: "_getAabb";
        get_aabb: "getAabb";
        get_faces: "getFaces";
        get_surface_count: "getSurfaceCount";
        surface_get_arrays: "surfaceGetArrays";
        surface_get_blend_shape_arrays: "surfaceGetBlendShapeArrays";
        surface_set_material: "surfaceSetMaterial";
        surface_get_material: "surfaceGetMaterial";
        create_placeholder: "createPlaceholder";
        create_outline: "createOutline";
        generate_triangle_mesh: "generateTriangleMesh";
        create_trimesh_shape: "createTrimeshShape";
        create_convex_shape: "createConvexShape";
        lightmap_size_hint: "lightmapSizeHint";
    }
    /** A [Resource] that contains vertex array-based geometry.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_mesh.html  
     */
    class Mesh extends Resource {
        constructor(identifier?: any)
        /** Virtual method to override the surface count for a custom class extending [Mesh]. */
        /* gdvirtual */ _getSurfaceCount(): int64
        
        /** Virtual method to override the surface array length for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetArrayLen(index: int64): int64
        
        /** Virtual method to override the surface array index length for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetArrayIndexLen(index: int64): int64
        
        /** Virtual method to override the surface arrays for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetArrays(index: int64): GArray
        
        /** Virtual method to override the blend shape arrays for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetBlendShapeArrays(index: int64): GArray<GArray>
        
        /** Virtual method to override the surface LODs for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetLods(index: int64): GDictionary
        
        /** Virtual method to override the surface format for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetFormat(index: int64): int64
        
        /** Virtual method to override the surface primitive type for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetPrimitiveType(index: int64): int64
        
        /** Virtual method to override the setting of a [param material] at the given [param index] for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceSetMaterial(index: int64, material: Material): void
        
        /** Virtual method to override the surface material for a custom class extending [Mesh]. */
        /* gdvirtual */ _surfaceGetMaterial(index: int64): null | Material
        
        /** Virtual method to override the number of blend shapes for a custom class extending [Mesh]. */
        /* gdvirtual */ _getBlendShapeCount(): int64
        
        /** Virtual method to override the retrieval of blend shape names for a custom class extending [Mesh]. */
        /* gdvirtual */ _getBlendShapeName(index: int64): StringName
        
        /** Virtual method to override the names of blend shapes for a custom class extending [Mesh]. */
        /* gdvirtual */ _setBlendShapeName(index: int64, name: StringName): void
        
        /** Virtual method to override the [AABB] for a custom class extending [Mesh]. */
        /* gdvirtual */ _getAabb(): Aabb
        
        /** Returns the smallest [AABB] enclosing this mesh in local space. Not affected by `custom_aabb`.  
         *      
         *  **Note:** This is only implemented for [ArrayMesh] and [PrimitiveMesh].  
         */
        getAabb(): Aabb
        
        /** Returns all the vertices that make up the faces of the mesh. Each three vertices represent one triangle. */
        getFaces(): PackedVector3Array
        
        /** Returns the number of surfaces that the [Mesh] holds. This is equivalent to [method MeshInstance3D.get_surface_override_material_count]. */
        getSurfaceCount(): int64
        
        /** Returns the arrays for the vertices, normals, UVs, etc. that make up the requested surface (see [method ArrayMesh.add_surface_from_arrays]). */
        surfaceGetArrays(surfIdx: int64): GArray
        
        /** Returns the blend shape arrays for the requested surface. */
        surfaceGetBlendShapeArrays(surfIdx: int64): GArray<GArray>
        
        /** Sets a [Material] for a given surface. Surface will be rendered using this material.  
         *      
         *  **Note:** This assigns the material within the [Mesh] resource, not the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties. To set the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties, use [method MeshInstance3D.set_surface_override_material] instead.  
         */
        surfaceSetMaterial(surfIdx: int64, material: Material): void
        
        /** Returns a [Material] in a given surface. Surface is rendered using this material.  
         *      
         *  **Note:** This returns the material within the [Mesh] resource, not the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties. To get the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties, use [method MeshInstance3D.get_surface_override_material] instead.  
         */
        surfaceGetMaterial(surfIdx: int64): null | Material
        
        /** Creates a placeholder version of this resource ([PlaceholderMesh]). */
        createPlaceholder(): Resource
        
        /** Calculate an outline mesh at a defined offset (margin) from the original mesh.  
         *      
         *  **Note:** This method typically returns the vertices in reverse order (e.g. clockwise to counterclockwise).  
         */
        createOutline(margin: float64): Mesh
        
        /** Generate a [TriangleMesh] from the mesh. Considers only surfaces using one of these primitive types: [constant PRIMITIVE_TRIANGLES], [constant PRIMITIVE_TRIANGLE_STRIP]. */
        generateTriangleMesh(): null | TriangleMesh
        
        /** Calculate a [ConcavePolygonShape3D] from the mesh. */
        createTrimeshShape(): ConcavePolygonShape3D
        
        /** Calculate a [ConvexPolygonShape3D] from the mesh.  
         *  If [param clean] is `true` (default), duplicate and interior vertices are removed automatically. You can set it to `false` to make the process faster if not needed.  
         *  If [param simplify] is `true`, the geometry can be further simplified to reduce the number of vertices. Disabled by default.  
         */
        createConvexShape(clean?: boolean /* = true */, simplify?: boolean /* = false */): ConvexPolygonShape3D
        
        /** Sets a hint to be used for lightmap resolution. */
        get lightmapSizeHint(): Vector2I
        set lightmapSizeHint(value: Vector2I)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMesh;
    }
    namespace MeshConvexDecompositionSettings {
        enum Mode {
            ConvexDecompositionModeVoxel = 0,
            ConvexDecompositionModeTetrahedron = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshConvexDecompositionSettings extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshConvexDecompositionSettings extends __NameMapRefCounted {
        max_concavity: "maxConcavity";
        symmetry_planes_clipping_bias: "symmetryPlanesClippingBias";
        revolution_axes_clipping_bias: "revolutionAxesClippingBias";
        min_volume_per_convex_hull: "minVolumePerConvexHull";
        max_num_vertices_per_convex_hull: "maxNumVerticesPerConvexHull";
        plane_downsampling: "planeDownsampling";
        convex_hull_downsampling: "convexHullDownsampling";
        normalize_mesh: "normalizeMesh";
        convex_hull_approximation: "convexHullApproximation";
        max_convex_hulls: "maxConvexHulls";
        project_hull_vertices: "projectHullVertices";
    }
    /** Parameters to be used with a [Mesh] convex decomposition operation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshconvexdecompositionsettings.html  
     */
    class MeshConvexDecompositionSettings extends RefCounted {
        constructor(identifier?: any)
        /** Maximum concavity. Ranges from `0.0` to `1.0`. */
        get maxConcavity(): float64
        set maxConcavity(value: float64)
        
        /** Controls the bias toward clipping along symmetry planes. Ranges from `0.0` to `1.0`. */
        get symmetryPlanesClippingBias(): float64
        set symmetryPlanesClippingBias(value: float64)
        
        /** Controls the bias toward clipping along revolution axes. Ranges from `0.0` to `1.0`. */
        get revolutionAxesClippingBias(): float64
        set revolutionAxesClippingBias(value: float64)
        
        /** Controls the adaptive sampling of the generated convex-hulls. Ranges from `0.0` to `0.01`. */
        get minVolumePerConvexHull(): float64
        set minVolumePerConvexHull(value: float64)
        
        /** Maximum number of voxels generated during the voxelization stage. */
        get resolution(): int64
        set resolution(value: int64)
        
        /** Controls the maximum number of triangles per convex-hull. Ranges from `4` to `1024`. */
        get maxNumVerticesPerConvexHull(): int64
        set maxNumVerticesPerConvexHull(value: int64)
        
        /** Controls the granularity of the search for the "best" clipping plane. Ranges from `1` to `16`. */
        get planeDownsampling(): int64
        set planeDownsampling(value: int64)
        
        /** Controls the precision of the convex-hull generation process during the clipping plane selection stage. Ranges from `1` to `16`. */
        get convexHullDownsampling(): int64
        set convexHullDownsampling(value: int64)
        
        /** If `true`, normalizes the mesh before applying the convex decomposition. */
        get normalizeMesh(): boolean
        set normalizeMesh(value: boolean)
        
        /** Mode for the approximate convex decomposition. */
        get mode(): int64
        set mode(value: int64)
        
        /** If `true`, uses approximation for computing convex hulls. */
        get convexHullApproximation(): boolean
        set convexHullApproximation(value: boolean)
        
        /** The maximum number of convex hulls to produce from the merge operation. */
        get maxConvexHulls(): int64
        set maxConvexHulls(value: int64)
        
        /** If `true`, projects output convex hull vertices onto the original source mesh to increase floating-point accuracy of the results. */
        get projectHullVertices(): boolean
        set projectHullVertices(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshConvexDecompositionSettings;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshConvexDecompositionSettings;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshDataTool extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshDataTool extends __NameMapRefCounted {
        create_from_surface: "createFromSurface";
        commit_to_surface: "commitToSurface";
        get_format: "getFormat";
        get_vertex_count: "getVertexCount";
        get_edge_count: "getEdgeCount";
        get_face_count: "getFaceCount";
        set_vertex: "setVertex";
        get_vertex: "getVertex";
        set_vertex_normal: "setVertexNormal";
        get_vertex_normal: "getVertexNormal";
        set_vertex_tangent: "setVertexTangent";
        get_vertex_tangent: "getVertexTangent";
        set_vertex_uv: "setVertexUV";
        get_vertex_uv: "getVertexUV";
        set_vertex_uv2: "setVertexUV2";
        get_vertex_uv2: "getVertexUV2";
        set_vertex_color: "setVertexColor";
        get_vertex_color: "getVertexColor";
        set_vertex_bones: "setVertexBones";
        get_vertex_bones: "getVertexBones";
        set_vertex_weights: "setVertexWeights";
        get_vertex_weights: "getVertexWeights";
        set_vertex_meta: "setVertexMeta";
        get_vertex_meta: "getVertexMeta";
        get_vertex_edges: "getVertexEdges";
        get_vertex_faces: "getVertexFaces";
        get_edge_vertex: "getEdgeVertex";
        get_edge_faces: "getEdgeFaces";
        set_edge_meta: "setEdgeMeta";
        get_edge_meta: "getEdgeMeta";
        get_face_vertex: "getFaceVertex";
        get_face_edge: "getFaceEdge";
        set_face_meta: "setFaceMeta";
        get_face_meta: "getFaceMeta";
        get_face_normal: "getFaceNormal";
        set_material: "setMaterial";
        get_material: "getMaterial";
    }
    /** Helper tool to access and edit [Mesh] data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshdatatool.html  
     */
    class MeshDataTool extends RefCounted {
        constructor(identifier?: any)
        /** Clears all data currently in MeshDataTool. */
        clear(): void
        
        /** Uses specified surface of given [Mesh] to populate data for MeshDataTool.  
         *  Requires [Mesh] with primitive type [constant Mesh.PRIMITIVE_TRIANGLES].  
         */
        createFromSurface(mesh: ArrayMesh, surface: int64): GError
        
        /** Adds a new surface to specified [Mesh] with edited data. */
        commitToSurface(mesh: ArrayMesh, compressionFlags?: int64 /* = 0 */): GError
        
        /** Returns the [Mesh]'s format as a combination of the [enum Mesh.ArrayFormat] flags. For example, a mesh containing both vertices and normals would return a format of `3` because [constant Mesh.ARRAY_FORMAT_VERTEX] is `1` and [constant Mesh.ARRAY_FORMAT_NORMAL] is `2`. */
        getFormat(): int64
        
        /** Returns the total number of vertices in [Mesh]. */
        getVertexCount(): int64
        
        /** Returns the number of edges in this [Mesh]. */
        getEdgeCount(): int64
        
        /** Returns the number of faces in this [Mesh]. */
        getFaceCount(): int64
        
        /** Sets the position of the given vertex. */
        setVertex(idx: int64, vertex: Vector3): void
        
        /** Returns the position of the given vertex. */
        getVertex(idx: int64): Vector3
        
        /** Sets the normal of the given vertex. */
        setVertexNormal(idx: int64, normal: Vector3): void
        
        /** Returns the normal of the given vertex. */
        getVertexNormal(idx: int64): Vector3
        
        /** Sets the tangent of the given vertex.  
         *      
         *  **Note:** Even though [param tangent] is a [Plane], it does not directly represent the tangent plane. Its [member Plane.x], [member Plane.y], and [member Plane.z] represent the tangent vector and [member Plane.d] should be either `-1` or `1`. See also [constant Mesh.ARRAY_TANGENT].  
         */
        setVertexTangent(idx: int64, tangent: Plane): void
        
        /** Returns the tangent of the given vertex. */
        getVertexTangent(idx: int64): Plane
        
        /** Sets the UV of the given vertex. */
        setVertexUV(idx: int64, uv: Vector2): void
        
        /** Returns the UV of the given vertex. */
        getVertexUV(idx: int64): Vector2
        
        /** Sets the UV2 of the given vertex. */
        setVertexUV2(idx: int64, uv2: Vector2): void
        
        /** Returns the UV2 of the given vertex. */
        getVertexUV2(idx: int64): Vector2
        
        /** Sets the color of the given vertex. */
        setVertexColor(idx: int64, color: Color): void
        
        /** Returns the color of the given vertex. */
        getVertexColor(idx: int64): Color
        
        /** Sets the bones of the given vertex. */
        setVertexBones(idx: int64, bones: PackedInt32Array | int32[]): void
        
        /** Returns the bones of the given vertex. */
        getVertexBones(idx: int64): PackedInt32Array
        
        /** Sets the bone weights of the given vertex. */
        setVertexWeights(idx: int64, weights: PackedFloat32Array | float32[]): void
        
        /** Returns bone weights of the given vertex. */
        getVertexWeights(idx: int64): PackedFloat32Array
        
        /** Sets the metadata associated with the given vertex. */
        setVertexMeta(idx: int64, meta: any): void
        
        /** Returns the metadata associated with the given vertex. */
        getVertexMeta(idx: int64): any
        
        /** Returns an array of edges that share the given vertex. */
        getVertexEdges(idx: int64): PackedInt32Array
        
        /** Returns an array of faces that share the given vertex. */
        getVertexFaces(idx: int64): PackedInt32Array
        
        /** Returns the index of the specified [param vertex] connected to the edge at index [param idx].  
         *  [param vertex] can only be `0` or `1`, as edges are composed of two vertices.  
         */
        getEdgeVertex(idx: int64, vertex: int64): int64
        
        /** Returns array of faces that touch given edge. */
        getEdgeFaces(idx: int64): PackedInt32Array
        
        /** Sets the metadata of the given edge. */
        setEdgeMeta(idx: int64, meta: any): void
        
        /** Returns meta information assigned to given edge. */
        getEdgeMeta(idx: int64): any
        
        /** Returns the specified vertex index of the given face.  
         *  [param vertex] must be either `0`, `1`, or `2` because faces contain three vertices.  
         *    
         */
        getFaceVertex(idx: int64, vertex: int64): int64
        
        /** Returns the edge associated with the face at index [param idx].  
         *  [param edge] argument must be either `0`, `1`, or `2` because a face only has three edges.  
         */
        getFaceEdge(idx: int64, edge: int64): int64
        
        /** Sets the metadata of the given face. */
        setFaceMeta(idx: int64, meta: any): void
        
        /** Returns the metadata associated with the given face. */
        getFaceMeta(idx: int64): any
        
        /** Calculates and returns the face normal of the given face. */
        getFaceNormal(idx: int64): Vector3
        
        /** Sets the material to be used by newly-constructed [Mesh]. */
        setMaterial(material: Material): void
        
        /** Returns the material assigned to the [Mesh]. */
        getMaterial(): null | Material
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshDataTool;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshDataTool;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshInstance2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshInstance2D extends __NameMapNode2D {
        texture_changed: "textureChanged";
    }
    /** Node used for displaying a [Mesh] in 2D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshinstance2d.html  
     */
    class MeshInstance2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The [Mesh] that will be drawn by the [MeshInstance2D]. */
        get mesh(): null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh
        set mesh(value: null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh)
        
        /** The [Texture2D] that will be used if using the default [CanvasItemMaterial]. Can be accessed as `TEXTURE` in CanvasItem shader. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** Emitted when the [member texture] is changed. */
        readonly textureChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshInstance2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshInstance2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshInstance3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshInstance3D extends __NameMapGeometryInstance3D {
        get_skin_reference: "getSkinReference";
        get_surface_override_material_count: "getSurfaceOverrideMaterialCount";
        set_surface_override_material: "setSurfaceOverrideMaterial";
        get_surface_override_material: "getSurfaceOverrideMaterial";
        get_active_material: "getActiveMaterial";
        create_trimesh_collision: "createTrimeshCollision";
        create_convex_collision: "createConvexCollision";
        create_multiple_convex_collisions: "createMultipleConvexCollisions";
        get_blend_shape_count: "getBlendShapeCount";
        find_blend_shape_by_name: "findBlendShapeByName";
        get_blend_shape_value: "getBlendShapeValue";
        set_blend_shape_value: "setBlendShapeValue";
        create_debug_tangents: "createDebugTangents";
        bake_mesh_from_current_blend_shape_mix: "bakeMeshFromCurrentBlendShapeMix";
        bake_mesh_from_current_skeleton_pose: "bakeMeshFromCurrentSkeletonPose";
    }
    /** Node that instances meshes into a scenario.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshinstance3d.html  
     */
    class MeshInstance3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        /** Returns the internal [SkinReference] containing the skeleton's [RID] attached to this RID. See also [method Resource.get_rid], [method SkinReference.get_skeleton], and [method RenderingServer.instance_attach_skeleton]. */
        getSkinReference(): null | SkinReference
        
        /** Returns the number of surface override materials. This is equivalent to [method Mesh.get_surface_count]. See also [method get_surface_override_material]. */
        getSurfaceOverrideMaterialCount(): int64
        
        /** Sets the override [param material] for the specified [param surface] of the [Mesh] resource. This material is associated with this [MeshInstance3D] rather than with [member mesh].  
         *      
         *  **Note:** This assigns the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties, not the material within the [Mesh] resource. To set the material within the [Mesh] resource, use [method Mesh.surface_set_material] instead.  
         */
        setSurfaceOverrideMaterial(surface: int64, material: Material): void
        
        /** Returns the override [Material] for the specified [param surface] of the [Mesh] resource. See also [method get_surface_override_material_count].  
         *      
         *  **Note:** This returns the [Material] associated to the [MeshInstance3D]'s Surface Material Override properties, not the material within the [Mesh] resource. To get the material within the [Mesh] resource, use [method Mesh.surface_get_material] instead.  
         */
        getSurfaceOverrideMaterial(surface: int64): null | Material
        
        /** Returns the [Material] that will be used by the [Mesh] when drawing. This can return the [member GeometryInstance3D.material_override], the surface override [Material] defined in this [MeshInstance3D], or the surface [Material] defined in the [member mesh]. For example, if [member GeometryInstance3D.material_override] is used, all surfaces will return the override material.  
         *  Returns `null` if no material is active, including when [member mesh] is `null`.  
         */
        getActiveMaterial(surface: int64): null | Material
        
        /** This helper creates a [StaticBody3D] child node with a [ConcavePolygonShape3D] collision shape calculated from the mesh geometry. It's mainly used for testing. */
        createTrimeshCollision(): void
        
        /** This helper creates a [StaticBody3D] child node with a [ConvexPolygonShape3D] collision shape calculated from the mesh geometry. It's mainly used for testing.  
         *  If [param clean] is `true` (default), duplicate and interior vertices are removed automatically. You can set it to `false` to make the process faster if not needed.  
         *  If [param simplify] is `true`, the geometry can be further simplified to reduce the number of vertices. Disabled by default.  
         */
        createConvexCollision(clean?: boolean /* = true */, simplify?: boolean /* = false */): void
        
        /** This helper creates a [StaticBody3D] child node with multiple [ConvexPolygonShape3D] collision shapes calculated from the mesh geometry via convex decomposition. The convex decomposition operation can be controlled with parameters from the optional [param settings]. */
        createMultipleConvexCollisions(settings?: MeshConvexDecompositionSettings): void
        
        /** Returns the number of blend shapes available. Produces an error if [member mesh] is `null`. */
        getBlendShapeCount(): int64
        
        /** Returns the index of the blend shape with the given [param name]. Returns `-1` if no blend shape with this name exists, including when [member mesh] is `null`. */
        findBlendShapeByName(name: StringName): int64
        
        /** Returns the value of the blend shape at the given [param blend_shape_idx]. Returns `0.0` and produces an error if [member mesh] is `null` or doesn't have a blend shape at that index. */
        getBlendShapeValue(blendShapeIdx: int64): float64
        
        /** Sets the value of the blend shape at [param blend_shape_idx] to [param value]. Produces an error if [member mesh] is `null` or doesn't have a blend shape at that index. */
        setBlendShapeValue(blendShapeIdx: int64, value: float64): void
        
        /** This helper creates a [MeshInstance3D] child node with gizmos at every vertex calculated from the mesh geometry. It's mainly used for testing. */
        createDebugTangents(): void
        
        /** Takes a snapshot from the current [ArrayMesh] with all blend shapes applied according to their current weights and bakes it to the provided [param existing] mesh. If no [param existing] mesh is provided a new [ArrayMesh] is created, baked and returned. Mesh surface materials are not copied.  
         *  **Performance:** [Mesh] data needs to be received from the GPU, stalling the [RenderingServer] in the process.  
         */
        bakeMeshFromCurrentBlendShapeMix(existing?: ArrayMesh): null | ArrayMesh
        
        /** Takes a snapshot of the current animated skeleton pose of the skinned mesh and bakes it to the provided [param existing] mesh. If no [param existing] mesh is provided a new [ArrayMesh] is created, baked, and returned. Requires a skeleton with a registered skin to work. Blendshapes are ignored. Mesh surface materials are not copied.  
         *  **Performance:** [Mesh] data needs to be retrieved from the GPU, stalling the [RenderingServer] in the process.  
         */
        bakeMeshFromCurrentSkeletonPose(existing?: ArrayMesh): null | ArrayMesh
        
        /** The [Mesh] resource for the instance. */
        get mesh(): null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh
        set mesh(value: null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh)
        
        /** The [Skin] to be used by this instance. */
        get skin(): null | Skin
        set skin(value: null | Skin)
        
        /** [NodePath] to the [Skeleton3D] associated with the instance.  
         *      
         *  **Note:** The default value of this property has changed in Godot 4.6. Enable [member ProjectSettings.animation/compatibility/default_parent_skeleton_in_mesh_instance_3d] if the old behavior is needed for compatibility.  
         */
        get skeleton(): NodePath
        set skeleton(value: NodePath | string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshInstance3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshInstance3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshLibrary extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshLibrary extends __NameMapResource {
        create_item: "createItem";
        set_item_name: "setItemName";
        set_item_category: "setItemCategory";
        set_item_mesh: "setItemMesh";
        set_item_mesh_transform: "setItemMeshTransform";
        set_item_mesh_cast_shadow: "setItemMeshCastShadow";
        set_item_navigation_mesh: "setItemNavigationMesh";
        set_item_navigation_mesh_transform: "setItemNavigationMeshTransform";
        set_item_navigation_layers: "setItemNavigationLayers";
        set_item_shapes: "setItemShapes";
        set_item_preview: "setItemPreview";
        get_item_name: "getItemName";
        get_item_category: "getItemCategory";
        get_item_mesh: "getItemMesh";
        get_item_mesh_transform: "getItemMeshTransform";
        get_item_mesh_cast_shadow: "getItemMeshCastShadow";
        get_item_navigation_mesh: "getItemNavigationMesh";
        get_item_navigation_mesh_transform: "getItemNavigationMeshTransform";
        get_item_navigation_layers: "getItemNavigationLayers";
        get_item_shapes: "getItemShapes";
        get_item_preview: "getItemPreview";
        remove_item: "removeItem";
        find_item_by_name: "findItemByName";
        get_item_list: "getItemList";
        get_item_count: "getItemCount";
        get_last_unused_item_id: "getLastUnusedItemId";
    }
    /** Library of meshes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshlibrary.html  
     */
    class MeshLibrary extends Resource {
        constructor(identifier?: any)
        /** Creates a new item in the library with the given ID.  
         *  You can get an unused ID from [method get_last_unused_item_id].  
         */
        createItem(id: int64): void
        
        /** Sets the item's name.  
         *  This name is shown in the editor. It can also be used to look up the item later using [method find_item_by_name].  
         */
        setItemName(id: int64, name: string): void
        
        /** Sets the [param category] for a specific item [param id] for organization in the [GridMap] editor. A category can include `/` as a delimiter to create subcategories. */
        setItemCategory(id: int64, category: StringName): void
        
        /** Sets the item's mesh. */
        setItemMesh(id: int64, mesh: Mesh): void
        
        /** Sets the transform to apply to the item's mesh. */
        setItemMeshTransform(id: int64, meshTransform: Transform3D): void
        
        /** Sets the item's shadow casting mode to [param shadow_casting_setting]. */
        setItemMeshCastShadow(id: int64, shadowCastingSetting: RenderingServer.ShadowCastingSetting): void
        
        /** Sets the item's navigation mesh. */
        setItemNavigationMesh(id: int64, navigationMesh: NavigationMesh): void
        
        /** Sets the transform to apply to the item's navigation mesh. */
        setItemNavigationMeshTransform(id: int64, navigationMesh: Transform3D): void
        
        /** Sets the item's navigation layers bitmask. */
        setItemNavigationLayers(id: int64, navigationLayers: int64): void
        
        /** Sets an item's collision shapes.  
         *  The array should consist of [Shape3D] objects, each followed by a [Transform3D] that will be applied to it. For shapes that should not have a transform, use [constant Transform3D.IDENTITY].  
         */
        setItemShapes(id: int64, shapes: GArray): void
        
        /** Sets a texture to use as the item's preview icon in the editor. */
        setItemPreview(id: int64, texture: Texture2D): void
        
        /** Returns the item's name. */
        getItemName(id: int64): string
        
        /** Returns the category for a specific item [param id]. See also [method set_item_category]. */
        getItemCategory(id: int64): StringName
        
        /** Returns the item's mesh. */
        getItemMesh(id: int64): null | Mesh
        
        /** Returns the transform applied to the item's mesh. */
        getItemMeshTransform(id: int64): Transform3D
        
        /** Returns the item's shadow casting mode. */
        getItemMeshCastShadow(id: int64): RenderingServer.ShadowCastingSetting
        
        /** Returns the item's navigation mesh. */
        getItemNavigationMesh(id: int64): null | NavigationMesh
        
        /** Returns the transform applied to the item's navigation mesh. */
        getItemNavigationMeshTransform(id: int64): Transform3D
        
        /** Returns the item's navigation layers bitmask. */
        getItemNavigationLayers(id: int64): int64
        
        /** Returns an item's collision shapes.  
         *  The array consists of each [Shape3D] followed by its [Transform3D].  
         */
        getItemShapes(id: int64): GArray
        
        /** When running in the editor, returns a generated item preview (a 3D rendering in isometric perspective). When used in a running project, returns the manually-defined item preview which can be set using [method set_item_preview]. Returns an empty [Texture2D] if no preview was manually set in a running project. */
        getItemPreview(id: int64): null | Texture2D
        
        /** Removes the item. */
        removeItem(id: int64): void
        
        /** Returns the first item with the given name, or `-1` if no item is found. */
        findItemByName(name: string): int64
        
        /** Clears the library. */
        clear(): void
        
        /** Returns the list of item IDs in use. */
        getItemList(): PackedInt32Array
        
        /** Returns the number of items present in the library. */
        getItemCount(): int64
        
        /** Gets an unused ID for a new item. */
        getLastUnusedItemId(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshLibrary;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshLibrary;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMeshTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMeshTexture extends __NameMapTexture2D {
        base_texture: "baseTexture";
        image_size: "imageSize";
    }
    /** Simple texture that uses a mesh to draw itself.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_meshtexture.html  
     */
    class MeshTexture extends Texture2D {
        constructor(identifier?: any)
        /** Sets the mesh used to draw. It must be a mesh using 2D vertices. */
        get mesh(): null | Mesh
        set mesh(value: null | Mesh)
        
        /** Sets the base texture that the Mesh will use to draw. */
        get baseTexture(): null | Texture2D
        set baseTexture(value: null | Texture2D)
        
        /** Sets the size of the image, needed for reference. */
        get imageSize(): Vector2
        set imageSize(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMeshTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMeshTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMethodTweener extends __RPCMapTweener {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMethodTweener extends __NameMapTweener {
        set_delay: "setDelay";
        set_trans: "setTrans";
        set_ease: "setEase";
    }
    /** Interpolates an abstract value and supplies it to a method called over time.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_methodtweener.html  
     */
    class MethodTweener extends Tweener {
        constructor(identifier?: any)
        /** Sets the time in seconds after which the [MethodTweener] will start interpolating. By default there's no delay. */
        setDelay(delay: float64): null | MethodTweener
        
        /** Sets the type of used transition from [enum Tween.TransitionType]. If not set, the default transition is used from the [Tween] that contains this Tweener. */
        setTrans(trans: Tween.TransitionType): null | MethodTweener
        
        /** Sets the type of used easing from [enum Tween.EaseType]. If not set, the default easing is used from the [Tween] that contains this Tweener. */
        setEase(ease: Tween.EaseType): null | MethodTweener
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMethodTweener;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMethodTweener;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMissingNode extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMissingNode extends __NameMapNode {
        original_class: "originalClass";
        original_scene: "originalScene";
        recording_properties: "recordingProperties";
        recording_signals: "recordingSignals";
    }
    /** An internal editor class intended for keeping the data of unrecognized nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_missingnode.html  
     */
    class MissingNode<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** The name of the class this node was supposed to be (see [method Object.get_class]). */
        get originalClass(): string
        set originalClass(value: string)
        
        /** Returns the path of the scene this node was instance of originally. */
        get originalScene(): string
        set originalScene(value: string)
        
        /** If `true`, allows new properties to be set along with existing ones. If `false`, only existing properties' values can be set, and new properties cannot be added. */
        get recordingProperties(): boolean
        set recordingProperties(value: boolean)
        
        /** If `true`, allows new signals to be connected to along with existing ones. If `false`, only existing signals can be connected to, and new signals cannot be added. */
        get recordingSignals(): boolean
        set recordingSignals(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMissingNode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMissingNode;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMissingResource extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMissingResource extends __NameMapResource {
        original_class: "originalClass";
        recording_properties: "recordingProperties";
    }
    /** An internal editor class intended for keeping the data of unrecognized resources.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_missingresource.html  
     */
    class MissingResource extends Resource {
        constructor(identifier?: any)
        /** The name of the class this resource was supposed to be (see [method Object.get_class]). */
        get originalClass(): string
        set originalClass(value: string)
        
        /** If set to `true`, allows new properties to be added on top of the existing ones with [method Object.set]. */
        get recordingProperties(): boolean
        set recordingProperties(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMissingResource;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMissingResource;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMobileVRInterface extends __RPCMapXRInterface {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMobileVRInterface extends __NameMapXRInterface {
        eye_height: "eyeHeight";
        display_width: "displayWidth";
        display_to_lens: "displayToLens";
        offset_rect: "offsetRect";
        vrs_min_radius: "vrsMinRadius";
        vrs_strength: "vrsStrength";
    }
    /** Generic mobile VR implementation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_mobilevrinterface.html  
     */
    class MobileVRInterface extends XRInterface {
        constructor(identifier?: any)
        /** The height at which the camera is placed in relation to the ground (i.e. [XROrigin3D] node). */
        get eyeHeight(): float64
        set eyeHeight(value: float64)
        
        /** The interocular distance, also known as the interpupillary distance. The distance between the pupils of the left and right eye. */
        get iod(): float64
        set iod(value: float64)
        
        /** The width of the display in centimeters. */
        get displayWidth(): float64
        set displayWidth(value: float64)
        
        /** The distance between the display and the lenses inside of the device in centimeters. */
        get displayToLens(): float64
        set displayToLens(value: float64)
        
        /** Set the offset rect relative to the area being rendered. A length of 1 represents the whole rendering area on that axis. */
        get offsetRect(): Rect2
        set offsetRect(value: Rect2)
        
        /** The oversample setting. Because of the lens distortion we have to render our buffers at a higher resolution then the screen can natively handle. A value between 1.5 and 2.0 often provides good results but at the cost of performance. */
        get oversample(): float64
        set oversample(value: float64)
        
        /** The k1 lens factor is one of the two constants that define the strength of the lens used and directly influences the lens distortion effect. */
        get k1(): float64
        set k1(value: float64)
        
        /** The k2 lens factor, see k1. */
        get k2(): float64
        set k2(value: float64)
        
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
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMobileVRInterface;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMobileVRInterface;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapModifierBoneTarget3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapModifierBoneTarget3D extends __NameMapSkeletonModifier3D {
        bone_name: "boneName";
    }
    /** А node that dynamically copies the 3D transform of a bone in its parent [Skeleton3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_modifierbonetarget3d.html  
     */
    class ModifierBoneTarget3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** The name of the attached bone. */
        get boneName(): string
        set boneName(value: string)
        
        /** The index of the attached bone. */
        get bone(): int64
        set bone(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapModifierBoneTarget3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapModifierBoneTarget3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMovieWriter extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMovieWriter extends __NameMapGObject {
        _get_audio_mix_rate: "_getAudioMixRate";
        _get_audio_speaker_mode: "_getAudioSpeakerMode";
        _handles_file: "_handlesFile";
        _get_supported_extensions: "_getSupportedExtensions";
        _write_begin: "_writeBegin";
        _write_frame: "_writeFrame";
        _write_end: "_writeEnd";
        add_writer: "addWriter";
    }
    /** Abstract class for non-real-time video recording encoders.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_moviewriter.html  
     */
    class MovieWriter extends GObject {
        constructor(identifier?: any)
        /** Called when the audio sample rate used for recording the audio is requested by the engine. The value returned must be specified in Hz. Defaults to 48000 Hz if [method _get_audio_mix_rate] is not overridden. */
        /* gdvirtual */ _getAudioMixRate(): int64
        
        /** Called when the audio speaker mode used for recording the audio is requested by the engine. This can affect the number of output channels in the resulting audio file/stream. Defaults to [constant AudioServer.SPEAKER_MODE_STEREO] if [method _get_audio_speaker_mode] is not overridden. */
        /* gdvirtual */ _getAudioSpeakerMode(): AudioServer.SpeakerMode
        
        /** Called when the engine determines whether this [MovieWriter] is able to handle the file at [param path]. Must return `true` if this [MovieWriter] is able to handle the given file path, `false` otherwise. Typically, [method _handles_file] is overridden as follows to allow the user to record a file at any path with a given file extension:  
         *    
         */
        /* gdvirtual */ _handlesFile(path: string): boolean
        
        /** Returns the list of supported filename extensions for movies written with this [MovieWriter]. */
        /* gdvirtual */ _getSupportedExtensions(): PackedStringArray
        
        /** Called once before the engine starts writing video and audio data. [param movie_size] is the width and height of the video to save. [param fps] is the number of frames per second specified in the project settings or using the `--fixed-fps <fps>` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url]. */
        /* gdvirtual */ _writeBegin(movieSize: Vector2I, fps: int64, basePath: string): GError
        
        /** Called at the end of every rendered frame. The [param frame_image] and [param audio_frame_block] function arguments should be written to. */
        /* gdvirtual */ _writeFrame(frameImage: Image, audioFrameBlock: int64): GError
        
        /** Called when the engine finishes writing. This occurs when the engine quits by pressing the window manager's close button, or when [method SceneTree.quit] is called.  
         *      
         *  **Note:** Pressing [kbd]Ctrl + C[/kbd] on the terminal running the editor/project does  *not*  result in [method _write_end] being called.  
         */
        /* gdvirtual */ _writeEnd(): void
        
        /** Adds a writer to be usable by the engine. The supported file extensions can be set by overriding [method _handles_file].  
         *      
         *  **Note:** [method add_writer] must be called early enough in the engine initialization to work, as movie writing is designed to start at the same time as the rest of the engine.  
         */
        static addWriter(writer: MovieWriter): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMovieWriter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMovieWriter;
    }
    namespace MultiMesh {
        enum TransformFormat {
            Transform2D = 0,
            Transform3D = 1,
        }
        enum PhysicsInterpolationQuality {
            InterpQualityFast = 0,
            InterpQualityHigh = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiMesh extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiMesh extends __NameMapResource {
        set_instance_transform: "setInstanceTransform";
        set_instance_transform_2d: "setInstanceTransform2D";
        get_instance_transform: "getInstanceTransform";
        get_instance_transform_2d: "getInstanceTransform2D";
        set_instance_color: "setInstanceColor";
        get_instance_color: "getInstanceColor";
        set_instance_custom_data: "setInstanceCustomData";
        get_instance_custom_data: "getInstanceCustomData";
        reset_instance_physics_interpolation: "resetInstancePhysicsInterpolation";
        reset_instances_physics_interpolation: "resetInstancesPhysicsInterpolation";
        get_aabb: "getAabb";
        set_buffer_interpolated: "setBufferInterpolated";
        transform_format: "transformFormat";
        use_colors: "useColors";
        use_custom_data: "useCustomData";
        custom_aabb: "customAabb";
        instance_count: "instanceCount";
        visible_instance_count: "visibleInstanceCount";
        transform_array: "transformArray";
        transform_2d_array: "transform2DArray";
        color_array: "colorArray";
        custom_data_array: "customDataArray";
        physics_interpolation_quality: "physicsInterpolationQuality";
    }
    /** Provides high-performance drawing of a mesh multiple times using GPU instancing.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multimesh.html  
     */
    class MultiMesh extends Resource {
        constructor(identifier?: any)
        /** Sets the [Transform3D] for a specific instance. */
        setInstanceTransform(instance: int64, transform: Transform3D): void
        
        /** Sets the [Transform2D] for a specific instance. */
        setInstanceTransform2D(instance: int64, transform: Transform2D): void
        
        /** Returns the [Transform3D] of a specific instance. */
        getInstanceTransform(instance: int64): Transform3D
        
        /** Returns the [Transform2D] of a specific instance. */
        getInstanceTransform2D(instance: int64): Transform2D
        
        /** Sets the color of a specific instance by  *multiplying*  the mesh's existing vertex colors. This allows for different color tinting per instance.  
         *      
         *  **Note:** Each component is stored in 32 bits in the Forward+ and Mobile rendering methods, but is packed into 16 bits in the Compatibility rendering method.  
         *  For the color to take effect, ensure that [member use_colors] is `true` on the [MultiMesh] and [member BaseMaterial3D.vertex_color_use_as_albedo] is `true` on the material. If you intend to set an absolute color instead of tinting, make sure the material's albedo color is set to pure white (`Color(1, 1, 1)`).  
         */
        setInstanceColor(instance: int64, color: Color): void
        
        /** Gets a specific instance's color multiplier. */
        getInstanceColor(instance: int64): Color
        
        /** Sets custom data for a specific instance. [param custom_data] is a [Color] type only to contain 4 floating-point numbers.  
         *      
         *  **Note:** Each number is stored in 32 bits in the Forward+ and Mobile rendering methods, but is packed into 16 bits in the Compatibility rendering method.  
         *  For the custom data to be used, ensure that [member use_custom_data] is `true`.  
         *  This custom instance data has to be manually accessed in your custom shader using `INSTANCE_CUSTOM`.  
         */
        setInstanceCustomData(instance: int64, customData: Color): void
        
        /** Returns the custom data that has been set for a specific instance. */
        getInstanceCustomData(instance: int64): Color
        
        /** When using  *physics interpolation* , this function allows you to prevent interpolation on an instance in the current physics tick.  
         *  This allows you to move instances instantaneously, and should usually be used when initially placing an instance such as a bullet to prevent graphical glitches.  
         */
        resetInstancePhysicsInterpolation(instance: int64): void
        
        /** When using  *physics interpolation* , this function allows you to prevent interpolation for all instances in the current physics tick.  
         *  This allows you to move all instances instantaneously, and should usually be used when initially placing instances to prevent graphical glitches.  
         */
        resetInstancesPhysicsInterpolation(): void
        
        /** Returns the visibility axis-aligned bounding box in local space. */
        getAabb(): Aabb
        
        /** An alternative to setting the [member buffer] property, which can be used with  *physics interpolation* . This method takes two arrays, and can set the data for the current and previous tick in one go. The renderer will automatically interpolate the data at each frame.  
         *  This is useful for situations where the order of instances may change from physics tick to tick, such as particle systems.  
         *  When the order of instances is coherent, the simpler alternative of setting [member buffer] can still be used with interpolation.  
         */
        setBufferInterpolated(bufferCurr: PackedFloat32Array | float32[], bufferPrev: PackedFloat32Array | float32[]): void
        
        /** Format of transform used to transform mesh, either 2D or 3D. */
        get transformFormat(): int64
        set transformFormat(value: int64)
        
        /** If `true`, the [MultiMesh] will use color data (see [method set_instance_color]). Can only be set when [member instance_count] is `0` or less. This means that you need to call this method before setting the instance count, or temporarily reset it to `0`. */
        get useColors(): boolean
        set useColors(value: boolean)
        
        /** If `true`, the [MultiMesh] will use custom data (see [method set_instance_custom_data]). Can only be set when [member instance_count] is `0` or less. This means that you need to call this method before setting the instance count, or temporarily reset it to `0`. */
        get useCustomData(): boolean
        set useCustomData(value: boolean)
        
        /** Custom AABB for this MultiMesh resource. Setting this manually prevents costly runtime AABB recalculations. */
        get customAabb(): Aabb
        set customAabb(value: Aabb)
        
        /** Number of instances that will get drawn. This clears and (re)sizes the buffers. Setting data format or flags afterwards will have no effect.  
         *  By default, all instances are drawn but you can limit this with [member visible_instance_count].  
         */
        get instanceCount(): int64
        set instanceCount(value: int64)
        
        /** Limits the number of instances drawn, -1 draws all instances. Changing this does not change the sizes of the buffers. */
        get visibleInstanceCount(): int64
        set visibleInstanceCount(value: int64)
        
        /** [Mesh] resource to be instanced.  
         *  The looks of the individual instances can be modified using [method set_instance_color] and [method set_instance_custom_data].  
         */
        get mesh(): null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh
        set mesh(value: null | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | QuadMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh)
        get buffer(): PackedFloat32Array
        set buffer(value: PackedFloat32Array | float32[])
        
        /** Array containing each [Transform3D] value used by all instances of this mesh, as a [PackedVector3Array]. Each transform is divided into 4 [Vector3] values corresponding to the transforms' `x`, `y`, `z`, and `origin`. */
        get transformArray(): PackedVector3Array
        set transformArray(value: PackedVector3Array | Vector3[])
        
        /** Array containing each [Transform2D] value used by all instances of this mesh, as a [PackedVector2Array]. Each transform is divided into 3 [Vector2] values corresponding to the transforms' `x`, `y`, and `origin`. */
        get transform2DArray(): PackedVector2Array
        set transform2DArray(value: PackedVector2Array | Vector2[])
        
        /** Array containing each [Color] used by all instances of this mesh. */
        get colorArray(): PackedColorArray
        set colorArray(value: PackedColorArray | Color[])
        
        /** Array containing each custom data value used by all instances of this mesh, as a [PackedColorArray]. */
        get customDataArray(): PackedColorArray
        set customDataArray(value: PackedColorArray | Color[])
        
        /** Choose whether to use an interpolation method that favors speed or quality.  
         *  When using low physics tick rates (typically below 20) or high rates of object rotation, you may get better results from the high quality setting.  
         *      
         *  **Note:** Fast quality does not equate to low quality. Except in the special cases mentioned above, the quality should be comparable to high quality.  
         */
        get physicsInterpolationQuality(): int64
        set physicsInterpolationQuality(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiMeshInstance2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiMeshInstance2D extends __NameMapNode2D {
        texture_changed: "textureChanged";
    }
    /** Node that instances a [MultiMesh] in 2D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multimeshinstance2d.html  
     */
    class MultiMeshInstance2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The [MultiMesh] that will be drawn by the [MultiMeshInstance2D]. */
        get multimesh(): null | MultiMesh
        set multimesh(value: null | MultiMesh)
        
        /** The [Texture2D] that will be used if using the default [CanvasItemMaterial]. Can be accessed as `TEXTURE` in CanvasItem shader. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** Emitted when the [member texture] is changed. */
        readonly textureChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiMeshInstance2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiMeshInstance2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiMeshInstance3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiMeshInstance3D extends __NameMapGeometryInstance3D {
    }
    /** Node that instances a [MultiMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multimeshinstance3d.html  
     */
    class MultiMeshInstance3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        /** The [MultiMesh] resource that will be used and shared among all instances of the [MultiMeshInstance3D]. */
        get multimesh(): null | MultiMesh
        set multimesh(value: null | MultiMesh)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiMeshInstance3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiMeshInstance3D;
    }
    namespace MultiplayerApi {
        enum RpcMode {
            RpcModeDisabled = 0,
            RpcModeAnyPeer = 1,
            RpcModeAuthority = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerApi extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerApi extends __NameMapRefCounted {
        has_multiplayer_peer: "hasMultiplayerPeer";
        get_unique_id: "getUniqueId";
        is_server: "isServer";
        get_remote_sender_id: "getRemoteSenderId";
        object_configuration_add: "objectConfigurationAdd";
        object_configuration_remove: "objectConfigurationRemove";
        get_peers: "getPeers";
        set_default_interface: "setDefaultInterface";
        get_default_interface: "getDefaultInterface";
        create_default_interface: "createDefaultInterface";
        multiplayer_peer: "multiplayerPeer";
        peer_connected: "peerConnected";
        peer_disconnected: "peerDisconnected";
        connected_to_server: "connectedToServer";
        connection_failed: "connectionFailed";
        server_disconnected: "serverDisconnected";
    }
    class MultiplayerApi extends RefCounted {
        constructor(identifier?: any)
        hasMultiplayerPeer(): boolean
        getUniqueId(): int64
        isServer(): boolean
        getRemoteSenderId(): int64
        poll(): GError
        rpc(peer: int64, object: GObject, method: StringName, arguments_?: GArray): GError
        objectConfigurationAdd(object: GObject, configuration: any): GError
        objectConfigurationRemove(object: GObject, configuration: any): GError
        getPeers(): PackedInt32Array
        static setDefaultInterface(interfaceName: StringName): void
        static getDefaultInterface(): StringName
        static createDefaultInterface(): MultiplayerApi
        get multiplayerPeer(): null | MultiplayerPeer
        set multiplayerPeer(value: null | MultiplayerPeer)
        readonly peerConnected: Signal<(id: int64) => void>
        readonly peerDisconnected: Signal<(id: int64) => void>
        readonly connectedToServer: Signal<() => void>
        readonly connectionFailed: Signal<() => void>
        readonly serverDisconnected: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerApi;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerApi;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerApiExtension extends __RPCMapMultiplayerApi {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerApiExtension extends __NameMapMultiplayerApi {
        _set_multiplayer_peer: "_setMultiplayerPeer";
        _get_multiplayer_peer: "_getMultiplayerPeer";
        _get_unique_id: "_getUniqueId";
        _get_peer_ids: "_getPeerIds";
        _get_remote_sender_id: "_getRemoteSenderId";
        _object_configuration_add: "_objectConfigurationAdd";
        _object_configuration_remove: "_objectConfigurationRemove";
    }
    class MultiplayerApiExtension extends MultiplayerApi {
        constructor(identifier?: any)
        /* gdvirtual */ _poll(): GError
        /* gdvirtual */ _setMultiplayerPeer(multiplayerPeer: MultiplayerPeer): void
        /* gdvirtual */ _getMultiplayerPeer(): null | MultiplayerPeer
        /* gdvirtual */ _getUniqueId(): int64
        /* gdvirtual */ _getPeerIds(): PackedInt32Array
        /* gdvirtual */ _rpc(peer: int64, object: GObject, method: StringName, args: GArray): GError
        /* gdvirtual */ _getRemoteSenderId(): int64
        /* gdvirtual */ _objectConfigurationAdd(object: GObject, configuration: any): GError
        /* gdvirtual */ _objectConfigurationRemove(object: GObject, configuration: any): GError
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerApiExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerApiExtension;
    }
    namespace MultiplayerPeer {
        enum ConnectionStatus {
            ConnectionDisconnected = 0,
            ConnectionConnecting = 1,
            ConnectionConnected = 2,
        }
        enum TransferMode {
            TransferModeUnreliable = 0,
            TransferModeUnreliableOrdered = 1,
            TransferModeReliable = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerPeer extends __RPCMapPacketPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerPeer extends __NameMapPacketPeer {
        set_target_peer: "setTargetPeer";
        get_packet_peer: "getPacketPeer";
        get_packet_channel: "getPacketChannel";
        get_packet_mode: "getPacketMode";
        disconnect_peer: "disconnectPeer";
        get_connection_status: "getConnectionStatus";
        get_unique_id: "getUniqueId";
        generate_unique_id: "generateUniqueId";
        is_server_relay_supported: "isServerRelaySupported";
        refuse_new_connections: "refuseNewConnections";
        transfer_mode: "transferMode";
        transfer_channel: "transferChannel";
        peer_connected: "peerConnected";
        peer_disconnected: "peerDisconnected";
    }
    /** Abstract class for specialized [PacketPeer]s used by the [MultiplayerAPI].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multiplayerpeer.html  
     */
    class MultiplayerPeer extends PacketPeer {
        /** Packets are sent to all connected peers. */
        static readonly TARGET_PEER_BROADCAST = 0
        
        /** Packets are sent to the remote peer acting as server. */
        static readonly TARGET_PEER_SERVER = 1
        constructor(identifier?: any)
        
        /** Sets the peer to which packets will be sent.  
         *  The [param id] can be one of: [constant TARGET_PEER_BROADCAST] to send to all connected peers, [constant TARGET_PEER_SERVER] to send to the peer acting as server, a valid peer ID to send to that specific peer, a negative peer ID to send to all peers except that one. By default, the target peer is [constant TARGET_PEER_BROADCAST].  
         */
        setTargetPeer(id: int64): void
        
        /** Returns the ID of the [MultiplayerPeer] who sent the next available packet. See [method PacketPeer.get_available_packet_count]. */
        getPacketPeer(): int64
        
        /** Returns the channel over which the next available packet was received. See [method PacketPeer.get_available_packet_count]. */
        getPacketChannel(): int64
        
        /** Returns the transfer mode the remote peer used to send the next available packet. See [method PacketPeer.get_available_packet_count]. */
        getPacketMode(): MultiplayerPeer.TransferMode
        
        /** Waits up to 1 second to receive a new network event. */
        poll(): void
        
        /** Immediately close the multiplayer peer returning to the state [constant CONNECTION_DISCONNECTED]. Connected peers will be dropped without emitting [signal peer_disconnected]. */
        close(): void
        
        /** Disconnects the given [param peer] from this host. If [param force] is `true` the [signal peer_disconnected] signal will not be emitted for this peer. */
        disconnectPeer(peer: int64, force?: boolean /* = false */): void
        
        /** Returns the current state of the connection. */
        getConnectionStatus(): MultiplayerPeer.ConnectionStatus
        
        /** Returns the ID of this [MultiplayerPeer]. */
        getUniqueId(): int64
        
        /** Returns a randomly generated integer that can be used as a network unique ID. */
        generateUniqueId(): int64
        
        /** Returns `true` if the server can act as a relay in the current configuration. That is, if the higher level [MultiplayerAPI] should notify connected clients of other peers, and implement a relay protocol to allow communication between them. */
        isServerRelaySupported(): boolean
        
        /** If `true`, this [MultiplayerPeer] refuses new connections. */
        get refuseNewConnections(): boolean
        set refuseNewConnections(value: boolean)
        
        /** The manner in which to send packets to the target peer. See the [method set_target_peer] method. */
        get transferMode(): int64
        set transferMode(value: int64)
        
        /** The channel to use to send packets. Many network APIs such as ENet and WebRTC allow the creation of multiple independent channels which behaves, in a way, like separate connections. This means that reliable data will only block delivery of other packets on that channel, and ordering will only be in respect to the channel the packet is being sent on. Using different channels to send **different and independent** state updates is a common way to optimize network usage and decrease latency in fast-paced games.  
         *      
         *  **Note:** The default channel (`0`) actually works as 3 separate channels (one for each [enum TransferMode]) so that [constant TRANSFER_MODE_RELIABLE] and [constant TRANSFER_MODE_UNRELIABLE_ORDERED] does not interact with each other by default. Refer to the specific network API documentation (e.g. ENet or WebRTC) to learn how to set up channels correctly.  
         */
        get transferChannel(): int64
        set transferChannel(value: int64)
        
        /** Emitted when a remote peer connects. */
        readonly peerConnected: Signal<(id: int64) => void>
        
        /** Emitted when a remote peer has disconnected. */
        readonly peerDisconnected: Signal<(id: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerPeer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerPeerExtension extends __RPCMapMultiplayerPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerPeerExtension extends __NameMapMultiplayerPeer {
        _get_packet: "_getPacket";
        _put_packet: "_putPacket";
        _get_available_packet_count: "_getAvailablePacketCount";
        _get_max_packet_size: "_getMaxPacketSize";
        _get_packet_script: "_getPacketScript";
        _put_packet_script: "_putPacketScript";
        _get_packet_channel: "_getPacketChannel";
        _get_packet_mode: "_getPacketMode";
        _set_transfer_channel: "_setTransferChannel";
        _get_transfer_channel: "_getTransferChannel";
        _set_transfer_mode: "_setTransferMode";
        _get_transfer_mode: "_getTransferMode";
        _set_target_peer: "_setTargetPeer";
        _get_packet_peer: "_getPacketPeer";
        _is_server: "_isServer";
        _disconnect_peer: "_disconnectPeer";
        _get_unique_id: "_getUniqueId";
        _set_refuse_new_connections: "_setRefuseNewConnections";
        _is_refusing_new_connections: "_isRefusingNewConnections";
        _is_server_relay_supported: "_isServerRelaySupported";
        _get_connection_status: "_getConnectionStatus";
    }
    /** Class that can be inherited to implement custom multiplayer API networking layers via GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multiplayerpeerextension.html  
     */
    class MultiplayerPeerExtension extends MultiplayerPeer {
        constructor(identifier?: any)
        /** Called when a packet needs to be received by the [MultiplayerAPI], with [param r_buffer_size] being the size of the binary [param r_buffer] in bytes. */
        /* gdvirtual */ _getPacket(rBuffer: int64, rBufferSize: int64): GError
        
        /** Called when a packet needs to be sent by the [MultiplayerAPI], with [param buffer_size] being the size of the binary [param buffer] in bytes. */
        /* gdvirtual */ _putPacket(buffer: int64, bufferSize: int64): GError
        
        /** Called when the available packet count is internally requested by the [MultiplayerAPI]. */
        /* gdvirtual */ _getAvailablePacketCount(): int64
        
        /** Called when the maximum allowed packet size (in bytes) is requested by the [MultiplayerAPI]. */
        /* gdvirtual */ _getMaxPacketSize(): int64
        
        /** Called when a packet needs to be received by the [MultiplayerAPI], if [method _get_packet] isn't implemented. Use this when extending this class via GDScript. */
        /* gdvirtual */ _getPacketScript(): PackedByteArray
        
        /** Called when a packet needs to be sent by the [MultiplayerAPI], if [method _put_packet] isn't implemented. Use this when extending this class via GDScript. */
        /* gdvirtual */ _putPacketScript(buffer: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Called to get the channel over which the next available packet was received. See [method MultiplayerPeer.get_packet_channel]. */
        /* gdvirtual */ _getPacketChannel(): int64
        
        /** Called to get the transfer mode the remote peer used to send the next available packet. See [method MultiplayerPeer.get_packet_mode]. */
        /* gdvirtual */ _getPacketMode(): MultiplayerPeer.TransferMode
        
        /** Called when the channel to use is set for this [MultiplayerPeer] (see [member MultiplayerPeer.transfer_channel]). */
        /* gdvirtual */ _setTransferChannel(channel: int64): void
        
        /** Called when the transfer channel to use is read on this [MultiplayerPeer] (see [member MultiplayerPeer.transfer_channel]). */
        /* gdvirtual */ _getTransferChannel(): int64
        
        /** Called when the transfer mode is set on this [MultiplayerPeer] (see [member MultiplayerPeer.transfer_mode]). */
        /* gdvirtual */ _setTransferMode(mode: MultiplayerPeer.TransferMode): void
        
        /** Called when the transfer mode to use is read on this [MultiplayerPeer] (see [member MultiplayerPeer.transfer_mode]). */
        /* gdvirtual */ _getTransferMode(): MultiplayerPeer.TransferMode
        
        /** Called when the target peer to use is set for this [MultiplayerPeer] (see [method MultiplayerPeer.set_target_peer]). */
        /* gdvirtual */ _setTargetPeer(peer: int64): void
        
        /** Called when the ID of the [MultiplayerPeer] who sent the most recent packet is requested (see [method MultiplayerPeer.get_packet_peer]). */
        /* gdvirtual */ _getPacketPeer(): int64
        
        /** Called when the "is server" status is requested on the [MultiplayerAPI]. See [method MultiplayerAPI.is_server]. */
        /* gdvirtual */ _isServer(): boolean
        
        /** Called when the [MultiplayerAPI] is polled. See [method MultiplayerAPI.poll]. */
        /* gdvirtual */ _poll(): void
        
        /** Called when the multiplayer peer should be immediately closed (see [method MultiplayerPeer.close]). */
        /* gdvirtual */ _close(): void
        
        /** Called when the connected [param peer] should be forcibly disconnected (see [method MultiplayerPeer.disconnect_peer]). */
        /* gdvirtual */ _disconnectPeer(peer: int64, force: boolean): void
        
        /** Called when the unique ID of this [MultiplayerPeer] is requested (see [method MultiplayerPeer.get_unique_id]). The value must be between `1` and `2147483647`. */
        /* gdvirtual */ _getUniqueId(): int64
        
        /** Called when the "refuse new connections" status is set on this [MultiplayerPeer] (see [member MultiplayerPeer.refuse_new_connections]). */
        /* gdvirtual */ _setRefuseNewConnections(enable: boolean): void
        
        /** Called when the "refuse new connections" status is requested on this [MultiplayerPeer] (see [member MultiplayerPeer.refuse_new_connections]). */
        /* gdvirtual */ _isRefusingNewConnections(): boolean
        
        /** Called to check if the server can act as a relay in the current configuration. See [method MultiplayerPeer.is_server_relay_supported]. */
        /* gdvirtual */ _isServerRelaySupported(): boolean
        
        /** Called when the connection status is requested on the [MultiplayerPeer] (see [method MultiplayerPeer.get_connection_status]). */
        /* gdvirtual */ _getConnectionStatus(): MultiplayerPeer.ConnectionStatus
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerPeerExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerPeerExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerSpawner extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerSpawner extends __NameMapNode {
        add_spawnable_scene: "addSpawnableScene";
        get_spawnable_scene_count: "getSpawnableSceneCount";
        get_spawnable_scene: "getSpawnableScene";
        clear_spawnable_scenes: "clearSpawnableScenes";
        _spawnable_scenes: "_spawnableScenes";
        spawn_path: "spawnPath";
        spawn_limit: "spawnLimit";
        spawn_function: "spawnFunction";
    }
    /** Automatically replicates spawnable nodes from the authority to other multiplayer peers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multiplayerspawner.html  
     */
    class MultiplayerSpawner<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Adds a scene path to spawnable scenes, making it automatically replicated from the multiplayer authority to other peers when added as children of the node pointed by [member spawn_path]. */
        addSpawnableScene(path: string): void
        
        /** Returns the count of spawnable scene paths. */
        getSpawnableSceneCount(): int64
        
        /** Returns the spawnable scene path by index. */
        getSpawnableScene(index: int64): string
        
        /** Clears all spawnable scenes. Does not despawn existing instances on remote peers. */
        clearSpawnableScenes(): void
        
        /** Requests a custom spawn, with [param data] passed to [member spawn_function] on all peers. Returns the locally spawned node instance already inside the scene tree, and added as a child of the node pointed by [member spawn_path].  
         *      
         *  **Note:** Spawnable scenes are spawned automatically. [method spawn] is only needed for custom spawns.  
         */
        spawn(data?: any /* = {} */): null | Node
        get _spawnableScenes(): PackedStringArray
        set _spawnableScenes(value: PackedStringArray | string[])
        
        /** Path to the spawn root. Spawnable scenes that are added as direct children are replicated to other peers. */
        get spawnPath(): NodePath
        set spawnPath(value: NodePath | string)
        
        /** Maximum number of nodes allowed to be spawned by this spawner. Includes both spawnable scenes and custom spawns.  
         *  When set to `0` (the default), there is no limit.  
         */
        get spawnLimit(): int64
        set spawnLimit(value: int64)
        
        /** Method called on all peers when a custom [method spawn] is requested by the authority. Will receive the `data` parameter, and should return a [Node] that is not in the scene tree.  
         *      
         *  **Note:** The returned node should **not** be added to the scene with [method Node.add_child]. This is done automatically.  
         */
        get spawnFunction(): Callable
        set spawnFunction(value: Callable)
        
        /** Emitted when a spawnable scene or custom spawn was despawned by the multiplayer authority. Only called on remote peers. */
        readonly despawned: Signal<(node: Node) => void>
        
        /** Emitted when a spawnable scene or custom spawn was spawned by the multiplayer authority. Only called on remote peers. */
        readonly spawned: Signal<(node: Node) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerSpawner;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerSpawner;
    }
    namespace MultiplayerSynchronizer {
        enum VisibilityUpdateMode {
            VisibilityProcessIdle = 0,
            VisibilityProcessPhysics = 1,
            VisibilityProcessNone = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMultiplayerSynchronizer extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMultiplayerSynchronizer extends __NameMapNode {
        update_visibility: "updateVisibility";
        add_visibility_filter: "addVisibilityFilter";
        remove_visibility_filter: "removeVisibilityFilter";
        set_visibility_for: "setVisibilityFor";
        get_visibility_for: "getVisibilityFor";
        root_path: "rootPath";
        replication_interval: "replicationInterval";
        delta_interval: "deltaInterval";
        replication_config: "replicationConfig";
        visibility_update_mode: "visibilityUpdateMode";
        public_visibility: "publicVisibility";
        delta_synchronized: "deltaSynchronized";
        visibility_changed: "visibilityChanged";
    }
    /** Synchronizes properties from the multiplayer authority to the remote peers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_multiplayersynchronizer.html  
     */
    class MultiplayerSynchronizer<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Updates the visibility of [param for_peer] according to visibility filters. If [param for_peer] is `0` (the default), all peers' visibilties are updated. */
        updateVisibility(forPeer?: int64 /* = 0 */): void
        
        /** Adds a peer visibility filter for this synchronizer.  
         *  [param filter] should take a peer ID [int] and return a [bool].  
         */
        addVisibilityFilter(filter: Callable): void
        
        /** Removes a peer visibility filter from this synchronizer. */
        removeVisibilityFilter(filter: Callable): void
        
        /** Sets the visibility of [param peer] to [param visible]. If [param peer] is `0`, the value of [member public_visibility] will be updated instead. */
        setVisibilityFor(peer: int64, visible: boolean): void
        
        /** Queries the current visibility for peer [param peer]. */
        getVisibilityFor(peer: int64): boolean
        
        /** Node path that replicated properties are relative to.  
         *  If [member root_path] was spawned by a [MultiplayerSpawner], the node will be also be spawned and despawned based on this synchronizer visibility options.  
         */
        get rootPath(): NodePath
        set rootPath(value: NodePath | string)
        
        /** Time interval between synchronizations. Used when the replication is set to [constant SceneReplicationConfig.REPLICATION_MODE_ALWAYS]. If set to `0.0` (the default), synchronizations happen every network process frame. */
        get replicationInterval(): float64
        set replicationInterval(value: float64)
        
        /** Time interval between delta synchronizations. Used when the replication is set to [constant SceneReplicationConfig.REPLICATION_MODE_ON_CHANGE]. If set to `0.0` (the default), delta synchronizations happen every network process frame. */
        get deltaInterval(): float64
        set deltaInterval(value: float64)
        
        /** Resource containing which properties to synchronize. */
        get replicationConfig(): null | SceneReplicationConfig
        set replicationConfig(value: null | SceneReplicationConfig)
        
        /** Specifies when visibility filters are updated. */
        get visibilityUpdateMode(): int64
        set visibilityUpdateMode(value: int64)
        
        /** Whether synchronization should be visible to all peers by default. See [method set_visibility_for] and [method add_visibility_filter] for ways of configuring fine-grained visibility options. */
        get publicVisibility(): boolean
        set publicVisibility(value: boolean)
        
        /** Emitted when a new synchronization state is received by this synchronizer after the properties have been updated. */
        readonly synchronized: Signal<() => void>
        
        /** Emitted when a new delta synchronization state is received by this synchronizer after the properties have been updated. */
        readonly deltaSynchronized: Signal<() => void>
        
        /** Emitted when visibility of [param for_peer] is updated. See [method update_visibility]. */
        readonly visibilityChanged: Signal<(forPeer: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMultiplayerSynchronizer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMultiplayerSynchronizer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapMutex extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapMutex extends __NameMapRefCounted {
        try_lock: "tryLock";
    }
    /** A binary [Semaphore] for synchronization of multiple [Thread]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_mutex.html  
     */
    class Mutex extends RefCounted {
        constructor(identifier?: any)
        /** Locks this [Mutex], blocks until it is unlocked by the current owner.  
         *      
         *  **Note:** This function returns without blocking if the thread already has ownership of the mutex.  
         */
        lock(): void
        
        /** Tries locking this [Mutex], but does not block. Returns `true` on success, `false` otherwise.  
         *      
         *  **Note:** This function returns `true` if the thread already has ownership of the mutex.  
         */
        tryLock(): boolean
        
        /** Unlocks this [Mutex], leaving it to other threads.  
         *      
         *  **Note:** If a thread called [method lock] or [method try_lock] multiple times while already having ownership of the mutex, it must also call [method unlock] the same number of times in order to unlock it correctly.  
         *  **Warning:** Calling [method unlock] more times than [method lock] on a given thread, thus ending up trying to unlock a non-locked mutex, is wrong and may causes crashes or deadlocks.  
         */
        unlock(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapMutex;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapMutex;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationAgent2D extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationAgent2D extends __NameMapNode {
        get_rid: "getRid";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        get_path_length: "getPathLength";
        get_next_path_position: "getNextPathPosition";
        set_velocity_forced: "setVelocityForced";
        distance_to_target: "distanceToTarget";
        get_current_navigation_result: "getCurrentNavigationResult";
        get_current_navigation_path: "getCurrentNavigationPath";
        get_current_navigation_path_index: "getCurrentNavigationPathIndex";
        is_target_reached: "isTargetReached";
        is_target_reachable: "isTargetReachable";
        is_navigation_finished: "isNavigationFinished";
        get_final_position: "getFinalPosition";
        _avoidance_done: "_avoidanceDone";
        set_avoidance_layer_value: "setAvoidanceLayerValue";
        get_avoidance_layer_value: "getAvoidanceLayerValue";
        set_avoidance_mask_value: "setAvoidanceMaskValue";
        get_avoidance_mask_value: "getAvoidanceMaskValue";
        target_position: "targetPosition";
        path_desired_distance: "pathDesiredDistance";
        target_desired_distance: "targetDesiredDistance";
        path_max_distance: "pathMaxDistance";
        navigation_layers: "navigationLayers";
        pathfinding_algorithm: "pathfindingAlgorithm";
        path_postprocessing: "pathPostprocessing";
        path_metadata_flags: "pathMetadataFlags";
        simplify_path: "simplifyPath";
        simplify_epsilon: "simplifyEpsilon";
        path_return_max_length: "pathReturnMaxLength";
        path_return_max_radius: "pathReturnMaxRadius";
        path_search_max_polygons: "pathSearchMaxPolygons";
        path_search_max_distance: "pathSearchMaxDistance";
        avoidance_enabled: "avoidanceEnabled";
        neighbor_distance: "neighborDistance";
        max_neighbors: "maxNeighbors";
        time_horizon_agents: "timeHorizonAgents";
        time_horizon_obstacles: "timeHorizonObstacles";
        max_speed: "maxSpeed";
        avoidance_layers: "avoidanceLayers";
        avoidance_mask: "avoidanceMask";
        avoidance_priority: "avoidancePriority";
        debug_enabled: "debugEnabled";
        debug_use_custom: "debugUseCustom";
        debug_path_custom_color: "debugPathCustomColor";
        debug_path_custom_point_size: "debugPathCustomPointSize";
        debug_path_custom_line_width: "debugPathCustomLineWidth";
        path_changed: "pathChanged";
        target_reached: "targetReached";
        waypoint_reached: "waypointReached";
        link_reached: "linkReached";
        navigation_finished: "navigationFinished";
        velocity_computed: "velocityComputed";
    }
    /** A 2D agent used to pathfind to a position while avoiding obstacles.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationagent2d.html  
     */
    class NavigationAgent2D<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this agent on the [NavigationServer2D]. */
        getRid(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Sets the [RID] of the navigation map this NavigationAgent node should use and also updates the `agent` on the NavigationServer. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the [RID] of the navigation map for this NavigationAgent node. This function returns always the map set on the NavigationAgent node and not the map of the abstract agent on the NavigationServer. If the agent map is changed directly with the NavigationServer API the NavigationAgent node will not be aware of the map change. Use [method set_navigation_map] to change the navigation map for the NavigationAgent and also update the agent on the NavigationServer. */
        getNavigationMap(): Rid
        
        /** Returns the length of the currently calculated path. The returned value is `0.0`, if the path is still calculating or no calculation has been requested yet. */
        getPathLength(): float64
        
        /** Returns the next position in global coordinates that can be moved to, making sure that there are no static objects in the way. If the agent does not have a navigation path, it will return the position of the agent's parent. The use of this function once every physics frame is required to update the internal path logic of the NavigationAgent. */
        getNextPathPosition(): Vector2
        
        /** Replaces the internal velocity in the collision avoidance simulation with [param velocity]. When an agent is teleported to a new position this function should be used in the same frame. If called frequently this function can get agents stuck. */
        setVelocityForced(velocity: Vector2): void
        
        /** Returns the distance to the target position, using the agent's global position. The user must set [member target_position] in order for this to be accurate. */
        distanceToTarget(): float64
        
        /** Returns the path query result for the path the agent is currently following. */
        getCurrentNavigationResult(): null | NavigationPathQueryResult2D
        
        /** Returns this agent's current path from start to finish in global coordinates. The path only updates when the target position is changed or the agent requires a repath. The path array is not intended to be used in direct path movement as the agent has its own internal path logic that would get corrupted by changing the path array manually. Use the intended [method get_next_path_position] once every physics frame to receive the next path point for the agent's movement as this function also updates the internal path logic. */
        getCurrentNavigationPath(): PackedVector2Array
        
        /** Returns which index the agent is currently on in the navigation path's [PackedVector2Array]. */
        getCurrentNavigationPathIndex(): int64
        
        /** Returns `true` if the agent reached the target, i.e. the agent moved within [member target_desired_distance] of the [member target_position]. It may not always be possible to reach the target but it should always be possible to reach the final position. See [method get_final_position]. */
        isTargetReached(): boolean
        
        /** Returns `true` if [method get_final_position] is within [member target_desired_distance] of the [member target_position]. */
        isTargetReachable(): boolean
        
        /** Returns `true` if the agent's navigation has finished. If the target is reachable, navigation ends when the target is reached. If the target is unreachable, navigation ends when the last waypoint of the path is reached.  
         *      
         *  **Note:** While `true` prefer to stop calling update functions like [method get_next_path_position]. This avoids jittering the standing agent due to calling repeated path updates.  
         */
        isNavigationFinished(): boolean
        
        /** Returns the reachable final position of the current navigation path in global coordinates. This position can change if the agent needs to update the navigation path which makes the agent emit the [signal path_changed] signal. */
        getFinalPosition(): Vector2
        _avoidanceDone(newVelocity: Vector2): void
        
        /** Based on [param value], enables or disables the specified layer in the [member avoidance_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setAvoidanceLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member avoidance_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getAvoidanceLayerValue(layerNumber: int64): boolean
        
        /** Based on [param value], enables or disables the specified mask in the [member avoidance_mask] bitmask, given a [param mask_number] between 1 and 32. */
        setAvoidanceMaskValue(maskNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified mask of the [member avoidance_mask] bitmask is enabled, given a [param mask_number] between 1 and 32. */
        getAvoidanceMaskValue(maskNumber: int64): boolean
        
        /** If set, a new navigation path from the current agent position to the [member target_position] is requested from the NavigationServer. */
        get targetPosition(): Vector2
        set targetPosition(value: Vector2)
        
        /** The distance threshold before a path point is considered to be reached. This allows agents to not have to hit a path point on the path exactly, but only to reach its general area. If this value is set too high, the NavigationAgent will skip points on the path, which can lead to it leaving the navigation mesh. If this value is set too low, the NavigationAgent will be stuck in a repath loop because it will constantly overshoot the distance to the next point on each physics frame update. */
        get pathDesiredDistance(): float64
        set pathDesiredDistance(value: float64)
        
        /** The distance threshold before the target is considered to be reached. On reaching the target, [signal target_reached] is emitted and navigation ends (see [method is_navigation_finished] and [signal navigation_finished]).  
         *  You can make navigation end early by setting this property to a value greater than [member path_desired_distance] (navigation will end before reaching the last waypoint).  
         *  You can also make navigation end closer to the target than each individual path position by setting this property to a value lower than [member path_desired_distance] (navigation won't immediately end when reaching the last waypoint). However, if the value set is too low, the agent will be stuck in a repath loop because it will constantly overshoot the distance to the target on each physics frame update.  
         */
        get targetDesiredDistance(): float64
        set targetDesiredDistance(value: float64)
        
        /** The maximum distance the agent is allowed away from the ideal path to the final position. This can happen due to trying to avoid collisions. When the maximum distance is exceeded, it recalculates the ideal path. */
        get pathMaxDistance(): float64
        set pathMaxDistance(value: float64)
        
        /** A bitfield determining which navigation layers of navigation regions this agent will use to calculate a path. Changing it during runtime will clear the current navigation path and generate a new one, according to the new navigation layers. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** The pathfinding algorithm used in the path query. */
        get pathfindingAlgorithm(): int64
        set pathfindingAlgorithm(value: int64)
        
        /** The path postprocessing applied to the raw path corridor found by the [member pathfinding_algorithm]. */
        get pathPostprocessing(): int64
        set pathPostprocessing(value: int64)
        
        /** Additional information to return with the navigation path. */
        get pathMetadataFlags(): int64
        set pathMetadataFlags(value: int64)
        
        /** If `true` a simplified version of the path will be returned with less critical path points removed. The simplification amount is controlled by [member simplify_epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        get simplifyPath(): boolean
        set simplifyPath(value: boolean)
        
        /** The path simplification amount in world units. */
        get simplifyEpsilon(): float64
        set simplifyEpsilon(value: float64)
        
        /** The maximum allowed length of the returned path in world units. A path will be clipped when going over this length. */
        get pathReturnMaxLength(): float64
        set pathReturnMaxLength(value: float64)
        
        /** The maximum allowed radius in world units that the returned path can be from the path start. The path will be clipped when going over this radius. Compared to [member path_return_max_length], this allows the agent to go that much further, if they need to walk around a corner.  
         *      
         *  **Note:** This will perform a sphere clip considering only the actual navigation mesh path points with the first path position being the sphere's center.  
         */
        get pathReturnMaxRadius(): float64
        set pathReturnMaxRadius(value: float64)
        
        /** The maximum number of polygons that are searched before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxPolygons(): int64
        set pathSearchMaxPolygons(value: int64)
        
        /** The maximum distance a searched polygon can be away from the start polygon before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxDistance(): float64
        set pathSearchMaxDistance(value: float64)
        
        /** If `true` the agent is registered for an RVO avoidance callback on the [NavigationServer2D]. When [member velocity] is used and the processing is completed a `safe_velocity` Vector2 is received with a signal connection to [signal velocity_computed]. Avoidance processing with many registered agents has a significant performance cost and should only be enabled on agents that currently require it. */
        get avoidanceEnabled(): boolean
        set avoidanceEnabled(value: boolean)
        
        /** Sets the new wanted velocity for the agent. The avoidance simulation will try to fulfill this velocity if possible but will modify it to avoid collision with other agents and obstacles. When an agent is teleported to a new position, use [method set_velocity_forced] as well to reset the internal simulation velocity. */
        get velocity(): Vector2
        set velocity(value: Vector2)
        
        /** The radius of the avoidance agent. This is the "body" of the avoidance agent and not the avoidance maneuver starting radius (which is controlled by [member neighbor_distance]).  
         *  Does not affect normal pathfinding. To change an actor's pathfinding radius bake [NavigationPolygon] resources with a different [member NavigationPolygon.agent_radius] property and use different navigation maps for each actor size.  
         */
        get radius(): float64
        set radius(value: float64)
        
        /** The distance to search for other agents. */
        get neighborDistance(): float64
        set neighborDistance(value: float64)
        
        /** The maximum number of neighbors for the agent to consider. */
        get maxNeighbors(): int64
        set maxNeighbors(value: int64)
        
        /** The minimal amount of time for which this agent's velocities, that are computed with the collision avoidance algorithm, are safe with respect to other agents. The larger the number, the sooner the agent will respond to other agents, but less freedom in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        get timeHorizonAgents(): float64
        set timeHorizonAgents(value: float64)
        
        /** The minimal amount of time for which this agent's velocities, that are computed with the collision avoidance algorithm, are safe with respect to static avoidance obstacles. The larger the number, the sooner the agent will respond to static avoidance obstacles, but less freedom in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        get timeHorizonObstacles(): float64
        set timeHorizonObstacles(value: float64)
        
        /** The maximum speed that an agent can move. */
        get maxSpeed(): float64
        set maxSpeed(value: float64)
        
        /** A bitfield determining the avoidance layers for this NavigationAgent. Other agents with a matching bit on the [member avoidance_mask] will avoid this agent. */
        get avoidanceLayers(): int64
        set avoidanceLayers(value: int64)
        
        /** A bitfield determining what other avoidance agents and obstacles this NavigationAgent will avoid when a bit matches at least one of their [member avoidance_layers]. */
        get avoidanceMask(): int64
        set avoidanceMask(value: int64)
        
        /** The agent does not adjust the velocity for other agents that would match the [member avoidance_mask] but have a lower [member avoidance_priority]. This in turn makes the other agents with lower priority adjust their velocities even more to avoid collision with this agent. */
        get avoidancePriority(): float64
        set avoidancePriority(value: float64)
        
        /** If `true` shows debug visuals for this agent. */
        get debugEnabled(): boolean
        set debugEnabled(value: boolean)
        
        /** If `true` uses the defined [member debug_path_custom_color] for this agent instead of global color. */
        get debugUseCustom(): boolean
        set debugUseCustom(value: boolean)
        
        /** If [member debug_use_custom] is `true` uses this color for this agent instead of global color. */
        get debugPathCustomColor(): Color
        set debugPathCustomColor(value: Color)
        
        /** If [member debug_use_custom] is `true` uses this rasterized point size for rendering path points for this agent instead of global point size. */
        get debugPathCustomPointSize(): float64
        set debugPathCustomPointSize(value: float64)
        
        /** If [member debug_use_custom] is `true` uses this line width for rendering paths for this agent instead of global line width. */
        get debugPathCustomLineWidth(): float64
        set debugPathCustomLineWidth(value: float64)
        
        /** Emitted when the agent had to update the loaded path:  
         *  - because path was previously empty.  
         *  - because navigation map has changed.  
         *  - because agent pushed further away from the current path segment than the [member path_max_distance].  
         */
        readonly pathChanged: Signal<() => void>
        
        /** Signals that the agent reached the target, i.e. the agent moved within [member target_desired_distance] of the [member target_position]. This signal is emitted only once per loaded path.  
         *  This signal will be emitted just before [signal navigation_finished] when the target is reachable.  
         *  It may not always be possible to reach the target but it should always be possible to reach the final position. See [method get_final_position].  
         */
        readonly targetReached: Signal<() => void>
        
        /** Signals that the agent reached a waypoint. Emitted when the agent moves within [member path_desired_distance] of the next position of the path.  
         *  The details dictionary may contain the following keys depending on the value of [member path_metadata_flags]:  
         *  - `position`: The position of the waypoint that was reached.  
         *  - `type`: The type of navigation primitive (region or link) that contains this waypoint.  
         *  - `rid`: The [RID] of the containing navigation primitive (region or link).  
         *  - `owner`: The object which manages the containing navigation primitive (region or link).  
         */
        readonly waypointReached: Signal<(details: GDictionary) => void>
        
        /** Signals that the agent reached a navigation link. Emitted when the agent moves within [member path_desired_distance] of the next position of the path when that position is a navigation link.  
         *  The details dictionary may contain the following keys depending on the value of [member path_metadata_flags]:  
         *  - `position`: The start position of the link that was reached.  
         *  - `type`: Always [constant NavigationPathQueryResult2D.PATH_SEGMENT_TYPE_LINK].  
         *  - `rid`: The [RID] of the link.  
         *  - `owner`: The object which manages the link (usually [NavigationLink2D]).  
         *  - `link_entry_position`: If `owner` is available and the owner is a [NavigationLink2D], it will contain the global position of the link's point the agent is entering.  
         *  - `link_exit_position`: If `owner` is available and the owner is a [NavigationLink2D], it will contain the global position of the link's point which the agent is exiting.  
         */
        readonly linkReached: Signal<(details: GDictionary) => void>
        
        /** Signals that the agent's navigation has finished. If the target is reachable, navigation ends when the target is reached. If the target is unreachable, navigation ends when the last waypoint of the path is reached. This signal is emitted only once per loaded path.  
         *  This signal will be emitted just after [signal target_reached] when the target is reachable.  
         */
        readonly navigationFinished: Signal<() => void>
        
        /** Notifies when the collision avoidance velocity is calculated. Emitted every update as long as [member avoidance_enabled] is `true` and the agent has a navigation map. */
        readonly velocityComputed: Signal<(safeVelocity: Vector2) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationAgent2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationAgent2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationAgent3D extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationAgent3D extends __NameMapNode {
        get_rid: "getRid";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        get_path_length: "getPathLength";
        get_next_path_position: "getNextPathPosition";
        set_velocity_forced: "setVelocityForced";
        distance_to_target: "distanceToTarget";
        get_current_navigation_result: "getCurrentNavigationResult";
        get_current_navigation_path: "getCurrentNavigationPath";
        get_current_navigation_path_index: "getCurrentNavigationPathIndex";
        is_target_reached: "isTargetReached";
        is_target_reachable: "isTargetReachable";
        is_navigation_finished: "isNavigationFinished";
        get_final_position: "getFinalPosition";
        _avoidance_done: "_avoidanceDone";
        set_avoidance_layer_value: "setAvoidanceLayerValue";
        get_avoidance_layer_value: "getAvoidanceLayerValue";
        set_avoidance_mask_value: "setAvoidanceMaskValue";
        get_avoidance_mask_value: "getAvoidanceMaskValue";
        target_position: "targetPosition";
        path_desired_distance: "pathDesiredDistance";
        target_desired_distance: "targetDesiredDistance";
        path_height_offset: "pathHeightOffset";
        path_max_distance: "pathMaxDistance";
        navigation_layers: "navigationLayers";
        pathfinding_algorithm: "pathfindingAlgorithm";
        path_postprocessing: "pathPostprocessing";
        path_metadata_flags: "pathMetadataFlags";
        simplify_path: "simplifyPath";
        simplify_epsilon: "simplifyEpsilon";
        path_return_max_length: "pathReturnMaxLength";
        path_return_max_radius: "pathReturnMaxRadius";
        path_search_max_polygons: "pathSearchMaxPolygons";
        path_search_max_distance: "pathSearchMaxDistance";
        avoidance_enabled: "avoidanceEnabled";
        neighbor_distance: "neighborDistance";
        max_neighbors: "maxNeighbors";
        time_horizon_agents: "timeHorizonAgents";
        time_horizon_obstacles: "timeHorizonObstacles";
        max_speed: "maxSpeed";
        use_3d_avoidance: "use3DAvoidance";
        keep_y_velocity: "keepYVelocity";
        avoidance_layers: "avoidanceLayers";
        avoidance_mask: "avoidanceMask";
        avoidance_priority: "avoidancePriority";
        debug_enabled: "debugEnabled";
        debug_use_custom: "debugUseCustom";
        debug_path_custom_color: "debugPathCustomColor";
        debug_path_custom_point_size: "debugPathCustomPointSize";
        path_changed: "pathChanged";
        target_reached: "targetReached";
        waypoint_reached: "waypointReached";
        link_reached: "linkReached";
        navigation_finished: "navigationFinished";
        velocity_computed: "velocityComputed";
    }
    /** A 3D agent used to pathfind to a position while avoiding obstacles.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationagent3d.html  
     */
    class NavigationAgent3D<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this agent on the [NavigationServer3D]. */
        getRid(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Sets the [RID] of the navigation map this NavigationAgent node should use and also updates the `agent` on the NavigationServer. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the [RID] of the navigation map for this NavigationAgent node. This function returns always the map set on the NavigationAgent node and not the map of the abstract agent on the NavigationServer. If the agent map is changed directly with the NavigationServer API the NavigationAgent node will not be aware of the map change. Use [method set_navigation_map] to change the navigation map for the NavigationAgent and also update the agent on the NavigationServer. */
        getNavigationMap(): Rid
        
        /** Returns the length of the currently calculated path. The returned value is `0.0`, if the path is still calculating or no calculation has been requested yet. */
        getPathLength(): float64
        
        /** Returns the next position in global coordinates that can be moved to, making sure that there are no static objects in the way. If the agent does not have a navigation path, it will return the position of the agent's parent. The use of this function once every physics frame is required to update the internal path logic of the NavigationAgent. */
        getNextPathPosition(): Vector3
        
        /** Replaces the internal velocity in the collision avoidance simulation with [param velocity]. When an agent is teleported to a new position this function should be used in the same frame. If called frequently this function can get agents stuck. */
        setVelocityForced(velocity: Vector3): void
        
        /** Returns the distance to the target position, using the agent's global position. The user must set [member target_position] in order for this to be accurate. */
        distanceToTarget(): float64
        
        /** Returns the path query result for the path the agent is currently following. */
        getCurrentNavigationResult(): null | NavigationPathQueryResult3D
        
        /** Returns this agent's current path from start to finish in global coordinates. The path only updates when the target position is changed or the agent requires a repath. The path array is not intended to be used in direct path movement as the agent has its own internal path logic that would get corrupted by changing the path array manually. Use the intended [method get_next_path_position] once every physics frame to receive the next path point for the agent's movement as this function also updates the internal path logic. */
        getCurrentNavigationPath(): PackedVector3Array
        
        /** Returns which index the agent is currently on in the navigation path's [PackedVector3Array]. */
        getCurrentNavigationPathIndex(): int64
        
        /** Returns `true` if the agent reached the target, i.e. the agent moved within [member target_desired_distance] of the [member target_position]. It may not always be possible to reach the target but it should always be possible to reach the final position. See [method get_final_position]. */
        isTargetReached(): boolean
        
        /** Returns `true` if [method get_final_position] is within [member target_desired_distance] of the [member target_position]. */
        isTargetReachable(): boolean
        
        /** Returns `true` if the agent's navigation has finished. If the target is reachable, navigation ends when the target is reached. If the target is unreachable, navigation ends when the last waypoint of the path is reached.  
         *      
         *  **Note:** While `true` prefer to stop calling update functions like [method get_next_path_position]. This avoids jittering the standing agent due to calling repeated path updates.  
         */
        isNavigationFinished(): boolean
        
        /** Returns the reachable final position of the current navigation path in global coordinates. This position can change if the agent needs to update the navigation path which makes the agent emit the [signal path_changed] signal. */
        getFinalPosition(): Vector3
        _avoidanceDone(newVelocity: Vector3): void
        
        /** Based on [param value], enables or disables the specified layer in the [member avoidance_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setAvoidanceLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member avoidance_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getAvoidanceLayerValue(layerNumber: int64): boolean
        
        /** Based on [param value], enables or disables the specified mask in the [member avoidance_mask] bitmask, given a [param mask_number] between 1 and 32. */
        setAvoidanceMaskValue(maskNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified mask of the [member avoidance_mask] bitmask is enabled, given a [param mask_number] between 1 and 32. */
        getAvoidanceMaskValue(maskNumber: int64): boolean
        
        /** If set, a new navigation path from the current agent position to the [member target_position] is requested from the NavigationServer. */
        get targetPosition(): Vector3
        set targetPosition(value: Vector3)
        
        /** The distance threshold before a path point is considered to be reached. This allows agents to not have to hit a path point on the path exactly, but only to reach its general area. If this value is set too high, the NavigationAgent will skip points on the path, which can lead to it leaving the navigation mesh. If this value is set too low, the NavigationAgent will be stuck in a repath loop because it will constantly overshoot the distance to the next point on each physics frame update. */
        get pathDesiredDistance(): float64
        set pathDesiredDistance(value: float64)
        
        /** The distance threshold before the target is considered to be reached. On reaching the target, [signal target_reached] is emitted and navigation ends (see [method is_navigation_finished] and [signal navigation_finished]).  
         *  You can make navigation end early by setting this property to a value greater than [member path_desired_distance] (navigation will end before reaching the last waypoint).  
         *  You can also make navigation end closer to the target than each individual path position by setting this property to a value lower than [member path_desired_distance] (navigation won't immediately end when reaching the last waypoint). However, if the value set is too low, the agent will be stuck in a repath loop because it will constantly overshoot the distance to the target on each physics frame update.  
         */
        get targetDesiredDistance(): float64
        set targetDesiredDistance(value: float64)
        
        /** The height offset is subtracted from the y-axis value of any vector path position for this NavigationAgent. The NavigationAgent height offset does not change or influence the navigation mesh or pathfinding query result. Additional navigation maps that use regions with navigation meshes that the developer baked with appropriate agent radius or height values are required to support different-sized agents. */
        get pathHeightOffset(): float64
        set pathHeightOffset(value: float64)
        
        /** The maximum distance the agent is allowed away from the ideal path to the final position. This can happen due to trying to avoid collisions. When the maximum distance is exceeded, it recalculates the ideal path. */
        get pathMaxDistance(): float64
        set pathMaxDistance(value: float64)
        
        /** A bitfield determining which navigation layers of navigation regions this agent will use to calculate a path. Changing it during runtime will clear the current navigation path and generate a new one, according to the new navigation layers. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** The pathfinding algorithm used in the path query. */
        get pathfindingAlgorithm(): int64
        set pathfindingAlgorithm(value: int64)
        
        /** The path postprocessing applied to the raw path corridor found by the [member pathfinding_algorithm]. */
        get pathPostprocessing(): int64
        set pathPostprocessing(value: int64)
        
        /** Additional information to return with the navigation path. */
        get pathMetadataFlags(): int64
        set pathMetadataFlags(value: int64)
        
        /** If `true` a simplified version of the path will be returned with less critical path points removed. The simplification amount is controlled by [member simplify_epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        get simplifyPath(): boolean
        set simplifyPath(value: boolean)
        
        /** The path simplification amount in world units. */
        get simplifyEpsilon(): float64
        set simplifyEpsilon(value: float64)
        
        /** The maximum allowed length of the returned path in world units. A path will be clipped when going over this length. */
        get pathReturnMaxLength(): float64
        set pathReturnMaxLength(value: float64)
        
        /** The maximum allowed radius in world units that the returned path can be from the path start. The path will be clipped when going over this radius. Compared to [member path_return_max_length], this allows the agent to go that much further, if they need to walk around a corner.  
         *      
         *  **Note:** This will perform a sphere clip considering only the actual navigation mesh path points with the first path position being the sphere's center.  
         */
        get pathReturnMaxRadius(): float64
        set pathReturnMaxRadius(value: float64)
        
        /** The maximum number of polygons that are searched before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxPolygons(): int64
        set pathSearchMaxPolygons(value: int64)
        
        /** The maximum distance a searched polygon can be away from the start polygon before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxDistance(): float64
        set pathSearchMaxDistance(value: float64)
        
        /** If `true` the agent is registered for an RVO avoidance callback on the [NavigationServer3D]. When [member velocity] is set and the processing is completed a `safe_velocity` Vector3 is received with a signal connection to [signal velocity_computed]. Avoidance processing with many registered agents has a significant performance cost and should only be enabled on agents that currently require it. */
        get avoidanceEnabled(): boolean
        set avoidanceEnabled(value: boolean)
        
        /** Sets the new wanted velocity for the agent. The avoidance simulation will try to fulfill this velocity if possible but will modify it to avoid collision with other agents and obstacles. When an agent is teleported to a new position, use [method set_velocity_forced] as well to reset the internal simulation velocity. */
        get velocity(): Vector3
        set velocity(value: Vector3)
        
        /** The height of the avoidance agent. Agents will ignore other agents or obstacles that are above or below their current position + height in 2D avoidance. Does nothing in 3D avoidance which uses radius spheres alone. */
        get height(): float64
        set height(value: float64)
        
        /** The radius of the avoidance agent. This is the "body" of the avoidance agent and not the avoidance maneuver starting radius (which is controlled by [member neighbor_distance]).  
         *  Does not affect normal pathfinding. To change an actor's pathfinding radius bake [NavigationMesh] resources with a different [member NavigationMesh.agent_radius] property and use different navigation maps for each actor size.  
         */
        get radius(): float64
        set radius(value: float64)
        
        /** The distance to search for other agents. */
        get neighborDistance(): float64
        set neighborDistance(value: float64)
        
        /** The maximum number of neighbors for the agent to consider. */
        get maxNeighbors(): int64
        set maxNeighbors(value: int64)
        
        /** The minimal amount of time for which this agent's velocities, that are computed with the collision avoidance algorithm, are safe with respect to other agents. The larger the number, the sooner the agent will respond to other agents, but less freedom in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        get timeHorizonAgents(): float64
        set timeHorizonAgents(value: float64)
        
        /** The minimal amount of time for which this agent's velocities, that are computed with the collision avoidance algorithm, are safe with respect to static avoidance obstacles. The larger the number, the sooner the agent will respond to static avoidance obstacles, but less freedom in choosing its velocities. A too high value will slow down agent movement considerably. Must be positive. */
        get timeHorizonObstacles(): float64
        set timeHorizonObstacles(value: float64)
        
        /** The maximum speed that an agent can move. */
        get maxSpeed(): float64
        set maxSpeed(value: float64)
        
        /** If `true`, the agent calculates avoidance velocities in 3D omnidirectionally, e.g. for games that take place in air, underwater or space. Agents using 3D avoidance only avoid other agents using 3D avoidance, and react to radius-based avoidance obstacles. They ignore any vertex-based obstacles.  
         *  If `false`, the agent calculates avoidance velocities in 2D along the x and z-axes, ignoring the y-axis. Agents using 2D avoidance only avoid other agents using 2D avoidance, and react to radius-based avoidance obstacles or vertex-based avoidance obstacles. Other agents using 2D avoidance that are below or above their current position including [member height] are ignored.  
         */
        get use3DAvoidance(): boolean
        set use3DAvoidance(value: boolean)
        
        /** If `true`, and the agent uses 2D avoidance, it will remember the set y-axis velocity and reapply it after the avoidance step. While 2D avoidance has no y-axis and simulates on a flat plane this setting can help to soften the most obvious clipping on uneven 3D geometry. */
        get keepYVelocity(): boolean
        set keepYVelocity(value: boolean)
        
        /** A bitfield determining the avoidance layers for this NavigationAgent. Other agents with a matching bit on the [member avoidance_mask] will avoid this agent. */
        get avoidanceLayers(): int64
        set avoidanceLayers(value: int64)
        
        /** A bitfield determining what other avoidance agents and obstacles this NavigationAgent will avoid when a bit matches at least one of their [member avoidance_layers]. */
        get avoidanceMask(): int64
        set avoidanceMask(value: int64)
        
        /** The agent does not adjust the velocity for other agents that would match the [member avoidance_mask] but have a lower [member avoidance_priority]. This in turn makes the other agents with lower priority adjust their velocities even more to avoid collision with this agent. */
        get avoidancePriority(): float64
        set avoidancePriority(value: float64)
        
        /** If `true` shows debug visuals for this agent. */
        get debugEnabled(): boolean
        set debugEnabled(value: boolean)
        
        /** If `true` uses the defined [member debug_path_custom_color] for this agent instead of global color. */
        get debugUseCustom(): boolean
        set debugUseCustom(value: boolean)
        
        /** If [member debug_use_custom] is `true` uses this color for this agent instead of global color. */
        get debugPathCustomColor(): Color
        set debugPathCustomColor(value: Color)
        
        /** If [member debug_use_custom] is `true` uses this rasterized point size for rendering path points for this agent instead of global point size. */
        get debugPathCustomPointSize(): float64
        set debugPathCustomPointSize(value: float64)
        
        /** Emitted when the agent had to update the loaded path:  
         *  - because path was previously empty.  
         *  - because navigation map has changed.  
         *  - because agent pushed further away from the current path segment than the [member path_max_distance].  
         */
        readonly pathChanged: Signal<() => void>
        
        /** Signals that the agent reached the target, i.e. the agent moved within [member target_desired_distance] of the [member target_position]. This signal is emitted only once per loaded path.  
         *  This signal will be emitted just before [signal navigation_finished] when the target is reachable.  
         *  It may not always be possible to reach the target but it should always be possible to reach the final position. See [method get_final_position].  
         */
        readonly targetReached: Signal<() => void>
        
        /** Signals that the agent reached a waypoint. Emitted when the agent moves within [member path_desired_distance] of the next position of the path.  
         *  The details dictionary may contain the following keys depending on the value of [member path_metadata_flags]:  
         *  - `position`: The position of the waypoint that was reached.  
         *  - `type`: The type of navigation primitive (region or link) that contains this waypoint.  
         *  - `rid`: The [RID] of the containing navigation primitive (region or link).  
         *  - `owner`: The object which manages the containing navigation primitive (region or link).  
         */
        readonly waypointReached: Signal<(details: GDictionary) => void>
        
        /** Signals that the agent reached a navigation link. Emitted when the agent moves within [member path_desired_distance] of the next position of the path when that position is a navigation link.  
         *  The details dictionary may contain the following keys depending on the value of [member path_metadata_flags]:  
         *  - `position`: The start position of the link that was reached.  
         *  - `type`: Always [constant NavigationPathQueryResult3D.PATH_SEGMENT_TYPE_LINK].  
         *  - `rid`: The [RID] of the link.  
         *  - `owner`: The object which manages the link (usually [NavigationLink3D]).  
         *  - `link_entry_position`: If `owner` is available and the owner is a [NavigationLink3D], it will contain the global position of the link's point the agent is entering.  
         *  - `link_exit_position`: If `owner` is available and the owner is a [NavigationLink3D], it will contain the global position of the link's point which the agent is exiting.  
         */
        readonly linkReached: Signal<(details: GDictionary) => void>
        
        /** Signals that the agent's navigation has finished. If the target is reachable, navigation ends when the target is reached. If the target is unreachable, navigation ends when the last waypoint of the path is reached. This signal is emitted only once per loaded path.  
         *  This signal will be emitted just after [signal target_reached] when the target is reachable.  
         */
        readonly navigationFinished: Signal<() => void>
        
        /** Notifies when the collision avoidance velocity is calculated. Emitted every update as long as [member avoidance_enabled] is `true` and the agent has a navigation map. */
        readonly velocityComputed: Signal<(safeVelocity: Vector3) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationAgent3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationAgent3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationLink2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationLink2D extends __NameMapNode2D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        set_global_start_position: "setGlobalStartPosition";
        get_global_start_position: "getGlobalStartPosition";
        set_global_end_position: "setGlobalEndPosition";
        get_global_end_position: "getGlobalEndPosition";
        navigation_layers: "navigationLayers";
        start_position: "startPosition";
        end_position: "endPosition";
        enter_cost: "enterCost";
        travel_cost: "travelCost";
    }
    /** A link between two positions on [NavigationRegion2D]s that agents can be routed through.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationlink2d.html  
     */
    class NavigationLink2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this link on the [NavigationServer2D]. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this link should use. By default the link will automatically join the [World2D] default navigation map so this function is only required to override the default map. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the current navigation map [RID] used by this link. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Sets the [member start_position] that is relative to the link from a global [param position]. */
        setGlobalStartPosition(position: Vector2): void
        
        /** Returns the [member start_position] that is relative to the link as a global position. */
        getGlobalStartPosition(): Vector2
        
        /** Sets the [member end_position] that is relative to the link from a global [param position]. */
        setGlobalEndPosition(position: Vector2): void
        
        /** Returns the [member end_position] that is relative to the link as a global position. */
        getGlobalEndPosition(): Vector2
        
        /** Whether this link is currently active. If `false`, [method NavigationServer2D.map_get_path] will ignore this link. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** Whether this link can be traveled in both directions or only from [member start_position] to [member end_position]. */
        get bidirectional(): boolean
        set bidirectional(value: boolean)
        
        /** A bitfield determining all navigation layers the link belongs to. These navigation layers will be checked when requesting a path with [method NavigationServer2D.map_get_path]. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** Starting position of the link.  
         *  This position will search out the nearest polygon in the navigation mesh to attach to.  
         *  The distance the link will search is controlled by [method NavigationServer2D.map_set_link_connection_radius].  
         */
        get startPosition(): Vector2
        set startPosition(value: Vector2)
        
        /** Ending position of the link.  
         *  This position will search out the nearest polygon in the navigation mesh to attach to.  
         *  The distance the link will search is controlled by [method NavigationServer2D.map_set_link_connection_radius].  
         */
        get endPosition(): Vector2
        set endPosition(value: Vector2)
        
        /** When pathfinding enters this link from another region's navigation mesh the [member enter_cost] value is added to the path distance for determining the shortest path. */
        get enterCost(): float64
        set enterCost(value: float64)
        
        /** When pathfinding moves along the link the traveled distance is multiplied with [member travel_cost] for determining the shortest path. */
        get travelCost(): float64
        set travelCost(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationLink2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationLink2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationLink3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationLink3D extends __NameMapNode3D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        set_global_start_position: "setGlobalStartPosition";
        get_global_start_position: "getGlobalStartPosition";
        set_global_end_position: "setGlobalEndPosition";
        get_global_end_position: "getGlobalEndPosition";
        navigation_layers: "navigationLayers";
        start_position: "startPosition";
        end_position: "endPosition";
        enter_cost: "enterCost";
        travel_cost: "travelCost";
    }
    /** A link between two positions on [NavigationRegion3D]s that agents can be routed through.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationlink3d.html  
     */
    class NavigationLink3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this link on the [NavigationServer3D]. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this link should use. By default the link will automatically join the [World3D] default navigation map so this function is only required to override the default map. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the current navigation map [RID] used by this link. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Sets the [member start_position] that is relative to the link from a global [param position]. */
        setGlobalStartPosition(position: Vector3): void
        
        /** Returns the [member start_position] that is relative to the link as a global position. */
        getGlobalStartPosition(): Vector3
        
        /** Sets the [member end_position] that is relative to the link from a global [param position]. */
        setGlobalEndPosition(position: Vector3): void
        
        /** Returns the [member end_position] that is relative to the link as a global position. */
        getGlobalEndPosition(): Vector3
        
        /** Whether this link is currently active. If `false`, [method NavigationServer3D.map_get_path] will ignore this link. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** Whether this link can be traveled in both directions or only from [member start_position] to [member end_position]. */
        get bidirectional(): boolean
        set bidirectional(value: boolean)
        
        /** A bitfield determining all navigation layers the link belongs to. These navigation layers will be checked when requesting a path with [method NavigationServer3D.map_get_path]. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** Starting position of the link.  
         *  This position will search out the nearest polygon in the navigation mesh to attach to.  
         *  The distance the link will search is controlled by [method NavigationServer3D.map_set_link_connection_radius].  
         */
        get startPosition(): Vector3
        set startPosition(value: Vector3)
        
        /** Ending position of the link.  
         *  This position will search out the nearest polygon in the navigation mesh to attach to.  
         *  The distance the link will search is controlled by [method NavigationServer3D.map_set_link_connection_radius].  
         */
        get endPosition(): Vector3
        set endPosition(value: Vector3)
        
        /** When pathfinding enters this link from another region's navigation mesh the [member enter_cost] value is added to the path distance for determining the shortest path. */
        get enterCost(): float64
        set enterCost(value: float64)
        
        /** When pathfinding moves along the link the traveled distance is multiplied with [member travel_cost] for determining the shortest path. */
        get travelCost(): float64
        set travelCost(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationLink3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationLink3D;
    }
    namespace NavigationMesh {
        enum SamplePartitionType {
            SamplePartitionWatershed = 0,
            SamplePartitionMonotone = 1,
            SamplePartitionLayers = 2,
            SamplePartitionMax = 3,
        }
        enum ParsedGeometryType {
            ParsedGeometryMeshInstances = 0,
            ParsedGeometryStaticColliders = 1,
            ParsedGeometryBoth = 2,
            ParsedGeometryMax = 3,
        }
        enum SourceGeometryMode {
            SourceGeometryRootNodeChildren = 0,
            SourceGeometryGroupsWithChildren = 1,
            SourceGeometryGroupsExplicit = 2,
            SourceGeometryMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationMesh extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationMesh extends __NameMapResource {
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        add_polygon: "addPolygon";
        get_polygon_count: "getPolygonCount";
        get_polygon: "getPolygon";
        clear_polygons: "clearPolygons";
        create_from_mesh: "createFromMesh";
        sample_partition_type: "samplePartitionType";
        geometry_parsed_geometry_type: "geometryParsedGeometryType";
        geometry_collision_mask: "geometryCollisionMask";
        geometry_source_geometry_mode: "geometrySourceGeometryMode";
        geometry_source_group_name: "geometrySourceGroupName";
        cell_size: "cellSize";
        cell_height: "cellHeight";
        border_size: "borderSize";
        agent_height: "agentHeight";
        agent_radius: "agentRadius";
        agent_max_climb: "agentMaxClimb";
        agent_max_slope: "agentMaxSlope";
        region_min_size: "regionMinSize";
        region_merge_size: "regionMergeSize";
        edge_max_length: "edgeMaxLength";
        edge_max_error: "edgeMaxError";
        vertices_per_polygon: "verticesPerPolygon";
        detail_sample_distance: "detailSampleDistance";
        detail_sample_max_error: "detailSampleMaxError";
        filter_low_hanging_obstacles: "filterLowHangingObstacles";
        filter_ledge_spans: "filterLedgeSpans";
        filter_walkable_low_height_spans: "filterWalkableLowHeightSpans";
        filter_baking_aabb: "filterBakingAabb";
        filter_baking_aabb_offset: "filterBakingAabbOffset";
    }
    /** A navigation mesh that defines traversable areas and obstacles.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationmesh.html  
     */
    class NavigationMesh extends Resource {
        constructor(identifier?: any)
        /** Based on [param value], enables or disables the specified layer in the [member geometry_collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member geometry_collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** Adds a polygon using the indices of the vertices you get when calling [method get_vertices]. */
        addPolygon(polygon: PackedInt32Array | int32[]): void
        
        /** Returns the number of polygons in the navigation mesh. */
        getPolygonCount(): int64
        
        /** Returns a [PackedInt32Array] containing the indices of the vertices of a created polygon. */
        getPolygon(idx: int64): PackedInt32Array
        
        /** Clears the array of polygons, but it doesn't clear the array of vertices. */
        clearPolygons(): void
        
        /** Initializes the navigation mesh by setting the vertices and indices according to a [Mesh].  
         *      
         *  **Note:** The given [param mesh] must be of type [constant Mesh.PRIMITIVE_TRIANGLES] and have an index array.  
         */
        createFromMesh(mesh: Mesh): void
        
        /** Clears the internal arrays for vertices and polygon indices. */
        clear(): void
        get vertices(): PackedVector3Array
        set vertices(value: PackedVector3Array | Vector3[])
        get polygons(): GArray
        set polygons(value: GArray)
        
        /** Partitioning algorithm for creating the navigation mesh polys. */
        get samplePartitionType(): int64
        set samplePartitionType(value: int64)
        
        /** Determines which type of nodes will be parsed as geometry. */
        get geometryParsedGeometryType(): int64
        set geometryParsedGeometryType(value: int64)
        
        /** The physics layers to scan for static colliders.  
         *  Only used when [member geometry_parsed_geometry_type] is [constant PARSED_GEOMETRY_STATIC_COLLIDERS] or [constant PARSED_GEOMETRY_BOTH].  
         */
        get geometryCollisionMask(): int64
        set geometryCollisionMask(value: int64)
        
        /** The source of the geometry used when baking. */
        get geometrySourceGeometryMode(): int64
        set geometrySourceGeometryMode(value: int64)
        
        /** The name of the group to scan for geometry.  
         *  Only used when [member geometry_source_geometry_mode] is [constant SOURCE_GEOMETRY_GROUPS_WITH_CHILDREN] or [constant SOURCE_GEOMETRY_GROUPS_EXPLICIT].  
         */
        get geometrySourceGroupName(): string
        set geometrySourceGroupName(value: string)
        
        /** The cell size used to rasterize the navigation mesh vertices on the XZ plane. Must match with the cell size on the navigation map. */
        get cellSize(): float64
        set cellSize(value: float64)
        
        /** The cell height used to rasterize the navigation mesh vertices on the Y axis. Must match with the cell height on the navigation map. */
        get cellHeight(): float64
        set cellHeight(value: float64)
        
        /** The size of the non-navigable border around the bake bounding area.  
         *  In conjunction with the [member filter_baking_aabb] and a [member edge_max_error] value at `1.0` or below the border size can be used to bake tile aligned navigation meshes without the tile edges being shrunk by [member agent_radius].  
         *      
         *  **Note:** If this value is not `0.0`, it will be rounded up to the nearest multiple of [member cell_size] during baking.  
         */
        get borderSize(): float64
        set borderSize(value: float64)
        
        /** The minimum floor to ceiling height that will still allow the floor area to be considered walkable.  
         *      
         *  **Note:** While baking, this value will be rounded up to the nearest multiple of [member cell_height].  
         */
        get agentHeight(): float64
        set agentHeight(value: float64)
        
        /** The distance to erode/shrink the walkable area of the heightfield away from obstructions.  
         *      
         *  **Note:** While baking, this value will be rounded up to the nearest multiple of [member cell_size].  
         *      
         *  **Note:** The radius must be equal or higher than `0.0`. If the radius is `0.0`, it won't be possible to fix invalid outline overlaps and other precision errors during the baking process. As a result, some obstacles may be excluded incorrectly from the final navigation mesh, or may delete the navigation mesh's polygons.  
         */
        get agentRadius(): float64
        set agentRadius(value: float64)
        
        /** The minimum ledge height that is considered to still be traversable.  
         *      
         *  **Note:** While baking, this value will be rounded down to the nearest multiple of [member cell_height].  
         */
        get agentMaxClimb(): float64
        set agentMaxClimb(value: float64)
        
        /** The maximum slope that is considered walkable, in degrees. */
        get agentMaxSlope(): float64
        set agentMaxSlope(value: float64)
        
        /** The minimum size of a region for it to be created.  
         *      
         *  **Note:** This value will be squared to calculate the minimum number of cells allowed to form isolated island areas. For example, a value of 8 will set the number of cells to 64.  
         */
        get regionMinSize(): float64
        set regionMinSize(value: float64)
        
        /** Any regions with a size smaller than this will be merged with larger regions if possible.  
         *      
         *  **Note:** This value will be squared to calculate the number of cells. For example, a value of 20 will set the number of cells to 400.  
         */
        get regionMergeSize(): float64
        set regionMergeSize(value: float64)
        
        /** The maximum allowed length for contour edges along the border of the mesh. A value of `0.0` disables this feature.  
         *      
         *  **Note:** While baking, this value will be rounded up to the nearest multiple of [member cell_size].  
         */
        get edgeMaxLength(): float64
        set edgeMaxLength(value: float64)
        
        /** The maximum distance a simplified contour's border edges should deviate the original raw contour. */
        get edgeMaxError(): float64
        set edgeMaxError(value: float64)
        
        /** The maximum number of vertices allowed for polygons generated during the contour to polygon conversion process. */
        get verticesPerPolygon(): float64
        set verticesPerPolygon(value: float64)
        
        /** The sampling distance to use when generating the detail mesh, in cell unit. */
        get detailSampleDistance(): float64
        set detailSampleDistance(value: float64)
        
        /** The maximum distance the detail mesh surface should deviate from heightfield, in cell unit. */
        get detailSampleMaxError(): float64
        set detailSampleMaxError(value: float64)
        
        /** If `true`, marks non-walkable spans as walkable if their maximum is within [member agent_max_climb] of a walkable neighbor. */
        get filterLowHangingObstacles(): boolean
        set filterLowHangingObstacles(value: boolean)
        
        /** If `true`, marks spans that are ledges as non-walkable. */
        get filterLedgeSpans(): boolean
        set filterLedgeSpans(value: boolean)
        
        /** If `true`, marks walkable spans as not walkable if the clearance above the span is less than [member agent_height]. */
        get filterWalkableLowHeightSpans(): boolean
        set filterWalkableLowHeightSpans(value: boolean)
        
        /** If the baking [AABB] has a volume the navigation mesh baking will be restricted to its enclosing area. */
        get filterBakingAabb(): Aabb
        set filterBakingAabb(value: Aabb)
        
        /** The position offset applied to the [member filter_baking_aabb] [AABB]. */
        get filterBakingAabbOffset(): Vector3
        set filterBakingAabbOffset(value: Vector3)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationMeshSourceGeometryData2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationMeshSourceGeometryData2D extends __NameMapResource {
        has_data: "hasData";
        append_traversable_outlines: "appendTraversableOutlines";
        append_obstruction_outlines: "appendObstructionOutlines";
        add_traversable_outline: "addTraversableOutline";
        add_obstruction_outline: "addObstructionOutline";
        add_projected_obstruction: "addProjectedObstruction";
        clear_projected_obstructions: "clearProjectedObstructions";
        get_bounds: "getBounds";
        traversable_outlines: "traversableOutlines";
        obstruction_outlines: "obstructionOutlines";
        projected_obstructions: "projectedObstructions";
    }
    /** Container for parsed source geometry data used in navigation mesh baking.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationmeshsourcegeometrydata2d.html  
     */
    class NavigationMeshSourceGeometryData2D extends Resource {
        constructor(identifier?: any)
        /** Clears the internal data. */
        clear(): void
        
        /** Returns `true` when parsed source geometry data exists. */
        hasData(): boolean
        
        /** Appends another array of [param traversable_outlines] at the end of the existing traversable outlines array. */
        appendTraversableOutlines(traversableOutlines: GArray<PackedVector2Array>): void
        
        /** Appends another array of [param obstruction_outlines] at the end of the existing obstruction outlines array. */
        appendObstructionOutlines(obstructionOutlines: GArray<PackedVector2Array>): void
        
        /** Adds the outline points of a shape as traversable area. */
        addTraversableOutline(shapeOutline: PackedVector2Array | Vector2[]): void
        
        /** Adds the outline points of a shape as obstructed area. */
        addObstructionOutline(shapeOutline: PackedVector2Array | Vector2[]): void
        
        /** Adds the geometry data of another [NavigationMeshSourceGeometryData2D] to the navigation mesh baking data. */
        merge(otherGeometry: NavigationMeshSourceGeometryData2D): void
        
        /** Adds a projected obstruction shape to the source geometry. If [param carve] is `true` the carved shape will not be affected by additional offsets (e.g. agent radius) of the navigation mesh baking process. */
        addProjectedObstruction(vertices: PackedVector2Array | Vector2[], carve: boolean): void
        
        /** Clears all projected obstructions. */
        clearProjectedObstructions(): void
        
        /** Returns an axis-aligned bounding box that covers all the stored geometry data. The bounds are calculated when calling this function with the result cached until further geometry changes are made. */
        getBounds(): Rect2
        get traversableOutlines(): GArray
        set traversableOutlines(value: GArray)
        get obstructionOutlines(): GArray
        set obstructionOutlines(value: GArray)
        get projectedObstructions(): GArray
        set projectedObstructions(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationMeshSourceGeometryData2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationMeshSourceGeometryData2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationMeshSourceGeometryData3D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationMeshSourceGeometryData3D extends __NameMapResource {
        append_arrays: "appendArrays";
        has_data: "hasData";
        add_mesh: "addMesh";
        add_mesh_array: "addMeshArray";
        add_faces: "addFaces";
        add_projected_obstruction: "addProjectedObstruction";
        clear_projected_obstructions: "clearProjectedObstructions";
        get_bounds: "getBounds";
        projected_obstructions: "projectedObstructions";
    }
    /** Container for parsed source geometry data used in navigation mesh baking.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationmeshsourcegeometrydata3d.html  
     */
    class NavigationMeshSourceGeometryData3D extends Resource {
        constructor(identifier?: any)
        /** Appends arrays of [param vertices] and [param indices] at the end of the existing arrays. Adds the existing index as an offset to the appended indices. */
        appendArrays(vertices: PackedFloat32Array | float32[], indices: PackedInt32Array | int32[]): void
        
        /** Clears the internal data. */
        clear(): void
        
        /** Returns `true` when parsed source geometry data exists. */
        hasData(): boolean
        
        /** Adds the geometry data of a [Mesh] resource to the navigation mesh baking data. The mesh must have valid triangulated mesh data to be considered. Since [NavigationMesh] resources have no transform, all vertex positions need to be offset by the node's transform using [param xform]. */
        addMesh(mesh: Mesh, xform: Transform3D): void
        
        /** Adds an [Array] the size of [constant Mesh.ARRAY_MAX] and with vertices at index [constant Mesh.ARRAY_VERTEX] and indices at index [constant Mesh.ARRAY_INDEX] to the navigation mesh baking data. The array must have valid triangulated mesh data to be considered. Since [NavigationMesh] resources have no transform, all vertex positions need to be offset by the node's transform using [param xform]. */
        addMeshArray(meshArray: GArray, xform: Transform3D): void
        
        /** Adds an array of vertex positions to the geometry data for navigation mesh baking to form triangulated faces. For each face the array must have three vertex positions in clockwise winding order. Since [NavigationMesh] resources have no transform, all vertex positions need to be offset by the node's transform using [param xform]. */
        addFaces(faces: PackedVector3Array | Vector3[], xform: Transform3D): void
        
        /** Adds the geometry data of another [NavigationMeshSourceGeometryData3D] to the navigation mesh baking data. */
        merge(otherGeometry: NavigationMeshSourceGeometryData3D): void
        
        /** Adds a projected obstruction shape to the source geometry. The [param vertices] are considered projected on an xz-axes plane, placed at the global y-axis [param elevation] and extruded by [param height]. If [param carve] is `true` the carved shape will not be affected by additional offsets (e.g. agent radius) of the navigation mesh baking process. */
        addProjectedObstruction(vertices: PackedVector3Array | Vector3[], elevation: float64, height: float64, carve: boolean): void
        
        /** Clears all projected obstructions. */
        clearProjectedObstructions(): void
        
        /** Returns an axis-aligned bounding box that covers all the stored geometry data. The bounds are calculated when calling this function with the result cached until further geometry changes are made. */
        getBounds(): Aabb
        get vertices(): PackedVector3Array
        set vertices(value: PackedVector3Array | Vector3[])
        get indices(): PackedInt32Array
        set indices(value: PackedInt32Array | int32[])
        get projectedObstructions(): GArray
        set projectedObstructions(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationMeshSourceGeometryData3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationMeshSourceGeometryData3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationObstacle2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationObstacle2D extends __NameMapNode2D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_avoidance_layer_value: "setAvoidanceLayerValue";
        get_avoidance_layer_value: "getAvoidanceLayerValue";
        affect_navigation_mesh: "affectNavigationMesh";
        carve_navigation_mesh: "carveNavigationMesh";
        avoidance_enabled: "avoidanceEnabled";
        avoidance_layers: "avoidanceLayers";
    }
    /** 2D obstacle used to affect navigation mesh baking or constrain velocities of avoidance controlled agents.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationobstacle2d.html  
     */
    class NavigationObstacle2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this obstacle on the [NavigationServer2D]. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this NavigationObstacle node should use and also updates the `obstacle` on the NavigationServer. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the [RID] of the navigation map for this NavigationObstacle node. This function returns always the map set on the NavigationObstacle node and not the map of the abstract obstacle on the NavigationServer. If the obstacle map is changed directly with the NavigationServer API the NavigationObstacle node will not be aware of the map change. Use [method set_navigation_map] to change the navigation map for the NavigationObstacle and also update the obstacle on the NavigationServer. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member avoidance_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setAvoidanceLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member avoidance_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getAvoidanceLayerValue(layerNumber: int64): boolean
        
        /** Sets the avoidance radius for the obstacle. */
        get radius(): float64
        set radius(value: float64)
        
        /** The outline vertices of the obstacle. If the vertices are winded in clockwise order, agents will be pushed in by the obstacle, otherwise they will be pushed out. Outlines cannot be crossed or overlap. If the obstacle is warped to a new position, agents cannot predict this movement and may get trapped inside the obstacle. */
        get vertices(): PackedVector2Array
        set vertices(value: PackedVector2Array | Vector2[])
        
        /** If enabled and parsed in a navigation mesh baking process the obstacle will discard source geometry inside its [member vertices] defined shape. */
        get affectNavigationMesh(): boolean
        set affectNavigationMesh(value: boolean)
        
        /** If enabled the obstacle vertices will carve into the baked navigation mesh with the shape unaffected by additional offsets (e.g. agent radius).  
         *  It will still be affected by further postprocessing of the baking process, like edge and polygon simplification.  
         *  Requires [member affect_navigation_mesh] to be enabled.  
         */
        get carveNavigationMesh(): boolean
        set carveNavigationMesh(value: boolean)
        
        /** If `true` the obstacle affects avoidance using agents. */
        get avoidanceEnabled(): boolean
        set avoidanceEnabled(value: boolean)
        
        /** The wanted velocity for the obstacle, used by other agents to better predict the obstacle if it is moved with a velocity regularly (every frame), instead of warped to a new position.  
         *      
         *  **Note:** This property only affects avoidance for the obstacle's [member radius]. Does nothing for the obstacle's static vertices.  
         */
        get velocity(): Vector2
        set velocity(value: Vector2)
        
        /** A bitfield determining the avoidance layers for this obstacle. Agents with a matching bit on the their avoidance mask will avoid this obstacle. */
        get avoidanceLayers(): int64
        set avoidanceLayers(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationObstacle2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationObstacle2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationObstacle3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationObstacle3D extends __NameMapNode3D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_avoidance_layer_value: "setAvoidanceLayerValue";
        get_avoidance_layer_value: "getAvoidanceLayerValue";
        affect_navigation_mesh: "affectNavigationMesh";
        carve_navigation_mesh: "carveNavigationMesh";
        avoidance_enabled: "avoidanceEnabled";
        avoidance_layers: "avoidanceLayers";
        use_3d_avoidance: "use3DAvoidance";
    }
    /** 3D obstacle used to affect navigation mesh baking or constrain velocities of avoidance controlled agents.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationobstacle3d.html  
     */
    class NavigationObstacle3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this obstacle on the [NavigationServer3D]. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this NavigationObstacle node should use and also updates the `obstacle` on the NavigationServer. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the [RID] of the navigation map for this NavigationObstacle node. This function returns always the map set on the NavigationObstacle node and not the map of the abstract obstacle on the NavigationServer. If the obstacle map is changed directly with the NavigationServer API the NavigationObstacle node will not be aware of the map change. Use [method set_navigation_map] to change the navigation map for the NavigationObstacle and also update the obstacle on the NavigationServer. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member avoidance_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setAvoidanceLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member avoidance_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getAvoidanceLayerValue(layerNumber: int64): boolean
        
        /** Sets the avoidance radius for the obstacle. */
        get radius(): float64
        set radius(value: float64)
        
        /** Sets the obstacle height used in 2D avoidance. 2D avoidance using agents ignore obstacles that are below or above them. */
        get height(): float64
        set height(value: float64)
        
        /** The outline vertices of the obstacle. If the vertices are winded in clockwise order, agents will be pushed in by the obstacle, otherwise they will be pushed out. Outlines cannot be crossed or overlap. If the obstacle is warped to a new position, agents cannot predict this movement and may get trapped inside the obstacle. */
        get vertices(): PackedVector3Array
        set vertices(value: PackedVector3Array | Vector3[])
        
        /** If enabled and parsed in a navigation mesh baking process the obstacle will discard source geometry inside its [member vertices] and [member height] defined shape. */
        get affectNavigationMesh(): boolean
        set affectNavigationMesh(value: boolean)
        
        /** If enabled the obstacle vertices will carve into the baked navigation mesh with the shape unaffected by additional offsets (e.g. agent radius).  
         *  It will still be affected by further postprocessing of the baking process, like edge and polygon simplification.  
         *  Requires [member affect_navigation_mesh] to be enabled.  
         */
        get carveNavigationMesh(): boolean
        set carveNavigationMesh(value: boolean)
        
        /** If `true` the obstacle affects avoidance using agents. */
        get avoidanceEnabled(): boolean
        set avoidanceEnabled(value: boolean)
        
        /** The wanted velocity for the obstacle, used by other agents to better predict the obstacle if it is moved with a velocity regularly (every frame), instead of warped to a new position.  
         *      
         *  **Note:** This property only affects avoidance for the obstacle's [member radius]. Does nothing for the obstacle's static vertices.  
         */
        get velocity(): Vector3
        set velocity(value: Vector3)
        
        /** A bitfield determining the avoidance layers for this obstacle. Agents with a matching bit on the their avoidance mask will avoid this obstacle. */
        get avoidanceLayers(): int64
        set avoidanceLayers(value: int64)
        
        /** If `true` the obstacle affects 3D avoidance using agents with obstacle [member radius].  
         *  If `false` the obstacle affects 2D avoidance using agents with both obstacle [member vertices] as well as obstacle [member radius].  
         */
        get use3DAvoidance(): boolean
        set use3DAvoidance(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationObstacle3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationObstacle3D;
    }
    namespace NavigationPathQueryParameters2D {
        enum PathfindingAlgorithm {
            PathfindingAlgorithmAstar = 0,
        }
        enum PathPostProcessing {
            PathPostprocessingCorridorfunnel = 0,
            PathPostprocessingEdgecentered = 1,
            PathPostprocessingNone = 2,
        }
        enum PathMetadataFlags {
            PathMetadataIncludeNone = 0,
            PathMetadataIncludeTypes = 1,
            PathMetadataIncludeRids = 2,
            PathMetadataIncludeOwners = 4,
            PathMetadataIncludeAll = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationPathQueryParameters2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationPathQueryParameters2D extends __NameMapRefCounted {
        start_position: "startPosition";
        target_position: "targetPosition";
        navigation_layers: "navigationLayers";
        pathfinding_algorithm: "pathfindingAlgorithm";
        path_postprocessing: "pathPostprocessing";
        metadata_flags: "metadataFlags";
        simplify_path: "simplifyPath";
        simplify_epsilon: "simplifyEpsilon";
        excluded_regions: "excludedRegions";
        included_regions: "includedRegions";
        path_return_max_length: "pathReturnMaxLength";
        path_return_max_radius: "pathReturnMaxRadius";
        path_search_max_polygons: "pathSearchMaxPolygons";
        path_search_max_distance: "pathSearchMaxDistance";
    }
    /** Provides parameters for 2D navigation path queries.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationpathqueryparameters2d.html  
     */
    class NavigationPathQueryParameters2D extends RefCounted {
        constructor(identifier?: any)
        /** The navigation map [RID] used in the path query. */
        get map(): Rid
        set map(value: Rid)
        
        /** The pathfinding start position in global coordinates. */
        get startPosition(): Vector2
        set startPosition(value: Vector2)
        
        /** The pathfinding target position in global coordinates. */
        get targetPosition(): Vector2
        set targetPosition(value: Vector2)
        
        /** The navigation layers the query will use (as a bitmask). */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** The pathfinding algorithm used in the path query. */
        get pathfindingAlgorithm(): int64
        set pathfindingAlgorithm(value: int64)
        
        /** The path postprocessing applied to the raw path corridor found by the [member pathfinding_algorithm]. */
        get pathPostprocessing(): int64
        set pathPostprocessing(value: int64)
        
        /** Additional information to include with the navigation path. */
        get metadataFlags(): int64
        set metadataFlags(value: int64)
        
        /** If `true` a simplified version of the path will be returned with less critical path points removed. The simplification amount is controlled by [member simplify_epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        get simplifyPath(): boolean
        set simplifyPath(value: boolean)
        
        /** The path simplification amount in world units. */
        get simplifyEpsilon(): float64
        set simplifyEpsilon(value: float64)
        
        /** The list of region [RID]s that will be excluded from the path query. Use [method NavigationRegion2D.get_rid] to get the [RID] associated with a [NavigationRegion2D] node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then set it to the property again.  
         */
        get excludedRegions(): GArray<Rid>
        set excludedRegions(value: GArray<Rid>)
        
        /** The list of region [RID]s that will be included by the path query. Use [method NavigationRegion2D.get_rid] to get the [RID] associated with a [NavigationRegion2D] node. If left empty all regions are included. If a region ends up being both included and excluded at the same time it will be excluded.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then set it to the property again.  
         */
        get includedRegions(): GArray<Rid>
        set includedRegions(value: GArray<Rid>)
        
        /** The maximum allowed length of the returned path in world units. A path will be clipped when going over this length. A value of `0` or below counts as disabled. */
        get pathReturnMaxLength(): float64
        set pathReturnMaxLength(value: float64)
        
        /** The maximum allowed radius in world units that the returned path can be from the path start. The path will be clipped when going over this radius. A value of `0` or below counts as disabled.  
         *      
         *  **Note:** This will perform a circle shaped clip operation on the path with the first path position being the circle's center position.  
         */
        get pathReturnMaxRadius(): float64
        set pathReturnMaxRadius(value: float64)
        
        /** The maximum number of polygons that are searched before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxPolygons(): int64
        set pathSearchMaxPolygons(value: int64)
        
        /** The maximum distance a searched polygon can be away from the start polygon before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxDistance(): float64
        set pathSearchMaxDistance(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationPathQueryParameters2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationPathQueryParameters2D;
    }
    namespace NavigationPathQueryParameters3D {
        enum PathfindingAlgorithm {
            PathfindingAlgorithmAstar = 0,
        }
        enum PathPostProcessing {
            PathPostprocessingCorridorfunnel = 0,
            PathPostprocessingEdgecentered = 1,
            PathPostprocessingNone = 2,
        }
        enum PathMetadataFlags {
            PathMetadataIncludeNone = 0,
            PathMetadataIncludeTypes = 1,
            PathMetadataIncludeRids = 2,
            PathMetadataIncludeOwners = 4,
            PathMetadataIncludeAll = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationPathQueryParameters3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationPathQueryParameters3D extends __NameMapRefCounted {
        start_position: "startPosition";
        target_position: "targetPosition";
        navigation_layers: "navigationLayers";
        pathfinding_algorithm: "pathfindingAlgorithm";
        path_postprocessing: "pathPostprocessing";
        metadata_flags: "metadataFlags";
        simplify_path: "simplifyPath";
        simplify_epsilon: "simplifyEpsilon";
        excluded_regions: "excludedRegions";
        included_regions: "includedRegions";
        path_return_max_length: "pathReturnMaxLength";
        path_return_max_radius: "pathReturnMaxRadius";
        path_search_max_polygons: "pathSearchMaxPolygons";
        path_search_max_distance: "pathSearchMaxDistance";
    }
    /** Provides parameters for 3D navigation path queries.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationpathqueryparameters3d.html  
     */
    class NavigationPathQueryParameters3D extends RefCounted {
        constructor(identifier?: any)
        /** The navigation map [RID] used in the path query. */
        get map(): Rid
        set map(value: Rid)
        
        /** The pathfinding start position in global coordinates. */
        get startPosition(): Vector3
        set startPosition(value: Vector3)
        
        /** The pathfinding target position in global coordinates. */
        get targetPosition(): Vector3
        set targetPosition(value: Vector3)
        
        /** The navigation layers the query will use (as a bitmask). */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** The pathfinding algorithm used in the path query. */
        get pathfindingAlgorithm(): int64
        set pathfindingAlgorithm(value: int64)
        
        /** The path postprocessing applied to the raw path corridor found by the [member pathfinding_algorithm]. */
        get pathPostprocessing(): int64
        set pathPostprocessing(value: int64)
        
        /** Additional information to include with the navigation path. */
        get metadataFlags(): int64
        set metadataFlags(value: int64)
        
        /** If `true` a simplified version of the path will be returned with less critical path points removed. The simplification amount is controlled by [member simplify_epsilon]. The simplification uses a variant of Ramer-Douglas-Peucker algorithm for curve point decimation.  
         *  Path simplification can be helpful to mitigate various path following issues that can arise with certain agent types and script behaviors. E.g. "steering" agents or avoidance in "open fields".  
         */
        get simplifyPath(): boolean
        set simplifyPath(value: boolean)
        
        /** The path simplification amount in world units. */
        get simplifyEpsilon(): float64
        set simplifyEpsilon(value: float64)
        
        /** The list of region [RID]s that will be excluded from the path query. Use [method NavigationRegion3D.get_rid] to get the [RID] associated with a [NavigationRegion3D] node.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then set it to the property again.  
         */
        get excludedRegions(): GArray<Rid>
        set excludedRegions(value: GArray<Rid>)
        
        /** The list of region [RID]s that will be included by the path query. Use [method NavigationRegion3D.get_rid] to get the [RID] associated with a [NavigationRegion3D] node. If left empty all regions are included. If a region ends up being both included and excluded at the same time it will be excluded.  
         *      
         *  **Note:** The returned array is copied and any changes to it will not update the original property value. To update the value you need to modify the returned array, and then set it to the property again.  
         */
        get includedRegions(): GArray<Rid>
        set includedRegions(value: GArray<Rid>)
        
        /** The maximum allowed length of the returned path in world units. A path will be clipped when going over this length. A value of `0` or below counts as disabled. */
        get pathReturnMaxLength(): float64
        set pathReturnMaxLength(value: float64)
        
        /** The maximum allowed radius in world units that the returned path can be from the path start. The path will be clipped when going over this radius. A value of `0` or below counts as disabled.  
         *      
         *  **Note:** This will perform a sphere shaped clip operation on the path with the first path position being the sphere's center position.  
         */
        get pathReturnMaxRadius(): float64
        set pathReturnMaxRadius(value: float64)
        
        /** The maximum number of polygons that are searched before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxPolygons(): int64
        set pathSearchMaxPolygons(value: int64)
        
        /** The maximum distance a searched polygon can be away from the start polygon before the pathfinding cancels the search for a path to the (possibly unreachable or very far away) target position polygon. In this case the pathfinding resets and builds a path from the start polygon to the polygon that was found closest to the target position so far. A value of `0` or below counts as unlimited. In case of unlimited the pathfinding will search all polygons connected with the start polygon until either the target position polygon is found or all available polygon search options are exhausted. */
        get pathSearchMaxDistance(): float64
        set pathSearchMaxDistance(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationPathQueryParameters3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationPathQueryParameters3D;
    }
    namespace NavigationPathQueryResult2D {
        enum PathSegmentType {
            PathSegmentTypeRegion = 0,
            PathSegmentTypeLink = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationPathQueryResult2D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationPathQueryResult2D extends __NameMapRefCounted {
        path_types: "pathTypes";
        path_rids: "pathRids";
        path_owner_ids: "pathOwnerIds";
        path_length: "pathLength";
    }
    /** Represents the result of a 2D pathfinding query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationpathqueryresult2d.html  
     */
    class NavigationPathQueryResult2D extends RefCounted {
        constructor(identifier?: any)
        /** Reset the result object to its initial state. This is useful to reuse the object across multiple queries. */
        reset(): void
        
        /** The resulting path array from the navigation query. All path array positions are in global coordinates. Without customized query parameters this is the same path as returned by [method NavigationServer2D.map_get_path]. */
        get path(): PackedVector2Array
        set path(value: PackedVector2Array | Vector2[])
        
        /** The type of navigation primitive (region or link) that each point of the path goes through. */
        get pathTypes(): PackedInt32Array
        set pathTypes(value: PackedInt32Array | int32[])
        
        /** The [RID]s of the regions and links that each point of the path goes through. */
        get pathRids(): GArray<Rid>
        set pathRids(value: GArray<Rid>)
        
        /** The `ObjectID`s of the [Object]s which manage the regions and links each point of the path goes through. */
        get pathOwnerIds(): PackedInt64Array
        set pathOwnerIds(value: PackedInt64Array | int64[])
        
        /** Returns the length of the path. */
        get pathLength(): float64
        set pathLength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationPathQueryResult2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationPathQueryResult2D;
    }
    namespace NavigationPathQueryResult3D {
        enum PathSegmentType {
            PathSegmentTypeRegion = 0,
            PathSegmentTypeLink = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationPathQueryResult3D extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationPathQueryResult3D extends __NameMapRefCounted {
        path_types: "pathTypes";
        path_rids: "pathRids";
        path_owner_ids: "pathOwnerIds";
        path_length: "pathLength";
    }
    /** Represents the result of a 3D pathfinding query.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationpathqueryresult3d.html  
     */
    class NavigationPathQueryResult3D extends RefCounted {
        constructor(identifier?: any)
        /** Reset the result object to its initial state. This is useful to reuse the object across multiple queries. */
        reset(): void
        
        /** The resulting path array from the navigation query. All path array positions are in global coordinates. Without customized query parameters this is the same path as returned by [method NavigationServer3D.map_get_path]. */
        get path(): PackedVector3Array
        set path(value: PackedVector3Array | Vector3[])
        
        /** The type of navigation primitive (region or link) that each point of the path goes through. */
        get pathTypes(): PackedInt32Array
        set pathTypes(value: PackedInt32Array | int32[])
        
        /** The [RID]s of the regions and links that each point of the path goes through. */
        get pathRids(): GArray<Rid>
        set pathRids(value: GArray<Rid>)
        
        /** The `ObjectID`s of the [Object]s which manage the regions and links each point of the path goes through. */
        get pathOwnerIds(): PackedInt64Array
        set pathOwnerIds(value: PackedInt64Array | int64[])
        
        /** Returns the length of the path. */
        get pathLength(): float64
        set pathLength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationPathQueryResult3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationPathQueryResult3D;
    }
    namespace NavigationPolygon {
        enum SamplePartitionType {
            SamplePartitionConvexPartition = 0,
            SamplePartitionTriangulate = 1,
            SamplePartitionMax = 2,
        }
        enum ParsedGeometryType {
            ParsedGeometryMeshInstances = 0,
            ParsedGeometryStaticColliders = 1,
            ParsedGeometryBoth = 2,
            ParsedGeometryMax = 3,
        }
        enum SourceGeometryMode {
            SourceGeometryRootNodeChildren = 0,
            SourceGeometryGroupsWithChildren = 1,
            SourceGeometryGroupsExplicit = 2,
            SourceGeometryMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationPolygon extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationPolygon extends __NameMapResource {
        add_polygon: "addPolygon";
        get_polygon_count: "getPolygonCount";
        get_polygon: "getPolygon";
        clear_polygons: "clearPolygons";
        get_navigation_mesh: "getNavigationMesh";
        add_outline: "addOutline";
        add_outline_at_index: "addOutlineAtIndex";
        get_outline_count: "getOutlineCount";
        set_outline: "setOutline";
        get_outline: "getOutline";
        remove_outline: "removeOutline";
        clear_outlines: "clearOutlines";
        make_polygons_from_outlines: "makePolygonsFromOutlines";
        set_parsed_collision_mask_value: "setParsedCollisionMaskValue";
        get_parsed_collision_mask_value: "getParsedCollisionMaskValue";
        sample_partition_type: "samplePartitionType";
        parsed_geometry_type: "parsedGeometryType";
        parsed_collision_mask: "parsedCollisionMask";
        source_geometry_mode: "sourceGeometryMode";
        source_geometry_group_name: "sourceGeometryGroupName";
        cell_size: "cellSize";
        border_size: "borderSize";
        agent_radius: "agentRadius";
        baking_rect: "bakingRect";
        baking_rect_offset: "bakingRectOffset";
    }
    /** A 2D navigation mesh that describes a traversable surface for pathfinding.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationpolygon.html  
     */
    class NavigationPolygon extends Resource {
        constructor(identifier?: any)
        /** Adds a polygon using the indices of the vertices you get when calling [method get_vertices]. */
        addPolygon(polygon: PackedInt32Array | int32[]): void
        
        /** Returns the count of all polygons. */
        getPolygonCount(): int64
        
        /** Returns a [PackedInt32Array] containing the indices of the vertices of a created polygon. */
        getPolygon(idx: int64): PackedInt32Array
        
        /** Clears the array of polygons, but it doesn't clear the array of outlines and vertices. */
        clearPolygons(): void
        
        /** Returns the [NavigationMesh] resulting from this navigation polygon. This navigation mesh can be used to update the navigation mesh of a region with the [method NavigationServer3D.region_set_navigation_mesh] API directly. */
        getNavigationMesh(): null | NavigationMesh
        
        /** Appends a [PackedVector2Array] that contains the vertices of an outline to the internal array that contains all the outlines. */
        addOutline(outline: PackedVector2Array | Vector2[]): void
        
        /** Adds a [PackedVector2Array] that contains the vertices of an outline to the internal array that contains all the outlines at a fixed position. */
        addOutlineAtIndex(outline: PackedVector2Array | Vector2[], index: int64): void
        
        /** Returns the number of outlines that were created in the editor or by script. */
        getOutlineCount(): int64
        
        /** Changes an outline created in the editor or by script. You have to call [method make_polygons_from_outlines] for the polygons to update. */
        setOutline(idx: int64, outline: PackedVector2Array | Vector2[]): void
        
        /** Returns a [PackedVector2Array] containing the vertices of an outline that was created in the editor or by script. */
        getOutline(idx: int64): PackedVector2Array
        
        /** Removes an outline created in the editor or by script. You have to call [method make_polygons_from_outlines] for the polygons to update. */
        removeOutline(idx: int64): void
        
        /** Clears the array of the outlines, but it doesn't clear the vertices and the polygons that were created by them. */
        clearOutlines(): void
        
        /** Creates polygons from the outlines added in the editor or by script. */
        makePolygonsFromOutlines(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member parsed_collision_mask], given a [param layer_number] between 1 and 32. */
        setParsedCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member parsed_collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getParsedCollisionMaskValue(layerNumber: int64): boolean
        
        /** Clears the internal arrays for vertices and polygon indices. */
        clear(): void
        get vertices(): PackedVector2Array
        set vertices(value: PackedVector2Array | Vector2[])
        get polygons(): GArray
        set polygons(value: GArray)
        get outlines(): GArray
        set outlines(value: GArray)
        
        /** Partitioning algorithm for creating the navigation mesh polys. */
        get samplePartitionType(): int64
        set samplePartitionType(value: int64)
        
        /** Determines which type of nodes will be parsed as geometry. */
        get parsedGeometryType(): int64
        set parsedGeometryType(value: int64)
        
        /** The physics layers to scan for static colliders.  
         *  Only used when [member parsed_geometry_type] is [constant PARSED_GEOMETRY_STATIC_COLLIDERS] or [constant PARSED_GEOMETRY_BOTH].  
         */
        get parsedCollisionMask(): int64
        set parsedCollisionMask(value: int64)
        
        /** The source of the geometry used when baking. */
        get sourceGeometryMode(): int64
        set sourceGeometryMode(value: int64)
        
        /** The group name of nodes that should be parsed for baking source geometry.  
         *  Only used when [member source_geometry_mode] is [constant SOURCE_GEOMETRY_GROUPS_WITH_CHILDREN] or [constant SOURCE_GEOMETRY_GROUPS_EXPLICIT].  
         */
        get sourceGeometryGroupName(): string
        set sourceGeometryGroupName(value: string)
        
        /** The cell size used to rasterize the navigation mesh vertices. Must match with the cell size on the navigation map. */
        get cellSize(): float64
        set cellSize(value: float64)
        
        /** The size of the non-navigable border around the bake bounding area defined by the [member baking_rect] [Rect2].  
         *  In conjunction with the [member baking_rect] the border size can be used to bake tile aligned navigation meshes without the tile edges being shrunk by [member agent_radius].  
         */
        get borderSize(): float64
        set borderSize(value: float64)
        
        /** The distance to erode/shrink the walkable surface when baking the navigation mesh.  
         *      
         *  **Note:** The radius must be equal or higher than `0.0`. If the radius is `0.0`, it won't be possible to fix invalid outline overlaps and other precision errors during the baking process. As a result, some obstacles may be excluded incorrectly from the final navigation mesh, or may delete the navigation mesh's polygons.  
         */
        get agentRadius(): float64
        set agentRadius(value: float64)
        
        /** If the baking [Rect2] has an area the navigation mesh baking will be restricted to its enclosing area. */
        get bakingRect(): Rect2
        set bakingRect(value: Rect2)
        
        /** The position offset applied to the [member baking_rect] [Rect2]. */
        get bakingRectOffset(): Vector2
        set bakingRectOffset(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationPolygon;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationPolygon;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationRegion2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationRegion2D extends __NameMapNode2D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        get_region_rid: "getRegionRid";
        bake_navigation_polygon: "bakeNavigationPolygon";
        is_baking: "isBaking";
        _navigation_polygon_changed: "_navigationPolygonChanged";
        get_bounds: "getBounds";
        navigation_polygon: "navigationPolygon";
        use_edge_connections: "useEdgeConnections";
        navigation_layers: "navigationLayers";
        enter_cost: "enterCost";
        travel_cost: "travelCost";
        navigation_polygon_changed: "navigationPolygonChanged";
        bake_finished: "bakeFinished";
    }
    /** A traversable 2D region that [NavigationAgent2D]s can use for pathfinding.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationregion2d.html  
     */
    class NavigationRegion2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this region on the [NavigationServer2D]. Combined with [method NavigationServer2D.map_get_closest_point_owner] can be used to identify the [NavigationRegion2D] closest to a point on the merged navigation map. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this region should use. By default the region will automatically join the [World2D] default navigation map so this function is only required to override the default map. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the current navigation map [RID] used by this region. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Returns the [RID] of this region on the [NavigationServer2D]. */
        getRegionRid(): Rid
        
        /** Bakes the [NavigationPolygon]. If [param on_thread] is set to `true` (default), the baking is done on a separate thread. */
        bakeNavigationPolygon(onThread?: boolean /* = true */): void
        
        /** Returns `true` when the [NavigationPolygon] is being baked on a background thread. */
        isBaking(): boolean
        _navigationPolygonChanged(): void
        
        /** Returns the axis-aligned rectangle for the region's transformed navigation mesh. */
        getBounds(): Rect2
        
        /** The [NavigationPolygon] resource to use. */
        get navigationPolygon(): null | NavigationPolygon
        set navigationPolygon(value: null | NavigationPolygon)
        
        /** Determines if the [NavigationRegion2D] is enabled or disabled. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** If enabled the navigation region will use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        get useEdgeConnections(): boolean
        set useEdgeConnections(value: boolean)
        
        /** A bitfield determining all navigation layers the region belongs to. These navigation layers can be checked upon when requesting a path with [method NavigationServer2D.map_get_path]. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** When pathfinding enters this region's navigation mesh from another region's navigation mesh, this property's value is added to the path distance used to determine the shortest path. */
        get enterCost(): float64
        set enterCost(value: float64)
        
        /** When pathfinding moves inside this region's navigation mesh the traveled distances are multiplied with [member travel_cost] for determining the shortest path. */
        get travelCost(): float64
        set travelCost(value: float64)
        
        /** Emitted when the used navigation polygon is replaced or changes to the internals of the current navigation polygon are committed. */
        readonly navigationPolygonChanged: Signal<() => void>
        
        /** Emitted when a navigation polygon bake operation is completed. */
        readonly bakeFinished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationRegion2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationRegion2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNavigationRegion3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNavigationRegion3D extends __NameMapNode3D {
        get_rid: "getRid";
        set_navigation_map: "setNavigationMap";
        get_navigation_map: "getNavigationMap";
        set_navigation_layer_value: "setNavigationLayerValue";
        get_navigation_layer_value: "getNavigationLayerValue";
        get_region_rid: "getRegionRid";
        bake_navigation_mesh: "bakeNavigationMesh";
        is_baking: "isBaking";
        get_bounds: "getBounds";
        navigation_mesh: "navigationMesh";
        use_edge_connections: "useEdgeConnections";
        navigation_layers: "navigationLayers";
        enter_cost: "enterCost";
        travel_cost: "travelCost";
        navigation_mesh_changed: "navigationMeshChanged";
        bake_finished: "bakeFinished";
    }
    /** A traversable 3D region that [NavigationAgent3D]s can use for pathfinding.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_navigationregion3d.html  
     */
    class NavigationRegion3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the [RID] of this region on the [NavigationServer3D]. Combined with [method NavigationServer3D.map_get_closest_point_owner] can be used to identify the [NavigationRegion3D] closest to a point on the merged navigation map. */
        getRid(): Rid
        
        /** Sets the [RID] of the navigation map this region should use. By default the region will automatically join the [World3D] default navigation map so this function is only required to override the default map. */
        setNavigationMap(navigationMap: Rid): void
        
        /** Returns the current navigation map [RID] used by this region. */
        getNavigationMap(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member navigation_layers] bitmask, given a [param layer_number] between 1 and 32. */
        setNavigationLayerValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member navigation_layers] bitmask is enabled, given a [param layer_number] between 1 and 32. */
        getNavigationLayerValue(layerNumber: int64): boolean
        
        /** Returns the [RID] of this region on the [NavigationServer3D]. */
        getRegionRid(): Rid
        
        /** Bakes the [NavigationMesh]. If [param on_thread] is set to `true` (default), the baking is done on a separate thread. Baking on separate thread is useful because navigation baking is not a cheap operation. When it is completed, it automatically sets the new [NavigationMesh]. Please note that baking on separate thread may be very slow if geometry is parsed from meshes as async access to each mesh involves heavy synchronization. Also, please note that baking on a separate thread is automatically disabled on operating systems that cannot use threads (such as Web with threads disabled). */
        bakeNavigationMesh(onThread?: boolean /* = true */): void
        
        /** Returns `true` when the [NavigationMesh] is being baked on a background thread. */
        isBaking(): boolean
        
        /** Returns the axis-aligned bounding box for the region's transformed navigation mesh. */
        getBounds(): Aabb
        
        /** The [NavigationMesh] resource to use. */
        get navigationMesh(): null | NavigationMesh
        set navigationMesh(value: null | NavigationMesh)
        
        /** Determines if the [NavigationRegion3D] is enabled or disabled. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** If enabled the navigation region will use edge connections to connect with other navigation regions within proximity of the navigation map edge connection margin. */
        get useEdgeConnections(): boolean
        set useEdgeConnections(value: boolean)
        
        /** A bitfield determining all navigation layers the region belongs to. These navigation layers can be checked upon when requesting a path with [method NavigationServer3D.map_get_path]. */
        get navigationLayers(): int64
        set navigationLayers(value: int64)
        
        /** When pathfinding enters this region's navigation mesh from another region's navigation mesh, this property's value is added to the path distance used to determine the shortest path. */
        get enterCost(): float64
        set enterCost(value: float64)
        
        /** When pathfinding moves inside this region's navigation mesh the traveled distances are multiplied with [member travel_cost] for determining the shortest path. */
        get travelCost(): float64
        set travelCost(value: float64)
        
        /** Notifies when the [NavigationMesh] has changed. */
        readonly navigationMeshChanged: Signal<() => void>
        
        /** Notifies when the navigation mesh bake operation is completed. */
        readonly bakeFinished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNavigationRegion3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNavigationRegion3D;
    }
    namespace NinePatchRect {
        enum AxisStretchMode {
            AxisStretchModeStretch = 0,
            AxisStretchModeTile = 1,
            AxisStretchModeTileFit = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNinePatchRect extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNinePatchRect extends __NameMapControl {
        set_patch_margin: "setPatchMargin";
        get_patch_margin: "getPatchMargin";
        draw_center: "drawCenter";
        region_rect: "regionRect";
        patch_margin_left: "patchMarginLeft";
        patch_margin_top: "patchMarginTop";
        patch_margin_right: "patchMarginRight";
        patch_margin_bottom: "patchMarginBottom";
        axis_stretch_horizontal: "axisStretchHorizontal";
        axis_stretch_vertical: "axisStretchVertical";
        texture_changed: "textureChanged";
    }
    /** A control that displays a texture by keeping its corners intact, but tiling its edges and center.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_ninepatchrect.html  
     */
    class NinePatchRect<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Sets the size of the margin on the specified [enum Side] to [param value] pixels. */
        setPatchMargin(margin: Side, value: int64): void
        
        /** Returns the size of the margin on the specified [enum Side]. */
        getPatchMargin(margin: Side): int64
        
        /** The node's texture resource. */
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        
        /** If `true`, draw the panel's center. Else, only draw the 9-slice's borders. */
        get drawCenter(): boolean
        set drawCenter(value: boolean)
        
        /** Rectangular region of the texture to sample from. If you're working with an atlas, use this property to define the area the 9-slice should use. All other properties are relative to this one. If the rect is empty, NinePatchRect will use the whole texture. */
        get regionRect(): Rect2
        set regionRect(value: Rect2)
        
        /** The width of the 9-slice's left column. A margin of 16 means the 9-slice's left corners and side will have a width of 16 pixels. You can set all 4 margin values individually to create panels with non-uniform borders. */
        get patchMarginLeft(): int64
        set patchMarginLeft(value: int64)
        
        /** The height of the 9-slice's top row. A margin of 16 means the 9-slice's top corners and side will have a height of 16 pixels. You can set all 4 margin values individually to create panels with non-uniform borders. */
        get patchMarginTop(): int64
        set patchMarginTop(value: int64)
        
        /** The width of the 9-slice's right column. A margin of 16 means the 9-slice's right corners and side will have a width of 16 pixels. You can set all 4 margin values individually to create panels with non-uniform borders. */
        get patchMarginRight(): int64
        set patchMarginRight(value: int64)
        
        /** The height of the 9-slice's bottom row. A margin of 16 means the 9-slice's bottom corners and side will have a height of 16 pixels. You can set all 4 margin values individually to create panels with non-uniform borders. */
        get patchMarginBottom(): int64
        set patchMarginBottom(value: int64)
        
        /** The stretch mode to use for horizontal stretching/tiling. */
        get axisStretchHorizontal(): int64
        set axisStretchHorizontal(value: int64)
        
        /** The stretch mode to use for vertical stretching/tiling. */
        get axisStretchVertical(): int64
        set axisStretchVertical(value: int64)
        
        /** Emitted when the node's texture changes. */
        readonly textureChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNinePatchRect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNinePatchRect;
    }
    namespace Node {
        enum ProcessMode {
            ProcessModeInherit = 0,
            ProcessModePausable = 1,
            ProcessModeWhenPaused = 2,
            ProcessModeAlways = 3,
            ProcessModeDisabled = 4,
        }
        enum ProcessThreadGroup {
            ProcessThreadGroupInherit = 0,
            ProcessThreadGroupMainThread = 1,
            ProcessThreadGroupSubThread = 2,
        }
        enum ProcessThreadMessages {
            FlagProcessThreadMessages = 1,
            FlagProcessThreadMessagesPhysics = 2,
            FlagProcessThreadMessagesAll = 3,
        }
        enum PhysicsInterpolationMode {
            PhysicsInterpolationModeInherit = 0,
            PhysicsInterpolationModeOn = 1,
            PhysicsInterpolationModeOff = 2,
        }
        enum DuplicateFlags {
            DuplicateSignals = 1,
            DuplicateGroups = 2,
            DuplicateScripts = 4,
            DuplicateUseInstantiation = 8,
            DuplicateInternalState = 16,
            DuplicateDefault = 15,
        }
        enum InternalMode {
            InternalModeDisabled = 0,
            InternalModeFront = 1,
            InternalModeBack = 2,
        }
        enum AutoTranslateMode {
            AutoTranslateModeInherit = 0,
            AutoTranslateModeAlways = 1,
            AutoTranslateModeDisabled = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNode extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNode extends __NameMapGObject {
        _physics_process: "_physicsProcess";
        _enter_tree: "_enterTree";
        _exit_tree: "_exitTree";
        _get_configuration_warnings: "_getConfigurationWarnings";
        _get_accessibility_configuration_warnings: "_getAccessibilityConfigurationWarnings";
        _shortcut_input: "_shortcutInput";
        _unhandled_input: "_unhandledInput";
        _unhandled_key_input: "_unhandledKeyInput";
        _get_focused_accessibility_element: "_getFocusedAccessibilityElement";
        print_orphan_nodes: "printOrphanNodes";
        get_orphan_node_ids: "getOrphanNodeIds";
        add_sibling: "addSibling";
        set_name: "setName";
        get_name: "getName";
        add_child: "addChild";
        remove_child: "removeChild";
        get_child_count: "getChildCount";
        get_children: "getChildren";
        get_child: "getChild";
        has_node: "hasNode";
        get_node: "getNode";
        get_node_or_null: "getNodeOrNull";
        get_parent: "getParent";
        find_child: "findChild";
        find_children: "findChildren";
        find_parent: "findParent";
        has_node_and_resource: "hasNodeAndResource";
        get_node_and_resource: "getNodeAndResource";
        is_inside_tree: "isInsideTree";
        is_part_of_edited_scene: "isPartOfEditedScene";
        is_ancestor_of: "isAncestorOf";
        is_greater_than: "isGreaterThan";
        get_path: "getPath";
        get_path_to: "getPathTo";
        add_to_group: "addToGroup";
        remove_from_group: "removeFromGroup";
        is_in_group: "isInGroup";
        move_child: "moveChild";
        get_groups: "getGroups";
        get_index: "getIndex";
        print_tree: "printTree";
        print_tree_pretty: "printTreePretty";
        get_tree_string: "getTreeString";
        get_tree_string_pretty: "getTreeStringPretty";
        propagate_notification: "propagateNotification";
        propagate_call: "propagateCall";
        set_physics_process: "setPhysicsProcess";
        get_physics_process_delta_time: "getPhysicsProcessDeltaTime";
        is_physics_processing: "isPhysicsProcessing";
        get_process_delta_time: "getProcessDeltaTime";
        set_process: "setProcess";
        is_processing: "isProcessing";
        set_process_input: "setProcessInput";
        is_processing_input: "isProcessingInput";
        set_process_shortcut_input: "setProcessShortcutInput";
        is_processing_shortcut_input: "isProcessingShortcutInput";
        set_process_unhandled_input: "setProcessUnhandledInput";
        is_processing_unhandled_input: "isProcessingUnhandledInput";
        set_process_unhandled_key_input: "setProcessUnhandledKeyInput";
        is_processing_unhandled_key_input: "isProcessingUnhandledKeyInput";
        can_process: "canProcess";
        queue_accessibility_update: "queueAccessibilityUpdate";
        get_accessibility_element: "getAccessibilityElement";
        set_display_folded: "setDisplayFolded";
        is_displayed_folded: "isDisplayedFolded";
        set_process_internal: "setProcessInternal";
        is_processing_internal: "isProcessingInternal";
        set_physics_process_internal: "setPhysicsProcessInternal";
        is_physics_processing_internal: "isPhysicsProcessingInternal";
        is_physics_interpolated: "isPhysicsInterpolated";
        is_physics_interpolated_and_enabled: "isPhysicsInterpolatedAndEnabled";
        reset_physics_interpolation: "resetPhysicsInterpolation";
        can_auto_translate: "canAutoTranslate";
        set_translation_domain_inherited: "setTranslationDomainInherited";
        get_window: "getWindow";
        get_last_exclusive_window: "getLastExclusiveWindow";
        get_tree: "getTree";
        create_tween: "createTween";
        replace_by: "replaceBy";
        set_scene_instance_load_placeholder: "setSceneInstanceLoadPlaceholder";
        get_scene_instance_load_placeholder: "getSceneInstanceLoadPlaceholder";
        set_editable_instance: "setEditableInstance";
        is_editable_instance: "isEditableInstance";
        get_viewport: "getViewport";
        queue_free: "queueFree";
        request_ready: "requestReady";
        is_node_ready: "isNodeReady";
        set_multiplayer_authority: "setMultiplayerAuthority";
        get_multiplayer_authority: "getMultiplayerAuthority";
        is_multiplayer_authority: "isMultiplayerAuthority";
        rpc_config: "rpcConfig";
        get_node_rpc_config: "getNodeRpcConfig";
        atr_n: "atrN";
        _set_property_pinned: "_setPropertyPinned";
        rpc_id: "rpcId";
        update_configuration_warnings: "updateConfigurationWarnings";
        call_deferred_thread_group: "callDeferredThreadGroup";
        set_deferred_thread_group: "setDeferredThreadGroup";
        notify_deferred_thread_group: "notifyDeferredThreadGroup";
        call_thread_safe: "callThreadSafe";
        set_thread_safe: "setThreadSafe";
        notify_thread_safe: "notifyThreadSafe";
        unique_name_in_owner: "uniqueNameInOwner";
        scene_file_path: "sceneFilePath";
        process_mode: "processMode";
        process_priority: "processPriority";
        process_physics_priority: "processPhysicsPriority";
        process_thread_group: "processThreadGroup";
        process_thread_group_order: "processThreadGroupOrder";
        process_thread_messages: "processThreadMessages";
        physics_interpolation_mode: "physicsInterpolationMode";
        auto_translate_mode: "autoTranslateMode";
        editor_description: "editorDescription";
        tree_entered: "treeEntered";
        tree_exiting: "treeExiting";
        tree_exited: "treeExited";
        child_entered_tree: "childEnteredTree";
        child_exiting_tree: "childExitingTree";
        child_order_changed: "childOrderChanged";
        replacing_by: "replacingBy";
        editor_description_changed: "editorDescriptionChanged";
        editor_state_changed: "editorStateChanged";
    }
    namespace __PathMappableDummyKeys { const Node: unique symbol }
    /** Base class for all scene objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_node.html  
     */
    class Node<Map extends NodePathMap = any> extends GObject implements PathMappable<typeof __PathMappableDummyKeys.Node, Map> {
        [__PathMappableDummyKeys.Node]: Map
        /** Notification received when the node enters a [SceneTree]. See [method _enter_tree].  
         *  This notification is received  *before*  the related [signal tree_entered] signal.  
         */
        static readonly NOTIFICATION_ENTER_TREE = 10
        
        /** Notification received when the node is about to exit a [SceneTree]. See [method _exit_tree].  
         *  This notification is received  *after*  the related [signal tree_exiting] signal.  
         *  This notification is sent in reversed order.  
         */
        static readonly NOTIFICATION_EXIT_TREE = 11
        static readonly NOTIFICATION_MOVED_IN_PARENT = 12
        
        /** Notification received when the node is ready. See [method _ready]. */
        static readonly NOTIFICATION_READY = 13
        
        /** Notification received when the node is paused. See [member process_mode]. */
        static readonly NOTIFICATION_PAUSED = 14
        
        /** Notification received when the node is unpaused. See [member process_mode]. */
        static readonly NOTIFICATION_UNPAUSED = 15
        
        /** Notification received from the tree every physics frame when [method is_physics_processing] returns `true`. See [method _physics_process]. */
        static readonly NOTIFICATION_PHYSICS_PROCESS = 16
        
        /** Notification received from the tree every rendered frame when [method is_processing] returns `true`. See [method _process]. */
        static readonly NOTIFICATION_PROCESS = 17
        
        /** Notification received when the node is set as a child of another node (see [method add_child] and [method add_sibling]).  
         *      
         *  **Note:** This does  *not*  mean that the node entered the [SceneTree].  
         */
        static readonly NOTIFICATION_PARENTED = 18
        
        /** Notification received when the parent node calls [method remove_child] on this node.  
         *      
         *  **Note:** This does  *not*  mean that the node exited the [SceneTree].  
         */
        static readonly NOTIFICATION_UNPARENTED = 19
        
        /** Notification received  *only*  by the newly instantiated scene root node, when [method PackedScene.instantiate] is completed. */
        static readonly NOTIFICATION_SCENE_INSTANTIATED = 20
        
        /** Notification received when a drag operation begins. All nodes receive this notification, not only the dragged one.  
         *  Can be triggered either by dragging a [Control] that provides drag data (see [method Control._get_drag_data]) or using [method Control.force_drag].  
         *  Use [method Viewport.gui_get_drag_data] to get the dragged data.  
         */
        static readonly NOTIFICATION_DRAG_BEGIN = 21
        
        /** Notification received when a drag operation ends.  
         *  Use [method Viewport.gui_is_drag_successful] to check if the drag succeeded.  
         */
        static readonly NOTIFICATION_DRAG_END = 22
        
        /** Notification received when the node's [member name] or one of its ancestors' [member name] is changed. This notification is  *not*  received when the node is removed from the [SceneTree]. */
        static readonly NOTIFICATION_PATH_RENAMED = 23
        
        /** Notification received when the list of children is changed. This happens when child nodes are added, moved or removed. */
        static readonly NOTIFICATION_CHILD_ORDER_CHANGED = 24
        
        /** Notification received from the tree every rendered frame when [method is_processing_internal] returns `true`. */
        static readonly NOTIFICATION_INTERNAL_PROCESS = 25
        
        /** Notification received from the tree every physics frame when [method is_physics_processing_internal] returns `true`. */
        static readonly NOTIFICATION_INTERNAL_PHYSICS_PROCESS = 26
        
        /** Notification received when the node enters the tree, just before [constant NOTIFICATION_READY] may be received. Unlike the latter, it is sent every time the node enters tree, not just once. */
        static readonly NOTIFICATION_POST_ENTER_TREE = 27
        
        /** Notification received when the node is disabled. See [constant PROCESS_MODE_DISABLED]. */
        static readonly NOTIFICATION_DISABLED = 28
        
        /** Notification received when the node is enabled again after being disabled. See [constant PROCESS_MODE_DISABLED]. */
        static readonly NOTIFICATION_ENABLED = 29
        
        /** Notification received when [method reset_physics_interpolation] is called on the node or its ancestors. */
        static readonly NOTIFICATION_RESET_PHYSICS_INTERPOLATION = 2001
        
        /** Notification received right before the scene with the node is saved in the editor. This notification is only sent in the Godot editor and will not occur in exported projects. */
        static readonly NOTIFICATION_EDITOR_PRE_SAVE = 9001
        
        /** Notification received right after the scene with the node is saved in the editor. This notification is only sent in the Godot editor and will not occur in exported projects. */
        static readonly NOTIFICATION_EDITOR_POST_SAVE = 9002
        
        /** Notification received when the mouse enters the window.  
         *  Implemented for embedded windows and on desktop and web platforms.  
         */
        static readonly NOTIFICATION_WM_MOUSE_ENTER = 1002
        
        /** Notification received when the mouse leaves the window.  
         *  Implemented for embedded windows and on desktop and web platforms.  
         */
        static readonly NOTIFICATION_WM_MOUSE_EXIT = 1003
        
        /** Notification received from the OS when the node's [Window] ancestor is focused. This may be a change of focus between two windows of the same engine instance, or from the OS desktop or a third-party application to a window of the game (in which case [constant NOTIFICATION_APPLICATION_FOCUS_IN] is also received).  
         *  A [Window] node receives this notification when it is focused.  
         */
        static readonly NOTIFICATION_WM_WINDOW_FOCUS_IN = 1004
        
        /** Notification received from the OS when the node's [Window] ancestor is defocused. This may be a change of focus between two windows of the same engine instance, or from a window of the game to the OS desktop or a third-party application (in which case [constant NOTIFICATION_APPLICATION_FOCUS_OUT] is also received).  
         *  A [Window] node receives this notification when it is defocused.  
         */
        static readonly NOTIFICATION_WM_WINDOW_FOCUS_OUT = 1005
        
        /** Notification received from the OS when a close request is sent (e.g. closing the window with a "Close" button or [kbd]Alt + F4[/kbd]).  
         *  Implemented on desktop platforms.  
         */
        static readonly NOTIFICATION_WM_CLOSE_REQUEST = 1006
        
        /** Notification received from the OS when a go back request is sent (e.g. pressing the "Back" button on Android).  
         *  Implemented only on Android.  
         */
        static readonly NOTIFICATION_WM_GO_BACK_REQUEST = 1007
        
        /** Notification received when the window is resized.  
         *      
         *  **Note:** Only the resized [Window] node receives this notification, and it's not propagated to the child nodes.  
         */
        static readonly NOTIFICATION_WM_SIZE_CHANGED = 1008
        
        /** Notification received from the OS when the screen's dots per inch (DPI) scale is changed. Only implemented on macOS. */
        static readonly NOTIFICATION_WM_DPI_CHANGE = 1009
        
        /** Notification received when the mouse cursor enters the [Viewport]'s visible area, that is not occluded behind other [Control]s or [Window]s, provided its [member Viewport.gui_disable_input] is `false` and regardless if it's currently focused or not. */
        static readonly NOTIFICATION_VP_MOUSE_ENTER = 1010
        
        /** Notification received when the mouse cursor leaves the [Viewport]'s visible area, that is not occluded behind other [Control]s or [Window]s, provided its [member Viewport.gui_disable_input] is `false` and regardless if it's currently focused or not. */
        static readonly NOTIFICATION_VP_MOUSE_EXIT = 1011
        
        /** Notification received when the window is moved. */
        static readonly NOTIFICATION_WM_POSITION_CHANGED = 1012
        
        /** Notification received when the output max linear value returned by [method Window.get_output_max_linear_value] has changed.  
         *  This occurs when HDR output is enabled or disabled and when any HDR output luminance values of the window have changed, such as when the player adjusts their screen brightness setting or moves the window to a different screen.  
         */
        static readonly NOTIFICATION_WM_OUTPUT_MAX_LINEAR_VALUE_CHANGED = 1013
        
        /** Notification received from the OS when the application is exceeding its allocated memory.  
         *  Implemented only on iOS.  
         */
        static readonly NOTIFICATION_OS_MEMORY_WARNING = 2009
        
        /** Notification received when translations may have changed. Can be triggered by the user changing the locale, changing [member auto_translate_mode] or when the node enters the scene tree. Can be used to respond to language changes, for example to change the UI strings on the fly. Useful when working with the built-in translation support, like [method Object.tr].  
         *      
         *  **Note:** This notification is received alongside [constant NOTIFICATION_ENTER_TREE], so if you are instantiating a scene, the child nodes will not be initialized yet. You can use it to setup translations for this node, child nodes created from script, or if you want to access child nodes added in the editor, make sure the node is ready using [method is_node_ready].  
         *    
         */
        static readonly NOTIFICATION_TRANSLATION_CHANGED = 2010
        
        /** Notification received from the OS when a request for "About" information is sent.  
         *  Implemented only on macOS.  
         */
        static readonly NOTIFICATION_WM_ABOUT = 2011
        
        /** Notification received from Godot's crash handler when the engine is about to crash.  
         *  Implemented on desktop platforms, if the crash handler is enabled.  
         */
        static readonly NOTIFICATION_CRASH = 2012
        
        /** Notification received from the OS when an update of the Input Method Engine occurs (e.g. change of IME cursor position or composition string).  
         *  Implemented on desktop and web platforms.  
         */
        static readonly NOTIFICATION_OS_IME_UPDATE = 2013
        
        /** Notification received from the OS when the application is resumed.  
         *  Specific to the Android and iOS platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_RESUMED = 2014
        
        /** Notification received from the OS when the application is paused.  
         *  Specific to the Android and iOS platforms.  
         *      
         *  **Note:** On iOS, you only have approximately 5 seconds to finish a task started by this signal. If you go over this allotment, iOS will kill the app instead of pausing it.  
         */
        static readonly NOTIFICATION_APPLICATION_PAUSED = 2015
        
        /** Notification received from the OS when the application is focused, i.e. when changing the focus from the OS desktop or a thirdparty application to any open window of the Godot instance.  
         *  Implemented on desktop and mobile platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_FOCUS_IN = 2016
        
        /** Notification received from the OS when the application is defocused, i.e. when changing the focus from any open window of the Godot instance to the OS desktop or a thirdparty application.  
         *  Implemented on desktop and mobile platforms.  
         */
        static readonly NOTIFICATION_APPLICATION_FOCUS_OUT = 2017
        
        /** Notification received when the [TextServer] is changed. */
        static readonly NOTIFICATION_TEXT_SERVER_CHANGED = 2018
        
        /** Notification received when the application enters picture-in-picture mode. */
        static readonly NOTIFICATION_APPLICATION_PIP_MODE_ENTERED = 2019
        
        /** Notification received when the application exits picture-in-picture mode. */
        static readonly NOTIFICATION_APPLICATION_PIP_MODE_EXITED = 2020
        
        /** Notification received when an accessibility information update is required. */
        static readonly NOTIFICATION_ACCESSIBILITY_UPDATE = 3000
        
        /** Notification received when accessibility elements are invalidated. All node accessibility elements are automatically deleted after receiving this message, therefore all existing references to such elements should be discarded. */
        static readonly NOTIFICATION_ACCESSIBILITY_INVALIDATE = 3001
        constructor(identifier?: any)
        
        /** Called on each idle frame, prior to rendering, and after physics ticks have been processed. [param delta] is the time between frames in seconds.  
         *  It is only called if processing is enabled for this Node, which is done automatically if this method is overridden, and can be toggled with [method set_process].  
         *  Processing happens in order of [member process_priority], lower priority values are called first. Nodes with the same priority are processed in tree order, or top to bottom as seen in the editor (also known as pre-order traversal).  
         *  Corresponds to the [constant NOTIFICATION_PROCESS] notification in [method Object._notification].  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not an orphan).  
         *      
         *  **Note:** When the engine is struggling and the frame rate is lowered, [param delta] will increase. When [param delta] is increased, it's capped at a maximum of [member Engine.time_scale] * [member Engine.max_physics_steps_per_frame] / [member Engine.physics_ticks_per_second]. As a result, accumulated [param delta] may not represent real world time.  
         *      
         *  **Note:** When `--fixed-fps` is enabled or the engine is running in Movie Maker mode (see [MovieWriter]), process [param delta] will always be the same for every frame, regardless of how much time the frame took to render.  
         *      
         *  **Note:** Frame delta may be post-processed by [member OS.delta_smoothing] if this is enabled for the project.  
         */
        /* gdvirtual */ _process(delta: float64): void
        
        /** Called once on each physics tick, and allows Nodes to synchronize their logic with physics ticks. [param delta] is the logical time between physics ticks in seconds and is equal to [member Engine.time_scale] / [member Engine.physics_ticks_per_second].  
         *  It is only called if physics processing is enabled for this Node, which is done automatically if this method is overridden, and can be toggled with [method set_physics_process].  
         *  Processing happens in order of [member process_physics_priority], lower priority values are called first. Nodes with the same priority are processed in tree order, or top to bottom as seen in the editor (also known as pre-order traversal).  
         *  Corresponds to the [constant NOTIFICATION_PHYSICS_PROCESS] notification in [method Object._notification].  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not an orphan).  
         *      
         *  **Note:** Accumulated [param delta] may diverge from real world seconds.  
         */
        /* gdvirtual */ _physicsProcess(delta: float64): void
        
        /** Called when the node enters the [SceneTree] (e.g. upon instantiating, scene changing, or after calling [method add_child] in a script). If the node has children, its [method _enter_tree] callback will be called first, and then that of the children.  
         *  Corresponds to the [constant NOTIFICATION_ENTER_TREE] notification in [method Object._notification].  
         */
        /* gdvirtual */ _enterTree(): void
        
        /** Called when the node is about to leave the [SceneTree] (e.g. upon freeing, scene changing, or after calling [method remove_child] in a script). If the node has children, its [method _exit_tree] callback will be called last, after all its children have left the tree.  
         *  Corresponds to the [constant NOTIFICATION_EXIT_TREE] notification in [method Object._notification] and signal [signal tree_exiting]. To get notified when the node has already left the active tree, connect to the [signal tree_exited].  
         */
        /* gdvirtual */ _exitTree(): void
        
        /** Called when the node is "ready", i.e. when both the node and its children have entered the scene tree. If the node has children, their [method _ready] callbacks get triggered first, and the parent node will receive the ready notification afterwards.  
         *  Corresponds to the [constant NOTIFICATION_READY] notification in [method Object._notification]. See also the `@onready` annotation for variables.  
         *  Usually used for initialization. For even earlier initialization, [method Object._init] may be used. See also [method _enter_tree].  
         *      
         *  **Note:** This method may be called only once for each node. After removing a node from the scene tree and adding it again, [method _ready] will **not** be called a second time. This can be bypassed by requesting another call with [method request_ready], which may be called anywhere before adding the node again.  
         */
        /* gdvirtual */ _ready(): void
        
        /** The elements in the array returned from this method are displayed as warnings in the Scene dock if the script that overrides it is a `tool` script.  
         *  Returning an empty array produces no warnings.  
         *  Call [method update_configuration_warnings] when the warnings need to be updated for this node.  
         *    
         */
        /* gdvirtual */ _getConfigurationWarnings(): PackedStringArray
        
        /** The elements in the array returned from this method are displayed as warnings in the Scene dock if the script that overrides it is a `tool` script, and accessibility warnings are enabled in the editor settings.  
         *  Returning an empty array produces no warnings.  
         */
        /* gdvirtual */ _getAccessibilityConfigurationWarnings(): PackedStringArray
        
        /** Called when there is an input event. The input event propagates up through the node tree until a node consumes it.  
         *  It is only called if input processing is enabled, which is done automatically if this method is overridden, and can be toggled with [method set_process_input].  
         *  To consume the input event and stop it propagating further to other nodes, [method Viewport.set_input_as_handled] can be called.  
         *  For gameplay input, [method _unhandled_input] and [method _unhandled_key_input] are usually a better fit as they allow the GUI to intercept the events first.  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not an orphan).  
         */
        /* gdvirtual */ _input(event: InputEvent): void
        
        /** Called when an [InputEventKey], [InputEventShortcut], or [InputEventJoypadButton] hasn't been consumed by [method _input] or any GUI [Control] item. It is called before [method _unhandled_key_input] and [method _unhandled_input]. The input event propagates up through the node tree until a node consumes it.  
         *  It is only called if shortcut processing is enabled, which is done automatically if this method is overridden, and can be toggled with [method set_process_shortcut_input].  
         *  To consume the input event and stop it propagating further to other nodes, [method Viewport.set_input_as_handled] can be called.  
         *  This method can be used to handle shortcuts. For generic GUI events, use [method _input] instead. Gameplay events should usually be handled with either [method _unhandled_input] or [method _unhandled_key_input].  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not orphan).  
         */
        /* gdvirtual */ _shortcutInput(event: InputEvent): void
        
        /** Called when an [InputEvent] hasn't been consumed by [method _input] or any GUI [Control] item. It is called after [method _shortcut_input] and after [method _unhandled_key_input]. The input event propagates up through the node tree until a node consumes it.  
         *  It is only called if unhandled input processing is enabled, which is done automatically if this method is overridden, and can be toggled with [method set_process_unhandled_input].  
         *  To consume the input event and stop it propagating further to other nodes, [method Viewport.set_input_as_handled] can be called.  
         *  For gameplay input, this method is usually a better fit than [method _input], as GUI events need a higher priority. For keyboard shortcuts, consider using [method _shortcut_input] instead, as it is called before this method. Finally, to handle keyboard events, consider using [method _unhandled_key_input] for performance reasons.  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not an orphan).  
         */
        /* gdvirtual */ _unhandledInput(event: InputEvent): void
        
        /** Called when an [InputEventKey] hasn't been consumed by [method _input] or any GUI [Control] item. It is called after [method _shortcut_input] but before [method _unhandled_input]. The input event propagates up through the node tree until a node consumes it.  
         *  It is only called if unhandled key input processing is enabled, which is done automatically if this method is overridden, and can be toggled with [method set_process_unhandled_key_input].  
         *  To consume the input event and stop it propagating further to other nodes, [method Viewport.set_input_as_handled] can be called.  
         *  This method can be used to handle Unicode character input with [kbd]Alt[/kbd], [kbd]Alt + Ctrl[/kbd], and [kbd]Alt + Shift[/kbd] modifiers, after shortcuts were handled.  
         *  For gameplay input, this and [method _unhandled_input] are usually a better fit than [method _input], as GUI events should be handled first. This method also performs better than [method _unhandled_input], since unrelated events such as [InputEventMouseMotion] are automatically filtered. For shortcuts, consider using [method _shortcut_input] instead.  
         *      
         *  **Note:** This method is only called if the node is present in the scene tree (i.e. if it's not an orphan).  
         */
        /* gdvirtual */ _unhandledKeyInput(event: InputEvent): void
        
        /** Called during accessibility information updates to determine the currently focused sub-element, should return a sub-element RID or the value returned by [method get_accessibility_element]. */
        /* gdvirtual */ _getFocusedAccessibilityElement(): Rid
        
        /** Prints all orphan nodes (nodes outside the [SceneTree]). Useful for debugging.  
         *      
         *  **Note:** This method only works in debug builds. It does nothing in a project exported in release mode.  
         */
        static printOrphanNodes(): void
        
        /** Returns object IDs of all orphan nodes (nodes outside the [SceneTree]). Used for debugging.  
         *      
         *  **Note:** [method get_orphan_node_ids] only works in debug builds. When called in a project exported in release mode, [method get_orphan_node_ids] will return an empty array.  
         */
        static getOrphanNodeIds(): GArray<int64>
        
        /** Adds a [param sibling] node to this node's parent, and moves the added sibling right below this node.  
         *  If [param force_readable_name] is `true`, improves the readability of the added [param sibling]. If not named, the [param sibling] is renamed to its type, and if it shares [member name] with a sibling, a number is suffixed more appropriately. This operation is very slow. As such, it is recommended leaving this to `false`, which assigns a dummy name featuring `@` in both situations.  
         *  Use [method add_child] instead of this method if you don't need the child node to be added below a specific node in the list of children.  
         *      
         *  **Note:** If this node is internal, the added sibling will be internal too (see [method add_child]'s `internal` parameter).  
         */
        addSibling(sibling: Node, forceReadableName?: boolean /* = false */): void
        setName(name: StringName): void
        getName(): StringName
        
        /** Adds a child [param node]. Nodes can have any number of children, but every child must have a unique name. Child nodes are automatically deleted when the parent node is deleted, so an entire scene can be removed by deleting its topmost node.  
         *  If [param force_readable_name] is `true`, improves the readability of the added [param node]. If not named, the [param node] is renamed to its type, and if it shares [member name] with a sibling, a number is suffixed more appropriately. This operation is very slow. As such, it is recommended leaving this to `false`, which assigns a dummy name featuring `@` in both situations.  
         *  If [param internal] is different than [constant INTERNAL_MODE_DISABLED], the child will be added as internal node. These nodes are ignored by methods like [method get_children], unless their parameter `include_internal` is `true`. It also prevents these nodes being duplicated with their parent. The intended usage is to hide the internal nodes from the user, so the user won't accidentally delete or modify them. Used by some GUI nodes, e.g. [ColorPicker].  
         *      
         *  **Note:** If [param node] already has a parent, this method will fail. Use [method remove_child] first to remove [param node] from its current parent. For example:  
         *    
         *  If you need the child node to be added below a specific node in the list of children, use [method add_sibling] instead of this method.  
         *      
         *  **Note:** If you want a child to be persisted to a [PackedScene], you must set [member owner] in addition to calling [method add_child]. This is typically relevant for [url=https://docs.godotengine.org/en/latest/tutorials/plugins/running_code_in_the_editor.html]tool scripts[/url] and [url=https://docs.godotengine.org/en/latest/tutorials/plugins/editor/index.html]editor plugins[/url]. If [method add_child] is called without setting [member owner], the newly added [Node] will not be visible in the scene tree, though it will be visible in the 2D/3D view.  
         */
        addChild(node: NodePathMapChild<Map>, forceReadableName?: boolean /* = false */, internal?: Node.InternalMode /* = 0 */): void
        
        /** Removes a child [param node]. The [param node], along with its children, are **not** deleted. To delete a node, see [method queue_free].  
         *      
         *  **Note:** When this node is inside the tree, this method sets the [member owner] of the removed [param node] (or its descendants) to `null`, if their [member owner] is no longer an ancestor (see [method is_ancestor_of]).  
         */
        removeChild(node: NodePathMapChild<Map>): void
        
        /** Changes the parent of this [Node] to the [param new_parent]. The node needs to already have a parent. The node's [member owner] is preserved if its owner is still reachable from the new location (i.e., the node is still a descendant of the new parent after the operation).  
         *  If [param keep_global_transform] is `true`, the node's global transform will be preserved if supported. [Node2D], [Node3D] and [Control] support this argument (but [Control] keeps only position).  
         *  **Warning:** If [member ProjectSettings.physics/common/physics_interpolation] is enabled and reparenting causes a large change in global transform, the object may appear to move from its old position to its new one over the next physics tick. To avoid this, call [method reset_physics_interpolation] after reparenting.  
         */
        reparent(newParent: Node, keepGlobalTransform?: boolean /* = true */): void
        
        /** Returns the number of children of this node.  
         *  If [param include_internal] is `false`, internal children are not counted (see [method add_child]'s `internal` parameter).  
         */
        getChildCount(includeInternal?: boolean /* = false */): int64
        
        /** Returns all children of this node inside an [Array].  
         *  If [param include_internal] is `false`, excludes internal children from the returned array (see [method add_child]'s `internal` parameter).  
         */
        getChildren(includeInternal?: boolean /* = false */): GArray<NodePathMapChild<Map>>
        
        /** Fetches a child node by its index. Each child node has an index relative to its siblings (see [method get_index]). The first child is at index 0. Negative values can also be used to start from the end of the list. This method can be used in combination with [method get_child_count] to iterate over this node's children. If no child exists at the given index, this method returns `null` and an error is generated.  
         *  If [param include_internal] is `false`, internal children are ignored (see [method add_child]'s `internal` parameter).  
         *    
         *      
         *  **Note:** To fetch a node by [NodePath], use [method get_node].  
         */
        getChild(idx: int64, includeInternal?: boolean /* = false */): NodePathMapChild<Map>
        
        /** Returns `true` if the [param path] points to a valid node. See also [method get_node]. */
        hasNode(path: NodePath | string): boolean
        
        /** Fetches a node. The [NodePath] can either be a relative path (from this node), or an absolute path (from the [member SceneTree.root]) to a node. If [param path] does not point to a valid node, generates an error and returns `null`. Attempts to access methods on the return value will result in an  *"Attempt to call <method> on a null instance."*  error.  
         *      
         *  **Note:** Fetching by absolute path only works when the node is inside the scene tree (see [method is_inside_tree]).  
         *  **Example:** Assume this method is called from the Character node, inside the following tree:  
         *  [codeblock lang=text]  
         *   ┖╴root  
         *      ┠╴Character (you are here!)  
         *      ┃  ┠╴Sword  
         *      ┃  ┖╴Backpack  
         *      ┃     ┖╴Dagger  
         *      ┠╴MyGame  
         *      ┖╴Swamp  
         *         ┠╴Alligator  
         *         ┠╴Mosquito  
         *         ┖╴Goblin  
         *  [/codeblock]  
         *  The following calls will return a valid node:  
         *    
         */
        getNode<Path extends StaticNodePath<Map>, Default = never>(path: Path): ResolveNodePath<Map, Path, Default>
        
        /** Fetches a node by [NodePath]. Similar to [method get_node], but does not generate an error if [param path] does not point to a valid node. */
        getNodeOrNull<Path extends StaticNodePath<Map, undefined | Node>, Default = null>(path: Path): null | ResolveNodePath<Map, Path, Default, undefined | Node>
        getNodeOrNull(path: NodePath | string): null | Node
        
        /** Returns this node's parent node, or `null` if the node doesn't have a parent. */
        getParent(): null | Node
        
        /** Finds the first descendant of this node whose [member name] matches [param pattern], returning `null` if no match is found. The matching is done against node names,  *not*  their paths, through [method String.match]. As such, it is case-sensitive, `"*"` matches zero or more characters, and `"?"` matches any single character.  
         *  If [param recursive] is `false`, only this node's direct children are checked. Nodes are checked in tree order, so this node's first direct child is checked first, then its own direct children, etc., before moving to the second direct child, and so on. Internal children are also included in the search (see `internal` parameter in [method add_child]).  
         *  If [param owned] is `true`, only descendants with a valid [member owner] node are checked.  
         *      
         *  **Note:** This method can be very slow. Consider storing a reference to the found node in a variable. Alternatively, use [method get_node] with unique names (see [member unique_name_in_owner]).  
         *      
         *  **Note:** To find all descendant nodes matching a pattern or a class type, see [method find_children].  
         */
        findChild(pattern: string, recursive?: boolean /* = true */, owned?: boolean /* = true */): null | Node
        
        /** Finds all descendants of this node whose names match [param pattern], returning an empty [Array] if no match is found. The matching is done against node names,  *not*  their paths, through [method String.match]. As such, it is case-sensitive, `"*"` matches zero or more characters, and `"?"` matches any single character.  
         *  If [param type] is not empty, only descendants inheriting from [param type] are included (see [method Object.is_class]).  
         *  If [param recursive] is `false`, only this node's direct children are checked. Nodes are checked in tree order, so this node's first direct child is checked first, then its own direct children, etc., before moving to the second direct child, and so on. Internal children are also included in the search (see `internal` parameter in [method add_child]).  
         *  If [param owned] is `true`, only descendants with a valid [member owner] node are checked.  
         *      
         *  **Note:** This method can be very slow. Consider storing references to the found nodes in a variable.  
         *      
         *  **Note:** To find a single descendant node matching a pattern, see [method find_child].  
         */
        findChildren(pattern: string, type?: string /* = '' */, recursive?: boolean /* = true */, owned?: boolean /* = true */): GArray<Node>
        
        /** Finds the first ancestor of this node whose [member name] matches [param pattern], returning `null` if no match is found. The matching is done through [method String.match]. As such, it is case-sensitive, `"*"` matches zero or more characters, and `"?"` matches any single character. See also [method find_child] and [method find_children].  
         *      
         *  **Note:** As this method walks upwards in the scene tree, it can be slow in large, deeply nested nodes. Consider storing a reference to the found node in a variable. Alternatively, use [method get_node] with unique names (see [member unique_name_in_owner]).  
         */
        findParent(pattern: string): null | Node
        
        /** Returns `true` if [param path] points to a valid node and its subnames point to a valid [Resource], e.g. `Area2D/CollisionShape2D:shape`. Properties that are not [Resource] types (such as nodes or other [Variant] types) are not considered. See also [method get_node_and_resource]. */
        hasNodeAndResource(path: NodePath | string): boolean
        
        /** Fetches a node and its most nested resource as specified by the [NodePath]'s subname. Returns an [Array] of size `3` where:  
         *  - Element `0` is the [Node], or `null` if not found;  
         *  - Element `1` is the subname's last nested [Resource], or `null` if not found;  
         *  - Element `2` is the remaining [NodePath], referring to an existing, non-[Resource] property (see [method Object.get_indexed]).  
         *  **Example:** Assume that the child's [member Sprite2D.texture] has been assigned an [AtlasTexture]:  
         *    
         */
        getNodeAndResource(path: NodePath | string): GArray
        
        /** Returns `true` if this node is currently inside a [SceneTree]. See also [method get_tree]. */
        isInsideTree(): boolean
        
        /** Returns `true` if the node is part of the scene currently opened in the editor. */
        isPartOfEditedScene(): boolean
        
        /** Returns `true` if the given [param node] is a direct or indirect child of this node. */
        isAncestorOf(node: Node): boolean
        
        /** Returns `true` if the given [param node] occurs later in the scene hierarchy than this node. A node occurring later is usually processed last. */
        isGreaterThan(node: Node): boolean
        
        /** Returns the node's absolute path, relative to the [member SceneTree.root]. If the node is not inside the scene tree, this method fails and returns an empty [NodePath]. */
        getPath(): NodePath
        
        /** Returns the relative [NodePath] from this node to the specified [param node]. Both nodes must be in the same [SceneTree] or scene hierarchy, otherwise this method fails and returns an empty [NodePath].  
         *  If [param use_unique_path] is `true`, returns the shortest path accounting for this node's unique name (see [member unique_name_in_owner]).  
         *      
         *  **Note:** If you get a relative path which starts from a unique node, the path may be longer than a normal relative path, due to the addition of the unique node's name.  
         */
        getPathTo(node: Node, useUniquePath?: boolean /* = false */): NodePath
        
        /** Adds the node to the [param group]. Groups can be helpful to organize a subset of nodes, for example `"enemies"` or `"collectables"`. See notes in the description, and the group methods in [SceneTree].  
         *  If [param persistent] is `true`, the group will be stored when saved inside a [PackedScene]. All groups created and displayed in the Groups dock are persistent.  
         *      
         *  **Note:** To improve performance, the order of group names is  *not*  guaranteed and may vary between project runs. Therefore, do not rely on the group order.  
         *      
         *  **Note:** [SceneTree]'s group methods will  *not*  work on this node if not inside the tree (see [method is_inside_tree]).  
         */
        addToGroup(group: StringName, persistent?: boolean /* = false */): void
        
        /** Removes the node from the given [param group]. Does nothing if the node is not in the [param group]. See also notes in the description, and the [SceneTree]'s group methods. */
        removeFromGroup(group: StringName): void
        
        /** Returns `true` if this node has been added to the given [param group]. See [method add_to_group] and [method remove_from_group]. See also notes in the description, and the [SceneTree]'s group methods. */
        isInGroup(group: StringName): boolean
        
        /** Moves [param child_node] to the given index. A node's index is the order among its siblings. If [param to_index] is negative, the index is counted from the end of the list. See also [method get_child] and [method get_index].  
         *      
         *  **Note:** The processing order of several engine callbacks ([method _ready], [method _process], etc.) and notifications sent through [method propagate_notification] is affected by tree order. [CanvasItem] nodes are also rendered in tree order. See also [member process_priority].  
         */
        moveChild(childNode: NodePathMapChild<Map>, toIndex: int64): void
        
        /** Returns an [Array] of group names that the node has been added to.  
         *      
         *  **Note:** To improve performance, the order of group names is  *not*  guaranteed and may vary between project runs. Therefore, do not rely on the group order.  
         *      
         *  **Note:** This method may also return some group names starting with an underscore (`_`). These are internally used by the engine. To avoid conflicts, do not use custom groups starting with underscores. To exclude internal groups, see the following code snippet:  
         *    
         */
        getGroups(): GArray<StringName>
        
        /** Returns this node's order among its siblings. The first node's index is `0`. See also [method get_child].  
         *  If [param include_internal] is `false`, returns the index ignoring internal children. The first, non-internal child will have an index of `0` (see [method add_child]'s `internal` parameter).  
         */
        getIndex(includeInternal?: boolean /* = false */): int64
        
        /** Prints the node and its children to the console, recursively. The node does not have to be inside the tree. This method outputs [NodePath]s relative to this node, and is good for copy/pasting into [method get_node]. See also [method print_tree_pretty].  
         *  May print, for example:  
         *  [codeblock lang=text]  
         *  .  
         *  Menu  
         *  Menu/Label  
         *  Menu/Camera2D  
         *  SplashScreen  
         *  SplashScreen/Camera2D  
         *  [/codeblock]  
         */
        printTree(): void
        
        /** Prints the node and its children to the console, recursively. The node does not have to be inside the tree. Similar to [method print_tree], but the graphical representation looks like what is displayed in the editor's Scene dock. It is useful for inspecting larger trees.  
         *  May print, for example:  
         *  [codeblock lang=text]  
         *   ┖╴TheGame  
         *      ┠╴Menu  
         *      ┃  ┠╴Label  
         *      ┃  ┖╴Camera2D  
         *      ┖╴SplashScreen  
         *         ┖╴Camera2D  
         *  [/codeblock]  
         */
        printTreePretty(): void
        
        /** Returns the tree as a [String]. Used mainly for debugging purposes. This version displays the path relative to the current node, and is good for copy/pasting into the [method get_node] function. It also can be used in game UI/UX.  
         *  May print, for example:  
         *  [codeblock lang=text]  
         *  TheGame  
         *  TheGame/Menu  
         *  TheGame/Menu/Label  
         *  TheGame/Menu/Camera2D  
         *  TheGame/SplashScreen  
         *  TheGame/SplashScreen/Camera2D  
         *  [/codeblock]  
         */
        getTreeString(): string
        
        /** Similar to [method get_tree_string], this returns the tree as a [String]. This version displays a more graphical representation similar to what is displayed in the Scene Dock. It is useful for inspecting larger trees.  
         *  May print, for example:  
         *  [codeblock lang=text]  
         *   ┖╴TheGame  
         *      ┠╴Menu  
         *      ┃  ┠╴Label  
         *      ┃  ┖╴Camera2D  
         *      ┖╴SplashScreen  
         *         ┖╴Camera2D  
         *  [/codeblock]  
         */
        getTreeStringPretty(): string
        
        /** Calls [method Object.notification] with [param what] on this node and all of its children, recursively. */
        propagateNotification(what: int64): void
        
        /** Calls the given [param method] name, passing [param args] as arguments, on this node and all of its children, recursively.  
         *  If [param parent_first] is `true`, the method is called on this node first, then on all of its children. If `false`, the children's methods are called first.  
         */
        propagateCall(method: StringName, args?: GArray, parentFirst?: boolean /* = false */): void
        
        /** If set to `true`, enables physics (fixed framerate) processing. When a node is being processed, it will receive a [constant NOTIFICATION_PHYSICS_PROCESS] at a fixed (usually 60 FPS, see [member Engine.physics_ticks_per_second] to change) interval (and the [method _physics_process] callback will be called if it exists).  
         *      
         *  **Note:** If [method _physics_process] is overridden, this will be automatically enabled before [method _ready] is called.  
         */
        setPhysicsProcess(enable: boolean): void
        
        /** Returns the time elapsed (in seconds) since the last physics callback. This value is identical to [method _physics_process]'s `delta` parameter, and is often consistent at run-time, unless [member Engine.physics_ticks_per_second] is changed. See also [constant NOTIFICATION_PHYSICS_PROCESS].  
         *      
         *  **Note:** The returned value will be larger than expected if running at a framerate lower than [member Engine.physics_ticks_per_second] / [member Engine.max_physics_steps_per_frame] FPS. This is done to avoid "spiral of death" scenarios where performance would plummet due to an ever-increasing number of physics steps per frame. This behavior affects both [method _process] and [method _physics_process]. As a result, avoid using `delta` for time measurements in real-world seconds. Use the [Time] singleton's methods for this purpose instead, such as [method Time.get_ticks_usec].  
         */
        getPhysicsProcessDeltaTime(): float64
        
        /** Returns `true` if physics processing is enabled (see [method set_physics_process]). */
        isPhysicsProcessing(): boolean
        
        /** Returns the time elapsed (in seconds) since the last process callback. This value is identical to [method _process]'s `delta` parameter, and may vary from frame to frame. See also [constant NOTIFICATION_PROCESS].  
         *      
         *  **Note:** The returned value will be larger than expected if running at a framerate lower than [member Engine.physics_ticks_per_second] / [member Engine.max_physics_steps_per_frame] FPS. This is done to avoid "spiral of death" scenarios where performance would plummet due to an ever-increasing number of physics steps per frame. This behavior affects both [method _process] and [method _physics_process]. As a result, avoid using `delta` for time measurements in real-world seconds. Use the [Time] singleton's methods for this purpose instead, such as [method Time.get_ticks_usec].  
         */
        getProcessDeltaTime(): float64
        
        /** If set to `true`, enables processing. When a node is being processed, it will receive a [constant NOTIFICATION_PROCESS] on every drawn frame (and the [method _process] callback will be called if it exists).  
         *      
         *  **Note:** If [method _process] is overridden, this will be automatically enabled before [method _ready] is called.  
         *      
         *  **Note:** This method only affects the [method _process] callback, i.e. it has no effect on other callbacks like [method _physics_process]. If you want to disable all processing for the node, set [member process_mode] to [constant PROCESS_MODE_DISABLED].  
         */
        setProcess(enable: boolean): void
        
        /** Returns `true` if processing is enabled (see [method set_process]). */
        isProcessing(): boolean
        
        /** If set to `true`, enables input processing.  
         *      
         *  **Note:** If [method _input] is overridden, this will be automatically enabled before [method _ready] is called. Input processing is also already enabled for GUI controls, such as [Button] and [TextEdit].  
         */
        setProcessInput(enable: boolean): void
        
        /** Returns `true` if the node is processing input (see [method set_process_input]). */
        isProcessingInput(): boolean
        
        /** If set to `true`, enables shortcut processing for this node.  
         *      
         *  **Note:** If [method _shortcut_input] is overridden, this will be automatically enabled before [method _ready] is called.  
         */
        setProcessShortcutInput(enable: boolean): void
        
        /** Returns `true` if the node is processing shortcuts (see [method set_process_shortcut_input]). */
        isProcessingShortcutInput(): boolean
        
        /** If set to `true`, enables unhandled input processing. It enables the node to receive all input that was not previously handled (usually by a [Control]).  
         *      
         *  **Note:** If [method _unhandled_input] is overridden, this will be automatically enabled before [method _ready] is called. Unhandled input processing is also already enabled for GUI controls, such as [Button] and [TextEdit].  
         */
        setProcessUnhandledInput(enable: boolean): void
        
        /** Returns `true` if the node is processing unhandled input (see [method set_process_unhandled_input]). */
        isProcessingUnhandledInput(): boolean
        
        /** If set to `true`, enables unhandled key input processing.  
         *      
         *  **Note:** If [method _unhandled_key_input] is overridden, this will be automatically enabled before [method _ready] is called.  
         */
        setProcessUnhandledKeyInput(enable: boolean): void
        
        /** Returns `true` if the node is processing unhandled key input (see [method set_process_unhandled_key_input]). */
        isProcessingUnhandledKeyInput(): boolean
        
        /** Returns `true` if the node can receive processing notifications and input callbacks ([constant NOTIFICATION_PROCESS], [method _input], etc.) from the [SceneTree] and [Viewport]. The returned value depends on [member process_mode]:  
         *  - If set to [constant PROCESS_MODE_PAUSABLE], returns `true` when the game is processing, i.e. [member SceneTree.paused] is `false`;  
         *  - If set to [constant PROCESS_MODE_WHEN_PAUSED], returns `true` when the game is paused, i.e. [member SceneTree.paused] is `true`;  
         *  - If set to [constant PROCESS_MODE_ALWAYS], always returns `true`;  
         *  - If set to [constant PROCESS_MODE_DISABLED], always returns `false`;  
         *  - If set to [constant PROCESS_MODE_INHERIT], use the parent node's [member process_mode] to determine the result.  
         *  If the node is not inside the tree, returns `false` no matter the value of [member process_mode].  
         */
        canProcess(): boolean
        
        /** Queues an accessibility information update for this node. */
        queueAccessibilityUpdate(): void
        
        /** Returns main accessibility element RID.  
         *      
         *  **Note:** This method should be called only during accessibility information updates ([constant NOTIFICATION_ACCESSIBILITY_UPDATE]).  
         */
        getAccessibilityElement(): Rid
        
        /** If set to `true`, the node appears folded in the Scene dock. As a result, all of its children are hidden. This method is intended to be used in editor plugins and tools, but it also works in release builds. See also [method is_displayed_folded]. */
        setDisplayFolded(fold: boolean): void
        
        /** Returns `true` if the node is folded (collapsed) in the Scene dock. This method is intended to be used in editor plugins and tools. See also [method set_display_folded]. */
        isDisplayedFolded(): boolean
        
        /** If set to `true`, enables internal processing for this node. Internal processing happens in isolation from the normal [method _process] calls and is used by some nodes internally to guarantee proper functioning even if the node is paused or processing is disabled for scripting ([method set_process]).  
         *  **Warning:** Built-in nodes rely on internal processing for their internal logic. Disabling it is unsafe and may lead to unexpected behavior. Use this method if you know what you are doing.  
         */
        setProcessInternal(enable: boolean): void
        
        /** Returns `true` if internal processing is enabled (see [method set_process_internal]). */
        isProcessingInternal(): boolean
        
        /** If set to `true`, enables internal physics for this node. Internal physics processing happens in isolation from the normal [method _physics_process] calls and is used by some nodes internally to guarantee proper functioning even if the node is paused or physics processing is disabled for scripting ([method set_physics_process]).  
         *  **Warning:** Built-in nodes rely on internal processing for their internal logic. Disabling it is unsafe and may lead to unexpected behavior. Use this method if you know what you are doing.  
         */
        setPhysicsProcessInternal(enable: boolean): void
        
        /** Returns `true` if internal physics processing is enabled (see [method set_physics_process_internal]). */
        isPhysicsProcessingInternal(): boolean
        
        /** Returns `true` if physics interpolation is enabled for this node (see [member physics_interpolation_mode]).  
         *      
         *  **Note:** Interpolation will only be active if both the flag is set **and** physics interpolation is enabled within the [SceneTree]. This can be tested using [method is_physics_interpolated_and_enabled].  
         */
        isPhysicsInterpolated(): boolean
        
        /** Returns `true` if physics interpolation is enabled (see [member physics_interpolation_mode]) **and** enabled in the [SceneTree].  
         *  This is a convenience version of [method is_physics_interpolated] that also checks whether physics interpolation is enabled globally.  
         *  See [member SceneTree.physics_interpolation] and [member ProjectSettings.physics/common/physics_interpolation].  
         */
        isPhysicsInterpolatedAndEnabled(): boolean
        
        /** When physics interpolation is active, moving a node to a radically different transform (such as placement within a level) can result in a visible glitch as the object is rendered moving from the old to new position over the physics tick.  
         *  That glitch can be prevented by calling this method, which temporarily disables interpolation until the physics tick is complete.  
         *  The notification [constant NOTIFICATION_RESET_PHYSICS_INTERPOLATION] will be received by the node and all children recursively.  
         *      
         *  **Note:** This function should be called **after** moving the node, rather than before.  
         */
        resetPhysicsInterpolation(): void
        
        /** Returns `true` if this node can automatically translate messages depending on the current locale. See [member auto_translate_mode], [method atr], and [method atr_n]. */
        canAutoTranslate(): boolean
        
        /** Makes this node inherit the translation domain from its parent node. If this node has no parent, the main translation domain will be used.  
         *  This is the default behavior for all nodes. Calling [method Object.set_translation_domain] disables this behavior.  
         */
        setTranslationDomainInherited(): void
        
        /** Returns the [Window] that contains this node. If the node is in the main window, this is equivalent to getting the root node (`get_tree().get_root()`). */
        getWindow(): null | Window
        
        /** Returns the [Window] that contains this node, or the last exclusive child in a chain of windows starting with the one that contains this node. */
        getLastExclusiveWindow(): null | Window
        
        /** Returns the [SceneTree] that contains this node. If this node is not inside the tree, generates an error and returns `null`. See also [method is_inside_tree]. */
        getTree(): SceneTree
        
        /** Creates a new [Tween] and binds it to this node.  
         *  This is the equivalent of doing:  
         *    
         *  The Tween will start automatically on the next process frame or physics frame (depending on [enum Tween.TweenProcessMode]). See [method Tween.bind_node] for more info on Tweens bound to nodes.  
         *      
         *  **Note:** The method can still be used when the node is not inside [SceneTree]. It can fail in an unlikely case of using a custom [MainLoop].  
         */
        createTween(): Tween
        
        /** Duplicates the node, returning a new node with all of its properties, signals, groups, and children copied from the original, recursively. The behavior can be tweaked through the [param flags] (see [enum DuplicateFlags]). Internal nodes are not duplicated.  
         *      
         *  **Note:** For nodes with a [Script] attached, if [method Object._init] has been defined with required parameters, the duplicated node will not have a [Script].  
         *      
         *  **Note:** By default, this method will duplicate only properties marked for serialization (i.e. using [constant @GlobalScope.PROPERTY_USAGE_STORAGE], or in GDScript, [annotation @GDScript.@export]). If you want to duplicate all properties, use [constant DUPLICATE_INTERNAL_STATE].  
         */
        duplicate(flags?: int64 /* = 15 */): null | Node
        
        /** Replaces this node by the given [param node]. All children of this node are moved to [param node].  
         *  If [param keep_groups] is `true`, the [param node] is added to the same groups that the replaced node is in (see [method add_to_group]).  
         *  If [param keep_owned_children] is `true`, children owned by this node are also transferred to [param node]. If `false`, non-owned children of owned nodes are placed at the root of [param node].  
         *  **Warning:** The replaced node is removed from the tree, but it is **not** deleted. To prevent memory leaks, store a reference to the node in a variable, or use [method Object.free].  
         */
        replaceBy(node: Node, keepGroups?: boolean /* = false */, keepOwnedChildren?: boolean /* = true */): void
        
        /** If set to `true`, the node becomes an [InstancePlaceholder] when packed and instantiated from a [PackedScene]. See also [method get_scene_instance_load_placeholder]. */
        setSceneInstanceLoadPlaceholder(loadPlaceholder: boolean): void
        
        /** Returns `true` if this node is an instance load placeholder. See [InstancePlaceholder] and [method set_scene_instance_load_placeholder]. */
        getSceneInstanceLoadPlaceholder(): boolean
        
        /** Set to `true` to allow all nodes owned by [param node] to be available, and editable, in the Scene dock, even if their [member owner] is not the scene root. This method is intended to be used in editor plugins and tools, but it also works in release builds. See also [method is_editable_instance]. */
        setEditableInstance(node: Node, isEditable: boolean): void
        
        /** Returns `true` if [param node] has editable children enabled relative to this node. This method is intended to be used in editor plugins and tools. See also [method set_editable_instance]. */
        isEditableInstance(node: Node): boolean
        
        /** Returns the node's closest [Viewport] ancestor, if the node is inside the tree. Otherwise, returns `null`. */
        getViewport(): null | Viewport
        
        /** Queues this node to be deleted at the end of the current frame. When deleted, all of its children are deleted as well, and all references to the node and its children become invalid.  
         *  Unlike with [method Object.free], the node is not deleted instantly, and it can still be accessed before deletion. It is also safe to call [method queue_free] multiple times. Use [method Object.is_queued_for_deletion] to check if the node will be deleted at the end of the frame.  
         *      
         *  **Note:** The node will only be freed after all other deferred calls are finished. Using this method is not always the same as calling [method Object.free] through [method Object.call_deferred].  
         */
        queueFree(): void
        
        /** Requests [method _ready] to be called again the next time the node enters the tree. Does **not** immediately call [method _ready].  
         *      
         *  **Note:** This method only affects the current node. If the node's children also need to request ready, this method needs to be called for each one of them. When the node and its children enter the tree again, the order of [method _ready] callbacks will be the same as normal.  
         */
        requestReady(): void
        
        /** Returns `true` if the node is ready, i.e. it's inside scene tree and all its children are initialized.  
         *  [method request_ready] resets it back to `false`.  
         */
        isNodeReady(): boolean
        
        /** Sets the node's multiplayer authority to the peer with the given peer [param id]. The multiplayer authority is the peer that has authority over the node on the network. Defaults to peer ID 1 (the server). Useful in conjunction with [method rpc_config] and the [MultiplayerAPI].  
         *  If [param recursive] is `true`, the given peer is recursively set as the authority for all children of this node.  
         *  **Warning:** This does **not** automatically replicate the new authority to other peers. It is the developer's responsibility to do so. You may replicate the new authority's information using [member MultiplayerSpawner.spawn_function], an RPC, or a [MultiplayerSynchronizer]. Furthermore, the parent's authority does **not** propagate to newly added children.  
         */
        setMultiplayerAuthority(id: int64, recursive?: boolean /* = true */): void
        
        /** Returns the peer ID of the multiplayer authority for this node. See [method set_multiplayer_authority]. */
        getMultiplayerAuthority(): int64
        
        /** Returns `true` if the local system is the multiplayer authority of this node. */
        isMultiplayerAuthority(): boolean
        
        /** Changes the RPC configuration for the given [param method]. [param config] should either be `null` to disable the feature (as by default), or a [Dictionary] containing the following entries:  
         *  - `rpc_mode`: see [enum MultiplayerAPI.RPCMode];  
         *  - `transfer_mode`: see [enum MultiplayerPeer.TransferMode];  
         *  - `call_local`: if `true`, the method will also be called locally;  
         *  - `channel`: an [int] representing the channel to send the RPC on.  
         *      
         *  **Note:** In GDScript, this method corresponds to the [annotation @GDScript.@rpc] annotation, with various parameters passed (`@rpc(any)`, `@rpc(authority)`...). See also the [url=https://docs.godotengine.org/en/latest/tutorials/networking/high_level_multiplayer.html]high-level multiplayer[/url] tutorial.  
         */
        rpcConfig(method: StringName, config: any): void
        
        /** Returns a [Dictionary] mapping method names to their RPC configuration defined for this node using [method rpc_config].  
         *      
         *  **Note:** This method only returns the RPC configuration assigned via [method rpc_config]. See [method Script.get_rpc_config] to retrieve the RPCs defined by the [Script].  
         */
        getNodeRpcConfig(): any
        
        /** Translates a [param message], using the translation catalogs configured in the Project Settings. Further [param context] can be specified to help with the translation. Note that most [Control] nodes automatically translate their strings, so this method is mostly useful for formatted strings or custom drawn text.  
         *  This method works the same as [method Object.tr], with the addition of respecting the [member auto_translate_mode] state.  
         *  If [method Object.can_translate_messages] is `false`, or no translation is available, this method returns the [param message] without changes. See [method Object.set_message_translation].  
         *  For detailed examples, see [url=https://docs.godotengine.org/en/latest/tutorials/i18n/internationalizing_games.html]Internationalizing games[/url].  
         */
        atr(message: string, context?: StringName /* = '' */): string
        
        /** Translates a [param message] or [param plural_message], using the translation catalogs configured in the Project Settings. Further [param context] can be specified to help with the translation.  
         *  This method works the same as [method Object.tr_n], with the addition of respecting the [member auto_translate_mode] state.  
         *  If [method Object.can_translate_messages] is `false`, or no translation is available, this method returns [param message] or [param plural_message], without changes. See [method Object.set_message_translation].  
         *  The [param n] is the number, or amount, of the message's subject. It is used by the translation system to fetch the correct plural form for the current language.  
         *  For detailed examples, see [url=https://docs.godotengine.org/en/latest/tutorials/i18n/localization_using_gettext.html]Localization using gettext[/url].  
         *      
         *  **Note:** Negative and [float] numbers may not properly apply to some countable subjects. It's recommended to handle these cases with [method atr].  
         */
        atrN(message: string, pluralMessage: StringName, n: int64, context?: StringName /* = '' */): string
        _setPropertyPinned(property: string, pinned: boolean): void
        
        /** Sends a remote procedure call request for the given [param method] to peers on the network (and locally), sending additional arguments to the method called by the RPC. The call request will only be received by nodes with the same [NodePath], including the exact same [member name]. Behavior depends on the RPC configuration for the given [param method] (see [method rpc_config] and [annotation @GDScript.@rpc]). By default, methods are not exposed to RPCs.  
         *  May return [constant OK] if the call is successful, [constant ERR_INVALID_PARAMETER] if the arguments passed in the [param method] do not match, [constant ERR_UNCONFIGURED] if the node's [member multiplayer] cannot be fetched (such as when the node is not inside the tree), [constant ERR_CONNECTION_ERROR] if [member multiplayer]'s connection is not available.  
         *      
         *  **Note:** You can only safely use RPCs on clients after you received the [signal MultiplayerAPI.connected_to_server] signal from the [MultiplayerAPI]. You also need to keep track of the connection state, either by the [MultiplayerAPI] signals like [signal MultiplayerAPI.server_disconnected] or by checking (`get_multiplayer().peer.get_connection_status() == CONNECTION_CONNECTED`).  
         */
        rpc<Method extends GodotRpcNames<this>>(method: Method, ...varargs: ResolveGodotRpcParameters<this, Method>): GError
        
        /** Sends a [method rpc] to a specific peer identified by [param peer_id] (see [method MultiplayerPeer.set_target_peer]).  
         *  May return [constant OK] if the call is successful, [constant ERR_INVALID_PARAMETER] if the arguments passed in the [param method] do not match, [constant ERR_UNCONFIGURED] if the node's [member multiplayer] cannot be fetched (such as when the node is not inside the tree), [constant ERR_CONNECTION_ERROR] if [member multiplayer]'s connection is not available.  
         */
        rpcId<Method extends GodotRpcNames<this>>(peerId: int64, method: Method, ...varargs: ResolveGodotRpcParameters<this, Method>): GError
        
        /** Refreshes the warnings displayed for this node in the Scene dock. Use [method _get_configuration_warnings] to customize the warning messages to display. */
        updateConfigurationWarnings(): void
        
        /** This function is similar to [method Object.call_deferred] except that the call will take place when the node thread group is processed. If the node thread group processes in sub-threads, then the call will be done on that thread, right before [constant NOTIFICATION_PROCESS] or [constant NOTIFICATION_PHYSICS_PROCESS], the [method _process] or [method _physics_process] or their internal versions are called. */
        callDeferredThreadGroup(method: StringName, ...varargs: any[]): any
        
        /** Similar to [method call_deferred_thread_group], but for setting properties. */
        setDeferredThreadGroup(property: StringName, value: any): void
        
        /** Similar to [method call_deferred_thread_group], but for notifications. */
        notifyDeferredThreadGroup(what: int64): void
        
        /** This function ensures that the calling of this function will succeed, no matter whether it's being done from a thread or not. If called from a thread that is not allowed to call the function, the call will become deferred. Otherwise, the call will go through directly. */
        callThreadSafe(method: StringName, ...varargs: any[]): any
        
        /** Similar to [method call_thread_safe], but for setting properties. */
        setThreadSafe(property: StringName, value: any): void
        
        /** Similar to [method call_thread_safe], but for notifications. */
        notifyThreadSafe(what: int64): void
        
        /** If `true`, the node can be accessed from any node sharing the same [member owner] or from the [member owner] itself, with special `%Name` syntax in [method get_node].  
         *      
         *  **Note:** If another node with the same [member owner] shares the same [member name] as this node, the other node will no longer be accessible as unique.  
         */
        get uniqueNameInOwner(): boolean
        set uniqueNameInOwner(value: boolean)
        
        /** The original scene's file path, if the node has been instantiated from a [PackedScene] file. Only scene root nodes contains this. */
        get sceneFilePath(): string
        set sceneFilePath(value: string)
        
        /** The owner of this node. The owner must be an ancestor of this node. When packing the owner node in a [PackedScene], all the nodes it owns are also saved with it. See also [member unique_name_in_owner].  
         *      
         *  **Note:** In the editor, nodes not owned by the scene root are usually not displayed in the Scene dock, and will **not** be saved. To prevent this, remember to set the owner after calling [method add_child].  
         *      
         *  **Note:** The owner needs to be the current scene root. See [url=https://docs.godotengine.org/en/latest/tutorials/plugins/running_code_in_the_editor.html#instancing-scenes]Instancing scenes[/url] in the documentation for more information.  
         */
        get owner(): null | Node
        set owner(value: null | Node)
        
        /** The [MultiplayerAPI] instance associated with this node. See [method SceneTree.get_multiplayer].  
         *      
         *  **Note:** Renaming the node, or moving it in the tree, will not move the [MultiplayerAPI] to the new path, you will have to update this manually.  
         */
        get multiplayer(): null | MultiplayerApi
        
        /** The node's processing behavior. To check if the node can process in its current mode, use [method can_process]. */
        get processMode(): int64
        set processMode(value: int64)
        
        /** The node's execution order of the process callbacks ([method _process], [constant NOTIFICATION_PROCESS], and [constant NOTIFICATION_INTERNAL_PROCESS]). Nodes whose priority value is  *lower*  call their process callbacks first, regardless of tree order. */
        get processPriority(): int64
        set processPriority(value: int64)
        
        /** Similar to [member process_priority] but for [constant NOTIFICATION_PHYSICS_PROCESS], [method _physics_process], or [constant NOTIFICATION_INTERNAL_PHYSICS_PROCESS]. */
        get processPhysicsPriority(): int64
        set processPhysicsPriority(value: int64)
        
        /** Set the process thread group for this node (basically, whether it receives [constant NOTIFICATION_PROCESS], [constant NOTIFICATION_PHYSICS_PROCESS], [method _process] or [method _physics_process] (and the internal versions) on the main thread or in a sub-thread.  
         *  By default, the thread group is [constant PROCESS_THREAD_GROUP_INHERIT], which means that this node belongs to the same thread group as the parent node. The thread groups means that nodes in a specific thread group will process together, separate to other thread groups (depending on [member process_thread_group_order]). If the value is set is [constant PROCESS_THREAD_GROUP_SUB_THREAD], this thread group will occur on a sub thread (not the main thread), otherwise if set to [constant PROCESS_THREAD_GROUP_MAIN_THREAD] it will process on the main thread. If there is not a parent or grandparent node set to something other than inherit, the node will belong to the  *default thread group* . This default group will process on the main thread and its group order is 0.  
         *  During processing in a sub-thread, accessing most functions in nodes outside the thread group is forbidden (and it will result in an error in debug mode). Use [method Object.call_deferred], [method call_thread_safe], [method call_deferred_thread_group] and the likes in order to communicate from the thread groups to the main thread (or to other thread groups).  
         *  To better understand process thread groups, the idea is that any node set to any other value than [constant PROCESS_THREAD_GROUP_INHERIT] will include any child (and grandchild) nodes set to inherit into its process thread group. This means that the processing of all the nodes in the group will happen together, at the same time as the node including them.  
         */
        get processThreadGroup(): int64
        set processThreadGroup(value: int64)
        
        /** Change the process thread group order. Groups with a lesser order will process before groups with a greater order. This is useful when a large amount of nodes process in sub thread and, afterwards, another group wants to collect their result in the main thread, as an example. */
        get processThreadGroupOrder(): int64
        set processThreadGroupOrder(value: int64)
        
        /** Set whether the current thread group will process messages (calls to [method call_deferred_thread_group] on threads), and whether it wants to receive them during regular process or physics process callbacks. */
        get processThreadMessages(): int64
        set processThreadMessages(value: int64)
        
        /** The physics interpolation mode to use for this node. Only effective if [member ProjectSettings.physics/common/physics_interpolation] or [member SceneTree.physics_interpolation] is `true`.  
         *  By default, nodes inherit the physics interpolation mode from their parent. This property can enable or disable physics interpolation individually for each node, regardless of their parents' physics interpolation mode.  
         *      
         *  **Note:** Some node types like [VehicleWheel3D] have physics interpolation disabled by default, as they rely on their own custom solution.  
         *      
         *  **Note:** When teleporting a node to a distant position, it's recommended to temporarily disable interpolation with [method Node.reset_physics_interpolation]  *after*  moving the node. This avoids creating a visual streak between the old and new positions.  
         */
        get physicsInterpolationMode(): int64
        set physicsInterpolationMode(value: int64)
        
        /** Defines if any text should automatically change to its translated version depending on the current locale (for nodes such as [Label], [RichTextLabel], [Window], etc.). Also decides if the node's strings should be parsed for translation template generation.  
         *      
         *  **Note:** For the root node, auto translate mode can also be set via [member ProjectSettings.internationalization/rendering/root_node_auto_translate].  
         */
        get autoTranslateMode(): int64
        set autoTranslateMode(value: int64)
        
        /** An optional description to the node. It will be displayed as a tooltip when hovering over the node in the editor's Scene dock. */
        get editorDescription(): string
        set editorDescription(value: string)
        
        /** Emitted when the node is considered ready, after [method _ready] is called. */
        readonly ready: Signal<() => void>
        
        /** Emitted when the node's [member name] is changed, if the node is inside the tree. */
        readonly renamed: Signal<() => void>
        
        /** Emitted when the node enters the tree.  
         *  This signal is emitted  *after*  the related [constant NOTIFICATION_ENTER_TREE] notification.  
         */
        readonly treeEntered: Signal<() => void>
        
        /** Emitted when the node is just about to exit the tree. The node is still valid. As such, this is the right place for de-initialization (or a "destructor", if you will).  
         *  This signal is emitted  *after*  the node's [method _exit_tree], and  *before*  the related [constant NOTIFICATION_EXIT_TREE].  
         */
        readonly treeExiting: Signal<() => void>
        
        /** Emitted after the node exits the tree and is no longer active.  
         *  This signal is emitted  *after*  the related [constant NOTIFICATION_EXIT_TREE] notification.  
         */
        readonly treeExited: Signal<() => void>
        
        /** Emitted when the child [param node] enters the [SceneTree], usually because this node entered the tree (see [signal tree_entered]), or [method add_child] has been called.  
         *  This signal is emitted  *after*  the child node's own [constant NOTIFICATION_ENTER_TREE] and [signal tree_entered].  
         */
        readonly childEnteredTree: Signal<(node: Node) => void>
        
        /** Emitted when the child [param node] is about to exit the [SceneTree], usually because this node is exiting the tree (see [signal tree_exiting]), or because the child [param node] is being removed or freed.  
         *  When this signal is received, the child [param node] is still accessible inside the tree. This signal is emitted  *after*  the child node's own [signal tree_exiting] and [constant NOTIFICATION_EXIT_TREE].  
         */
        readonly childExitingTree: Signal<(node: Node) => void>
        
        /** Emitted when the list of children is changed. This happens when child nodes are added, moved or removed. */
        readonly childOrderChanged: Signal<() => void>
        
        /** Emitted when this node is being replaced by the [param node], see [method replace_by].  
         *  This signal is emitted  *after*  [param node] has been added as a child of the original parent node, but  *before*  all original child nodes have been reparented to [param node].  
         */
        readonly replacingBy: Signal<(node: Node) => void>
        
        /** Emitted when the node's editor description field changed. */
        readonly editorDescriptionChanged: Signal<(node: Node) => void>
        
        /** Emitted when an attribute of the node that is relevant to the editor is changed. Only emitted in the editor. */
        readonly editorStateChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNode;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNode;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNode2D extends __RPCMapCanvasItem {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNode2D extends __NameMapCanvasItem {
        move_local_x: "moveLocalX";
        move_local_y: "moveLocalY";
        global_translate: "globalTranslate";
        apply_scale: "applyScale";
        look_at: "lookAt";
        get_angle_to: "getAngleTo";
        to_local: "toLocal";
        to_global: "toGlobal";
        get_relative_transform_to_parent: "getRelativeTransformToParent";
        rotation_degrees: "rotationDegrees";
        global_position: "globalPosition";
        global_rotation: "globalRotation";
        global_rotation_degrees: "globalRotationDegrees";
        global_scale: "globalScale";
        global_skew: "globalSkew";
        global_transform: "globalTransform";
    }
    /** A 2D game object, inherited by all 2D-related nodes. Has a position, rotation, scale, and skew.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_node2d.html  
     */
    class Node2D<Map extends NodePathMap = any> extends CanvasItem<Map> {
        constructor(identifier?: any)
        /** Applies a rotation to the node, in radians, starting from its current rotation. This is equivalent to `rotation += radians`. */
        rotate(radians: float64): void
        
        /** Applies a local translation on the node's X axis with the amount specified in [param delta]. If [param scaled] is `false`, normalizes the movement to occur independently of the node's [member scale]. */
        moveLocalX(delta: float64, scaled?: boolean /* = false */): void
        
        /** Applies a local translation on the node's Y axis with the amount specified in [param delta]. If [param scaled] is `false`, normalizes the movement to occur independently of the node's [member scale]. */
        moveLocalY(delta: float64, scaled?: boolean /* = false */): void
        
        /** Translates the node by the given [param offset] in local coordinates. This is equivalent to `position += offset`. */
        translate(offset: Vector2): void
        
        /** Adds the [param offset] vector to the node's global position. */
        globalTranslate(offset: Vector2): void
        
        /** Multiplies the current scale by the [param ratio] vector. */
        applyScale(ratio: Vector2): void
        
        /** Rotates the node so that its local +X axis points towards the [param point], which is expected to use global coordinates. This method is a combination of both [method rotate] and [method get_angle_to].  
         *  [param point] should not be the same as the node's position, otherwise the node always looks to the right.  
         */
        lookAt(point: Vector2): void
        
        /** Returns the angle between the node and the [param point] in radians. See also [method look_at].  
         *  [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/node2d_get_angle_to.png]Illustration of the returned angle.[/url]  
         */
        getAngleTo(point: Vector2): float64
        
        /** Transforms the provided global position into a position in local coordinate space. The output will be local relative to the [Node2D] it is called on. e.g. It is appropriate for determining the positions of child nodes, but it is not appropriate for determining its own position relative to its parent. */
        toLocal(globalPoint: Vector2): Vector2
        
        /** Transforms the provided local position into a position in global coordinate space. The input is expected to be local relative to the [Node2D] it is called on. e.g. Applying this method to the positions of child nodes will correctly transform their positions into the global coordinate space, but applying it to a node's own position will give an incorrect result, as it will incorporate the node's own transformation into its global position. */
        toGlobal(localPoint: Vector2): Vector2
        
        /** Returns the [Transform2D] relative to this node's parent. */
        getRelativeTransformToParent(parent: Node): Transform2D
        
        /** Position, relative to the node's parent. See also [member global_position]. */
        get position(): Vector2
        set position(value: Vector2)
        
        /** Rotation in radians, relative to the node's parent. See also [member global_rotation].  
         *      
         *  **Note:** This property is edited in the inspector in degrees. If you want to use degrees in a script, use [member rotation_degrees].  
         */
        get rotation(): float64
        set rotation(value: float64)
        
        /** Helper property to access [member rotation] in degrees instead of radians. See also [member global_rotation_degrees]. */
        get rotationDegrees(): float64
        set rotationDegrees(value: float64)
        
        /** The node's scale, relative to the node's parent. Unscaled value: `(1, 1)`. See also [member global_scale].  
         *      
         *  **Note:** Negative X scales in 2D are not decomposable from the transformation matrix. Due to the way scale is represented with transformation matrices in Godot, negative scales on the X axis will be changed to negative scales on the Y axis and a rotation of 180 degrees when decomposed.  
         */
        get scale(): Vector2
        set scale(value: Vector2)
        
        /** If set to a non-zero value, slants the node in one direction or another. This can be used for pseudo-3D effects. See also [member global_skew].  
         *      
         *  **Note:** Skew is performed on the X axis only, and  *between*  rotation and scaling.  
         *      
         *  **Note:** This property is edited in the inspector in degrees. If you want to use degrees in a script, use `skew = deg_to_rad(value_in_degrees)`.  
         */
        get skew(): float64
        set skew(value: float64)
        
        /** The node's [Transform2D], relative to the node's parent. See also [member global_transform]. */
        get transform(): Transform2D
        set transform(value: Transform2D)
        
        /** Global position. See also [member position]. */
        get globalPosition(): Vector2
        set globalPosition(value: Vector2)
        
        /** Global rotation in radians. See also [member rotation]. */
        get globalRotation(): float64
        set globalRotation(value: float64)
        
        /** Helper property to access [member global_rotation] in degrees instead of radians. See also [member rotation_degrees]. */
        get globalRotationDegrees(): float64
        set globalRotationDegrees(value: float64)
        
        /** Global scale. See also [member scale]. */
        get globalScale(): Vector2
        set globalScale(value: Vector2)
        
        /** Global skew in radians. See also [member skew]. */
        get globalSkew(): float64
        set globalSkew(value: float64)
        
        /** Global [Transform2D]. See also [member transform]. */
        get globalTransform(): Transform2D
        set globalTransform(value: Transform2D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNode2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNode2D;
    }
    namespace Node3D {
        enum RotationEditMode {
            RotationEditModeEuler = 0,
            RotationEditModeQuaternion = 1,
            RotationEditModeBasis = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNode3D extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNode3D extends __NameMapNode {
        get_global_transform_interpolated: "getGlobalTransformInterpolated";
        get_parent_node_3d: "getParentNode3D";
        set_ignore_transform_notification: "setIgnoreTransformNotification";
        set_disable_scale: "setDisableScale";
        is_scale_disabled: "isScaleDisabled";
        get_world_3d: "getWorld3D";
        force_update_transform: "forceUpdateTransform";
        update_gizmos: "updateGizmos";
        add_gizmo: "addGizmo";
        get_gizmos: "getGizmos";
        clear_gizmos: "clearGizmos";
        set_subgizmo_selection: "setSubgizmoSelection";
        clear_subgizmo_selection: "clearSubgizmoSelection";
        is_visible_in_tree: "isVisibleInTree";
        set_notify_local_transform: "setNotifyLocalTransform";
        is_local_transform_notification_enabled: "isLocalTransformNotificationEnabled";
        set_notify_transform: "setNotifyTransform";
        is_transform_notification_enabled: "isTransformNotificationEnabled";
        global_rotate: "globalRotate";
        global_scale: "globalScale";
        global_translate: "globalTranslate";
        rotate_object_local: "rotateObjectLocal";
        scale_object_local: "scaleObjectLocal";
        translate_object_local: "translateObjectLocal";
        rotate_x: "rotateX";
        rotate_y: "rotateY";
        rotate_z: "rotateZ";
        set_identity: "setIdentity";
        look_at: "lookAt";
        look_at_from_position: "lookAtFromPosition";
        to_local: "toLocal";
        to_global: "toGlobal";
        global_transform: "globalTransform";
        rotation_degrees: "rotationDegrees";
        rotation_edit_mode: "rotationEditMode";
        rotation_order: "rotationOrder";
        top_level: "topLevel";
        global_position: "globalPosition";
        global_basis: "globalBasis";
        global_rotation: "globalRotation";
        global_rotation_degrees: "globalRotationDegrees";
        visibility_parent: "visibilityParent";
        visibility_changed: "visibilityChanged";
    }
    /** Base object in 3D space, inherited by all 3D nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_node3d.html  
     */
    class Node3D<Map extends NodePathMap = any> extends Node<Map> {
        /** Notification received when this node's [member global_transform] changes, if [method is_transform_notification_enabled] is `true`. See also [method set_notify_transform].  
         *      
         *  **Note:** Most 3D nodes such as [VisualInstance3D] or [CollisionObject3D] automatically enable this to function correctly.  
         *      
         *  **Note:** In the editor, nodes will propagate this notification to their children if a gizmo is attached (see [method add_gizmo]).  
         */
        static readonly NOTIFICATION_TRANSFORM_CHANGED = 2000
        
        /** Notification received when this node is registered to a new [World3D] (see [method get_world_3d]). */
        static readonly NOTIFICATION_ENTER_WORLD = 41
        
        /** Notification received when this node is unregistered from the current [World3D] (see [method get_world_3d]).  
         *  This notification is sent in reversed order.  
         */
        static readonly NOTIFICATION_EXIT_WORLD = 42
        
        /** Notification received when this node's visibility changes (see [member visible] and [method is_visible_in_tree]).  
         *  This notification is received  *before*  the related [signal visibility_changed] signal.  
         */
        static readonly NOTIFICATION_VISIBILITY_CHANGED = 43
        
        /** Notification received when this node's [member transform] changes, if [method is_local_transform_notification_enabled] is `true`. This is not received when a parent [Node3D]'s [member transform] changes. See also [method set_notify_local_transform].  
         *      
         *  **Note:** Some 3D nodes such as [CSGShape3D] or [CollisionShape3D] automatically enable this to function correctly.  
         */
        static readonly NOTIFICATION_LOCAL_TRANSFORM_CHANGED = 44
        constructor(identifier?: any)
        
        /** When using physics interpolation, there will be circumstances in which you want to know the interpolated (displayed) transform of a node rather than the standard transform (which may only be accurate to the most recent physics tick).  
         *  This is particularly important for frame-based operations that take place in [method Node._process], rather than [method Node._physics_process]. Examples include [Camera3D]s focusing on a node, or finding where to fire lasers from on a frame rather than physics tick.  
         *      
         *  **Note:** This function creates an interpolation pump on the [Node3D] the first time it is called, which can respond to physics interpolation resets. If you get problems with "streaking" when initially following a [Node3D], be sure to call [method get_global_transform_interpolated] at least once  *before*  resetting the [Node3D] physics interpolation.  
         */
        getGlobalTransformInterpolated(): Transform3D
        
        /** Returns the parent [Node3D] that directly affects this node's [member global_transform]. Returns `null` if no parent exists, the parent is not a [Node3D], or [member top_level] is `true`.  
         *      
         *  **Note:** This method is not always equivalent to [method Node.get_parent], which does not take [member top_level] into account.  
         */
        getParentNode3D(): null | Node3D
        
        /** If `true`, the node will not receive [constant NOTIFICATION_TRANSFORM_CHANGED] or [constant NOTIFICATION_LOCAL_TRANSFORM_CHANGED].  
         *  It may useful to call this method when handling these notifications to prevent infinite recursion.  
         */
        setIgnoreTransformNotification(enabled: boolean): void
        
        /** If `true`, this node's [member global_transform] is automatically orthonormalized. This results in this node not appearing distorted, as if its global scale were set to [constant Vector3.ONE] (or its negative counterpart). See also [method is_scale_disabled] and [method orthonormalize].  
         *      
         *  **Note:** [member transform] is not affected by this setting.  
         */
        setDisableScale(disable: boolean): void
        
        /** Returns `true` if this node's [member global_transform] is automatically orthonormalized. This results in this node not appearing distorted, as if its global scale were set to [constant Vector3.ONE] (or its negative counterpart). See also [method set_disable_scale] and [method orthonormalize].  
         *      
         *  **Note:** [member transform] is not affected by this setting.  
         */
        isScaleDisabled(): boolean
        
        /** Returns the [World3D] this node is registered to.  
         *  Usually, this is the same as the world used by this node's viewport (see [method Node.get_viewport] and [method Viewport.find_world_3d]).  
         */
        getWorld3D(): null | World3D
        
        /** Forces the node's [member global_transform] to update, by sending [constant NOTIFICATION_TRANSFORM_CHANGED]. Fails if the node is not inside the tree.  
         *      
         *  **Note:** For performance reasons, transform changes are usually accumulated and applied  *once*  at the end of the frame. The update propagates through [Node3D] children, as well. Therefore, use this method only when you need an up-to-date transform (such as during physics operations).  
         */
        forceUpdateTransform(): void
        
        /** Updates all the [EditorNode3DGizmo] objects attached to this node. Only works in the editor. */
        updateGizmos(): void
        
        /** Attaches the given [param gizmo] to this node. Only works in the editor.  
         *      
         *  **Note:** [param gizmo] should be an [EditorNode3DGizmo]. The argument type is [Node3DGizmo] to avoid depending on editor classes in [Node3D].  
         */
        addGizmo(gizmo: Node3DGizmo): void
        
        /** Returns all the [EditorNode3DGizmo] objects attached to this node. Only works in the editor. */
        getGizmos(): GArray<Node3DGizmo>
        
        /** Clears all [EditorNode3DGizmo] objects attached to this node. Only works in the editor. */
        clearGizmos(): void
        
        /** Selects the [param gizmo]'s subgizmo with the given [param id] and sets its transform. Only works in the editor.  
         *      
         *  **Note:** The gizmo object would typically be an instance of [EditorNode3DGizmo], but the argument type is kept generic to avoid creating a dependency on editor classes in [Node3D].  
         */
        setSubgizmoSelection(gizmo: Node3DGizmo, id: int64, transform: Transform3D): void
        
        /** Deselects all subgizmos for this node. Useful to call when the selected subgizmo may no longer exist after a property change. Only works in the editor. */
        clearSubgizmoSelection(): void
        
        /** Returns `true` if this node is inside the scene tree and the [member visible] property is `true` for this node and all of its [Node3D] ancestors  *in sequence* . An ancestor of any other type (such as [Node] or [Node2D]) breaks the sequence. See also [method Node.get_parent].  
         *      
         *  **Note:** This method cannot take [member VisualInstance3D.layers] into account, so even if this method returns `true`, the node may not be rendered.  
         */
        isVisibleInTree(): boolean
        
        /** Allows this node to be rendered. Equivalent to setting [member visible] to `true`. This is the opposite of [method hide]. */
        show(): void
        
        /** Prevents this node from being rendered. Equivalent to setting [member visible] to `false`. This is the opposite of [method show]. */
        hide(): void
        
        /** If `true`, the node will receive [constant NOTIFICATION_LOCAL_TRANSFORM_CHANGED] whenever [member transform] changes.  
         *      
         *  **Note:** Some 3D nodes such as [CSGShape3D] or [CollisionShape3D] automatically enable this to function correctly.  
         */
        setNotifyLocalTransform(enable: boolean): void
        
        /** Returns `true` if the node receives [constant NOTIFICATION_LOCAL_TRANSFORM_CHANGED] whenever [member transform] changes. This is enabled with [method set_notify_local_transform]. */
        isLocalTransformNotificationEnabled(): boolean
        
        /** If `true`, the node will receive [constant NOTIFICATION_TRANSFORM_CHANGED] whenever [member global_transform] changes.  
         *      
         *  **Note:** Most 3D nodes such as [VisualInstance3D] or [CollisionObject3D] automatically enable this to function correctly.  
         *      
         *  **Note:** In the editor, nodes will propagate this notification to their children if a gizmo is attached (see [method add_gizmo]).  
         */
        setNotifyTransform(enable: boolean): void
        
        /** Returns `true` if the node receives [constant NOTIFICATION_TRANSFORM_CHANGED] whenever [member global_transform] changes. This is enabled with [method set_notify_transform]. */
        isTransformNotificationEnabled(): boolean
        
        /** Rotates this node's [member basis] around the [param axis] by the given [param angle], in radians. This operation is calculated in parent space (relative to the parent) and preserves the [member position]. */
        rotate(axis: Vector3, angle: float64): void
        
        /** Rotates this node's [member global_basis] around the global [param axis] by the given [param angle], in radians. This operation is calculated in global space (relative to the world) and preserves the [member global_position]. */
        globalRotate(axis: Vector3, angle: float64): void
        
        /** Scales this node's [member global_basis] by the given [param scale] factor. This operation is calculated in global space (relative to the world) and preserves the [member global_position].  
         *      
         *  **Note:** This method is not to be confused with the [member scale] property.  
         */
        globalScale(scale: Vector3): void
        
        /** Adds the given translation [param offset] to the node's [member global_position] in global space (relative to the world). */
        globalTranslate(offset: Vector3): void
        
        /** Rotates this node's [member basis] around the [param axis] by the given [param angle], in radians. This operation is calculated in local space (relative to this node) and preserves the [member position]. */
        rotateObjectLocal(axis: Vector3, angle: float64): void
        
        /** Scales this node's [member basis] by the given [param scale] factor. This operation is calculated in local space (relative to this node) and preserves the [member position]. */
        scaleObjectLocal(scale: Vector3): void
        
        /** Adds the given translation [param offset] to the node's position, in local space (relative to this node). */
        translateObjectLocal(offset: Vector3): void
        
        /** Rotates this node's [member basis] around the X axis by the given [param angle], in radians. This operation is calculated in parent space (relative to the parent) and preserves the [member position]. */
        rotateX(angle: float64): void
        
        /** Rotates this node's [member basis] around the Y axis by the given [param angle], in radians. This operation is calculated in parent space (relative to the parent) and preserves the [member position]. */
        rotateY(angle: float64): void
        
        /** Rotates this node's [member basis] around the Z axis by the given [param angle], in radians. This operation is calculated in parent space (relative to the parent) and preserves the [member position]. */
        rotateZ(angle: float64): void
        
        /** Adds the given translation [param offset] to the node's position, in local space (relative to this node).  
         *      
         *  **Note:** Prefer using [method translate_object_local], instead, as this method may be changed in a future release.  
         *      
         *  **Note:** Despite the naming convention, this operation is **not** calculated in parent space for compatibility reasons. To translate in parent space, add [param offset] to the [member position] (`node_3d.position += offset`).  
         */
        translate(offset: Vector3): void
        
        /** Orthonormalizes this node's [member basis]. This method sets this node's [member scale] to [constant Vector3.ONE] (or its negative counterpart), but preserves the [member position] and [member rotation]. See also [method Transform3D.orthonormalized]. */
        orthonormalize(): void
        
        /** Sets this node's [member transform] to [constant Transform3D.IDENTITY], which resets all transformations in parent space ([member position], [member rotation], and [member scale]). */
        setIdentity(): void
        
        /** Rotates the node so that the local forward axis (-Z, [constant Vector3.FORWARD]) points toward the [param target] position. This operation is calculated in global space (relative to the world).  
         *  The local up axis (+Y) points as close to the [param up] vector as possible while staying perpendicular to the local forward axis. The resulting transform is orthogonal, and the scale is preserved. Non-uniform scaling may not work correctly.  
         *  The [param target] position cannot be the same as the node's position, the [param up] vector cannot be [constant Vector3.ZERO]. Furthermore, the direction from the node's position to the [param target] position cannot be parallel to the [param up] vector, to avoid an unintended rotation around the local Z axis.  
         *  If [param use_model_front] is `true`, the +Z axis (asset front) is treated as forward (implies +X is left) and points toward the [param target] position. By default, the -Z axis (camera forward) is treated as forward (implies +X is right).  
         *      
         *  **Note:** This method fails if the node is not in the scene tree. If necessary, use [method look_at_from_position] instead.  
         */
        lookAt(target: Vector3, up?: Vector3 /* = Vector3.ZERO */, useModelFront?: boolean /* = false */): void
        
        /** Moves the node to the specified [param position], then rotates the node to point toward the [param target] position, similar to [method look_at]. This operation is calculated in global space (relative to the world). */
        lookAtFromPosition(position: Vector3, target: Vector3, up?: Vector3 /* = Vector3.ZERO */, useModelFront?: boolean /* = false */): void
        
        /** Returns the [param global_point] converted from global space to this node's local space. This is the opposite of [method to_global]. */
        toLocal(globalPoint: Vector3): Vector3
        
        /** Returns the [param local_point] converted from this node's local space to global space. This is the opposite of [method to_local]. */
        toGlobal(localPoint: Vector3): Vector3
        
        /** The local transformation of this node, in parent space (relative to the parent node). Contains and represents this node's [member position], [member rotation], and [member scale]. */
        get transform(): Transform3D
        set transform(value: Transform3D)
        
        /** The transformation of this node, in global space (relative to the world). Contains and represents this node's [member global_position], [member global_rotation], and global scale.  
         *      
         *  **Note:** If the node is not inside the tree, getting this property fails and returns [constant Transform3D.IDENTITY].  
         */
        get globalTransform(): Transform3D
        set globalTransform(value: Transform3D)
        
        /** Position (translation) of this node in parent space (relative to the parent node). This is equivalent to the [member transform]'s [member Transform3D.origin]. */
        get position(): Vector3
        set position(value: Vector3)
        
        /** Rotation of this node as [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians and in parent space (relative to the parent node). This value is obtained from [member basis]'s rotation.  
         *  - The [member Vector3.x] is the angle around the local X axis (pitch);  
         *  - The [member Vector3.y] is the angle around the local Y axis (yaw);  
         *  - The [member Vector3.z] is the angle around the local Z axis (roll).  
         *  The order of each consecutive rotation can be changed with [member rotation_order] (see [enum EulerOrder] constants). In Godot, Euler angles always use intrinsic order. By default, the intrinsic YXZ convention is used ([constant EULER_ORDER_YXZ]).  
         *      
         *  **Note:** This property is edited in degrees in the inspector. If you want to use degrees in a script, use [member rotation_degrees].  
         */
        get rotation(): Vector3
        set rotation(value: Vector3)
        
        /** The [member rotation] of this node, in degrees instead of radians.  
         *      
         *  **Note:** This is **not** the property available in the Inspector dock.  
         */
        get rotationDegrees(): Vector3
        set rotationDegrees(value: Vector3)
        
        /** Rotation of this node represented as a [Quaternion] in parent space (relative to the parent node). This value is obtained from [member basis]'s rotation.  
         *      
         *  **Note:** Quaternions are much more suitable for 3D math but are less intuitive. Setting this property can be useful for interpolation (see [method Quaternion.slerp]).  
         */
        get quaternion(): Quaternion
        set quaternion(value: Quaternion)
        
        /** Basis of the [member transform] property. Represents the rotation, scale, and shear of this node in parent space (relative to the parent node). */
        get basis(): Basis
        set basis(value: Basis)
        
        /** Scale of this node in local space (relative to this node). This value is obtained from [member basis]'s scale.  
         *      
         *  **Note:** The behavior of some 3D node types is not affected by this property. These include [Light3D], [Camera3D], [AudioStreamPlayer3D], and more.  
         *  **Warning:** The scale's components must either be all positive or all negative, and **not** exactly `0.0`. Otherwise, it won't be possible to obtain the scale from the [member basis]. This may cause the intended scale to be lost when reloaded from disk, and potentially other unstable behavior.  
         */
        get scale(): Vector3
        set scale(value: Vector3)
        
        /** How this node's rotation and scale are displayed in the Inspector dock. */
        get rotationEditMode(): int64
        set rotationEditMode(value: int64)
        
        /** The axis rotation order of the [member rotation] property. In Godot, Euler angles always use intrinsic order, meaning that the final orientation is calculated by rotating around the local axes in this order. */
        get rotationOrder(): int64
        set rotationOrder(value: int64)
        
        /** If `true`, the node does not inherit its transformations from its parent. As such, node transformations will only be in global space, which also means that [member global_transform] and [member transform] will be identical. */
        get topLevel(): boolean
        set topLevel(value: boolean)
        
        /** Global position (translation) of this node in global space (relative to the world). This is equivalent to the [member global_transform]'s [member Transform3D.origin].  
         *      
         *  **Note:** If the node is not inside the tree, getting this property fails and returns [constant Vector3.ZERO].  
         */
        get globalPosition(): Vector3
        set globalPosition(value: Vector3)
        
        /** Basis of the [member global_transform] property. Represents the rotation, scale, and shear of this node in global space (relative to the world).  
         *      
         *  **Note:** If the node is not inside the tree, getting this property fails and returns [constant Basis.IDENTITY].  
         */
        get globalBasis(): Basis
        set globalBasis(value: Basis)
        
        /** Global rotation of this node as [url=https://en.wikipedia.org/wiki/Euler_angles]Euler angles[/url], in radians and in global space (relative to the world). This value is obtained from [member global_basis]'s rotation.  
         *  - The [member Vector3.x] is the angle around the global X axis (pitch);  
         *  - The [member Vector3.y] is the angle around the global Y axis (yaw);  
         *  - The [member Vector3.z] is the angle around the global Z axis (roll).  
         *      
         *  **Note:** Unlike [member rotation], this property always follows the YXZ convention ([constant EULER_ORDER_YXZ]).  
         *      
         *  **Note:** If the node is not inside the tree, getting this property fails and returns [constant Vector3.ZERO].  
         */
        get globalRotation(): Vector3
        set globalRotation(value: Vector3)
        
        /** The [member global_rotation] of this node, in degrees instead of radians.  
         *      
         *  **Note:** If the node is not inside the tree, getting this property fails and returns [constant Vector3.ZERO].  
         */
        get globalRotationDegrees(): Vector3
        set globalRotationDegrees(value: Vector3)
        
        /** If `true`, this node can be visible. The node is only rendered when all of its ancestors are visible, as well. That means [method is_visible_in_tree] must return `true`. */
        get visible(): boolean
        set visible(value: boolean)
        
        /** Path to the visibility range parent for this node and its descendants. The visibility parent must be a [GeometryInstance3D].  
         *  Any visual instance will only be visible if the visibility parent (and all of its visibility ancestors) is hidden by being closer to the camera than its own [member GeometryInstance3D.visibility_range_begin]. Nodes hidden via the [member Node3D.visible] property are essentially removed from the visibility dependency tree, so dependent instances will not take the hidden node or its descendants into account.  
         */
        get visibilityParent(): NodePath
        set visibilityParent(value: NodePath | string)
        
        /** Emitted when this node's visibility changes (see [member visible] and [method is_visible_in_tree]).  
         *  This signal is emitted  *after*  the related [constant NOTIFICATION_VISIBILITY_CHANGED] notification.  
         */
        readonly visibilityChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNode3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNode3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNode3DGizmo extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNode3DGizmo extends __NameMapRefCounted {
    }
    /** Abstract class to expose editor gizmos for [Node3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_node3dgizmo.html  
     */
    class Node3DGizmo extends RefCounted {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNode3DGizmo;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNode3DGizmo;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNoise extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNoise extends __NameMapResource {
        get_noise_1d: "getNoise1D";
        get_noise_2d: "getNoise2D";
        get_noise_2dv: "getNoise2Dv";
        get_noise_3d: "getNoise3D";
        get_noise_3dv: "getNoise3Dv";
        get_image: "getImage";
        get_seamless_image: "getSeamlessImage";
        get_image_3d: "getImage3D";
        get_seamless_image_3d: "getSeamlessImage3D";
    }
    /** Abstract base class for noise generators.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_noise.html  
     */
    class Noise extends Resource {
        constructor(identifier?: any)
        /** Returns the 1D noise value at the given (x) coordinate. */
        getNoise1D(x: float64): float64
        
        /** Returns the 2D noise value at the given position. */
        getNoise2D(x: float64, y: float64): float64
        
        /** Returns the 2D noise value at the given position. */
        getNoise2Dv(v: Vector2): float64
        
        /** Returns the 3D noise value at the given position. */
        getNoise3D(x: float64, y: float64, z: float64): float64
        
        /** Returns the 3D noise value at the given position. */
        getNoise3Dv(v: Vector3): float64
        
        /** Returns an [Image] containing 2D noise values.  
         *      
         *  **Note:** With [param normalize] set to `false`, the default implementation expects the noise generator to return values in the range `-1.0` to `1.0`.  
         */
        getImage(width: int64, height: int64, invert?: boolean /* = false */, in3DSpace?: boolean /* = false */, normalize?: boolean /* = true */): null | Image
        
        /** Returns an [Image] containing seamless 2D noise values.  
         *      
         *  **Note:** With [param normalize] set to `false`, the default implementation expects the noise generator to return values in the range `-1.0` to `1.0`.  
         */
        getSeamlessImage(width: int64, height: int64, invert?: boolean /* = false */, in3DSpace?: boolean /* = false */, skirt?: float64 /* = 0.1 */, normalize?: boolean /* = true */): null | Image
        
        /** Returns an [Array] of [Image]s containing 3D noise values for use with [method ImageTexture3D.create].  
         *      
         *  **Note:** With [param normalize] set to `false`, the default implementation expects the noise generator to return values in the range `-1.0` to `1.0`.  
         */
        getImage3D(width: int64, height: int64, depth: int64, invert?: boolean /* = false */, normalize?: boolean /* = true */): GArray<Image>
        
        /** Returns an [Array] of [Image]s containing seamless 3D noise values for use with [method ImageTexture3D.create].  
         *      
         *  **Note:** With [param normalize] set to `false`, the default implementation expects the noise generator to return values in the range `-1.0` to `1.0`.  
         */
        getSeamlessImage3D(width: int64, height: int64, depth: int64, invert?: boolean /* = false */, skirt?: float64 /* = 0.1 */, normalize?: boolean /* = true */): GArray<Image>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNoise;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNoise;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNoiseTexture2D extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNoiseTexture2D extends __NameMapTexture2D {
        generate_mipmaps: "generateMipmaps";
        color_ramp: "colorRamp";
        in_3d_space: "in3DSpace";
        as_normal_map: "asNormalMap";
        seamless_blend_skirt: "seamlessBlendSkirt";
        bump_strength: "bumpStrength";
    }
    /** A 2D texture filled with noise generated by a [Noise] object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_noisetexture2d.html  
     */
    class NoiseTexture2D extends Texture2D {
        constructor(identifier?: any)
        /** Width of the generated texture (in pixels). */
        get width(): int64
        set width(value: int64)
        
        /** Height of the generated texture (in pixels). */
        get height(): int64
        set height(value: int64)
        
        /** Determines whether mipmaps are generated for this texture. Enabling this results in less texture aliasing in the distance, at the cost of increasing memory usage by roughly 33% and making the noise texture generation take longer.  
         *      
         *  **Note:** [member generate_mipmaps] requires mipmap filtering to be enabled on the material using the [NoiseTexture2D] to have an effect.  
         */
        get generateMipmaps(): boolean
        set generateMipmaps(value: boolean)
        
        /** The instance of the [Noise] object. */
        get noise(): null | FastNoiseLite | Noise
        set noise(value: null | FastNoiseLite | Noise)
        
        /** A [Gradient] which is used to map the luminance of each pixel to a color value. */
        get colorRamp(): null | Gradient
        set colorRamp(value: null | Gradient)
        
        /** If `true`, a seamless texture is requested from the [Noise] resource.  
         *      
         *  **Note:** Seamless noise textures may take longer to generate and/or can have a lower contrast compared to non-seamless noise depending on the used [Noise] resource. This is because some implementations use higher dimensions for generating seamless noise.  
         *      
         *  **Note:** The default [FastNoiseLite] implementation uses the fallback path for seamless generation. If using a [member width] or [member height] lower than the default, you may need to increase [member seamless_blend_skirt] to make seamless blending more effective.  
         */
        get seamless(): boolean
        set seamless(value: boolean)
        
        /** If `true`, inverts the noise texture. White becomes black, black becomes white. */
        get invert(): boolean
        set invert(value: boolean)
        
        /** Determines whether the noise image is calculated in 3D space. May result in reduced contrast. */
        get in3DSpace(): boolean
        set in3DSpace(value: boolean)
        
        /** If `true`, the resulting texture contains a normal map created from the original noise interpreted as a bump map. */
        get asNormalMap(): boolean
        set asNormalMap(value: boolean)
        
        /** If `true`, the noise image coming from the noise generator is normalized to the range `0.0` to `1.0`.  
         *  Turning normalization off can affect the contrast and allows you to generate non repeating tileable noise textures.  
         */
        get normalize(): boolean
        set normalize(value: boolean)
        
        /** Used for the default/fallback implementation of the seamless texture generation. It determines the distance over which the seams are blended. High values may result in less details and contrast. See [Noise] for further details.  
         *      
         *  **Note:** If using a [member width] or [member height] lower than the default, you may need to increase [member seamless_blend_skirt] to make seamless blending more effective.  
         */
        get seamlessBlendSkirt(): float64
        set seamlessBlendSkirt(value: float64)
        
        /** Strength of the bump maps used in this texture. A higher value will make the bump maps appear larger while a lower value will make them appear softer. */
        get bumpStrength(): float64
        set bumpStrength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNoiseTexture2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNoiseTexture2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapNoiseTexture3D extends __RPCMapTexture3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapNoiseTexture3D extends __NameMapTexture3D {
        color_ramp: "colorRamp";
        seamless_blend_skirt: "seamlessBlendSkirt";
    }
    /** A 3D texture filled with noise generated by a [Noise] object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_noisetexture3d.html  
     */
    class NoiseTexture3D extends Texture3D {
        constructor(identifier?: any)
        /** Width of the generated texture (in pixels). */
        get width(): int64
        set width(value: int64)
        
        /** Height of the generated texture (in pixels). */
        get height(): int64
        set height(value: int64)
        
        /** Depth of the generated texture (in pixels). */
        get depth(): int64
        set depth(value: int64)
        
        /** The instance of the [Noise] object. */
        get noise(): null | FastNoiseLite | Noise
        set noise(value: null | FastNoiseLite | Noise)
        
        /** A [Gradient] which is used to map the luminance of each pixel to a color value. */
        get colorRamp(): null | Gradient
        set colorRamp(value: null | Gradient)
        
        /** If `true`, a seamless texture is requested from the [Noise] resource.  
         *      
         *  **Note:** Seamless noise textures may take longer to generate and/or can have a lower contrast compared to non-seamless noise depending on the used [Noise] resource. This is because some implementations use higher dimensions for generating seamless noise.  
         *      
         *  **Note:** The default [FastNoiseLite] implementation uses the fallback path for seamless generation. If using a [member width], [member height] or [member depth] lower than the default, you may need to increase [member seamless_blend_skirt] to make seamless blending more effective.  
         */
        get seamless(): boolean
        set seamless(value: boolean)
        
        /** If `true`, inverts the noise texture. White becomes black, black becomes white. */
        get invert(): boolean
        set invert(value: boolean)
        
        /** If `true`, the noise image coming from the noise generator is normalized to the range `0.0` to `1.0`.  
         *  Turning normalization off can affect the contrast and allows you to generate non repeating tileable noise textures.  
         */
        get normalize(): boolean
        set normalize(value: boolean)
        
        /** Used for the default/fallback implementation of the seamless texture generation. It determines the distance over which the seams are blended. High values may result in less details and contrast. See [Noise] for further details.  
         *      
         *  **Note:** If using a [member width], [member height] or [member depth] lower than the default, you may need to increase [member seamless_blend_skirt] to make seamless blending more effective.  
         */
        get seamlessBlendSkirt(): float64
        set seamlessBlendSkirt(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapNoiseTexture3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapNoiseTexture3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOrmMaterial3D extends __RPCMapBaseMaterial3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOrmMaterial3D extends __NameMapBaseMaterial3D {
    }
    class OrmMaterial3D extends BaseMaterial3D {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOrmMaterial3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOrmMaterial3D;
    }
    namespace GObject {
        enum ConnectFlags {
            ConnectDeferred = 1,
            ConnectPersist = 2,
            ConnectOneShot = 4,
            ConnectReferenceCounted = 8,
            ConnectAppendSourceObject = 16,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapGObject {
        _to_string: "_toString";
        _get_property_list: "_getPropertyList";
        _validate_property: "_validateProperty";
        _property_can_revert: "_propertyCanRevert";
        _property_get_revert: "_propertyGetRevert";
        _iter_init: "_iterInit";
        _iter_next: "_iterNext";
        _iter_get: "_iterGet";
        get_class: "getClass";
        is_class: "isClass";
        set_indexed: "setIndexed";
        get_indexed: "getIndexed";
        get_property_list: "getPropertyList";
        get_method_list: "getMethodList";
        property_can_revert: "propertyCanRevert";
        property_get_revert: "propertyGetRevert";
        to_string: "toString";
        get_instance_id: "getInstanceId";
        set_script: "setScript";
        get_script: "getScript";
        set_meta: "setMeta";
        remove_meta: "removeMeta";
        get_meta: "getMeta";
        has_meta: "hasMeta";
        get_meta_list: "getMetaList";
        add_user_signal: "addUserSignal";
        has_user_signal: "hasUserSignal";
        remove_user_signal: "removeUserSignal";
        emit_signal: "emitSignal";
        call_deferred: "callDeferred";
        set_deferred: "setDeferred";
        has_method: "hasMethod";
        get_method_argument_count: "getMethodArgumentCount";
        has_signal: "hasSignal";
        get_signal_list: "getSignalList";
        get_signal_connection_list: "getSignalConnectionList";
        get_incoming_connections: "getIncomingConnections";
        is_connected: "isConnected";
        has_connections: "hasConnections";
        set_block_signals: "setBlockSignals";
        is_blocking_signals: "isBlockingSignals";
        notify_property_list_changed: "notifyPropertyListChanged";
        set_message_translation: "setMessageTranslation";
        can_translate_messages: "canTranslateMessages";
        tr_n: "trN";
        get_translation_domain: "getTranslationDomain";
        set_translation_domain: "setTranslationDomain";
        is_queued_for_deletion: "isQueuedForDeletion";
        cancel_free: "cancelFree";
        script_changed: "scriptChanged";
        property_list_changed: "propertyListChanged";
    }
    class GObject {
        static readonly NOTIFICATION_POSTINITIALIZE = 0
        static readonly NOTIFICATION_PREDELETE = 1
        static readonly NOTIFICATION_EXTENSION_RELOADED = 2
        constructor(identifier?: any)
        /* gdvirtual */ free(): void
        /* gdvirtual */ _init(): void
        /* gdvirtual */ _toString(): string
        /* gdvirtual */ _notification(what: int64): void
        /* gdvirtual */ _set(property: StringName, value: any): boolean
        /* gdvirtual */ _get(property: StringName): any
        /* gdvirtual */ _getPropertyList(): GArray<GDictionary>
        /* gdvirtual */ _validateProperty(property: GDictionary): void
        /* gdvirtual */ _propertyCanRevert(property: StringName): boolean
        /* gdvirtual */ _propertyGetRevert(property: StringName): any
        /* gdvirtual */ _iterInit(iter: GArray): boolean
        /* gdvirtual */ _iterNext(iter: GArray): boolean
        /* gdvirtual */ _iterGet(iter: any): any
        getClass(): string
        isClass(class_: StringName): boolean
        set(property: StringName, value: any): void
        get(property: StringName): any
        setIndexed(propertyPath: NodePath | string, value: any): void
        getIndexed(propertyPath: NodePath | string): any
        getPropertyList(): GArray<GDictionary<PropertyInfo>>
        getMethodList(): GArray<GDictionary>
        propertyCanRevert(property: StringName): boolean
        propertyGetRevert(property: StringName): any
        notification(what: int64, reversed?: boolean /* = false */): void
        ["toString"]: () => string
        getInstanceId(): int64
        setScript(script: null | Script): void
        getScript(): null | Script
        setMeta(name: StringName, value: any): void
        removeMeta(name: StringName): void
        getMeta(name: StringName, default_?: any /* = {} */): any
        hasMeta(name: StringName): boolean
        getMetaList(): GArray<StringName>
        addUserSignal(signal: string, arguments_?: GArray): void
        hasUserSignal(signal: StringName): boolean
        removeUserSignal(signal: StringName): void
        emitSignal(signal: StringName, ...varargs: any[]): GError
        call<M extends GodotNames<this>>(method: M, ...args: ResolveGodotNameParameters<this, NoInfer<M>>): ResolveGodotReturnType<this, NoInfer<M>>
        callDeferred<M extends GodotNames<this>>(method: M, ...args: ResolveGodotNameParameters<this, NoInfer<M>>): void
        setDeferred<P extends GodotNames<this>>(property: P, value: ResolveGodotNameValue<this,  NoInfer<P>>): void
        callv<M extends GodotNames<this>>(method: M, argArray: GArray<ResolveGodotNameParameters<this, NoInfer<M>>>): ResolveGodotReturnType<this, NoInfer<M>>
        hasMethod(method: StringName): boolean
        getMethodArgumentCount(method: StringName): int64
        hasSignal(signal: StringName): boolean
        getSignalList(): GArray<GDictionary>
        getSignalConnectionList(signal: StringName): GArray<GDictionary>
        getIncomingConnections(): GArray<GDictionary>
        connect(signal: StringName, callable: Callable, flags?: int64 /* = 0 */): GError
        disconnect(signal: StringName, callable: Callable): void
        isConnected(signal: StringName, callable: Callable): boolean
        hasConnections(signal: StringName): boolean
        setBlockSignals(enable: boolean): void
        isBlockingSignals(): boolean
        notifyPropertyListChanged(): void
        setMessageTranslation(enable: boolean): void
        canTranslateMessages(): boolean
        tr(message: StringName, context?: StringName /* = '' */): string
        trN(message: StringName, pluralMessage: StringName, n: int64, context?: StringName /* = '' */): string
        getTranslationDomain(): StringName
        setTranslationDomain(domain: StringName): void
        isQueuedForDeletion(): boolean
        cancelFree(): void
        readonly scriptChanged: Signal<() => void>
        readonly propertyListChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapGObject;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapGObject;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOccluder3D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOccluder3D extends __NameMapResource {
        get_vertices: "getVertices";
        get_indices: "getIndices";
    }
    /** Occluder shape resource for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_occluder3d.html  
     */
    class Occluder3D extends Resource {
        constructor(identifier?: any)
        /** Returns the occluder shape's vertex positions. */
        getVertices(): PackedVector3Array
        
        /** Returns the occluder shape's vertex indices. */
        getIndices(): PackedInt32Array
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOccluder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOccluderInstance3D extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOccluderInstance3D extends __NameMapVisualInstance3D {
        set_bake_mask_value: "setBakeMaskValue";
        get_bake_mask_value: "getBakeMaskValue";
        _is_editable_3d_polygon: "_isEditable3DPolygon";
        _get_editable_3d_polygon_resource: "_getEditable3DPolygonResource";
        bake_mask: "bakeMask";
        bake_simplification_distance: "bakeSimplificationDistance";
    }
    /** Provides occlusion culling for 3D nodes, which improves performance in closed areas.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_occluderinstance3d.html  
     */
    class OccluderInstance3D<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** Based on [param value], enables or disables the specified layer in the [member bake_mask], given a [param layer_number] between 1 and 32. */
        setBakeMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member bake_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getBakeMaskValue(layerNumber: int64): boolean
        _isEditable3DPolygon(): boolean
        _getEditable3DPolygonResource(): null | Resource
        
        /** The occluder resource for this [OccluderInstance3D]. You can generate an occluder resource by selecting an [OccluderInstance3D] node then using the **Bake Occluders** button at the top of the editor.  
         *  You can also draw your own 2D occluder polygon by adding a new [PolygonOccluder3D] resource to the [member occluder] property in the Inspector.  
         *  Alternatively, you can select a primitive occluder to use: [QuadOccluder3D], [BoxOccluder3D] or [SphereOccluder3D].  
         */
        get occluder(): null | Occluder3D
        set occluder(value: null | Occluder3D)
        
        /** The visual layers to account for when baking for occluders. Only [MeshInstance3D]s whose [member VisualInstance3D.layers] match with this [member bake_mask] will be included in the generated occluder mesh. By default, all objects with  *opaque*  materials are taken into account for the occluder baking.  
         *  To improve performance and avoid artifacts, it is recommended to exclude dynamic objects, small objects and fixtures from the baking process by moving them to a separate visual layer and excluding this layer in [member bake_mask].  
         */
        get bakeMask(): int64
        set bakeMask(value: int64)
        
        /** The simplification distance to use for simplifying the generated occluder polygon (in 3D units). Higher values result in a less detailed occluder mesh, which improves performance but reduces culling accuracy.  
         *  The occluder geometry is rendered on the CPU, so it is important to keep its geometry as simple as possible. Since the buffer is rendered at a low resolution, less detailed occluder meshes generally still work well. The default value is fairly aggressive, so you may have to decrease it if you run into false negatives (objects being occluded even though they are visible by the camera). A value of `0.01` will act conservatively, and will keep geometry  *perceptually*  unaffected in the occlusion culling buffer. Depending on the scene, a value of `0.01` may still simplify the mesh noticeably compared to disabling simplification entirely.  
         *  Setting this to `0.0` disables simplification entirely, but vertices in the exact same position will still be merged. The mesh will also be re-indexed to reduce both the number of vertices and indices.  
         *      
         *  **Note:** This uses the [url=https://meshoptimizer.org/]meshoptimizer[/url] library under the hood, similar to LOD generation.  
         */
        get bakeSimplificationDistance(): float64
        set bakeSimplificationDistance(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOccluderInstance3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOccluderInstance3D;
    }
    namespace OccluderPolygon2D {
        enum CullMode {
            CullDisabled = 0,
            CullClockwise = 1,
            CullCounterClockwise = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOccluderPolygon2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOccluderPolygon2D extends __NameMapResource {
        cull_mode: "cullMode";
    }
    /** Defines a 2D polygon for LightOccluder2D.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_occluderpolygon2d.html  
     */
    class OccluderPolygon2D extends Resource {
        constructor(identifier?: any)
        /** If `true`, closes the polygon. A closed OccluderPolygon2D occludes the light coming from any direction. An opened OccluderPolygon2D occludes the light only at its outline's direction. */
        get closed(): boolean
        set closed(value: boolean)
        
        /** The culling mode to use. */
        get cullMode(): int64
        set cullMode(value: int64)
        
        /** A [Vector2] array with the index for polygon's vertices positions. */
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOccluderPolygon2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOccluderPolygon2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOfflineMultiplayerPeer extends __RPCMapMultiplayerPeer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOfflineMultiplayerPeer extends __NameMapMultiplayerPeer {
    }
    /** A [MultiplayerPeer] which is always connected and acts as a server.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_offlinemultiplayerpeer.html  
     */
    class OfflineMultiplayerPeer extends MultiplayerPeer {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOfflineMultiplayerPeer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOfflineMultiplayerPeer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOggPacketSequence extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOggPacketSequence extends __NameMapResource {
        get_length: "getLength";
        packet_data: "packetData";
        granule_positions: "granulePositions";
        sampling_rate: "samplingRate";
    }
    /** A sequence of Ogg packets.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_oggpacketsequence.html  
     */
    class OggPacketSequence extends Resource {
        constructor(identifier?: any)
        /** The length of this stream, in seconds. */
        getLength(): float64
        
        /** Contains the raw packets that make up this OggPacketSequence. */
        get packetData(): GArray<PackedByteArray>
        set packetData(value: GArray<PackedByteArray>)
        
        /** Contains the granule positions for each page in this packet sequence. */
        get granulePositions(): PackedInt64Array
        set granulePositions(value: PackedInt64Array | int64[])
        
        /** Holds sample rate information about this sequence. Must be set by another class that actually understands the codec. */
        get samplingRate(): float64
        set samplingRate(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOggPacketSequence;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOggPacketSequence;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOggPacketSequencePlayback extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOggPacketSequencePlayback extends __NameMapRefCounted {
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_oggpacketsequenceplayback.html */
    class OggPacketSequencePlayback extends RefCounted {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOggPacketSequencePlayback;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOggPacketSequencePlayback;
    }
    namespace OmniLight3D {
        enum ShadowMode {
            ShadowDualParaboloid = 0,
            ShadowCube = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOmniLight3D extends __RPCMapLight3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOmniLight3D extends __NameMapLight3D {
        omni_range: "omniRange";
        omni_attenuation: "omniAttenuation";
        omni_shadow_mode: "omniShadowMode";
    }
    /** Omnidirectional light, such as a light bulb or a candle.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_omnilight3d.html  
     */
    class OmniLight3D<Map extends NodePathMap = any> extends Light3D<Map> {
        constructor(identifier?: any)
        /** The light's radius. Note that the effectively lit area may appear to be smaller depending on the [member omni_attenuation] in use. No matter the [member omni_attenuation] in use, the light will never reach anything outside this radius.  
         *      
         *  **Note:** [member omni_range] is not affected by [member Node3D.scale] (the light's scale or its parent's scale).  
         */
        get omniRange(): float64
        set omniRange(value: float64)
        
        /** Controls the distance attenuation function for omnilights.  
         *  A value of `0.0` will maintain a constant brightness through most of the range, but smoothly attenuate the light at the edge of the range. Use a value of `2.0` for physically accurate lights as it results in the proper inverse square attenutation.  
         *      
         *  **Note:** Setting attenuation to `2.0` or higher may result in distant objects receiving minimal light, even within range. For example, with a range of `4096`, an object at `100` units is attenuated by a factor of `0.0001`. With a default brightness of `1`, the light would not be visible at that distance.  
         *      
         *  **Note:** Using negative or values higher than `10.0` may lead to unexpected results.  
         */
        get omniAttenuation(): float64
        set omniAttenuation(value: float64)
        get omniShadowMode(): int64
        set omniShadowMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOmniLight3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOmniLight3D;
    }
    namespace OpenXRApiExtension {
        enum OpenXRAlphaBlendModeSupport {
            OpenxrAlphaBlendModeSupportNone = 0,
            OpenxrAlphaBlendModeSupportReal = 1,
            OpenxrAlphaBlendModeSupportEmulating = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRApiExtension extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRApiExtension extends __NameMapRefCounted {
        get_openxr_version: "getOpenxrVersion";
        get_instance: "getInstance";
        get_system_id: "getSystemId";
        get_session: "getSession";
        transform_from_pose: "transformFromPose";
        xr_result: "xRResult";
        openxr_is_enabled: "openxrIsEnabled";
        get_instance_proc_addr: "getInstanceProcAddr";
        get_error_string: "getErrorString";
        get_swapchain_format_name: "getSwapchainFormatName";
        set_object_name: "setObjectName";
        begin_debug_label_region: "beginDebugLabelRegion";
        end_debug_label_region: "endDebugLabelRegion";
        insert_debug_label: "insertDebugLabel";
        get_view_count: "getViewCount";
        get_primary_view_count: "getPrimaryViewCount";
        get_view_configuration: "getViewConfiguration";
        is_initialized: "isInitialized";
        is_running: "isRunning";
        set_custom_play_space: "setCustomPlaySpace";
        get_play_space: "getPlaySpace";
        get_predicted_display_time: "getPredictedDisplayTime";
        get_next_frame_time: "getNextFrameTime";
        can_render: "canRender";
        find_action: "findAction";
        action_get_handle: "actionGetHandle";
        get_hand_tracker: "getHandTracker";
        register_composition_layer_provider: "registerCompositionLayerProvider";
        unregister_composition_layer_provider: "unregisterCompositionLayerProvider";
        register_projection_views_extension: "registerProjectionViewsExtension";
        unregister_projection_views_extension: "unregisterProjectionViewsExtension";
        register_frame_info_extension: "registerFrameInfoExtension";
        unregister_frame_info_extension: "unregisterFrameInfoExtension";
        register_projection_layer_extension: "registerProjectionLayerExtension";
        unregister_projection_layer_extension: "unregisterProjectionLayerExtension";
        get_render_state_z_near: "getRenderStateZNear";
        get_render_state_z_far: "getRenderStateZFar";
        set_velocity_texture: "setVelocityTexture";
        set_velocity_depth_texture: "setVelocityDepthTexture";
        set_velocity_target_size: "setVelocityTargetSize";
        get_supported_swapchain_formats: "getSupportedSwapchainFormats";
        openxr_swapchain_create: "openxrSwapchainCreate";
        openxr_swapchain_free: "openxrSwapchainFree";
        openxr_swapchain_get_swapchain: "openxrSwapchainGetSwapchain";
        openxr_swapchain_acquire: "openxrSwapchainAcquire";
        openxr_swapchain_get_image: "openxrSwapchainGetImage";
        openxr_swapchain_release: "openxrSwapchainRelease";
        get_projection_layer: "getProjectionLayer";
        set_render_region: "setRenderRegion";
        set_emulate_environment_blend_mode_alpha_blend: "setEmulateEnvironmentBlendModeAlphaBlend";
        is_environment_blend_mode_alpha_supported: "isEnvironmentBlendModeAlphaSupported";
        update_main_swapchain_size: "updateMainSwapchainSize";
    }
    class OpenXRApiExtension extends RefCounted {
        constructor(identifier?: any)
        getOpenxrVersion(): int64
        getInstance(): int64
        getSystemId(): int64
        getSession(): int64
        transformFromPose(pose: int64): Transform3D
        xRResult(result: int64, format: string, args: GArray): boolean
        static openxrIsEnabled(checkRunInEditor: boolean): boolean
        getInstanceProcAddr(name: string): int64
        getErrorString(result: int64): string
        getSwapchainFormatName(swapchainFormat: int64): string
        setObjectName(objectType: int64, objectHandle: int64, objectName: string): void
        beginDebugLabelRegion(labelName: string): void
        endDebugLabelRegion(): void
        insertDebugLabel(labelName: string): void
        getViewCount(): int64
        getPrimaryViewCount(): int64
        getViewConfiguration(): int64
        isInitialized(): boolean
        isRunning(): boolean
        setCustomPlaySpace(space: int64): void
        getPlaySpace(): int64
        getPredictedDisplayTime(): int64
        getNextFrameTime(): int64
        canRender(): boolean
        findAction(name: string, actionSet: Rid): Rid
        actionGetHandle(action: Rid): int64
        getHandTracker(handIndex: int64): int64
        registerCompositionLayerProvider(extension: OpenXRExtensionWrapper): void
        unregisterCompositionLayerProvider(extension: OpenXRExtensionWrapper): void
        registerProjectionViewsExtension(extension: OpenXRExtensionWrapper): void
        unregisterProjectionViewsExtension(extension: OpenXRExtensionWrapper): void
        registerFrameInfoExtension(extension: OpenXRExtensionWrapper): void
        unregisterFrameInfoExtension(extension: OpenXRExtensionWrapper): void
        registerProjectionLayerExtension(extension: OpenXRExtensionWrapper): void
        unregisterProjectionLayerExtension(extension: OpenXRExtensionWrapper): void
        getRenderStateZNear(): float64
        getRenderStateZFar(): float64
        setVelocityTexture(renderTarget: Rid): void
        setVelocityDepthTexture(renderTarget: Rid): void
        setVelocityTargetSize(targetSize: Vector2I): void
        getSupportedSwapchainFormats(): PackedInt64Array
        openxrSwapchainCreate(createFlags: int64, usageFlags: int64, swapchainFormat: int64, width: int64, height: int64, sampleCount: int64, arraySize: int64): int64
        openxrSwapchainFree(swapchain: int64): void
        openxrSwapchainGetSwapchain(swapchain: int64): int64
        openxrSwapchainAcquire(swapchain: int64): void
        openxrSwapchainGetImage(swapchain: int64): Rid
        openxrSwapchainRelease(swapchain: int64): void
        getProjectionLayer(): int64
        setRenderRegion(renderRegion: Rect2I): void
        setEmulateEnvironmentBlendModeAlphaBlend(enabled: boolean): void
        isEnvironmentBlendModeAlphaSupported(): OpenXRApiExtension.OpenXRAlphaBlendModeSupport
        updateMainSwapchainSize(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRApiExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRApiExtension;
    }
    namespace OpenXRAction {
        enum ActionType {
            OpenxrActionBool = 0,
            OpenxrActionFloat = 1,
            OpenxrActionVector2 = 2,
            OpenxrActionPose = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRAction extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRAction extends __NameMapResource {
        localized_name: "localizedName";
        action_type: "actionType";
        toplevel_paths: "toplevelPaths";
    }
    /** An OpenXR action.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxraction.html  
     */
    class OpenXRAction extends Resource {
        constructor(identifier?: any)
        /** The localized description of this action. */
        get localizedName(): string
        set localizedName(value: string)
        
        /** The type of action. */
        get actionType(): int64
        set actionType(value: int64)
        
        /** A collections of toplevel paths to which this action can be bound. */
        get toplevelPaths(): PackedStringArray
        set toplevelPaths(value: PackedStringArray | string[])
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRAction;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRAction;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRActionBindingModifier extends __RPCMapOpenXRBindingModifier {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRActionBindingModifier extends __NameMapOpenXRBindingModifier {
    }
    /** Binding modifier that applies on individual actions related to an interaction profile.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxractionbindingmodifier.html  
     */
    class OpenXRActionBindingModifier extends OpenXRBindingModifier {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRActionBindingModifier;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRActionBindingModifier;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRActionMap extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRActionMap extends __NameMapResource {
        get_action_set_count: "getActionSetCount";
        find_action_set: "findActionSet";
        get_action_set: "getActionSet";
        add_action_set: "addActionSet";
        remove_action_set: "removeActionSet";
        get_interaction_profile_count: "getInteractionProfileCount";
        find_interaction_profile: "findInteractionProfile";
        get_interaction_profile: "getInteractionProfile";
        add_interaction_profile: "addInteractionProfile";
        remove_interaction_profile: "removeInteractionProfile";
        create_default_action_sets: "createDefaultActionSets";
        action_sets: "actionSets";
        interaction_profiles: "interactionProfiles";
    }
    /** Collection of [OpenXRActionSet] and [OpenXRInteractionProfile] resources for the OpenXR module.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxractionmap.html  
     */
    class OpenXRActionMap extends Resource {
        constructor(identifier?: any)
        /** Retrieve the number of actions sets in our action map. */
        getActionSetCount(): int64
        
        /** Retrieve an action set by name. */
        findActionSet(name: string): null | OpenXRActionSet
        
        /** Retrieve the action set at this index. */
        getActionSet(idx: int64): null | OpenXRActionSet
        
        /** Add an action set. */
        addActionSet(actionSet: OpenXRActionSet): void
        
        /** Remove an action set. */
        removeActionSet(actionSet: OpenXRActionSet): void
        
        /** Retrieve the number of interaction profiles in our action map. */
        getInteractionProfileCount(): int64
        
        /** Find an interaction profile by its name (path). */
        findInteractionProfile(name: string): null | OpenXRInteractionProfile
        
        /** Get the interaction profile at this index. */
        getInteractionProfile(idx: int64): null | OpenXRInteractionProfile
        
        /** Add an interaction profile. */
        addInteractionProfile(interactionProfile: OpenXRInteractionProfile): void
        
        /** Remove an interaction profile. */
        removeInteractionProfile(interactionProfile: OpenXRInteractionProfile): void
        
        /** Setup this action set with our default actions. */
        createDefaultActionSets(): void
        
        /** Collection of [OpenXRActionSet]s that are part of this action map. */
        get actionSets(): OpenXRActionSet
        set actionSets(value: OpenXRActionSet)
        
        /** Collection of [OpenXRInteractionProfile]s that are part of this action map. */
        get interactionProfiles(): OpenXRInteractionProfile
        set interactionProfiles(value: OpenXRInteractionProfile)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRActionMap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRActionMap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRActionSet extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRActionSet extends __NameMapResource {
        get_action_count: "getActionCount";
        add_action: "addAction";
        remove_action: "removeAction";
        localized_name: "localizedName";
    }
    /** Collection of [OpenXRAction] resources that make up an action set.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxractionset.html  
     */
    class OpenXRActionSet extends Resource {
        constructor(identifier?: any)
        /** Retrieve the number of actions in our action set. */
        getActionCount(): int64
        
        /** Add an action to this action set. */
        addAction(action: OpenXRAction): void
        
        /** Remove an action from this action set. */
        removeAction(action: OpenXRAction): void
        
        /** The localized name of this action set. */
        get localizedName(): string
        set localizedName(value: string)
        
        /** The priority for this action set. */
        get priority(): int64
        set priority(value: int64)
        
        /** Collection of actions for this action set. */
        get actions(): OpenXRAction
        set actions(value: OpenXRAction)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRActionSet;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRActionSet;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRAnalogThresholdModifier extends __RPCMapOpenXRActionBindingModifier {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRAnalogThresholdModifier extends __NameMapOpenXRActionBindingModifier {
        on_threshold: "onThreshold";
        off_threshold: "offThreshold";
        on_haptic: "onHaptic";
        off_haptic: "offHaptic";
    }
    /** The analog threshold binding modifier can modify a float input to a boolean input with specified thresholds.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxranalogthresholdmodifier.html  
     */
    class OpenXRAnalogThresholdModifier extends OpenXRActionBindingModifier {
        constructor(identifier?: any)
        /** When our input value is equal or larger than this value, our output becomes `true`. It stays `true` until it falls under the [member off_threshold] value. */
        get onThreshold(): float64
        set onThreshold(value: float64)
        
        /** When our input value falls below this, our output becomes `false`. */
        get offThreshold(): float64
        set offThreshold(value: float64)
        
        /** Haptic pulse to emit when the user presses the input. */
        get onHaptic(): null | OpenXRHapticBase
        set onHaptic(value: null | OpenXRHapticBase)
        
        /** Haptic pulse to emit when the user releases the input. */
        get offHaptic(): null | OpenXRHapticBase
        set offHaptic(value: null | OpenXRHapticBase)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRAnalogThresholdModifier;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRAnalogThresholdModifier;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRAnchorTracker extends __RPCMapOpenXRSpatialEntityTracker {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRAnchorTracker extends __NameMapOpenXRSpatialEntityTracker {
        has_uuid: "hasUuid";
        uuid_changed: "uuidChanged";
    }
    /** Positional tracker for our spatial entity anchor extension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxranchortracker.html  
     */
    class OpenXRAnchorTracker extends OpenXRSpatialEntityTracker {
        constructor(identifier?: any)
        /** Returns `true` if a non-zero UUID is set. */
        hasUuid(): boolean
        
        /** The UUID provided for persistent anchors. */
        get uuid(): string
        set uuid(value: string)
        
        /** Emitted when the UUID for this anchor was changed. */
        readonly uuidChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRAnchorTracker;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRAnchorTracker;
    }
    namespace OpenXRAndroidThreadSettingsExtension {
        enum ThreadType {
            ThreadTypeApplicationMain = 0,
            ThreadTypeApplicationWorker = 1,
            ThreadTypeRendererMain = 2,
            ThreadTypeRendererWorker = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRAndroidThreadSettingsExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRAndroidThreadSettingsExtension extends __NameMapOpenXRExtensionWrapper {
        set_application_thread_type: "setApplicationThreadType";
    }
    /** Wraps the [url=https://registry.khronos.org/OpenXR/specs/1.1/html/xrspec.html#XR_KHR_android_thread_settings]XR_KHR_android_thread_settings[/url] extension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrandroidthreadsettingsextension.html  
     */
    class OpenXRAndroidThreadSettingsExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Sets the thread type of the given thread, so that the XR runtime can adjust its scheduling priority accordingly.  
         *  [param thread_id] refers to the OS thread id (ie from `gettid()`). When [param thread_id] is `0`, it will set the thread type of the current thread.  
         *  **NOTE:** The id returned by [method Thread.get_id] is incompatible with [param thread_id].  
         */
        setApplicationThreadType(threadType: OpenXRAndroidThreadSettingsExtension.ThreadType, threadId?: int64 /* = 0 */): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRAndroidThreadSettingsExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRAndroidThreadSettingsExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRBindingModifier extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRBindingModifier extends __NameMapResource {
        _get_description: "_getDescription";
        _get_ip_modification: "_getIPModification";
    }
    /** Binding modifier base class.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrbindingmodifier.html  
     */
    class OpenXRBindingModifier extends Resource {
        constructor(identifier?: any)
        /** Return the description of this class that is used for the title bar of the binding modifier editor. */
        /* gdvirtual */ _getDescription(): string
        
        /** Returns the data that is sent to OpenXR when submitting the suggested interacting bindings this modifier is a part of.  
         *      
         *  **Note:** This must be data compatible with an `XrBindingModificationBaseHeaderKHR` structure.  
         */
        /* gdvirtual */ _getIPModification(): PackedByteArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRBindingModifier;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRBindingModifier;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRBindingModifierEditor extends __RPCMapPanelContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRBindingModifierEditor extends __NameMapPanelContainer {
        get_binding_modifier: "getBindingModifier";
        binding_modifier_removed: "bindingModifierRemoved";
    }
    /** Binding modifier editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrbindingmodifiereditor.html  
     */
    class OpenXRBindingModifierEditor<Map extends NodePathMap = any> extends PanelContainer<Map> {
        constructor(identifier?: any)
        /** Returns the [OpenXRBindingModifier] currently being edited. */
        getBindingModifier(): null | OpenXRBindingModifier
        
        /** Setup this editor for the provided [param action_map] and [param binding_modifier]. */
        setup(actionMap: OpenXRActionMap, bindingModifier: OpenXRBindingModifier): void
        
        /** Signal emitted when the user presses the delete binding modifier button for this modifier. */
        readonly bindingModifierRemoved: Signal<(bindingModifierEditor: GObject) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRBindingModifierEditor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRBindingModifierEditor;
    }
    namespace OpenXRCompositionLayer {
        enum Filter {
            FilterNearest = 0,
            FilterLinear = 1,
            FilterCubic = 2,
        }
        enum MipmapMode {
            MipmapModeDisabled = 0,
            MipmapModeNearest = 1,
            MipmapModeLinear = 2,
        }
        enum Wrap {
            WrapClampToBorder = 0,
            WrapClampToEdge = 1,
            WrapRepeat = 2,
            WrapMirroredRepeat = 3,
            WrapMirrorClampToEdge = 4,
        }
        enum Swizzle {
            SwizzleRed = 0,
            SwizzleGreen = 1,
            SwizzleBlue = 2,
            SwizzleAlpha = 3,
            SwizzleZero = 4,
            SwizzleOne = 5,
        }
        enum EyeVisibility {
            EyeVisibilityBoth = 0,
            EyeVisibilityLeft = 1,
            EyeVisibilityRight = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRCompositionLayer extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRCompositionLayer extends __NameMapNode3D {
        get_android_surface: "getAndroidSurface";
        is_natively_supported: "isNativelySupported";
        intersects_ray: "intersectsRay";
        layer_viewport: "layerViewport";
        use_android_surface: "useAndroidSurface";
        protected_content: "protectedContent";
        android_surface_size: "androidSurfaceSize";
        sort_order: "sortOrder";
        alpha_blend: "alphaBlend";
        enable_hole_punch: "enableHolePunch";
        eye_visibility: "eyeVisibility";
        swapchain_state_min_filter: "swapchainStateMinFilter";
        swapchain_state_mag_filter: "swapchainStateMagFilter";
        swapchain_state_mipmap_mode: "swapchainStateMipmapMode";
        swapchain_state_horizontal_wrap: "swapchainStateHorizontalWrap";
        swapchain_state_vertical_wrap: "swapchainStateVerticalWrap";
        swapchain_state_red_swizzle: "swapchainStateRedSwizzle";
        swapchain_state_green_swizzle: "swapchainStateGreenSwizzle";
        swapchain_state_blue_swizzle: "swapchainStateBlueSwizzle";
        swapchain_state_alpha_swizzle: "swapchainStateAlphaSwizzle";
        swapchain_state_max_anisotropy: "swapchainStateMaxAnisotropy";
        swapchain_state_border_color: "swapchainStateBorderColor";
    }
    /** The parent class of all OpenXR composition layer nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrcompositionlayer.html  
     */
    class OpenXRCompositionLayer<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns a [JavaObject] representing an `android.view.Surface` if [member use_android_surface] is enabled and OpenXR has created the surface. Otherwise, this will return `null`.  
         *      
         *  **Note:** The surface can only be created during an active OpenXR session. So, if [member use_android_surface] is enabled outside of an OpenXR session, it won't be created until a new session fully starts.  
         */
        getAndroidSurface(): null | JavaObject
        
        /** Returns `true` if the OpenXR runtime natively supports this composition layer type.  
         *      
         *  **Note:** This will only return an accurate result after the OpenXR session has started.  
         */
        isNativelySupported(): boolean
        
        /** Returns UV coordinates where the given ray intersects with the composition layer. [param origin] and [param direction] must be in global space.  
         *  Returns `Vector2(-1.0, -1.0)` if the ray doesn't intersect.  
         */
        intersectsRay(origin: Vector3, direction: Vector3): Vector2
        
        /** The [SubViewport] to render on the composition layer. */
        get layerViewport(): null | GObject
        set layerViewport(value: null | GObject)
        
        /** If enabled, an Android surface will be created (with the dimensions from [member android_surface_size]) which will provide the 2D content for the composition layer, rather than using [member layer_viewport].  
         *  See [method get_android_surface] for information about how to get the surface so that your application can draw to it.  
         *      
         *  **Note:** This will only work in Android builds.  
         */
        get useAndroidSurface(): boolean
        set useAndroidSurface(value: boolean)
        
        /** If enabled, the OpenXR swapchain will be created with the `XR_SWAPCHAIN_CREATE_PROTECTED_CONTENT_BIT` flag, which will protect its contents from CPU access.  
         *  When used with an Android Surface, this may allow DRM content to be presented, and will only take effect when the Surface is first created; later changes to this property will have no effect.  
         */
        get protectedContent(): boolean
        set protectedContent(value: boolean)
        
        /** The size of the Android surface to create if [member use_android_surface] is enabled. */
        get androidSurfaceSize(): Vector2I
        set androidSurfaceSize(value: Vector2I)
        
        /** The sort order for this composition layer. Higher numbers will be shown in front of lower numbers.  
         *      
         *  **Note:** This will have no effect if a fallback mesh is being used.  
         */
        get sortOrder(): int64
        set sortOrder(value: int64)
        
        /** Enables the blending the layer using its alpha channel.  
         *  Can be combined with [member Viewport.transparent_bg] to give the layer a transparent background.  
         */
        get alphaBlend(): boolean
        set alphaBlend(value: boolean)
        
        /** Enables a technique called "hole punching", which allows putting the composition layer behind the main projection layer (i.e. setting [member sort_order] to a negative value) while "punching a hole" through everything rendered by Godot so that the layer is still visible.  
         *  This can be used to create the illusion that the composition layer exists in the same 3D space as everything rendered by Godot, allowing objects to appear to pass both behind or in front of the composition layer.  
         */
        get enableHolePunch(): boolean
        set enableHolePunch(value: boolean)
        
        /** The eye(s) the composition layer is visible to.  
         *      
         *  **Note:** Not all composition layer types or runtimes support restricting visibility to a single eye.  
         */
        get eyeVisibility(): int64
        set eyeVisibility(value: int64)
        
        /** The minification filter of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateMinFilter(): int64
        set swapchainStateMinFilter(value: int64)
        
        /** The magnification filter of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateMagFilter(): int64
        set swapchainStateMagFilter(value: int64)
        
        /** The mipmap mode of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateMipmapMode(): int64
        set swapchainStateMipmapMode(value: int64)
        
        /** The horizontal wrap mode of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateHorizontalWrap(): int64
        set swapchainStateHorizontalWrap(value: int64)
        
        /** The vertical wrap mode of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateVerticalWrap(): int64
        set swapchainStateVerticalWrap(value: int64)
        
        /** The swizzle value for the red channel of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateRedSwizzle(): int64
        set swapchainStateRedSwizzle(value: int64)
        
        /** The swizzle value for the green channel of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateGreenSwizzle(): int64
        set swapchainStateGreenSwizzle(value: int64)
        
        /** The swizzle value for the blue channel of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateBlueSwizzle(): int64
        set swapchainStateBlueSwizzle(value: int64)
        
        /** The swizzle value for the alpha channel of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateAlphaSwizzle(): int64
        set swapchainStateAlphaSwizzle(value: int64)
        
        /** The max anisotropy of the swapchain state.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateMaxAnisotropy(): float64
        set swapchainStateMaxAnisotropy(value: float64)
        
        /** The border color of the swapchain state that is used when the wrap mode clamps to the border.  
         *      
         *  **Note:** This property only has an effect on devices that support the OpenXR XR_FB_swapchain_update_state OpenGLES/Vulkan extensions.  
         */
        get swapchainStateBorderColor(): Color
        set swapchainStateBorderColor(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRCompositionLayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRCompositionLayer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRCompositionLayerCylinder extends __RPCMapOpenXRCompositionLayer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRCompositionLayerCylinder extends __NameMapOpenXRCompositionLayer {
        aspect_ratio: "aspectRatio";
        central_angle: "centralAngle";
        fallback_segments: "fallbackSegments";
    }
    /** An OpenXR composition layer that is rendered as an internal slice of a cylinder.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrcompositionlayercylinder.html  
     */
    class OpenXRCompositionLayerCylinder<Map extends NodePathMap = any> extends OpenXRCompositionLayer<Map> {
        constructor(identifier?: any)
        /** The radius of the cylinder. */
        get radius(): float64
        set radius(value: float64)
        
        /** The aspect ratio of the slice. Used to set the height relative to the width. */
        get aspectRatio(): float64
        set aspectRatio(value: float64)
        
        /** The central angle of the cylinder. Used to set the width. */
        get centralAngle(): float64
        set centralAngle(value: float64)
        
        /** The number of segments to use in the fallback mesh. */
        get fallbackSegments(): int64
        set fallbackSegments(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRCompositionLayerCylinder;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRCompositionLayerCylinder;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRCompositionLayerEquirect extends __RPCMapOpenXRCompositionLayer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRCompositionLayerEquirect extends __NameMapOpenXRCompositionLayer {
        central_horizontal_angle: "centralHorizontalAngle";
        upper_vertical_angle: "upperVerticalAngle";
        lower_vertical_angle: "lowerVerticalAngle";
        fallback_segments: "fallbackSegments";
    }
    /** An OpenXR composition layer that is rendered as an internal slice of a sphere.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrcompositionlayerequirect.html  
     */
    class OpenXRCompositionLayerEquirect<Map extends NodePathMap = any> extends OpenXRCompositionLayer<Map> {
        constructor(identifier?: any)
        /** The radius of the sphere. */
        get radius(): float64
        set radius(value: float64)
        
        /** The central horizontal angle of the sphere. Used to set the width. */
        get centralHorizontalAngle(): float64
        set centralHorizontalAngle(value: float64)
        
        /** The upper vertical angle of the sphere. Used (together with [member lower_vertical_angle]) to set the height. */
        get upperVerticalAngle(): float64
        set upperVerticalAngle(value: float64)
        
        /** The lower vertical angle of the sphere. Used (together with [member upper_vertical_angle]) to set the height. */
        get lowerVerticalAngle(): float64
        set lowerVerticalAngle(value: float64)
        
        /** The number of segments to use in the fallback mesh. */
        get fallbackSegments(): int64
        set fallbackSegments(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRCompositionLayerEquirect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRCompositionLayerEquirect;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRCompositionLayerQuad extends __RPCMapOpenXRCompositionLayer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRCompositionLayerQuad extends __NameMapOpenXRCompositionLayer {
        quad_size: "quadSize";
    }
    /** An OpenXR composition layer that is rendered as a quad.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrcompositionlayerquad.html  
     */
    class OpenXRCompositionLayerQuad<Map extends NodePathMap = any> extends OpenXRCompositionLayer<Map> {
        constructor(identifier?: any)
        /** The dimensions of the quad. */
        get quadSize(): Vector2
        set quadSize(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRCompositionLayerQuad;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRCompositionLayerQuad;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRDpadBindingModifier extends __RPCMapOpenXRIPBindingModifier {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRDpadBindingModifier extends __NameMapOpenXRIPBindingModifier {
        action_set: "actionSet";
        input_path: "inputPath";
        threshold_released: "thresholdReleased";
        center_region: "centerRegion";
        wedge_angle: "wedgeAngle";
        is_sticky: "isSticky";
        on_haptic: "onHaptic";
        off_haptic: "offHaptic";
    }
    /** The DPad binding modifier converts an axis input to a dpad output.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrdpadbindingmodifier.html  
     */
    class OpenXRDpadBindingModifier extends OpenXRIPBindingModifier {
        constructor(identifier?: any)
        /** Action set for which this dpad binding modifier is active. */
        get actionSet(): null | OpenXRActionSet
        set actionSet(value: null | OpenXRActionSet)
        
        /** Input path for this dpad binding modifier. */
        get inputPath(): string
        set inputPath(value: string)
        
        /** When our input value is equal or larger than this value, our dpad in that direction becomes `true`. It stays `true` until it falls under the [member threshold_released] value. */
        get threshold(): float64
        set threshold(value: float64)
        
        /** When our input value falls below this, our output becomes `false`. */
        get thresholdReleased(): float64
        set thresholdReleased(value: float64)
        
        /** Center region in which our center position of our dpad return `true`. */
        get centerRegion(): float64
        set centerRegion(value: float64)
        
        /** The angle of each wedge that identifies the 4 directions of the emulated dpad. */
        get wedgeAngle(): float64
        set wedgeAngle(value: float64)
        
        /** If `false`, when the joystick enters a new dpad zone this becomes `true`.  
         *  If `true`, when the joystick remains in active dpad zone, this remains `true` even if we overlap with another zone.  
         */
        get isSticky(): boolean
        set isSticky(value: boolean)
        
        /** Haptic pulse to emit when the user presses the input. */
        get onHaptic(): null | OpenXRHapticBase
        set onHaptic(value: null | OpenXRHapticBase)
        
        /** Haptic pulse to emit when the user releases the input. */
        get offHaptic(): null | OpenXRHapticBase
        set offHaptic(value: null | OpenXRHapticBase)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRDpadBindingModifier;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRDpadBindingModifier;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRExtensionWrapper extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRExtensionWrapper extends __NameMapGObject {
        _get_requested_extensions: "_getRequestedExtensions";
        _set_system_properties_and_get_next_pointer: "_setSystemPropertiesAndGetNextPointer";
        _set_instance_create_info_and_get_next_pointer: "_setInstanceCreateInfoAndGetNextPointer";
        _set_session_create_and_get_next_pointer: "_setSessionCreateAndGetNextPointer";
        _set_swapchain_create_info_and_get_next_pointer: "_setSwapchainCreateInfoAndGetNextPointer";
        _set_hand_joint_locations_and_get_next_pointer: "_setHandJointLocationsAndGetNextPointer";
        _set_projection_views_and_get_next_pointer: "_setProjectionViewsAndGetNextPointer";
        _set_frame_wait_info_and_get_next_pointer: "_setFrameWaitInfoAndGetNextPointer";
        _set_frame_end_info_and_get_next_pointer: "_setFrameEndInfoAndGetNextPointer";
        _set_projection_layer_and_get_next_pointer: "_setProjectionLayerAndGetNextPointer";
        _set_view_locate_info_and_get_next_pointer: "_setViewLocateInfoAndGetNextPointer";
        _set_spatial_container_views_locate_info_and_get_next_pointer: "_setSpatialContainerViewsLocateInfoAndGetNextPointer";
        _set_reference_space_create_info_and_get_next_pointer: "_setReferenceSpaceCreateInfoAndGetNextPointer";
        _set_spatial_container_create_info_and_get_next_pointer: "_setSpatialContainerCreateInfoAndGetNextPointer";
        _prepare_view_configuration: "_prepareViewConfiguration";
        _set_view_configuration_and_get_next_pointer: "_setViewConfigurationAndGetNextPointer";
        _print_view_configuration_info: "_printViewConfigurationInfo";
        _get_composition_layer_count: "_getCompositionLayerCount";
        _get_composition_layer: "_getCompositionLayer";
        _get_composition_layer_order: "_getCompositionLayerOrder";
        _get_suggested_tracker_names: "_getSuggestedTrackerNames";
        _on_register_metadata: "_onRegisterMetadata";
        _on_before_instance_created: "_onBeforeInstanceCreated";
        _on_instance_created: "_onInstanceCreated";
        _on_instance_destroyed: "_onInstanceDestroyed";
        _on_session_created: "_onSessionCreated";
        _on_process: "_onProcess";
        _on_sync_actions: "_onSyncActions";
        _on_pre_render: "_onPreRender";
        _on_main_swapchains_created: "_onMainSwapchainsCreated";
        _on_pre_draw_viewport: "_onPreDrawViewport";
        _on_post_draw_viewport: "_onPostDrawViewport";
        _on_session_destroyed: "_onSessionDestroyed";
        _on_state_idle: "_onStateIdle";
        _on_state_ready: "_onStateReady";
        _on_state_synchronized: "_onStateSynchronized";
        _on_state_visible: "_onStateVisible";
        _on_state_focused: "_onStateFocused";
        _on_state_stopping: "_onStateStopping";
        _on_state_loss_pending: "_onStateLossPending";
        _on_state_exiting: "_onStateExiting";
        _on_event_polled: "_onEventPolled";
        _set_viewport_composition_layer_and_get_next_pointer: "_setViewportCompositionLayerAndGetNextPointer";
        _get_viewport_composition_layer_extension_properties: "_getViewportCompositionLayerExtensionProperties";
        _get_viewport_composition_layer_extension_property_defaults: "_getViewportCompositionLayerExtensionPropertyDefaults";
        _on_viewport_composition_layer_destroyed: "_onViewportCompositionLayerDestroyed";
        _set_android_surface_swapchain_create_info_and_get_next_pointer: "_setAndroidSurfaceSwapchainCreateInfoAndGetNextPointer";
        _get_camera_projections: "_getCameraProjections";
        _get_camera_offsets: "_getCameraOffsets";
        get_openxr_api: "getOpenxrApi";
        register_extension_wrapper: "registerExtensionWrapper";
    }
    /** Allows implementing OpenXR extensions with GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrextensionwrapper.html  
     */
    class OpenXRExtensionWrapper extends GObject {
        constructor(identifier?: any)
        /** Returns a [Dictionary] of OpenXR extensions related to this extension. [param xr_version] specifies the OpenXR version we're instantiating. This will be zero if the editor requests this list to flag supported features. The [Dictionary] should contain the name of the extension, mapped to a `bool *` cast to an integer:  
         *  - If the `bool *` is a `nullptr` this extension is mandatory.  
         *  - If the `bool *` points to a boolean, the boolean will be updated to `true` if the extension is enabled.  
         */
        /* gdvirtual */ _getRequestedExtensions(xRVersion: int64): GDictionary
        
        /** Add additional data structures when querying OpenXR system abilities. */
        /* gdvirtual */ _setSystemPropertiesAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures when the OpenXR instance is created. [param xr_version] specifies the OpenXR version we're instantiating. */
        /* gdvirtual */ _setInstanceCreateInfoAndGetNextPointer(xRVersion: int64, nextPointer: int64): int64
        
        /** Add additional data structures when the OpenXR session is created. */
        /* gdvirtual */ _setSessionCreateAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures when creating OpenXR swapchains. */
        /* gdvirtual */ _setSwapchainCreateInfoAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures when each hand tracker is created. */
        /* gdvirtual */ _setHandJointLocationsAndGetNextPointer(handIndex: int64, nextPointer: int64): int64
        
        /** Add additional data structures to the projection view of the given [param view_index].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _setProjectionViewsAndGetNextPointer(viewIndex: int64, nextPointer: int64): int64
        
        /** Add additional data structures to `XrFrameWaitInfo`.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_frame_info_extension].  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _setFrameWaitInfoAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures to `XrFrameEndInfo`.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_frame_info_extension].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _setFrameEndInfoAndGetNextPointer(nextPointer: int64): int64
        
        /** Adds additional data structures to `XrCompositionLayerProjection`.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_projection_layer_extension].  
         */
        /* gdvirtual */ _setProjectionLayerAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures to `XrViewLocateInfo`.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_frame_info_extension].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _setViewLocateInfoAndGetNextPointer(nextPointer: int64): int64
        
        /** Add additional data structures to `XrSpatialContainerViewsLocateInfoEXT` for the spatial container specified by [param spatial_container].  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_frame_info_extension].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _setSpatialContainerViewsLocateInfoAndGetNextPointer(spatialContainer: Rid, nextPointer: int64): int64
        
        /** Add additional data structures to `XrReferenceSpaceCreateInfo`. */
        /* gdvirtual */ _setReferenceSpaceCreateInfoAndGetNextPointer(referenceSpaceType: int64, nextPointer: int64): int64
        
        /** Add additional data structures when the spatial container is created. */
        /* gdvirtual */ _setSpatialContainerCreateInfoAndGetNextPointer(spatialContainer: Rid, nextPointer: int64): int64
        
        /** Called before [method _set_view_configuration_and_get_next_pointer] to allow the extension to reserve data for the given number of views. */
        /* gdvirtual */ _prepareViewConfiguration(viewCount: int64): void
        
        /** Add additional data structures when querying OpenXR view configuration. */
        /* gdvirtual */ _setViewConfigurationAndGetNextPointer(view: int64, nextPointer: int64): int64
        
        /** Called to allow an extension to print additional information about its view configuration, if applicable. This will only be called if verbose output is enabled. */
        /* gdvirtual */ _printViewConfigurationInfo(view: int64): void
        
        /** Returns the number of composition layers this extension wrapper provides via [method _get_composition_layer].  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_composition_layer_provider].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _getCompositionLayerCount(): int64
        
        /** Returns a pointer to an `XrCompositionLayerBaseHeader` struct to provide the given composition layer.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_composition_layer_provider].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _getCompositionLayer(index: int64): int64
        
        /** Returns an integer that will be used to sort the given composition layer provided via [method _get_composition_layer]. Lower numbers will move the layer to the front of the list, and higher numbers to the end. The default projection layer has an order of `0`, so layers provided by this method should probably be above or below (but not exactly) `0`.  
         *  This will only be called if the extension previously registered itself with [method OpenXRAPIExtension.register_composition_layer_provider].  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _getCompositionLayerOrder(index: int64): int64
        
        /** Returns a [PackedStringArray] of positional tracker names that are used within the extension wrapper. */
        /* gdvirtual */ _getSuggestedTrackerNames(): PackedStringArray
        
        /** Allows extensions to register additional controller metadata. This function is called even when the OpenXR API is not constructed as the metadata needs to be available to the editor.  
         *  Extensions should also provide metadata regardless of whether they are supported on the host system. The controller data is used to setup action maps for users who may have access to the relevant hardware.  
         */
        /* gdvirtual */ _onRegisterMetadata(interactionProfileMetadata: OpenXRInteractionProfileMetadata): void
        
        /** Called before the OpenXR instance is created.  
         *      
         *  **Note:** This virtual method will be called on the main thread, however, it will be called  *before*  OpenXR becomes involved in rendering, so it is safe to write to data that will be used by the render thread.  
         */
        /* gdvirtual */ _onBeforeInstanceCreated(): void
        
        /** Called right after the OpenXR instance is created.  
         *      
         *  **Note:** This virtual method will be called on the main thread, however, it will be called  *before*  OpenXR becomes involved in rendering, so it is safe to write to data that will be used by the render thread.  
         */
        /* gdvirtual */ _onInstanceCreated(instance: int64): void
        
        /** Called right before the OpenXR instance is destroyed.  
         *      
         *  **Note:** This virtual method will be called on the main thread, however, it will be called  *after*  OpenXR is done being involved in rendering, so it is safe to write to data that was used by the render thread.  
         */
        /* gdvirtual */ _onInstanceDestroyed(): void
        
        /** Called right after the OpenXR session is created.  
         *      
         *  **Note:** This virtual method will be called on the main thread, however, it will be called  *before*  OpenXR becomes involved in rendering, so it is safe to write to data that will be used by the render thread.  
         */
        /* gdvirtual */ _onSessionCreated(session: int64): void
        
        /** Called as part of the OpenXR process handling. This happens right before general and physics processing steps of the main loop. During this step controller data is queried and made available to game logic. */
        /* gdvirtual */ _onProcess(): void
        
        /** Called when OpenXR has performed its action sync. */
        /* gdvirtual */ _onSyncActions(): void
        
        /** Called right before the XR viewports begin their rendering step.  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _onPreRender(): void
        
        /** Called right after the main swapchains are (re)created.  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _onMainSwapchainsCreated(): void
        
        /** Called right before the given viewport is rendered.  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _onPreDrawViewport(viewport: Rid): void
        
        /** Called right after the given viewport is rendered.  
         *      
         *  **Note:** The draw commands might only be queued at this point, not executed.  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _onPostDrawViewport(viewport: Rid): void
        
        /** Called right before the OpenXR session is destroyed.  
         *      
         *  **Note:** This virtual method will be called on the main thread, however, it will be called  *after*  OpenXR is done being involved in rendering, so it is safe to write to data that was used by the render thread.  
         */
        /* gdvirtual */ _onSessionDestroyed(): void
        
        /** Called when the OpenXR session state is changed to idle. */
        /* gdvirtual */ _onStateIdle(): void
        
        /** Called when the OpenXR session state is changed to ready. This means OpenXR is ready to set up the session. */
        /* gdvirtual */ _onStateReady(): void
        
        /** Called when the OpenXR session state is changed to synchronized. OpenXR also returns to this state when the application loses focus. */
        /* gdvirtual */ _onStateSynchronized(): void
        
        /** Called when the OpenXR session state is changed to visible. This means OpenXR is now ready to receive frames. */
        /* gdvirtual */ _onStateVisible(): void
        
        /** Called when the OpenXR session state is changed to focused. This state is the active state when the game runs. */
        /* gdvirtual */ _onStateFocused(): void
        
        /** Called when the OpenXR session state is changed to stopping. */
        /* gdvirtual */ _onStateStopping(): void
        
        /** Called when the OpenXR session state is changed to loss pending. */
        /* gdvirtual */ _onStateLossPending(): void
        
        /** Called when the OpenXR session state is changed to exiting. */
        /* gdvirtual */ _onStateExiting(): void
        
        /** Called when there is an OpenXR event to process. When implementing, return `true` if the event was handled, return `false` otherwise. */
        /* gdvirtual */ _onEventPolled(event: int64): boolean
        
        /** Add additional data structures to composition layers created by [OpenXRCompositionLayer].  
         *  [param property_values] contains the values of the properties returned by [method _get_viewport_composition_layer_extension_properties].  
         *  [param layer] is a pointer to an `XrCompositionLayerBaseHeader` struct.  
         *      
         *  **Note:** This virtual method will be called on the render thread. Additionally, the data it returns will be used shortly after this method is called, so it needs to remain valid until the next time [method _on_pre_render] runs.  
         */
        /* gdvirtual */ _setViewportCompositionLayerAndGetNextPointer(layer: int64, propertyValues: GDictionary, nextPointer: int64): int64
        
        /** Gets an array of [Dictionary]s that represent properties, just like [method Object._get_property_list], that will be added to [OpenXRCompositionLayer] nodes.  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _getViewportCompositionLayerExtensionProperties(): GArray<GDictionary>
        
        /** Gets a [Dictionary] containing the default values for the properties returned by [method _get_viewport_composition_layer_extension_properties]. */
        /* gdvirtual */ _getViewportCompositionLayerExtensionPropertyDefaults(): GDictionary
        
        /** Called when a composition layer created via [OpenXRCompositionLayer] is destroyed.  
         *  [param layer] is a pointer to an `XrCompositionLayerBaseHeader` struct.  
         */
        /* gdvirtual */ _onViewportCompositionLayerDestroyed(layer: int64): void
        
        /** Add additional data structures to Android surface swapchains created by [OpenXRCompositionLayer].  
         *  [param property_values] contains the values of the properties returned by [method _get_viewport_composition_layer_extension_properties].  
         *      
         *  **Note:** This virtual method will be called on the render thread.  
         */
        /* gdvirtual */ _setAndroidSurfaceSwapchainCreateInfoAndGetNextPointer(propertyValues: GDictionary, nextPointer: int64): int64
        
        /** Returns an array of projections for each view rendered for the given camera, if this camera is handled by this extension. [param tracker_name] refers to the camera tracker for which we're retrieving this. */
        /* gdvirtual */ _getCameraProjections(trackerName: StringName, aspect: float64, zNear: float64, zFar: float64): GArray<Projection>
        
        /** Returns an array of offsets for each view rendered for the given camera, if this camera is handled by this extension. [param tracker_name] refers to the camera tracker for which we're retrieving this. */
        /* gdvirtual */ _getCameraOffsets(trackerName: StringName): GArray<Transform3D>
        
        /** Returns the created [OpenXRAPIExtension], which can be used to access the OpenXR API. */
        getOpenxrApi(): null | OpenXRApiExtension
        
        /** Registers the extension. This should happen at core module initialization level.  
         *      
         *  **Note:** This cannot be called once OpenXR has been initialized.  
         */
        registerExtensionWrapper(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRExtensionWrapper;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRExtensionWrapper;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRExtensionWrapperExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRExtensionWrapperExtension extends __NameMapOpenXRExtensionWrapper {
    }
    /** Allows implementing OpenXR extensions with GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrextensionwrapperextension.html  
     */
    class OpenXRExtensionWrapperExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRExtensionWrapperExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRExtensionWrapperExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRFoveatedInsetViewport extends __RPCMapSubViewport {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRFoveatedInsetViewport extends __NameMapSubViewport {
        get_xr_origin3d: "getXROrigin3D";
        get_xr_camera3d: "getXRCamera3D";
    }
    /** This viewport is used for rendering our foveated inset.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrfoveatedinsetviewport.html  
     */
    class OpenXRFoveatedInsetViewport<Map extends NodePathMap = any> extends SubViewport<Map> {
        constructor(identifier?: any)
        /** Returns the [XROrigin3D] node used for tracking the foveated inset. Our built-in logic handles positioning this node. It will copy the position and orientation of the [XROrigin3D] node marked as current. */
        getXROrigin3D(): null | XROrigin3D
        
        /** Returns the [XRCamera3D] node used for rendering the foveated inset. */
        getXRCamera3D(): null | XRCamera3D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRFoveatedInsetViewport;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRFoveatedInsetViewport;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRFrameSynthesisExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRFrameSynthesisExtension extends __NameMapOpenXRExtensionWrapper {
        is_available: "isAvailable";
        skip_next_frame: "skipNextFrame";
        relax_frame_interval: "relaxFrameInterval";
    }
    /** The OpenXR Frame synthesis extension allows for advanced reprojection at low(er) framerates.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrframesynthesisextension.html  
     */
    class OpenXRFrameSynthesisExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if frame synthesis is enabled in the project settings and the current XR runtime supports frame synthesis. The value returned will only be valid once OpenXR has been initialized. */
        isAvailable(): boolean
        
        /** Queues the next frame to be skipped when supplying motion vector and depth data. Call this after teleporting your player or a similar action has moved the player to prevent incorrect reprojection results due to this movement. */
        skipNextFrame(): void
        
        /** Enable frame synthesis. When `true` motion vector and depth data is provided to the XR runtime. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** If `true` this informs the XR runtime we will be providing frames at a greatly reduced rate. Enable this when you expect your application to run at low framerates and wish to inject multiple reprojected frames. */
        get relaxFrameInterval(): boolean
        set relaxFrameInterval(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRFrameSynthesisExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRFrameSynthesisExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRFutureExtension extends __RPCMapOpenXRExtensionWrapper {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRFutureExtension extends __NameMapOpenXRExtensionWrapper {
        is_active: "isActive";
        register_future: "registerFuture";
        cancel_future: "cancelFuture";
    }
    /** The OpenXR Future extension allows for asynchronous APIs to be used.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrfutureextension.html  
     */
    class OpenXRFutureExtension extends OpenXRExtensionWrapper {
        constructor(identifier?: any)
        /** Returns `true` if futures are available in the OpenXR runtime used. This function will only return a usable result after OpenXR has been initialized. */
        isActive(): boolean
        
        /** Register an OpenXR Future object so we monitor for completion. [param future] must be an `XrFutureEXT` value previously returned by an API that started an asynchronous function.  
         *  You can optionally specify [param on_success], it will be invoked on successful completion of the future.  
         *  Or you can use the returned [OpenXRFutureResult] object to `await` its [signal OpenXRFutureResult.completed] signal.  
         *    
         */
        registerFuture(future: int64, onSuccess?: Callable /* = new Callable() */): null | OpenXRFutureResult
        
        /** Cancels an in-progress future. [param future] must be an `XrFutureEXT` value previously returned by an API that started an asynchronous function. */
        cancelFuture(future: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRFutureExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRFutureExtension;
    }
    namespace OpenXRFutureResult {
        enum ResultStatus {
            ResultRunning = 0,
            ResultFinished = 1,
            ResultCancelled = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRFutureResult extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRFutureResult extends __NameMapRefCounted {
        get_status: "getStatus";
        get_future: "getFuture";
        cancel_future: "cancelFuture";
        set_result_value: "setResultValue";
        get_result_value: "getResultValue";
    }
    /** Result object tracking the asynchronous result of an OpenXR Future object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrfutureresult.html  
     */
    class OpenXRFutureResult extends RefCounted {
        constructor(identifier?: any)
        /** Returns the status of this result. */
        getStatus(): OpenXRFutureResult.ResultStatus
        
        /** Return the `XrFutureEXT` value this result relates to. */
        getFuture(): int64
        
        /** Cancel this future, this will interrupt and stop the asynchronous function. */
        cancelFuture(): void
        
        /** Stores the result value we expose to the user.  
         *      
         *  **Note:** This method should only be called by an OpenXR extension that implements an asynchronous function.  
         */
        setResultValue(resultValue: any): void
        
        /** Returns the result value of our asynchronous function (if set by the extension). The type of this result value depends on the function being called. Consult the documentation of the relevant function. */
        getResultValue(): any
        
        /** Emitted when the asynchronous function is finished or has been cancelled. */
        readonly completed: Signal<(result: OpenXRFutureResult) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRFutureResult;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRFutureResult;
    }
    namespace OpenXRHand {
        enum Hands {
            HandLeft = 0,
            HandRight = 1,
            HandMax = 2,
        }
        enum MotionRange {
            MotionRangeUnobstructed = 0,
            MotionRangeConformToController = 1,
            MotionRangeMax = 2,
        }
        enum SkeletonRig {
            SkeletonRigOpenxr = 0,
            SkeletonRigHumanoid = 1,
            SkeletonRigMax = 2,
        }
        enum BoneUpdate {
            BoneUpdateFull = 0,
            BoneUpdateRotationOnly = 1,
            BoneUpdateMax = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapOpenXRHand extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapOpenXRHand extends __NameMapNode3D {
        motion_range: "motionRange";
        hand_skeleton: "handSkeleton";
        skeleton_rig: "skeletonRig";
        bone_update: "boneUpdate";
    }
    /** Node supporting hand and finger tracking in OpenXR.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_openxrhand.html  
     */
    class OpenXRHand<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Specifies whether this node tracks the left or right hand of the player. */
        get hand(): int64
        set hand(value: int64)
        
        /** Set the motion range (if supported) limiting the hand motion. */
        get motionRange(): int64
        set motionRange(value: int64)
        
        /** Set a [Skeleton3D] node for which the pose positions will be updated. */
        get handSkeleton(): NodePath
        set handSkeleton(value: NodePath | string)
        
        /** Set the type of skeleton rig the [member hand_skeleton] is compliant with. */
        get skeletonRig(): int64
        set skeletonRig(value: int64)
        
        /** Specify the type of updates to perform on the bone. */
        get boneUpdate(): int64
        set boneUpdate(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapOpenXRHand;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapOpenXRHand;
    }
}
