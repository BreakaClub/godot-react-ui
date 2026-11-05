declare module "godot" {
    // AUTO-GENERATED
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineDepthStencilState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineDepthStencilState extends __NameMapRefCounted {
        enable_depth_test: "enableDepthTest";
        enable_depth_write: "enableDepthWrite";
        depth_compare_operator: "depthCompareOperator";
        enable_depth_range: "enableDepthRange";
        depth_range_min: "depthRangeMin";
        depth_range_max: "depthRangeMax";
        enable_stencil: "enableStencil";
        front_op_fail: "frontOpFail";
        front_op_pass: "frontOpPass";
        front_op_depth_fail: "frontOpDepthFail";
        front_op_compare: "frontOpCompare";
        front_op_compare_mask: "frontOpCompareMask";
        front_op_write_mask: "frontOpWriteMask";
        front_op_reference: "frontOpReference";
        back_op_fail: "backOpFail";
        back_op_pass: "backOpPass";
        back_op_depth_fail: "backOpDepthFail";
        back_op_compare: "backOpCompare";
        back_op_compare_mask: "backOpCompareMask";
        back_op_write_mask: "backOpWriteMask";
        back_op_reference: "backOpReference";
    }
    /** Pipeline depth/stencil state (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinedepthstencilstate.html  
     */
    class RDPipelineDepthStencilState extends RefCounted {
        constructor(identifier?: any)
        /** If `true`, enables depth testing which allows objects to be automatically occluded by other objects based on their depth. This also allows objects to be partially occluded by other objects. If `false`, objects will appear in the order they were drawn (like in Godot's 2D renderer). */
        get enableDepthTest(): boolean
        set enableDepthTest(value: boolean)
        
        /** If `true`, writes to the depth buffer whenever the depth test returns `true`. Only works when enable_depth_test is also `true`. */
        get enableDepthWrite(): boolean
        set enableDepthWrite(value: boolean)
        
        /** The method used for comparing the previous and current depth values. */
        get depthCompareOperator(): int64
        set depthCompareOperator(value: int64)
        
        /** If `true`, each depth value will be tested to see if it is between [member depth_range_min] and [member depth_range_max]. If it is outside of these values, it is discarded. */
        get enableDepthRange(): boolean
        set enableDepthRange(value: boolean)
        
        /** The minimum depth that returns `true` for [member enable_depth_range]. */
        get depthRangeMin(): float64
        set depthRangeMin(value: float64)
        
        /** The maximum depth that returns `true` for [member enable_depth_range]. */
        get depthRangeMax(): float64
        set depthRangeMax(value: float64)
        
        /** If `true`, enables stencil testing. There are separate stencil buffers for front-facing triangles and back-facing triangles. See properties that begin with "front_op" and properties with "back_op" for each. */
        get enableStencil(): boolean
        set enableStencil(value: boolean)
        
        /** The operation to perform on the stencil buffer for front pixels that fail the stencil test. */
        get frontOpFail(): int64
        set frontOpFail(value: int64)
        
        /** The operation to perform on the stencil buffer for front pixels that pass the stencil test. */
        get frontOpPass(): int64
        set frontOpPass(value: int64)
        
        /** The operation to perform on the stencil buffer for front pixels that pass the stencil test but fail the depth test. */
        get frontOpDepthFail(): int64
        set frontOpDepthFail(value: int64)
        
        /** The method used for comparing the previous front stencil value and [member front_op_reference]. */
        get frontOpCompare(): int64
        set frontOpCompare(value: int64)
        
        /** Selects which bits from the front stencil value will be compared. */
        get frontOpCompareMask(): int64
        set frontOpCompareMask(value: int64)
        
        /** Selects which bits from the front stencil value will be changed. */
        get frontOpWriteMask(): int64
        set frontOpWriteMask(value: int64)
        
        /** The value the previous front stencil value will be compared to. */
        get frontOpReference(): int64
        set frontOpReference(value: int64)
        
        /** The operation to perform on the stencil buffer for back pixels that fail the stencil test. */
        get backOpFail(): int64
        set backOpFail(value: int64)
        
        /** The operation to perform on the stencil buffer for back pixels that pass the stencil test. */
        get backOpPass(): int64
        set backOpPass(value: int64)
        
        /** The operation to perform on the stencil buffer for back pixels that pass the stencil test but fail the depth test. */
        get backOpDepthFail(): int64
        set backOpDepthFail(value: int64)
        
        /** The method used for comparing the previous back stencil value and [member back_op_reference]. */
        get backOpCompare(): int64
        set backOpCompare(value: int64)
        
        /** Selects which bits from the back stencil value will be compared. */
        get backOpCompareMask(): int64
        set backOpCompareMask(value: int64)
        
        /** Selects which bits from the back stencil value will be changed. */
        get backOpWriteMask(): int64
        set backOpWriteMask(value: int64)
        
        /** The value the previous back stencil value will be compared to. */
        get backOpReference(): int64
        set backOpReference(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineDepthStencilState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineDepthStencilState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineMultisampleState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineMultisampleState extends __NameMapRefCounted {
        sample_count: "sampleCount";
        enable_sample_shading: "enableSampleShading";
        min_sample_shading: "minSampleShading";
        enable_alpha_to_coverage: "enableAlphaToCoverage";
        enable_alpha_to_one: "enableAlphaToOne";
        sample_masks: "sampleMasks";
    }
    /** Pipeline multisample state (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinemultisamplestate.html  
     */
    class RDPipelineMultisampleState extends RefCounted {
        constructor(identifier?: any)
        /** The number of MSAA samples (or SSAA samples if [member enable_sample_shading] is `true`) to perform. Higher values result in better antialiasing, at the cost of performance. */
        get sampleCount(): int64
        set sampleCount(value: int64)
        
        /** If `true`, enables per-sample shading which replaces MSAA by SSAA. This provides higher quality antialiasing that works with transparent (alpha scissor) edges. This has a very high performance cost. See also [member min_sample_shading]. See the [url=https://registry.khronos.org/vulkan/specs/1.3-extensions/html/vkspec.html#primsrast-sampleshading]per-sample shading Vulkan documentation[/url] for more details. */
        get enableSampleShading(): boolean
        set enableSampleShading(value: boolean)
        
        /** The multiplier of [member sample_count] that determines how many samples are performed for each fragment. Must be between `0.0` and `1.0` (inclusive). Only effective if [member enable_sample_shading] is `true`. If [member min_sample_shading] is `1.0`, fragment invocation must only read from the coverage index sample. Tile image access must not be used if [member enable_sample_shading] is  *not*  `1.0`. */
        get minSampleShading(): float64
        set minSampleShading(value: float64)
        
        /** If `true`, alpha to coverage is enabled. This generates a temporary coverage value based on the alpha component of the fragment's first color output. This allows alpha transparency to make use of multisample antialiasing. */
        get enableAlphaToCoverage(): boolean
        set enableAlphaToCoverage(value: boolean)
        
        /** If `true`, alpha is forced to either `0.0` or `1.0`. This allows hardening the edges of antialiased alpha transparencies. Only relevant if [member enable_alpha_to_coverage] is `true`. */
        get enableAlphaToOne(): boolean
        set enableAlphaToOne(value: boolean)
        
        /** The sample mask array. See the [url=https://registry.khronos.org/vulkan/specs/1.3-extensions/html/vkspec.html#fragops-samplemask]sample mask Vulkan documentation[/url] for more details. */
        get sampleMasks(): GArray<int64>
        set sampleMasks(value: GArray<int64>)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineMultisampleState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineMultisampleState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineRasterizationState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineRasterizationState extends __NameMapRefCounted {
        enable_depth_clamp: "enableDepthClamp";
        discard_primitives: "discardPrimitives";
        cull_mode: "cullMode";
        front_face: "frontFace";
        depth_bias_enabled: "depthBiasEnabled";
        depth_bias_constant_factor: "depthBiasConstantFactor";
        depth_bias_clamp: "depthBiasClamp";
        depth_bias_slope_factor: "depthBiasSlopeFactor";
        line_width: "lineWidth";
        patch_control_points: "patchControlPoints";
    }
    /** Pipeline rasterization state (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinerasterizationstate.html  
     */
    class RDPipelineRasterizationState extends RefCounted {
        constructor(identifier?: any)
        /** If `true`, clamps depth values according to the minimum and maximum depth of the associated viewport. */
        get enableDepthClamp(): boolean
        set enableDepthClamp(value: boolean)
        
        /** If `true`, primitives are discarded immediately before the rasterization stage. */
        get discardPrimitives(): boolean
        set discardPrimitives(value: boolean)
        
        /** If `true`, performs wireframe rendering for triangles instead of flat or textured rendering. */
        get wireframe(): boolean
        set wireframe(value: boolean)
        
        /** The cull mode to use when drawing polygons, which determines whether front faces or backfaces are hidden. */
        get cullMode(): int64
        set cullMode(value: int64)
        
        /** The winding order to use to determine which face of a triangle is considered its front face. */
        get frontFace(): int64
        set frontFace(value: int64)
        
        /** If `true`, each generated depth value will by offset by some amount. The specific amount is generated per polygon based on the values of [member depth_bias_slope_factor] and [member depth_bias_constant_factor]. */
        get depthBiasEnabled(): boolean
        set depthBiasEnabled(value: boolean)
        
        /** A constant offset added to each depth value. Applied after [member depth_bias_slope_factor]. */
        get depthBiasConstantFactor(): float64
        set depthBiasConstantFactor(value: float64)
        
        /** A limit for how much each depth value can be offset. If negative, it serves as a minimum value, but if positive, it serves as a maximum value. */
        get depthBiasClamp(): float64
        set depthBiasClamp(value: float64)
        
        /** A constant scale applied to the slope of each polygon's depth. Applied before [member depth_bias_constant_factor]. */
        get depthBiasSlopeFactor(): float64
        set depthBiasSlopeFactor(value: float64)
        
        /** The line width to use when drawing lines (in pixels). Thick lines may not be supported on all hardware. */
        get lineWidth(): float64
        set lineWidth(value: float64)
        
        /** The number of control points to use when drawing a patch with tessellation enabled. Higher values result in higher quality at the cost of performance. */
        get patchControlPoints(): int64
        set patchControlPoints(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineRasterizationState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineRasterizationState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineShader extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineShader extends __NameMapRefCounted {
        specialization_constants: "specializationConstants";
    }
    /** Pipeline shader (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelineshader.html  
     */
    class RDPipelineShader extends RefCounted {
        constructor(identifier?: any)
        /** Shader resource. The required stage is selected by the pipeline. */
        get shader(): Rid
        set shader(value: Rid)
        
        /** Specialization constants applied to the selected shader stage at pipeline creation time. */
        get specializationConstants(): GArray<RDPipelineSpecializationConstant>
        set specializationConstants(value: GArray<RDPipelineSpecializationConstant>)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineShader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineShader;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDPipelineSpecializationConstant extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDPipelineSpecializationConstant extends __NameMapRefCounted {
        constant_id: "constantId";
    }
    /** Pipeline specialization constant (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdpipelinespecializationconstant.html  
     */
    class RDPipelineSpecializationConstant extends RefCounted {
        constructor(identifier?: any)
        /** The specialization constant's value. Only [bool], [int] and [float] types are valid for specialization constants. */
        get value(): any
        set value(value: any)
        
        /** The identifier of the specialization constant. This is a value starting from `0` and that increments for every different specialization constant for a given shader. */
        get constantId(): int64
        set constantId(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDPipelineSpecializationConstant;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDPipelineSpecializationConstant;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDSamplerState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDSamplerState extends __NameMapRefCounted {
        mag_filter: "magFilter";
        min_filter: "minFilter";
        mip_filter: "mipFilter";
        repeat_u: "repeatU";
        repeat_v: "repeatV";
        repeat_w: "repeatW";
        lod_bias: "lodBias";
        use_anisotropy: "useAnisotropy";
        anisotropy_max: "anisotropyMax";
        enable_compare: "enableCompare";
        compare_op: "compareOp";
        min_lod: "minLod";
        max_lod: "maxLod";
        border_color: "borderColor";
        unnormalized_uvw: "unnormalizedUvw";
    }
    /** Sampler state (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdsamplerstate.html  
     */
    class RDSamplerState extends RefCounted {
        constructor(identifier?: any)
        /** The sampler's magnification filter. It is the filtering method used when sampling texels that appear bigger than on-screen pixels. */
        get magFilter(): int64
        set magFilter(value: int64)
        
        /** The sampler's minification filter. It is the filtering method used when sampling texels that appear smaller than on-screen pixels. */
        get minFilter(): int64
        set minFilter(value: int64)
        
        /** The filtering method to use for mipmaps. */
        get mipFilter(): int64
        set mipFilter(value: int64)
        
        /** The repeat mode to use along the U axis of UV coordinates. This affects the returned values if sampling outside the UV bounds. */
        get repeatU(): int64
        set repeatU(value: int64)
        
        /** The repeat mode to use along the V axis of UV coordinates. This affects the returned values if sampling outside the UV bounds. */
        get repeatV(): int64
        set repeatV(value: int64)
        
        /** The repeat mode to use along the W axis of UV coordinates. This affects the returned values if sampling outside the UV bounds. Only effective for 3D samplers. */
        get repeatW(): int64
        set repeatW(value: int64)
        
        /** The mipmap LOD bias to use. Positive values will make the sampler blurrier at a given distance, while negative values will make the sampler sharper at a given distance (at the risk of looking grainy). Recommended values are between `-0.5` and `0.0`. Only effective if the sampler has mipmaps available. */
        get lodBias(): float64
        set lodBias(value: float64)
        
        /** If `true`, perform anisotropic sampling. See [member anisotropy_max]. */
        get useAnisotropy(): boolean
        set useAnisotropy(value: boolean)
        
        /** Maximum anisotropy that can be used when sampling. Only effective if [member use_anisotropy] is `true`. Higher values result in a sharper sampler at oblique angles, at the cost of performance (due to memory bandwidth). This value may be limited by the graphics hardware in use. Most graphics hardware only supports values up to `16.0`.  
         *  If [member anisotropy_max] is `1.0`, forcibly disables anisotropy even if [member use_anisotropy] is `true`.  
         */
        get anisotropyMax(): float64
        set anisotropyMax(value: float64)
        
        /** If `true`, returned values will be based on the comparison operation defined in [member compare_op]. This is a hardware-based approach and is therefore faster than performing this manually in a shader. For example, compare operations are used for shadow map rendering by comparing depth values from a shadow sampler. */
        get enableCompare(): boolean
        set enableCompare(value: boolean)
        
        /** The compare operation to use. Only effective if [member enable_compare] is `true`. */
        get compareOp(): int64
        set compareOp(value: int64)
        
        /** The minimum mipmap LOD bias to display (highest resolution). Only effective if the sampler has mipmaps available. */
        get minLod(): float64
        set minLod(value: float64)
        
        /** The maximum mipmap LOD bias to display (lowest resolution). Only effective if the sampler has mipmaps available. */
        get maxLod(): float64
        set maxLod(value: float64)
        
        /** The border color that will be returned when sampling outside the sampler's bounds and the [member repeat_u], [member repeat_v] or [member repeat_w] modes have repeating disabled. */
        get borderColor(): int64
        set borderColor(value: int64)
        
        /** If `true`, the texture will be sampled with coordinates ranging from 0 to the texture's resolution. Otherwise, the coordinates will be normalized and range from 0 to 1. */
        get unnormalizedUvw(): boolean
        set unnormalizedUvw(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDSamplerState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDSamplerState;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDShaderFile extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDShaderFile extends __NameMapResource {
        set_bytecode: "setBytecode";
        get_spirv: "getSpirV";
        get_version_list: "getVersionList";
        base_error: "baseError";
    }
    /** Compiled shader file in SPIR-V form (used by [RenderingDevice]). Not to be confused with Godot's own [Shader].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdshaderfile.html  
     */
    class RDShaderFile extends Resource {
        constructor(identifier?: any)
        /** Sets the SPIR-V [param bytecode] that will be compiled for the specified [param version]. */
        setBytecode(bytecode: RDShaderSpirV, version?: StringName /* = '' */): void
        
        /** Returns the SPIR-V intermediate representation for the specified shader [param version]. */
        getSpirV(version?: StringName /* = '' */): null | RDShaderSpirV
        
        /** Returns the list of compiled versions for this shader. */
        getVersionList(): GArray<StringName>
        get _versions(): GDictionary
        set _versions(value: GDictionary)
        
        /** The base compilation error message, which indicates errors not related to a specific shader stage if non-empty. If empty, shader compilation is not necessarily successful (check [RDShaderSPIRV]'s error message members). */
        get baseError(): string
        set baseError(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDShaderFile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDShaderFile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDShaderSpirV extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDShaderSpirV extends __NameMapResource {
        set_stage_bytecode: "setStageBytecode";
        get_stage_bytecode: "getStageBytecode";
        set_stage_compile_error: "setStageCompileError";
        get_stage_compile_error: "getStageCompileError";
        bytecode_vertex: "bytecodeVertex";
        bytecode_fragment: "bytecodeFragment";
        bytecode_tesselation_control: "bytecodeTesselationControl";
        bytecode_tesselation_evaluation: "bytecodeTesselationEvaluation";
        bytecode_compute: "bytecodeCompute";
        bytecode_raygen: "bytecodeRaygen";
        bytecode_any_hit: "bytecodeAnyHit";
        bytecode_closest_hit: "bytecodeClosestHit";
        bytecode_miss: "bytecodeMiss";
        bytecode_intersection: "bytecodeIntersection";
        compile_error_vertex: "compileErrorVertex";
        compile_error_fragment: "compileErrorFragment";
        compile_error_tesselation_control: "compileErrorTesselationControl";
        compile_error_tesselation_evaluation: "compileErrorTesselationEvaluation";
        compile_error_compute: "compileErrorCompute";
        compile_error_raygen: "compileErrorRaygen";
        compile_error_any_hit: "compileErrorAnyHit";
        compile_error_closest_hit: "compileErrorClosestHit";
        compile_error_miss: "compileErrorMiss";
        compile_error_intersection: "compileErrorIntersection";
    }
    class RDShaderSpirV extends Resource {
        constructor(identifier?: any)
        setStageBytecode(stage: RenderingDevice.ShaderStage, bytecode: PackedByteArray | byte[] | ArrayBuffer): void
        getStageBytecode(stage: RenderingDevice.ShaderStage): PackedByteArray
        setStageCompileError(stage: RenderingDevice.ShaderStage, compileError: string): void
        getStageCompileError(stage: RenderingDevice.ShaderStage): string
        get bytecodeVertex(): PackedByteArray
        set bytecodeVertex(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeFragment(): PackedByteArray
        set bytecodeFragment(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeTesselationControl(): PackedByteArray
        set bytecodeTesselationControl(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeTesselationEvaluation(): PackedByteArray
        set bytecodeTesselationEvaluation(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeCompute(): PackedByteArray
        set bytecodeCompute(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeRaygen(): PackedByteArray
        set bytecodeRaygen(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeAnyHit(): PackedByteArray
        set bytecodeAnyHit(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeClosestHit(): PackedByteArray
        set bytecodeClosestHit(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeMiss(): PackedByteArray
        set bytecodeMiss(value: PackedByteArray | byte[] | ArrayBuffer)
        get bytecodeIntersection(): PackedByteArray
        set bytecodeIntersection(value: PackedByteArray | byte[] | ArrayBuffer)
        get compileErrorVertex(): string
        set compileErrorVertex(value: string)
        get compileErrorFragment(): string
        set compileErrorFragment(value: string)
        get compileErrorTesselationControl(): string
        set compileErrorTesselationControl(value: string)
        get compileErrorTesselationEvaluation(): string
        set compileErrorTesselationEvaluation(value: string)
        get compileErrorCompute(): string
        set compileErrorCompute(value: string)
        get compileErrorRaygen(): string
        set compileErrorRaygen(value: string)
        get compileErrorAnyHit(): string
        set compileErrorAnyHit(value: string)
        get compileErrorClosestHit(): string
        set compileErrorClosestHit(value: string)
        get compileErrorMiss(): string
        set compileErrorMiss(value: string)
        get compileErrorIntersection(): string
        set compileErrorIntersection(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDShaderSpirV;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDShaderSpirV;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDShaderSource extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDShaderSource extends __NameMapRefCounted {
        set_stage_source: "setStageSource";
        get_stage_source: "getStageSource";
        source_vertex: "sourceVertex";
        source_fragment: "sourceFragment";
        source_tesselation_control: "sourceTesselationControl";
        source_tesselation_evaluation: "sourceTesselationEvaluation";
        source_compute: "sourceCompute";
        source_raygen: "sourceRaygen";
        source_any_hit: "sourceAnyHit";
        source_closest_hit: "sourceClosestHit";
        source_miss: "sourceMiss";
        source_intersection: "sourceIntersection";
    }
    /** Shader source code (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdshadersource.html  
     */
    class RDShaderSource extends RefCounted {
        constructor(identifier?: any)
        /** Sets [param source] code for the specified shader [param stage]. Equivalent to setting one of [member source_compute], [member source_fragment], [member source_tesselation_control], [member source_tesselation_evaluation] or [member source_vertex].  
         *      
         *  **Note:** If you set the compute shader source code using this method directly, remember to remove the Godot-specific hint `#[compute]`.  
         */
        setStageSource(stage: RenderingDevice.ShaderStage, source: string): void
        
        /** Returns source code for the specified shader [param stage]. Equivalent to getting one of [member source_compute], [member source_fragment], [member source_tesselation_control], [member source_tesselation_evaluation] or [member source_vertex]. */
        getStageSource(stage: RenderingDevice.ShaderStage): string
        
        /** Source code for the shader's vertex stage. */
        get sourceVertex(): string
        set sourceVertex(value: string)
        
        /** Source code for the shader's fragment stage. */
        get sourceFragment(): string
        set sourceFragment(value: string)
        
        /** Source code for the shader's tessellation control stage. */
        get sourceTesselationControl(): string
        set sourceTesselationControl(value: string)
        
        /** Source code for the shader's tessellation evaluation stage. */
        get sourceTesselationEvaluation(): string
        set sourceTesselationEvaluation(value: string)
        
        /** Source code for the shader's compute stage. */
        get sourceCompute(): string
        set sourceCompute(value: string)
        
        /** Source code for the shader's ray generation stage. */
        get sourceRaygen(): string
        set sourceRaygen(value: string)
        
        /** Source code for the shader's any hit stage. */
        get sourceAnyHit(): string
        set sourceAnyHit(value: string)
        
        /** Source code for the shader's closest hit stage. */
        get sourceClosestHit(): string
        set sourceClosestHit(value: string)
        
        /** Source code for the shader's miss stage. */
        get sourceMiss(): string
        set sourceMiss(value: string)
        
        /** Source code for the shader's intersection stage. */
        get sourceIntersection(): string
        set sourceIntersection(value: string)
        
        /** The language the shader is written in. */
        get language(): int64
        set language(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDShaderSource;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDShaderSource;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDTextureFormat extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDTextureFormat extends __NameMapRefCounted {
        add_shareable_format: "addShareableFormat";
        remove_shareable_format: "removeShareableFormat";
        array_layers: "arrayLayers";
        texture_type: "textureType";
        usage_bits: "usageBits";
        is_resolve_buffer: "isResolveBuffer";
        is_discardable: "isDiscardable";
    }
    /** Texture format (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdtextureformat.html  
     */
    class RDTextureFormat extends RefCounted {
        constructor(identifier?: any)
        /** Adds [param format] as a valid format for the corresponding [RDTextureView]'s [member RDTextureView.format_override] property. If any format is added as shareable, then the main [member format] must also be added. */
        addShareableFormat(format: RenderingDevice.DataFormat): void
        
        /** Removes [param format] from the list of valid formats that the corresponding [RDTextureView]'s [member RDTextureView.format_override] property can be set to. */
        removeShareableFormat(format: RenderingDevice.DataFormat): void
        
        /** The texture's pixel data format. */
        get format(): int64
        set format(value: int64)
        
        /** The texture's width (in pixels). */
        get width(): int64
        set width(value: int64)
        
        /** The texture's height (in pixels). */
        get height(): int64
        set height(value: int64)
        
        /** The texture's depth (in pixels). This is always `1` for 2D textures. */
        get depth(): int64
        set depth(value: int64)
        
        /** The number of layers in the texture. Only relevant for 2D texture arrays. */
        get arrayLayers(): int64
        set arrayLayers(value: int64)
        
        /** The number of mipmaps available in the texture. */
        get mipmaps(): int64
        set mipmaps(value: int64)
        
        /** The texture type. */
        get textureType(): int64
        set textureType(value: int64)
        
        /** The number of samples used when sampling the texture. */
        get samples(): int64
        set samples(value: int64)
        
        /** The texture's usage bits, which determine what can be done using the texture. */
        get usageBits(): int64
        set usageBits(value: int64)
        
        /** The texture will be used as the destination of a resolve operation. */
        get isResolveBuffer(): boolean
        set isResolveBuffer(value: boolean)
        
        /** If a texture is discardable, its contents do not need to be preserved between frames. This flag is only relevant when the texture is used as target in a draw list.  
         *  This information is used by [RenderingDevice] to figure out if a texture's contents can be discarded, eliminating unnecessary writes to memory and boosting performance.  
         */
        get isDiscardable(): boolean
        set isDiscardable(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDTextureFormat;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDTextureFormat;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDTextureView extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDTextureView extends __NameMapRefCounted {
        format_override: "formatOverride";
        swizzle_r: "swizzleR";
        swizzle_g: "swizzleG";
        swizzle_b: "swizzleB";
        swizzle_a: "swizzleA";
    }
    /** Texture view (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdtextureview.html  
     */
    class RDTextureView extends RefCounted {
        constructor(identifier?: any)
        /** Optional override for the data format to return sampled values in. The corresponding [RDTextureFormat] must have had this added as a shareable format. The default value of [constant RenderingDevice.DATA_FORMAT_MAX] does not override the format. */
        get formatOverride(): int64
        set formatOverride(value: int64)
        
        /** The channel to sample when sampling the red color channel. */
        get swizzleR(): int64
        set swizzleR(value: int64)
        
        /** The channel to sample when sampling the green color channel. */
        get swizzleG(): int64
        set swizzleG(value: int64)
        
        /** The channel to sample when sampling the blue color channel. */
        get swizzleB(): int64
        set swizzleB(value: int64)
        
        /** The channel to sample when sampling the alpha channel. */
        get swizzleA(): int64
        set swizzleA(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDTextureView;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDTextureView;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDUniform extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDUniform extends __NameMapRefCounted {
        add_id: "addId";
        clear_ids: "clearIds";
        uniform_type: "uniformType";
    }
    /** Shader uniform (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rduniform.html  
     */
    class RDUniform extends RefCounted {
        constructor(identifier?: any)
        /** Binds the given id to the uniform. The data associated with the id is then used when the uniform is passed to a shader. */
        addId(id: Rid): void
        
        /** Unbinds all ids currently bound to the uniform. */
        clearIds(): void
        
        /** The uniform's data type. */
        get uniformType(): int64
        set uniformType(value: int64)
        
        /** The uniform's binding. */
        get binding(): int64
        set binding(value: int64)
        get _ids(): GArray
        set _ids(value: GArray)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDUniform;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDUniform;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRDVertexAttribute extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRDVertexAttribute extends __NameMapRefCounted {
    }
    /** Vertex attribute (used by [RenderingDevice]).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rdvertexattribute.html  
     */
    class RDVertexAttribute extends RefCounted {
        constructor(identifier?: any)
        /** The index of the buffer in the vertex buffer array to bind this vertex attribute. When set to `-1`, it defaults to the index of the attribute.  
         *      
         *  **Note:** You cannot mix binding explicitly assigned attributes with implicitly assigned ones (i.e. `-1`). Either all attributes must have their binding set to `-1`, or all must have explicit bindings.  
         */
        get binding(): int64
        set binding(value: int64)
        
        /** The location in the shader that this attribute is bound to. */
        get location(): int64
        set location(value: int64)
        
        /** The number of bytes between the start of the vertex buffer and the first instance of this attribute. */
        get offset(): int64
        set offset(value: int64)
        
        /** The way that this attribute's data is interpreted when sent to a shader. */
        get format(): int64
        set format(value: int64)
        
        /** The number of bytes between the starts of consecutive instances of this attribute. */
        get stride(): int64
        set stride(value: int64)
        
        /** The rate at which this attribute is pulled from its vertex buffer. */
        get frequency(): int64
        set frequency(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRDVertexAttribute;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRDVertexAttribute;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRandomNumberGenerator extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRandomNumberGenerator extends __NameMapRefCounted {
        randf_range: "randfRange";
        randi_range: "randiRange";
        rand_weighted: "randWeighted";
    }
    /** Provides methods for generating pseudo-random numbers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_randomnumbergenerator.html  
     */
    class RandomNumberGenerator extends RefCounted {
        constructor(identifier?: any)
        /** Returns a pseudo-random 32-bit unsigned integer between `0` and `4294967295` (inclusive). */
        randi(): int64
        
        /** Returns a pseudo-random float between `0.0` and `1.0` (inclusive). */
        randf(): float64
        
        /** Returns a [url=https://en.wikipedia.org/wiki/Normal_distribution]normally-distributed[/url], pseudo-random floating-point number from the specified [param mean] and a standard [param deviation]. This is also known as a Gaussian distribution.  
         *      
         *  **Note:** This method uses the [url=https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform]Box-Muller transform[/url] algorithm.  
         */
        randfn(mean?: float64 /* = 0 */, deviation?: float64 /* = 1 */): float64
        
        /** Returns a pseudo-random float between [param from] and [param to] (inclusive). */
        randfRange(from: float64, to: float64): float64
        
        /** Returns a pseudo-random 32-bit signed integer between [param from] and [param to] (inclusive). */
        randiRange(from: int64, to: int64): int64
        
        /** Returns a random integer between `0` and the size of the array that is passed as a parameter. Each value in the array should be a non-negative floating-point number that represents the relative likelihood that it will be returned as an index. A higher value means the value is more likely to be returned as an index, while a value of `0` means it will never be returned as an index.  
         *  For example, if [code skip-lint][0.5, 1, 1, 2]` is passed as a parameter, then the method is twice as likely to return `3` (the index of the value `2`) and twice as unlikely to return `0` (the index of the value `0.5`) compared to the indices `1` and `2`.  
         *  Prints an error and returns `-1` if the array is empty or contains any negative values.  
         *    
         */
        randWeighted(weights: PackedFloat32Array | float32[]): int64
        
        /** Sets up a time-based seed for this [RandomNumberGenerator] instance. Unlike the [@GlobalScope] random number generation functions, different [RandomNumberGenerator] instances can use different seeds. */
        randomize(): void
        
        /** Initializes the random number generator state based on the given seed value. A given seed will give a reproducible sequence of pseudo-random numbers.  
         *      
         *  **Note:** The RNG does not have an avalanche effect, and can output similar random streams given similar seeds. Consider using a hash function to improve your seed quality if they're sourced externally.  
         *      
         *  **Note:** The default value of this property is pseudo-random, and changes when calling [method randomize]. The `0` value documented here is a placeholder, and not the actual default seed.  
         *      
         *  **Note:** Setting this property produces a side effect of changing the internal [member state], so make sure to initialize the seed  *before*  modifying the [member state]:  
         *    
         */
        get seed(): int64
        set seed(value: int64)
        
        /** The current state of the random number generator. Save and restore this property to restore the generator to a previous state:  
         *    
         *      
         *  **Note:** Do not set state to arbitrary values, since the random number generator requires the state to have certain qualities to behave properly. It should only be set to values that came from the state property itself. To initialize the random number generator with arbitrary input, use [member seed] instead.  
         *      
         *  **Note:** The default value of this property is pseudo-random, and changes when calling [method randomize]. The `0` value documented here is a placeholder, and not the actual default state.  
         */
        get state(): int64
        set state(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRandomNumberGenerator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRandomNumberGenerator;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRange extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRange extends __NameMapControl {
        _value_changed: "_valueChanged";
        set_value_no_signal: "setValueNoSignal";
        min_value: "minValue";
        max_value: "maxValue";
        exp_edit: "expEdit";
        allow_greater: "allowGreater";
        allow_lesser: "allowLesser";
        value_changed: "valueChanged";
    }
    /** Abstract base class for controls that represent a number within a range.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_range.html  
     */
    class Range<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Called when the [Range]'s value is changed (following the same conditions as [signal value_changed]). */
        /* gdvirtual */ _valueChanged(newValue: float64): void
        
        /** Sets the [Range]'s current value to the specified [param value], without emitting the [signal value_changed] signal. */
        setValueNoSignal(value: float64): void
        
        /** Binds two [Range]s together along with any ranges previously grouped with either of them. When any of range's member variables change, it will share the new value with all other ranges in its group. */
        share(with_: Node): void
        
        /** Stops the [Range] from sharing its member variables with any other. */
        unshare(): void
        
        /** Minimum value. Range is clamped if [member value] is less than [member min_value]. */
        get minValue(): float64
        set minValue(value: float64)
        
        /** Maximum value. Range is clamped if [member value] is greater than [member max_value]. */
        get maxValue(): float64
        set maxValue(value: float64)
        
        /** If greater than `0.0`, [member value] will always be rounded to a multiple of this property's value above [member min_value]. For example, if [member min_value] is `0.1` and step is `0.2`, then [member value] is limited to `0.1`, `0.3`, `0.5`, and so on. If [member rounded] is also `true`, [member value] will first be rounded to a multiple of this property's value, then rounded to the nearest integer. */
        get step(): float64
        set step(value: float64)
        
        /** Page size. Used mainly for [ScrollBar]. A [ScrollBar]'s grabber length is the [ScrollBar]'s size multiplied by [member page] over the difference between [member min_value] and [member max_value]. */
        get page(): float64
        set page(value: float64)
        
        /** Range's current value. Changing this property (even via code) will trigger [signal value_changed] signal. Use [method set_value_no_signal] if you want to avoid it. */
        get value(): float64
        set value(value: float64)
        
        /** The value mapped between 0 and 1. */
        get ratio(): float64
        set ratio(value: float64)
        
        /** If `true`, and [member min_value] is greater or equal to `0`, [member value] will be represented exponentially rather than linearly. */
        get expEdit(): boolean
        set expEdit(value: boolean)
        
        /** If `true`, [member value] will always be rounded to the nearest integer. */
        get rounded(): boolean
        set rounded(value: boolean)
        
        /** If `true`, [member value] may be greater than [member max_value]. */
        get allowGreater(): boolean
        set allowGreater(value: boolean)
        
        /** If `true`, [member value] may be less than [member min_value]. */
        get allowLesser(): boolean
        set allowLesser(value: boolean)
        
        /** Emitted when [member value] changes. When used on a [Slider], this is called continuously while dragging (potentially every frame). If you are performing an expensive operation in a function connected to [signal value_changed], consider using a  *debouncing*  [Timer] to call the function less often.  
         *      
         *  **Note:** Unlike signals such as [signal LineEdit.text_changed], [signal value_changed] is also emitted when [param value] is set directly via code.  
         */
        readonly valueChanged: Signal<(value: float64) => void>
        
        /** Emitted when [member min_value], [member max_value], [member page], or [member step] change. */
        readonly changed: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRange;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRange;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRayCast2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRayCast2D extends __NameMapNode2D {
        is_colliding: "isColliding";
        force_raycast_update: "forceRaycastUpdate";
        get_collider: "getCollider";
        get_collider_rid: "getColliderRid";
        get_collider_shape: "getColliderShape";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        add_exception_rid: "addExceptionRid";
        add_exception: "addException";
        remove_exception_rid: "removeExceptionRid";
        remove_exception: "removeException";
        clear_exceptions: "clearExceptions";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        exclude_parent: "excludeParent";
        target_position: "targetPosition";
        collision_mask: "collisionMask";
        hit_from_inside: "hitFromInside";
        collide_with_areas: "collideWithAreas";
        collide_with_bodies: "collideWithBodies";
    }
    /** A ray in 2D space, used to find the first collision object it intersects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_raycast2d.html  
     */
    class RayCast2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns whether any object is intersecting with the ray's vector (considering the vector length). */
        isColliding(): boolean
        
        /** Updates the collision information for the ray immediately, without waiting for the next `_physics_process` call. Use this method, for example, when the ray or its parent has changed state.  
         *      
         *  **Note:** [member enabled] does not need to be `true` for this to work.  
         */
        forceRaycastUpdate(): void
        
        /** Returns the first object that the ray intersects, or `null` if no object is intersecting the ray (i.e. [method is_colliding] returns `false`).  
         *      
         *  **Note:** This object is not guaranteed to be a [CollisionObject2D]. For example, if the ray intersects a [TileMapLayer], the method will return a [TileMapLayer] instance.  
         */
        getCollider(): null | GObject
        
        /** Returns the [RID] of the first object that the ray intersects, or an empty [RID] if no object is intersecting the ray (i.e. [method is_colliding] returns `false`). */
        getColliderRid(): Rid
        
        /** Returns the shape ID of the first object that the ray intersects, or `0` if no object is intersecting the ray (i.e. [method is_colliding] returns `false`).  
         *  To get the intersected shape node, for a [CollisionObject2D] target, use:  
         *    
         */
        getColliderShape(): int64
        
        /** Returns the collision point at which the ray intersects the closest object, in the global coordinate system. If [member hit_from_inside] is `true` and the ray starts inside of a collision shape, this function will return the origin point of the ray.  
         *      
         *  **Note:** Check that [method is_colliding] returns `true` before calling this method to ensure the returned point is valid and up-to-date.  
         */
        getCollisionPoint(): Vector2
        
        /** Returns the normal of the intersecting object's shape at the collision point, or `Vector2(0, 0)` if the ray starts inside the shape and [member hit_from_inside] is `true`.  
         *      
         *  **Note:** Check that [method is_colliding] returns `true` before calling this method to ensure the returned normal is valid and up-to-date.  
         */
        getCollisionNormal(): Vector2
        
        /** Adds a collision exception so the ray does not report collisions with the specified [RID]. */
        addExceptionRid(rid: Rid): void
        
        /** Adds a collision exception so the ray does not report collisions with the specified [param node]. */
        addException(node: CollisionObject2D): void
        
        /** Removes a collision exception so the ray can report collisions with the specified [RID]. */
        removeExceptionRid(rid: Rid): void
        
        /** Removes a collision exception so the ray can report collisions with the specified [param node]. */
        removeException(node: CollisionObject2D): void
        
        /** Removes all collision exceptions for this ray. */
        clearExceptions(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** If `true`, collisions will be reported. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** If `true`, this raycast will not report collisions with its parent node. This property only has an effect if the parent node is a [CollisionObject2D]. See also [method Node.get_parent] and [method add_exception]. */
        get excludeParent(): boolean
        set excludeParent(value: boolean)
        
        /** The ray's destination point, relative to this raycast's [member Node2D.position]. */
        get targetPosition(): Vector2
        set targetPosition(value: Vector2)
        
        /** The ray's collision mask. Only objects in at least one collision layer enabled in the mask will be detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** If `true`, the ray will detect a hit when starting inside shapes. In this case the collision normal will be `Vector2(0, 0)`. Does not affect concave polygon shapes. */
        get hitFromInside(): boolean
        set hitFromInside(value: boolean)
        
        /** If `true`, collisions with [Area2D]s will be reported. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, collisions with [PhysicsBody2D]s will be reported. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRayCast2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRayCast2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRayCast3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRayCast3D extends __NameMapNode3D {
        is_colliding: "isColliding";
        force_raycast_update: "forceRaycastUpdate";
        get_collider: "getCollider";
        get_collider_rid: "getColliderRid";
        get_collider_shape: "getColliderShape";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        get_collision_face_index: "getCollisionFaceIndex";
        add_exception_rid: "addExceptionRid";
        add_exception: "addException";
        remove_exception_rid: "removeExceptionRid";
        remove_exception: "removeException";
        clear_exceptions: "clearExceptions";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        exclude_parent: "excludeParent";
        target_position: "targetPosition";
        collision_mask: "collisionMask";
        hit_from_inside: "hitFromInside";
        hit_back_faces: "hitBackFaces";
        collide_with_areas: "collideWithAreas";
        collide_with_bodies: "collideWithBodies";
        debug_shape_custom_color: "debugShapeCustomColor";
        debug_shape_thickness: "debugShapeThickness";
    }
    /** A ray in 3D space, used to find the first collision object it intersects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_raycast3d.html  
     */
    class RayCast3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns whether any object is intersecting with the ray's vector (considering the vector length). */
        isColliding(): boolean
        
        /** Updates the collision information for the ray immediately, without waiting for the next `_physics_process` call. Use this method, for example, when the ray or its parent has changed state.  
         *      
         *  **Note:** [member enabled] does not need to be `true` for this to work.  
         */
        forceRaycastUpdate(): void
        
        /** Returns the first object that the ray intersects, or `null` if no object is intersecting the ray (i.e. [method is_colliding] returns `false`).  
         *      
         *  **Note:** This object is not guaranteed to be a [CollisionObject3D]. For example, if the ray intersects a [CSGShape3D] or a [GridMap], the method will return a [CSGShape3D] or [GridMap] instance.  
         */
        getCollider(): null | GObject
        
        /** Returns the [RID] of the first object that the ray intersects, or an empty [RID] if no object is intersecting the ray (i.e. [method is_colliding] returns `false`). */
        getColliderRid(): Rid
        
        /** Returns the shape ID of the first object that the ray intersects, or `0` if no object is intersecting the ray (i.e. [method is_colliding] returns `false`).  
         *  To get the intersected shape node, for a [CollisionObject3D] target, use:  
         *    
         */
        getColliderShape(): int64
        
        /** Returns the collision point at which the ray intersects the closest object, in the global coordinate system. If [member hit_from_inside] is `true` and the ray starts inside of a collision shape, this function will return the origin point of the ray.  
         *      
         *  **Note:** Check that [method is_colliding] returns `true` before calling this method to ensure the returned point is valid and up-to-date.  
         */
        getCollisionPoint(): Vector3
        
        /** Returns the normal of the intersecting object's shape at the collision point, or `Vector3(0, 0, 0)` if the ray starts inside the shape and [member hit_from_inside] is `true`.  
         *      
         *  **Note:** Check that [method is_colliding] returns `true` before calling this method to ensure the returned normal is valid and up-to-date.  
         */
        getCollisionNormal(): Vector3
        
        /** Returns the collision object's face index at the collision point, or `-1` if the shape intersecting the ray is not a [ConcavePolygonShape3D]. */
        getCollisionFaceIndex(): int64
        
        /** Adds a collision exception so the ray does not report collisions with the specified [RID]. */
        addExceptionRid(rid: Rid): void
        
        /** Adds a collision exception so the ray does not report collisions with the specified [param node]. */
        addException(node: CollisionObject3D): void
        
        /** Removes a collision exception so the ray can report collisions with the specified [RID]. */
        removeExceptionRid(rid: Rid): void
        
        /** Removes a collision exception so the ray can report collisions with the specified [param node]. */
        removeException(node: CollisionObject3D): void
        
        /** Removes all collision exceptions for this ray. */
        clearExceptions(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** If `true`, collisions will be reported. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** If `true`, this raycast will not report collisions with its parent node. This property only has an effect if the parent node is a [CollisionObject3D]. See also [method Node.get_parent] and [method add_exception]. */
        get excludeParent(): boolean
        set excludeParent(value: boolean)
        
        /** The ray's destination point, relative to this raycast's [member Node3D.position]. */
        get targetPosition(): Vector3
        set targetPosition(value: Vector3)
        
        /** The ray's collision mask. Only objects in at least one collision layer enabled in the mask will be detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** If `true`, the ray will detect a hit when starting inside shapes. In this case the collision normal will be `Vector3(0, 0, 0)`. Does not affect shapes with no volume like concave polygon or heightmap. */
        get hitFromInside(): boolean
        set hitFromInside(value: boolean)
        
        /** If `true`, the ray will hit back faces with concave polygon shapes with back face enabled or heightmap shapes. */
        get hitBackFaces(): boolean
        set hitBackFaces(value: boolean)
        
        /** If `true`, collisions with [Area3D]s will be reported. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, collisions with [PhysicsBody3D]s will be reported. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** The custom color to use to draw the shape in the editor and at run-time if **Visible Collision Shapes** is enabled in the **Debug** menu. This color will be highlighted at run-time if the [RayCast3D] is colliding with something.  
         *  If set to `Color(0.0, 0.0, 0.0)` (by default), the color set in [member ProjectSettings.debug/shapes/collision/shape_color] is used.  
         */
        get debugShapeCustomColor(): Color
        set debugShapeCustomColor(value: Color)
        
        /** If set to `1`, a line is used as the debug shape. Otherwise, a truncated pyramid is drawn to represent the [RayCast3D]. Requires **Visible Collision Shapes** to be enabled in the **Debug** menu for the debug shape to be visible at run-time. */
        get debugShapeThickness(): int64
        set debugShapeThickness(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRayCast3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRayCast3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapReactUiRoot extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapReactUiRoot extends __NameMapControl {
        take_commit_deletions: "takeCommitDeletions";
        set_profiling: "setProfiling";
        get_activity: "getActivity";
        take_profile: "takeProfile";
        get_snapshot: "getSnapshot";
        get_node_rect: "getNodeRect";
        find_by_test_id: "findByTestId";
        drain_events: "drainEvents";
        resolve_event: "resolveEvent";
        events_ready: "eventsReady";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_reactuiroot.html */
    class ReactUiRoot<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        commit(layer: int64, payloadJson: string): string
        takeCommitDeletions(): PackedInt64Array
        setProfiling(enabled: boolean): any
        getActivity(): string
        takeProfile(): string
        getSnapshot(): string
        getNodeRect(tag: int64): string
        findByTestId(testId: string): int64
        drainEvents(): string
        resolveEvent(seq: int64, defaultPrevented: boolean, dropEffect: string): string
        readonly eventsReady: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapReactUiRoot;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapReactUiRoot;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRectangleShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRectangleShape2D extends __NameMapShape2D {
    }
    /** A 2D rectangle shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rectangleshape2d.html  
     */
    class RectangleShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The rectangle's width and height. */
        get size(): Vector2
        set size(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRectangleShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRectangleShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRefCounted extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRefCounted extends __NameMapGObject {
        init_ref: "initRef";
        get_reference_count: "getReferenceCount";
    }
    /** Base class for reference-counted objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_refcounted.html  
     */
    class RefCounted extends GObject {
        constructor(identifier?: any)
        /** Initializes the internal reference counter. Use this only if you really know what you are doing.  
         *  Returns whether the initialization was successful.  
         */
        initRef(): boolean
        
        /** Increments the internal reference counter. Use this only if you really know what you are doing.  
         *  Returns `true` if the increment was successful, `false` otherwise.  
         */
        reference(): boolean
        
        /** Decrements the internal reference counter. Use this only if you really know what you are doing.  
         *  Returns `true` if the object should be freed after the decrement, `false` otherwise.  
         */
        unreference(): boolean
        
        /** Returns the current reference count. */
        getReferenceCount(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRefCounted;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRefCounted;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapReferenceRect extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapReferenceRect extends __NameMapControl {
        border_color: "borderColor";
        border_width: "borderWidth";
        editor_only: "editorOnly";
    }
    /** A rectangular box for designing UIs.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_referencerect.html  
     */
    class ReferenceRect<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Sets the border color of the [ReferenceRect]. */
        get borderColor(): Color
        set borderColor(value: Color)
        
        /** Sets the border width of the [ReferenceRect]. The border grows both inwards and outwards with respect to the rectangle box. */
        get borderWidth(): float64
        set borderWidth(value: float64)
        
        /** If `true`, the [ReferenceRect] will only be visible while in editor. Otherwise, [ReferenceRect] will be visible in the running project. */
        get editorOnly(): boolean
        set editorOnly(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapReferenceRect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapReferenceRect;
    }
    namespace ReflectionProbe {
        enum UpdateMode {
            UpdateOnce = 0,
            UpdateAlways = 1,
        }
        enum AmbientMode {
            AmbientDisabled = 0,
            AmbientEnvironment = 1,
            AmbientColor = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapReflectionProbe extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapReflectionProbe extends __NameMapVisualInstance3D {
        update_mode: "updateMode";
        blend_distance: "blendDistance";
        max_distance: "maxDistance";
        origin_offset: "originOffset";
        box_projection: "boxProjection";
        enable_shadows: "enableShadows";
        cull_mask: "cullMask";
        reflection_mask: "reflectionMask";
        mesh_lod_threshold: "meshLodThreshold";
        ambient_mode: "ambientMode";
        ambient_color: "ambientColor";
        ambient_color_energy: "ambientColorEnergy";
    }
    /** Captures its surroundings to create fast, accurate reflections from a given point.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_reflectionprobe.html  
     */
    class ReflectionProbe<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** Sets how frequently the [ReflectionProbe] is updated. Can be [constant UPDATE_ONCE] or [constant UPDATE_ALWAYS]. */
        get updateMode(): int64
        set updateMode(value: int64)
        
        /** Defines the reflection intensity. Intensity modulates the strength of the reflection. */
        get intensity(): float64
        set intensity(value: float64)
        
        /** Defines the distance in meters over which a probe blends into the scene. */
        get blendDistance(): float64
        set blendDistance(value: float64)
        
        /** The maximum distance away from the [ReflectionProbe] an object can be before it is culled. Decrease this to improve performance, especially when using the [constant UPDATE_ALWAYS] [member update_mode].  
         *      
         *  **Note:** The maximum reflection distance is always at least equal to the probe's extents. This means that decreasing [member max_distance] will not always cull objects from reflections, especially if the reflection probe's box defined by its [member size] is already large.  
         */
        get maxDistance(): float64
        set maxDistance(value: float64)
        
        /** The size of the reflection probe. The larger the size, the more space covered by the probe, which will lower the perceived resolution. It is best to keep the size only as large as you need it.  
         *      
         *  **Note:** To better fit areas that are not aligned to the grid, you can rotate the [ReflectionProbe] node.  
         */
        get size(): Vector3
        set size(value: Vector3)
        
        /** Sets the origin offset to be used when this [ReflectionProbe] is in [member box_projection] mode. This can be set to a non-zero value to ensure a reflection fits a rectangle-shaped room, while reducing the number of objects that "get in the way" of the reflection. */
        get originOffset(): Vector3
        set originOffset(value: Vector3)
        
        /** If `true`, enables box projection. This makes reflections look more correct in rectangle-shaped rooms by offsetting the reflection center depending on the camera's location.  
         *      
         *  **Note:** To better fit rectangle-shaped rooms that are not aligned to the grid, you can rotate the [ReflectionProbe] node.  
         */
        get boxProjection(): boolean
        set boxProjection(value: boolean)
        
        /** If `true`, reflections will ignore sky contribution. */
        get interior(): boolean
        set interior(value: boolean)
        
        /** If `true`, computes shadows in the reflection probe. This makes the reflection probe slower to render; you may want to disable this if using the [constant UPDATE_ALWAYS] [member update_mode]. */
        get enableShadows(): boolean
        set enableShadows(value: boolean)
        
        /** Sets the cull mask which determines what objects are drawn by this probe. Every [VisualInstance3D] with a layer included in this cull mask will be rendered by the probe. It is best to only include large objects which are likely to take up a lot of space in the reflection in order to save on rendering cost.  
         *  This can also be used to prevent an object from reflecting upon itself (for instance, a [ReflectionProbe] centered on a vehicle).  
         */
        get cullMask(): int64
        set cullMask(value: int64)
        
        /** Sets the reflection mask which determines what objects have reflections applied from this probe. Every [VisualInstance3D] with a layer included in this reflection mask will have reflections applied from this probe. See also [member cull_mask], which can be used to exclude objects from appearing in the reflection while still making them affected by the [ReflectionProbe]. */
        get reflectionMask(): int64
        set reflectionMask(value: int64)
        
        /** The automatic LOD bias to use for meshes rendered within the [ReflectionProbe] (this is analog to [member Viewport.mesh_lod_threshold]). Higher values will use less detailed versions of meshes that have LOD variations generated. If set to `0.0`, automatic LOD is disabled. Increase [member mesh_lod_threshold] to improve performance at the cost of geometry detail, especially when using the [constant UPDATE_ALWAYS] [member update_mode].  
         *      
         *  **Note:** [member mesh_lod_threshold] does not affect [GeometryInstance3D] visibility ranges (also known as "manual" LOD or hierarchical LOD).  
         */
        get meshLodThreshold(): float64
        set meshLodThreshold(value: float64)
        
        /** The ambient color to use within the [ReflectionProbe]'s box defined by its [member size]. The ambient color will smoothly blend with other [ReflectionProbe]s and the rest of the scene (outside the [ReflectionProbe]'s box defined by its [member size]). */
        get ambientMode(): int64
        set ambientMode(value: int64)
        
        /** The custom ambient color to use within the [ReflectionProbe]'s box defined by its [member size]. Only effective if [member ambient_mode] is [constant AMBIENT_COLOR]. */
        get ambientColor(): Color
        set ambientColor(value: Color)
        
        /** The custom ambient color energy to use within the [ReflectionProbe]'s box defined by its [member size]. Only effective if [member ambient_mode] is [constant AMBIENT_COLOR]. */
        get ambientColorEnergy(): float64
        set ambientColorEnergy(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapReflectionProbe;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapReflectionProbe;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRegEx extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRegEx extends __NameMapRefCounted {
        create_from_string: "createFromString";
        search_all: "searchAll";
        is_valid: "isValid";
        get_pattern: "getPattern";
        get_group_count: "getGroupCount";
        get_names: "getNames";
    }
    /** Class for searching text for patterns using regular expressions.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_regex.html  
     */
    class RegEx extends RefCounted {
        constructor(identifier?: any)
        /** Creates and compiles a new [RegEx] object. See also [method compile]. */
        static createFromString(pattern: string, showError?: boolean /* = true */): RegEx
        
        /** This method resets the state of the object, as if it was freshly created. Namely, it unassigns the regular expression of this object. */
        clear(): void
        
        /** Compiles and assign the search pattern to use. Returns [constant OK] if the compilation is successful. If compilation fails, returns [constant FAILED] and when [param show_error] is `true`, details are printed to standard output. */
        compile(pattern: string, showError?: boolean /* = true */): GError
        
        /** Searches the text for the compiled pattern. Returns a [RegExMatch] container of the first matching result if found, otherwise `null`.  
         *  The region to search within can be specified with [param offset] and [param end]. This is useful when searching for another match in the same [param subject] by calling this method again after a previous success. Note that setting these parameters differs from passing over a shortened string. For example, the start anchor `^` is not affected by [param offset], and the character before [param offset] will be checked for the word boundary `\b`.  
         */
        search(subject: string, offset?: int64 /* = 0 */, end?: int64 /* = -1 */): null | RegExMatch
        
        /** Searches the text for the compiled pattern. Returns an array of [RegExMatch] containers for each non-overlapping result. If no results were found, an empty array is returned instead.  
         *  The region to search within can be specified with [param offset] and [param end]. This is useful when searching for another match in the same [param subject] by calling this method again after a previous success. Note that setting these parameters differs from passing over a shortened string. For example, the start anchor `^` is not affected by [param offset], and the character before [param offset] will be checked for the word boundary `\b`.  
         */
        searchAll(subject: string, offset?: int64 /* = 0 */, end?: int64 /* = -1 */): GArray<RegExMatch>
        
        /** Searches the text for the compiled pattern and replaces it with the specified string. Escapes and backreferences such as `$1` and `$name` are expanded and resolved. By default, only the first instance is replaced, but it can be changed for all instances (global replacement).  
         *  The region to search within can be specified with [param offset] and [param end]. This is useful when searching for another match in the same [param subject] by calling this method again after a previous success. Note that setting these parameters differs from passing over a shortened string. For example, the start anchor `^` is not affected by [param offset], and the character before [param offset] will be checked for the word boundary `\b`.  
         */
        sub(subject: string, replacement: string, all?: boolean /* = false */, offset?: int64 /* = 0 */, end?: int64 /* = -1 */): string
        
        /** Returns whether this object has a valid search pattern assigned. */
        isValid(): boolean
        
        /** Returns the original search pattern that was compiled. */
        getPattern(): string
        
        /** Returns the number of capturing groups in compiled pattern. */
        getGroupCount(): int64
        
        /** Returns an array of names of named capturing groups in the compiled pattern. They are ordered by appearance. */
        getNames(): PackedStringArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRegEx;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRegEx;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRegExMatch extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRegExMatch extends __NameMapRefCounted {
        get_group_count: "getGroupCount";
        get_string: "getString";
        get_start: "getStart";
        get_end: "getEnd";
    }
    /** Contains the results of a [RegEx] search.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_regexmatch.html  
     */
    class RegExMatch extends RefCounted {
        constructor(identifier?: any)
        /** Returns the number of capturing groups. */
        getGroupCount(): int64
        
        /** Returns the substring of the match from the source string. Capturing groups can be retrieved by providing its group number as an integer or its string name (if it's a named group). The default value of 0 refers to the whole pattern.  
         *  Returns an empty string if the group did not match or doesn't exist.  
         */
        getString(name?: any /* = {} */): string
        
        /** Returns the starting position of the match within the source string. The starting position of capturing groups can be retrieved by providing its group number as an integer or its string name (if it's a named group). The default value of 0 refers to the whole pattern.  
         *  Returns -1 if the group did not match or doesn't exist.  
         */
        getStart(name?: any /* = {} */): int64
        
        /** Returns the end position of the match within the source string. The end position of capturing groups can be retrieved by providing its group number as an integer or its string name (if it's a named group). The default value of 0 refers to the whole pattern.  
         *  Returns -1 if the group did not match or doesn't exist.  
         */
        getEnd(name?: any /* = {} */): int64
        
        /** The source string used with the search pattern to find this matching result. */
        get subject(): string
        
        /** A dictionary of named groups and its corresponding group number. Only groups that were matched are included. If multiple groups have the same name, that name would refer to the first matching one. */
        get names(): GDictionary
        
        /** An [Array] of the match and its capturing groups. */
        get strings(): GArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRegExMatch;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRegExMatch;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRemoteTransform2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRemoteTransform2D extends __NameMapNode2D {
        force_update_cache: "forceUpdateCache";
        remote_path: "remotePath";
        use_global_coordinates: "useGlobalCoordinates";
        update_position: "updatePosition";
        update_rotation: "updateRotation";
        update_scale: "updateScale";
    }
    /** RemoteTransform2D pushes its own [Transform2D] to another [Node2D] derived node in the scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_remotetransform2d.html  
     */
    class RemoteTransform2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** [RemoteTransform2D] caches the remote node. It may not notice if the remote node disappears; [method force_update_cache] forces it to update the cache again. */
        forceUpdateCache(): void
        
        /** The [NodePath] to the remote node, relative to the RemoteTransform2D's position in the scene. */
        get remotePath(): NodePath
        set remotePath(value: NodePath | string)
        
        /** If `true`, global coordinates are used. If `false`, local coordinates are used. */
        get useGlobalCoordinates(): boolean
        set useGlobalCoordinates(value: boolean)
        
        /** If `true`, the remote node's position is updated. */
        get updatePosition(): boolean
        set updatePosition(value: boolean)
        
        /** If `true`, the remote node's rotation is updated. */
        get updateRotation(): boolean
        set updateRotation(value: boolean)
        
        /** If `true`, the remote node's scale is updated. */
        get updateScale(): boolean
        set updateScale(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRemoteTransform2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRemoteTransform2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRemoteTransform3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRemoteTransform3D extends __NameMapNode3D {
        force_update_cache: "forceUpdateCache";
        remote_path: "remotePath";
        use_global_coordinates: "useGlobalCoordinates";
        update_position: "updatePosition";
        update_rotation: "updateRotation";
        update_scale: "updateScale";
    }
    /** RemoteTransform3D pushes its own [Transform3D] to another [Node3D] derived Node in the scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_remotetransform3d.html  
     */
    class RemoteTransform3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** [RemoteTransform3D] caches the remote node. It may not notice if the remote node disappears; [method force_update_cache] forces it to update the cache again. */
        forceUpdateCache(): void
        
        /** The [NodePath] to the remote node, relative to the RemoteTransform3D's position in the scene. */
        get remotePath(): NodePath
        set remotePath(value: NodePath | string)
        
        /** If `true`, global coordinates are used. If `false`, local coordinates are used. */
        get useGlobalCoordinates(): boolean
        set useGlobalCoordinates(value: boolean)
        
        /** If `true`, the remote node's position is updated. */
        get updatePosition(): boolean
        set updatePosition(value: boolean)
        
        /** If `true`, the remote node's rotation is updated. */
        get updateRotation(): boolean
        set updateRotation(value: boolean)
        
        /** If `true`, the remote node's scale is updated. */
        get updateScale(): boolean
        set updateScale(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRemoteTransform3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRemoteTransform3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderData extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderData extends __NameMapGObject {
        get_render_scene_buffers: "getRenderSceneBuffers";
        get_render_scene_data: "getRenderSceneData";
        get_environment: "getEnvironment";
        get_camera_attributes: "getCameraAttributes";
    }
    /** Abstract render data object, holds frame data related to rendering a single frame of a viewport.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderdata.html  
     */
    class RenderData extends GObject {
        constructor(identifier?: any)
        /** Returns the [RenderSceneBuffers] object managing the scene buffers for rendering this viewport. */
        getRenderSceneBuffers(): null | RenderSceneBuffers
        
        /** Returns the [RenderSceneData] object managing this frames scene data. */
        getRenderSceneData(): null | RenderSceneData
        
        /** Returns the [RID] of the environment object in the [RenderingServer] being used to render this viewport. */
        getEnvironment(): Rid
        
        /** Returns the [RID] of the camera attributes object in the [RenderingServer] being used to render this viewport. */
        getCameraAttributes(): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderData;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderDataExtension extends __RPCMapRenderData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderDataExtension extends __NameMapRenderData {
        _get_render_scene_buffers: "_getRenderSceneBuffers";
        _get_render_scene_data: "_getRenderSceneData";
        _get_environment: "_getEnvironment";
        _get_camera_attributes: "_getCameraAttributes";
    }
    /** This class allows for a RenderData implementation to be made in GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderdataextension.html  
     */
    class RenderDataExtension extends RenderData {
        constructor(identifier?: any)
        /** Implement this in GDExtension to return the implementation's [RenderSceneBuffers] object. */
        /* gdvirtual */ _getRenderSceneBuffers(): null | RenderSceneBuffers
        
        /** Implement this in GDExtension to return the implementation's [RenderSceneDataExtension] object. */
        /* gdvirtual */ _getRenderSceneData(): null | RenderSceneData
        
        /** Implement this in GDExtension to return the [RID] of the implementation's environment object. */
        /* gdvirtual */ _getEnvironment(): Rid
        
        /** Implement this in GDExtension to return the [RID] for the implementation's camera attributes object. */
        /* gdvirtual */ _getCameraAttributes(): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderDataExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderDataExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderDataRD extends __RPCMapRenderData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderDataRD extends __NameMapRenderData {
    }
    /** Render data implementation for the RenderingDevice based renderers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderdatard.html  
     */
    class RenderDataRD extends RenderData {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderDataRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderDataRD;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneBuffers extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneBuffers extends __NameMapRefCounted {
    }
    /** Abstract scene buffers object, created for each viewport for which 3D rendering is done.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenebuffers.html  
     */
    class RenderSceneBuffers extends RefCounted {
        constructor(identifier?: any)
        /** This method is called by the rendering server when the associated viewport's configuration is changed. It will discard the old buffers and recreate the internal buffers used. */
        configure(config: RenderSceneBuffersConfiguration): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneBuffers;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneBuffers;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneBuffersConfiguration extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneBuffersConfiguration extends __NameMapRefCounted {
        render_target: "renderTarget";
        internal_size: "internalSize";
        target_size: "targetSize";
        view_count: "viewCount";
        scaling_3d_mode: "scaling3DMode";
        msaa_3d: "msaa3D";
        screen_space_aa: "screenSpaceAA";
        fsr_sharpness: "fsrSharpness";
        texture_mipmap_bias: "textureMipmapBias";
        anisotropic_filtering_level: "anisotropicFilteringLevel";
    }
    /** Configuration object used to setup a [RenderSceneBuffers] object.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenebuffersconfiguration.html  
     */
    class RenderSceneBuffersConfiguration extends RefCounted {
        constructor(identifier?: any)
        /** The render target associated with these buffer. */
        get renderTarget(): Rid
        set renderTarget(value: Rid)
        
        /** The size of the 3D render buffer used for rendering. */
        get internalSize(): Vector2I
        set internalSize(value: Vector2I)
        
        /** The target (upscale) size if scaling is used. */
        get targetSize(): Vector2I
        set targetSize(value: Vector2I)
        
        /** The number of views we're rendering. */
        get viewCount(): int64
        set viewCount(value: int64)
        
        /** The requested scaling mode with which we upscale/downscale if [member internal_size] and [member target_size] are not equal. */
        get scaling3DMode(): int64
        set scaling3DMode(value: int64)
        
        /** The MSAA mode we're using for 3D rendering. */
        get msaa3D(): int64
        set msaa3D(value: int64)
        
        /** The requested screen space AA applied in post processing. */
        get screenSpaceAA(): int64
        set screenSpaceAA(value: int64)
        
        /** FSR Sharpness applicable if FSR upscaling is used. */
        get fsrSharpness(): boolean
        set fsrSharpness(value: boolean)
        
        /** Bias applied to mipmaps.  
         *      
         *  **Note:** This property is only supported in the Forward+ and Mobile renderers, not Compatibility. In Compatibility, this property is always treated as if it was set to `0.0`.  
         */
        get textureMipmapBias(): boolean
        set textureMipmapBias(value: boolean)
        
        /** Level of the anisotropic filter. */
        get anisotropicFilteringLevel(): int64
        set anisotropicFilteringLevel(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneBuffersConfiguration;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneBuffersConfiguration;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneBuffersExtension extends __RPCMapRenderSceneBuffers {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneBuffersExtension extends __NameMapRenderSceneBuffers {
        _set_fsr_sharpness: "_setFsrSharpness";
        _set_texture_mipmap_bias: "_setTextureMipmapBias";
        _set_anisotropic_filtering_level: "_setAnisotropicFilteringLevel";
        _set_use_debanding: "_setUseDebanding";
    }
    /** This class allows for a RenderSceneBuffer implementation to be made in GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenebuffersextension.html  
     */
    class RenderSceneBuffersExtension extends RenderSceneBuffers {
        constructor(identifier?: any)
        /** Implement this in GDExtension to handle the (re)sizing of a viewport. */
        /* gdvirtual */ _configure(config: RenderSceneBuffersConfiguration): void
        
        /** Implement this in GDExtension to record a new FSR sharpness value. */
        /* gdvirtual */ _setFsrSharpness(fsrSharpness: float64): void
        
        /** Implement this in GDExtension to change the texture mipmap bias. */
        /* gdvirtual */ _setTextureMipmapBias(textureMipmapBias: float64): void
        
        /** Implement this in GDExtension to change the anisotropic filtering level. */
        /* gdvirtual */ _setAnisotropicFilteringLevel(anisotropicFilteringLevel: int64): void
        
        /** Implement this in GDExtension to react to the debanding flag changing. */
        /* gdvirtual */ _setUseDebanding(useDebanding: boolean): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneBuffersExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneBuffersExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneBuffersRD extends __RPCMapRenderSceneBuffers {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneBuffersRD extends __NameMapRenderSceneBuffers {
        has_texture: "hasTexture";
        create_texture: "createTexture";
        create_texture_from_format: "createTextureFromFormat";
        create_texture_view: "createTextureView";
        get_texture: "getTexture";
        get_texture_format: "getTextureFormat";
        get_texture_slice: "getTextureSlice";
        get_texture_slice_view: "getTextureSliceView";
        get_texture_slice_size: "getTextureSliceSize";
        clear_context: "clearContext";
        get_color_texture: "getColorTexture";
        get_color_layer: "getColorLayer";
        get_depth_texture: "getDepthTexture";
        get_depth_layer: "getDepthLayer";
        get_velocity_texture: "getVelocityTexture";
        get_velocity_layer: "getVelocityLayer";
        get_render_target: "getRenderTarget";
        get_view_count: "getViewCount";
        get_internal_size: "getInternalSize";
        get_target_size: "getTargetSize";
        get_scaling_3d_mode: "getScaling3DMode";
        get_fsr_sharpness: "getFsrSharpness";
        get_msaa_3d: "getMsaa3D";
        get_texture_samples: "getTextureSamples";
        get_screen_space_aa: "getScreenSpaceAA";
        get_use_taa: "getUseTaa";
        get_use_debanding: "getUseDebanding";
    }
    /** Render scene buffer implementation for the RenderingDevice based renderers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenebuffersrd.html  
     */
    class RenderSceneBuffersRD extends RenderSceneBuffers {
        constructor(identifier?: any)
        /** Returns `true` if a cached texture exists for this name. */
        hasTexture(context: StringName, name: StringName): boolean
        
        /** Create a new texture with the given definition and cache this under the given name. Will return the existing texture if it already exists. */
        createTexture(context: StringName, name: StringName, dataFormat: RenderingDevice.DataFormat, usageBits: int64, textureSamples: RenderingDevice.TextureSamples, size: Vector2I, layers: int64, mipmaps: int64, unique: boolean, discardable: boolean): Rid
        
        /** Create a new texture using the given format and view and cache this under the given name. Will return the existing texture if it already exists. */
        createTextureFromFormat(context: StringName, name: StringName, format: RDTextureFormat, view: RDTextureView, unique: boolean): Rid
        
        /** Create a new texture view for an existing texture and cache this under the given [param view_name]. Will return the existing texture view if it already exists. Will error if the source texture doesn't exist. */
        createTextureView(context: StringName, name: StringName, viewName: StringName, view: RDTextureView): Rid
        
        /** Returns a cached texture with this name. */
        getTexture(context: StringName, name: StringName): Rid
        
        /** Returns the texture format information with which a cached texture was created. */
        getTextureFormat(context: StringName, name: StringName): null | RDTextureFormat
        
        /** Returns a specific slice (layer or mipmap) for a cached texture. */
        getTextureSlice(context: StringName, name: StringName, layer: int64, mipmap: int64, layers: int64, mipmaps: int64): Rid
        
        /** Returns a specific view of a slice (layer or mipmap) for a cached texture. */
        getTextureSliceView(context: StringName, name: StringName, layer: int64, mipmap: int64, layers: int64, mipmaps: int64, view: RDTextureView): Rid
        
        /** Returns the texture size of a given slice of a cached texture. */
        getTextureSliceSize(context: StringName, name: StringName, mipmap: int64): Vector2I
        
        /** Frees all buffers related to this context. */
        clearContext(context: StringName): void
        
        /** Returns the color texture we are rendering 3D content to. If multiview is used this will be a texture array with all views.  
         *  If [param msaa] is `true` and MSAA is enabled, this returns the MSAA variant of the buffer.  
         */
        getColorTexture(msaa?: boolean /* = false */): Rid
        
        /** Returns the specified layer from the color texture we are rendering 3D content to.  
         *  If [param msaa] is `true` and MSAA is enabled, this returns the MSAA variant of the buffer.  
         */
        getColorLayer(layer: int64, msaa?: boolean /* = false */): Rid
        
        /** Returns the depth texture we are rendering 3D content to. If multiview is used this will be a texture array with all views.  
         *  If [param msaa] is `true` and MSAA is enabled, this returns the MSAA variant of the buffer.  
         */
        getDepthTexture(msaa?: boolean /* = false */): Rid
        
        /** Returns the specified layer from the depth texture we are rendering 3D content to.  
         *  If [param msaa] is `true` and MSAA is enabled, this returns the MSAA variant of the buffer.  
         */
        getDepthLayer(layer: int64, msaa?: boolean /* = false */): Rid
        
        /** Returns the velocity texture we are rendering 3D content to. If multiview is used this will be a texture array with all views.  
         *  If [param msaa] is **true** and MSAA is enabled, this returns the MSAA variant of the buffer.  
         */
        getVelocityTexture(msaa?: boolean /* = false */): Rid
        
        /** Returns the specified layer from the velocity texture we are rendering 3D content to. */
        getVelocityLayer(layer: int64, msaa?: boolean /* = false */): Rid
        
        /** Returns the render target associated with this buffers object. */
        getRenderTarget(): Rid
        
        /** Returns the view count for the associated viewport. */
        getViewCount(): int64
        
        /** Returns the internal size of the render buffer (size before upscaling) with which textures are created by default. */
        getInternalSize(): Vector2I
        
        /** Returns the target size of the render buffer (size after upscaling). */
        getTargetSize(): Vector2I
        
        /** Returns the scaling mode used for upscaling. */
        getScaling3DMode(): RenderingServer.ViewportScaling3DMode
        
        /** Returns the FSR sharpness value used while rendering the 3D content (if [method get_scaling_3d_mode] is an FSR mode). */
        getFsrSharpness(): float64
        
        /** Returns the applied 3D MSAA mode for this viewport. */
        getMsaa3D(): RenderingServer.ViewportMsaa
        
        /** Returns the number of MSAA samples used. */
        getTextureSamples(): RenderingDevice.TextureSamples
        
        /** Returns the screen-space antialiasing method applied. */
        getScreenSpaceAA(): RenderingServer.ViewportScreenSpaceAA
        
        /** Returns `true` if TAA is enabled. */
        getUseTaa(): boolean
        
        /** Returns `true` if debanding is enabled. */
        getUseDebanding(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneBuffersRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneBuffersRD;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneData extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneData extends __NameMapGObject {
        get_cam_transform: "getCamTransform";
        get_cam_projection: "getCamProjection";
        get_view_count: "getViewCount";
        get_view_eye_offset: "getViewEyeOffset";
        get_view_projection: "getViewProjection";
        get_uniform_buffer: "getUniformBuffer";
    }
    /** Abstract render data object, holds scene data related to rendering a single frame of a viewport.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenedata.html  
     */
    class RenderSceneData extends GObject {
        constructor(identifier?: any)
        /** Returns the camera transform used to render this frame.  
         *      
         *  **Note:** If more than one view is rendered, this will return a centered transform.  
         */
        getCamTransform(): Transform3D
        
        /** Returns the camera projection used to render this frame.  
         *      
         *  **Note:** If more than one view is rendered, this will return a combined projection.  
         */
        getCamProjection(): Projection
        
        /** Returns the number of views being rendered. */
        getViewCount(): int64
        
        /** Returns the eye offset per view used to render this frame. This is the offset between our camera transform and the eye transform. */
        getViewEyeOffset(view: int64): Vector3
        
        /** Returns the view projection per view used to render this frame.  
         *      
         *  **Note:** If a single view is rendered, this returns the camera projection. If more than one view is rendered, this will return a projection for the given view including the eye offset.  
         */
        getViewProjection(view: int64): Projection
        
        /** Return the [RID] of the uniform buffer containing the scene data as a UBO. */
        getUniformBuffer(): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneData;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneData;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneDataExtension extends __RPCMapRenderSceneData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneDataExtension extends __NameMapRenderSceneData {
        _get_cam_transform: "_getCamTransform";
        _get_cam_projection: "_getCamProjection";
        _get_view_count: "_getViewCount";
        _get_view_eye_offset: "_getViewEyeOffset";
        _get_view_projection: "_getViewProjection";
        _get_uniform_buffer: "_getUniformBuffer";
    }
    /** This class allows for a RenderSceneData implementation to be made in GDExtension.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenedataextension.html  
     */
    class RenderSceneDataExtension extends RenderSceneData {
        constructor(identifier?: any)
        /** Implement this in GDExtension to return the camera [Transform3D]. */
        /* gdvirtual */ _getCamTransform(): Transform3D
        
        /** Implement this in GDExtension to return the camera [Projection]. */
        /* gdvirtual */ _getCamProjection(): Projection
        
        /** Implement this in GDExtension to return the view count. */
        /* gdvirtual */ _getViewCount(): int64
        
        /** Implement this in GDExtension to return the eye offset for the given [param view]. */
        /* gdvirtual */ _getViewEyeOffset(view: int64): Vector3
        
        /** Implement this in GDExtension to return the view [Projection] for the given [param view]. */
        /* gdvirtual */ _getViewProjection(view: int64): Projection
        
        /** Implement this in GDExtension to return the [RID] of the uniform buffer containing the scene data as a UBO. */
        /* gdvirtual */ _getUniformBuffer(): Rid
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneDataExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneDataExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderSceneDataRD extends __RPCMapRenderSceneData {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderSceneDataRD extends __NameMapRenderSceneData {
    }
    /** Render scene data implementation for the RenderingDevice based renderers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderscenedatard.html  
     */
    class RenderSceneDataRD extends RenderSceneData {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderSceneDataRD;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderSceneDataRD;
    }
    namespace RenderingDevice {
        enum DeviceType {
            DeviceTypeOther = 0,
            DeviceTypeIntegratedGpu = 1,
            DeviceTypeDiscreteGpu = 2,
            DeviceTypeVirtualGpu = 3,
            DeviceTypeCpu = 4,
            DeviceTypeMax = 5,
        }
        enum DriverResource {
            DriverResourceLogicalDevice = 0,
            DriverResourcePhysicalDevice = 1,
            DriverResourceTopmostObject = 2,
            DriverResourceCommandQueue = 3,
            DriverResourceQueueFamily = 4,
            DriverResourceTexture = 5,
            DriverResourceTextureView = 6,
            DriverResourceTextureDataFormat = 7,
            DriverResourceSampler = 8,
            DriverResourceUniformSet = 9,
            DriverResourceBuffer = 10,
            DriverResourceComputePipeline = 11,
            DriverResourceRenderPipeline = 12,
            DriverResourceVulkanDevice = 0,
            DriverResourceVulkanPhysicalDevice = 1,
            DriverResourceVulkanInstance = 2,
            DriverResourceVulkanQueue = 3,
            DriverResourceVulkanQueueFamilyIndex = 4,
            DriverResourceVulkanImage = 5,
            DriverResourceVulkanImageView = 6,
            DriverResourceVulkanImageNativeTextureFormat = 7,
            DriverResourceVulkanSampler = 8,
            DriverResourceVulkanDescriptorSet = 9,
            DriverResourceVulkanBuffer = 10,
            DriverResourceVulkanComputePipeline = 11,
            DriverResourceVulkanRenderPipeline = 12,
        }
        enum DataFormat {
            DataFormatR4G4UnormPack8 = 0,
            DataFormatR4G4B4A4UnormPack16 = 1,
            DataFormatB4G4R4A4UnormPack16 = 2,
            DataFormatR5G6B5UnormPack16 = 3,
            DataFormatB5G6R5UnormPack16 = 4,
            DataFormatR5G5B5A1UnormPack16 = 5,
            DataFormatB5G5R5A1UnormPack16 = 6,
            DataFormatA1R5G5B5UnormPack16 = 7,
            DataFormatR8Unorm = 8,
            DataFormatR8Snorm = 9,
            DataFormatR8Uscaled = 10,
            DataFormatR8Sscaled = 11,
            DataFormatR8Uint = 12,
            DataFormatR8Sint = 13,
            DataFormatR8Srgb = 14,
            DataFormatR8G8Unorm = 15,
            DataFormatR8G8Snorm = 16,
            DataFormatR8G8Uscaled = 17,
            DataFormatR8G8Sscaled = 18,
            DataFormatR8G8Uint = 19,
            DataFormatR8G8Sint = 20,
            DataFormatR8G8Srgb = 21,
            DataFormatR8G8B8Unorm = 22,
            DataFormatR8G8B8Snorm = 23,
            DataFormatR8G8B8Uscaled = 24,
            DataFormatR8G8B8Sscaled = 25,
            DataFormatR8G8B8Uint = 26,
            DataFormatR8G8B8Sint = 27,
            DataFormatR8G8B8Srgb = 28,
            DataFormatB8G8R8Unorm = 29,
            DataFormatB8G8R8Snorm = 30,
            DataFormatB8G8R8Uscaled = 31,
            DataFormatB8G8R8Sscaled = 32,
            DataFormatB8G8R8Uint = 33,
            DataFormatB8G8R8Sint = 34,
            DataFormatB8G8R8Srgb = 35,
            DataFormatR8G8B8A8Unorm = 36,
            DataFormatR8G8B8A8Snorm = 37,
            DataFormatR8G8B8A8Uscaled = 38,
            DataFormatR8G8B8A8Sscaled = 39,
            DataFormatR8G8B8A8Uint = 40,
            DataFormatR8G8B8A8Sint = 41,
            DataFormatR8G8B8A8Srgb = 42,
            DataFormatB8G8R8A8Unorm = 43,
            DataFormatB8G8R8A8Snorm = 44,
            DataFormatB8G8R8A8Uscaled = 45,
            DataFormatB8G8R8A8Sscaled = 46,
            DataFormatB8G8R8A8Uint = 47,
            DataFormatB8G8R8A8Sint = 48,
            DataFormatB8G8R8A8Srgb = 49,
            DataFormatA8B8G8R8UnormPack32 = 50,
            DataFormatA8B8G8R8SnormPack32 = 51,
            DataFormatA8B8G8R8UscaledPack32 = 52,
            DataFormatA8B8G8R8SscaledPack32 = 53,
            DataFormatA8B8G8R8UintPack32 = 54,
            DataFormatA8B8G8R8SintPack32 = 55,
            DataFormatA8B8G8R8SrgbPack32 = 56,
            DataFormatA2R10G10B10UnormPack32 = 57,
            DataFormatA2R10G10B10SnormPack32 = 58,
            DataFormatA2R10G10B10UscaledPack32 = 59,
            DataFormatA2R10G10B10SscaledPack32 = 60,
            DataFormatA2R10G10B10UintPack32 = 61,
            DataFormatA2R10G10B10SintPack32 = 62,
            DataFormatA2B10G10R10UnormPack32 = 63,
            DataFormatA2B10G10R10SnormPack32 = 64,
            DataFormatA2B10G10R10UscaledPack32 = 65,
            DataFormatA2B10G10R10SscaledPack32 = 66,
            DataFormatA2B10G10R10UintPack32 = 67,
            DataFormatA2B10G10R10SintPack32 = 68,
            DataFormatR16Unorm = 69,
            DataFormatR16Snorm = 70,
            DataFormatR16Uscaled = 71,
            DataFormatR16Sscaled = 72,
            DataFormatR16Uint = 73,
            DataFormatR16Sint = 74,
            DataFormatR16Sfloat = 75,
            DataFormatR16G16Unorm = 76,
            DataFormatR16G16Snorm = 77,
            DataFormatR16G16Uscaled = 78,
            DataFormatR16G16Sscaled = 79,
            DataFormatR16G16Uint = 80,
            DataFormatR16G16Sint = 81,
            DataFormatR16G16Sfloat = 82,
            DataFormatR16G16B16Unorm = 83,
            DataFormatR16G16B16Snorm = 84,
            DataFormatR16G16B16Uscaled = 85,
            DataFormatR16G16B16Sscaled = 86,
            DataFormatR16G16B16Uint = 87,
            DataFormatR16G16B16Sint = 88,
            DataFormatR16G16B16Sfloat = 89,
            DataFormatR16G16B16A16Unorm = 90,
            DataFormatR16G16B16A16Snorm = 91,
            DataFormatR16G16B16A16Uscaled = 92,
            DataFormatR16G16B16A16Sscaled = 93,
            DataFormatR16G16B16A16Uint = 94,
            DataFormatR16G16B16A16Sint = 95,
            DataFormatR16G16B16A16Sfloat = 96,
            DataFormatR32Uint = 97,
            DataFormatR32Sint = 98,
            DataFormatR32Sfloat = 99,
            DataFormatR32G32Uint = 100,
            DataFormatR32G32Sint = 101,
            DataFormatR32G32Sfloat = 102,
            DataFormatR32G32B32Uint = 103,
            DataFormatR32G32B32Sint = 104,
            DataFormatR32G32B32Sfloat = 105,
            DataFormatR32G32B32A32Uint = 106,
            DataFormatR32G32B32A32Sint = 107,
            DataFormatR32G32B32A32Sfloat = 108,
            DataFormatR64Uint = 109,
            DataFormatR64Sint = 110,
            DataFormatR64Sfloat = 111,
            DataFormatR64G64Uint = 112,
            DataFormatR64G64Sint = 113,
            DataFormatR64G64Sfloat = 114,
            DataFormatR64G64B64Uint = 115,
            DataFormatR64G64B64Sint = 116,
            DataFormatR64G64B64Sfloat = 117,
            DataFormatR64G64B64A64Uint = 118,
            DataFormatR64G64B64A64Sint = 119,
            DataFormatR64G64B64A64Sfloat = 120,
            DataFormatB10G11R11UfloatPack32 = 121,
            DataFormatE5B9G9R9UfloatPack32 = 122,
            DataFormatD16Unorm = 123,
            DataFormatX8D24UnormPack32 = 124,
            DataFormatD32Sfloat = 125,
            DataFormatS8Uint = 126,
            DataFormatD16UnormS8Uint = 127,
            DataFormatD24UnormS8Uint = 128,
            DataFormatD32SfloatS8Uint = 129,
            DataFormatBc1RgbUnormBlock = 130,
            DataFormatBc1RgbSrgbBlock = 131,
            DataFormatBc1RgbaUnormBlock = 132,
            DataFormatBc1RgbaSrgbBlock = 133,
            DataFormatBc2UnormBlock = 134,
            DataFormatBc2SrgbBlock = 135,
            DataFormatBc3UnormBlock = 136,
            DataFormatBc3SrgbBlock = 137,
            DataFormatBc4UnormBlock = 138,
            DataFormatBc4SnormBlock = 139,
            DataFormatBc5UnormBlock = 140,
            DataFormatBc5SnormBlock = 141,
            DataFormatBc6HUfloatBlock = 142,
            DataFormatBc6HSfloatBlock = 143,
            DataFormatBc7UnormBlock = 144,
            DataFormatBc7SrgbBlock = 145,
            DataFormatEtc2R8G8B8UnormBlock = 146,
            DataFormatEtc2R8G8B8SrgbBlock = 147,
            DataFormatEtc2R8G8B8A1UnormBlock = 148,
            DataFormatEtc2R8G8B8A1SrgbBlock = 149,
            DataFormatEtc2R8G8B8A8UnormBlock = 150,
            DataFormatEtc2R8G8B8A8SrgbBlock = 151,
            DataFormatEacR11UnormBlock = 152,
            DataFormatEacR11SnormBlock = 153,
            DataFormatEacR11G11UnormBlock = 154,
            DataFormatEacR11G11SnormBlock = 155,
            DataFormatAstc4X4UnormBlock = 156,
            DataFormatAstc4X4SrgbBlock = 157,
            DataFormatAstc5X4UnormBlock = 158,
            DataFormatAstc5X4SrgbBlock = 159,
            DataFormatAstc5X5UnormBlock = 160,
            DataFormatAstc5X5SrgbBlock = 161,
            DataFormatAstc6X5UnormBlock = 162,
            DataFormatAstc6X5SrgbBlock = 163,
            DataFormatAstc6X6UnormBlock = 164,
            DataFormatAstc6X6SrgbBlock = 165,
            DataFormatAstc8X5UnormBlock = 166,
            DataFormatAstc8X5SrgbBlock = 167,
            DataFormatAstc8X6UnormBlock = 168,
            DataFormatAstc8X6SrgbBlock = 169,
            DataFormatAstc8X8UnormBlock = 170,
            DataFormatAstc8X8SrgbBlock = 171,
            DataFormatAstc10X5UnormBlock = 172,
            DataFormatAstc10X5SrgbBlock = 173,
            DataFormatAstc10X6UnormBlock = 174,
            DataFormatAstc10X6SrgbBlock = 175,
            DataFormatAstc10X8UnormBlock = 176,
            DataFormatAstc10X8SrgbBlock = 177,
            DataFormatAstc10X10UnormBlock = 178,
            DataFormatAstc10X10SrgbBlock = 179,
            DataFormatAstc12X10UnormBlock = 180,
            DataFormatAstc12X10SrgbBlock = 181,
            DataFormatAstc12X12UnormBlock = 182,
            DataFormatAstc12X12SrgbBlock = 183,
            DataFormatG8B8G8R8422Unorm = 184,
            DataFormatB8G8R8G8422Unorm = 185,
            DataFormatG8B8R83Plane420Unorm = 186,
            DataFormatG8B8R82Plane420Unorm = 187,
            DataFormatG8B8R83Plane422Unorm = 188,
            DataFormatG8B8R82Plane422Unorm = 189,
            DataFormatG8B8R83Plane444Unorm = 190,
            DataFormatR10X6UnormPack16 = 191,
            DataFormatR10X6G10X6Unorm2Pack16 = 192,
            DataFormatR10X6G10X6B10X6A10X6Unorm4Pack16 = 193,
            DataFormatG10X6B10X6G10X6R10X6422Unorm4Pack16 = 194,
            DataFormatB10X6G10X6R10X6G10X6422Unorm4Pack16 = 195,
            DataFormatG10X6B10X6R10X63Plane420Unorm3Pack16 = 196,
            DataFormatG10X6B10X6R10X62Plane420Unorm3Pack16 = 197,
            DataFormatG10X6B10X6R10X63Plane422Unorm3Pack16 = 198,
            DataFormatG10X6B10X6R10X62Plane422Unorm3Pack16 = 199,
            DataFormatG10X6B10X6R10X63Plane444Unorm3Pack16 = 200,
            DataFormatR12X4UnormPack16 = 201,
            DataFormatR12X4G12X4Unorm2Pack16 = 202,
            DataFormatR12X4G12X4B12X4A12X4Unorm4Pack16 = 203,
            DataFormatG12X4B12X4G12X4R12X4422Unorm4Pack16 = 204,
            DataFormatB12X4G12X4R12X4G12X4422Unorm4Pack16 = 205,
            DataFormatG12X4B12X4R12X43Plane420Unorm3Pack16 = 206,
            DataFormatG12X4B12X4R12X42Plane420Unorm3Pack16 = 207,
            DataFormatG12X4B12X4R12X43Plane422Unorm3Pack16 = 208,
            DataFormatG12X4B12X4R12X42Plane422Unorm3Pack16 = 209,
            DataFormatG12X4B12X4R12X43Plane444Unorm3Pack16 = 210,
            DataFormatG16B16G16R16422Unorm = 211,
            DataFormatB16G16R16G16422Unorm = 212,
            DataFormatG16B16R163Plane420Unorm = 213,
            DataFormatG16B16R162Plane420Unorm = 214,
            DataFormatG16B16R163Plane422Unorm = 215,
            DataFormatG16B16R162Plane422Unorm = 216,
            DataFormatG16B16R163Plane444Unorm = 217,
            DataFormatAstc4X4SfloatBlock = 218,
            DataFormatAstc5X4SfloatBlock = 219,
            DataFormatAstc5X5SfloatBlock = 220,
            DataFormatAstc6X5SfloatBlock = 221,
            DataFormatAstc6X6SfloatBlock = 222,
            DataFormatAstc8X5SfloatBlock = 223,
            DataFormatAstc8X6SfloatBlock = 224,
            DataFormatAstc8X8SfloatBlock = 225,
            DataFormatAstc10X5SfloatBlock = 226,
            DataFormatAstc10X6SfloatBlock = 227,
            DataFormatAstc10X8SfloatBlock = 228,
            DataFormatAstc10X10SfloatBlock = 229,
            DataFormatAstc12X10SfloatBlock = 230,
            DataFormatAstc12X12SfloatBlock = 231,
            DataFormatMax = 232,
        }
        enum BarrierMask {
            BarrierMaskVertex = 1,
            BarrierMaskFragment = 8,
            BarrierMaskCompute = 2,
            BarrierMaskTransfer = 4,
            BarrierMaskRaster = 9,
            BarrierMaskAllBarriers = 32767,
            BarrierMaskNoBarrier = 32768,
        }
        enum TextureType {
            TextureType1D = 0,
            TextureType2D = 1,
            TextureType3D = 2,
            TextureTypeCube = 3,
            TextureType1DArray = 4,
            TextureType2DArray = 5,
            TextureTypeCubeArray = 6,
            TextureTypeMax = 7,
        }
        enum TextureSamples {
            TextureSamples1 = 0,
            TextureSamples2 = 1,
            TextureSamples4 = 2,
            TextureSamples8 = 3,
            TextureSamples16 = 4,
            TextureSamples32 = 5,
            TextureSamples64 = 6,
            TextureSamplesMax = 7,
        }
        enum TextureUsageBits {
            TextureUsageSamplingBit = 1,
            TextureUsageColorAttachmentBit = 2,
            TextureUsageDepthStencilAttachmentBit = 4,
            TextureUsageDepthResolveAttachmentBit = 4096,
            TextureUsageStorageBit = 8,
            TextureUsageStorageAtomicBit = 16,
            TextureUsageCpuReadBit = 32,
            TextureUsageCanUpdateBit = 64,
            TextureUsageCanCopyFromBit = 128,
            TextureUsageCanCopyToBit = 256,
            TextureUsageInputAttachmentBit = 512,
        }
        enum TextureSwizzle {
            TextureSwizzleIdentity = 0,
            TextureSwizzleZero = 1,
            TextureSwizzleOne = 2,
            TextureSwizzleR = 3,
            TextureSwizzleG = 4,
            TextureSwizzleB = 5,
            TextureSwizzleA = 6,
            TextureSwizzleMax = 7,
        }
        enum TextureSliceType {
            TextureSlice2D = 0,
            TextureSliceCubemap = 1,
            TextureSlice3D = 2,
            TextureSlice2DArray = 3,
        }
        enum SamplerFilter {
            SamplerFilterNearest = 0,
            SamplerFilterLinear = 1,
        }
        enum SamplerRepeatMode {
            SamplerRepeatModeRepeat = 0,
            SamplerRepeatModeMirroredRepeat = 1,
            SamplerRepeatModeClampToEdge = 2,
            SamplerRepeatModeClampToBorder = 3,
            SamplerRepeatModeMirrorClampToEdge = 4,
            SamplerRepeatModeMax = 5,
        }
        enum SamplerBorderColor {
            SamplerBorderColorFloatTransparentBlack = 0,
            SamplerBorderColorIntTransparentBlack = 1,
            SamplerBorderColorFloatOpaqueBlack = 2,
            SamplerBorderColorIntOpaqueBlack = 3,
            SamplerBorderColorFloatOpaqueWhite = 4,
            SamplerBorderColorIntOpaqueWhite = 5,
            SamplerBorderColorMax = 6,
        }
        enum VertexFrequency {
            VertexFrequencyVertex = 0,
            VertexFrequencyInstance = 1,
        }
        enum IndexBufferFormat {
            IndexBufferFormatUint16 = 0,
            IndexBufferFormatUint32 = 1,
        }
        enum StorageBufferUsage {
            StorageBufferUsageDispatchIndirect = 1,
        }
        enum BufferCreationBits {
            BufferCreationDeviceAddressBit = 1,
            BufferCreationAsStorageBit = 2,
            BufferCreationAccelerationStructureBuildInputReadOnlyBit = 8,
        }
        enum AccelerationStructureFlagBits {
            AccelerationStructureAllowUpdateBit = 1,
            AccelerationStructureAllowCompactionBit = 2,
            AccelerationStructurePreferFastTraceBit = 4,
            AccelerationStructurePreferFastBuildBit = 8,
            AccelerationStructureLowMemoryBit = 16,
        }
        enum AccelerationStructureGeometryFlagBits {
            AccelerationStructureGeometryOpaqueBit = 1,
            AccelerationStructureGeometryNoDuplicateAnyHitInvocationBit = 2,
        }
        enum AccelerationStructureInstanceFlagBits {
            AccelerationStructureInstanceTriangleFacingCullDisableBit = 1,
            AccelerationStructureInstanceTriangleFlipFacingBit = 2,
            AccelerationStructureInstanceForceOpaqueBit = 4,
            AccelerationStructureInstanceForceNoOpaqueBit = 8,
        }
        enum UniformType {
            UniformTypeSampler = 0,
            UniformTypeSamplerWithTexture = 1,
            UniformTypeTexture = 2,
            UniformTypeImage = 3,
            UniformTypeTextureBuffer = 4,
            UniformTypeSamplerWithTextureBuffer = 5,
            UniformTypeImageBuffer = 6,
            UniformTypeUniformBuffer = 7,
            UniformTypeStorageBuffer = 8,
            UniformTypeInputAttachment = 9,
            UniformTypeUniformBufferDynamic = 10,
            UniformTypeStorageBufferDynamic = 11,
            UniformTypeAccelerationStructure = 12,
            UniformTypeMax = 13,
        }
        enum RenderPrimitive {
            RenderPrimitivePoints = 0,
            RenderPrimitiveLines = 1,
            RenderPrimitiveLinesWithAdjacency = 2,
            RenderPrimitiveLinestrips = 3,
            RenderPrimitiveLinestripsWithAdjacency = 4,
            RenderPrimitiveTriangles = 5,
            RenderPrimitiveTrianglesWithAdjacency = 6,
            RenderPrimitiveTriangleStrips = 7,
            RenderPrimitiveTriangleStripsWithAjacency = 8,
            RenderPrimitiveTriangleStripsWithRestartIndex = 9,
            RenderPrimitiveTesselationPatch = 10,
            RenderPrimitiveMax = 11,
        }
        enum PolygonCullMode {
            PolygonCullDisabled = 0,
            PolygonCullFront = 1,
            PolygonCullBack = 2,
        }
        enum PolygonFrontFace {
            PolygonFrontFaceClockwise = 0,
            PolygonFrontFaceCounterClockwise = 1,
        }
        enum StencilOperation {
            StencilOpKeep = 0,
            StencilOpZero = 1,
            StencilOpReplace = 2,
            StencilOpIncrementAndClamp = 3,
            StencilOpDecrementAndClamp = 4,
            StencilOpInvert = 5,
            StencilOpIncrementAndWrap = 6,
            StencilOpDecrementAndWrap = 7,
            StencilOpMax = 8,
        }
        enum CompareOperator {
            CompareOpNever = 0,
            CompareOpLess = 1,
            CompareOpEqual = 2,
            CompareOpLessOrEqual = 3,
            CompareOpGreater = 4,
            CompareOpNotEqual = 5,
            CompareOpGreaterOrEqual = 6,
            CompareOpAlways = 7,
            CompareOpMax = 8,
        }
        enum LogicOperation {
            LogicOpClear = 0,
            LogicOpAnd = 1,
            LogicOpAndReverse = 2,
            LogicOpCopy = 3,
            LogicOpAndInverted = 4,
            LogicOpNoOp = 5,
            LogicOpXor = 6,
            LogicOpOr = 7,
            LogicOpNor = 8,
            LogicOpEquivalent = 9,
            LogicOpInvert = 10,
            LogicOpOrReverse = 11,
            LogicOpCopyInverted = 12,
            LogicOpOrInverted = 13,
            LogicOpNand = 14,
            LogicOpSet = 15,
            LogicOpMax = 16,
        }
        enum BlendFactor {
            BlendFactorZero = 0,
            BlendFactorOne = 1,
            BlendFactorSrcColor = 2,
            BlendFactorOneMinusSrcColor = 3,
            BlendFactorDstColor = 4,
            BlendFactorOneMinusDstColor = 5,
            BlendFactorSrcAlpha = 6,
            BlendFactorOneMinusSrcAlpha = 7,
            BlendFactorDstAlpha = 8,
            BlendFactorOneMinusDstAlpha = 9,
            BlendFactorConstantColor = 10,
            BlendFactorOneMinusConstantColor = 11,
            BlendFactorConstantAlpha = 12,
            BlendFactorOneMinusConstantAlpha = 13,
            BlendFactorSrcAlphaSaturate = 14,
            BlendFactorSrc1Color = 15,
            BlendFactorOneMinusSrc1Color = 16,
            BlendFactorSrc1Alpha = 17,
            BlendFactorOneMinusSrc1Alpha = 18,
            BlendFactorMax = 19,
        }
        enum BlendOperation {
            BlendOpAdd = 0,
            BlendOpSubtract = 1,
            BlendOpReverseSubtract = 2,
            BlendOpMinimum = 3,
            BlendOpMaximum = 4,
            BlendOpMax = 5,
        }
        enum PipelineDynamicStateFlags {
            DynamicStateLineWidth = 1,
            DynamicStateDepthBias = 2,
            DynamicStateBlendConstants = 4,
            DynamicStateDepthBounds = 8,
            DynamicStateStencilCompareMask = 16,
            DynamicStateStencilWriteMask = 32,
            DynamicStateStencilReference = 64,
        }
        enum InitialAction {
            InitialActionLoad = 0,
            InitialActionClear = 1,
            InitialActionDiscard = 2,
            InitialActionMax = 3,
            InitialActionClearRegion = 1,
            InitialActionClearRegionContinue = 1,
            InitialActionKeep = 0,
            InitialActionDrop = 2,
            InitialActionContinue = 0,
        }
        enum FinalAction {
            FinalActionStore = 0,
            FinalActionDiscard = 1,
            FinalActionMax = 2,
            FinalActionRead = 0,
            FinalActionContinue = 0,
        }
        enum ShaderStage {
            ShaderStageVertex = 0,
            ShaderStageFragment = 1,
            ShaderStageTesselationControl = 2,
            ShaderStageTesselationEvaluation = 3,
            ShaderStageCompute = 4,
            ShaderStageRaygen = 5,
            ShaderStageAnyHit = 6,
            ShaderStageClosestHit = 7,
            ShaderStageMiss = 8,
            ShaderStageIntersection = 9,
            ShaderStageMax = 10,
            ShaderStageVertexBit = 1,
            ShaderStageFragmentBit = 2,
            ShaderStageTesselationControlBit = 4,
            ShaderStageTesselationEvaluationBit = 8,
            ShaderStageComputeBit = 16,
            ShaderStageRaygenBit = 32,
            ShaderStageAnyHitBit = 64,
            ShaderStageClosestHitBit = 128,
            ShaderStageMissBit = 256,
            ShaderStageIntersectionBit = 512,
        }
        enum ShaderLanguage {
            ShaderLanguageGlsl = 0,
            ShaderLanguageHlsl = 1,
        }
        enum PipelineSpecializationConstantType {
            PipelineSpecializationConstantTypeBool = 0,
            PipelineSpecializationConstantTypeInt = 1,
            PipelineSpecializationConstantTypeFloat = 2,
        }
        enum Features {
            SupportsMetalfxSpatial = 3,
            SupportsMetalfxTemporal = 4,
            SupportsBufferDeviceAddress = 6,
            SupportsImageAtomic32Bit = 7,
            SupportsRayQuery = 11,
            SupportsRaytracingPipeline = 12,
            SupportsHdrOutput = 13,
            SupportsRasterizationRateMap = 14,
        }
        enum Limit {
            LimitMaxBoundUniformSets = 0,
            LimitMaxFramebufferColorAttachments = 1,
            LimitMaxTexturesPerUniformSet = 2,
            LimitMaxSamplersPerUniformSet = 3,
            LimitMaxStorageBuffersPerUniformSet = 4,
            LimitMaxStorageImagesPerUniformSet = 5,
            LimitMaxUniformBuffersPerUniformSet = 6,
            LimitMaxDrawIndexedIndex = 7,
            LimitMaxFramebufferHeight = 8,
            LimitMaxFramebufferWidth = 9,
            LimitMaxTextureArrayLayers = 10,
            LimitMaxTextureSize1D = 11,
            LimitMaxTextureSize2D = 12,
            LimitMaxTextureSize3D = 13,
            LimitMaxTextureSizeCube = 14,
            LimitMaxTexturesPerShaderStage = 15,
            LimitMaxSamplersPerShaderStage = 16,
            LimitMaxStorageBuffersPerShaderStage = 17,
            LimitMaxStorageImagesPerShaderStage = 18,
            LimitMaxUniformBuffersPerShaderStage = 19,
            LimitMaxPushConstantSize = 20,
            LimitMaxUniformBufferSize = 21,
            LimitMaxVertexInputAttributeOffset = 22,
            LimitMaxVertexInputAttributes = 23,
            LimitMaxVertexInputBindings = 24,
            LimitMaxVertexInputBindingStride = 25,
            LimitMinUniformBufferOffsetAlignment = 26,
            LimitMaxComputeSharedMemorySize = 27,
            LimitMaxComputeWorkgroupCountX = 28,
            LimitMaxComputeWorkgroupCountY = 29,
            LimitMaxComputeWorkgroupCountZ = 30,
            LimitMaxComputeWorkgroupInvocations = 31,
            LimitMaxComputeWorkgroupSizeX = 32,
            LimitMaxComputeWorkgroupSizeY = 33,
            LimitMaxComputeWorkgroupSizeZ = 34,
            LimitMaxViewportDimensionsX = 35,
            LimitMaxViewportDimensionsY = 36,
            LimitMetalfxTemporalScalerMinScale = 46,
            LimitMetalfxTemporalScalerMaxScale = 47,
        }
        enum MemoryType {
            MemoryTextures = 0,
            MemoryBuffers = 1,
            MemoryTotal = 2,
        }
        enum BreadcrumbMarker {
            None = 0,
            ReflectionProbes = 65536,
            SkyPass = 131072,
            LightmapperPass = 196608,
            ShadowPassDirectional = 262144,
            ShadowPassCube = 327680,
            OpaquePass = 393216,
            AlphaPass = 458752,
            TransparentPass = 524288,
            PostProcessingPass = 589824,
            BlitPass = 655360,
            UiPass = 720896,
            DebugPass = 786432,
        }
        enum DrawFlags {
            DrawDefaultAll = 0,
            DrawClearColor0 = 1,
            DrawClearColor1 = 2,
            DrawClearColor2 = 4,
            DrawClearColor3 = 8,
            DrawClearColor4 = 16,
            DrawClearColor5 = 32,
            DrawClearColor6 = 64,
            DrawClearColor7 = 128,
            DrawClearColorMask = 255,
            DrawClearColorAll = 255,
            DrawIgnoreColor0 = 256,
            DrawIgnoreColor1 = 512,
            DrawIgnoreColor2 = 1024,
            DrawIgnoreColor3 = 2048,
            DrawIgnoreColor4 = 4096,
            DrawIgnoreColor5 = 8192,
            DrawIgnoreColor6 = 16384,
            DrawIgnoreColor7 = 32768,
            DrawIgnoreColorMask = 65280,
            DrawIgnoreColorAll = 65280,
            DrawClearDepth = 65536,
            DrawIgnoreDepth = 131072,
            DrawClearStencil = 262144,
            DrawIgnoreStencil = 524288,
            DrawClearAll = 327935,
            DrawIgnoreAll = 720640,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRenderingDevice extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRenderingDevice extends __NameMapGObject {
        texture_create: "textureCreate";
        texture_create_shared: "textureCreateShared";
        texture_create_shared_from_slice: "textureCreateSharedFromSlice";
        texture_create_from_extension: "textureCreateFromExtension";
        texture_update: "textureUpdate";
        texture_get_data: "textureGetData";
        texture_get_data_async: "textureGetDataAsync";
        texture_is_format_supported_for_usage: "textureIsFormatSupportedForUsage";
        texture_is_shared: "textureIsShared";
        texture_is_valid: "textureIsValid";
        texture_set_discardable: "textureSetDiscardable";
        texture_is_discardable: "textureIsDiscardable";
        texture_copy: "textureCopy";
        texture_clear: "textureClear";
        texture_resolve_multisample: "textureResolveMultisample";
        texture_get_format: "textureGetFormat";
        texture_get_native_handle: "textureGetNativeHandle";
        framebuffer_format_create: "framebufferFormatCreate";
        framebuffer_format_create_multipass: "framebufferFormatCreateMultipass";
        framebuffer_format_create_empty: "framebufferFormatCreateEmpty";
        framebuffer_format_get_texture_samples: "framebufferFormatGetTextureSamples";
        framebuffer_create: "framebufferCreate";
        framebuffer_create_multipass: "framebufferCreateMultipass";
        framebuffer_create_empty: "framebufferCreateEmpty";
        framebuffer_get_format: "framebufferGetFormat";
        framebuffer_is_valid: "framebufferIsValid";
        sampler_create: "samplerCreate";
        sampler_is_format_supported_for_filter: "samplerIsFormatSupportedForFilter";
        vertex_buffer_create: "vertexBufferCreate";
        vertex_format_create: "vertexFormatCreate";
        vertex_array_create: "vertexArrayCreate";
        index_buffer_create: "indexBufferCreate";
        index_array_create: "indexArrayCreate";
        shader_compile_spirv_from_source: "shaderCompileSpirVFromSource";
        shader_compile_binary_from_spirv: "shaderCompileBinaryFromSpirV";
        shader_create_from_spirv: "shaderCreateFromSpirV";
        shader_create_from_bytecode: "shaderCreateFromBytecode";
        shader_create_placeholder: "shaderCreatePlaceholder";
        shader_get_vertex_input_attribute_mask: "shaderGetVertexInputAttributeMask";
        uniform_buffer_create: "uniformBufferCreate";
        storage_buffer_create: "storageBufferCreate";
        texture_buffer_create: "textureBufferCreate";
        uniform_set_create: "uniformSetCreate";
        uniform_set_is_valid: "uniformSetIsValid";
        buffer_copy: "bufferCopy";
        buffer_update: "bufferUpdate";
        buffer_clear: "bufferClear";
        buffer_get_data: "bufferGetData";
        buffer_get_data_async: "bufferGetDataAsync";
        buffer_get_device_address: "bufferGetDeviceAddress";
        render_pipeline_create: "renderPipelineCreate";
        render_pipeline_is_valid: "renderPipelineIsValid";
        compute_pipeline_create: "computePipelineCreate";
        compute_pipeline_is_valid: "computePipelineIsValid";
        raytracing_pipeline_create: "raytracingPipelineCreate";
        raytracing_pipeline_is_valid: "raytracingPipelineIsValid";
        blas_create: "blasCreate";
        tlas_create: "tlasCreate";
        blas_build: "blasBuild";
        tlas_build: "tlasBuild";
        hit_sbt_create: "hitSbtCreate";
        hit_sbt_set_pipeline: "hitSbtSetPipeline";
        hit_sbt_range_alloc: "hitSbtRangeAlloc";
        hit_sbt_range_free: "hitSbtRangeFree";
        hit_sbt_range_update: "hitSbtRangeUpdate";
        screen_get_width: "screenGetWidth";
        screen_get_height: "screenGetHeight";
        screen_get_framebuffer_format: "screenGetFramebufferFormat";
        draw_list_begin_for_screen: "drawListBeginForScreen";
        draw_list_begin: "drawListBegin";
        draw_list_begin_split: "drawListBeginSplit";
        draw_list_set_blend_constants: "drawListSetBlendConstants";
        draw_list_bind_render_pipeline: "drawListBindRenderPipeline";
        draw_list_bind_uniform_set: "drawListBindUniformSet";
        draw_list_bind_vertex_array: "drawListBindVertexArray";
        draw_list_bind_vertex_buffers_format: "drawListBindVertexBuffersFormat";
        draw_list_bind_index_array: "drawListBindIndexArray";
        draw_list_set_push_constant: "drawListSetPushConstant";
        draw_list_draw: "drawListDraw";
        draw_list_draw_indirect: "drawListDrawIndirect";
        draw_list_enable_scissor: "drawListEnableScissor";
        draw_list_disable_scissor: "drawListDisableScissor";
        draw_list_switch_to_next_pass: "drawListSwitchToNextPass";
        draw_list_switch_to_next_pass_split: "drawListSwitchToNextPassSplit";
        draw_list_end: "drawListEnd";
        compute_list_begin: "computeListBegin";
        compute_list_bind_compute_pipeline: "computeListBindComputePipeline";
        compute_list_set_push_constant: "computeListSetPushConstant";
        compute_list_bind_uniform_set: "computeListBindUniformSet";
        compute_list_dispatch: "computeListDispatch";
        compute_list_dispatch_indirect: "computeListDispatchIndirect";
        compute_list_add_barrier: "computeListAddBarrier";
        compute_list_end: "computeListEnd";
        raytracing_list_begin: "raytracingListBegin";
        raytracing_list_bind_raytracing_pipeline: "raytracingListBindRaytracingPipeline";
        raytracing_list_set_push_constant: "raytracingListSetPushConstant";
        raytracing_list_bind_uniform_set: "raytracingListBindUniformSet";
        raytracing_list_trace_rays: "raytracingListTraceRays";
        raytracing_list_end: "raytracingListEnd";
        free_rid: "freeRid";
        capture_timestamp: "captureTimestamp";
        get_captured_timestamps_count: "getCapturedTimestampsCount";
        get_captured_timestamps_frame: "getCapturedTimestampsFrame";
        get_captured_timestamp_gpu_time: "getCapturedTimestampGpuTime";
        get_captured_timestamp_cpu_time: "getCapturedTimestampCpuTime";
        get_captured_timestamp_name: "getCapturedTimestampName";
        has_feature: "hasFeature";
        limit_get: "limitGet";
        get_frame_delay: "getFrameDelay";
        full_barrier: "fullBarrier";
        create_local_device: "createLocalDevice";
        set_resource_name: "setResourceName";
        draw_command_begin_label: "drawCommandBeginLabel";
        draw_command_insert_label: "drawCommandInsertLabel";
        draw_command_end_label: "drawCommandEndLabel";
        get_device_vendor_name: "getDeviceVendorName";
        get_device_name: "getDeviceName";
        get_device_pipeline_cache_uuid: "getDevicePipelineCacheUuid";
        get_memory_usage: "getMemoryUsage";
        get_driver_resource: "getDriverResource";
        get_perf_report: "getPerfReport";
        get_driver_and_device_memory_report: "getDriverAndDeviceMemoryReport";
        get_tracked_object_name: "getTrackedObjectName";
        get_tracked_object_type_count: "getTrackedObjectTypeCount";
        get_driver_total_memory: "getDriverTotalMemory";
        get_driver_allocation_count: "getDriverAllocationCount";
        get_driver_memory_by_object_type: "getDriverMemoryByObjectType";
        get_driver_allocs_by_object_type: "getDriverAllocsByObjectType";
        get_device_total_memory: "getDeviceTotalMemory";
        get_device_allocation_count: "getDeviceAllocationCount";
        get_device_memory_by_object_type: "getDeviceMemoryByObjectType";
        get_device_allocs_by_object_type: "getDeviceAllocsByObjectType";
    }
    /** Abstraction for working with modern low-level graphics APIs.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_renderingdevice.html  
     */
    class RenderingDevice extends GObject {
        /** Returned by functions that return an ID if a value is invalid. */
        static readonly INVALID_ID = -1
        
        /** Returned by functions that return a format ID if a value is invalid. */
        static readonly INVALID_FORMAT_ID = -1
        constructor(identifier?: any)
        
        /** Creates a new texture. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *      
         *  **Note:** [param data] takes an [Array] of [PackedByteArray]s. For [constant TEXTURE_TYPE_1D], [constant TEXTURE_TYPE_2D], and [constant TEXTURE_TYPE_3D] types, this array should only have one element, a [PackedByteArray] containing all the data for the texture. For `_ARRAY` and `_CUBE` types, the length should be the same as the number of [member RDTextureFormat.array_layers] in [param format].  
         *      
         *  **Note:** Not to be confused with [method RenderingServer.texture_2d_create], which creates the Godot-specific [Texture2D] resource as opposed to the graphics API's own texture type.  
         */
        textureCreate(format: RDTextureFormat, view: RDTextureView, data?: GArray<PackedByteArray>): Rid
        
        /** Creates a shared texture using the specified [param view] and the texture information from [param with_texture].  
         *  This will be freed automatically when the [param with_texture] is freed.  
         */
        textureCreateShared(view: RDTextureView, withTexture: Rid): Rid
        
        /** Creates a shared texture using the specified [param view] and the texture information from [param with_texture]'s [param layer] and [param mipmap]. The number of included mipmaps from the original texture can be controlled using the [param mipmaps] parameter. The [param layers] parameter controls the number of included layers from the original texture for 2D texture arrays, and must be `0` for all other texture types. If [param layers] is `0` for a 2D texture array, [param layer] must also be `0`, and all available layers will be included. Only relevant for textures with multiple layers, such as 3D textures, texture arrays and cubemaps. For single-layer textures, use [method texture_create_shared].  
         *  For 2D textures (which only have one layer), [param layer] must be `0`.  
         *  This will be freed automatically when the [param with_texture] is freed.  
         */
        textureCreateSharedFromSlice(view: RDTextureView, withTexture: Rid, layer: int64, mipmap: int64, mipmaps?: int64 /* = 1 */, sliceType?: RenderingDevice.TextureSliceType /* = 0 */, layers?: int64 /* = 0 */): Rid
        
        /** Returns an RID for an existing [param image] (`VkImage`) with the given [param type], [param format], [param samples], [param usage_flags], [param width], [param height], [param depth], [param layers], and [param mipmaps]. This can be used to allow Godot to render onto foreign images. */
        textureCreateFromExtension(type: RenderingDevice.TextureType, format: RenderingDevice.DataFormat, samples: RenderingDevice.TextureSamples, usageFlags: RenderingDevice.TextureUsageBits, image: int64, width: int64, height: int64, depth: int64, layers: int64, mipmaps?: int64 /* = 1 */): Rid
        
        /** Updates texture data with new data, replacing the previous data in place. The updated texture data must have the same dimensions and format. For 2D textures (which only have one layer), [param layer] must be `0`. Returns [constant @GlobalScope.OK] if the update was successful, [constant @GlobalScope.ERR_INVALID_PARAMETER] otherwise.  
         *      
         *  **Note:** Updating textures is forbidden during creation of a draw or compute list.  
         *      
         *  **Note:** The existing [param texture] can't be updated while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to update this texture.  
         *      
         *  **Note:** The existing [param texture] requires the [constant TEXTURE_USAGE_CAN_UPDATE_BIT] to be updatable.  
         */
        textureUpdate(texture: Rid, layer: int64, data: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Returns the [param texture] data for the specified [param layer] as raw binary data. For 2D textures (which only have one layer), [param layer] must be `0`.  
         *      
         *  **Note:** [param texture] can't be retrieved while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to retrieve this texture. Otherwise, an error is printed and an empty [PackedByteArray] is returned.  
         *      
         *  **Note:** [param texture] requires the [constant TEXTURE_USAGE_CAN_COPY_FROM_BIT] to be retrieved. Otherwise, an error is printed and an empty [PackedByteArray] is returned.  
         *      
         *  **Note:** This method will block the GPU from working until the data is retrieved. Refer to [method texture_get_data_async] for an alternative that returns the data in more performant way.  
         */
        textureGetData(texture: Rid, layer: int64): PackedByteArray
        
        /** Asynchronous version of [method texture_get_data]. RenderingDevice will call [param callback] in a certain amount of frames with the data the texture had at the time of the request.  
         *      
         *  **Note:** At the moment, the delay corresponds to the amount of frames specified by [member ProjectSettings.rendering/rendering_device/vsync/frame_queue_size].  
         *      
         *  **Note:** Downloading large textures can have a prohibitive cost for real-time even when using the asynchronous method due to hardware bandwidth limitations. When dealing with large resources, you can adjust settings such as [member ProjectSettings.rendering/rendering_device/staging_buffer/texture_download_region_size_px] and [member ProjectSettings.rendering/rendering_device/staging_buffer/block_size_kb] to improve the transfer speed at the cost of extra memory.  
         *    
         */
        textureGetDataAsync(texture: Rid, layer: int64, callback: Callable): GError
        
        /** Returns `true` if the specified [param format] is supported for the given [param usage_flags], `false` otherwise. */
        textureIsFormatSupportedForUsage(format: RenderingDevice.DataFormat, usageFlags: RenderingDevice.TextureUsageBits): boolean
        
        /** Returns `true` if the [param texture] is shared, `false` otherwise. See [RDTextureView]. */
        textureIsShared(texture: Rid): boolean
        
        /** Returns `true` if the [param texture] is valid, `false` otherwise. */
        textureIsValid(texture: Rid): boolean
        
        /** Updates the discardable property of [param texture].  
         *  If a texture is discardable, its contents do not need to be preserved between frames. This flag is only relevant when the texture is used as target in a draw list.  
         *  This information is used by [RenderingDevice] to figure out if a texture's contents can be discarded, eliminating unnecessary writes to memory and boosting performance.  
         */
        textureSetDiscardable(texture: Rid, discardable: boolean): void
        
        /** Returns `true` if the [param texture] is discardable, `false` otherwise. See [RDTextureFormat] or [method texture_set_discardable]. */
        textureIsDiscardable(texture: Rid): boolean
        
        /** Copies the [param from_texture] to [param to_texture] with the specified [param from_pos], [param to_pos] and [param size] coordinates. For 2-dimensional textures, [param from_pos] and [param to_pos] must have a Z axis of `0`, and [param size] must have a Z axis of `1`. Source and destination mipmaps/layers must also be specified, with these parameters being `0` for textures without mipmaps or single-layer textures. Returns [constant @GlobalScope.OK] if the texture copy was successful or [constant @GlobalScope.ERR_INVALID_PARAMETER] otherwise.  
         *      
         *  **Note:** [param from_texture] texture can't be copied while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to copy this texture.  
         *      
         *  **Note:** [param from_texture] texture requires the [constant TEXTURE_USAGE_CAN_COPY_FROM_BIT] to be retrieved.  
         *      
         *  **Note:** [param to_texture] can't be copied while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to copy this texture.  
         *      
         *  **Note:** [param to_texture] requires the [constant TEXTURE_USAGE_CAN_COPY_TO_BIT] to be retrieved.  
         *      
         *  **Note:** [param from_texture] and [param to_texture] must be of the same type (color or depth).  
         */
        textureCopy(fromTexture: Rid, toTexture: Rid, fromPos: Vector3, toPos: Vector3, size: Vector3, srcMipmap: int64, dstMipmap: int64, srcLayer: int64, dstLayer: int64): GError
        
        /** Clears the specified [param texture] by replacing all of its pixels with the specified [param color]. [param base_mipmap] and [param mipmap_count] determine which mipmaps of the texture are affected by this clear operation, while [param base_layer] and [param layer_count] determine which layers of a 3D texture (or texture array) are affected by this clear operation. For 2D textures (which only have one layer by design), [param base_layer] must be `0` and [param layer_count] must be `1`.  
         *      
         *  **Note:** [param texture] can't be cleared while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to clear this texture.  
         */
        textureClear(texture: Rid, color: Color, baseMipmap: int64, mipmapCount: int64, baseLayer: int64, layerCount: int64): GError
        
        /** Resolves the [param from_texture] texture onto [param to_texture] with multisample antialiasing enabled. This must be used when rendering a framebuffer for MSAA to work. Returns [constant @GlobalScope.OK] if successful, [constant @GlobalScope.ERR_INVALID_PARAMETER] otherwise.  
         *      
         *  **Note:** [param from_texture] and [param to_texture] textures must have the same dimension, format and type (color or depth).  
         *      
         *  **Note:** [param from_texture] can't be copied while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to resolve this texture.  
         *      
         *  **Note:** [param from_texture] requires the [constant TEXTURE_USAGE_CAN_COPY_FROM_BIT] to be retrieved.  
         *      
         *  **Note:** [param from_texture] must be multisampled and must also be 2D (or a slice of a 3D/cubemap texture).  
         *      
         *  **Note:** [param to_texture] can't be copied while a draw list that uses it as part of a framebuffer is being created. Ensure the draw list is finalized (and that the color/depth texture using it is not set to [constant FINAL_ACTION_CONTINUE]) to resolve this texture.  
         *      
         *  **Note:** [param to_texture] texture requires the [constant TEXTURE_USAGE_CAN_COPY_TO_BIT] to be retrieved.  
         *      
         *  **Note:** [param to_texture] texture must **not** be multisampled and must also be 2D (or a slice of a 3D/cubemap texture).  
         */
        textureResolveMultisample(fromTexture: Rid, toTexture: Rid): GError
        
        /** Returns the data format used to create this texture. */
        textureGetFormat(texture: Rid): null | RDTextureFormat
        
        /** Returns the internal graphics handle for this texture object. For use when communicating with third-party APIs mostly with GDExtension.  
         *      
         *  **Note:** This function returns a `uint64_t` which internally maps to a `GLuint` (OpenGL) or `VkImage` (Vulkan).  
         */
        textureGetNativeHandle(texture: Rid): int64
        
        /** Creates a new framebuffer format with the specified [param attachments] and [param view_count]. Returns the new framebuffer's unique framebuffer format ID.  
         *  If [param view_count] is greater than or equal to `2`, enables multiview which is used for VR rendering. This requires support for the Vulkan multiview extension.  
         */
        framebufferFormatCreate(attachments: GArray<RDAttachmentFormat>, viewCount?: int64 /* = 1 */): int64
        
        /** Creates a multipass framebuffer format with the specified [param attachments], [param passes] and [param view_count] and returns its ID. If [param view_count] is greater than or equal to `2`, enables multiview which is used for VR rendering. This requires support for the Vulkan multiview extension. */
        framebufferFormatCreateMultipass(attachments: GArray<RDAttachmentFormat>, passes: GArray<RDFramebufferPass>, viewCount?: int64 /* = 1 */): int64
        
        /** Creates a new empty framebuffer format with the specified number of [param samples] and returns its ID. */
        framebufferFormatCreateEmpty(samples?: RenderingDevice.TextureSamples /* = 0 */): int64
        
        /** Returns the number of texture samples used for the given framebuffer [param format] ID (returned by [method framebuffer_get_format]). */
        framebufferFormatGetTextureSamples(format: int64, renderPass?: int64 /* = 0 */): RenderingDevice.TextureSamples
        
        /** Creates a new framebuffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when any of the [param textures] is freed.  
         */
        framebufferCreate(textures: GArray<Rid>, validateWithFormat?: int64 /* = -1 */, viewCount?: int64 /* = 1 */): Rid
        
        /** Creates a new multipass framebuffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when any of the [param textures] is freed.  
         */
        framebufferCreateMultipass(textures: GArray<Rid>, passes: GArray<RDFramebufferPass>, validateWithFormat?: int64 /* = -1 */, viewCount?: int64 /* = 1 */): Rid
        
        /** Creates a new empty framebuffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        framebufferCreateEmpty(size: Vector2I, samples?: RenderingDevice.TextureSamples /* = 0 */, validateWithFormat?: int64 /* = -1 */): Rid
        
        /** Returns the format ID of the framebuffer specified by the [param framebuffer] RID. This ID is guaranteed to be unique for the same formats and does not need to be freed. */
        framebufferGetFormat(framebuffer: Rid): int64
        
        /** Returns `true` if the framebuffer specified by the [param framebuffer] RID is valid, `false` otherwise. */
        framebufferIsValid(framebuffer: Rid): boolean
        
        /** Creates a new sampler. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        samplerCreate(state: RDSamplerState): Rid
        
        /** Returns `true` if implementation supports using a texture of [param format] with the given [param sampler_filter]. */
        samplerIsFormatSupportedForFilter(format: RenderingDevice.DataFormat, samplerFilter: RenderingDevice.SamplerFilter): boolean
        
        /** Creates a new vertex buffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        vertexBufferCreate(sizeBytes: int64, data?: PackedByteArray | byte[] | ArrayBuffer /* = [] */, creationBits?: RenderingDevice.BufferCreationBits /* = 0 */): Rid
        
        /** Creates a new vertex format with the specified [param vertex_descriptions]. Returns a unique vertex format ID corresponding to the newly created vertex format. */
        vertexFormatCreate(vertexDescriptions: GArray<RDVertexAttribute>): int64
        
        /** Creates a vertex array based on the specified buffers. Optionally, [param offsets] (in bytes) may be defined for each buffer.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when any of the [param src_buffers] is freed.  
         */
        vertexArrayCreate(vertexCount: int64, vertexFormat: int64, srcBuffers: GArray<Rid>, offsets?: PackedInt64Array | int64[] /* = [] */): Rid
        
        /** Creates a new index buffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        indexBufferCreate(sizeIndices: int64, format: RenderingDevice.IndexBufferFormat, data?: PackedByteArray | byte[] | ArrayBuffer /* = [] */, useRestartIndices?: boolean /* = false */, creationBits?: RenderingDevice.BufferCreationBits /* = 0 */): Rid
        
        /** Creates a new index array. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when the [param index_buffer] is freed.  
         */
        indexArrayCreate(indexBuffer: Rid, indexOffset: int64, indexCount: int64): Rid
        
        /** Compiles a SPIR-V from the shader source code in [param shader_source] and returns the SPIR-V as an [RDShaderSPIRV]. This intermediate language shader is portable across different GPU models and driver versions, but cannot be run directly by GPUs until compiled into a binary shader using [method shader_compile_binary_from_spirv].  
         *  If [param allow_cache] is `true`, make use of the shader cache generated by Godot. This avoids a potentially lengthy shader compilation step if the shader is already in cache. If [param allow_cache] is `false`, Godot's shader cache is ignored and the shader will always be recompiled.  
         */
        shaderCompileSpirVFromSource(shaderSource: RDShaderSource, allowCache?: boolean /* = true */): null | RDShaderSpirV
        
        /** Compiles a binary shader from [param spirv_data] and returns the compiled binary data as a [PackedByteArray]. This compiled shader is specific to the GPU model and driver version used; it will not work on different GPU models or even different driver versions. See also [method shader_compile_spirv_from_source].  
         *  [param name] is an optional human-readable name that can be given to the compiled shader for organizational purposes.  
         */
        shaderCompileBinaryFromSpirV(spirVData: RDShaderSpirV, name?: string /* = '' */): PackedByteArray
        
        /** Creates a new shader instance from SPIR-V intermediate code. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method. See also [method shader_compile_spirv_from_source] and [method shader_create_from_bytecode].  
         */
        shaderCreateFromSpirV(spirVData: RDShaderSpirV, name?: string /* = '' */): Rid
        
        /** Creates a new shader instance from a binary compiled shader. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method. See also [method shader_compile_binary_from_spirv] and [method shader_create_from_spirv].  
         */
        shaderCreateFromBytecode(binaryData: PackedByteArray | byte[] | ArrayBuffer, placeholderRid?: Rid /* = new Rid() */): Rid
        
        /** Create a placeholder RID by allocating an RID without initializing it for use in [method shader_create_from_bytecode]. This allows you to create an RID for a shader and pass it around, but defer compiling the shader to a later time. */
        shaderCreatePlaceholder(): Rid
        
        /** Returns the internal vertex input mask. Internally, the vertex input mask is an unsigned integer consisting of the locations (specified in GLSL via. `layout(location = ...)`) of the input variables (specified in GLSL by the `in` keyword). */
        shaderGetVertexInputAttributeMask(shader: Rid): int64
        
        /** Creates a new uniform buffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        uniformBufferCreate(sizeBytes: int64, data?: PackedByteArray | byte[] | ArrayBuffer /* = [] */, creationBits?: RenderingDevice.BufferCreationBits /* = 0 */): Rid
        
        /** Creates a [url=https://vkguide.dev/docs/chapter-4/storage_buffers/]storage buffer[/url] with the specified [param data] and [param usage]. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        storageBufferCreate(sizeBytes: int64, data?: PackedByteArray | byte[] | ArrayBuffer /* = [] */, usage?: RenderingDevice.StorageBufferUsage /* = 0 */, creationBits?: RenderingDevice.BufferCreationBits /* = 0 */): Rid
        
        /** Creates a new texture buffer. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        textureBufferCreate(sizeBytes: int64, format: RenderingDevice.DataFormat, data?: PackedByteArray | byte[] | ArrayBuffer /* = [] */): Rid
        
        /** Creates a new uniform set. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when the [param shader] or any of the RIDs in the [param uniforms] is freed.  
         */
        uniformSetCreate(uniforms: GArray<RDUniform>, shader: Rid, shaderSet: int64): Rid
        
        /** Checks if the [param uniform_set] is valid, i.e. is owned. */
        uniformSetIsValid(uniformSet: Rid): boolean
        
        /** Copies [param size] bytes from the [param src_buffer] at [param src_offset] into [param dst_buffer] at [param dst_offset].  
         *  Prints an error if:  
         *  - [param size] exceeds the size of either [param src_buffer] or [param dst_buffer] at their corresponding offsets  
         *  - a draw list is currently active (created by [method draw_list_begin])  
         *  - a compute list is currently active (created by [method compute_list_begin])  
         */
        bufferCopy(srcBuffer: Rid, dstBuffer: Rid, srcOffset: int64, dstOffset: int64, size: int64): GError
        
        /** Updates a region of [param size_bytes] bytes, starting at [param offset], in the buffer, with the specified [param data].  
         *  Prints an error if:  
         *  - the region specified by [param offset] + [param size_bytes] exceeds the buffer  
         *  - a draw list is currently active (created by [method draw_list_begin])  
         *  - a compute list is currently active (created by [method compute_list_begin])  
         */
        bufferUpdate(buffer: Rid, offset: int64, sizeBytes: int64, data: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Clears the contents of the [param buffer], clearing [param size_bytes] bytes, starting at [param offset].  
         *  Prints an error if:  
         *  - the size isn't a multiple of four  
         *  - the region specified by [param offset] + [param size_bytes] exceeds the buffer  
         *  - a draw list is currently active (created by [method draw_list_begin])  
         *  - a compute list is currently active (created by [method compute_list_begin])  
         */
        bufferClear(buffer: Rid, offset: int64, sizeBytes: int64): GError
        
        /** Returns a copy of the data of the specified [param buffer], optionally [param offset_bytes] and [param size_bytes] can be set to copy only a portion of the buffer.  
         *      
         *  **Note:** This method will block the GPU from working until the data is retrieved. Refer to [method buffer_get_data_async] for an alternative that returns the data in more performant way.  
         */
        bufferGetData(buffer: Rid, offsetBytes?: int64 /* = 0 */, sizeBytes?: int64 /* = 0 */): PackedByteArray
        
        /** Asynchronous version of [method buffer_get_data]. RenderingDevice will call [param callback] in a certain amount of frames with the data the buffer had at the time of the request.  
         *      
         *  **Note:** At the moment, the delay corresponds to the amount of frames specified by [member ProjectSettings.rendering/rendering_device/vsync/frame_queue_size].  
         *      
         *  **Note:** Downloading large buffers can have a prohibitive cost for real-time even when using the asynchronous method due to hardware bandwidth limitations. When dealing with large resources, you can adjust settings such as [member ProjectSettings.rendering/rendering_device/staging_buffer/block_size_kb] to improve the transfer speed at the cost of extra memory.  
         *    
         */
        bufferGetDataAsync(buffer: Rid, callback: Callable, offsetBytes?: int64 /* = 0 */, sizeBytes?: int64 /* = 0 */): GError
        
        /** Returns the address of the given [param buffer] which can be passed to shaders in any way to access underlying data. Buffer must have been created with this feature enabled.  
         *      
         *  **Note:** You must check that the GPU supports this functionality by calling [method has_feature] with [constant SUPPORTS_BUFFER_DEVICE_ADDRESS] as a parameter.  
         */
        bufferGetDeviceAddress(buffer: Rid): int64
        
        /** Creates a new render pipeline. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when the [param shader] is freed.  
         */
        renderPipelineCreate(shader: Rid, framebufferFormat: int64, vertexFormat: int64, primitive: RenderingDevice.RenderPrimitive, rasterizationState: RDPipelineRasterizationState, multisampleState: RDPipelineMultisampleState, stencilState: RDPipelineDepthStencilState, colorBlendState: RDPipelineColorBlendState, dynamicStateFlags?: RenderingDevice.PipelineDynamicStateFlags /* = 0 */, forRenderPass?: int64 /* = 0 */, specializationConstants?: GArray<RDPipelineSpecializationConstant>): Rid
        
        /** Returns `true` if the render pipeline specified by the [param render_pipeline] RID is valid, `false` otherwise. */
        renderPipelineIsValid(renderPipeline: Rid): boolean
        
        /** Creates a new compute pipeline. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when the [param shader] is freed.  
         */
        computePipelineCreate(shader: Rid, specializationConstants?: GArray<RDPipelineSpecializationConstant>): Rid
        
        /** Returns `true` if the compute pipeline specified by the [param compute_pipeline] RID is valid, `false` otherwise. */
        computePipelineIsValid(computePipeline: Rid): boolean
        
        /** Creates a new raytracing pipeline. It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  Each shader must provide the required stage. All stages must use compatible pipeline layouts. The pipeline selects the required stage from each shader.  
         *  Input order defines stable indices used by the API:  
         *  - [param raygen_shaders] is indexed in [method raytracing_list_trace_rays].  
         *  - [param miss_shaders] is indexed in `traceRayEXT`.  
         *  - [param hit_groups] is indexed in [method hit_sbt_range_update].  
         */
        raytracingPipelineCreate(raygenShaders: GArray<RDPipelineShader>, missShaders: GArray<RDPipelineShader>, hitGroups: GArray<RDHitGroup>, maxTraceRecursionDepth: int64): Rid
        
        /** Returns `true` if the raytracing pipeline specified by the [param raytracing_pipeline] RID is valid, `false` otherwise. */
        raytracingPipelineIsValid(raytracingPipeline: Rid): boolean
        
        /** Creates a new Bottom-Level Acceleration Structure (BLAS). It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        blasCreate(geometries: GArray<RDAccelerationStructureGeometry>, flags: RenderingDevice.AccelerationStructureFlagBits): Rid
        
        /** Creates a new Top-Level Acceleration Structure (TLAS). It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         */
        tlasCreate(maxInstanceCount: int64, flags: RenderingDevice.AccelerationStructureFlagBits): Rid
        
        /** Builds the [param blas]. */
        blasBuild(blas: Rid): GError
        
        /** Builds the [param tlas]. The contents of previous builds are discarded.  
         *  Any BLAS provided through the [member RDAccelerationStructureInstance.blas] member must already have been built using the [method blas_build] method.  
         *  The number of instances can be equal to or smaller than the maximum instance count provided in the [method tlas_create] method.  
         *      
         *  **Note:** Freeing or rebuilding any of the provided BLASes after this method invalidates the TLAS and requires it to be rebuilt.  
         */
        tlasBuild(tlas: Rid, instances: GArray<RDAccelerationStructureInstance>): GError
        
        /** Creates a new hit shader binding table (SBT). It can be accessed with the RID that is returned.  
         *  Once finished with your RID, you will want to free the RID using the RenderingDevice's [method free_rid] method.  
         *  This will be freed automatically when the [param raytracing_pipeline] is freed.  
         *  The hit SBT resizes itself as needed. [param initial_hit_group_capacity] is used to allocate the initial backing memory.  
         */
        hitSbtCreate(raytracingPipeline: Rid, initialHitGroupCapacity: int64): Rid
        
        /** Sets a new [param raytracing_pipeline] for [param hit_sbt].  
         *  The new pipeline must be a superset of the previous one. Existing hit groups must keep the same order and new hit groups should be appended to the end. This preserves existing SBT entries.  
         *  The previous pipeline must remain valid during the call.  
         */
        hitSbtSetPipeline(hitSbt: Rid, raytracingPipeline: Rid): GError
        
        /** Allocates a contiguous range of SBT entries from [param hit_sbt].  
         *  The returned value should be assigned to [member RDAccelerationStructureInstance.hit_sbt_range].  
         *  During ray traversal, hit group index is computed as:  
         *  	(geometry index in [member RDAccelerationStructureInstance.blas])  
         *  	× (SBT stride used in `traceRayEXT`)  
         *  	+ (SBT offset used in `traceRayEXT`)  
         *  	+ (range offset)  
         *  [param hit_group_count] must be large enough to cover all SBT entries that may be indexed by this equation. This typically corresponds to:  
         *  	(geometry count in [member RDAccelerationStructureInstance.blas])  
         *  	× (SBT stride used in `traceRayEXT`)  
         *  The allocated range is uninitialized and must be filled using [method hit_sbt_range_update].  
         */
        hitSbtRangeAlloc(hitSbt: Rid, hitGroupCount: int64): int64
        
        /** Frees a hit SBT range previously allocated with [method hit_sbt_range_alloc].  
         *  The range must not be in use by any acceleration structure after being freed.  
         */
        hitSbtRangeFree(hitSbt: Rid, range: int64): GError
        
        /** Updates the contents of a hit SBT range.  
         *  [param hit_group_indices] specifies indices into the hit group array provided in [method raytracing_pipeline_create].  
         *  The [param offset] parameter specifies where within the allocated range the writing begins. This allows partial updates of a range. However, the complete range must be fully initialized before it is used in a raytracing dispatch.  
         */
        hitSbtRangeUpdate(hitSbt: Rid, range: int64, offset: int64, hitGroupIndices: PackedInt32Array | int32[]): GError
        
        /** Returns the window width matching the graphics API context for the given window ID (in pixels). Despite the parameter being named [param screen], this returns the  *window*  size. See also [method screen_get_height].  
         *      
         *  **Note:** Only the main [RenderingDevice] returned by [method RenderingServer.get_rendering_device] has a width. If called on a local [RenderingDevice], this method prints an error and returns [constant INVALID_ID].  
         */
        screenGetWidth(screen?: int64 /* = 0 */): int64
        
        /** Returns the window height matching the graphics API context for the given window ID (in pixels). Despite the parameter being named [param screen], this returns the  *window*  size. See also [method screen_get_width].  
         *      
         *  **Note:** Only the main [RenderingDevice] returned by [method RenderingServer.get_rendering_device] has a height. If called on a local [RenderingDevice], this method prints an error and returns [constant INVALID_ID].  
         */
        screenGetHeight(screen?: int64 /* = 0 */): int64
        
        /** Returns the framebuffer format of the given screen.  
         *      
         *  **Note:** Only the main [RenderingDevice] returned by [method RenderingServer.get_rendering_device] has a format. If called on a local [RenderingDevice], this method prints an error and returns [constant INVALID_ID].  
         */
        screenGetFramebufferFormat(screen?: int64 /* = 0 */): int64
        
        /** High-level variant of [method draw_list_begin], with the parameters automatically being adjusted for drawing onto the window specified by the [param screen] ID.  
         *      
         *  **Note:** Cannot be used with local RenderingDevices, as these don't have a screen. If called on a local RenderingDevice, [method draw_list_begin_for_screen] returns [constant INVALID_ID].  
         */
        drawListBeginForScreen(screen?: int64 /* = 0 */, clearColor?: Color /* = new Color(0, 0, 0, 1) */): int64
        
        /** Starts a list of raster drawing commands created with the `draw_*` methods. The returned value should be passed to other `draw_list_*` functions.  
         *  Multiple draw lists cannot be created at the same time; you must finish the previous draw list first using [method draw_list_end].  
         *  A simple drawing operation might look like this (code is not a complete example):  
         *    
         *  The [param draw_flags] indicates if the texture attachments of the framebuffer should be cleared or ignored. Only one of the two flags can be used for each individual attachment. Ignoring an attachment means that any contents that existed before the draw list will be completely discarded, reducing the memory bandwidth used by the render pass but producing garbage results if the pixels aren't replaced. The default behavior allows the engine to figure out the right operation to use if the texture is discardable, which can result in increased performance. See [RDTextureFormat] or [method texture_set_discardable].  
         *  The [param breadcrumb] parameter can be an arbitrary 32-bit integer that is useful to diagnose GPU crashes. If Godot is built in dev or debug mode; when the GPU crashes Godot will dump all shaders that were being executed at the time of the crash and the breadcrumb is useful to diagnose what passes did those shaders belong to.  
         *  It does not affect rendering behavior and can be set to 0. It is recommended to use [enum BreadcrumbMarker] enumerations for consistency but it's not required. It is also possible to use bitwise operations to add extra data. e.g.  
         *    
         */
        drawListBegin(framebuffer: Rid, drawFlags?: RenderingDevice.DrawFlags /* = 0 */, clearColorValues?: PackedColorArray | Color[] /* = [] */, clearDepthValue?: float64 /* = 1 */, clearStencilValue?: int64 /* = 0 */, region?: Rect2 /* = new Rect2(0, 0, 0, 0) */, breadcrumb?: int64 /* = 0 */): int64
        
        /** This method does nothing and always returns an empty [PackedInt64Array]. */
        drawListBeginSplit(framebuffer: Rid, splits: int64, initialColorAction: RenderingDevice.InitialAction, finalColorAction: RenderingDevice.FinalAction, initialDepthAction: RenderingDevice.InitialAction, finalDepthAction: RenderingDevice.FinalAction, clearColorValues?: PackedColorArray | Color[] /* = [] */, clearDepth?: float64 /* = 1 */, clearStencil?: int64 /* = 0 */, region?: Rect2 /* = new Rect2(0, 0, 0, 0) */, storageTextures?: GArray<Rid>): PackedInt64Array
        
        /** Sets blend constants for the specified [param draw_list] to [param color]. Blend constants are used only if the graphics pipeline is created with [constant DYNAMIC_STATE_BLEND_CONSTANTS] flag set. */
        drawListSetBlendConstants(drawList: int64, color: Color): void
        
        /** Binds [param render_pipeline] to the specified [param draw_list]. */
        drawListBindRenderPipeline(drawList: int64, renderPipeline: Rid): void
        
        /** Binds [param uniform_set] to the specified [param draw_list]. A [param set_index] must also be specified, which is an identifier starting from `0` that must match the one expected by the draw list. */
        drawListBindUniformSet(drawList: int64, uniformSet: Rid, setIndex: int64): void
        
        /** Binds [param vertex_array] to the specified [param draw_list]. */
        drawListBindVertexArray(drawList: int64, vertexArray: Rid): void
        
        /** Binds a set of [param vertex_buffers] directly to the specified [param draw_list] using [param vertex_format] without creating a vertex array RID. Provide the number of vertices in [param vertex_count]; optional per-buffer byte [param offsets] may also be supplied. */
        drawListBindVertexBuffersFormat(drawList: int64, vertexFormat: int64, vertexCount: int64, vertexBuffers: GArray<Rid>, offsets?: PackedInt64Array | int64[] /* = [] */): void
        
        /** Binds [param index_array] to the specified [param draw_list]. */
        drawListBindIndexArray(drawList: int64, indexArray: Rid): void
        
        /** Sets the push constant data to [param buffer] for the specified [param draw_list]. The shader determines how this binary data is used. The buffer's size in bytes must also be specified in [param size_bytes] (this can be obtained by calling the [method PackedByteArray.size] method on the passed [param buffer]). */
        drawListSetPushConstant(drawList: int64, buffer: PackedByteArray | byte[] | ArrayBuffer, sizeBytes: int64): void
        
        /** Submits [param draw_list] for rendering on the GPU. This is the raster equivalent to [method compute_list_dispatch]. */
        drawListDraw(drawList: int64, useIndices: boolean, instances: int64, proceduralVertexCount?: int64 /* = 0 */): void
        
        /** Submits [param draw_list] for rendering on the GPU with the given parameters stored in the [param buffer] at [param offset]. Parameters being integers: vertex count, instance count, first vertex, first instance. And when using indices: index count, instance count, first index, vertex offset, first instance. Buffer must have been created with [constant STORAGE_BUFFER_USAGE_DISPATCH_INDIRECT] flag. */
        drawListDrawIndirect(drawList: int64, useIndices: boolean, buffer: Rid, offset?: int64 /* = 0 */, drawCount?: int64 /* = 1 */, stride?: int64 /* = 0 */): void
        
        /** Creates a scissor rectangle and enables it for the specified [param draw_list]. Scissor rectangles are used for clipping by discarding fragments that fall outside a specified rectangular portion of the screen. See also [method draw_list_disable_scissor].  
         *      
         *  **Note:** The specified [param rect] is automatically intersected with the screen's dimensions, which means it cannot exceed the screen's dimensions.  
         */
        drawListEnableScissor(drawList: int64, rect?: Rect2 /* = new Rect2(0, 0, 0, 0) */): void
        
        /** Removes and disables the scissor rectangle for the specified [param draw_list]. See also [method draw_list_enable_scissor]. */
        drawListDisableScissor(drawList: int64): void
        
        /** Switches to the next draw pass. */
        drawListSwitchToNextPass(): int64
        
        /** This method does nothing and always returns an empty [PackedInt64Array]. */
        drawListSwitchToNextPassSplit(splits: int64): PackedInt64Array
        
        /** Finishes a list of raster drawing commands created with the `draw_*` methods. */
        drawListEnd(): void
        
        /** Starts a list of compute commands created with the `compute_*` methods. The returned value should be passed to other `compute_list_*` functions.  
         *  Multiple compute lists cannot be created at the same time; you must finish the previous compute list first using [method compute_list_end].  
         *  A simple compute operation might look like this (code is not a complete example):  
         *    
         */
        computeListBegin(): int64
        
        /** Tells the GPU what compute pipeline to use when processing the compute list. If the shader has changed since the last time this function was called, Godot will unbind all descriptor sets and will re-bind them inside [method compute_list_dispatch]. */
        computeListBindComputePipeline(computeList: int64, computePipeline: Rid): void
        
        /** Sets the push constant data to [param buffer] for the specified [param compute_list]. The shader determines how this binary data is used. The buffer's size in bytes must also be specified in [param size_bytes] (this can be obtained by calling the [method PackedByteArray.size] method on the passed [param buffer]). */
        computeListSetPushConstant(computeList: int64, buffer: PackedByteArray | byte[] | ArrayBuffer, sizeBytes: int64): void
        
        /** Binds the [param uniform_set] to this [param compute_list]. Godot ensures that all textures in the uniform set have the correct Vulkan access masks. If Godot had to change access masks of textures, it will raise a Vulkan image memory barrier. */
        computeListBindUniformSet(computeList: int64, uniformSet: Rid, setIndex: int64): void
        
        /** Submits the compute list for processing on the GPU. This is the compute equivalent to [method draw_list_draw]. */
        computeListDispatch(computeList: int64, xGroups: int64, yGroups: int64, zGroups: int64): void
        
        /** Submits the compute list for processing on the GPU with the given group counts stored in the [param buffer] at [param offset]. Buffer must have been created with [constant STORAGE_BUFFER_USAGE_DISPATCH_INDIRECT] flag. */
        computeListDispatchIndirect(computeList: int64, buffer: Rid, offset: int64): void
        
        /** Raises a Vulkan compute barrier in the specified [param compute_list]. */
        computeListAddBarrier(computeList: int64): void
        
        /** Finishes a list of compute commands created with the `compute_*` methods. */
        computeListEnd(): void
        
        /** Starts a list of raytracing commands. The returned value should be passed to other `raytracing_list_*` functions.  
         *  Multiple raytracing lists cannot be created at the same time; you must finish the previous raytracing list first using [method raytracing_list_end].  
         *  A simple raytracing operation might look like this (code is not a complete example):  
         *    
         */
        raytracingListBegin(): int64
        
        /** Binds [param raytracing_pipeline] to the specified [param raytracing_list]. */
        raytracingListBindRaytracingPipeline(raytracingList: int64, raytracingPipeline: Rid): void
        
        /** Sets the push constant data to [param buffer] for the specified [param raytracing_list]. The shader determines how this binary data is used. The buffer's size in bytes must also be specified in [param size_bytes] (this can be obtained by calling the [method PackedByteArray.size] method on the passed [param buffer]). */
        raytracingListSetPushConstant(raytracingList: int64, buffer: PackedByteArray | byte[] | ArrayBuffer, sizeBytes: int64): void
        
        /** Binds the [param uniform_set] to this [param raytracing_list]. */
        raytracingListBindUniformSet(raytracingList: int64, uniformSet: Rid, setIndex: int64): void
        
        /** Initializes a raytracing dispatch for [param raytracing_list], launching [param width] × [param height] × [param depth] rays.  
         *  [param raygen_shader_index] selects the ray generation shader from the pipeline bound with [method raytracing_list_bind_raytracing_pipeline].  
         *  [param hit_sbt] must use the same pipeline bound to [param raytracing_list].  
         */
        raytracingListTraceRays(raytracingList: int64, raygenShaderIndex: int64, hitSbt: Rid, width: int64, height: int64, depth: int64): void
        
        /** Finishes a list of raytracing commands created with the `raytracing_*` methods. */
        raytracingListEnd(): void
        
        /** Tries to free an object in the RenderingDevice. To avoid memory leaks, this should be called after using an object as memory management does not occur automatically when using RenderingDevice directly. */
        freeRid(rid: Rid): void
        
        /** Creates a timestamp marker with the specified [param name]. This is used for performance reporting with the [method get_captured_timestamp_cpu_time], [method get_captured_timestamp_gpu_time] and [method get_captured_timestamp_name] methods. */
        captureTimestamp(name: string): void
        
        /** Returns the total number of timestamps (rendering steps) available for profiling. */
        getCapturedTimestampsCount(): int64
        
        /** Returns the index of the last frame rendered that has rendering timestamps available for querying. */
        getCapturedTimestampsFrame(): int64
        
        /** Returns the timestamp in GPU time for the rendering step specified by [param index] (in nanoseconds since the engine started). See also [method get_captured_timestamp_cpu_time] and [method capture_timestamp]. */
        getCapturedTimestampGpuTime(index: int64): int64
        
        /** Returns the timestamp in CPU time for the rendering step specified by [param index] (in microseconds since the engine started). See also [method get_captured_timestamp_gpu_time] and [method capture_timestamp]. */
        getCapturedTimestampCpuTime(index: int64): int64
        
        /** Returns the timestamp's name for the rendering step specified by [param index]. See also [method capture_timestamp]. */
        getCapturedTimestampName(index: int64): string
        
        /** Returns `true` if the [param feature] is supported by the GPU. */
        hasFeature(feature: RenderingDevice.Features): boolean
        
        /** Returns the value of the specified [param limit]. This limit varies depending on the current graphics hardware (and sometimes the driver version). If the given limit is exceeded, rendering errors will occur.  
         *  Limits for various graphics hardware can be found in the [url=https://vulkan.gpuinfo.org/]Vulkan Hardware Database[/url].  
         */
        limitGet(limit: RenderingDevice.Limit): int64
        
        /** Returns the frame count kept by the graphics API. Higher values result in higher input lag, but with more consistent throughput. For the main [RenderingDevice], frames are cycled (usually 3 with triple-buffered V-Sync enabled). However, local [RenderingDevice]s only have 1 frame. */
        getFrameDelay(): int64
        
        /** Pushes the frame setup and draw command buffers then marks the local device as currently processing (which allows calling [method sync]).  
         *      
         *  **Note:** Only available in local RenderingDevices.  
         */
        submit(): void
        
        /** Forces a synchronization between the CPU and GPU, which may be required in certain cases. Only call this when needed, as CPU-GPU synchronization has a performance cost.  
         *      
         *  **Note:** Only available in local RenderingDevices.  
         *      
         *  **Note:** [method sync] can only be called after a [method submit].  
         */
        sync(): void
        
        /** This method does nothing. */
        barrier(from?: RenderingDevice.BarrierMask /* = 32767 */, to?: RenderingDevice.BarrierMask /* = 32767 */): void
        
        /** This method does nothing. */
        fullBarrier(): void
        
        /** Create a new local [RenderingDevice]. This is most useful for performing compute operations on the GPU independently from the rest of the engine. */
        createLocalDevice(): RenderingDevice
        
        /** Sets the resource name for [param id] to [param name]. This is used for debugging with third-party tools such as [url=https://renderdoc.org/]RenderDoc[/url].  
         *  The following types of resources can be named: texture, sampler, vertex buffer, index buffer, uniform buffer, texture buffer, storage buffer, uniform set buffer, shader, render pipeline and compute pipeline. Framebuffers cannot be named. Attempting to name an incompatible resource type will print an error.  
         *      
         *  **Note:** Resource names are only set when the engine runs in verbose mode ([method OS.is_stdout_verbose] = `true`), or when using an engine build compiled with the `dev_mode=yes` SCons option. The graphics driver must also support the `VK_EXT_DEBUG_UTILS_EXTENSION_NAME` Vulkan extension for named resources to work.  
         */
        setResourceName(id: Rid, name: string): void
        
        /** Create a command buffer debug label region that can be displayed in third-party tools such as [url=https://renderdoc.org/]RenderDoc[/url]. All regions must be ended with a [method draw_command_end_label] call. When viewed from the linear series of submissions to a single queue, calls to [method draw_command_begin_label] and [method draw_command_end_label] must be matched and balanced.  
         *  The `VK_EXT_DEBUG_UTILS_EXTENSION_NAME` Vulkan extension must be available and enabled for command buffer debug label region to work. See also [method draw_command_end_label].  
         */
        drawCommandBeginLabel(name: string, color: Color): void
        
        /** This method does nothing. */
        drawCommandInsertLabel(name: string, color: Color): void
        
        /** Ends the command buffer debug label region started by a [method draw_command_begin_label] call. */
        drawCommandEndLabel(): void
        
        /** Returns the vendor of the video adapter (e.g. "NVIDIA Corporation"). Equivalent to [method RenderingServer.get_video_adapter_vendor]. See also [method get_device_name]. */
        getDeviceVendorName(): string
        
        /** Returns the name of the video adapter (e.g. "GeForce GTX 1080/PCIe/SSE2"). Equivalent to [method RenderingServer.get_video_adapter_name]. See also [method get_device_vendor_name]. */
        getDeviceName(): string
        
        /** Returns the universally unique identifier for the pipeline cache. This is used to cache shader files on disk, which avoids shader recompilations on subsequent engine runs. This UUID varies depending on the graphics card model, but also the driver version. Therefore, updating graphics drivers will invalidate the shader cache. */
        getDevicePipelineCacheUuid(): string
        
        /** Returns the memory usage in bytes corresponding to the given [param type]. When using Vulkan, these statistics are calculated by [url=https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator]Vulkan Memory Allocator[/url]. */
        getMemoryUsage(type: RenderingDevice.MemoryType): int64
        
        /** Returns the unique identifier of the driver [param resource] for the specified [param rid]. Some driver resource types ignore the specified [param rid]. [param index] is always ignored but must be specified anyway. */
        getDriverResource(resource: RenderingDevice.DriverResource, rid: Rid, index: int64): int64
        
        /** Returns a string with a performance report from the past frame. Updates every frame. */
        getPerfReport(): string
        
        /** Returns string report in CSV format using the following methods:  
         *  - [method get_tracked_object_name]  
         *  - [method get_tracked_object_type_count]  
         *  - [method get_driver_total_memory]  
         *  - [method get_driver_allocation_count]  
         *  - [method get_driver_memory_by_object_type]  
         *  - [method get_driver_allocs_by_object_type]  
         *  - [method get_device_total_memory]  
         *  - [method get_device_allocation_count]  
         *  - [method get_device_memory_by_object_type]  
         *  - [method get_device_allocs_by_object_type]  
         *  This is only used by Vulkan in debug builds. Godot must also be started with the `--extra-gpu-memory-tracking` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url].  
         */
        getDriverAndDeviceMemoryReport(): string
        
        /** Returns the name of the type of object for the given [param type_index]. This value must be in range `[0; get_tracked_object_type_count - 1]`. If [method get_tracked_object_type_count] is 0, then type argument is ignored and always returns the same string.  
         *  The return value is important because it gives meaning to the types passed to [method get_driver_memory_by_object_type], [method get_driver_allocs_by_object_type], [method get_device_memory_by_object_type], and [method get_device_allocs_by_object_type]. Examples of strings it can return (not exhaustive):  
         *  - DEVICE_MEMORY  
         *  - PIPELINE_CACHE  
         *  - SWAPCHAIN_KHR  
         *  - COMMAND_POOL  
         *  Thus if e.g. `get_tracked_object_name(5)` returns "COMMAND_POOL", then `get_device_memory_by_object_type(5)` returns the bytes used by the GPU for command pools.  
         *  This is only used by Vulkan in debug builds. Godot must also be started with the `--extra-gpu-memory-tracking` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url].  
         */
        getTrackedObjectName(typeIndex: int64): string
        
        /** Returns how many types of trackable objects there are.  
         *  This is only used by Vulkan in debug builds. Godot must also be started with the `--extra-gpu-memory-tracking` [url=https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html]command line argument[/url].  
         */
        getTrackedObjectTypeCount(): int64
        
        /** Returns how much bytes the GPU driver is using for internal driver structures.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDriverTotalMemory(): int64
        
        /** Returns how many allocations the GPU driver has performed for internal driver structures.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDriverAllocationCount(): int64
        
        /** Same as [method get_driver_total_memory] but filtered for a given object type.  
         *  The type argument must be in range `[0; get_tracked_object_type_count - 1]`. If [method get_tracked_object_type_count] is 0, then type argument is ignored and always returns 0.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDriverMemoryByObjectType(type: int64): int64
        
        /** Same as [method get_driver_allocation_count] but filtered for a given object type.  
         *  The type argument must be in range `[0; get_tracked_object_type_count - 1]`. If [method get_tracked_object_type_count] is 0, then type argument is ignored and always returns 0.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDriverAllocsByObjectType(type: int64): int64
        
        /** Returns how much bytes the GPU is using.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDeviceTotalMemory(): int64
        
        /** Returns how many allocations the GPU has performed for internal driver structures.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDeviceAllocationCount(): int64
        
        /** Same as [method get_device_total_memory] but filtered for a given object type.  
         *  The type argument must be in range `[0; get_tracked_object_type_count - 1]`. If [method get_tracked_object_type_count] is 0, then type argument is ignored and always returns 0.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDeviceMemoryByObjectType(type: int64): int64
        
        /** Same as [method get_device_allocation_count] but filtered for a given object type.  
         *  The type argument must be in range `[0; get_tracked_object_type_count - 1]`. If [method get_tracked_object_type_count] is 0, then type argument is ignored and always returns 0.  
         *  This is only used by Vulkan in debug builds and can return 0 when this information is not tracked or unknown.  
         */
        getDeviceAllocsByObjectType(type: int64): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRenderingDevice;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRenderingDevice;
    }
    namespace Resource {
        enum DeepDuplicateMode {
            DeepDuplicateNone = 0,
            DeepDuplicateInternal = 1,
            DeepDuplicateAll = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResource extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResource extends __NameMapRefCounted {
        _setup_local_to_scene: "_setupLocalToScene";
        _get_rid: "_getRid";
        _reset_state: "_resetState";
        _set_path_cache: "_setPathCache";
        take_over_path: "takeOverPath";
        set_path_cache: "setPathCache";
        get_rid: "getRid";
        get_local_scene: "getLocalScene";
        setup_local_to_scene: "setupLocalToScene";
        reset_state: "resetState";
        set_id_for_path: "setIdForPath";
        get_id_for_path: "getIdForPath";
        is_built_in: "isBuiltIn";
        generate_scene_unique_id: "generateSceneUniqueId";
        emit_changed: "emitChanged";
        duplicate_deep: "duplicateDeep";
        copy_from_resource: "copyFromResource";
        resource_local_to_scene: "resourceLocalToScene";
        resource_path: "resourcePath";
        resource_name: "resourceName";
        resource_scene_unique_id: "resourceSceneUniqueId";
        setup_local_to_scene_requested: "setupLocalToSceneRequested";
    }
    /** Base class for serializable objects.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resource.html  
     */
    class Resource extends RefCounted {
        constructor(identifier?: any)
        /** Override this method to customize the newly duplicated resource created from [method PackedScene.instantiate], if the original's [member resource_local_to_scene] is set to `true`.  
         *  **Example:** Set a random `damage` value to every local resource from an instantiated scene:  
         *    
         */
        /* gdvirtual */ _setupLocalToScene(): void
        
        /** Override this method to return a custom [RID] when [method get_rid] is called. */
        /* gdvirtual */ _getRid(): Rid
        
        /** For resources that store state in non-exported properties, such as via [method Object._validate_property] or [method Object._get_property_list], this method must be implemented to clear them. */
        /* gdvirtual */ _resetState(): void
        
        /** Override this method to execute additional logic after [method set_path_cache] is called on this object. */
        /* gdvirtual */ _setPathCache(path: string): void
        
        /** Sets the [member resource_path] to [param path], potentially overriding an existing cache entry for this path. Further attempts to load an overridden resource by path will instead return this resource. */
        takeOverPath(path: string): void
        
        /** Sets the resource's path to [param path] without involving the resource cache. Useful for handling [enum ResourceFormatLoader.CacheMode] values when implementing a custom resource format by extending [ResourceFormatLoader] and [ResourceFormatSaver]. */
        setPathCache(path: string): void
        
        /** Returns the [RID] of this resource (or an empty RID). Many resources (such as [Texture2D], [Mesh], and so on) are high-level abstractions of resources stored in a specialized server ([DisplayServer], [RenderingServer], etc.), so this function will return the original [RID]. */
        getRid(): Rid
        
        /** If [member resource_local_to_scene] is set to `true` and the resource has been loaded from a [PackedScene] instantiation, returns the root [Node] of the scene where this resource is used. Otherwise, returns `null`. */
        getLocalScene(): null | Node
        
        /** Calls [method _setup_local_to_scene]. If [member resource_local_to_scene] is set to `true`, this method is automatically called from [method PackedScene.instantiate] by the newly duplicated resource within the scene instance. */
        setupLocalToScene(): void
        
        /** Makes the resource clear its non-exported properties. See also [method _reset_state]. Useful when implementing a custom resource format by extending [ResourceFormatLoader] and [ResourceFormatSaver]. */
        resetState(): void
        
        /** In the internal cache for scene-unique IDs, sets the ID of this resource to [param id] for the scene at [param path]. If [param id] is empty, the cache entry for [param path] is cleared. Useful to keep scene-unique IDs the same when implementing a VCS-friendly custom resource format by extending [ResourceFormatLoader] and [ResourceFormatSaver].  
         *      
         *  **Note:** This method is only implemented when running in an editor context.  
         */
        setIdForPath(path: string, id: string): void
        
        /** From the internal cache for scene-unique IDs, returns the ID of this resource for the scene at [param path]. If there is no entry, an empty string is returned. Useful to keep scene-unique IDs the same when implementing a VCS-friendly custom resource format by extending [ResourceFormatLoader] and [ResourceFormatSaver].  
         *      
         *  **Note:** This method is only implemented when running in an editor context. At runtime, it returns an empty string.  
         */
        getIdForPath(path: string): string
        
        /** Returns `true` if the resource is saved on disk as a part of another resource's file. */
        isBuiltIn(): boolean
        
        /** Generates a unique identifier for a resource to be contained inside a [PackedScene], based on the current date, time, and a random value. The returned string is only composed of letters (`a` to `y`) and numbers (`0` to `8`). See also [member resource_scene_unique_id]. */
        static generateSceneUniqueId(): string
        
        /** Emits the [signal changed] signal. This method is called automatically for some built-in resources.  
         *      
         *  **Note:** For custom resources, it's recommended to call this method whenever a meaningful change occurs, such as a modified property. This ensures that custom [Object]s depending on the resource are properly updated.  
         *    
         */
        emitChanged(): void
        
        /** Duplicates this resource, returning a new resource with its `export`ed or [constant PROPERTY_USAGE_STORAGE] properties copied from the original.  
         *  If [param deep] is `false`, a **shallow** copy is returned: nested [Array], [Dictionary], and [Resource] properties are not duplicated and are shared with the original resource.  
         *  If [param deep] is `true`, a **deep** copy is returned: all nested arrays, dictionaries, and packed arrays are also duplicated (recursively). Any [Resource] found inside will only be duplicated if it's local, like [constant DEEP_DUPLICATE_INTERNAL] used with [method duplicate_deep].  
         *  The following exceptions apply:  
         *  - Subresource properties with the [constant PROPERTY_USAGE_ALWAYS_DUPLICATE] flag are always duplicated (recursively or not, depending on [param deep]).  
         *  - Subresource properties with the [constant PROPERTY_USAGE_NEVER_DUPLICATE] flag are never duplicated.  
         *      
         *  **Note:** For custom resources, this method will fail if [method Object._init] has been defined with required parameters.  
         *      
         *  **Note:** When duplicating with [param deep] set to `true`, each resource found, including the one on which this method is called, will be only duplicated once and referenced as many times as needed in the duplicate. For instance, if you are duplicating resource A that happens to have resource B referenced twice, you'll get a new resource A' referencing a new resource B' twice.  
         */
        duplicate(deep?: boolean /* = false */): this
        
        /** Duplicates this resource, deeply, like [method duplicate] when passing `true`, with extra control over how subresources are handled. */
        duplicateDeep(deepSubresourcesMode?: Resource.DeepDuplicateMode /* = 1 */): null | Resource
        
        /** Copies the data from [param resource] into this resource. Both resources must share the same class. */
        copyFromResource(resource: Resource): GError
        
        /** If `true`, the resource is duplicated for each instance of all scenes using it. At run-time, the resource can be modified in one scene without affecting other instances (see [method PackedScene.instantiate]).  
         *      
         *  **Note:** Changing this property at run-time has no effect on already created duplicate resources.  
         */
        get resourceLocalToScene(): boolean
        set resourceLocalToScene(value: boolean)
        
        /** The unique path to this resource. If it has been saved to disk, the value will be its filepath. If the resource is exclusively contained within a scene, the value will be the [PackedScene]'s filepath, followed by a unique identifier.  
         *      
         *  **Note:** Setting this property manually may fail if a resource with the same path has already been previously loaded. If necessary, use [method take_over_path].  
         */
        get resourcePath(): string
        set resourcePath(value: string)
        
        /** An optional name for this resource. When defined, its value is displayed to represent the resource in the Inspector dock. For built-in scripts, the name is displayed as part of the tab name in the script editor.  
         *      
         *  **Note:** Some resource formats do not support resource names. You can still set the name in the editor or via code, but it will be lost when the resource is reloaded. For example, only built-in scripts can have a resource name, while scripts stored in separate files cannot.  
         */
        get resourceName(): string
        set resourceName(value: string)
        
        /** A unique identifier relative to this resource's scene. If left empty, the ID is automatically generated when this resource is saved inside a [PackedScene]. If the resource is not inside a scene, this property is empty by default.  
         *      
         *  **Note:** When the [PackedScene] is saved, if multiple resources in the same scene use the same ID, only the earliest resource in the scene hierarchy keeps the original ID. The other resources are assigned new IDs from [method generate_scene_unique_id].  
         *      
         *  **Note:** Setting this property does not emit the [signal changed] signal.  
         *  **Warning:** When setting, the ID must only consist of letters, numbers, and underscores. Otherwise, it will fail and default to a randomly generated ID.  
         */
        get resourceSceneUniqueId(): string
        set resourceSceneUniqueId(value: string)
        
        /** Emitted when the resource changes, usually when one of its properties is modified. See also [method emit_changed].  
         *      
         *  **Note:** This signal is not emitted automatically for properties of custom resources. If necessary, a setter needs to be created to emit the signal.  
         */
        readonly changed: Signal<() => void>
        
        /** Emitted by a newly duplicated resource with [member resource_local_to_scene] set to `true`. */
        readonly setupLocalToSceneRequested: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResource;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResource;
    }
    namespace ResourceFormatLoader {
        enum CacheMode {
            CacheModeIgnore = 0,
            CacheModeReuse = 1,
            CacheModeReplace = 2,
            CacheModeIgnoreDeep = 3,
            CacheModeReplaceDeep = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceFormatLoader extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceFormatLoader extends __NameMapRefCounted {
        _get_recognized_extensions: "_getRecognizedExtensions";
        _recognize_path: "_recognizePath";
        _handles_type: "_handlesType";
        _get_resource_type: "_getResourceType";
        _get_resource_script_class: "_getResourceScriptClass";
        _get_resource_uid: "_getResourceUid";
        _get_dependencies: "_getDependencies";
        _rename_dependencies: "_renameDependencies";
        _get_classes_used: "_getClassesUsed";
    }
    /** Loads a specific resource type from a file.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceformatloader.html  
     */
    class ResourceFormatLoader extends RefCounted {
        constructor(identifier?: any)
        /** Gets the list of extensions for files this loader is able to read. */
        /* gdvirtual */ _getRecognizedExtensions(): PackedStringArray
        
        /** Tells whether or not this loader should load a resource from its resource path for a given type.  
         *  If it is not implemented, the default behavior returns whether the path's extension is within the ones provided by [method _get_recognized_extensions], and if the type is within the ones provided by [method _get_resource_type].  
         */
        /* gdvirtual */ _recognizePath(path: string, type: StringName): boolean
        
        /** Tells which resource class this loader can load.  
         *      
         *  **Note:** Custom resource types defined by scripts aren't known by the [ClassDB], so you might just handle `"Resource"` for them.  
         */
        /* gdvirtual */ _handlesType(type: StringName): boolean
        
        /** Gets the class name of the resource associated with the given path. If the loader cannot handle it, it should return `""`.  
         *      
         *  **Note:** Custom resource types defined by scripts aren't known by the [ClassDB], so you might just return `"Resource"` for them.  
         */
        /* gdvirtual */ _getResourceType(path: string): string
        
        /** Returns the script class name associated with the [Resource] under the given [param path]. If the resource has no script or the script isn't a named class, it should return `""`. */
        /* gdvirtual */ _getResourceScriptClass(path: string): string
        
        /** Should return the unique ID for the resource associated with the given path. If this method is not overridden, a `.uid` file is generated along with the resource file, containing the unique ID. */
        /* gdvirtual */ _getResourceUid(path: string): int64
        
        /** Should return the dependencies for the resource at the given [param path]. Each dependency is a string composed of one to three sections separated by `::`, with trailing empty sections omitted:  
         *  - The first section should contain the UID if the resource has one. Otherwise, it should contain the file path.  
         *  - The second section should contain the class name of the dependency if [param add_types] is `true`. Otherwise, it should be empty.  
         *  - The third section should contain the fallback path if the resource has a UID. Otherwise, it should be empty.  
         *    
         *      
         *  **Note:** Custom resource types defined by scripts aren't known by the [ClassDB], so `"Resource"` can be used for the class name.  
         */
        /* gdvirtual */ _getDependencies(path: string, addTypes: boolean): PackedStringArray
        
        /** If implemented, renames dependencies within the given resource and saves it. [param renames] is a dictionary `{ String => String }` mapping old dependency paths to new paths.  
         *  Returns [constant OK] on success, or an [enum Error] constant in case of failure.  
         */
        /* gdvirtual */ _renameDependencies(path: string, renames: GDictionary): GError
        /* gdvirtual */ _exists(path: string): boolean
        /* gdvirtual */ _getClassesUsed(path: string): PackedStringArray
        
        /** Loads a resource when the engine finds this loader to be compatible. If the loaded resource is the result of an import, [param original_path] will target the source file. Returns a [Resource] object on success, or an [enum Error] constant in case of failure.  
         *  The [param cache_mode] property defines whether and how the cache should be used or updated when loading the resource. See [enum CacheMode] for details.  
         */
        /* gdvirtual */ _load(path: string, originalPath: string, useSubThreads: boolean, cacheMode: int64): any
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceFormatLoader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceFormatLoader;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceFormatSaver extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceFormatSaver extends __NameMapRefCounted {
        _set_uid: "_setUid";
        _get_recognized_extensions: "_getRecognizedExtensions";
        _recognize_path: "_recognizePath";
    }
    /** Saves a specific resource type to a file.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceformatsaver.html  
     */
    class ResourceFormatSaver extends RefCounted {
        constructor(identifier?: any)
        /** Saves the given resource object to a file at the target [param path]. [param flags] is a bitmask composed with [enum ResourceSaver.SaverFlags] constants.  
         *  Returns [constant OK] on success, or an [enum Error] constant in case of failure.  
         */
        /* gdvirtual */ _save(resource: Resource, path: string, flags: int64): GError
        
        /** Sets a new UID for the resource at the given [param path]. Returns [constant OK] on success, or an [enum Error] constant in case of failure. */
        /* gdvirtual */ _setUid(path: string, uid: int64): GError
        
        /** Returns whether the given resource object can be saved by this saver. */
        /* gdvirtual */ _recognize(resource: Resource): boolean
        
        /** Returns the list of extensions available for saving the resource object, provided it is recognized (see [method _recognize]). */
        /* gdvirtual */ _getRecognizedExtensions(resource: Resource): PackedStringArray
        
        /** Returns `true` if this saver handles a given save path and `false` otherwise.  
         *  If this method is not implemented, the default behavior returns whether the path's extension is within the ones provided by [method _get_recognized_extensions].  
         */
        /* gdvirtual */ _recognizePath(resource: Resource, path: string): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceFormatSaver;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceFormatSaver;
    }
    namespace ResourceImporter {
        enum ImportOrder {
            ImportOrderDefault = 0,
            ImportOrderScene = 100,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporter extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporter extends __NameMapRefCounted {
        _get_build_dependencies: "_getBuildDependencies";
    }
    /** Base class for resource importers.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporter.html  
     */
    class ResourceImporter extends RefCounted {
        constructor(identifier?: any)
        /** Called when the engine compilation profile editor wants to check what build options an imported resource needs. For example, [ResourceImporterDynamicFont] has a property called [member ResourceImporterDynamicFont.multichannel_signed_distance_field], that depends on the engine to be build with the "msdfgen" module. If that resource happened to be a custom one, it would be handled like this:  
         *    
         */
        /* gdvirtual */ _getBuildDependencies(path: string): PackedStringArray
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterBMFont extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterBMFont extends __NameMapResourceImporter {
    }
    /** Imports a bitmap font in the BMFont (`.fnt`) format.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterbmfont.html  
     */
    class ResourceImporterBMFont extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterBMFont;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterBMFont;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterBitMap extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterBitMap extends __NameMapResourceImporter {
    }
    /** Imports a [BitMap] resource (2D array of boolean values).  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterbitmap.html  
     */
    class ResourceImporterBitMap extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterBitMap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterBitMap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterCsvTranslation extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterCsvTranslation extends __NameMapResourceImporter {
    }
    class ResourceImporterCsvTranslation extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterCsvTranslation;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterCsvTranslation;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterDynamicFont extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterDynamicFont extends __NameMapResourceImporter {
    }
    /** Imports a TTF, TTC, OTF, OTC, WOFF or WOFF2 font file for font rendering that adapts to any size.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterdynamicfont.html  
     */
    class ResourceImporterDynamicFont extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterDynamicFont;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterDynamicFont;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterImage extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterImage extends __NameMapResourceImporter {
    }
    /** Imports an image for use in scripting, with no rendering capabilities.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterimage.html  
     */
    class ResourceImporterImage extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterImage;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterImage;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterImageFont extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterImageFont extends __NameMapResourceImporter {
    }
    /** Imports a bitmap font where all glyphs have the same width and height.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterimagefont.html  
     */
    class ResourceImporterImageFont extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterImageFont;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterImageFont;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterLayeredTexture extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterLayeredTexture extends __NameMapResourceImporter {
    }
    /** Imports a 3-dimensional texture ([Texture3D]), a [Texture2DArray], a [Cubemap] or a [CubemapArray].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterlayeredtexture.html  
     */
    class ResourceImporterLayeredTexture extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterLayeredTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterLayeredTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterMP3 extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterMP3 extends __NameMapResourceImporter {
    }
    /** Imports an MP3 audio file for playback.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimportermp3.html  
     */
    class ResourceImporterMP3 extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterMP3;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterMP3;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterObj extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterObj extends __NameMapResourceImporter {
    }
    class ResourceImporterObj extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterObj;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterObj;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterOggVorbis extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterOggVorbis extends __NameMapResourceImporter {
        load_from_buffer: "loadFromBuffer";
        load_from_file: "loadFromFile";
    }
    /** Imports an Ogg Vorbis audio file for playback.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporteroggvorbis.html  
     */
    class ResourceImporterOggVorbis extends ResourceImporter {
        constructor(identifier?: any)
        /** Creates a new [AudioStreamOggVorbis] instance from the given buffer. The buffer must contain Ogg Vorbis data. */
        static loadFromBuffer(streamData: PackedByteArray | byte[] | ArrayBuffer): null | AudioStreamOggVorbis
        
        /** Creates a new [AudioStreamOggVorbis] instance from the given file path. The file must be in Ogg Vorbis format. */
        static loadFromFile(path: string): null | AudioStreamOggVorbis
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterOggVorbis;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterOggVorbis;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterSvg extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterSvg extends __NameMapResourceImporter {
    }
    class ResourceImporterSvg extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterSvg;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterSvg;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterScene extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterScene extends __NameMapResourceImporter {
    }
    /** Imports a glTF, FBX, COLLADA, or Blender 3D scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterscene.html  
     */
    class ResourceImporterScene extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterScene;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterScene;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterShaderFile extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterShaderFile extends __NameMapResourceImporter {
    }
    /** Imports native GLSL shaders (not Godot shaders) as an [RDShaderFile].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimportershaderfile.html  
     */
    class ResourceImporterShaderFile extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterShaderFile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterShaderFile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterStreamedTexture extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterStreamedTexture extends __NameMapResourceImporter {
    }
    /** Imports an image as a streaming-capable texture for dynamic mipmap loading.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimporterstreamedtexture.html  
     */
    class ResourceImporterStreamedTexture extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterStreamedTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterStreamedTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterTexture extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterTexture extends __NameMapResourceImporter {
    }
    /** Imports an image for use in 2D or 3D rendering.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimportertexture.html  
     */
    class ResourceImporterTexture extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterTextureAtlas extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterTextureAtlas extends __NameMapResourceImporter {
    }
    /** Imports a collection of textures from a PNG image into an optimized [AtlasTexture] for 2D rendering.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourceimportertextureatlas.html  
     */
    class ResourceImporterTextureAtlas extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterTextureAtlas;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterTextureAtlas;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourceImporterWav extends __RPCMapResourceImporter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourceImporterWav extends __NameMapResourceImporter {
    }
    class ResourceImporterWav extends ResourceImporter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourceImporterWav;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourceImporterWav;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapResourcePreloader extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapResourcePreloader extends __NameMapNode {
        add_resource: "addResource";
        remove_resource: "removeResource";
        rename_resource: "renameResource";
        has_resource: "hasResource";
        get_resource: "getResource";
        get_resource_list: "getResourceList";
        _resource_changed: "_resourceChanged";
    }
    /** A node used to preload sub-resources inside a scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_resourcepreloader.html  
     */
    class ResourcePreloader<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Adds a resource to the preloader with the given [param name]. If a resource with the given [param name] already exists, the new resource will be renamed to "[param name] N" where N is an incrementing number starting from 2. */
        addResource(name: StringName, resource: Resource): void
        
        /** Removes the resource associated to [param name] from the preloader. */
        removeResource(name: StringName): void
        
        /** Renames a resource inside the preloader from [param name] to [param newname]. */
        renameResource(name: StringName, newname: StringName): void
        
        /** Returns `true` if the preloader contains a resource associated to [param name]. */
        hasResource(name: StringName): boolean
        
        /** Returns the resource associated to [param name]. */
        getResource(name: StringName): null | Resource
        
        /** Returns the list of resources inside the preloader. */
        getResourceList(): PackedStringArray
        get resources(): GArray
        set resources(value: GArray)
        readonly _resourceChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapResourcePreloader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapResourcePreloader;
    }
    namespace RetargetModifier3D {
        enum TransformFlag {
            TransformFlagPosition = 1,
            TransformFlagRotation = 2,
            TransformFlagScale = 4,
            TransformFlagAll = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRetargetModifier3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRetargetModifier3D extends __NameMapSkeletonModifier3D {
        set_position_enabled: "setPositionEnabled";
        is_position_enabled: "isPositionEnabled";
        set_rotation_enabled: "setRotationEnabled";
        is_rotation_enabled: "isRotationEnabled";
        set_scale_enabled: "setScaleEnabled";
        is_scale_enabled: "isScaleEnabled";
        copy_bone_skin_scale: "copyBoneSkinScale";
        use_global_pose: "useGlobalPose";
    }
    /** A modifier to transfer parent skeleton poses (or global poses) to child skeletons in model space with different rests.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_retargetmodifier3d.html  
     */
    class RetargetModifier3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Sets [constant TRANSFORM_FLAG_POSITION] into [member enable]. */
        setPositionEnabled(enabled: boolean): void
        
        /** Returns `true` if [member enable] has [constant TRANSFORM_FLAG_POSITION]. */
        isPositionEnabled(): boolean
        
        /** Sets [constant TRANSFORM_FLAG_ROTATION] into [member enable]. */
        setRotationEnabled(enabled: boolean): void
        
        /** Returns `true` if [member enable] has [constant TRANSFORM_FLAG_ROTATION]. */
        isRotationEnabled(): boolean
        
        /** Sets [constant TRANSFORM_FLAG_SCALE] into [member enable]. */
        setScaleEnabled(enabled: boolean): void
        
        /** Returns `true` if [member enable] has [constant TRANSFORM_FLAG_SCALE]. */
        isScaleEnabled(): boolean
        
        /** [SkeletonProfile] for retargeting bones with names matching the bone list. */
        get profile(): null | SkeletonProfile
        set profile(value: null | SkeletonProfile)
        
        /** If `true`, copies [method Skeleton3D.get_bone_skin_scale] of the source skeleton's bones to the child skeletons' mapped bones.  
         *  If `false`, the skin scale of the child skeletons' mapped bones are reset to `Vector3(1, 1, 1)` once and will not be overwritten after that.  
         *      
         *  **Note:** If you want to use [method Skeleton3D.set_bone_skin_scale] on a child skeleton's mapped bone, set this to `false`. Even if you are not using [method Skeleton3D.set_bone_skin_scale] with parent skeleton, `Vector3(1, 1, 1)` will always be set for the child skeletons' mapped bones.  
         */
        get copyBoneSkinScale(): boolean
        set copyBoneSkinScale(value: boolean)
        
        /** If `false`, in case the target skeleton has fewer bones than the source skeleton, the source bone parent's transform will be ignored.  
         *  Instead, it is possible to retarget between models with different body shapes, and position, rotation, and scale can be retargeted separately.  
         *  If `true`, retargeting is performed taking into account global pose.  
         *  In case the target skeleton has fewer bones than the source skeleton, the source bone parent's transform is taken into account. However, bone length between skeletons must match exactly, if not, the bones will be forced to expand or shrink.  
         *  This is useful for using dummy bone with length `0` to match postures when retargeting between models with different number of bones.  
         */
        get useGlobalPose(): boolean
        set useGlobalPose(value: boolean)
        
        /** Flags to control the process of the transform elements individually when [member use_global_pose] is disabled. */
        get enable(): int64
        set enable(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRetargetModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRetargetModifier3D;
    }
    namespace RibbonTrailMesh {
        enum Shape {
            ShapeFlat = 0,
            ShapeCross = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRibbonTrailMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRibbonTrailMesh extends __NameMapPrimitiveMesh {
        section_length: "sectionLength";
        section_segments: "sectionSegments";
    }
    /** Represents a straight ribbon-shaped [PrimitiveMesh] with variable width.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_ribbontrailmesh.html  
     */
    class RibbonTrailMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Determines the shape of the ribbon. */
        get shape(): int64
        set shape(value: int64)
        
        /** The baseline size of the ribbon. The size of a particular section segment is obtained by multiplying this size by the value of the [member curve] at the given distance. */
        get size(): float64
        set size(value: float64)
        
        /** The total number of sections on the ribbon. */
        get sections(): int64
        set sections(value: int64)
        
        /** The length of a section of the ribbon. */
        get sectionLength(): float64
        set sectionLength(value: float64)
        
        /** The number of segments in a section. The [member curve] is sampled on each segment to determine its size. Higher values result in a more detailed ribbon at the cost of performance. */
        get sectionSegments(): int64
        set sectionSegments(value: int64)
        
        /** Determines the size of the ribbon along its length. The size of a particular section segment is obtained by multiplying the baseline [member size] by the value of this curve at the given distance. For values smaller than `0`, the faces will be inverted. Should be a unit [Curve]. */
        get curve(): null | Curve
        set curve(value: null | Curve)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRibbonTrailMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRibbonTrailMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRichTextEffect extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRichTextEffect extends __NameMapResource {
        _process_custom_fx: "_processCustomFX";
    }
    /** A custom effect for a [RichTextLabel].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_richtexteffect.html  
     */
    class RichTextEffect extends Resource {
        constructor(identifier?: any)
        /** Override this method to modify properties in [param char_fx]. The method must return `true` if the character could be transformed successfully. If the method returns `false`, it will skip transformation to avoid displaying broken text. */
        /* gdvirtual */ _processCustomFX(charFX: CharFXTransform): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRichTextEffect;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRichTextEffect;
    }
    namespace RichTextLabel {
        enum ListType {
            ListNumbers = 0,
            ListLetters = 1,
            ListRoman = 2,
            ListDots = 3,
        }
        enum MenuItems {
            MenuCopy = 0,
            MenuSelectAll = 1,
            MenuMax = 2,
        }
        enum MetaUnderline {
            MetaUnderlineNever = 0,
            MetaUnderlineAlways = 1,
            MetaUnderlineOnHover = 2,
        }
        enum ImageUpdateMask {
            UpdateTexture = 1,
            UpdateSize = 2,
            UpdateColor = 4,
            UpdateAlignment = 8,
            UpdateRegion = 16,
            UpdatePad = 32,
            UpdateTooltip = 64,
            UpdateWidthUnit = 128,
        }
        enum ResourceAccessFlag {
            ResourceAccessResources = 1,
            ResourceAccessUserdata = 2,
            ResourceAccessFilesystem = 4,
            ResourceAccessPipe = 8,
            ResourceAccessNetwork = 16,
        }
        enum ImageUnit {
            ImageUnitPixel = 0,
            ImageUnitPercent = 1,
            ImageUnitEm = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRichTextLabel extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRichTextLabel extends __NameMapControl {
        get_parsed_text: "getParsedText";
        add_text: "addText";
        add_hr: "addHr";
        add_image: "addImage";
        update_image: "updateImage";
        remove_paragraph: "removeParagraph";
        invalidate_paragraph: "invalidateParagraph";
        push_font: "pushFont";
        push_font_size: "pushFontSize";
        push_normal: "pushNormal";
        push_bold: "pushBold";
        push_bold_italics: "pushBoldItalics";
        push_italics: "pushItalics";
        push_mono: "pushMono";
        push_color: "pushColor";
        push_outline_size: "pushOutlineSize";
        push_outline_color: "pushOutlineColor";
        push_paragraph: "pushParagraph";
        push_indent: "pushIndent";
        push_list: "pushList";
        push_meta: "pushMeta";
        push_hint: "pushHint";
        push_language: "pushLanguage";
        push_underline: "pushUnderline";
        push_strikethrough: "pushStrikethrough";
        push_table: "pushTable";
        push_dropcap: "pushDropcap";
        set_table_column_expand: "setTableColumnExpand";
        set_table_column_name: "setTableColumnName";
        set_cell_row_background_color: "setCellRowBackgroundColor";
        set_cell_border_color: "setCellBorderColor";
        set_cell_size_override: "setCellSizeOverride";
        set_cell_padding: "setCellPadding";
        push_cell: "pushCell";
        push_fgcolor: "pushFgcolor";
        push_bgcolor: "pushBgcolor";
        push_customfx: "pushCustomfx";
        push_context: "pushContext";
        pop_context: "popContext";
        pop_all: "popAll";
        get_v_scroll_bar: "getVScrollBar";
        scroll_to_line: "scrollToLine";
        scroll_to_paragraph: "scrollToParagraph";
        scroll_to_selection: "scrollToSelection";
        get_rendered_font_size: "getRenderedFontSize";
        get_selection_from: "getSelectionFrom";
        get_selection_to: "getSelectionTo";
        get_selection_line_offset: "getSelectionLineOffset";
        select_all: "selectAll";
        get_selected_text: "getSelectedText";
        parse_bbcode: "parseBbcode";
        append_text: "appendText";
        is_ready: "isReady";
        is_finished: "isFinished";
        get_character_line: "getCharacterLine";
        get_character_paragraph: "getCharacterParagraph";
        get_total_character_count: "getTotalCharacterCount";
        get_line_count: "getLineCount";
        get_line_range: "getLineRange";
        get_visible_line_count: "getVisibleLineCount";
        get_paragraph_count: "getParagraphCount";
        get_visible_paragraph_count: "getVisibleParagraphCount";
        get_content_height: "getContentHeight";
        get_content_width: "getContentWidth";
        get_line_height: "getLineHeight";
        get_line_width: "getLineWidth";
        get_visible_content_rect: "getVisibleContentRect";
        get_line_offset: "getLineOffset";
        get_paragraph_offset: "getParagraphOffset";
        parse_expressions_for_values: "parseExpressionsForValues";
        install_effect: "installEffect";
        reload_effects: "reloadEffects";
        get_menu: "getMenu";
        is_menu_visible: "isMenuVisible";
        menu_option: "menuOption";
        resource_access_flags: "resourceAccessFlags";
        bbcode_enabled: "bbcodeEnabled";
        fit_content: "fitContent";
        scroll_active: "scrollActive";
        scroll_following: "scrollFollowing";
        scroll_following_visible_characters: "scrollFollowingVisibleCharacters";
        autowrap_mode: "autowrapMode";
        autowrap_trim_flags: "autowrapTrimFlags";
        tab_size: "tabSize";
        context_menu_enabled: "contextMenuEnabled";
        shortcut_keys_enabled: "shortcutKeysEnabled";
        horizontal_alignment: "horizontalAlignment";
        vertical_alignment: "verticalAlignment";
        justification_flags: "justificationFlags";
        tab_stops: "tabStops";
        custom_effects: "customEffects";
        meta_underlined: "metaUnderlined";
        hint_underlined: "hintUnderlined";
        progress_bar_delay: "progressBarDelay";
        selection_enabled: "selectionEnabled";
        deselect_on_focus_loss_enabled: "deselectOnFocusLossEnabled";
        drag_and_drop_selection_enabled: "dragAndDropSelectionEnabled";
        resize_font_to_fit: "resizeFontToFit";
        minimum_font_size: "minimumFontSize";
        maximum_font_size: "maximumFontSize";
        visible_characters: "visibleCharacters";
        visible_characters_behavior: "visibleCharactersBehavior";
        visible_ratio: "visibleRatio";
        text_direction: "textDirection";
        structured_text_bidi_override: "structuredTextBidiOverride";
        structured_text_bidi_override_options: "structuredTextBidiOverrideOptions";
        meta_clicked: "metaClicked";
        meta_hover_started: "metaHoverStarted";
        meta_hover_ended: "metaHoverEnded";
    }
    /** A control for displaying text that can contain different font styles, images, and basic formatting.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_richtextlabel.html  
     */
    class RichTextLabel<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Returns the text without BBCode mark-up. */
        getParsedText(): string
        
        /** Adds raw non-BBCode-parsed text to the tag stack. */
        addText(text: string): void
        
        /** Adds a horizontal rule that can be used to separate content.  
         *  If [param width_in_percent] is set, [param width] values are percentages of the control width instead of pixels.  
         *  If [param height_in_percent] is set, [param height] values are percentages of the control width instead of pixels.  
         */
        addHr(width?: int64 /* = 90 */, height?: int64 /* = 2 */, color?: Color /* = new Color(1, 1, 1, 1) */, alignment?: HorizontalAlignment /* = 1 */, widthInPercent?: boolean /* = true */, heightInPercent?: boolean /* = false */): void
        
        /** Adds an image's opening and closing tags to the tag stack, optionally providing a [param width] and [param height] to resize the image, a [param color] to tint the image and a [param region] to only use parts of the image.  
         *  If [param width] or [param height] is set to 0, the image size will be adjusted in order to keep the original aspect ratio.  
         *  If [param width] and [param height] are not set, but [param region] is, the region's rect will be used.  
         *  [param key] is an optional identifier, that can be used to modify the image via [method update_image].  
         *  If [param pad] is set, and the image is smaller than the size specified by [param width] and [param height], the image padding is added to match the size instead of upscaling.  
         *  Parameters [param width_unit] and [param height_unit] determine the units used to calculate the image width and height, respectively.  
         *  [param alt_text] is used as the image description for assistive apps.  
         */
        addImage(image: Texture2D, width?: float64 /* = 0 */, height?: float64 /* = 0 */, color?: Color /* = new Color(1, 1, 1, 1) */, inlineAlign?: InlineAlignment /* = 5 */, region?: Rect2 /* = new Rect2(0, 0, 0, 0) */, key?: any /* = {} */, pad?: boolean /* = false */, tooltip?: string /* = '' */, widthUnit?: RichTextLabel.ImageUnit /* = 0 */, heightUnit?: RichTextLabel.ImageUnit /* = 0 */, altText?: string /* = '' */): void
        
        /** Updates the existing images with the key [param key]. Only properties specified by [param mask] bits are updated. See [method add_image]. */
        updateImage(key: any, mask: RichTextLabel.ImageUpdateMask, image: Texture2D, width?: float64 /* = 0 */, height?: float64 /* = 0 */, color?: Color /* = new Color(1, 1, 1, 1) */, inlineAlign?: InlineAlignment /* = 5 */, region?: Rect2 /* = new Rect2(0, 0, 0, 0) */, pad?: boolean /* = false */, tooltip?: string /* = '' */, widthUnit?: RichTextLabel.ImageUnit /* = 0 */, heightUnit?: RichTextLabel.ImageUnit /* = 0 */): void
        
        /** Adds a newline tag to the tag stack. */
        newline(): void
        
        /** Removes a paragraph of content from the label. Returns `true` if the paragraph exists.  
         *  The [param paragraph] argument is the index of the paragraph to remove, it can take values in the interval `[0, get_paragraph_count() - 1]`.  
         *  If [param no_invalidate] is set to `true`, the cache for the subsequent paragraphs is not invalidated. Use it for faster updates if the deleted paragraph is fully self-contained (has no unclosed tags), or this call is part of a complex edit operation and [method invalidate_paragraph] will be called at the end of the operation.  
         */
        removeParagraph(paragraph: int64, noInvalidate?: boolean /* = false */): boolean
        
        /** Invalidates [param paragraph] and all subsequent paragraphs cache. */
        invalidateParagraph(paragraph: int64): boolean
        
        /** Adds a [code skip-lint][font]` tag to the tag stack. Overrides default fonts for its duration.  
         *  Passing `0` to [param font_size] will use the existing default font size.  
         */
        pushFont(font: Font, fontSize?: int64 /* = 0 */): void
        
        /** Adds a [code skip-lint][font_size]` tag to the tag stack. Overrides default font size for its duration. */
        pushFontSize(fontSize: int64): void
        
        /** Adds a [code skip-lint][font]` tag with a normal font to the tag stack. */
        pushNormal(): void
        
        /** Adds a [code skip-lint][font]` tag with a bold font to the tag stack. This is the same as adding a [code skip-lint]**` tag if not currently in a [code skip-lint] *` tag. */
        pushBold(): void
        
        /** Adds a [code skip-lint][font]` tag with a bold italics font to the tag stack. */
        pushBoldItalics(): void
        
        /** Adds a [code skip-lint][font]` tag with an italics font to the tag stack. This is the same as adding an [code skip-lint] *` tag if not currently in a [code skip-lint]**` tag. */
        pushItalics(): void
        
        /** Adds a [code skip-lint][font]` tag with a monospace font to the tag stack. */
        pushMono(): void
        
        /** Adds a [code skip-lint][color]` tag to the tag stack. */
        pushColor(color: Color): void
        
        /** Adds a [code skip-lint][outline_size]` tag to the tag stack. Overrides default text outline size for its duration. */
        pushOutlineSize(outlineSize: int64): void
        
        /** Adds a [code skip-lint][outline_color]` tag to the tag stack. Adds text outline for its duration. */
        pushOutlineColor(color: Color): void
        
        /** Adds a [code skip-lint][p]` tag to the tag stack. */
        pushParagraph(alignment: HorizontalAlignment, baseDirection?: Control.TextDirection /* = 0 */, language?: string /* = '' */, stParser?: TextServer.StructuredTextParser /* = 0 */, justificationFlags?: TextServer.JustificationFlag /* = 163 */, tabStops?: PackedFloat32Array | float32[] /* = [] */): void
        
        /** Adds an [code skip-lint][indent]` tag to the tag stack. Multiplies [param level] by current [member tab_size] to determine new margin length. */
        pushIndent(level: int64): void
        
        /** Adds [code skip-lint][ol]` or [code skip-lint][ul]` tag to the tag stack. Multiplies [param level] by current [member tab_size] to determine new margin length. */
        pushList(level: int64, type: RichTextLabel.ListType, capitalize: boolean, bullet?: string /* = '•' */): void
        
        /** Adds a meta tag to the tag stack. Similar to the BBCode [code skip-lint][url=something]{text}[/url]`, but supports non-[String] metadata types.  
         *  If [member meta_underlined] is `true`, meta tags display an underline. This behavior can be customized with [param underline_mode].  
         *      
         *  **Note:** Meta tags do nothing by default when clicked. To assign behavior when clicked, connect [signal meta_clicked] to a function that is called when the meta tag is clicked.  
         */
        pushMeta(data: any, underlineMode?: RichTextLabel.MetaUnderline /* = 1 */, tooltip?: string /* = '' */): void
        
        /** Adds a [code skip-lint][hint]` tag to the tag stack. Same as BBCode [code skip-lint][hint=something]{text}[/hint]`. */
        pushHint(description: string): void
        
        /** Adds language code used for text shaping algorithm and Open-Type font features. */
        pushLanguage(language: string): void
        
        /** Adds a [code skip-lint][u]` tag to the tag stack. If [param color]'s alpha value is `0.0`, the current font's color with its alpha multiplied by [theme_item underline_alpha] is used. */
        pushUnderline(color?: Color /* = new Color(0, 0, 0, 0) */): void
        
        /** Adds a [code skip-lint][s]` tag to the tag stack. If [param color]'s alpha value is `0.0`, the current font's color with its alpha multiplied by [theme_item strikethrough_alpha] is used. */
        pushStrikethrough(color?: Color /* = new Color(0, 0, 0, 0) */): void
        
        /** Adds a [code skip-lint][table=columns,inline_align]` tag to the tag stack. Use [method set_table_column_expand] to set column expansion ratio. Use [method push_cell] to add cells. [param name] is used as the table name for assistive apps. */
        pushTable(columns: int64, inlineAlign?: InlineAlignment /* = 0 */, alignToRow?: int64 /* = -1 */, name?: string /* = '' */): void
        
        /** Adds a [code skip-lint][dropcap]` tag to the tag stack. Drop cap (dropped capital) is a decorative element at the beginning of a paragraph that is larger than the rest of the text. */
        pushDropcap(string_: string, font: Font, size: int64, dropcapMargins?: Rect2 /* = new Rect2(0, 0, 0, 0) */, color?: Color /* = new Color(1, 1, 1, 1) */, outlineSize?: int64 /* = 0 */, outlineColor?: Color /* = new Color(0, 0, 0, 0) */): void
        
        /** Edits the selected column's expansion options. If [param expand] is `true`, the column expands in proportion to its expansion ratio versus the other columns' ratios.  
         *  For example, 2 columns with ratios 3 and 4 plus 70 pixels in available width would expand 30 and 40 pixels, respectively.  
         *  If [param expand] is `false`, the column will not contribute to the total ratio.  
         */
        setTableColumnExpand(column: int64, expand: boolean, ratio?: int64 /* = 1 */, shrink?: boolean /* = true */): void
        
        /** Sets table column name for assistive apps. */
        setTableColumnName(column: int64, name: string): void
        
        /** Sets the color of a table cell. Separate colors for alternating rows can be specified. */
        setCellRowBackgroundColor(oddRowBg: Color, evenRowBg: Color): void
        
        /** Sets the color of a table cell's border. */
        setCellBorderColor(color: Color): void
        
        /** Sets minimum and maximum size overrides for a table cell. */
        setCellSizeOverride(minSize: Vector2, maxSize: Vector2): void
        
        /** Sets inner padding of a table cell. */
        setCellPadding(padding: Rect2): void
        
        /** Adds a [code skip-lint][cell]` tag to the tag stack. Must be inside a [code skip-lint][table]` tag. See [method push_table] for details. Use [method set_table_column_expand] to set column expansion ratio, [method set_cell_border_color] to set cell border, [method set_cell_row_background_color] to set cell background, [method set_cell_size_override] to override cell size, and [method set_cell_padding] to set padding. */
        pushCell(): void
        
        /** Adds a [code skip-lint][fgcolor]` tag to the tag stack.  
         *      
         *  **Note:** The foreground color has padding applied by default, which is controlled using [theme_item text_highlight_h_padding] and [theme_item text_highlight_v_padding]. This can lead to overlapping highlights if foreground colors are placed on neighboring lines/columns, so consider setting those theme items to `0` if you want to avoid this.  
         */
        pushFgcolor(fgcolor: Color): void
        
        /** Adds a [code skip-lint][bgcolor]` tag to the tag stack.  
         *      
         *  **Note:** The background color has padding applied by default, which is controlled using [theme_item text_highlight_h_padding] and [theme_item text_highlight_v_padding]. This can lead to overlapping highlights if background colors are placed on neighboring lines/columns, so consider setting those theme items to `0` if you want to avoid this.  
         */
        pushBgcolor(bgcolor: Color): void
        
        /** Adds a custom effect tag to the tag stack. The effect does not need to be in [member custom_effects]. The environment is directly passed to the effect. */
        pushCustomfx(effect: RichTextEffect, env: GDictionary): void
        
        /** Adds a context marker to the tag stack. See [method pop_context]. */
        pushContext(): void
        
        /** Terminates tags opened after the last [method push_context] call (including context marker), or all tags if there's no context marker on the stack. */
        popContext(): void
        
        /** Terminates the current tag. Use after `push_*` methods to close BBCodes manually. Does not need to follow `add_*` methods. */
        pop(): void
        
        /** Terminates all tags opened by `push_*` methods. */
        popAll(): void
        
        /** Clears the tag stack, causing the label to display nothing.  
         *      
         *  **Note:** This method does not affect [member text], and its contents will show again if the label is redrawn. However, setting [member text] to an empty [String] also clears the stack.  
         */
        clear(): void
        
        /** Returns the vertical scrollbar.  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member CanvasItem.visible] property.  
         */
        getVScrollBar(): null | VScrollBar
        
        /** Scrolls the window's top line to match [param line]. */
        scrollToLine(line: int64): void
        
        /** Scrolls the window's top line to match the first line of the [param paragraph]. */
        scrollToParagraph(paragraph: int64): void
        
        /** Scrolls to the beginning of the current selection. */
        scrollToSelection(): void
        
        /** Returns the font size that is currently used for rendering. When [member resize_font_to_fit] is enabled, this returns the automatically calculated font size. Otherwise, it returns the theme font size. */
        getRenderedFontSize(): int64
        
        /** Returns the current selection's first character index if a selection is active, `-1` otherwise. Does not include BBCodes. */
        getSelectionFrom(): int64
        
        /** Returns the current selection's last character index if a selection is active, `-1` otherwise. Does not include BBCodes. */
        getSelectionTo(): int64
        
        /** Returns the current selection's vertical line offset if a selection is active, `-1.0` otherwise. */
        getSelectionLineOffset(): float64
        
        /** Selects all the text.  
         *  If [member selection_enabled] is `false`, no selection occurs.  
         */
        selectAll(): void
        
        /** Returns the current selection text. Does not include BBCodes. */
        getSelectedText(): string
        
        /** Clears the current selection. */
        deselect(): void
        
        /** The assignment version of [method append_text]. Clears the tag stack and inserts the new content. */
        parseBbcode(bbcode: string): void
        
        /** Parses [param bbcode] and adds tags to the tag stack as needed.  
         *      
         *  **Note:** Using this method, you can't close a tag that was opened in a previous [method append_text] call. This is done to improve performance, especially when updating large RichTextLabels since rebuilding the whole BBCode every time would be slower. If you absolutely need to close a tag in a future method call, append the [member text] instead of using [method append_text].  
         */
        appendText(bbcode: string): void
        
        /** If [member threaded] is enabled, returns `true` if the background thread has finished text processing, otherwise always returns `true`. */
        isReady(): boolean
        
        /** If [member threaded] is enabled, returns `true` if the background thread has finished text processing, otherwise always returns `true`. */
        isFinished(): boolean
        
        /** Returns the line number of the character position provided. Line and character numbers are both zero-indexed.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getCharacterLine(character: int64): int64
        
        /** Returns the paragraph number of the character position provided. Paragraph and character numbers are both zero-indexed.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getCharacterParagraph(character: int64): int64
        
        /** Returns the total number of characters from text tags. Does not include BBCodes. */
        getTotalCharacterCount(): int64
        
        /** Returns the total number of lines in the text. Wrapped text is counted as multiple lines.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getLineCount(): int64
        
        /** Returns the indexes of the first and last visible characters for the given [param line], as a [Vector2i].  
         *      
         *  **Note:** If [member visible_characters_behavior] is set to [constant TextServer.VC_CHARS_BEFORE_SHAPING] only visible wrapped lines are counted.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getLineRange(line: int64): Vector2I
        
        /** Returns the number of visible lines.  
         *      
         *  **Note:** This method returns a correct value only after the label has been drawn.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getVisibleLineCount(): int64
        
        /** Returns the total number of paragraphs (newlines or `p` tags in the tag stack's text tags). Considers wrapped text as one paragraph. */
        getParagraphCount(): int64
        
        /** Returns the number of visible paragraphs. A paragraph is considered visible if at least one of its lines is visible.  
         *      
         *  **Note:** This method returns a correct value only after the label has been drawn.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getVisibleParagraphCount(): int64
        
        /** Returns the height of the content.  
         *      
         *  **Note:** This method always returns the full content size, and is not affected by [member visible_ratio] and [member visible_characters]. To get the visible content size, use [method get_visible_content_rect].  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getContentHeight(): int64
        
        /** Returns the width of the content.  
         *      
         *  **Note:** This method always returns the full content size, and is not affected by [member visible_ratio] and [member visible_characters]. To get the visible content size, use [method get_visible_content_rect].  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getContentWidth(): int64
        
        /** Returns the height of the line found at the provided index.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getLineHeight(line: int64): int64
        
        /** Returns the width of the line found at the provided index.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getLineWidth(line: int64): int64
        
        /** Returns the bounding rectangle of the visible content.  
         *      
         *  **Note:** This method returns a correct value only after the label has been drawn.  
         *    
         */
        getVisibleContentRect(): Rect2I
        
        /** Returns the vertical offset of the line found at the provided index.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getLineOffset(line: int64): float64
        
        /** Returns the vertical offset of the paragraph found at the provided index.  
         *      
         *  **Note:** If [member threaded] is enabled, this method returns a value for the loaded part of the document. Use [method is_finished] or [signal finished] to determine whether the document is fully loaded.  
         */
        getParagraphOffset(paragraph: int64): float64
        
        /** Parses BBCode parameter [param expressions] into a dictionary. */
        parseExpressionsForValues(expressions: PackedStringArray | string[]): GDictionary
        
        /** Installs a custom effect. This can also be done in the Inspector through the [member custom_effects] property. [param effect] should be a valid [RichTextEffect].  
         *  **Example:** With the following script extending from [RichTextEffect]:  
         *    
         *  The above effect can be installed in [RichTextLabel] from a script:  
         *    
         */
        installEffect(effect: any): void
        
        /** Reloads custom effects. Useful when [member custom_effects] is modified manually. */
        reloadEffects(): void
        
        /** Returns the [PopupMenu] of this [RichTextLabel]. By default, this menu is displayed when right-clicking on the [RichTextLabel].  
         *  You can add custom menu items or remove standard ones. Make sure your IDs don't conflict with the standard ones (see [enum MenuItems]). For example:  
         *    
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to hide it or any of its children, use their [member Window.visible] property.  
         */
        getMenu(): null | PopupMenu
        
        /** Returns whether the menu is visible. Use this instead of `get_menu().visible` to improve performance (so the creation of the menu is avoided). */
        isMenuVisible(): boolean
        
        /** Executes a given action as defined in the [enum MenuItems] enum. */
        menuOption(option: int64): void
        
        /** The set of locations BBCode is allowed to load resource files from. */
        get resourceAccessFlags(): int64
        set resourceAccessFlags(value: int64)
        
        /** If `true`, the label uses BBCode formatting.  
         *      
         *  **Note:** This only affects the contents of [member text], not the tag stack.  
         */
        get bbcodeEnabled(): boolean
        set bbcodeEnabled(value: boolean)
        
        /** The label's text in BBCode format. Is not representative of manual modifications to the internal tag stack. Erases changes made by other methods when edited.  
         *      
         *  **Note:** If [member bbcode_enabled] is `true`, it is recommended not to use the `+=` operator with [member text] (e.g., `text += "some string"`) as it replaces the whole text and can cause slowdowns. It will also erase all BBCode that was added to the stack using the `push_*` methods. Use [method append_text] for adding text instead, unless you absolutely need to close a tag that was opened in an earlier method call.  
         */
        get text(): string
        set text(value: string)
        
        /** If `true`, the label's minimum size will be automatically updated to fit its content, matching the behavior of [Label].  
         *      
         *  **Note:** RichTextLabels with autowrapping and [member fit_content] enabled must have a custom maximum width configured to work correctly, either through the RichTextLabel's own [member Control.custom_maximum_size] or as a result of a propagated maximum size from a parent Control with [member Control.propagate_maximum_size] enabled.  
         */
        get fitContent(): boolean
        set fitContent(value: boolean)
        
        /** If `true`, the scrollbar is visible. Setting this to `false` does not block scrolling completely. See [method scroll_to_line]. */
        get scrollActive(): boolean
        set scrollActive(value: boolean)
        
        /** If `true`, the window scrolls down to display new content automatically. */
        get scrollFollowing(): boolean
        set scrollFollowing(value: boolean)
        
        /** If `true`, the window scrolls to display the last visible line when [member visible_characters] or [member visible_ratio] is changed. */
        get scrollFollowingVisibleCharacters(): boolean
        set scrollFollowingVisibleCharacters(value: boolean)
        
        /** If set to something other than [constant TextServer.AUTOWRAP_OFF], the text gets wrapped inside the node's bounding rectangle.  
         *      
         *  **Note:** RichTextLabels with autowrapping and [member fit_content] enabled must have a custom maximum width configured to work correctly, either through the RichTextLabel's own [member Control.custom_maximum_size] or as a result of a propagated maximum size from a parent Control with [member Control.propagate_maximum_size] enabled.  
         */
        get autowrapMode(): int64
        set autowrapMode(value: int64)
        
        /** Autowrap space trimming flags. See [constant TextServer.BREAK_TRIM_START_EDGE_SPACES] and [constant TextServer.BREAK_TRIM_END_EDGE_SPACES] for more info. */
        get autowrapTrimFlags(): int64
        set autowrapTrimFlags(value: int64)
        
        /** The number of spaces associated with a single tab length. Does not affect `\t` in text tags, only indent tags. */
        get tabSize(): int64
        set tabSize(value: int64)
        
        /** If `true`, a right-click displays the context menu. */
        get contextMenuEnabled(): boolean
        set contextMenuEnabled(value: boolean)
        
        /** If `true`, shortcut keys for context menu items are enabled, even if the context menu is disabled. */
        get shortcutKeysEnabled(): boolean
        set shortcutKeysEnabled(value: boolean)
        
        /** Controls the text's horizontal alignment. Supports left, center, right, and fill (also known as justify). */
        get horizontalAlignment(): int64
        set horizontalAlignment(value: int64)
        
        /** Controls the text's vertical alignment. Supports top, center, bottom, and fill. */
        get verticalAlignment(): int64
        set verticalAlignment(value: int64)
        
        /** Line fill alignment rules. */
        get justificationFlags(): int64
        set justificationFlags(value: int64)
        
        /** Aligns text to the given tab-stops. */
        get tabStops(): PackedFloat32Array
        set tabStops(value: PackedFloat32Array | float32[])
        
        /** The currently installed custom effects. This is an array of [RichTextEffect]s.  
         *  To add a custom effect, it's more convenient to use [method install_effect].  
         */
        get customEffects(): GArray<RichTextEffect>
        set customEffects(value: GArray<RichTextEffect>)
        
        /** If `true`, the label underlines meta tags such as [code skip-lint][url]{text}[/url]`. These tags can call a function when clicked if [signal meta_clicked] is connected to a function. */
        get metaUnderlined(): boolean
        set metaUnderlined(value: boolean)
        
        /** If `true`, the label underlines hint tags such as [code skip-lint][hint=description]{text}[/hint]`. */
        get hintUnderlined(): boolean
        set hintUnderlined(value: boolean)
        
        /** If `true`, text processing is done in a background thread. */
        get threaded(): boolean
        set threaded(value: boolean)
        
        /** The delay after which the loading progress bar is displayed, in milliseconds. Set to `-1` to disable the progress bar entirely.  
         *      
         *  **Note:** The progress bar is displayed only if [member threaded] is enabled.  
         */
        get progressBarDelay(): int64
        set progressBarDelay(value: int64)
        
        /** If `true`, the label allows text selection. */
        get selectionEnabled(): boolean
        set selectionEnabled(value: boolean)
        
        /** If `true`, the selected text will be deselected when focus is lost. */
        get deselectOnFocusLossEnabled(): boolean
        set deselectOnFocusLossEnabled(value: boolean)
        
        /** If `true`, allow drag and drop of selected text. */
        get dragAndDropSelectionEnabled(): boolean
        set dragAndDropSelectionEnabled(value: boolean)
        
        /** If `true`, the text size will automatically shrink or grow to fit within the node's bounding rectangle. It will pick the largest font size between [member minimum_font_size] and [member maximum_font_size] that doesn't cause the text to be truncated.  
         *  Font sizes that are overridden with the [code skip-lint][font_size]` tag are scaled relative to the theme font size. For example, if the theme font size is `16` and [code skip-lint][font_size=24]` is used with an automatic font size determined to be `32`, text in the overridden block will be in size `48`.  
         */
        get resizeFontToFit(): boolean
        set resizeFontToFit(value: boolean)
        
        /** The minimum font size used when [member resize_font_to_fit] is enabled. Also determines the minimum vertical size of this [RichTextLabel], potentially used by a parent [Container]. If [member minimum_font_size] is greater than [member maximum_font_size], the minimum font size takes precedence. */
        get minimumFontSize(): int64
        set minimumFontSize(value: int64)
        
        /** The maximum font size used when [member resize_font_to_fit] is enabled. If [member minimum_font_size] is greater than [member maximum_font_size], the minimum font size takes precedence. */
        get maximumFontSize(): int64
        set maximumFontSize(value: int64)
        
        /** The number of characters to display. If set to `-1`, all characters are displayed. This can be useful when animating the text appearing in a dialog box.  
         *      
         *  **Note:** Setting this property updates [member visible_ratio] accordingly.  
         *      
         *  **Note:** Characters are counted as Unicode codepoints. A single visible grapheme may contain multiple codepoints (e.g. certain emoji use three codepoints). A single codepoint may contain two UTF-16 characters, which are used in C# strings.  
         */
        get visibleCharacters(): int64
        set visibleCharacters(value: int64)
        
        /** The clipping behavior when [member visible_characters] or [member visible_ratio] is set. */
        get visibleCharactersBehavior(): int64
        set visibleCharactersBehavior(value: int64)
        
        /** The fraction of characters to display, relative to the total number of characters (see [method get_total_character_count]). If set to `1.0`, all characters are displayed. If set to `0.5`, only half of the characters are displayed. This can be useful when animating the text appearing in a dialog box.  
         *      
         *  **Note:** Setting this property updates [member visible_characters] accordingly.  
         */
        get visibleRatio(): float64
        set visibleRatio(value: float64)
        
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
        
        /** Triggered when the user clicks on content between meta (URL) tags. If the meta is defined in BBCode, e.g. [code skip-lint][url={"key": "value"}]Text[/url]`, then the parameter for this signal will always be a [String] type. If a particular type or an object is desired, the [method push_meta] method must be used to manually insert the data into the tag stack. Alternatively, you can convert the [String] input to the desired type based on its contents (such as calling [method JSON.parse] on it).  
         *  For example, the following method can be connected to [signal meta_clicked] to open clicked URLs using the user's default web browser:  
         *    
         */
        readonly metaClicked: Signal<(meta: any) => void>
        
        /** Triggers when the mouse enters a meta tag. */
        readonly metaHoverStarted: Signal<(meta: any) => void>
        
        /** Triggers when the mouse exits a meta tag. */
        readonly metaHoverEnded: Signal<(meta: any) => void>
        
        /** Triggered when the document is fully loaded.  
         *      
         *  **Note:** This can happen before the text is processed for drawing. Scrolling values may not be valid until the document is drawn for the first time after this signal.  
         */
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRichTextLabel;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRichTextLabel;
    }
    namespace RigidBody2D {
        enum FreezeMode {
            FreezeModeStatic = 0,
            FreezeModeKinematic = 1,
        }
        enum CenterOfMassMode {
            CenterOfMassModeAuto = 0,
            CenterOfMassModeCustom = 1,
        }
        enum DampMode {
            DampModeCombine = 0,
            DampModeReplace = 1,
        }
        enum CcdMode {
            CcdModeDisabled = 0,
            CcdModeCastRay = 1,
            CcdModeCastShape = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRigidBody2D extends __RPCMapPhysicsBody2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRigidBody2D extends __NameMapPhysicsBody2D {
        _integrate_forces: "_integrateForces";
        get_contact_count: "getContactCount";
        get_velocity_at_local_position: "getVelocityAtLocalPosition";
        get_velocity_at_position: "getVelocityAtPosition";
        set_axis_velocity: "setAxisVelocity";
        apply_central_impulse: "applyCentralImpulse";
        apply_impulse: "applyImpulse";
        apply_torque_impulse: "applyTorqueImpulse";
        apply_central_force: "applyCentralForce";
        apply_force: "applyForce";
        apply_torque: "applyTorque";
        add_constant_central_force: "addConstantCentralForce";
        add_constant_force: "addConstantForce";
        add_constant_torque: "addConstantTorque";
        get_colliding_bodies: "getCollidingBodies";
        physics_material_override: "physicsMaterialOverride";
        gravity_scale: "gravityScale";
        center_of_mass_mode: "centerOfMassMode";
        center_of_mass: "centerOfMass";
        can_sleep: "canSleep";
        lock_rotation: "lockRotation";
        freeze_mode: "freezeMode";
        custom_integrator: "customIntegrator";
        continuous_cd: "continuousCd";
        contact_monitor: "contactMonitor";
        max_contacts_reported: "maxContactsReported";
        linear_velocity: "linearVelocity";
        linear_damp_mode: "linearDampMode";
        linear_damp: "linearDamp";
        angular_velocity: "angularVelocity";
        angular_damp_mode: "angularDampMode";
        angular_damp: "angularDamp";
        constant_force: "constantForce";
        constant_torque: "constantTorque";
        body_shape_entered: "bodyShapeEntered";
        body_shape_exited: "bodyShapeExited";
        body_entered: "bodyEntered";
        body_exited: "bodyExited";
        sleeping_state_changed: "sleepingStateChanged";
    }
    /** A 2D physics body that is moved by a physics simulation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rigidbody2d.html  
     */
    class RigidBody2D<Map extends NodePathMap = any> extends PhysicsBody2D<Map> {
        constructor(identifier?: any)
        /** Called during physics processing, allowing you to read and safely modify the simulation state for the object. By default, it is called before the standard force integration, but the [member custom_integrator] property allows you to disable the standard force integration and do fully custom force integration for a body. */
        /* gdvirtual */ _integrateForces(state: PhysicsDirectBodyState2D): void
        
        /** Returns the number of contacts this body has with other bodies. By default, this returns 0 unless bodies are configured to monitor contacts (see [member contact_monitor]).  
         *      
         *  **Note:** To retrieve the colliding bodies, use [method get_colliding_bodies].  
         */
        getContactCount(): int64
        
        /** Returns the body's velocity at the given relative position.  
         *  [param local_position] is the offset from the body origin in global coordinates.  
         *  See also [method get_velocity_at_position].  
         */
        getVelocityAtLocalPosition(localPosition: Vector2): Vector2
        
        /** Returns the body's velocity at the given global position.  
         *  This is equivalent to `get_velocity_at_local_position(global_point - global_position)`.  
         *  See also [method get_velocity_at_local_position].  
         */
        getVelocityAtPosition(globalPoint: Vector2): Vector2
        
        /** Sets the body's velocity on the given axis. The velocity in the given vector axis will be set as the given vector length. This is useful for jumping behavior. */
        setAxisVelocity(axisVelocity: Vector2): void
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method apply_impulse] at the body's center of mass.  
         */
        applyCentralImpulse(impulse?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a positioned impulse to the body.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyImpulse(impulse: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a rotational impulse to the body without affecting the position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *      
         *  **Note:** [member inertia] is required for this to work. To have [member inertia], an active [CollisionShape2D] must be a child of the node, or you can manually set [member inertia].  
         */
        applyTorqueImpulse(torque: float64): void
        
        /** Applies a directional force without affecting rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method apply_force] at the body's center of mass.  
         */
        applyCentralForce(force: Vector2): void
        
        /** Applies a positioned force to the body. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyForce(force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Applies a rotational force without affecting position. A force is time dependent and meant to be applied every physics update.  
         *      
         *  **Note:** [member inertia] is required for this to work. To have [member inertia], an active [CollisionShape2D] must be a child of the node, or you can manually set [member inertia].  
         */
        applyTorque(torque: float64): void
        
        /** Adds a constant directional force without affecting rotation that keeps being applied over time until cleared with `constant_force = Vector2(0, 0)`.  
         *  This is equivalent to using [method add_constant_force] at the body's center of mass.  
         */
        addConstantCentralForce(force: Vector2): void
        
        /** Adds a constant positioned force to the body that keeps being applied over time until cleared with `constant_force = Vector2(0, 0)`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        addConstantForce(force: Vector2, position?: Vector2 /* = Vector2.ZERO */): void
        
        /** Adds a constant rotational force without affecting position that keeps being applied over time until cleared with `constant_torque = 0`. */
        addConstantTorque(torque: float64): void
        
        /** Returns a list of the bodies colliding with this one. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, list of collisions is updated once per frame and before the physics step. Consider using signals instead.  
         */
        getCollidingBodies(): GArray<Node2D>
        
        /** The body's mass. */
        get mass(): float64
        set mass(value: float64)
        
        /** The physics material override for the body.  
         *  If a material is assigned to this property, it will be used instead of any other physics material, such as an inherited one.  
         */
        get physicsMaterialOverride(): null | PhysicsMaterial
        set physicsMaterialOverride(value: null | PhysicsMaterial)
        
        /** Multiplies the gravity applied to the body. The body's gravity is calculated from the [member ProjectSettings.physics/2d/default_gravity] project setting and/or any additional gravity vector applied by [Area2D]s. */
        get gravityScale(): float64
        set gravityScale(value: float64)
        
        /** Defines the way the body's center of mass is set. */
        get centerOfMassMode(): int64
        set centerOfMassMode(value: int64)
        
        /** The body's custom center of mass, relative to the body's origin position, when [member center_of_mass_mode] is set to [constant CENTER_OF_MASS_MODE_CUSTOM]. This is the balanced point of the body, where applied forces only cause linear acceleration. Applying forces outside of the center of mass causes angular acceleration.  
         *  When [member center_of_mass_mode] is set to [constant CENTER_OF_MASS_MODE_AUTO] (default value), the center of mass is automatically determined, but this does not update the value of [member center_of_mass].  
         */
        get centerOfMass(): Vector2
        set centerOfMass(value: Vector2)
        
        /** The body's moment of inertia. This is like mass, but for rotation: it determines how much torque it takes to rotate the body. The moment of inertia is usually computed automatically from the mass and the shapes, but this property allows you to set a custom value.  
         *  If set to `0`, inertia is automatically computed (default value).  
         *      
         *  **Note:** This value does not change when inertia is automatically computed. Use [PhysicsServer2D] to get the computed inertia.  
         *    
         */
        get inertia(): float64
        set inertia(value: float64)
        
        /** If `true`, the body will not move and will not calculate forces until woken up by another body through, for example, a collision, or by using the [method apply_impulse] or [method apply_force] methods. */
        get sleeping(): boolean
        set sleeping(value: boolean)
        
        /** If `true`, the body can enter sleep mode when there is no movement. See [member sleeping]. */
        get canSleep(): boolean
        set canSleep(value: boolean)
        
        /** If `true`, the body cannot rotate. Gravity and forces only apply linear movement. */
        get lockRotation(): boolean
        set lockRotation(value: boolean)
        
        /** If `true`, the body is frozen. Gravity and forces are not applied anymore.  
         *  See [member freeze_mode] to set the body's behavior when frozen.  
         *      
         *  **Note:** For a body that is always frozen, use [StaticBody2D] or [AnimatableBody2D] instead.  
         */
        get freeze(): boolean
        set freeze(value: boolean)
        
        /** The body's freeze mode. Determines the body's behavior when [member freeze] is `true`.  
         *      
         *  **Note:** For a body that is always frozen, use [StaticBody2D] or [AnimatableBody2D] instead.  
         */
        get freezeMode(): int64
        set freezeMode(value: int64)
        
        /** If `true`, the standard force integration (like gravity or damping) will be disabled for this body. Other than collision response, the body will only move as determined by the [method _integrate_forces] method, if that virtual method is overridden.  
         *  Setting this property will call the method [method PhysicsServer2D.body_set_omit_force_integration] internally.  
         */
        get customIntegrator(): boolean
        set customIntegrator(value: boolean)
        
        /** Continuous collision detection mode.  
         *  Continuous collision detection tries to predict where a moving body will collide instead of moving it and correcting its movement after collision. Continuous collision detection is slower, but more precise and misses fewer collisions with small, fast-moving objects. Raycasting and shapecasting methods are available.  
         */
        get continuousCd(): int64
        set continuousCd(value: int64)
        
        /** If `true`, the RigidBody2D will emit signals when it collides with another body.  
         *      
         *  **Note:** By default the maximum contacts reported is set to 0, meaning nothing will be recorded, see [member max_contacts_reported].  
         */
        get contactMonitor(): boolean
        set contactMonitor(value: boolean)
        
        /** The maximum number of contacts that will be recorded. Requires a value greater than 0 and [member contact_monitor] to be set to `true` to start to register contacts. Use [method get_contact_count] to retrieve the count or [method get_colliding_bodies] to retrieve bodies that have been collided with.  
         *      
         *  **Note:** The number of contacts is different from the number of collisions. Collisions between parallel edges will result in two contacts (one at each end), and collisions between parallel faces will result in four contacts (one at each corner).  
         */
        get maxContactsReported(): int64
        set maxContactsReported(value: int64)
        
        /** The body's linear velocity in pixels per second. Can be used sporadically, but **don't set this every frame**, because physics may run in another thread and runs at a different granularity. Use [method _integrate_forces] as your process loop for precise control of the body state. */
        get linearVelocity(): Vector2
        set linearVelocity(value: Vector2)
        
        /** Defines how [member linear_damp] is applied. */
        get linearDampMode(): int64
        set linearDampMode(value: int64)
        
        /** Damps the body's movement. By default, the body will use the [member ProjectSettings.physics/2d/default_linear_damp] setting or any value override set by an [Area2D] the body is in. Depending on [member linear_damp_mode], you can set [member linear_damp] to be added to or to replace the body's damping value.  
         *  See [member ProjectSettings.physics/2d/default_linear_damp] for more details about damping.  
         */
        get linearDamp(): float64
        set linearDamp(value: float64)
        
        /** The body's rotational velocity in  *radians*  per second. */
        get angularVelocity(): float64
        set angularVelocity(value: float64)
        
        /** Defines how [member angular_damp] is applied. */
        get angularDampMode(): int64
        set angularDampMode(value: int64)
        
        /** Damps the body's rotation. By default, the body will use the [member ProjectSettings.physics/2d/default_angular_damp] setting or any value override set by an [Area2D] the body is in. Depending on [member angular_damp_mode], you can set [member angular_damp] to be added to or to replace the body's damping value.  
         *  See [member ProjectSettings.physics/2d/default_angular_damp] for more details about damping.  
         */
        get angularDamp(): float64
        set angularDamp(value: float64)
        
        /** The body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        get constantForce(): Vector2
        set constantForce(value: Vector2)
        
        /** The body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        get constantTorque(): float64
        set constantTorque(value: float64)
        
        /** Emitted when one of this RigidBody2D's [Shape2D]s collides with another [PhysicsBody2D] or [TileMap]'s [Shape2D]s. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [TileMap]s are detected if the [TileSet] has Collision [Shape2D]s.  
         *  [param body_rid] the [RID] of the other [PhysicsBody2D] or [TileSet]'s [CollisionObject2D] used by the [PhysicsServer2D].  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody2D] or [TileMap].  
         *  [param body_shape_index] the index of the [Shape2D] of the other [PhysicsBody2D] or [TileMap] used by the [PhysicsServer2D]. Get the [CollisionShape2D] node with `body.shape_owner_get_owner(body.shape_find_owner(body_shape_index))`.  
         *  [param local_shape_index] the index of the [Shape2D] of this RigidBody2D used by the [PhysicsServer2D]. Get the [CollisionShape2D] node with `self.shape_owner_get_owner(self.shape_find_owner(local_shape_index))`.  
         */
        readonly bodyShapeEntered: Signal<(bodyRid: Rid, body: Node, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the collision between one of this RigidBody2D's [Shape2D]s and another [PhysicsBody2D] or [TileMap]'s [Shape2D]s ends. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [TileMap]s are detected if the [TileSet] has Collision [Shape2D]s.  
         *  [param body_rid] the [RID] of the other [PhysicsBody2D] or [TileSet]'s [CollisionObject2D] used by the [PhysicsServer2D].  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody2D] or [TileMap].  
         *  [param body_shape_index] the index of the [Shape2D] of the other [PhysicsBody2D] or [TileMap] used by the [PhysicsServer2D]. Get the [CollisionShape2D] node with `body.shape_owner_get_owner(body.shape_find_owner(body_shape_index))`.  
         *  [param local_shape_index] the index of the [Shape2D] of this RigidBody2D used by the [PhysicsServer2D]. Get the [CollisionShape2D] node with `self.shape_owner_get_owner(self.shape_find_owner(local_shape_index))`.  
         */
        readonly bodyShapeExited: Signal<(bodyRid: Rid, body: Node, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a collision with another [PhysicsBody2D] or [TileMap] occurs. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [TileMap]s are detected if the [TileSet] has Collision [Shape2D]s.  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody2D] or [TileMap].  
         */
        readonly bodyEntered: Signal<(body: Node) => void>
        
        /** Emitted when the collision with another [PhysicsBody2D] or [TileMap] ends. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [TileMap]s are detected if the [TileSet] has Collision [Shape2D]s.  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody2D] or [TileMap].  
         */
        readonly bodyExited: Signal<(body: Node) => void>
        
        /** Emitted when the physics engine changes the body's sleeping state.  
         *      
         *  **Note:** Changing the value [member sleeping] will not trigger this signal. It is only emitted if the sleeping state is changed by the physics engine or `emit_signal("sleeping_state_changed")` is used.  
         */
        readonly sleepingStateChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRigidBody2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRigidBody2D;
    }
    namespace RigidBody3D {
        enum FreezeMode {
            FreezeModeStatic = 0,
            FreezeModeKinematic = 1,
        }
        enum CenterOfMassMode {
            CenterOfMassModeAuto = 0,
            CenterOfMassModeCustom = 1,
        }
        enum DampMode {
            DampModeCombine = 0,
            DampModeReplace = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRigidBody3D extends __RPCMapPhysicsBody3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRigidBody3D extends __NameMapPhysicsBody3D {
        _integrate_forces: "_integrateForces";
        get_inverse_inertia_tensor: "getInverseInertiaTensor";
        get_contact_count: "getContactCount";
        get_velocity_at_local_position: "getVelocityAtLocalPosition";
        get_velocity_at_position: "getVelocityAtPosition";
        set_axis_velocity: "setAxisVelocity";
        apply_central_impulse: "applyCentralImpulse";
        apply_impulse: "applyImpulse";
        apply_torque_impulse: "applyTorqueImpulse";
        apply_central_force: "applyCentralForce";
        apply_force: "applyForce";
        apply_torque: "applyTorque";
        add_constant_central_force: "addConstantCentralForce";
        add_constant_force: "addConstantForce";
        add_constant_torque: "addConstantTorque";
        get_colliding_bodies: "getCollidingBodies";
        physics_material_override: "physicsMaterialOverride";
        gravity_scale: "gravityScale";
        center_of_mass_mode: "centerOfMassMode";
        center_of_mass: "centerOfMass";
        can_sleep: "canSleep";
        lock_rotation: "lockRotation";
        freeze_mode: "freezeMode";
        custom_integrator: "customIntegrator";
        continuous_cd: "continuousCd";
        contact_monitor: "contactMonitor";
        max_contacts_reported: "maxContactsReported";
        linear_velocity: "linearVelocity";
        linear_damp_mode: "linearDampMode";
        linear_damp: "linearDamp";
        angular_velocity: "angularVelocity";
        angular_damp_mode: "angularDampMode";
        angular_damp: "angularDamp";
        constant_force: "constantForce";
        constant_torque: "constantTorque";
        body_shape_entered: "bodyShapeEntered";
        body_shape_exited: "bodyShapeExited";
        body_entered: "bodyEntered";
        body_exited: "bodyExited";
        sleeping_state_changed: "sleepingStateChanged";
    }
    /** A 3D physics body that is moved by a physics simulation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rigidbody3d.html  
     */
    class RigidBody3D<Map extends NodePathMap = any> extends PhysicsBody3D<Map> {
        constructor(identifier?: any)
        /** Called during physics processing, allowing you to read and safely modify the simulation state for the object. By default, it is called before the standard force integration, but the [member custom_integrator] property allows you to disable the standard force integration and do fully custom force integration for a body. */
        /* gdvirtual */ _integrateForces(state: PhysicsDirectBodyState3D): void
        
        /** Returns the inverse inertia tensor basis. This is used to calculate the angular acceleration resulting from a torque applied to the [RigidBody3D]. */
        getInverseInertiaTensor(): Basis
        
        /** Returns the number of contacts this body has with other bodies. By default, this returns 0 unless bodies are configured to monitor contacts (see [member contact_monitor]).  
         *      
         *  **Note:** To retrieve the colliding bodies, use [method get_colliding_bodies].  
         */
        getContactCount(): int64
        
        /** Returns the body's velocity at the given relative position.  
         *  [param local_position] is the offset from the body origin in global coordinates.  
         *  See also [method get_velocity_at_position].  
         */
        getVelocityAtLocalPosition(localPosition: Vector3): Vector3
        
        /** Returns the body's velocity at the given global position.  
         *  This is equivalent to `get_velocity_at_local_position(global_point - global_position)`.  
         *  See also [method get_velocity_at_local_position].  
         */
        getVelocityAtPosition(globalPoint: Vector3): Vector3
        
        /** Sets an axis velocity. The velocity in the given vector axis will be set as the given vector length. This is useful for jumping behavior. */
        setAxisVelocity(axisVelocity: Vector3): void
        
        /** Applies a directional impulse without affecting rotation.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  This is equivalent to using [method apply_impulse] at the body's center of mass.  
         */
        applyCentralImpulse(impulse: Vector3): void
        
        /** Applies a positioned impulse to the body.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyImpulse(impulse: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational impulse to the body without affecting the position.  
         *  An impulse is time-independent! Applying an impulse every frame would result in a framerate-dependent force. For this reason, it should only be used when simulating one-time impacts (use the "_force" functions otherwise).  
         *      
         *  **Note:** [member inertia] is required for this to work. To have [member inertia], an active [CollisionShape3D] must be a child of the node, or you can manually set [member inertia].  
         */
        applyTorqueImpulse(impulse: Vector3): void
        
        /** Applies a directional force without affecting rotation. A force is time dependent and meant to be applied every physics update.  
         *  This is equivalent to using [method apply_force] at the body's center of mass.  
         */
        applyCentralForce(force: Vector3): void
        
        /** Applies a positioned force to the body. A force is time dependent and meant to be applied every physics update.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        applyForce(force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Applies a rotational force without affecting position. A force is time dependent and meant to be applied every physics update.  
         *      
         *  **Note:** [member inertia] is required for this to work. To have [member inertia], an active [CollisionShape3D] must be a child of the node, or you can manually set [member inertia].  
         */
        applyTorque(torque: Vector3): void
        
        /** Adds a constant directional force without affecting rotation that keeps being applied over time until cleared with `constant_force = Vector3(0, 0, 0)`.  
         *  This is equivalent to using [method add_constant_force] at the body's center of mass.  
         */
        addConstantCentralForce(force: Vector3): void
        
        /** Adds a constant positioned force to the body that keeps being applied over time until cleared with `constant_force = Vector3(0, 0, 0)`.  
         *  [param position] is the offset from the body origin in global coordinates.  
         */
        addConstantForce(force: Vector3, position?: Vector3 /* = new Vector3(0, 0, 0) */): void
        
        /** Adds a constant rotational force without affecting position that keeps being applied over time until cleared with `constant_torque = Vector3(0, 0, 0)`. */
        addConstantTorque(torque: Vector3): void
        
        /** Returns a list of the bodies colliding with this one. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions.  
         *      
         *  **Note:** The result of this test is not immediate after moving objects. For performance, list of collisions is updated once per frame and before the physics step. Consider using signals instead.  
         */
        getCollidingBodies(): GArray<Node3D>
        
        /** The body's mass. */
        get mass(): float64
        set mass(value: float64)
        
        /** The physics material override for the body.  
         *  If a material is assigned to this property, it will be used instead of any other physics material, such as an inherited one.  
         */
        get physicsMaterialOverride(): null | PhysicsMaterial
        set physicsMaterialOverride(value: null | PhysicsMaterial)
        
        /** This is multiplied by [member ProjectSettings.physics/3d/default_gravity] to produce this body's gravity. For example, a value of `1.0` will apply normal gravity, `2.0` will apply double the gravity, and `0.5` will apply half the gravity to this body. */
        get gravityScale(): float64
        set gravityScale(value: float64)
        
        /** Defines the way the body's center of mass is set. */
        get centerOfMassMode(): int64
        set centerOfMassMode(value: int64)
        
        /** The body's custom center of mass, relative to the body's origin position, when [member center_of_mass_mode] is set to [constant CENTER_OF_MASS_MODE_CUSTOM]. This is the balanced point of the body, where applied forces only cause linear acceleration. Applying forces outside of the center of mass causes angular acceleration.  
         *  When [member center_of_mass_mode] is set to [constant CENTER_OF_MASS_MODE_AUTO] (default value), the center of mass is automatically determined, but this does not update the value of [member center_of_mass].  
         */
        get centerOfMass(): Vector3
        set centerOfMass(value: Vector3)
        
        /** The body's moment of inertia. This is like mass, but for rotation: it determines how much torque it takes to rotate the body on each axis. The moment of inertia is usually computed automatically from the mass and the shapes, but this property allows you to set a custom value.  
         *  If set to [constant Vector3.ZERO], inertia is automatically computed (default value).  
         *      
         *  **Note:** This value does not change when inertia is automatically computed. Use [PhysicsServer3D] to get the computed inertia.  
         *    
         */
        get inertia(): Vector3
        set inertia(value: Vector3)
        
        /** If `true`, the body will not move and will not calculate forces until woken up by another body through, for example, a collision, or by using the [method apply_impulse] or [method apply_force] methods. */
        get sleeping(): boolean
        set sleeping(value: boolean)
        
        /** If `true`, the body can enter sleep mode when there is no movement. See [member sleeping]. */
        get canSleep(): boolean
        set canSleep(value: boolean)
        
        /** If `true`, the body cannot rotate. Gravity and forces only apply linear movement. */
        get lockRotation(): boolean
        set lockRotation(value: boolean)
        
        /** If `true`, the body is frozen. Gravity and forces are not applied anymore.  
         *  See [member freeze_mode] to set the body's behavior when frozen.  
         *      
         *  **Note:** For a body that is always frozen, use [StaticBody3D] or [AnimatableBody3D] instead.  
         */
        get freeze(): boolean
        set freeze(value: boolean)
        
        /** The body's freeze mode. Determines the body's behavior when [member freeze] is `true`.  
         *      
         *  **Note:** For a body that is always frozen, use [StaticBody3D] or [AnimatableBody3D] instead.  
         */
        get freezeMode(): int64
        set freezeMode(value: int64)
        
        /** If `true`, the standard force integration (like gravity or damping) will be disabled for this body. Other than collision response, the body will only move as determined by the [method _integrate_forces] method, if that virtual method is overridden.  
         *  Setting this property will call the method [method PhysicsServer3D.body_set_omit_force_integration] internally.  
         */
        get customIntegrator(): boolean
        set customIntegrator(value: boolean)
        
        /** If `true`, continuous collision detection is used.  
         *  Continuous collision detection tries to predict where a moving body will collide, instead of moving it and correcting its movement if it collided. Continuous collision detection is more precise, and misses fewer impacts by small, fast-moving objects. Not using continuous collision detection is faster to compute, but can miss small, fast-moving objects.  
         */
        get continuousCd(): boolean
        set continuousCd(value: boolean)
        
        /** If `true`, the RigidBody3D will emit signals when it collides with another body.  
         *      
         *  **Note:** By default the maximum contacts reported is set to 0, meaning nothing will be recorded, see [member max_contacts_reported].  
         */
        get contactMonitor(): boolean
        set contactMonitor(value: boolean)
        
        /** The maximum number of contacts that will be recorded. Requires a value greater than 0 and [member contact_monitor] to be set to `true` to start to register contacts. Use [method get_contact_count] to retrieve the count or [method get_colliding_bodies] to retrieve bodies that have been collided with.  
         *      
         *  **Note:** The number of contacts is different from the number of collisions. Collisions between parallel edges will result in two contacts (one at each end), and collisions between parallel faces will result in four contacts (one at each corner).  
         */
        get maxContactsReported(): int64
        set maxContactsReported(value: int64)
        
        /** The body's linear velocity in units per second. Can be used sporadically, but **don't set this every frame**, because physics may run in another thread and runs at a different granularity. Use [method _integrate_forces] as your process loop for precise control of the body state. */
        get linearVelocity(): Vector3
        set linearVelocity(value: Vector3)
        
        /** Defines how [member linear_damp] is applied. */
        get linearDampMode(): int64
        set linearDampMode(value: int64)
        
        /** Damps the body's movement. By default, the body will use the [member ProjectSettings.physics/3d/default_linear_damp] project setting or any value override set by an [Area3D] the body is in. Depending on [member linear_damp_mode], you can set [member linear_damp] to be added to or to replace the body's damping value.  
         *  See [member ProjectSettings.physics/3d/default_linear_damp] for more details about damping.  
         */
        get linearDamp(): float64
        set linearDamp(value: float64)
        
        /** The RigidBody3D's rotational velocity in  *radians*  per second. */
        get angularVelocity(): Vector3
        set angularVelocity(value: Vector3)
        
        /** Defines how [member angular_damp] is applied. */
        get angularDampMode(): int64
        set angularDampMode(value: int64)
        
        /** Damps the body's rotation. By default, the body will use the [member ProjectSettings.physics/3d/default_angular_damp] project setting or any value override set by an [Area3D] the body is in. Depending on [member angular_damp_mode], you can set [member angular_damp] to be added to or to replace the body's damping value.  
         *  See [member ProjectSettings.physics/3d/default_angular_damp] for more details about damping.  
         */
        get angularDamp(): float64
        set angularDamp(value: float64)
        
        /** The body's total constant positional forces applied during each physics update.  
         *  See [method add_constant_force] and [method add_constant_central_force].  
         */
        get constantForce(): Vector3
        set constantForce(value: Vector3)
        
        /** The body's total constant rotational forces applied during each physics update.  
         *  See [method add_constant_torque].  
         */
        get constantTorque(): Vector3
        set constantTorque(value: Vector3)
        
        /** Emitted when one of this RigidBody3D's [Shape3D]s collides with another [PhysicsBody3D] or [GridMap]'s [Shape3D]s. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [GridMap]s are detected if the [MeshLibrary] has Collision [Shape3D]s.  
         *  [param body_rid] the [RID] of the other [PhysicsBody3D] or [MeshLibrary]'s [CollisionObject3D] used by the [PhysicsServer3D].  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody3D] or [GridMap].  
         *  [param body_shape_index] the index of the [Shape3D] of the other [PhysicsBody3D] or [GridMap] used by the [PhysicsServer3D]. Get the [CollisionShape3D] node with `body.shape_owner_get_owner(body.shape_find_owner(body_shape_index))`.  
         *  [param local_shape_index] the index of the [Shape3D] of this RigidBody3D used by the [PhysicsServer3D]. Get the [CollisionShape3D] node with `self.shape_owner_get_owner(self.shape_find_owner(local_shape_index))`.  
         */
        readonly bodyShapeEntered: Signal<(bodyRid: Rid, body: Node, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when the collision between one of this RigidBody3D's [Shape3D]s and another [PhysicsBody3D] or [GridMap]'s [Shape3D]s ends. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [GridMap]s are detected if the [MeshLibrary] has Collision [Shape3D]s.  
         *  [param body_rid] the [RID] of the other [PhysicsBody3D] or [MeshLibrary]'s [CollisionObject3D] used by the [PhysicsServer3D]. [GridMap]s are detected if the Meshes have [Shape3D]s.  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody3D] or [GridMap].  
         *  [param body_shape_index] the index of the [Shape3D] of the other [PhysicsBody3D] or [GridMap] used by the [PhysicsServer3D]. Get the [CollisionShape3D] node with `body.shape_owner_get_owner(body.shape_find_owner(body_shape_index))`.  
         *  [param local_shape_index] the index of the [Shape3D] of this RigidBody3D used by the [PhysicsServer3D]. Get the [CollisionShape3D] node with `self.shape_owner_get_owner(self.shape_find_owner(local_shape_index))`.  
         */
        readonly bodyShapeExited: Signal<(bodyRid: Rid, body: Node, bodyShapeIndex: int64, localShapeIndex: int64) => void>
        
        /** Emitted when a collision with another [PhysicsBody3D] or [GridMap] occurs. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [GridMap]s are detected if the [MeshLibrary] has Collision [Shape3D]s.  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody3D] or [GridMap].  
         */
        readonly bodyEntered: Signal<(body: Node) => void>
        
        /** Emitted when the collision with another [PhysicsBody3D] or [GridMap] ends. Requires [member contact_monitor] to be set to `true` and [member max_contacts_reported] to be set high enough to detect all the collisions. [GridMap]s are detected if the [MeshLibrary] has Collision [Shape3D]s.  
         *  [param body] the [Node], if it exists in the tree, of the other [PhysicsBody3D] or [GridMap].  
         */
        readonly bodyExited: Signal<(body: Node) => void>
        
        /** Emitted when the physics engine changes the body's sleeping state.  
         *      
         *  **Note:** Changing the value [member sleeping] will not trigger this signal. It is only emitted if the sleeping state is changed by the physics engine or `emit_signal("sleeping_state_changed")` is used.  
         */
        readonly sleepingStateChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRigidBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRigidBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapRootMotionView extends __RPCMapVisualInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapRootMotionView extends __NameMapVisualInstance3D {
        animation_path: "animationPath";
        cell_size: "cellSize";
        zero_y: "zeroY";
    }
    /** Editor-only helper for setting up root motion in [AnimationMixer].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_rootmotionview.html  
     */
    class RootMotionView<Map extends NodePathMap = any> extends VisualInstance3D<Map> {
        constructor(identifier?: any)
        /** Path to an [AnimationMixer] node to use as a basis for root motion. */
        get animationPath(): NodePath
        set animationPath(value: NodePath | string)
        
        /** The grid's color. */
        get color(): Color
        set color(value: Color)
        
        /** The grid's cell size in 3D units. */
        get cellSize(): float64
        set cellSize(value: float64)
        
        /** The grid's radius in 3D units. The grid's opacity will fade gradually as the distance from the origin increases until this [member radius] is reached. */
        get radius(): float64
        set radius(value: float64)
        
        /** If `true`, the grid's points will all be on the same Y coordinate ( *local*  Y = 0). If `false`, the points' original Y coordinate is preserved. */
        get zeroY(): boolean
        set zeroY(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapRootMotionView;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapRootMotionView;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSceneMultiplayer extends __RPCMapMultiplayerApi {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSceneMultiplayer extends __NameMapMultiplayerApi {
        disconnect_peer: "disconnectPeer";
        get_authenticating_peers: "getAuthenticatingPeers";
        send_auth: "sendAuth";
        complete_auth: "completeAuth";
        send_bytes: "sendBytes";
        root_path: "rootPath";
        auth_callback: "authCallback";
        auth_timeout: "authTimeout";
        allow_object_decoding: "allowObjectDecoding";
        refuse_new_connections: "refuseNewConnections";
        server_relay: "serverRelay";
        max_sync_packet_size: "maxSyncPacketSize";
        max_delta_packet_size: "maxDeltaPacketSize";
        peer_authenticating: "peerAuthenticating";
        peer_authentication_failed: "peerAuthenticationFailed";
        peer_packet: "peerPacket";
    }
    /** High-level multiplayer API implementation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenemultiplayer.html  
     */
    class SceneMultiplayer extends MultiplayerApi {
        constructor(identifier?: any)
        /** Clears the current SceneMultiplayer network state (you shouldn't call this unless you know what you are doing). */
        clear(): void
        
        /** Disconnects the peer identified by [param id], removing it from the list of connected peers, and closing the underlying connection with it. */
        disconnectPeer(id: int64): void
        
        /** Returns the IDs of the peers currently trying to authenticate with this [MultiplayerAPI]. */
        getAuthenticatingPeers(): PackedInt32Array
        
        /** Sends the specified [param data] to the remote peer identified by [param id] as part of an authentication message. This can be used to authenticate peers, and control when [signal MultiplayerAPI.peer_connected] is emitted (and the remote peer accepted as one of the connected peers). */
        sendAuth(id: int64, data: PackedByteArray | byte[] | ArrayBuffer): GError
        
        /** Mark the authentication step as completed for the remote peer identified by [param id]. The [signal MultiplayerAPI.peer_connected] signal will be emitted for this peer once the remote side also completes the authentication. No further authentication messages are expected to be received from this peer.  
         *  If a peer disconnects before completing authentication, either due to a network issue, the [member auth_timeout] expiring, or manually calling [method disconnect_peer], the [signal peer_authentication_failed] signal will be emitted instead of [signal MultiplayerAPI.peer_disconnected].  
         */
        completeAuth(id: int64): GError
        
        /** Sends the given raw [param bytes] to a specific peer identified by [param id] (see [method MultiplayerPeer.set_target_peer]). Default ID is `0`, i.e. broadcast to all peers. */
        sendBytes(bytes: PackedByteArray | byte[] | ArrayBuffer, id?: int64 /* = 0 */, mode?: MultiplayerPeer.TransferMode /* = 2 */, channel?: int64 /* = 0 */): GError
        
        /** The root path to use for RPCs and replication. Instead of an absolute path, a relative path will be used to find the node upon which the RPC should be executed.  
         *  This effectively allows to have different branches of the scene tree to be managed by different MultiplayerAPI, allowing for example to run both client and server in the same scene.  
         */
        get rootPath(): NodePath
        set rootPath(value: NodePath | string)
        
        /** The callback to execute when receiving authentication data sent via [method send_auth]. If the [Callable] is empty (default), peers will be automatically accepted as soon as they connect. */
        get authCallback(): Callable
        set authCallback(value: Callable)
        
        /** If set to a value greater than `0.0`, the maximum duration in seconds peers can stay in the authenticating state, after which the authentication will automatically fail. See the [signal peer_authenticating] and [signal peer_authentication_failed] signals. */
        get authTimeout(): float64
        set authTimeout(value: float64)
        
        /** If `true`, the MultiplayerAPI will allow encoding and decoding of object during RPCs.  
         *  **Warning:** Deserialized objects can contain code which gets executed. Do not use this option if the serialized object comes from untrusted sources to avoid potential security threat such as remote code execution.  
         */
        get allowObjectDecoding(): boolean
        set allowObjectDecoding(value: boolean)
        
        /** If `true`, the MultiplayerAPI's [member MultiplayerAPI.multiplayer_peer] refuses new incoming connections. */
        get refuseNewConnections(): boolean
        set refuseNewConnections(value: boolean)
        
        /** Enable or disable the server feature that notifies clients of other peers' connection/disconnection, and relays messages between them. When this option is `false`, clients won't be automatically notified of other peers and won't be able to send them packets through the server.  
         *      
         *  **Note:** Changing this option while other peers are connected may lead to unexpected behaviors.  
         *      
         *  **Note:** Support for this feature may depend on the current [MultiplayerPeer] configuration. See [method MultiplayerPeer.is_server_relay_supported].  
         */
        get serverRelay(): boolean
        set serverRelay(value: boolean)
        
        /** Maximum size of each synchronization packet. Higher values increase the chance of receiving full updates in a single frame, but also the chance of packet loss. See [MultiplayerSynchronizer]. */
        get maxSyncPacketSize(): int64
        set maxSyncPacketSize(value: int64)
        
        /** Maximum size of each delta packet. Higher values increase the chance of receiving full updates in a single frame, but also the chance of causing networking congestion (higher latency, disconnections). See [MultiplayerSynchronizer]. */
        get maxDeltaPacketSize(): int64
        set maxDeltaPacketSize(value: int64)
        
        /** Emitted when this MultiplayerAPI's [member MultiplayerAPI.multiplayer_peer] connects to a new peer and a valid [member auth_callback] is set. In this case, the [signal MultiplayerAPI.peer_connected] will not be emitted until [method complete_auth] is called with given peer [param id]. While in this state, the peer will not be included in the list returned by [method MultiplayerAPI.get_peers] (but in the one returned by [method get_authenticating_peers]), and only authentication data will be sent or received. See [method send_auth] for sending authentication data. */
        readonly peerAuthenticating: Signal<(id: int64) => void>
        
        /** Emitted when this MultiplayerAPI's [member MultiplayerAPI.multiplayer_peer] disconnects from a peer for which authentication had not yet completed. See [signal peer_authenticating]. */
        readonly peerAuthenticationFailed: Signal<(id: int64) => void>
        
        /** Emitted when this MultiplayerAPI's [member MultiplayerAPI.multiplayer_peer] receives a [param packet] with custom data (see [method send_bytes]). ID is the peer ID of the peer that sent the packet. */
        readonly peerPacket: Signal<(id: int64, packet: PackedByteArray) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSceneMultiplayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSceneMultiplayer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScenePaint2DEditor extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScenePaint2DEditor extends __NameMapControl {
        register_scene_provider: "registerSceneProvider";
        unregister_scene_provider: "unregisterSceneProvider";
        set_painted_scene: "setPaintedScene";
        get_painted_scene: "getPaintedScene";
        scene_painted: "scenePainted";
    }
    /** Class for interacting with the 2D editor's Scene Paint Mode.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenepaint2deditor.html  
     */
    class ScenePaint2DEditor<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Registers a custom scene provider.  
         *  When the scene picker tool is active and the user clicks on [param control], the [param callback] is invoked and must return a [Node2D].  
         *  The returned scene becomes the new painting sample.  
         */
        registerSceneProvider(control: Control, callback: Callable): void
        
        /** Removes a previously registered scene provider. */
        unregisterSceneProvider(control: Control): void
        
        /** Sets the scene sample to be painted. */
        setPaintedScene(scene: Node2D): void
        
        /** Returns the painted scene, or `null` if none is selected. The returned scene's properties can be edited.  
         *  **Warning:** Removing and freeing this node will render the editor useless and may cause a crash.  
         */
        getPaintedScene(): null | Node2D
        
        /** Emitted for each new node created during drawing.  
         *  **Example:**  
         *    
         */
        readonly scenePainted: Signal<(node: Node2D) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScenePaint2DEditor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScenePaint2DEditor;
    }
    namespace SceneReplicationConfig {
        enum ReplicationMode {
            ReplicationModeNever = 0,
            ReplicationModeAlways = 1,
            ReplicationModeOnChange = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSceneReplicationConfig extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSceneReplicationConfig extends __NameMapResource {
        get_properties: "getProperties";
        add_property: "addProperty";
        has_property: "hasProperty";
        remove_property: "removeProperty";
        property_get_index: "propertyGetIndex";
        property_get_spawn: "propertyGetSpawn";
        property_set_spawn: "propertySetSpawn";
        property_get_replication_mode: "propertyGetReplicationMode";
        property_set_replication_mode: "propertySetReplicationMode";
        property_get_sync: "propertyGetSync";
        property_set_sync: "propertySetSync";
        property_get_watch: "propertyGetWatch";
        property_set_watch: "propertySetWatch";
    }
    /** Configuration for properties to synchronize with a [MultiplayerSynchronizer].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenereplicationconfig.html  
     */
    class SceneReplicationConfig extends Resource {
        constructor(identifier?: any)
        /** Returns a list of synchronized property [NodePath]s. */
        getProperties(): GArray<NodePath>
        
        /** Adds the property identified by the given [param path] to the list of the properties being synchronized, optionally passing an [param index].  
         *      
         *  **Note:** For details on restrictions and limitations on property synchronization, see [MultiplayerSynchronizer].  
         */
        addProperty(path: NodePath | string, index?: int64 /* = -1 */): void
        
        /** Returns `true` if the given [param path] is configured for synchronization. */
        hasProperty(path: NodePath | string): boolean
        
        /** Removes the property identified by the given [param path] from the configuration. */
        removeProperty(path: NodePath | string): void
        
        /** Finds the index of the given [param path]. */
        propertyGetIndex(path: NodePath | string): int64
        
        /** Returns `true` if the property identified by the given [param path] is configured to be synchronized on spawn. */
        propertyGetSpawn(path: NodePath | string): boolean
        
        /** Sets whether the property identified by the given [param path] is configured to be synchronized on spawn. */
        propertySetSpawn(path: NodePath | string, enabled: boolean): void
        
        /** Returns the replication mode for the property identified by the given [param path]. */
        propertyGetReplicationMode(path: NodePath | string): SceneReplicationConfig.ReplicationMode
        
        /** Sets the synchronization mode for the property identified by the given [param path]. */
        propertySetReplicationMode(path: NodePath | string, mode: SceneReplicationConfig.ReplicationMode): void
        
        /** Returns `true` if the property identified by the given [param path] is configured to be synchronized on process. */
        propertyGetSync(path: NodePath | string): boolean
        
        /** Sets whether the property identified by the given [param path] is configured to be synchronized on process. */
        propertySetSync(path: NodePath | string, enabled: boolean): void
        
        /** Returns `true` if the property identified by the given [param path] is configured to be reliably synchronized when changes are detected on process. */
        propertyGetWatch(path: NodePath | string): boolean
        
        /** Sets whether the property identified by the given [param path] is configured to be reliably synchronized when changes are detected on process. */
        propertySetWatch(path: NodePath | string, enabled: boolean): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSceneReplicationConfig;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSceneReplicationConfig;
    }
    namespace SceneState {
        enum GenEditState {
            GenEditStateDisabled = 0,
            GenEditStateInstance = 1,
            GenEditStateMain = 2,
            GenEditStateMainInherited = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSceneState extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSceneState extends __NameMapRefCounted {
        get_path: "getPath";
        get_base_scene_state: "getBaseSceneState";
        get_node_count: "getNodeCount";
        get_node_type: "getNodeType";
        get_node_name: "getNodeName";
        get_node_path: "getNodePath";
        get_node_owner_path: "getNodeOwnerPath";
        is_node_instance_placeholder: "isNodeInstancePlaceholder";
        get_node_instance_placeholder: "getNodeInstancePlaceholder";
        get_node_instance: "getNodeInstance";
        get_node_groups: "getNodeGroups";
        get_node_index: "getNodeIndex";
        get_node_property_count: "getNodePropertyCount";
        get_node_property_name: "getNodePropertyName";
        get_node_property_value: "getNodePropertyValue";
        get_connection_count: "getConnectionCount";
        get_connection_source: "getConnectionSource";
        get_connection_signal: "getConnectionSignal";
        get_connection_target: "getConnectionTarget";
        get_connection_method: "getConnectionMethod";
        get_connection_flags: "getConnectionFlags";
        get_connection_binds: "getConnectionBinds";
        get_connection_unbinds: "getConnectionUnbinds";
    }
    /** Provides access to a scene file's information.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenestate.html  
     */
    class SceneState extends RefCounted {
        constructor(identifier?: any)
        /** Returns the resource path to the represented [PackedScene]. */
        getPath(): string
        
        /** Returns the [SceneState] of the scene that this scene inherits from, or `null` if it doesn't inherit from any scene. */
        getBaseSceneState(): null | SceneState
        
        /** Returns the number of nodes in the scene.  
         *  The `idx` argument used to query node data in other `get_node_*` methods in the interval `[0, get_node_count() - 1]`.  
         */
        getNodeCount(): int64
        
        /** Returns the type of the node at [param idx]. */
        getNodeType(idx: int64): StringName
        
        /** Returns the name of the node at [param idx]. */
        getNodeName(idx: int64): StringName
        
        /** Returns the path to the node at [param idx].  
         *  If [param for_parent] is `true`, returns the path of the [param idx] node's parent instead.  
         */
        getNodePath(idx: int64, forParent?: boolean /* = false */): NodePath
        
        /** Returns the path to the owner of the node at [param idx], relative to the root node. */
        getNodeOwnerPath(idx: int64): NodePath
        
        /** Returns `true` if the node at [param idx] is an [InstancePlaceholder]. */
        isNodeInstancePlaceholder(idx: int64): boolean
        
        /** Returns the path to the represented scene file if the node at [param idx] is an [InstancePlaceholder]. */
        getNodeInstancePlaceholder(idx: int64): string
        
        /** Returns a [PackedScene] for the node at [param idx] (i.e. the whole branch starting at this node, with its child nodes and resources), or `null` if the node is not an instance. */
        getNodeInstance(idx: int64): null | PackedScene
        
        /** Returns the list of group names associated with the node at [param idx]. */
        getNodeGroups(idx: int64): PackedStringArray
        
        /** Returns the node's index, which is its position relative to its siblings. This is only relevant and saved in scenes for cases where new nodes are added to an instantiated or inherited scene among siblings from the base scene. Despite the name, this index is not related to the [param idx] argument used here and in other methods. */
        getNodeIndex(idx: int64): int64
        
        /** Returns the number of exported or overridden properties for the node at [param idx].  
         *  The `prop_idx` argument used to query node property data in other `get_node_property_*` methods in the interval `[0, get_node_property_count() - 1]`.  
         */
        getNodePropertyCount(idx: int64): int64
        
        /** Returns the name of the property at [param prop_idx] for the node at [param idx]. */
        getNodePropertyName(idx: int64, propIdx: int64): StringName
        
        /** Returns the value of the property at [param prop_idx] for the node at [param idx]. */
        getNodePropertyValue(idx: int64, propIdx: int64): any
        
        /** Returns the number of signal connections in the scene.  
         *  The `idx` argument used to query connection metadata in other `get_connection_*` methods in the interval `[0, get_connection_count() - 1]`.  
         */
        getConnectionCount(): int64
        
        /** Returns the path to the node that owns the signal at [param idx], relative to the root node. */
        getConnectionSource(idx: int64): NodePath
        
        /** Returns the name of the signal at [param idx]. */
        getConnectionSignal(idx: int64): StringName
        
        /** Returns the path to the node that owns the method connected to the signal at [param idx], relative to the root node. */
        getConnectionTarget(idx: int64): NodePath
        
        /** Returns the method connected to the signal at [param idx]. */
        getConnectionMethod(idx: int64): StringName
        
        /** Returns the connection flags for the signal at [param idx]. See [enum Object.ConnectFlags] constants. */
        getConnectionFlags(idx: int64): int64
        
        /** Returns the list of bound parameters for the signal at [param idx]. */
        getConnectionBinds(idx: int64): GArray
        
        /** Returns the number of unbound parameters for the signal at [param idx]. */
        getConnectionUnbinds(idx: int64): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSceneState;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSceneState;
    }
    namespace SceneTree {
        enum GroupCallFlags {
            GroupCallDefault = 0,
            GroupCallReverse = 1,
            GroupCallDeferred = 2,
            GroupCallUnique = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSceneTree extends __RPCMapMainLoop {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSceneTree extends __NameMapMainLoop {
        has_group: "hasGroup";
        is_accessibility_enabled: "isAccessibilityEnabled";
        is_accessibility_supported: "isAccessibilitySupported";
        create_timer: "createTimer";
        create_tween: "createTween";
        get_processed_tweens: "getProcessedTweens";
        get_node_count: "getNodeCount";
        get_frame: "getFrame";
        queue_delete: "queueDelete";
        call_group_flags: "callGroupFlags";
        notify_group_flags: "notifyGroupFlags";
        set_group_flags: "setGroupFlags";
        call_group: "callGroup";
        notify_group: "notifyGroup";
        set_group: "setGroup";
        get_nodes_in_group: "getNodesInGroup";
        get_first_node_in_group: "getFirstNodeInGroup";
        get_node_count_in_group: "getNodeCountInGroup";
        change_scene_to_file: "changeSceneToFile";
        change_scene_to_packed: "changeSceneToPacked";
        change_scene_to_node: "changeSceneToNode";
        reload_current_scene: "reloadCurrentScene";
        unload_current_scene: "unloadCurrentScene";
        set_multiplayer: "setMultiplayer";
        get_multiplayer: "getMultiplayer";
        auto_accept_quit: "autoAcceptQuit";
        quit_on_go_back: "quitOnGoBack";
        debug_collisions_hint: "debugCollisionsHint";
        debug_paths_hint: "debugPathsHint";
        debug_navigation_hint: "debugNavigationHint";
        edited_scene_root: "editedSceneRoot";
        current_scene: "currentScene";
        multiplayer_poll: "multiplayerPoll";
        physics_interpolation: "physicsInterpolation";
        tree_changed: "treeChanged";
        scene_changed: "sceneChanged";
        tree_process_mode_changed: "treeProcessModeChanged";
        node_added: "nodeAdded";
        node_removed: "nodeRemoved";
        node_renamed: "nodeRenamed";
        node_configuration_warning_changed: "nodeConfigurationWarningChanged";
        process_frame: "processFrame";
        physics_frame: "physicsFrame";
    }
    /** Manages the game loop via a hierarchy of nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenetree.html  
     */
    class SceneTree extends MainLoop {
        constructor(identifier?: any)
        /** Returns `true` if a node added to the given group [param name] exists in the tree. */
        hasGroup(name: StringName): boolean
        
        /** Returns `true` if accessibility features are enabled, and accessibility information updates are actively processed. */
        isAccessibilityEnabled(): boolean
        
        /** Returns `true` if accessibility features are supported by the OS and enabled in project settings. */
        isAccessibilitySupported(): boolean
        
        /** Returns a new [SceneTreeTimer]. After [param time_sec] in seconds have passed, the timer will emit [signal SceneTreeTimer.timeout] and will be automatically freed.  
         *  If [param process_always] is `false`, the timer will be paused when setting [member SceneTree.paused] to `true`.  
         *  If [param process_in_physics] is `true`, the timer will update at the end of the physics frame, instead of the process frame.  
         *  If [param ignore_time_scale] is `true`, the timer will ignore [member Engine.time_scale] and update with the real, elapsed time.  
         *  This method is commonly used to create a one-shot delay timer, as in the following example:  
         *    
         *      
         *  **Note:** The timer is always updated  *after*  all of the nodes in the tree. A node's [method Node._process] method would be called before the timer updates (or [method Node._physics_process] if [param process_in_physics] is set to `true`).  
         */
        createTimer(timeSec: float64, processAlways?: boolean /* = true */, processInPhysics?: boolean /* = false */, ignoreTimeScale?: boolean /* = false */): SceneTreeTimer
        
        /** Creates and returns a new [Tween] processed in this tree. The Tween will start automatically on the next process frame or physics frame (depending on its [enum Tween.TweenProcessMode]).  
         *      
         *  **Note:** A [Tween] created using this method is not bound to any [Node]. It may keep working until there is nothing left to animate. If you want the [Tween] to be automatically killed when the [Node] is freed, use [method Node.create_tween] or [method Tween.bind_node].  
         */
        createTween(): Tween
        
        /** Returns an [Array] of currently existing [Tween]s in the tree, including paused tweens. */
        getProcessedTweens(): GArray<Tween>
        
        /** Returns the number of nodes inside this tree. */
        getNodeCount(): int64
        
        /** Returns how many physics process steps have been processed, since the application started. This is  *not*  a measurement of elapsed time. See also [signal physics_frame]. For the number of frames rendered, see [method Engine.get_process_frames]. */
        getFrame(): int64
        
        /** Quits the application at the end of the current iteration, with the given [param exit_code].  
         *  By convention, an exit code of `0` indicates success, whereas any other exit code indicates an error. For portability reasons, it should be between `0` and `125` (inclusive).  
         *      
         *  **Note:** On iOS this method doesn't work. Instead, as recommended by the [url=https://developer.apple.com/library/archive/qa/qa1561/_index.html]iOS Human Interface Guidelines[/url], the user is expected to close apps via the Home button.  
         */
        quit(exitCode?: int64 /* = 0 */): void
        
        /** Queues the given [param obj] to be deleted, calling its [method Object.free] at the end of the current frame. This method is similar to [method Node.queue_free]. */
        queueDelete(obj: GObject): void
        
        /** Calls the given [param method] on each node inside this tree added to the given [param group]. Use [param flags] to customize this method's behavior (see [enum GroupCallFlags]). Additional arguments for [param method] can be passed at the end of this method. Nodes that cannot call [param method] (either because the method doesn't exist or the arguments do not match) are ignored.  
         *    
         *      
         *  **Note:** In C#, [param method] must be in snake_case when referring to built-in Godot methods. Prefer using the names exposed in the `MethodName` class to avoid allocating a new [StringName] on each call.  
         */
        callGroupFlags(flags: int64, group: StringName, method: StringName, ...varargs: any[]): void
        
        /** Calls [method Object.notification] with the given [param notification] to all nodes inside this tree added to the [param group]. Use [param call_flags] to customize this method's behavior (see [enum GroupCallFlags]). */
        notifyGroupFlags(callFlags: int64, group: StringName, notification: int64): void
        
        /** Sets the given [param property] to [param value] on all nodes inside this tree added to the given [param group]. Nodes that do not have the [param property] are ignored. Use [param call_flags] to customize this method's behavior (see [enum GroupCallFlags]).  
         *      
         *  **Note:** In C#, [param property] must be in snake_case when referring to built-in Godot properties. Prefer using the names exposed in the `PropertyName` class to avoid allocating a new [StringName] on each call.  
         */
        setGroupFlags(callFlags: int64, group: StringName, property: string, value: any): void
        
        /** Calls [param method] on each node inside this tree added to the given [param group]. You can pass arguments to [param method] by specifying them at the end of this method call. Nodes that cannot call [param method] (either because the method doesn't exist or the arguments do not match) are ignored. See also [method set_group] and [method notify_group].  
         *      
         *  **Note:** This method acts immediately on all selected nodes at once, which may cause stuttering in some performance-intensive situations.  
         *      
         *  **Note:** In C#, [param method] must be in snake_case when referring to built-in Godot methods. Prefer using the names exposed in the `MethodName` class to avoid allocating a new [StringName] on each call.  
         */
        callGroup(group: StringName, method: StringName, ...varargs: any[]): void
        
        /** Calls [method Object.notification] with the given [param notification] to all nodes inside this tree added to the [param group]. See also [url=https://docs.godotengine.org/en/latest/tutorials/best_practices/godot_notifications.html]Godot notifications[/url] and [method call_group] and [method set_group].  
         *      
         *  **Note:** This method acts immediately on all selected nodes at once, which may cause stuttering in some performance-intensive situations.  
         */
        notifyGroup(group: StringName, notification: int64): void
        
        /** Sets the given [param property] to [param value] on all nodes inside this tree added to the given [param group]. Nodes that do not have the [param property] are ignored. See also [method call_group] and [method notify_group].  
         *      
         *  **Note:** This method acts immediately on all selected nodes at once, which may cause stuttering in some performance-intensive situations.  
         *      
         *  **Note:** In C#, [param property] must be in snake_case when referring to built-in Godot properties. Prefer using the names exposed in the `PropertyName` class to avoid allocating a new [StringName] on each call.  
         */
        setGroup(group: StringName, property: string, value: any): void
        
        /** Returns an [Array] containing all nodes inside this tree, that have been added to the given [param group], in scene hierarchy order. */
        getNodesInGroup(group: StringName): GArray<Node>
        
        /** Returns the first [Node] found inside the tree, that has been added to the given [param group], in scene hierarchy order. Returns `null` if no match is found. See also [method get_nodes_in_group]. */
        getFirstNodeInGroup(group: StringName): null | Node
        
        /** Returns the number of nodes assigned to the given group. */
        getNodeCountInGroup(group: StringName): int64
        
        /** Changes the running scene to the one at the given [param path], after loading it into a [PackedScene] and creating a new instance.  
         *  Returns [constant OK] on success, [constant ERR_CANT_OPEN] if the [param path] cannot be loaded into a [PackedScene], or [constant ERR_CANT_CREATE] if that scene cannot be instantiated.  
         *      
         *  **Note:** See [method change_scene_to_node] for details on the order of operations.  
         */
        changeSceneToFile(path: string): GError
        
        /** Changes the running scene to a new instance of the given [PackedScene] (which must be valid).  
         *  Returns [constant OK] on success, [constant ERR_CANT_CREATE] if the scene cannot be instantiated, or [constant ERR_INVALID_PARAMETER] if the scene is invalid.  
         *      
         *  **Note:** See [method change_scene_to_node] for details on the order of operations.  
         */
        changeSceneToPacked(packedScene: PackedScene): GError
        
        /** Changes the running scene to the provided [Node]. Useful when you want to set up the new scene before changing.  
         *  Returns [constant OK] on success, [constant ERR_INVALID_PARAMETER] if the [param node] is `null`, or [constant ERR_UNCONFIGURED] if the [param node] is already inside the scene tree.  
         *      
         *  **Note:** Operations happen in the following order when [method change_scene_to_node] is called:  
         *  1. The current scene node is immediately removed from the tree. From that point, [method Node.get_tree] called on the current (outgoing) scene will return `null`. [member current_scene] will be `null` too, because the new scene is not available yet.  
         *  2. At the end of the frame, the formerly current scene, already removed from the tree, will be deleted (freed from memory) and then the new scene node will be added to the tree. [method Node.get_tree] and [member current_scene] will be back to working as usual.  
         *  This ensures that both scenes aren't running at the same time, while still freeing the previous scene in a safe way similar to [method Node.queue_free].  
         *  If you want to reliably access the new scene, await the [signal scene_changed] signal.  
         *  **Warning:** After using this method, the [SceneTree] will take ownership of the node and will free it automatically when changing scene again. Any references you had to that node will become invalid.  
         */
        changeSceneToNode(node: Node): GError
        
        /** Reloads the currently active scene, replacing [member current_scene] with a new instance of its original [PackedScene].  
         *  Returns [constant OK] on success, [constant ERR_UNCONFIGURED] if no [member current_scene] is defined, [constant ERR_CANT_OPEN] if [member current_scene] cannot be loaded into a [PackedScene], or [constant ERR_CANT_CREATE] if the scene cannot be instantiated.  
         */
        reloadCurrentScene(): GError
        
        /** If a current scene is loaded, calling this method will unload it. */
        unloadCurrentScene(): void
        
        /** Sets a custom [MultiplayerAPI] with the given [param root_path] (controlling also the relative subpaths), or override the default one if [param root_path] is empty.  
         *      
         *  **Note:** No [MultiplayerAPI] must be configured for the subpath containing [param root_path], nested custom multiplayers are not allowed. I.e. if one is configured for `"/root/Foo"` setting one for `"/root/Foo/Bar"` will cause an error.  
         *      
         *  **Note:** [method set_multiplayer] should be called  *before*  the child nodes are ready at the given [param root_path]. If multiplayer nodes like [MultiplayerSpawner] or [MultiplayerSynchronizer] are added to the tree before the custom multiplayer API is set, they will not work.  
         */
        setMultiplayer(multiplayer: MultiplayerApi, rootPath?: NodePath | string /* = '' */): void
        
        /** Searches for the [MultiplayerAPI] configured for the given path, if one does not exist it searches the parent paths until one is found. If the path is empty, or none is found, the default one is returned. See [method set_multiplayer]. */
        getMultiplayer(forPath?: NodePath | string /* = '' */): null | MultiplayerApi
        
        /** If `true`, the application automatically accepts quitting requests.  
         *  For mobile platforms, see [member quit_on_go_back].  
         */
        get autoAcceptQuit(): boolean
        set autoAcceptQuit(value: boolean)
        
        /** If `true`, the application quits automatically when navigating back (e.g. using the system "Back" button on Android).  
         *  To handle 'Go Back' button when this option is disabled, use [constant DisplayServer.WINDOW_EVENT_GO_BACK_REQUEST].  
         */
        get quitOnGoBack(): boolean
        set quitOnGoBack(value: boolean)
        
        /** If `true`, collision shapes will be visible when running the game from the editor for debugging purposes. */
        get debugCollisionsHint(): boolean
        set debugCollisionsHint(value: boolean)
        
        /** If `true`, curves from [Path2D] and [Path3D] nodes will be visible when running the game from the editor for debugging purposes.  
         *      
         *  **Note:** This property is not designed to be changed at run-time. Changing the value of [member debug_paths_hint] while the project is running will not have the desired effect.  
         */
        get debugPathsHint(): boolean
        set debugPathsHint(value: boolean)
        
        /** If `true`, navigation polygons will be visible when running the game from the editor for debugging purposes.  
         *      
         *  **Note:** This property is not designed to be changed at run-time. Changing the value of [member debug_navigation_hint] while the project is running will not have the desired effect.  
         */
        get debugNavigationHint(): boolean
        set debugNavigationHint(value: boolean)
        
        /** If `true`, the scene tree is considered paused. This causes the following behavior:  
         *  - 2D and 3D physics will be stopped, as well as collision detection and related signals.  
         *  - Depending on each node's [member Node.process_mode], their [method Node._process], [method Node._physics_process] and [method Node._input] callback methods may not called anymore.  
         */
        get paused(): boolean
        set paused(value: boolean)
        
        /** The root of the scene currently being edited in the editor. This is usually a direct child of [member root].  
         *      
         *  **Note:** This property does nothing in release builds.  
         */
        get editedSceneRoot(): null | Node
        set editedSceneRoot(value: null | Node)
        
        /** The root node of the currently loaded main scene, usually as a direct child of [member root]. See also [method change_scene_to_file], [method change_scene_to_packed], and [method reload_current_scene].  
         *  **Warning:** Setting this property directly may not work as expected, as it does  *not*  add or remove any nodes from this tree.  
         */
        get currentScene(): null | Node
        set currentScene(value: null | Node)
        
        /** The tree's root [Window]. This is top-most [Node] of the scene tree, and is always present. An absolute [NodePath] always starts from this node. Children of the root node may include the loaded [member current_scene], as well as any [url=https://docs.godotengine.org/en/latest/tutorials/scripting/singletons_autoload.html]AutoLoad[/url] configured in the Project Settings.  
         *  **Warning:** Do not delete this node. This will result in unstable behavior, followed by a crash.  
         */
        get root(): null | Node
        
        /** If `true` (default value), enables automatic polling of the [MultiplayerAPI] for this SceneTree during [signal process_frame].  
         *  If `false`, you need to manually call [method MultiplayerAPI.poll] to process network packets and deliver RPCs. This allows running RPCs in a different loop (e.g. physics, thread, specific time step) and for manual [Mutex] protection when accessing the [MultiplayerAPI] from threads.  
         */
        get multiplayerPoll(): boolean
        set multiplayerPoll(value: boolean)
        
        /** If `true`, the renderer will interpolate the transforms of objects (both physics and non-physics) between the last two transforms, so that smooth motion is seen even when physics ticks do not coincide with rendered frames.  
         *  The default value of this property is controlled by [member ProjectSettings.physics/common/physics_interpolation].  
         *      
         *  **Note:** Although this is a global setting, finer control of individual branches of the [SceneTree] is possible using [member Node.physics_interpolation_mode].  
         */
        get physicsInterpolation(): boolean
        set physicsInterpolation(value: boolean)
        
        /** Emitted any time the tree's hierarchy changes (nodes being moved, renamed, etc.). */
        readonly treeChanged: Signal<() => void>
        
        /** Emitted after the new scene is added to scene tree and initialized. Can be used to reliably access [member current_scene] when changing scenes.  
         *    
         */
        readonly sceneChanged: Signal<() => void>
        
        /** Emitted when the [member Node.process_mode] of any node inside the tree is changed. Only emitted in the editor, to update the visibility of disabled nodes. */
        readonly treeProcessModeChanged: Signal<() => void>
        
        /** Emitted when the [param node] enters this tree. */
        readonly nodeAdded: Signal<(node: Node) => void>
        
        /** Emitted when the [param node] exits this tree. */
        readonly nodeRemoved: Signal<(node: Node) => void>
        
        /** Emitted when the [param node]'s [member Node.name] is changed. */
        readonly nodeRenamed: Signal<(node: Node) => void>
        
        /** Emitted when the [param node]'s [method Node.update_configuration_warnings] is called. Only emitted in the editor. */
        readonly nodeConfigurationWarningChanged: Signal<(node: Node) => void>
        
        /** Emitted immediately before [method Node._process] is called on every node in this tree. */
        readonly processFrame: Signal<() => void>
        
        /** Emitted immediately before [method Node._physics_process] is called on every node in this tree. */
        readonly physicsFrame: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSceneTree;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSceneTree;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSceneTreeTimer extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSceneTreeTimer extends __NameMapRefCounted {
        time_left: "timeLeft";
    }
    /** One-shot timer.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scenetreetimer.html  
     */
    class SceneTreeTimer extends RefCounted {
        constructor(identifier?: any)
        /** The time remaining (in seconds). */
        get timeLeft(): float64
        set timeLeft(value: float64)
        
        /** Emitted when the timer reaches 0. */
        readonly timeout: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSceneTreeTimer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSceneTreeTimer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScript extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScript extends __NameMapResource {
        can_instantiate: "canInstantiate";
        has_source_code: "hasSourceCode";
        get_base_script: "getBaseScript";
        get_instance_base_type: "getInstanceBaseType";
        get_global_name: "getGlobalName";
        has_script_method: "hasScriptMethod";
        has_script_signal: "hasScriptSignal";
        get_script_property_list: "getScriptPropertyList";
        get_script_method_list: "getScriptMethodList";
        get_script_signal_list: "getScriptSignalList";
        get_script_constant_map: "getScriptConstantMap";
        get_property_default_value: "getPropertyDefaultValue";
        is_tool: "isTool";
        is_abstract: "isAbstract";
        get_rpc_config: "getRpcConfig";
        instance_has: "instanceHas";
        source_code: "sourceCode";
    }
    /** A class stored as a resource.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_script.html  
     */
    class Script extends Resource {
        constructor(identifier?: any)
        /** Returns `true` if the script can be instantiated. */
        canInstantiate(): boolean
        
        /** Returns `true` if the script contains non-empty source code.  
         *      
         *  **Note:** If a script does not have source code, this does not mean that it is invalid or unusable. For example, a [GDScript] that was exported with binary tokenization has no source code, but still behaves as expected and could be instantiated. This can be checked with [method can_instantiate].  
         */
        hasSourceCode(): boolean
        
        /** Reloads the script's class implementation. Returns an error code. */
        reload(keepState?: boolean /* = false */): GError
        
        /** Returns the script directly inherited by this script. */
        getBaseScript(): null | Script
        
        /** Returns the script's base type. */
        getInstanceBaseType(): StringName
        
        /** Returns the class name associated with the script, if there is one. Returns an empty string otherwise.  
         *  To give the script a global name, you can use the `class_name` keyword in GDScript and the `[GlobalClass]` attribute in C#.  
         *    
         */
        getGlobalName(): StringName
        
        /** Returns `true` if the script, or a base class, defines a method with the given name. */
        hasScriptMethod(methodName: StringName): boolean
        
        /** Returns `true` if the script, or a base class, defines a signal with the given name. */
        hasScriptSignal(signalName: StringName): boolean
        
        /** Returns the list of properties in this [Script].  
         *      
         *  **Note:** The dictionaries returned by this method are formatted identically to those returned by [method Object.get_property_list].  
         */
        getScriptPropertyList(): GArray<GDictionary>
        
        /** Returns the list of methods in this [Script].  
         *      
         *  **Note:** The dictionaries returned by this method are formatted identically to those returned by [method Object.get_method_list].  
         */
        getScriptMethodList(): GArray<GDictionary>
        
        /** Returns the list of signals defined in this [Script].  
         *      
         *  **Note:** The dictionaries returned by this method are formatted identically to those returned by [method Object.get_signal_list].  
         */
        getScriptSignalList(): GArray<GDictionary>
        
        /** Returns a dictionary containing constant names and their values. */
        getScriptConstantMap(): GDictionary
        
        /** Returns the default value of the specified property.  
         *      
         *  **Note:** In GDScript and C#, this method returns `null` outside of editor builds.  
         */
        getPropertyDefaultValue(property: StringName): any
        
        /** Returns `true` if the script is a tool script. A tool script can run in the editor. */
        isTool(): boolean
        
        /** Returns `true` if the script is an abstract script. An abstract script does not have a constructor and cannot be instantiated. */
        isAbstract(): boolean
        
        /** Returns a [Dictionary] mapping method names to their RPC configuration defined by this script. */
        getRpcConfig(): any
        
        /** Returns `true` if [param base_object] is an instance of this script. */
        instanceHas(baseObject: GObject): boolean
        
        /** The script source code or an empty string if source code is not available. When set, does not reload the class implementation automatically. */
        get sourceCode(): string
        set sourceCode(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScript;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScript;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptBacktrace extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptBacktrace extends __NameMapRefCounted {
        get_language_name: "getLanguageName";
        is_empty: "isEmpty";
        get_frame_count: "getFrameCount";
        get_frame_function: "getFrameFunction";
        get_frame_file: "getFrameFile";
        get_frame_line: "getFrameLine";
        get_global_variable_count: "getGlobalVariableCount";
        get_global_variable_name: "getGlobalVariableName";
        get_global_variable_value: "getGlobalVariableValue";
        get_local_variable_count: "getLocalVariableCount";
        get_local_variable_name: "getLocalVariableName";
        get_local_variable_value: "getLocalVariableValue";
        get_member_variable_count: "getMemberVariableCount";
        get_member_variable_name: "getMemberVariableName";
        get_member_variable_value: "getMemberVariableValue";
    }
    /** A captured backtrace of a specific script language.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scriptbacktrace.html  
     */
    class ScriptBacktrace extends RefCounted {
        constructor(identifier?: any)
        /** Returns the name of the script language that this backtrace was captured from. */
        getLanguageName(): string
        
        /** Returns `true` if the backtrace has no stack frames. */
        isEmpty(): boolean
        
        /** Returns the number of stack frames in the backtrace. */
        getFrameCount(): int64
        
        /** Returns the name of the function called at the stack frame at the specified index. */
        getFrameFunction(index: int64): string
        
        /** Returns the file name of the call site represented by the stack frame at the specified index. */
        getFrameFile(index: int64): string
        
        /** Returns the line number of the call site represented by the stack frame at the specified index. */
        getFrameLine(index: int64): int64
        
        /** Returns the number of global variables (e.g. autoload singletons) in the backtrace.  
         *      
         *  **Note:** This will be non-zero only if the `include_variables` parameter was `true` when capturing the backtrace with [method Engine.capture_script_backtraces].  
         */
        getGlobalVariableCount(): int64
        
        /** Returns the name of the global variable at the specified index. */
        getGlobalVariableName(variableIndex: int64): string
        
        /** Returns the value of the global variable at the specified index.  
         *  **Warning:** With GDScript backtraces, the returned [Variant] will be the variable's actual value, including any object references. This means that storing the returned [Variant] will prevent any such object from being deallocated, so it's generally recommended not to do so.  
         */
        getGlobalVariableValue(variableIndex: int64): any
        
        /** Returns the number of local variables in the stack frame at the specified index.  
         *      
         *  **Note:** This will be non-zero only if the `include_variables` parameter was `true` when capturing the backtrace with [method Engine.capture_script_backtraces].  
         */
        getLocalVariableCount(frameIndex: int64): int64
        
        /** Returns the name of the local variable at the specified [param variable_index] in the stack frame at the specified [param frame_index]. */
        getLocalVariableName(frameIndex: int64, variableIndex: int64): string
        
        /** Returns the value of the local variable at the specified [param variable_index] in the stack frame at the specified [param frame_index].  
         *  **Warning:** With GDScript backtraces, the returned [Variant] will be the variable's actual value, including any object references. This means that storing the returned [Variant] will prevent any such object from being deallocated, so it's generally recommended not to do so.  
         */
        getLocalVariableValue(frameIndex: int64, variableIndex: int64): any
        
        /** Returns the number of member variables in the stack frame at the specified index.  
         *      
         *  **Note:** This will be non-zero only if the `include_variables` parameter was `true` when capturing the backtrace with [method Engine.capture_script_backtraces].  
         */
        getMemberVariableCount(frameIndex: int64): int64
        
        /** Returns the name of the member variable at the specified [param variable_index] in the stack frame at the specified [param frame_index]. */
        getMemberVariableName(frameIndex: int64, variableIndex: int64): string
        
        /** Returns the value of the member variable at the specified [param variable_index] in the stack frame at the specified [param frame_index].  
         *  **Warning:** With GDScript backtraces, the returned [Variant] will be the variable's actual value, including any object references. This means that storing the returned [Variant] will prevent any such object from being deallocated, so it's generally recommended not to do so.  
         */
        getMemberVariableValue(frameIndex: int64, variableIndex: int64): any
        
        /** Converts the backtrace to a [String], where the entire string will be indented by [param indent_all] number of spaces, and the individual stack frames will be additionally indented by [param indent_frames] number of spaces.  
         *      
         *  **Note:** Calling [method Object.to_string] on a [ScriptBacktrace] will produce the same output as calling [method format] with all parameters left at their default values.  
         */
        format(indentAll?: int64 /* = 0 */, indentFrames?: int64 /* = 4 */): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptBacktrace;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptBacktrace;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptCreateDialog extends __RPCMapConfirmationDialog {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptCreateDialog extends __NameMapConfirmationDialog {
        script_created: "scriptCreated";
    }
    /** Godot editor's popup dialog for creating new [Script] files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scriptcreatedialog.html  
     */
    class ScriptCreateDialog<Map extends NodePathMap = any> extends ConfirmationDialog<Map> {
        constructor(identifier?: any)
        /** Prefills required fields to configure the ScriptCreateDialog for use. */
        config(inherits: string, path: string, builtInEnabled?: boolean /* = true */, loadEnabled?: boolean /* = true */): void
        
        /** Emitted when the user clicks the OK button. */
        readonly scriptCreated: Signal<(script: Script) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptCreateDialog;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptCreateDialog;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptEditor extends __RPCMapEditorDock {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptEditor extends __NameMapEditorDock {
        get_current_editor: "getCurrentEditor";
        get_open_script_editors: "getOpenScriptEditors";
        get_breakpoints: "getBreakpoints";
        register_syntax_highlighter: "registerSyntaxHighlighter";
        unregister_syntax_highlighter: "unregisterSyntaxHighlighter";
        goto_line: "gotoLine";
        get_current_script: "getCurrentScript";
        get_open_scripts: "getOpenScripts";
        open_script_create_dialog: "openScriptCreateDialog";
        reload_open_files: "reloadOpenFiles";
        goto_help: "gotoHelp";
        update_docs_from_script: "updateDocsFromScript";
        clear_docs_from_script: "clearDocsFromScript";
        get_unsaved_files: "getUnsavedFiles";
        save_all_scripts: "saveAllScripts";
        close_file: "closeFile";
        editor_script_changed: "editorScriptChanged";
        script_close: "scriptClose";
    }
    /** Godot editor's script editor.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scripteditor.html  
     */
    class ScriptEditor<Map extends NodePathMap = any> extends EditorDock<Map> {
        constructor(identifier?: any)
        /** Returns the [ScriptEditorBase] object that the user is currently editing. */
        getCurrentEditor(): null | ScriptEditorBase
        
        /** Returns an array with all [ScriptEditorBase] objects which are currently open in editor. */
        getOpenScriptEditors(): GArray<ScriptEditorBase>
        
        /** Returns array of breakpoints. */
        getBreakpoints(): PackedStringArray
        
        /** Registers the [EditorSyntaxHighlighter] to the editor, the [EditorSyntaxHighlighter] will be available on all open scripts.  
         *      
         *  **Note:** Does not apply to scripts that are already opened.  
         */
        registerSyntaxHighlighter(syntaxHighlighter: EditorSyntaxHighlighter): void
        
        /** Unregisters the [EditorSyntaxHighlighter] from the editor.  
         *      
         *  **Note:** The [EditorSyntaxHighlighter] will still be applied to scripts that are already opened.  
         */
        unregisterSyntaxHighlighter(syntaxHighlighter: EditorSyntaxHighlighter): void
        
        /** Goes to the specified line in the current script. */
        gotoLine(lineNumber: int64): void
        
        /** Returns a [Script] that is currently active in editor. */
        getCurrentScript(): null | Script
        
        /** Returns an array with all [Script] objects which are currently open in editor. */
        getOpenScripts(): GArray<Script>
        
        /** Opens the script create dialog. The script will extend [param base_name]. The file extension can be omitted from [param base_path]. It will be added based on the selected scripting language. */
        openScriptCreateDialog(baseName: string, basePath: string): void
        
        /** Reloads all currently opened files. This should be used when opened files are changed outside of the script editor. The user may be prompted to resolve file conflicts, see [member EditorSettings.text_editor/behavior/files/auto_reload_scripts_on_external_change]. */
        reloadOpenFiles(): void
        
        /** Opens help for the given topic. The [param topic] is an encoded string that controls which class, method, constant, signal, annotation, property, or theme item should be focused.  
         *  The supported [param topic] formats include `class_name:class`, `class_method:class:method`, `class_constant:class:constant`, `class_signal:class:signal`, `class_annotation:class:@annotation`, `class_property:class:property`, and `class_theme_item:class:item`, where `class` is the class name, `method` is the method name, `constant` is the constant name, `signal` is the signal name, `annotation` is the annotation name, `property` is the property name, and `item` is the theme item.  
         *    
         */
        gotoHelp(topic: string): void
        
        /** Updates the documentation for the given [param script].  
         *      
         *  **Note:** This should be called whenever the script is changed to keep the open documentation state up to date.  
         */
        updateDocsFromScript(script: Script): void
        
        /** Removes the documentation for the given [param script].  
         *      
         *  **Note:** This should be called whenever the script is changed to keep the open documentation state up to date.  
         */
        clearDocsFromScript(script: Script): void
        
        /** Returns an array of file paths of scripts with unsaved changes open in the editor. */
        getUnsavedFiles(): PackedStringArray
        
        /** Saves all open scripts. */
        saveAllScripts(): void
        
        /** Closes the file at the given [param path], discarding any unsaved changes.  
         *  Returns [constant OK] on success or [constant ERR_FILE_NOT_FOUND] if the file is not found.  
         */
        closeFile(path: string): GError
        
        /** Emitted when user changed active script. Argument is a freshly activated [Script]. */
        readonly editorScriptChanged: Signal<(script: Script) => void>
        
        /** Emitted when editor is about to close the active script. Argument is a [Script] that is going to be closed. */
        readonly scriptClose: Signal<(script: Script) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptEditor;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptEditor;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptEditorBase extends __RPCMapVBoxContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptEditorBase extends __NameMapVBoxContainer {
        add_syntax_highlighter: "addSyntaxHighlighter";
        get_base_editor: "getBaseEditor";
        name_changed: "nameChanged";
        _validation_updated: "_validationUpdated";
        _request_save_new_history: "_requestSaveNewHistory";
        _request_save_previous_state: "_requestSavePreviousState";
        request_help: "requestHelp";
        request_open_script_at_line: "requestOpenScriptAtLine";
        go_to_help: "goToHelp";
        go_to_method: "goToMethod";
        request_save_history: "requestSaveHistory";
        request_save_previous_state: "requestSavePreviousState";
        edited_script_changed: "editedScriptChanged";
        search_in_files_requested: "searchInFilesRequested";
        replace_in_files_requested: "replaceInFilesRequested";
    }
    /** Base editor for editing scripts in the [ScriptEditor].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scripteditorbase.html  
     */
    class ScriptEditorBase<Map extends NodePathMap = any> extends VBoxContainer<Map> {
        constructor(identifier?: any)
        /** Adds an [EditorSyntaxHighlighter] to the open script. */
        addSyntaxHighlighter(highlighter: EditorSyntaxHighlighter): void
        
        /** Returns the underlying [Control] used for editing scripts. For text scripts, this is a [CodeEdit]. */
        getBaseEditor(): null | Control
        
        /** Emitted after script validation or when the edited resource has changed. */
        readonly nameChanged: Signal<() => void>
        readonly _validationUpdated: Signal<() => void>
        readonly _requestSaveNewHistory: Signal<(state: GDictionary) => void>
        readonly _requestSavePreviousState: Signal<(state: GDictionary) => void>
        
        /** Emitted when the user requests contextual help. */
        readonly requestHelp: Signal<(topic: string) => void>
        
        /** Emitted when the user requests to view a specific line of a script, similar to [signal go_to_method]. */
        readonly requestOpenScriptAtLine: Signal<(script: GObject, line: int64) => void>
        
        /** Emitted when the user requests a specific documentation page. */
        readonly goToHelp: Signal<(what: string) => void>
        
        /** Emitted when the user requests to view a specific method of a script, similar to [signal request_open_script_at_line]. */
        readonly goToMethod: Signal<(script: GObject, method: string) => void>
        
        /** Emitted when the editor requests to save a new history navigation point. */
        readonly requestSaveHistory: Signal<() => void>
        
        /** Emitted when the editor requests an update to its navigation point. */
        readonly requestSavePreviousState: Signal<(state: GDictionary) => void>
        
        /** Emitted after script validation. */
        readonly editedScriptChanged: Signal<() => void>
        
        /** Emitted when the user request to search text in the file system. */
        readonly searchInFilesRequested: Signal<(text: string) => void>
        
        /** Emitted when the user request to find and replace text in the file system. */
        readonly replaceInFilesRequested: Signal<(text: string) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptEditorBase;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptEditorBase;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptExtension extends __RPCMapScript {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptExtension extends __NameMapScript {
        _editor_can_reload_from_file: "_editorCanReloadFromFile";
        _placeholder_erased: "_placeholderErased";
        _can_instantiate: "_canInstantiate";
        _get_base_script: "_getBaseScript";
        _get_global_name: "_getGlobalName";
        _inherits_script: "_inheritsScript";
        _get_instance_base_type: "_getInstanceBaseType";
        _instance_create: "_instanceCreate";
        _placeholder_instance_create: "_placeholderInstanceCreate";
        _has_source_code: "_hasSourceCode";
        _get_source_code: "_getSourceCode";
        _set_source_code: "_setSourceCode";
        _get_doc_class_name: "_getDocClassName";
        _get_documentation: "_getDocumentation";
        _get_class_icon_path: "_getClassIconPath";
        _has_method: "_hasMethod";
        _has_static_method: "_hasStaticMethod";
        _get_script_method_argument_count: "_getScriptMethodArgumentCount";
        _get_method_info: "_getMethodInfo";
        _is_tool: "_isTool";
        _is_valid: "_isValid";
        _is_abstract: "_isAbstract";
        _get_language: "_getLanguage";
        _has_script_signal: "_hasScriptSignal";
        _get_script_signal_list: "_getScriptSignalList";
        _has_property_default_value: "_hasPropertyDefaultValue";
        _get_property_default_value: "_getPropertyDefaultValue";
        _update_exports: "_updateExports";
        _get_script_method_list: "_getScriptMethodList";
        _get_script_property_list: "_getScriptPropertyList";
        _get_member_line: "_getMemberLine";
        _get_constants: "_getConstants";
        _get_members: "_getMembers";
        _is_placeholder_fallback_enabled: "_isPlaceholderFallbackEnabled";
        _get_rpc_config: "_getRpcConfig";
        _instance_has: "_instanceHas";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_scriptextension.html */
    class ScriptExtension extends Script {
        constructor(identifier?: any)
        /* gdvirtual */ _editorCanReloadFromFile(): boolean
        /* gdvirtual */ _placeholderErased(placeholder: int64): void
        /* gdvirtual */ _canInstantiate(): boolean
        /* gdvirtual */ _getBaseScript(): null | Script
        /* gdvirtual */ _getGlobalName(): StringName
        /* gdvirtual */ _inheritsScript(script: Script): boolean
        /* gdvirtual */ _getInstanceBaseType(): StringName
        /* gdvirtual */ _instanceCreate(forObject: GObject): int64
        /* gdvirtual */ _placeholderInstanceCreate(forObject: GObject): int64
        /* gdvirtual */ _hasSourceCode(): boolean
        /* gdvirtual */ _getSourceCode(): string
        /* gdvirtual */ _setSourceCode(code: string): void
        /* gdvirtual */ _reload(keepState: boolean): GError
        /* gdvirtual */ _getDocClassName(): StringName
        /* gdvirtual */ _getDocumentation(): GArray<GDictionary>
        /* gdvirtual */ _getClassIconPath(): string
        /* gdvirtual */ _hasMethod(method: StringName): boolean
        /* gdvirtual */ _hasStaticMethod(method: StringName): boolean
        
        /** Return the expected argument count for the given [param method], or `null` if it can't be determined (which will then fall back to the default behavior). */
        /* gdvirtual */ _getScriptMethodArgumentCount(method: StringName): any
        /* gdvirtual */ _getMethodInfo(method: StringName): GDictionary
        /* gdvirtual */ _isTool(): boolean
        /* gdvirtual */ _isValid(): boolean
        
        /** Returns `true` if the script is an abstract script. Abstract scripts cannot be instantiated directly, instead other scripts should inherit them. Abstract scripts will be either unselectable or hidden in the Create New Node dialog (unselectable if there are non-abstract classes inheriting it, otherwise hidden). */
        /* gdvirtual */ _isAbstract(): boolean
        /* gdvirtual */ _getLanguage(): null | ScriptLanguage
        /* gdvirtual */ _hasScriptSignal(signal: StringName): boolean
        /* gdvirtual */ _getScriptSignalList(): GArray<GDictionary>
        /* gdvirtual */ _hasPropertyDefaultValue(property: StringName): boolean
        /* gdvirtual */ _getPropertyDefaultValue(property: StringName): any
        /* gdvirtual */ _updateExports(): void
        /* gdvirtual */ _getScriptMethodList(): GArray<GDictionary>
        /* gdvirtual */ _getScriptPropertyList(): GArray<GDictionary>
        /* gdvirtual */ _getMemberLine(member: StringName): int64
        /* gdvirtual */ _getConstants(): GDictionary
        /* gdvirtual */ _getMembers(): GArray<StringName>
        /* gdvirtual */ _isPlaceholderFallbackEnabled(): boolean
        /* gdvirtual */ _getRpcConfig(): any
        /* gdvirtual */ _instanceHas(object: GObject): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptExtension;
    }
    namespace ScriptLanguage {
        enum ScriptNameCasing {
            ScriptNameCasingAuto = 0,
            ScriptNameCasingPascalCase = 1,
            ScriptNameCasingSnakeCase = 2,
            ScriptNameCasingKebabCase = 3,
            ScriptNameCasingCamelCase = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptLanguage extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptLanguage extends __NameMapGObject {
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_scriptlanguage.html */
    class ScriptLanguage extends GObject {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptLanguage;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptLanguage;
    }
    namespace ScriptLanguageExtension {
        enum LookupResultType {
            LookupResultScriptLocation = 0,
            LookupResultClass = 1,
            LookupResultClassConstant = 2,
            LookupResultClassProperty = 3,
            LookupResultClassMethod = 4,
            LookupResultClassSignal = 5,
            LookupResultClassEnum = 6,
            LookupResultClassTbdGlobalscope = 7,
            LookupResultClassAnnotation = 8,
            LookupResultLocalConstant = 9,
            LookupResultLocalVariable = 10,
            LookupResultMax = 11,
        }
        enum CodeCompletionLocation {
            LocationLocal = 0,
            LocationParentMask = 256,
            LocationOtherUserCode = 512,
            LocationOther = 1024,
        }
        enum CodeCompletionKind {
            CodeCompletionKindClass = 0,
            CodeCompletionKindFunction = 1,
            CodeCompletionKindSignal = 2,
            CodeCompletionKindVariable = 3,
            CodeCompletionKindMember = 4,
            CodeCompletionKindEnum = 5,
            CodeCompletionKindConstant = 6,
            CodeCompletionKindNodePath = 7,
            CodeCompletionKindFilePath = 8,
            CodeCompletionKindPlainText = 9,
            CodeCompletionKindKeyword = 10,
            CodeCompletionKindMax = 11,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScriptLanguageExtension extends __RPCMapScriptLanguage {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScriptLanguageExtension extends __NameMapScriptLanguage {
        _get_name: "_getName";
        _get_type: "_getType";
        _get_extension: "_getExtension";
        _get_reserved_words: "_getReservedWords";
        _is_control_flow_keyword: "_isControlFlowKeyword";
        _get_comment_delimiters: "_getCommentDelimiters";
        _get_doc_comment_delimiters: "_getDocCommentDelimiters";
        _get_string_delimiters: "_getStringDelimiters";
        _make_template: "_makeTemplate";
        _get_built_in_templates: "_getBuiltInTemplates";
        _is_using_templates: "_isUsingTemplates";
        _validate_path: "_validatePath";
        _create_script: "_createScript";
        _has_named_classes: "_hasNamedClasses";
        _get_recognized_extensions: "_getRecognizedExtensions";
        _supports_builtin_mode: "_supportsBuiltinMode";
        _supports_documentation: "_supportsDocumentation";
        _can_inherit_from_file: "_canInheritFromFile";
        _find_function: "_findFunction";
        _make_function: "_makeFunction";
        _can_make_function: "_canMakeFunction";
        _open_in_external_editor: "_openInExternalEditor";
        _overrides_external_editor: "_overridesExternalEditor";
        _preferred_file_name_casing: "_preferredFileNameCasing";
        _complete_code: "_completeCode";
        _lookup_code: "_lookupCode";
        _auto_indent_code: "_autoIndentCode";
        _add_global_constant: "_addGlobalConstant";
        _add_named_global_constant: "_addNamedGlobalConstant";
        _remove_named_global_constant: "_removeNamedGlobalConstant";
        _thread_enter: "_threadEnter";
        _thread_exit: "_threadExit";
        _debug_get_error: "_debugGetError";
        _debug_get_stack_level_count: "_debugGetStackLevelCount";
        _debug_get_stack_level_line: "_debugGetStackLevelLine";
        _debug_get_stack_level_function: "_debugGetStackLevelFunction";
        _debug_get_stack_level_source: "_debugGetStackLevelSource";
        _debug_get_stack_level_locals: "_debugGetStackLevelLocals";
        _debug_get_stack_level_members: "_debugGetStackLevelMembers";
        _debug_get_stack_level_instance: "_debugGetStackLevelInstance";
        _debug_get_globals: "_debugGetGlobals";
        _debug_parse_stack_level_expression: "_debugParseStackLevelExpression";
        _debug_get_current_stack_info: "_debugGetCurrentStackInfo";
        _reload_all_scripts: "_reloadAllScripts";
        _reload_scripts: "_reloadScripts";
        _reload_tool_script: "_reloadToolScript";
        _get_public_functions: "_getPublicFunctions";
        _get_public_constants: "_getPublicConstants";
        _get_public_annotations: "_getPublicAnnotations";
        _profiling_start: "_profilingStart";
        _profiling_stop: "_profilingStop";
        _profiling_set_save_native_calls: "_profilingSetSaveNativeCalls";
        _profiling_get_accumulated_data: "_profilingGetAccumulatedData";
        _profiling_get_frame_data: "_profilingGetFrameData";
        _handles_global_class_type: "_handlesGlobalClassType";
        _get_global_class_name: "_getGlobalClassName";
    }
    /** @link https://docs.godotengine.org/en/latest/classes/class_scriptlanguageextension.html */
    class ScriptLanguageExtension extends ScriptLanguage {
        constructor(identifier?: any)
        /* gdvirtual */ _getName(): string
        /* gdvirtual */ _init(): void
        /* gdvirtual */ _getType(): string
        /* gdvirtual */ _getExtension(): string
        /* gdvirtual */ _finish(): void
        /* gdvirtual */ _getReservedWords(): PackedStringArray
        /* gdvirtual */ _isControlFlowKeyword(keyword: string): boolean
        /* gdvirtual */ _getCommentDelimiters(): PackedStringArray
        /* gdvirtual */ _getDocCommentDelimiters(): PackedStringArray
        /* gdvirtual */ _getStringDelimiters(): PackedStringArray
        /* gdvirtual */ _makeTemplate(template: string, className: string, baseClassName: string): null | Script
        /* gdvirtual */ _getBuiltInTemplates(object: StringName): GArray<GDictionary>
        /* gdvirtual */ _isUsingTemplates(): boolean
        /* gdvirtual */ _validate(script: string, path: string, validateFunctions: boolean, validateErrors: boolean, validateWarnings: boolean, validateSafeLines: boolean): GDictionary
        /* gdvirtual */ _validatePath(path: string): string
        /* gdvirtual */ _createScript(): null | GObject
        /* gdvirtual */ _hasNamedClasses(): boolean
        /* gdvirtual */ _getRecognizedExtensions(): PackedStringArray
        /* gdvirtual */ _supportsBuiltinMode(): boolean
        /* gdvirtual */ _supportsDocumentation(): boolean
        /* gdvirtual */ _canInheritFromFile(): boolean
        
        /** Returns the line where the function is defined in the code, or `-1` if the function is not present. */
        /* gdvirtual */ _findFunction(function_: string, code: string): int64
        /* gdvirtual */ _makeFunction(className: string, functionName: string, functionArgs: PackedStringArray | string[]): string
        /* gdvirtual */ _canMakeFunction(): boolean
        /* gdvirtual */ _openInExternalEditor(script: Script, line: int64, column: int64): GError
        /* gdvirtual */ _overridesExternalEditor(): boolean
        /* gdvirtual */ _preferredFileNameCasing(): ScriptLanguage.ScriptNameCasing
        /* gdvirtual */ _completeCode(code: string, path: string, owner: GObject): GDictionary
        /* gdvirtual */ _lookupCode(code: string, symbol: string, path: string, owner: GObject): GDictionary
        /* gdvirtual */ _autoIndentCode(code: string, fromLine: int64, toLine: int64): string
        /* gdvirtual */ _addGlobalConstant(name: StringName, value: any): void
        /* gdvirtual */ _addNamedGlobalConstant(name: StringName, value: any): void
        /* gdvirtual */ _removeNamedGlobalConstant(name: StringName): void
        /* gdvirtual */ _threadEnter(): void
        /* gdvirtual */ _threadExit(): void
        /* gdvirtual */ _debugGetError(): string
        /* gdvirtual */ _debugGetStackLevelCount(): int64
        /* gdvirtual */ _debugGetStackLevelLine(level: int64): int64
        /* gdvirtual */ _debugGetStackLevelFunction(level: int64): string
        
        /** Returns the source associated with a given debug stack position. */
        /* gdvirtual */ _debugGetStackLevelSource(level: int64): string
        /* gdvirtual */ _debugGetStackLevelLocals(level: int64, maxSubitems: int64, maxDepth: int64): GDictionary
        /* gdvirtual */ _debugGetStackLevelMembers(level: int64, maxSubitems: int64, maxDepth: int64): GDictionary
        /* gdvirtual */ _debugGetStackLevelInstance(level: int64): int64
        /* gdvirtual */ _debugGetGlobals(maxSubitems: int64, maxDepth: int64): GDictionary
        /* gdvirtual */ _debugParseStackLevelExpression(level: int64, expression: string, maxSubitems: int64, maxDepth: int64): string
        /* gdvirtual */ _debugGetCurrentStackInfo(): GArray<GDictionary>
        /* gdvirtual */ _reloadAllScripts(): void
        
        /** Reloads all [param scripts] from disk and the specifics of how that happens is [ScriptLanguageExtension] specific.  
         *  [param soft_reload] is always `true`.  
         */
        /* gdvirtual */ _reloadScripts(scripts: GArray, softReload: boolean): void
        
        /** Reloads the given [param script] from disk and the specifics of how that happens is [ScriptLanguageExtension] specific.  
         *  [param soft_reload] is always `true`.  
         */
        /* gdvirtual */ _reloadToolScript(script: Script, softReload: boolean): void
        /* gdvirtual */ _getPublicFunctions(): GArray<GDictionary>
        /* gdvirtual */ _getPublicConstants(): GDictionary
        /* gdvirtual */ _getPublicAnnotations(): GArray<GDictionary>
        /* gdvirtual */ _profilingStart(): void
        /* gdvirtual */ _profilingStop(): void
        /* gdvirtual */ _profilingSetSaveNativeCalls(enable: boolean): void
        /* gdvirtual */ _profilingGetAccumulatedData(infoArray: int64, infoMax: int64): int64
        /* gdvirtual */ _profilingGetFrameData(infoArray: int64, infoMax: int64): int64
        /* gdvirtual */ _frame(): void
        /* gdvirtual */ _handlesGlobalClassType(type: string): boolean
        /* gdvirtual */ _getGlobalClassName(path: string): GDictionary
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScriptLanguageExtension;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScriptLanguageExtension;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScrollBar extends __RPCMapRange {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScrollBar extends __NameMapRange {
        custom_step: "customStep";
    }
    /** Abstract base class for scrollbars.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scrollbar.html  
     */
    class ScrollBar<Map extends NodePathMap = any> extends Range<Map> {
        constructor(identifier?: any)
        /** Overrides the step used when clicking increment and decrement buttons or when using arrow keys when the [ScrollBar] is focused. */
        get customStep(): float64
        set customStep(value: float64)
        
        /** Emitted when the scrollbar is being scrolled. */
        readonly scrolling: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScrollBar;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScrollBar;
    }
    namespace ScrollContainer {
        enum ScrollMode {
            ScrollModeDisabled = 0,
            ScrollModeAuto = 1,
            ScrollModeShowAlways = 2,
            ScrollModeShowNever = 3,
            ScrollModeReserve = 4,
            ScrollModeMaximizeFirst = 5,
        }
        enum ScrollHintMode {
            ScrollHintModeDisabled = 0,
            ScrollHintModeAll = 1,
            ScrollHintModeTopAndLeft = 2,
            ScrollHintModeBottomAndRight = 3,
            ScrollHintModeTopAndBottom = 4,
            ScrollHintModeLeftAndRight = 5,
            ScrollHintModeTop = 6,
            ScrollHintModeBottom = 7,
            ScrollHintModeLeft = 8,
            ScrollHintModeRight = 9,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapScrollContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapScrollContainer extends __NameMapContainer {
        get_h_scroll_bar: "getHScrollBar";
        get_v_scroll_bar: "getVScrollBar";
        ensure_control_visible: "ensureControlVisible";
        follow_focus: "followFocus";
        draw_focus_border: "drawFocusBorder";
        scroll_horizontal: "scrollHorizontal";
        scroll_vertical: "scrollVertical";
        scroll_horizontal_custom_step: "scrollHorizontalCustomStep";
        scroll_vertical_custom_step: "scrollVerticalCustomStep";
        horizontal_scroll_mode: "horizontalScrollMode";
        vertical_scroll_mode: "verticalScrollMode";
        scroll_horizontal_by_default: "scrollHorizontalByDefault";
        scroll_deadzone: "scrollDeadzone";
        scroll_hint_mode: "scrollHintMode";
        tile_scroll_hint: "tileScrollHint";
        scroll_started: "scrollStarted";
        scroll_ended: "scrollEnded";
    }
    /** A container used to provide scrollbars to a child control when needed.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_scrollcontainer.html  
     */
    class ScrollContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** Returns the horizontal scrollbar [HScrollBar] of this [ScrollContainer].  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to disable or hide a scrollbar, you can use [member horizontal_scroll_mode].  
         */
        getHScrollBar(): null | HScrollBar
        
        /** Returns the vertical scrollbar [VScrollBar] of this [ScrollContainer].  
         *  **Warning:** This is a required internal node, removing and freeing it may cause a crash. If you wish to disable or hide a scrollbar, you can use [member vertical_scroll_mode].  
         */
        getVScrollBar(): null | VScrollBar
        
        /** Ensures the given [param control] is visible (must be a direct or indirect child of the ScrollContainer). Used by [member follow_focus].  
         *      
         *  **Note:** This will not work on a node that was just added during the same frame. If you want to scroll to a newly added child, you must wait until the next frame using [signal SceneTree.process_frame]:  
         *    
         */
        ensureControlVisible(control: Control): void
        
        /** If `true`, the ScrollContainer will automatically scroll to focused children (including indirect children) to make sure they are fully visible. */
        get followFocus(): boolean
        set followFocus(value: boolean)
        
        /** If `true`, [theme_item focus] is drawn when the ScrollContainer or one of its descendant nodes is focused. */
        get drawFocusBorder(): boolean
        set drawFocusBorder(value: boolean)
        
        /** The current horizontal scroll value.  
         *      
         *  **Note:** If you are setting this value in the [method Node._ready] function or earlier, it needs to be wrapped with [method Object.set_deferred], since scroll bar's [member Range.max_value] is not initialized yet.  
         *    
         */
        get scrollHorizontal(): int64
        set scrollHorizontal(value: int64)
        
        /** The current vertical scroll value.  
         *      
         *  **Note:** Setting it early needs to be deferred, just like in [member scroll_horizontal].  
         *    
         */
        get scrollVertical(): int64
        set scrollVertical(value: int64)
        
        /** Overrides the [member ScrollBar.custom_step] used when clicking the internal scroll bar's horizontal increment and decrement buttons or when using arrow keys when the [ScrollBar] is focused. */
        get scrollHorizontalCustomStep(): float64
        set scrollHorizontalCustomStep(value: float64)
        
        /** Overrides the [member ScrollBar.custom_step] used when clicking the internal scroll bar's vertical increment and decrement buttons or when using arrow keys when the [ScrollBar] is focused. */
        get scrollVerticalCustomStep(): float64
        set scrollVerticalCustomStep(value: float64)
        
        /** Controls whether horizontal scrollbar can be used and when it should be visible. */
        get horizontalScrollMode(): int64
        set horizontalScrollMode(value: int64)
        
        /** Controls whether vertical scrollbar can be used and when it should be visible. */
        get verticalScrollMode(): int64
        set verticalScrollMode(value: int64)
        
        /** If `true`, the mouse wheel scrolls the view horizontally, and holding [kbd]Shift[/kbd] scrolls vertically.  
         *  If `false` (default), the mouse wheel scrolls the view vertically, and holding [kbd]Shift[/kbd] scrolls horizontally.  
         */
        get scrollHorizontalByDefault(): boolean
        set scrollHorizontalByDefault(value: boolean)
        
        /** Deadzone for touch scrolling. Lower deadzone makes the scrolling more sensitive. */
        get scrollDeadzone(): int64
        set scrollDeadzone(value: int64)
        
        /** The way which scroll hints (indicators that show that the content can still be scrolled in a certain direction) will be shown.  
         *      
         *  **Note:** Modes with perpendicular hints won't be shown if the content can be scrolled both vertically and horizontally.  
         */
        get scrollHintMode(): int64
        set scrollHintMode(value: int64)
        
        /** If `true`, the scroll hint texture will be tiled instead of stretched. See [member scroll_hint_mode]. */
        get tileScrollHint(): boolean
        set tileScrollHint(value: boolean)
        
        /** Emitted when scrolling starts when dragging the scrollable area  *with a touch event* . This signal is  *not*  emitted when scrolling by dragging the scrollbar, scrolling with the mouse wheel or scrolling with keyboard/gamepad events.  
         *      
         *  **Note:** This signal is only emitted on Android or iOS, or on desktop/web platforms when [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse] is enabled.  
         */
        readonly scrollStarted: Signal<() => void>
        
        /** Emitted when scrolling stops when dragging the scrollable area  *with a touch event* . This signal is  *not*  emitted when scrolling by dragging the scrollbar, scrolling with the mouse wheel or scrolling with keyboard/gamepad events.  
         *      
         *  **Note:** This signal is only emitted on Android or iOS, or on desktop/web platforms when [member ProjectSettings.input_devices/pointing/emulate_touch_from_mouse] is enabled.  
         */
        readonly scrollEnded: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapScrollContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapScrollContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSegmentShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSegmentShape2D extends __NameMapShape2D {
    }
    /** A 2D line segment shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_segmentshape2d.html  
     */
    class SegmentShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The segment's first point position. */
        get a(): Vector2
        set a(value: Vector2)
        
        /** The segment's second point position. */
        get b(): Vector2
        set b(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSegmentShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSegmentShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSeparationRayShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSeparationRayShape2D extends __NameMapShape2D {
        slide_on_slope: "slideOnSlope";
    }
    /** A 2D ray shape used for physics collision that tries to separate itself from any collider.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_separationrayshape2d.html  
     */
    class SeparationRayShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The ray's length. */
        get length(): float64
        set length(value: float64)
        
        /** If `false` (default), the shape always separates and returns a normal along its own direction.  
         *  If `true`, the shape can return the correct normal and separate in any direction, allowing sliding motion on slopes.  
         */
        get slideOnSlope(): boolean
        set slideOnSlope(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSeparationRayShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSeparationRayShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSeparationRayShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSeparationRayShape3D extends __NameMapShape3D {
        slide_on_slope: "slideOnSlope";
    }
    /** A 3D ray shape used for physics collision that tries to separate itself from any collider.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_separationrayshape3d.html  
     */
    class SeparationRayShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The ray's length. */
        get length(): float64
        set length(value: float64)
        
        /** If `false` (default), the shape always separates and returns a normal along its own direction.  
         *  If `true`, the shape can return the correct normal and separate in any direction, allowing sliding motion on slopes.  
         */
        get slideOnSlope(): boolean
        set slideOnSlope(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSeparationRayShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSeparationRayShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSeparator extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSeparator extends __NameMapControl {
    }
    /** Abstract base class for separators.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_separator.html  
     */
    class Separator<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSeparator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSeparator;
    }
    namespace Shader {
        enum Mode {
            ModeSpatial = 0,
            ModeCanvasItem = 1,
            ModeParticles = 2,
            ModeSky = 3,
            ModeFog = 4,
            ModeTextureBlit = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShader extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShader extends __NameMapResource {
        get_mode: "getMode";
        set_default_texture_parameter: "setDefaultTextureParameter";
        get_default_texture_parameter: "getDefaultTextureParameter";
        get_shader_uniform_list: "getShaderUniformList";
        set_include_path: "setIncludePath";
        inspect_native_shader_code: "inspectNativeShaderCode";
    }
    /** A shader implemented in the Godot shading language.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shader.html  
     */
    class Shader extends Resource {
        constructor(identifier?: any)
        /** Returns the shader mode for the shader. */
        getMode(): Shader.Mode
        
        /** Sets the default texture to be used with a texture uniform. The default is used if a texture is not set in the [ShaderMaterial].  
         *      
         *  **Note:** [param name] must match the name of the uniform in the code exactly.  
         *      
         *  **Note:** If the sampler array is used use [param index] to access the specified texture.  
         */
        setDefaultTextureParameter(name: StringName, texture: Texture, index?: int64 /* = 0 */): void
        
        /** Returns the texture that is set as default for the specified parameter.  
         *      
         *  **Note:** [param name] must match the name of the uniform in the code exactly.  
         *      
         *  **Note:** If the sampler array is used use [param index] to access the specified texture.  
         */
        getDefaultTextureParameter(name: StringName, index?: int64 /* = 0 */): null | Texture
        
        /** Returns the list of shader uniforms that can be assigned to a [ShaderMaterial], for use with [method ShaderMaterial.set_shader_parameter] and [method ShaderMaterial.get_shader_parameter]. The parameters returned are contained in dictionaries in a similar format to the ones returned by [method Object.get_property_list].  
         *  If argument [param get_groups] is `true`, parameter grouping hints are also included in the list.  
         */
        getShaderUniformList(getGroups?: boolean /* = false */): GArray
        
        /** Sets the include path for this shader. Used only if the shader does not have a resource path set, for example when created by code. */
        setIncludePath(path: string): void
        
        /** Only available when running in the editor. Opens a popup that visualizes the generated shader code, including all variants and internal shader code. See also [method Material.inspect_native_shader_code]. */
        inspectNativeShaderCode(): void
        
        /** Returns the shader's code as the user has written it, not the full generated code used internally. */
        get code(): string
        set code(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShader;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShader;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShaderGlobalsOverride extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShaderGlobalsOverride extends __NameMapNode {
    }
    /** A node used to override global shader parameters' values in a scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shaderglobalsoverride.html  
     */
    class ShaderGlobalsOverride<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        _activate(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShaderGlobalsOverride;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShaderGlobalsOverride;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShaderInclude extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShaderInclude extends __NameMapResource {
    }
    /** A snippet of shader code to be included in a [Shader] with `#include`.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shaderinclude.html  
     */
    class ShaderInclude extends Resource {
        constructor(identifier?: any)
        /** Returns the code of the shader include file. The returned text is what the user has written, not the full generated code used internally. */
        get code(): string
        set code(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShaderInclude;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShaderInclude;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShaderIncludeDB extends __RPCMapGObject {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShaderIncludeDB extends __NameMapGObject {
        list_built_in_include_files: "listBuiltInIncludeFiles";
        has_built_in_include_file: "hasBuiltInIncludeFile";
        get_built_in_include_file: "getBuiltInIncludeFile";
    }
    /** Internal database of built in shader include files.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shaderincludedb.html  
     */
    class ShaderIncludeDB extends GObject {
        constructor(identifier?: any)
        /** Returns a list of built-in include files that are currently registered. */
        static listBuiltInIncludeFiles(): PackedStringArray
        
        /** Returns `true` if an include file with this name exists. */
        static hasBuiltInIncludeFile(filename: string): boolean
        
        /** Returns the code for the built-in shader fragment. You can also access this in your shader code through `#include "filename"`. */
        static getBuiltInIncludeFile(filename: string): string
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShaderIncludeDB;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShaderIncludeDB;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShaderMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShaderMaterial extends __NameMapMaterial {
        set_shader_parameter: "setShaderParameter";
        get_shader_parameter: "getShaderParameter";
    }
    /** A material defined by a custom [Shader] program and the values of its shader parameters.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shadermaterial.html  
     */
    class ShaderMaterial extends Material {
        constructor(identifier?: any)
        /** Changes the value set for this material of a uniform in the shader.  
         *      
         *  **Note:** [param param] is case-sensitive and must match the name of the uniform in the code exactly (not the capitalized name in the inspector).  
         *      
         *  **Note:** Changes to the shader uniform will be effective on all instances using this [ShaderMaterial]. To prevent this, use per-instance uniforms with [method CanvasItem.set_instance_shader_parameter], [method GeometryInstance3D.set_instance_shader_parameter] or duplicate the [ShaderMaterial] resource using [method Resource.duplicate]. Per-instance uniforms allow for better shader reuse and are therefore faster, so they should be preferred over duplicating the [ShaderMaterial] when possible.  
         */
        setShaderParameter(param: StringName, value: any): void
        
        /** Returns the current value set for this material of a uniform in the shader. */
        getShaderParameter(param: StringName): any
        
        /** The [Shader] program used to render this material. */
        get shader(): null | Shader
        set shader(value: null | Shader)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShaderMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShaderMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShape2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShape2D extends __NameMapResource {
        collide_with_motion: "collideWithMotion";
        collide_and_get_contacts: "collideAndGetContacts";
        collide_with_motion_and_get_contacts: "collideWithMotionAndGetContacts";
        get_rect: "getRect";
        custom_solver_bias: "customSolverBias";
    }
    /** Abstract base class for 2D shapes used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shape2d.html  
     */
    class Shape2D extends Resource {
        constructor(identifier?: any)
        /** Returns `true` if this shape is colliding with another.  
         *  This method needs the transformation matrix for this shape ([param local_xform]), the shape to check collisions with ([param with_shape]), and the transformation matrix of that shape ([param shape_xform]).  
         */
        collide(localXform: Transform2D, withShape: Shape2D, shapeXform: Transform2D): boolean
        
        /** Returns whether this shape would collide with another, if a given movement was applied.  
         *  This method needs the transformation matrix for this shape ([param local_xform]), the movement to test on this shape ([param local_motion]), the shape to check collisions with ([param with_shape]), the transformation matrix of that shape ([param shape_xform]), and the movement to test onto the other object ([param shape_motion]).  
         */
        collideWithMotion(localXform: Transform2D, localMotion: Vector2, withShape: Shape2D, shapeXform: Transform2D, shapeMotion: Vector2): boolean
        
        /** Returns a list of contact point pairs where this shape touches another.  
         *  If there are no collisions, the returned list is empty. Otherwise, the returned list contains contact points arranged in pairs, with entries alternating between points on the boundary of this shape and points on the boundary of [param with_shape].  
         *  A collision pair A, B can be used to calculate the collision normal with `(B - A).normalized()`, and the collision depth with `(B - A).length()`. This information is typically used to separate shapes, particularly in collision solvers.  
         *  This method needs the transformation matrix for this shape ([param local_xform]), the shape to check collisions with ([param with_shape]), and the transformation matrix of that shape ([param shape_xform]).  
         */
        collideAndGetContacts(localXform: Transform2D, withShape: Shape2D, shapeXform: Transform2D): PackedVector2Array
        
        /** Returns a list of contact point pairs where this shape would touch another, if a given movement was applied.  
         *  If there would be no collisions, the returned list is empty. Otherwise, the returned list contains contact points arranged in pairs, with entries alternating between points on the boundary of this shape and points on the boundary of [param with_shape].  
         *  A collision pair A, B can be used to calculate the collision normal with `(B - A).normalized()`, and the collision depth with `(B - A).length()`. This information is typically used to separate shapes, particularly in collision solvers.  
         *  This method needs the transformation matrix for this shape ([param local_xform]), the movement to test on this shape ([param local_motion]), the shape to check collisions with ([param with_shape]), the transformation matrix of that shape ([param shape_xform]), and the movement to test onto the other object ([param shape_motion]).  
         */
        collideWithMotionAndGetContacts(localXform: Transform2D, localMotion: Vector2, withShape: Shape2D, shapeXform: Transform2D, shapeMotion: Vector2): PackedVector2Array
        
        /** Draws a solid shape onto a [CanvasItem] with the [RenderingServer] API filled with the specified [param color]. The exact drawing method is specific for each shape and cannot be configured. */
        draw(canvasItem: Rid, color: Color): void
        
        /** Returns a [Rect2] representing the shapes boundary. */
        getRect(): Rect2
        
        /** The shape's custom solver bias. Defines how much bodies react to enforce contact separation when this shape is involved.  
         *  When set to `0`, the default value from [member ProjectSettings.physics/2d/solver/default_contact_bias] is used.  
         */
        get customSolverBias(): float64
        set customSolverBias(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShape3D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShape3D extends __NameMapResource {
        get_debug_mesh: "getDebugMesh";
        custom_solver_bias: "customSolverBias";
    }
    /** Abstract base class for 3D shapes used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shape3d.html  
     */
    class Shape3D extends Resource {
        constructor(identifier?: any)
        /** Returns the [ArrayMesh] used to draw the debug collision for this [Shape3D]. */
        getDebugMesh(): null | ArrayMesh
        
        /** The shape's custom solver bias. Defines how much bodies react to enforce contact separation when this shape is involved.  
         *  When set to `0`, the default value from [member ProjectSettings.physics/3d/solver/default_contact_bias] is used.  
         *      
         *  **Note:** [member custom_solver_bias] is only effective when using GodotPhysics3D. It has no effect when using Jolt Physics.  
         */
        get customSolverBias(): float64
        set customSolverBias(value: float64)
        
        /** The collision margin for the shape. This is not used in Godot Physics.  
         *  Collision margins allow collision detection to be more efficient by adding an extra shell around shapes. Collision algorithms are more expensive when objects overlap by more than their margin, so a higher value for margins is better for performance, at the cost of accuracy around edges as it makes them less sharp.  
         */
        get margin(): float64
        set margin(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShapeCast2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShapeCast2D extends __NameMapNode2D {
        is_colliding: "isColliding";
        get_collision_count: "getCollisionCount";
        force_shapecast_update: "forceShapecastUpdate";
        get_collider: "getCollider";
        get_collider_rid: "getColliderRid";
        get_collider_shape: "getColliderShape";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        get_closest_collision_safe_fraction: "getClosestCollisionSafeFraction";
        get_closest_collision_unsafe_fraction: "getClosestCollisionUnsafeFraction";
        add_exception_rid: "addExceptionRid";
        add_exception: "addException";
        remove_exception_rid: "removeExceptionRid";
        remove_exception: "removeException";
        clear_exceptions: "clearExceptions";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        exclude_parent: "excludeParent";
        target_position: "targetPosition";
        max_results: "maxResults";
        collision_mask: "collisionMask";
        collision_result: "collisionResult";
        collide_with_areas: "collideWithAreas";
        collide_with_bodies: "collideWithBodies";
    }
    /** A 2D shape that sweeps a region of space to detect [CollisionObject2D]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shapecast2d.html  
     */
    class ShapeCast2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns whether any object is intersecting with the shape's vector (considering the vector length). */
        isColliding(): boolean
        
        /** The number of collisions detected at the point of impact. Use this to iterate over multiple collisions as provided by [method get_collider], [method get_collider_shape], [method get_collision_point], and [method get_collision_normal] methods. */
        getCollisionCount(): int64
        
        /** Updates the collision information for the shape immediately, without waiting for the next `_physics_process` call. Use this method, for example, when the shape or its parent has changed state.  
         *      
         *  **Note:** Setting [member enabled] to `true` is not required for this to work.  
         */
        forceShapecastUpdate(): void
        
        /** Returns the collided [Object] of one of the multiple collisions at [param index], or `null` if no object is intersecting the shape (i.e. [method is_colliding] returns `false`). */
        getCollider(index: int64): null | GObject
        
        /** Returns the [RID] of the collided object of one of the multiple collisions at [param index]. */
        getColliderRid(index: int64): Rid
        
        /** Returns the shape ID of the colliding shape of one of the multiple collisions at [param index], or `0` if no object is intersecting the shape (i.e. [method is_colliding] returns `false`). */
        getColliderShape(index: int64): int64
        
        /** Returns the collision point of one of the multiple collisions at [param index] where the shape intersects the colliding object.  
         *      
         *  **Note:** This point is in the **global** coordinate system.  
         */
        getCollisionPoint(index: int64): Vector2
        
        /** Returns the normal of one of the multiple collisions at [param index] of the intersecting object. */
        getCollisionNormal(index: int64): Vector2
        
        /** Returns the fraction from this cast's origin to its [member target_position] of how far the shape can move without triggering a collision, as a value between `0.0` and `1.0`. */
        getClosestCollisionSafeFraction(): float64
        
        /** Returns the fraction from this cast's origin to its [member target_position] of how far the shape must move to trigger a collision, as a value between `0.0` and `1.0`.  
         *  In ideal conditions this would be the same as [method get_closest_collision_safe_fraction], however shape casting is calculated in discrete steps, so the precise point of collision can occur between two calculated positions.  
         */
        getClosestCollisionUnsafeFraction(): float64
        
        /** Adds a collision exception so the shape does not report collisions with the specified [RID]. */
        addExceptionRid(rid: Rid): void
        
        /** Adds a collision exception so the shape does not report collisions with the specified node. */
        addException(node: CollisionObject2D): void
        
        /** Removes a collision exception so the shape does report collisions with the specified [RID]. */
        removeExceptionRid(rid: Rid): void
        
        /** Removes a collision exception so the shape does report collisions with the specified node. */
        removeException(node: CollisionObject2D): void
        
        /** Removes all collision exceptions for this shape. */
        clearExceptions(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** If `true`, collisions will be reported. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The shape to be used for collision queries. */
        get shape(): null | Shape2D
        set shape(value: null | Shape2D)
        
        /** If `true`, the parent node will be excluded from collision detection. */
        get excludeParent(): boolean
        set excludeParent(value: boolean)
        
        /** The shape's destination point, relative to this node's [member Node2D.position]. */
        get targetPosition(): Vector2
        set targetPosition(value: Vector2)
        
        /** The collision margin for the shape. A larger margin helps detecting collisions more consistently, at the cost of precision. */
        get margin(): float64
        set margin(value: float64)
        
        /** The number of intersections can be limited with this parameter, to reduce the processing time. */
        get maxResults(): int64
        set maxResults(value: int64)
        
        /** The shape's collision mask. Only objects in at least one collision layer enabled in the mask will be detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** Returns the complete collision information from the collision sweep. The data returned is the same as in the [method PhysicsDirectSpaceState2D.get_rest_info] method. */
        get collisionResult(): GArray
        
        /** If `true`, collisions with [Area2D]s will be reported. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, collisions with [PhysicsBody2D]s will be reported. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShapeCast2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShapeCast2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShapeCast3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShapeCast3D extends __NameMapNode3D {
        resource_changed: "resourceChanged";
        is_colliding: "isColliding";
        get_collision_count: "getCollisionCount";
        force_shapecast_update: "forceShapecastUpdate";
        get_collider: "getCollider";
        get_collider_rid: "getColliderRid";
        get_collider_shape: "getColliderShape";
        get_collision_point: "getCollisionPoint";
        get_collision_normal: "getCollisionNormal";
        get_closest_collision_safe_fraction: "getClosestCollisionSafeFraction";
        get_closest_collision_unsafe_fraction: "getClosestCollisionUnsafeFraction";
        add_exception_rid: "addExceptionRid";
        add_exception: "addException";
        remove_exception_rid: "removeExceptionRid";
        remove_exception: "removeException";
        clear_exceptions: "clearExceptions";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        exclude_parent: "excludeParent";
        target_position: "targetPosition";
        max_results: "maxResults";
        collision_mask: "collisionMask";
        collision_result: "collisionResult";
        collide_with_areas: "collideWithAreas";
        collide_with_bodies: "collideWithBodies";
        debug_shape_custom_color: "debugShapeCustomColor";
    }
    /** A 3D shape that sweeps a region of space to detect [CollisionObject3D]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shapecast3d.html  
     */
    class ShapeCast3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** This method does nothing. */
        resourceChanged(resource: Resource): void
        
        /** Returns whether any object is intersecting with the shape's vector (considering the vector length). */
        isColliding(): boolean
        
        /** The number of collisions detected at the point of impact. Use this to iterate over multiple collisions as provided by [method get_collider], [method get_collider_shape], [method get_collision_point], and [method get_collision_normal] methods. */
        getCollisionCount(): int64
        
        /** Updates the collision information for the shape immediately, without waiting for the next `_physics_process` call. Use this method, for example, when the shape or its parent has changed state.  
         *      
         *  **Note:** Setting [member enabled] to `true` is not required for this to work.  
         */
        forceShapecastUpdate(): void
        
        /** Returns the collided [Object] of one of the multiple collisions at [param index], or `null` if no object is intersecting the shape (i.e. [method is_colliding] returns `false`). */
        getCollider(index: int64): null | GObject
        
        /** Returns the [RID] of the collided object of one of the multiple collisions at [param index]. */
        getColliderRid(index: int64): Rid
        
        /** Returns the shape ID of the colliding shape of one of the multiple collisions at [param index], or `0` if no object is intersecting the shape (i.e. [method is_colliding] returns `false`). */
        getColliderShape(index: int64): int64
        
        /** Returns the collision point of one of the multiple collisions at [param index] where the shape intersects the colliding object.  
         *      
         *  **Note:** This point is in the **global** coordinate system.  
         */
        getCollisionPoint(index: int64): Vector3
        
        /** Returns the normal of one of the multiple collisions at [param index] of the intersecting object. */
        getCollisionNormal(index: int64): Vector3
        
        /** Returns the fraction from this cast's origin to its [member target_position] of how far the shape can move without triggering a collision, as a value between `0.0` and `1.0`. */
        getClosestCollisionSafeFraction(): float64
        
        /** Returns the fraction from this cast's origin to its [member target_position] of how far the shape must move to trigger a collision, as a value between `0.0` and `1.0`.  
         *  In ideal conditions this would be the same as [method get_closest_collision_safe_fraction], however shape casting is calculated in discrete steps, so the precise point of collision can occur between two calculated positions.  
         */
        getClosestCollisionUnsafeFraction(): float64
        
        /** Adds a collision exception so the shape does not report collisions with the specified [RID]. */
        addExceptionRid(rid: Rid): void
        
        /** Adds a collision exception so the shape does not report collisions with the specified node. */
        addException(node: CollisionObject3D): void
        
        /** Removes a collision exception so the shape does report collisions with the specified [RID]. */
        removeExceptionRid(rid: Rid): void
        
        /** Removes a collision exception so the shape does report collisions with the specified node. */
        removeException(node: CollisionObject3D): void
        
        /** Removes all collision exceptions for this shape. */
        clearExceptions(): void
        
        /** Based on [param value], enables or disables the specified layer in the [member collision_mask], given a [param layer_number] between 1 and 32. */
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member collision_mask] is enabled, given a [param layer_number] between 1 and 32. */
        getCollisionMaskValue(layerNumber: int64): boolean
        
        /** If `true`, collisions will be reported. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The shape to be used for collision queries. */
        get shape(): null | Shape3D
        set shape(value: null | Shape3D)
        
        /** If `true`, the parent node will be excluded from collision detection. */
        get excludeParent(): boolean
        set excludeParent(value: boolean)
        
        /** The shape's destination point, relative to this node's [member Node3D.position]. */
        get targetPosition(): Vector3
        set targetPosition(value: Vector3)
        
        /** The collision margin for the shape. A larger margin helps detecting collisions more consistently, at the cost of precision. */
        get margin(): float64
        set margin(value: float64)
        
        /** The number of intersections can be limited with this parameter, to reduce the processing time. */
        get maxResults(): int64
        set maxResults(value: int64)
        
        /** The shape's collision mask. Only objects in at least one collision layer enabled in the mask will be detected. See [url=https://docs.godotengine.org/en/latest/tutorials/physics/physics_introduction.html#collision-layers-and-masks]Collision layers and masks[/url] in the documentation for more information. */
        get collisionMask(): int64
        set collisionMask(value: int64)
        
        /** Returns the complete collision information from the collision sweep. The data returned is the same as in the [method PhysicsDirectSpaceState3D.get_rest_info] method. */
        get collisionResult(): GArray
        
        /** If `true`, collisions with [Area3D]s will be reported. */
        get collideWithAreas(): boolean
        set collideWithAreas(value: boolean)
        
        /** If `true`, collisions with [PhysicsBody3D]s will be reported. */
        get collideWithBodies(): boolean
        set collideWithBodies(value: boolean)
        
        /** The custom color to use to draw the shape in the editor and at run-time if **Visible Collision Shapes** is enabled in the **Debug** menu. This color will be highlighted at run-time if the [ShapeCast3D] is colliding with something.  
         *  If set to `Color(0.0, 0.0, 0.0)` (by default), the color set in [member ProjectSettings.debug/shapes/collision/shape_color] is used.  
         */
        get debugShapeCustomColor(): Color
        set debugShapeCustomColor(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShapeCast3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShapeCast3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapShortcut extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapShortcut extends __NameMapResource {
        has_valid_event: "hasValidEvent";
        matches_event: "matchesEvent";
        get_as_text: "getAsText";
    }
    /** A shortcut for binding input.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_shortcut.html  
     */
    class Shortcut extends Resource {
        constructor(identifier?: any)
        /** Returns whether [member events] contains an [InputEvent] which is valid. */
        hasValidEvent(): boolean
        
        /** Returns whether any [InputEvent] in [member events] equals [param event]. This uses [method InputEvent.is_match] to compare events. */
        matchesEvent(event: InputEvent): boolean
        
        /** Returns the shortcut's first valid [InputEvent] as a [String]. */
        getAsText(): string
        
        /** The shortcut's [InputEvent] array.  
         *  Generally the [InputEvent] used is an [InputEventKey], though it can be any [InputEvent], including an [InputEventAction].  
         */
        get events(): GArray<InputEvent>
        set events(value: GArray<InputEvent>)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapShortcut;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapShortcut;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeleton2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeleton2D extends __NameMapNode2D {
        get_bone_count: "getBoneCount";
        get_bone: "getBone";
        get_skeleton: "getSkeleton";
        set_modification_stack: "setModificationStack";
        get_modification_stack: "getModificationStack";
        execute_modifications: "executeModifications";
        set_bone_local_pose_override: "setBoneLocalPoseOverride";
        get_bone_local_pose_override: "getBoneLocalPoseOverride";
        bone_setup_changed: "boneSetupChanged";
    }
    /** The parent of a hierarchy of [Bone2D]s, used to create a 2D skeletal animation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeleton2d.html  
     */
    class Skeleton2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Returns the number of [Bone2D] nodes in the node hierarchy parented by Skeleton2D. */
        getBoneCount(): int64
        
        /** Returns a [Bone2D] from the node hierarchy parented by Skeleton2D. The object to return is identified by the parameter [param idx]. Bones are indexed by descending the node hierarchy from top to bottom, adding the children of each branch before moving to the next sibling. */
        getBone(idx: int64): null | Bone2D
        
        /** Returns the [RID] of a Skeleton2D instance. */
        getSkeleton(): Rid
        
        /** Sets the [SkeletonModificationStack2D] attached to this skeleton. */
        setModificationStack(modificationStack: SkeletonModificationStack2D): void
        
        /** Returns the [SkeletonModificationStack2D] attached to this skeleton, if one exists. */
        getModificationStack(): null | SkeletonModificationStack2D
        
        /** Executes all the modifications on the [SkeletonModificationStack2D], if the Skeleton2D has one assigned. */
        executeModifications(delta: float64, executionMode: int64): void
        
        /** Sets the local pose transform, [param override_pose], for the bone at [param bone_idx].  
         *  [param strength] is the interpolation strength that will be used when applying the pose, and [param persistent] determines if the applied pose will remain.  
         *      
         *  **Note:** The pose transform needs to be a local transform relative to the [Bone2D] node at [param bone_idx]!  
         */
        setBoneLocalPoseOverride(boneIdx: int64, overridePose: Transform2D, strength: float64, persistent: boolean): void
        
        /** Returns the local pose override transform for [param bone_idx]. */
        getBoneLocalPoseOverride(boneIdx: int64): Transform2D
        
        /** Emitted when the [Bone2D] setup attached to this skeletons changes. This is primarily used internally within the skeleton. */
        readonly boneSetupChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeleton2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeleton2D;
    }
    namespace Skeleton3D {
        enum ModifierCallbackModeProcess {
            ModifierCallbackModeProcessPhysics = 0,
            ModifierCallbackModeProcessIdle = 1,
            ModifierCallbackModeProcessManual = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeleton3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeleton3D extends __NameMapNode3D {
        add_bone: "addBone";
        find_bone: "findBone";
        get_bone_name: "getBoneName";
        set_bone_name: "setBoneName";
        get_bone_meta: "getBoneMeta";
        get_bone_meta_list: "getBoneMetaList";
        has_bone_meta: "hasBoneMeta";
        set_bone_meta: "setBoneMeta";
        get_concatenated_bone_names: "getConcatenatedBoneNames";
        get_bone_parent: "getBoneParent";
        set_bone_parent: "setBoneParent";
        get_bone_count: "getBoneCount";
        get_version: "getVersion";
        unparent_bone_and_rest: "unparentBoneAndRest";
        get_bone_children: "getBoneChildren";
        get_parentless_bones: "getParentlessBones";
        get_bone_rest: "getBoneRest";
        set_bone_rest: "setBoneRest";
        get_bone_global_rest: "getBoneGlobalRest";
        create_skin_from_rest_transforms: "createSkinFromRestTransforms";
        register_skin: "registerSkin";
        localize_rests: "localizeRests";
        clear_bones: "clearBones";
        get_bone_pose: "getBonePose";
        set_bone_pose: "setBonePose";
        set_bone_pose_position: "setBonePosePosition";
        set_bone_pose_rotation: "setBonePoseRotation";
        set_bone_pose_scale: "setBonePoseScale";
        get_bone_pose_position: "getBonePosePosition";
        get_bone_pose_rotation: "getBonePoseRotation";
        get_bone_pose_scale: "getBonePoseScale";
        set_bone_skin_scale: "setBoneSkinScale";
        get_bone_skin_scale: "getBoneSkinScale";
        reset_bone_pose: "resetBonePose";
        reset_bone_poses: "resetBonePoses";
        is_bone_enabled: "isBoneEnabled";
        set_bone_enabled: "setBoneEnabled";
        get_bone_global_pose: "getBoneGlobalPose";
        set_bone_global_pose: "setBoneGlobalPose";
        force_update_all_bone_transforms: "forceUpdateAllBoneTransforms";
        force_update_bone_child_transform: "forceUpdateBoneChildTransform";
        clear_bones_global_pose_override: "clearBonesGlobalPoseOverride";
        set_bone_global_pose_override: "setBoneGlobalPoseOverride";
        get_bone_global_pose_override: "getBoneGlobalPoseOverride";
        get_bone_global_pose_no_override: "getBoneGlobalPoseNoOverride";
        physical_bones_stop_simulation: "physicalBonesStopSimulation";
        physical_bones_start_simulation: "physicalBonesStartSimulation";
        physical_bones_add_collision_exception: "physicalBonesAddCollisionException";
        physical_bones_remove_collision_exception: "physicalBonesRemoveCollisionException";
        motion_scale: "motionScale";
        show_rest_only: "showRestOnly";
        modifier_callback_mode_process: "modifierCallbackModeProcess";
        animate_physical_bones: "animatePhysicalBones";
        rest_updated: "restUpdated";
        pose_updated: "poseUpdated";
        skeleton_updated: "skeletonUpdated";
        bone_enabled_changed: "boneEnabledChanged";
        bone_list_changed: "boneListChanged";
        show_rest_only_changed: "showRestOnlyChanged";
    }
    /** A node containing a bone hierarchy, used to create a 3D skeletal animation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeleton3d.html  
     */
    class Skeleton3D<Map extends NodePathMap = any> extends Node3D<Map> {
        /** Notification received when this skeleton's pose needs to be updated. In that case, this is called only once per frame in a deferred process. */
        static readonly NOTIFICATION_UPDATE_SKELETON = 50
        constructor(identifier?: any)
        
        /** Adds a new bone with the given name. Returns the new bone's index, or `-1` if this method fails.  
         *      
         *  **Note:** Bone names should be unique, non empty, and cannot include the `:` and `/` characters.  
         */
        addBone(name: string): int64
        
        /** Returns the bone index that matches [param name] as its name. Returns `-1` if no bone with this name exists. */
        findBone(name: string): int64
        
        /** Returns the name of the bone at index [param bone_idx]. */
        getBoneName(boneIdx: int64): string
        
        /** Sets the bone name, [param name], for the bone at [param bone_idx]. */
        setBoneName(boneIdx: int64, name: string): void
        
        /** Returns the metadata with the given [param key] for the bone at index [param bone_idx]. */
        getBoneMeta(boneIdx: int64, key: StringName): any
        
        /** Returns the list of all metadata keys for the bone at index [param bone_idx]. */
        getBoneMetaList(boneIdx: int64): GArray<StringName>
        
        /** Returns `true` if the bone at index [param bone_idx] has metadata with the given [param key]. */
        hasBoneMeta(boneIdx: int64, key: StringName): boolean
        
        /** Sets the metadata with the given [param key] to [param value] for the bone at index [param bone_idx]. */
        setBoneMeta(boneIdx: int64, key: StringName, value: any): void
        
        /** Returns all bone names concatenated with commas (`,`) as a single [StringName].  
         *  It is useful to set it as a hint for the enum property.  
         */
        getConcatenatedBoneNames(): StringName
        
        /** Returns the bone index which is the parent of the bone at [param bone_idx]. If -1, then bone has no parent.  
         *      
         *  **Note:** The parent bone returned will always be less than [param bone_idx].  
         */
        getBoneParent(boneIdx: int64): int64
        
        /** Sets the bone index [param parent_idx] as the parent of the bone at [param bone_idx]. If -1, then bone has no parent.  
         *      
         *  **Note:** [param parent_idx] must be less than [param bone_idx].  
         */
        setBoneParent(boneIdx: int64, parentIdx: int64): void
        
        /** Returns the number of bones in the skeleton. */
        getBoneCount(): int64
        
        /** Returns the number of times the bone hierarchy has changed within this skeleton, including renames.  
         *  The Skeleton version is not serialized: only use within a single instance of Skeleton3D.  
         *  Use for invalidating caches in IK solvers and other nodes which process bones.  
         */
        getVersion(): int64
        
        /** Unparents the bone at [param bone_idx] and sets its rest position to that of its parent prior to being reset. */
        unparentBoneAndRest(boneIdx: int64): void
        
        /** Returns an array containing the bone indexes of all the child node of the passed in bone, [param bone_idx]. */
        getBoneChildren(boneIdx: int64): PackedInt32Array
        
        /** Returns an array with all of the bones that are parentless. Another way to look at this is that it returns the indexes of all the bones that are not dependent or modified by other bones in the Skeleton. */
        getParentlessBones(): PackedInt32Array
        
        /** Returns the rest transform for a bone [param bone_idx]. */
        getBoneRest(boneIdx: int64): Transform3D
        
        /** Sets the rest transform for bone [param bone_idx]. */
        setBoneRest(boneIdx: int64, rest: Transform3D): void
        
        /** Returns the global rest transform for [param bone_idx]. */
        getBoneGlobalRest(boneIdx: int64): Transform3D
        createSkinFromRestTransforms(): Skin
        
        /** Binds the given Skin to the Skeleton. */
        registerSkin(skin: Skin): null | SkinReference
        
        /** Returns all bones in the skeleton to their rest poses. */
        localizeRests(): void
        
        /** Clear all the bones in this skeleton. */
        clearBones(): void
        
        /** Returns the pose transform of the specified bone.  
         *      
         *  **Note:** This is the pose you set to the skeleton in the process, the final pose can get overridden by modifiers in the deferred process, if you want to access the final pose, use [signal SkeletonModifier3D.modification_processed].  
         */
        getBonePose(boneIdx: int64): Transform3D
        
        /** Sets the pose transform, [param pose], for the bone at [param bone_idx]. */
        setBonePose(boneIdx: int64, pose: Transform3D): void
        
        /** Sets the pose position of the bone at [param bone_idx] to [param position]. [param position] is a [Vector3] describing a position local to the [Skeleton3D] node. */
        setBonePosePosition(boneIdx: int64, position: Vector3): void
        
        /** Sets the pose rotation of the bone at [param bone_idx] to [param rotation]. [param rotation] is a [Quaternion] describing a rotation in the bone's local coordinate space with respect to the rotation of any parent bones. */
        setBonePoseRotation(boneIdx: int64, rotation: Quaternion): void
        
        /** Sets the pose scale of the bone at [param bone_idx] to [param scale]. */
        setBonePoseScale(boneIdx: int64, scale: Vector3): void
        
        /** Returns the pose position of the bone at [param bone_idx]. The returned [Vector3] is in the local coordinate space of the [Skeleton3D] node. */
        getBonePosePosition(boneIdx: int64): Vector3
        
        /** Returns the pose rotation of the bone at [param bone_idx]. The returned [Quaternion] is local to the bone with respect to the rotation of any parent bones. */
        getBonePoseRotation(boneIdx: int64): Quaternion
        
        /** Returns the pose scale of the bone at [param bone_idx]. */
        getBonePoseScale(boneIdx: int64): Vector3
        
        /** Sets the skin scale of the bone at [param bone_idx] to [param skin_scale]. This scale does not affect bone children. This is useful for modifying the visual thickness of a skin.  
         *  Even if the skin is visually deformed, neither scaling nor repositioning of the bones occurs. This means that you may need to adjust the origin of the child bone to synchronize its joint position with the scaling by using [BoneSpaceAdjuster3D].  
         *      
         *  **Note:** The skin scaling may corrupt the appearance of the gizmo for some SkeletonModifier classes, such as SpringBoneSimulator and IKModifier3D, which rely on bone lengths for skinning.  
         */
        setBoneSkinScale(boneIdx: int64, skinScale: Vector3): void
        
        /** Returns the skin scale of the bone at [param bone_idx]. */
        getBoneSkinScale(boneIdx: int64): Vector3
        
        /** Sets the bone pose to rest for [param bone_idx]. */
        resetBonePose(boneIdx: int64, resetBoneSkinScale?: boolean /* = false */): void
        
        /** Sets all bone poses to rests. */
        resetBonePoses(resetBoneSkinScale?: boolean /* = false */): void
        
        /** Returns whether the bone pose for the bone at [param bone_idx] is enabled. */
        isBoneEnabled(boneIdx: int64): boolean
        
        /** Disables the pose for the bone at [param bone_idx] if `false`, enables the bone pose if `true`. */
        setBoneEnabled(boneIdx: int64, enabled?: boolean /* = true */): void
        
        /** Returns the overall transform of the specified bone, with respect to the skeleton. Being relative to the skeleton frame, this is not the actual "global" transform of the bone.  
         *      
         *  **Note:** This is the global pose you set to the skeleton in the process, the final global pose can get overridden by modifiers in the deferred process, if you want to access the final global pose, use [signal SkeletonModifier3D.modification_processed].  
         */
        getBoneGlobalPose(boneIdx: int64): Transform3D
        
        /** Sets the global pose transform, [param pose], for the bone at [param bone_idx].  
         *      
         *  **Note:** If other bone poses have been changed, this method executes a dirty poses recalculation and will cause performance to deteriorate. If you know that multiple global poses will be applied, consider using [method set_bone_pose] with precalculation.  
         */
        setBoneGlobalPose(boneIdx: int64, pose: Transform3D): void
        
        /** Force updates the bone transforms/poses for all bones in the skeleton. */
        forceUpdateAllBoneTransforms(): void
        
        /** Force updates the bone transform for the bone at [param bone_idx] and all of its children. */
        forceUpdateBoneChildTransform(boneIdx: int64): void
        
        /** Manually advance the child [SkeletonModifier3D]s by the specified time (in seconds).  
         *      
         *  **Note:** The [param delta] is temporarily accumulated in the [Skeleton3D], and the deferred process uses the accumulated value to process the modification.  
         */
        advance(delta: float64): void
        
        /** Removes the global pose override on all bones in the skeleton. */
        clearBonesGlobalPoseOverride(): void
        
        /** Sets the global pose transform, [param pose], for the bone at [param bone_idx].  
         *  [param amount] is the interpolation strength that will be used when applying the pose, and [param persistent] determines if the applied pose will remain.  
         *      
         *  **Note:** The pose transform needs to be a global pose! To convert a world transform from a [Node3D] to a global bone pose, multiply the [method Transform3D.affine_inverse] of the node's [member Node3D.global_transform] by the desired world transform.  
         */
        setBoneGlobalPoseOverride(boneIdx: int64, pose: Transform3D, amount: float64, persistent?: boolean /* = false */): void
        
        /** Returns the global pose override transform for [param bone_idx]. */
        getBoneGlobalPoseOverride(boneIdx: int64): Transform3D
        
        /** Returns the overall transform of the specified bone, with respect to the skeleton, but without any global pose overrides. Being relative to the skeleton frame, this is not the actual "global" transform of the bone. */
        getBoneGlobalPoseNoOverride(boneIdx: int64): Transform3D
        
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
        
        /** Multiplies the 3D position track animation.  
         *      
         *  **Note:** Unless this value is `1.0`, the key value in animation will not match the actual position value.  
         */
        get motionScale(): float64
        set motionScale(value: float64)
        
        /** If `true`, forces the bones in their default rest pose, regardless of their values. In the editor, this also prevents the bones from being edited. */
        get showRestOnly(): boolean
        set showRestOnly(value: boolean)
        
        /** Sets the processing timing for the Modifier. */
        get modifierCallbackModeProcess(): int64
        set modifierCallbackModeProcess(value: int64)
        
        /** If you follow the recommended workflow and explicitly have [PhysicalBoneSimulator3D] as a child of [Skeleton3D], you can control whether it is affected by raycasting without running [method physical_bones_start_simulation], by its [member SkeletonModifier3D.active].  
         *  However, for old (deprecated) configurations, [Skeleton3D] has an internal virtual [PhysicalBoneSimulator3D] for compatibility. This property controls the internal virtual [PhysicalBoneSimulator3D]'s [member SkeletonModifier3D.active].  
         */
        get animatePhysicalBones(): boolean
        set animatePhysicalBones(value: boolean)
        
        /** Emitted when the rest is updated. */
        readonly restUpdated: Signal<() => void>
        
        /** Emitted when the pose is updated.  
         *      
         *  **Note:** During the update process, this signal is not fired, so modification by [SkeletonModifier3D] is not detected.  
         */
        readonly poseUpdated: Signal<() => void>
        
        /** Emitted when the final pose has been calculated will be applied to the skin in the update process.  
         *  This means that all [SkeletonModifier3D] processing is complete. In order to detect the completion of the processing of each [SkeletonModifier3D], use [signal SkeletonModifier3D.modification_processed].  
         */
        readonly skeletonUpdated: Signal<() => void>
        
        /** Emitted when the bone at [param bone_idx] is toggled with [method set_bone_enabled]. Use [method is_bone_enabled] to check the new value. */
        readonly boneEnabledChanged: Signal<(boneIdx: int64) => void>
        
        /** Emitted when the list of bones changes, such as when calling [method add_bone], [method set_bone_parent], [method unparent_bone_and_rest], or [method clear_bones]. */
        readonly boneListChanged: Signal<() => void>
        
        /** Emitted when the value of [member show_rest_only] changes. */
        readonly showRestOnlyChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeleton3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeleton3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonIK3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonIK3D extends __NameMapSkeletonModifier3D {
        get_parent_skeleton: "getParentSkeleton";
        is_running: "isRunning";
        root_bone: "rootBone";
        tip_bone: "tipBone";
        override_tip_basis: "overrideTipBasis";
        use_magnet: "useMagnet";
        target_node: "targetNode";
        min_distance: "minDistance";
        max_iterations: "maxIterations";
    }
    /** A node used to rotate all bones of a [Skeleton3D] bone chain a way that places the end bone at a desired 3D position.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonik3d.html  
     */
    class SkeletonIK3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Returns the parent [Skeleton3D] node that was present when SkeletonIK entered the scene tree. Returns `null` if the parent node was not a [Skeleton3D] node when SkeletonIK3D entered the scene tree. */
        getParentSkeleton(): null | Skeleton3D
        
        /** Returns `true` if SkeletonIK is applying IK effects on continues frames to the [Skeleton3D] bones. Returns `false` if SkeletonIK is stopped or [method start] was used with the `one_time` parameter set to `true`. */
        isRunning(): boolean
        
        /** Starts applying IK effects on each frame to the [Skeleton3D] bones but will only take effect starting on the next frame. If [param one_time] is `true`, this will take effect immediately but also reset on the next frame. */
        start(oneTime?: boolean /* = false */): void
        
        /** Stops applying IK effects on each frame to the [Skeleton3D] bones and also calls [method Skeleton3D.clear_bones_global_pose_override] to remove existing overrides on all bones. */
        stop(): void
        
        /** The name of the current root bone, the first bone in the IK chain. */
        get rootBone(): StringName
        set rootBone(value: StringName)
        
        /** The name of the current tip bone, the last bone in the IK chain placed at the [member target] transform (or [member target_node] if defined). */
        get tipBone(): StringName
        set tipBone(value: StringName)
        
        /** The first target of the IK chain where the tip bone is placed and, if [member override_tip_basis] is `true`, how the tip bone is rotated. If [member target_node] points to a valid node, that node's transform is used instead and this property is ignored. */
        get target(): Transform3D
        set target(value: Transform3D)
        
        /** If `true` overwrites the rotation of the tip bone with the rotation of the [member target] (or [member target_node] if defined). */
        get overrideTipBasis(): boolean
        set overrideTipBasis(value: boolean)
        
        /** If `true`, instructs the IK solver to consider the secondary magnet target (pole target) when calculating the bone chain. Use the magnet position (pole target) to control the bending of the IK chain. */
        get useMagnet(): boolean
        set useMagnet(value: boolean)
        
        /** Secondary target position (first is [member target] property or [member target_node]) for the IK chain. Use magnet position (pole target) to control the bending of the IK chain. Only works if the bone chain has more than 2 bones. The middle chain bone position will be linearly interpolated with the magnet position. */
        get magnet(): Vector3
        set magnet(value: Vector3)
        
        /** Target node [NodePath] for the IK chain. If available, the node's current [Transform3D] is used instead of the [member target] property. */
        get targetNode(): NodePath
        set targetNode(value: NodePath | string)
        
        /** The minimum distance between bone and goal target. If the distance is below this value, the IK solver stops further iterations. */
        get minDistance(): float64
        set minDistance(value: float64)
        
        /** Number of iteration loops used by the IK solver to produce more accurate (and elegant) bone chain results. */
        get maxIterations(): int64
        set maxIterations(value: int64)
        
        /** Interpolation value for how much the IK results are applied to the current skeleton bone chain. A value of `1.0` will overwrite all skeleton bone transforms completely while a value of `0.0` will visually disable the SkeletonIK. */
        get interpolation(): float64
        set interpolation(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonIK3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonIK3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2D extends __NameMapResource {
        _setup_modification: "_setupModification";
        _draw_editor_gizmo: "_drawEditorGizmo";
        get_modification_stack: "getModificationStack";
        set_is_setup: "setIsSetup";
        get_is_setup: "getIsSetup";
        clamp_angle: "clampAngle";
        set_editor_draw_gizmo: "setEditorDrawGizmo";
        get_editor_draw_gizmo: "getEditorDrawGizmo";
        execution_mode: "executionMode";
    }
    /** Base class for resources that operate on [Bone2D]s in a [Skeleton2D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2d.html  
     */
    class SkeletonModification2D extends Resource {
        constructor(identifier?: any)
        /** Executes the given modification. This is where the modification performs whatever function it is designed to do. */
        /* gdvirtual */ _execute(delta: float64): void
        
        /** Called when the modification is setup. This is where the modification performs initialization. */
        /* gdvirtual */ _setupModification(modificationStack: SkeletonModificationStack2D): void
        
        /** Used for drawing **editor-only** modification gizmos. This function will only be called in the Godot editor and can be overridden to draw custom gizmos.  
         *      
         *  **Note:** You will need to use the Skeleton2D from [method SkeletonModificationStack2D.get_skeleton] and its draw functions, as the [SkeletonModification2D] resource cannot draw on its own.  
         */
        /* gdvirtual */ _drawEditorGizmo(): void
        
        /** Returns the [SkeletonModificationStack2D] that this modification is bound to. Through the modification stack, you can access the Skeleton2D the modification is operating on. */
        getModificationStack(): null | SkeletonModificationStack2D
        
        /** Manually allows you to set the setup state of the modification. This function should only rarely be used, as the [SkeletonModificationStack2D] the modification is bound to should handle setting the modification up. */
        setIsSetup(isSetup: boolean): void
        
        /** Returns whether this modification has been successfully setup or not. */
        getIsSetup(): boolean
        
        /** Takes an angle and clamps it so it is within the passed-in [param min] and [param max] range. [param invert] will inversely clamp the angle, clamping it to the range outside of the given bounds. */
        clampAngle(angle: float64, min: float64, max: float64, invert: boolean): float64
        
        /** Sets whether this modification will call [method _draw_editor_gizmo] in the Godot editor to draw modification-specific gizmos. */
        setEditorDrawGizmo(drawGizmo: boolean): void
        
        /** Returns whether this modification will call [method _draw_editor_gizmo] in the Godot editor to draw modification-specific gizmos. */
        getEditorDrawGizmo(): boolean
        
        /** If `true`, the modification's [method _execute] function will be called by the [SkeletonModificationStack2D]. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The execution mode for the modification. This tells the modification stack when to execute the modification. Some modifications have settings that are only available in certain execution modes. */
        get executionMode(): int64
        set executionMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DCcdik extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DCcdik extends __NameMapSkeletonModification2D {
        set_ccdik_joint_bone2d_node: "setCcdikJointBone2DNode";
        get_ccdik_joint_bone2d_node: "getCcdikJointBone2DNode";
        set_ccdik_joint_bone_index: "setCcdikJointBoneIndex";
        get_ccdik_joint_bone_index: "getCcdikJointBoneIndex";
        set_ccdik_joint_rotate_from_joint: "setCcdikJointRotateFromJoint";
        get_ccdik_joint_rotate_from_joint: "getCcdikJointRotateFromJoint";
        set_ccdik_joint_enable_constraint: "setCcdikJointEnableConstraint";
        get_ccdik_joint_enable_constraint: "getCcdikJointEnableConstraint";
        set_ccdik_joint_constraint_angle_min: "setCcdikJointConstraintAngleMin";
        get_ccdik_joint_constraint_angle_min: "getCcdikJointConstraintAngleMin";
        set_ccdik_joint_constraint_angle_max: "setCcdikJointConstraintAngleMax";
        get_ccdik_joint_constraint_angle_max: "getCcdikJointConstraintAngleMax";
        set_ccdik_joint_constraint_angle_invert: "setCcdikJointConstraintAngleInvert";
        get_ccdik_joint_constraint_angle_invert: "getCcdikJointConstraintAngleInvert";
        target_nodepath: "targetNodePath";
        tip_nodepath: "tipNodePath";
        ccdik_data_chain_length: "ccdikDataChainLength";
    }
    class SkeletonModification2DCcdik extends SkeletonModification2D {
        constructor(identifier?: any)
        setCcdikJointBone2DNode(jointIdx: int64, bone2DNodePath: NodePath | string): void
        getCcdikJointBone2DNode(jointIdx: int64): NodePath
        setCcdikJointBoneIndex(jointIdx: int64, boneIdx: int64): void
        getCcdikJointBoneIndex(jointIdx: int64): int64
        setCcdikJointRotateFromJoint(jointIdx: int64, rotateFromJoint: boolean): void
        getCcdikJointRotateFromJoint(jointIdx: int64): boolean
        setCcdikJointEnableConstraint(jointIdx: int64, enableConstraint: boolean): void
        getCcdikJointEnableConstraint(jointIdx: int64): boolean
        setCcdikJointConstraintAngleMin(jointIdx: int64, angleMin: float64): void
        getCcdikJointConstraintAngleMin(jointIdx: int64): float64
        setCcdikJointConstraintAngleMax(jointIdx: int64, angleMax: float64): void
        getCcdikJointConstraintAngleMax(jointIdx: int64): float64
        setCcdikJointConstraintAngleInvert(jointIdx: int64, invert: boolean): void
        getCcdikJointConstraintAngleInvert(jointIdx: int64): boolean
        get targetNodePath(): NodePath
        set targetNodePath(value: NodePath | string)
        get tipNodePath(): NodePath
        set tipNodePath(value: NodePath | string)
        get ccdikDataChainLength(): int64
        set ccdikDataChainLength(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DCcdik;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DCcdik;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DFabrik extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DFabrik extends __NameMapSkeletonModification2D {
        set_fabrik_joint_bone2d_node: "setFabrikJointBone2DNode";
        get_fabrik_joint_bone2d_node: "getFabrikJointBone2DNode";
        set_fabrik_joint_bone_index: "setFabrikJointBoneIndex";
        get_fabrik_joint_bone_index: "getFabrikJointBoneIndex";
        set_fabrik_joint_magnet_position: "setFabrikJointMagnetPosition";
        get_fabrik_joint_magnet_position: "getFabrikJointMagnetPosition";
        set_fabrik_joint_use_target_rotation: "setFabrikJointUseTargetRotation";
        get_fabrik_joint_use_target_rotation: "getFabrikJointUseTargetRotation";
        target_nodepath: "targetNodePath";
        fabrik_data_chain_length: "fabrikDataChainLength";
    }
    class SkeletonModification2DFabrik extends SkeletonModification2D {
        constructor(identifier?: any)
        setFabrikJointBone2DNode(jointIdx: int64, bone2DNodePath: NodePath | string): void
        getFabrikJointBone2DNode(jointIdx: int64): NodePath
        setFabrikJointBoneIndex(jointIdx: int64, boneIdx: int64): void
        getFabrikJointBoneIndex(jointIdx: int64): int64
        setFabrikJointMagnetPosition(jointIdx: int64, magnetPosition: Vector2): void
        getFabrikJointMagnetPosition(jointIdx: int64): Vector2
        setFabrikJointUseTargetRotation(jointIdx: int64, useTargetRotation: boolean): void
        getFabrikJointUseTargetRotation(jointIdx: int64): boolean
        get targetNodePath(): NodePath
        set targetNodePath(value: NodePath | string)
        get fabrikDataChainLength(): int64
        set fabrikDataChainLength(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DFabrik;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DFabrik;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DJiggle extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DJiggle extends __NameMapSkeletonModification2D {
        set_use_colliders: "setUseColliders";
        get_use_colliders: "getUseColliders";
        set_collision_mask: "setCollisionMask";
        get_collision_mask: "getCollisionMask";
        set_jiggle_joint_bone2d_node: "setJiggleJointBone2DNode";
        get_jiggle_joint_bone2d_node: "getJiggleJointBone2DNode";
        set_jiggle_joint_bone_index: "setJiggleJointBoneIndex";
        get_jiggle_joint_bone_index: "getJiggleJointBoneIndex";
        set_jiggle_joint_override: "setJiggleJointOverride";
        get_jiggle_joint_override: "getJiggleJointOverride";
        set_jiggle_joint_stiffness: "setJiggleJointStiffness";
        get_jiggle_joint_stiffness: "getJiggleJointStiffness";
        set_jiggle_joint_mass: "setJiggleJointMass";
        get_jiggle_joint_mass: "getJiggleJointMass";
        set_jiggle_joint_damping: "setJiggleJointDamping";
        get_jiggle_joint_damping: "getJiggleJointDamping";
        set_jiggle_joint_use_gravity: "setJiggleJointUseGravity";
        get_jiggle_joint_use_gravity: "getJiggleJointUseGravity";
        set_jiggle_joint_gravity: "setJiggleJointGravity";
        get_jiggle_joint_gravity: "getJiggleJointGravity";
        target_nodepath: "targetNodePath";
        jiggle_data_chain_length: "jiggleDataChainLength";
        use_gravity: "useGravity";
    }
    /** A modification that jiggles [Bone2D] nodes as they move towards a target.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2djiggle.html  
     */
    class SkeletonModification2DJiggle extends SkeletonModification2D {
        constructor(identifier?: any)
        /** If `true`, the Jiggle modifier will take colliders into account, keeping them from entering into these collision objects. */
        setUseColliders(useColliders: boolean): void
        
        /** Returns whether the jiggle modifier is taking physics colliders into account when solving. */
        getUseColliders(): boolean
        
        /** Sets the collision mask that the Jiggle modifier will use when reacting to colliders, if the Jiggle modifier is set to take colliders into account. */
        setCollisionMask(collisionMask: int64): void
        
        /** Returns the collision mask used by the Jiggle modifier when collisions are enabled. */
        getCollisionMask(): int64
        
        /** Resets the internal jiggle simulation state to the current bone positions, clearing velocity, acceleration, and accumulated forces. */
        reset(): void
        
        /** Sets the [Bone2D] node assigned to the Jiggle joint at [param joint_idx]. */
        setJiggleJointBone2DNode(jointIdx: int64, bone2DNode: NodePath | string): void
        
        /** Returns the [Bone2D] node assigned to the Jiggle joint at [param joint_idx]. */
        getJiggleJointBone2DNode(jointIdx: int64): NodePath
        
        /** Sets the bone index, [param bone_idx], of the Jiggle joint at [param joint_idx]. When possible, this will also update the `bone2d_node` of the Jiggle joint based on data provided by the linked skeleton. */
        setJiggleJointBoneIndex(jointIdx: int64, boneIdx: int64): void
        
        /** Returns the index of the [Bone2D] node assigned to the Jiggle joint at [param joint_idx]. */
        getJiggleJointBoneIndex(jointIdx: int64): int64
        
        /** Sets whether the Jiggle joint at [param joint_idx] should override the default Jiggle joint settings. Setting this to `true` will make the joint use its own settings rather than the default ones attached to the modification. */
        setJiggleJointOverride(jointIdx: int64, override: boolean): void
        
        /** Returns a boolean that indicates whether the joint at [param joint_idx] is overriding the default Jiggle joint data defined in the modification. */
        getJiggleJointOverride(jointIdx: int64): boolean
        
        /** Sets the of stiffness of the Jiggle joint at [param joint_idx]. */
        setJiggleJointStiffness(jointIdx: int64, stiffness: float64): void
        
        /** Returns the stiffness of the Jiggle joint at [param joint_idx]. */
        getJiggleJointStiffness(jointIdx: int64): float64
        
        /** Sets the of mass of the Jiggle joint at [param joint_idx]. */
        setJiggleJointMass(jointIdx: int64, mass: float64): void
        
        /** Returns the amount of mass of the jiggle joint at [param joint_idx]. */
        getJiggleJointMass(jointIdx: int64): float64
        
        /** Sets the amount of damping of the Jiggle joint at [param joint_idx]. */
        setJiggleJointDamping(jointIdx: int64, damping: float64): void
        
        /** Returns the amount of damping of the Jiggle joint at [param joint_idx]. */
        getJiggleJointDamping(jointIdx: int64): float64
        
        /** Sets whether the Jiggle joint at [param joint_idx] should use gravity. */
        setJiggleJointUseGravity(jointIdx: int64, useGravity: boolean): void
        
        /** Returns a boolean that indicates whether the joint at [param joint_idx] is using gravity or not. */
        getJiggleJointUseGravity(jointIdx: int64): boolean
        
        /** Sets the gravity vector of the Jiggle joint at [param joint_idx]. */
        setJiggleJointGravity(jointIdx: int64, gravity: Vector2): void
        
        /** Returns a [Vector2] representing the amount of gravity the Jiggle joint at [param joint_idx] is influenced by. */
        getJiggleJointGravity(jointIdx: int64): Vector2
        
        /** The NodePath to the node that is the target for the Jiggle modification. This node is what the Jiggle chain will attempt to rotate the bone chain to. */
        get targetNodePath(): NodePath
        set targetNodePath(value: NodePath | string)
        
        /** The amount of Jiggle joints in the Jiggle modification. */
        get jiggleDataChainLength(): int64
        set jiggleDataChainLength(value: int64)
        
        /** The default amount of stiffness assigned to the Jiggle joints, if they are not overridden. Higher values act more like springs, quickly moving into the correct position. */
        get stiffness(): float64
        set stiffness(value: float64)
        
        /** The default amount of mass assigned to the Jiggle joints, if they are not overridden. Higher values lead to faster movements and more overshooting. */
        get mass(): float64
        set mass(value: float64)
        
        /** The default amount of damping applied to the Jiggle joints, if they are not overridden. Higher values lead to more of the calculated velocity being applied. */
        get damping(): float64
        set damping(value: float64)
        
        /** Whether the gravity vector, [member gravity], should be applied to the Jiggle joints, assuming they are not overriding the default settings. */
        get useGravity(): boolean
        set useGravity(value: boolean)
        
        /** The default amount of gravity applied to the Jiggle joints, if they are not overridden. */
        get gravity(): Vector2
        set gravity(value: Vector2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DJiggle;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DJiggle;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DLookAt extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DLookAt extends __NameMapSkeletonModification2D {
        set_additional_rotation: "setAdditionalRotation";
        get_additional_rotation: "getAdditionalRotation";
        set_enable_constraint: "setEnableConstraint";
        get_enable_constraint: "getEnableConstraint";
        set_constraint_angle_min: "setConstraintAngleMin";
        get_constraint_angle_min: "getConstraintAngleMin";
        set_constraint_angle_max: "setConstraintAngleMax";
        get_constraint_angle_max: "getConstraintAngleMax";
        set_constraint_angle_invert: "setConstraintAngleInvert";
        get_constraint_angle_invert: "getConstraintAngleInvert";
        bone_index: "boneIndex";
        bone2d_node: "bone2DNode";
        target_nodepath: "targetNodePath";
    }
    /** A modification that rotates a [Bone2D] node to look at a target.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2dlookat.html  
     */
    class SkeletonModification2DLookAt extends SkeletonModification2D {
        constructor(identifier?: any)
        /** Sets the amount of additional rotation that is to be applied after executing the modification. This allows for offsetting the results by the inputted rotation amount. */
        setAdditionalRotation(rotation: float64): void
        
        /** Returns the amount of additional rotation that is applied after the LookAt modification executes. */
        getAdditionalRotation(): float64
        
        /** Sets whether this modification will use constraints or not. When `true`, constraints will be applied when solving the LookAt modification. */
        setEnableConstraint(enableConstraint: boolean): void
        
        /** Returns `true` if the LookAt modification is using constraints. */
        getEnableConstraint(): boolean
        
        /** Sets the constraint's minimum allowed angle. */
        setConstraintAngleMin(angleMin: float64): void
        
        /** Returns the constraint's minimum allowed angle. */
        getConstraintAngleMin(): float64
        
        /** Sets the constraint's maximum allowed angle. */
        setConstraintAngleMax(angleMax: float64): void
        
        /** Returns the constraint's maximum allowed angle. */
        getConstraintAngleMax(): float64
        
        /** When `true`, the modification will use an inverted joint constraint.  
         *  An inverted joint constraint only constraints the [Bone2D] to the angles  *outside of*  the inputted minimum and maximum angles. For this reason, it is referred to as an inverted joint constraint, as it constraints the joint to the outside of the inputted values.  
         */
        setConstraintAngleInvert(invert: boolean): void
        
        /** Returns whether the constraints to this modification are inverted or not. */
        getConstraintAngleInvert(): boolean
        
        /** The index of the [Bone2D] node that the modification will operate on. */
        get boneIndex(): int64
        set boneIndex(value: int64)
        
        /** The [Bone2D] node that the modification will operate on. */
        get bone2DNode(): NodePath
        set bone2DNode(value: NodePath | string)
        
        /** The NodePath to the node that is the target for the LookAt modification. This node is what the modification will rotate the [Bone2D] to. */
        get targetNodePath(): NodePath
        set targetNodePath(value: NodePath | string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DLookAt;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DLookAt;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DPhysicalBones extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DPhysicalBones extends __NameMapSkeletonModification2D {
        set_physical_bone_node: "setPhysicalBoneNode";
        get_physical_bone_node: "getPhysicalBoneNode";
        fetch_physical_bones: "fetchPhysicalBones";
        start_simulation: "startSimulation";
        stop_simulation: "stopSimulation";
        physical_bone_chain_length: "physicalBoneChainLength";
    }
    /** A modification that applies the transforms of [PhysicalBone2D] nodes to [Bone2D] nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2dphysicalbones.html  
     */
    class SkeletonModification2DPhysicalBones extends SkeletonModification2D {
        constructor(identifier?: any)
        /** Sets the [PhysicalBone2D] node at [param joint_idx].  
         *      
         *  **Note:** This is just the index used for this modification, not the bone index used in the [Skeleton2D].  
         */
        setPhysicalBoneNode(jointIdx: int64, physicalbone2DNode: NodePath | string): void
        
        /** Returns the [PhysicalBone2D] node at [param joint_idx]. */
        getPhysicalBoneNode(jointIdx: int64): NodePath
        
        /** Empties the list of [PhysicalBone2D] nodes and populates it with all [PhysicalBone2D] nodes that are children of the [Skeleton2D]. */
        fetchPhysicalBones(): void
        
        /** Tell the [PhysicalBone2D] nodes to start simulating and interacting with the physics world.  
         *  Optionally, an array of bone names can be passed to this function, and that will cause only [PhysicalBone2D] nodes with those names to start simulating.  
         */
        startSimulation(bones?: GArray<StringName>): void
        
        /** Tell the [PhysicalBone2D] nodes to stop simulating and interacting with the physics world.  
         *  Optionally, an array of bone names can be passed to this function, and that will cause only [PhysicalBone2D] nodes with those names to stop simulating.  
         */
        stopSimulation(bones?: GArray<StringName>): void
        
        /** The number of [PhysicalBone2D] nodes linked in this modification. */
        get physicalBoneChainLength(): int64
        set physicalBoneChainLength(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DPhysicalBones;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DPhysicalBones;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DStackHolder extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DStackHolder extends __NameMapSkeletonModification2D {
        set_held_modification_stack: "setHeldModificationStack";
        get_held_modification_stack: "getHeldModificationStack";
    }
    /** A modification that holds and executes a [SkeletonModificationStack2D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2dstackholder.html  
     */
    class SkeletonModification2DStackHolder extends SkeletonModification2D {
        constructor(identifier?: any)
        /** Sets the [SkeletonModificationStack2D] that this modification is holding. This modification stack will then be executed when this modification is executed. */
        setHeldModificationStack(heldModificationStack: SkeletonModificationStack2D): void
        
        /** Returns the [SkeletonModificationStack2D] that this modification is holding. */
        getHeldModificationStack(): null | SkeletonModificationStack2D
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DStackHolder;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DStackHolder;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModification2DTwoBoneIK extends __RPCMapSkeletonModification2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModification2DTwoBoneIK extends __NameMapSkeletonModification2D {
        set_joint_one_bone2d_node: "setJointOneBone2DNode";
        get_joint_one_bone2d_node: "getJointOneBone2DNode";
        set_joint_one_bone_idx: "setJointOneBoneIdx";
        get_joint_one_bone_idx: "getJointOneBoneIdx";
        set_joint_two_bone2d_node: "setJointTwoBone2DNode";
        get_joint_two_bone2d_node: "getJointTwoBone2DNode";
        set_joint_two_bone_idx: "setJointTwoBoneIdx";
        get_joint_two_bone_idx: "getJointTwoBoneIdx";
        target_nodepath: "targetNodePath";
        target_minimum_distance: "targetMinimumDistance";
        target_maximum_distance: "targetMaximumDistance";
        flip_bend_direction: "flipBendDirection";
    }
    /** A modification that rotates two bones using the law of cosines to reach the target.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodification2dtwoboneik.html  
     */
    class SkeletonModification2DTwoBoneIK extends SkeletonModification2D {
        constructor(identifier?: any)
        /** Sets the [Bone2D] node that is being used as the first bone in the TwoBoneIK modification. */
        setJointOneBone2DNode(bone2DNode: NodePath | string): void
        
        /** Returns the [Bone2D] node that is being used as the first bone in the TwoBoneIK modification. */
        getJointOneBone2DNode(): NodePath
        
        /** Sets the index of the [Bone2D] node that is being used as the first bone in the TwoBoneIK modification. */
        setJointOneBoneIdx(boneIdx: int64): void
        
        /** Returns the index of the [Bone2D] node that is being used as the first bone in the TwoBoneIK modification. */
        getJointOneBoneIdx(): int64
        
        /** Sets the [Bone2D] node that is being used as the second bone in the TwoBoneIK modification. */
        setJointTwoBone2DNode(bone2DNode: NodePath | string): void
        
        /** Returns the [Bone2D] node that is being used as the second bone in the TwoBoneIK modification. */
        getJointTwoBone2DNode(): NodePath
        
        /** Sets the index of the [Bone2D] node that is being used as the second bone in the TwoBoneIK modification. */
        setJointTwoBoneIdx(boneIdx: int64): void
        
        /** Returns the index of the [Bone2D] node that is being used as the second bone in the TwoBoneIK modification. */
        getJointTwoBoneIdx(): int64
        
        /** The NodePath to the node that is the target for the TwoBoneIK modification. This node is what the modification will use when bending the [Bone2D] nodes. */
        get targetNodePath(): NodePath
        set targetNodePath(value: NodePath | string)
        
        /** The minimum distance the target can be at. If the target is closer than this distance, the modification will solve as if it's at this minimum distance. When set to `0`, the modification will solve without distance constraints. */
        get targetMinimumDistance(): float64
        set targetMinimumDistance(value: float64)
        
        /** The maximum distance the target can be at. If the target is farther than this distance, the modification will solve as if it's at this maximum distance. When set to `0`, the modification will solve without distance constraints. */
        get targetMaximumDistance(): float64
        set targetMaximumDistance(value: float64)
        
        /** If `true`, the bones in the modification will bend outward as opposed to inwards when contracting. If `false`, the bones will bend inwards when contracting. */
        get flipBendDirection(): boolean
        set flipBendDirection(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModification2DTwoBoneIK;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModification2DTwoBoneIK;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModificationStack2D extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModificationStack2D extends __NameMapResource {
        enable_all_modifications: "enableAllModifications";
        get_modification: "getModification";
        add_modification: "addModification";
        delete_modification: "deleteModification";
        set_modification: "setModification";
        get_is_setup: "getIsSetup";
        get_skeleton: "getSkeleton";
        modification_count: "modificationCount";
    }
    /** A resource that holds a stack of [SkeletonModification2D]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodificationstack2d.html  
     */
    class SkeletonModificationStack2D extends Resource {
        constructor(identifier?: any)
        /** Sets up the modification stack so it can execute. This function should be called by [Skeleton2D] and shouldn't be manually called unless you know what you are doing. */
        setup(): void
        
        /** Executes all of the [SkeletonModification2D]s in the stack that use the same execution mode as the passed-in [param execution_mode], starting from index `0` to [member modification_count].  
         *      
         *  **Note:** The order of the modifications can matter depending on the modifications. For example, modifications on a spine should operate before modifications on the arms in order to get proper results.  
         */
        execute(delta: float64, executionMode: int64): void
        
        /** Enables all [SkeletonModification2D]s in the stack. */
        enableAllModifications(enabled: boolean): void
        
        /** Returns the [SkeletonModification2D] at the passed-in index, [param mod_idx]. */
        getModification(modIdx: int64): null | SkeletonModification2D
        
        /** Adds the passed-in [SkeletonModification2D] to the stack. */
        addModification(modification: SkeletonModification2D): void
        
        /** Deletes the [SkeletonModification2D] at the index position [param mod_idx], if it exists. */
        deleteModification(modIdx: int64): void
        
        /** Sets the modification at [param mod_idx] to the passed-in modification, [param modification]. */
        setModification(modIdx: int64, modification: SkeletonModification2D): void
        
        /** Returns a boolean that indicates whether the modification stack is setup and can execute. */
        getIsSetup(): boolean
        
        /** Returns the [Skeleton2D] node that the SkeletonModificationStack2D is bound to. */
        getSkeleton(): null | Skeleton2D
        
        /** If `true`, the modifications in the stack will be called. This is handled automatically through the [Skeleton2D] node. */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The interpolation strength of the modifications in stack. A value of `0` will make it where the modifications are not applied, a strength of `0.5` will be half applied, and a strength of `1` will allow the modifications to be fully applied and override the [Skeleton2D] [Bone2D] poses. */
        get strength(): float64
        set strength(value: float64)
        
        /** The number of modifications in the stack. */
        get modificationCount(): int64
        set modificationCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModificationStack2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModificationStack2D;
    }
    namespace SkeletonModifier3D {
        enum BoneAxis {
            BoneAxisPlusX = 0,
            BoneAxisMinusX = 1,
            BoneAxisPlusY = 2,
            BoneAxisMinusY = 3,
            BoneAxisPlusZ = 4,
            BoneAxisMinusZ = 5,
        }
        enum BoneDirection {
            BoneDirectionPlusX = 0,
            BoneDirectionMinusX = 1,
            BoneDirectionPlusY = 2,
            BoneDirectionMinusY = 3,
            BoneDirectionPlusZ = 4,
            BoneDirectionMinusZ = 5,
            BoneDirectionFromParent = 6,
        }
        enum SecondaryDirection {
            SecondaryDirectionNone = 0,
            SecondaryDirectionPlusX = 1,
            SecondaryDirectionMinusX = 2,
            SecondaryDirectionPlusY = 3,
            SecondaryDirectionMinusY = 4,
            SecondaryDirectionPlusZ = 5,
            SecondaryDirectionMinusZ = 6,
            SecondaryDirectionCustom = 7,
        }
        enum RotationAxis {
            RotationAxisX = 0,
            RotationAxisY = 1,
            RotationAxisZ = 2,
            RotationAxisAll = 3,
            RotationAxisCustom = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonModifier3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonModifier3D extends __NameMapNode3D {
        _process_modification_with_delta: "_processModificationWithDelta";
        _process_modification: "_processModification";
        _skeleton_changed: "_skeletonChanged";
        _validate_bone_names: "_validateBoneNames";
        get_skeleton: "getSkeleton";
        modification_processed: "modificationProcessed";
    }
    /** A node that may modify a Skeleton3D's bones.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonmodifier3d.html  
     */
    class SkeletonModifier3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Override this virtual method to implement a custom skeleton modifier. You should do things like get the [Skeleton3D]'s current pose and apply the pose here.  
         *  [method _process_modification_with_delta] must not apply [member influence] to bone poses because the [Skeleton3D] automatically applies influence to all bone poses set by the modifier.  
         *  [param delta] is passed from parent [Skeleton3D]. See also [method Skeleton3D.advance].  
         *      
         *  **Note:** This method may be called outside [method Node._process] and [method Node._physics_process] with [param delta] is `0.0`, since the modification should be processed immediately after initialization of the [Skeleton3D].  
         */
        /* gdvirtual */ _processModificationWithDelta(delta: float64): void
        
        /** Override this virtual method to implement a custom skeleton modifier. You should do things like get the [Skeleton3D]'s current pose and apply the pose here.  
         *  [method _process_modification] must not apply [member influence] to bone poses because the [Skeleton3D] automatically applies influence to all bone poses set by the modifier.  
         */
        /* gdvirtual */ _processModification(): void
        
        /** Called when the skeleton is changed. */
        /* gdvirtual */ _skeletonChanged(oldSkeleton: Skeleton3D, newSkeleton: Skeleton3D): void
        
        /** Called when bone names and indices need to be validated, such as when entering the scene tree or changing skeleton. */
        /* gdvirtual */ _validateBoneNames(): void
        
        /** Returns the parent [Skeleton3D] node if it exists. Otherwise, returns `null`. */
        getSkeleton(): null | Skeleton3D
        
        /** If `true`, the [SkeletonModifier3D] will be processing. */
        get active(): boolean
        set active(value: boolean)
        
        /** Sets the influence of the modification.  
         *      
         *  **Note:** This value is used by [Skeleton3D] to blend, so the [SkeletonModifier3D] should always apply only 100% of the result without interpolation.  
         */
        get influence(): float64
        set influence(value: float64)
        
        /** Notifies when the modification have been finished.  
         *      
         *  **Note:** If you want to get the modified bone pose by the modifier, you must use [method Skeleton3D.get_bone_pose] or [method Skeleton3D.get_bone_global_pose] at the moment this signal is fired.  
         */
        readonly modificationProcessed: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonModifier3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonModifier3D;
    }
    namespace SkeletonProfile {
        enum TailDirection {
            TailDirectionAverageChildren = 0,
            TailDirectionSpecificChild = 1,
            TailDirectionEnd = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonProfile extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonProfile extends __NameMapResource {
        get_group_name: "getGroupName";
        set_group_name: "setGroupName";
        get_texture: "getTexture";
        set_texture: "setTexture";
        find_bone: "findBone";
        get_bone_name: "getBoneName";
        set_bone_name: "setBoneName";
        get_bone_parent: "getBoneParent";
        set_bone_parent: "setBoneParent";
        get_tail_direction: "getTailDirection";
        set_tail_direction: "setTailDirection";
        get_bone_tail: "getBoneTail";
        set_bone_tail: "setBoneTail";
        get_reference_pose: "getReferencePose";
        set_reference_pose: "setReferencePose";
        get_handle_offset: "getHandleOffset";
        set_handle_offset: "setHandleOffset";
        get_group: "getGroup";
        set_group: "setGroup";
        is_required: "isRequired";
        set_required: "setRequired";
        root_bone: "rootBone";
        scale_base_bone: "scaleBaseBone";
        group_size: "groupSize";
        bone_size: "boneSize";
        profile_updated: "profileUpdated";
    }
    /** Base class for a profile of a virtual skeleton used as a target for retargeting.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonprofile.html  
     */
    class SkeletonProfile extends Resource {
        constructor(identifier?: any)
        /** Returns the name of the group at [param group_idx] that will be the drawing group in the [BoneMap] editor. */
        getGroupName(groupIdx: int64): StringName
        
        /** Sets the name of the group at [param group_idx] that will be the drawing group in the [BoneMap] editor. */
        setGroupName(groupIdx: int64, groupName: StringName): void
        
        /** Returns the texture of the group at [param group_idx] that will be the drawing group background image in the [BoneMap] editor. */
        getTexture(groupIdx: int64): null | Texture2D
        
        /** Sets the texture of the group at [param group_idx] that will be the drawing group background image in the [BoneMap] editor. */
        setTexture(groupIdx: int64, texture: Texture2D): void
        
        /** Returns the bone index that matches [param bone_name] as its name. */
        findBone(boneName: StringName): int64
        
        /** Returns the name of the bone at [param bone_idx] that will be the key name in the [BoneMap].  
         *  In the retargeting process, the returned bone name is the bone name of the target skeleton.  
         */
        getBoneName(boneIdx: int64): StringName
        
        /** Sets the name of the bone at [param bone_idx] that will be the key name in the [BoneMap].  
         *  In the retargeting process, the setting bone name is the bone name of the target skeleton.  
         */
        setBoneName(boneIdx: int64, boneName: StringName): void
        
        /** Returns the name of the bone which is the parent to the bone at [param bone_idx]. The result is empty if the bone has no parent. */
        getBoneParent(boneIdx: int64): StringName
        
        /** Sets the bone with name [param bone_parent] as the parent of the bone at [param bone_idx]. If an empty string is passed, then the bone has no parent. */
        setBoneParent(boneIdx: int64, boneParent: StringName): void
        
        /** Returns the tail direction of the bone at [param bone_idx]. */
        getTailDirection(boneIdx: int64): SkeletonProfile.TailDirection
        
        /** Sets the tail direction of the bone at [param bone_idx].  
         *      
         *  **Note:** This only specifies the method of calculation. The actual coordinates required should be stored in an external skeleton, so the calculation itself needs to be done externally.  
         */
        setTailDirection(boneIdx: int64, tailDirection: SkeletonProfile.TailDirection): void
        
        /** Returns the name of the bone which is the tail of the bone at [param bone_idx]. */
        getBoneTail(boneIdx: int64): StringName
        
        /** Sets the bone with name [param bone_tail] as the tail of the bone at [param bone_idx]. */
        setBoneTail(boneIdx: int64, boneTail: StringName): void
        
        /** Returns the reference pose transform for bone [param bone_idx]. */
        getReferencePose(boneIdx: int64): Transform3D
        
        /** Sets the reference pose transform for bone [param bone_idx]. */
        setReferencePose(boneIdx: int64, boneName: Transform3D): void
        
        /** Returns the offset of the bone at [param bone_idx] that will be the button position in the [BoneMap] editor.  
         *  This is the offset with origin at the top left corner of the square.  
         */
        getHandleOffset(boneIdx: int64): Vector2
        
        /** Sets the offset of the bone at [param bone_idx] that will be the button position in the [BoneMap] editor.  
         *  This is the offset with origin at the top left corner of the square.  
         */
        setHandleOffset(boneIdx: int64, handleOffset: Vector2): void
        
        /** Returns the group of the bone at [param bone_idx]. */
        getGroup(boneIdx: int64): StringName
        
        /** Sets the group of the bone at [param bone_idx]. */
        setGroup(boneIdx: int64, group: StringName): void
        
        /** Returns whether the bone at [param bone_idx] is required for retargeting.  
         *  This value is used by the bone map editor. If this method returns `true`, and no bone is assigned, the handle color will be red on the bone map editor.  
         */
        isRequired(boneIdx: int64): boolean
        
        /** Sets the required status for bone [param bone_idx] to [param required]. */
        setRequired(boneIdx: int64, required: boolean): void
        
        /** A bone name that will be used as the root bone in [AnimationTree]. This should be the bone of the parent of hips that exists at the world origin. */
        get rootBone(): StringName
        set rootBone(value: StringName)
        
        /** A bone name which will use model's height as the coefficient for normalization. For example, [SkeletonProfileHumanoid] defines it as `Hips`. */
        get scaleBaseBone(): StringName
        set scaleBaseBone(value: StringName)
        
        /** The amount of groups of bones in retargeting section's [BoneMap] editor. For example, [SkeletonProfileHumanoid] has 4 groups.  
         *  This property exists to separate the bone list into several sections in the editor.  
         */
        get groupSize(): int64
        set groupSize(value: int64)
        
        /** The amount of bones in retargeting section's [BoneMap] editor. For example, [SkeletonProfileHumanoid] has 56 bones.  
         *  The size of elements in [BoneMap] updates when changing this property in its assigned [SkeletonProfile].  
         */
        get boneSize(): int64
        set boneSize(value: int64)
        
        /** This signal is emitted when change the value in profile. This is used to update key name in the [BoneMap] and to redraw the [BoneMap] editor.  
         *      
         *  **Note:** This signal is not connected directly to editor to simplify the reference, instead it is passed on to editor through the [BoneMap].  
         */
        readonly profileUpdated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonProfile;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonProfile;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkeletonProfileHumanoid extends __RPCMapSkeletonProfile {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkeletonProfileHumanoid extends __NameMapSkeletonProfile {
    }
    /** A humanoid [SkeletonProfile] preset.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skeletonprofilehumanoid.html  
     */
    class SkeletonProfileHumanoid extends SkeletonProfile {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkeletonProfileHumanoid;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkeletonProfileHumanoid;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapSkin extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapSkin extends __NameMapResource {
        set_bind_count: "setBindCount";
        get_bind_count: "getBindCount";
        add_bind: "addBind";
        add_named_bind: "addNamedBind";
        set_bind_pose: "setBindPose";
        get_bind_pose: "getBindPose";
        set_bind_name: "setBindName";
        get_bind_name: "getBindName";
        set_bind_bone: "setBindBone";
        get_bind_bone: "getBindBone";
        clear_binds: "clearBinds";
    }
    /** A list of inverse bind poses and corresponding bones.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_skin.html  
     */
    class Skin extends Resource {
        constructor(identifier?: any)
        /** Resizes the bind pose list to a length of [param bind_count]. */
        setBindCount(bindCount: int64): void
        
        /** Returns the length of the bind pose list. */
        getBindCount(): int64
        
        /** Adds a bind pose matrix of [param pose] and associated bone index [param bone] to the bind pose list and increases the bind count by 1. */
        addBind(bone: int64, pose: Transform3D): void
        
        /** Like [method add_bind] but adds a bone [param name] instead of a bone index. */
        addNamedBind(name: string, pose: Transform3D): void
        
        /** Sets the bind pose [param bind_index] with the given offset matrix [param pose]. */
        setBindPose(bindIndex: int64, pose: Transform3D): void
        
        /** Returns the bind pose matrix at [param bind_index]. */
        getBindPose(bindIndex: int64): Transform3D
        
        /** Sets the name of the bone in bind pose [param bind_index] to [param name]. */
        setBindName(bindIndex: int64, name: StringName): void
        
        /** Returns the bone name associated with bind pose [param bind_index]. */
        getBindName(bindIndex: int64): StringName
        
        /** Sets the bone index of bind pose [param bind_index] to the given index [param bone]. */
        setBindBone(bindIndex: int64, bone: int64): void
        
        /** Returns the bone index associated with bind pose [param bind_index]. */
        getBindBone(bindIndex: int64): int64
        
        /** Clears the bind pose list. */
        clearBinds(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapSkin;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapSkin;
    }
}
